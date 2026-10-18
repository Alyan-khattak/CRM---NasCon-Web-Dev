"""
Opportunity CRUD + stage movement.
F2.1: contacts, companies, opportunities with relationships.
F2.4: configured required fields block stage move until filled.
F2.8: opportunity detail includes related records.
F1.4: value field masked for users whose field_permission is_visible=False.
TD-1.1: all queries scoped to current_user.workspace_id.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit import write_audit
from app.middleware.rate_limit import default_limit
from app.models.orm import (
    Company,
    Contact,
    FieldPermission,
    Opportunity,
    Pipeline,
    PipelineStage,
)
from app.models.schemas import (
    MessageResponse,
    OpportunityCreate,
    OpportunityResponse,
    OpportunityUpdate,
    StageMoveRequest,
)
from app.services.opportunity_service import assert_required_fields_filled

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


def _mask_value(opp: Opportunity, role_id: int, can_see_value: bool) -> OpportunityResponse:
    """F1.4: mask opportunity value if field_permission is_visible=False."""
    data = OpportunityResponse.model_validate(opp)
    if not can_see_value:
        data.value = None
    return data


async def _field_visible(db: AsyncSession, role_id: int) -> bool:
    """F1.4: check if opportunity_value is visible for this role."""
    result = await db.execute(
        select(FieldPermission).where(
            FieldPermission.role_id == role_id,
            FieldPermission.entity_type == "opportunity",
            FieldPermission.field_key == "opportunity_value",
        )
    )
    perm = result.scalar_one_or_none()
    if perm is None:
        return True  # no restriction row = visible by default
    return perm.is_visible


@router.get("", response_model=list[OpportunityResponse])
@default_limit
async def list_opportunities(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.1: list opportunities in caller's workspace. TD-1.1."""
    result = await db.execute(
        select(Opportunity).where(Opportunity.workspace_id == current_user.workspace_id)
    )
    opps = result.scalars().all()
    can_see = await _field_visible(db, current_user.role_id)
    return [_mask_value(o, current_user.role_id, can_see) for o in opps]


@router.post("", response_model=OpportunityResponse, status_code=201)
@default_limit
async def create_opportunity(
    request: Request,
    body: OpportunityCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.1: create opportunity linked to contact/company within workspace."""
    await _assert_pipeline_stage(db, body.pipeline_id, body.stage_id, current_user.workspace_id)

    if body.contact_id:
        await _assert_contact(db, body.contact_id, current_user.workspace_id)
    if body.company_id:
        await _assert_company(db, body.company_id, current_user.workspace_id)
    if body.assigned_to:
        await _assert_user(db, body.assigned_to, current_user.workspace_id)

    close_date = date.fromisoformat(body.close_date) if body.close_date else None

    opp = Opportunity(
        workspace_id=current_user.workspace_id,
        opportunity_name=body.opportunity_name,
        pipeline_id=body.pipeline_id,
        stage_id=body.stage_id,
        contact_id=body.contact_id,
        company_id=body.company_id,
        value=body.value,
        status="open",
        assigned_to=body.assigned_to,
        close_date=close_date,
    )
    db.add(opp)
    await db.flush()

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="OPPORTUNITY_CREATED",
        entity_type="opportunity",
        entity_id=opp.opportunity_id,
        actor_id=current_user.workspace_user_id,
        after_value={"name": body.opportunity_name, "stage_id": body.stage_id, "value": body.value},
    )

    await db.commit()
    await db.refresh(opp)
    can_see = await _field_visible(db, current_user.role_id)
    return _mask_value(opp, current_user.role_id, can_see)


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
@default_limit
async def get_opportunity(
    request: Request,
    opportunity_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.8: get opportunity detail. TD-1.1."""
    opp = await _get_opp(db, opportunity_id, current_user.workspace_id)
    can_see = await _field_visible(db, current_user.role_id)
    return _mask_value(opp, current_user.role_id, can_see)


@router.patch("/{opportunity_id}", response_model=OpportunityResponse)
@default_limit
async def update_opportunity(
    request: Request,
    opportunity_id: int,
    body: OpportunityUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.1: update opportunity fields. TD-1.1."""
    opp = await _get_opp(db, opportunity_id, current_user.workspace_id)

    if body.assigned_to is not None:
        await _assert_user(db, body.assigned_to, current_user.workspace_id)

    before = {"status": opp.status, "stage_id": opp.stage_id, "value": float(opp.value) if opp.value else None}

    for field, value in body.model_dump(exclude_none=True).items():
        if field == "close_date" and value:
            value = date.fromisoformat(value)
        setattr(opp, field, value)

    after = {"status": opp.status, "stage_id": opp.stage_id, "value": float(opp.value) if opp.value else None}

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="OPPORTUNITY_UPDATED",
        entity_type="opportunity",
        entity_id=opportunity_id,
        actor_id=current_user.workspace_user_id,
        before_value=before,
        after_value=after,
    )

    await db.commit()
    await db.refresh(opp)
    can_see = await _field_visible(db, current_user.role_id)
    return _mask_value(opp, current_user.role_id, can_see)


@router.post("/{opportunity_id}/move-stage", response_model=OpportunityResponse)
@default_limit
async def move_stage(
    request: Request,
    opportunity_id: int,
    body: StageMoveRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    F2.4: move opportunity to target stage.
    Blocked if required custom fields are not filled.
    """
    opp = await _get_opp(db, opportunity_id, current_user.workspace_id)

    # Verify target stage belongs to same pipeline in this workspace
    await _assert_pipeline_stage(db, opp.pipeline_id, body.target_stage_id, current_user.workspace_id)

    # F2.4: required fields gate
    await assert_required_fields_filled(db, opportunity_id, body.target_stage_id)

    before_stage = opp.stage_id
    opp.stage_id = body.target_stage_id

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="OPPORTUNITY_STAGE_MOVED",
        entity_type="opportunity",
        entity_id=opportunity_id,
        actor_id=current_user.workspace_user_id,
        before_value={"stage_id": before_stage},
        after_value={"stage_id": body.target_stage_id},
    )

    await db.commit()
    await db.refresh(opp)
    can_see = await _field_visible(db, current_user.role_id)
    return _mask_value(opp, current_user.role_id, can_see)


@router.delete("/{opportunity_id}", response_model=MessageResponse)
@default_limit
async def delete_opportunity(
    request: Request,
    opportunity_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete opportunity. TD-1.1."""
    opp = await _get_opp(db, opportunity_id, current_user.workspace_id)

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="OPPORTUNITY_DELETED",
        entity_type="opportunity",
        entity_id=opportunity_id,
        actor_id=current_user.workspace_user_id,
        before_value={"name": opp.opportunity_name, "status": opp.status},
    )

    await db.delete(opp)
    await db.commit()
    return MessageResponse(message="Opportunity deleted")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_opp(db: AsyncSession, opportunity_id: int, workspace_id: int) -> Opportunity:
    result = await db.execute(
        select(Opportunity).where(
            Opportunity.opportunity_id == opportunity_id,
            Opportunity.workspace_id == workspace_id,
        )
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    return opp


async def _assert_pipeline_stage(
    db: AsyncSession, pipeline_id: int, stage_id: int, workspace_id: int
) -> None:
    result = await db.execute(
        select(PipelineStage)
        .join(Pipeline, PipelineStage.pipeline_id == Pipeline.pipeline_id)
        .where(
            PipelineStage.stage_id == stage_id,
            PipelineStage.pipeline_id == pipeline_id,
            Pipeline.workspace_id == workspace_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(400, "Stage not found in pipeline for this workspace")


async def _assert_contact(db: AsyncSession, contact_id: int, workspace_id: int) -> None:
    result = await db.execute(
        select(Contact).where(Contact.contact_id == contact_id, Contact.workspace_id == workspace_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(400, "Contact not found in this workspace")


async def _assert_company(db: AsyncSession, company_id: int, workspace_id: int) -> None:
    result = await db.execute(
        select(Company).where(Company.company_id == company_id, Company.workspace_id == workspace_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(400, "Company not found in this workspace")


async def _assert_user(db: AsyncSession, user_id: int, workspace_id: int) -> None:
    from app.models.orm import WorkspaceUser
    result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_user_id == user_id,
            WorkspaceUser.workspace_id == workspace_id,
            WorkspaceUser.is_active == True,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(400, "User not found in this workspace")
