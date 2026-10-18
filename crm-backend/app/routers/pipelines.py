"""
Pipeline, stage, and custom-field routes. Admin or above.
F2.5: add/rename/reorder/delete stages.
BR-009: deletion blocked while opportunities occupy the stage.
F2.2: Admin creates custom fields without code.
F2.3: fields can be pipeline-scoped or workspace-wide (pipeline_id=None).
F2.4: stage_required_fields gates opportunity stage moves.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import CurrentUser, admin_or_above, get_current_user
from app.database import get_db
from app.middleware.audit import write_audit
from app.middleware.rate_limit import default_limit
from app.models.orm import (
    CustomFieldDefinition,
    CustomFieldOption,
    Opportunity,
    Pipeline,
    PipelineStage,
    StageRequiredField,
)
from app.models.schemas import (
    CustomFieldCreate,
    CustomFieldResponse,
    MessageResponse,
    PipelineCreate,
    PipelineResponse,
    PipelineUpdate,
    StageCreate,
    StageRequiredFieldCreate,
    StageResponse,
    StageUpdate,
)

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


# ── Pipelines ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[PipelineResponse])
@default_limit
async def list_pipelines(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pipeline)
        .where(Pipeline.workspace_id == current_user.workspace_id)
        .options(selectinload(Pipeline.stages))
    )
    return result.scalars().all()


@router.post("", response_model=PipelineResponse, status_code=201)
@default_limit
async def create_pipeline(
    request: Request,
    body: PipelineCreate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F2.7: Admin creates a pipeline."""
    pipeline = Pipeline(workspace_id=current_user.workspace_id, pipeline_name=body.pipeline_name)
    db.add(pipeline)
    await db.flush()

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="PIPELINE_CREATED",
        entity_type="pipeline",
        entity_id=pipeline.pipeline_id,
        actor_id=current_user.workspace_user_id,
        after_value={"pipeline_name": body.pipeline_name},
    )
    await db.commit()
    result = await db.execute(
        select(Pipeline)
        .where(Pipeline.pipeline_id == pipeline.pipeline_id)
        .options(selectinload(Pipeline.stages))
    )
    return result.scalar_one()


@router.patch("/{pipeline_id}", response_model=PipelineResponse)
@default_limit
async def update_pipeline(
    request: Request,
    pipeline_id: int,
    body: PipelineUpdate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    pipeline = await _get_pipeline(db, pipeline_id, current_user.workspace_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(pipeline, field, value)
    await db.commit()
    result = await db.execute(
        select(Pipeline)
        .where(Pipeline.pipeline_id == pipeline.pipeline_id)
        .options(selectinload(Pipeline.stages))
    )
    return result.scalar_one()


# ── Stages ────────────────────────────────────────────────────────────────────

@router.post("/{pipeline_id}/stages", response_model=StageResponse, status_code=201)
@default_limit
async def add_stage(
    request: Request,
    pipeline_id: int,
    body: StageCreate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F2.5: Admin adds a stage to a pipeline."""
    await _get_pipeline(db, pipeline_id, current_user.workspace_id)
    stage = PipelineStage(
        pipeline_id=pipeline_id,
        stage_name=body.stage_name,
        sort_order=body.sort_order,
    )
    db.add(stage)
    await db.commit()
    await db.refresh(stage)
    return stage


@router.patch("/{pipeline_id}/stages/{stage_id}", response_model=StageResponse)
@default_limit
async def update_stage(
    request: Request,
    pipeline_id: int,
    stage_id: int,
    body: StageUpdate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F2.5: rename or reorder a stage."""
    stage = await _get_stage(db, stage_id, pipeline_id, current_user.workspace_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(stage, field, value)
    await db.commit()
    await db.refresh(stage)
    return stage


@router.delete("/{pipeline_id}/stages/{stage_id}", response_model=MessageResponse)
@default_limit
async def delete_stage(
    request: Request,
    pipeline_id: int,
    stage_id: int,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """
    F2.5, BR-009: deletion blocked while any open/won/lost opportunity occupies the stage.
    Admin must move all opportunities first.
    """
    stage = await _get_stage(db, stage_id, pipeline_id, current_user.workspace_id)

    # BR-009: check for any opportunities still in this stage
    occupied = await db.execute(
        select(Opportunity).where(
            Opportunity.stage_id == stage_id,
            Opportunity.workspace_id == current_user.workspace_id,
        )
    )
    if occupied.scalars().first():
        raise HTTPException(
            400,
            "Move all opportunities out of this stage before deleting it (BR-009)",
        )

    await db.delete(stage)
    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="STAGE_DELETED",
        entity_type="pipeline_stage",
        entity_id=stage_id,
        actor_id=current_user.workspace_user_id,
        before_value={"stage_name": stage.stage_name},
    )
    await db.commit()
    return MessageResponse(message="Stage deleted")


# ── Custom Fields ─────────────────────────────────────────────────────────────

@router.post("/{pipeline_id}/fields", response_model=CustomFieldResponse, status_code=201)
@default_limit
async def add_custom_field(
    request: Request,
    pipeline_id: int,
    body: CustomFieldCreate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F2.2, F2.3: Admin creates a custom field scoped to this pipeline."""
    await _get_pipeline(db, pipeline_id, current_user.workspace_id)

    field = CustomFieldDefinition(
        workspace_id=current_user.workspace_id,
        pipeline_id=pipeline_id,
        entity_type=body.entity_type,
        field_name=body.field_name,
        field_label=body.field_label,
        data_type=body.data_type,
        is_required=body.is_required,
        sort_order=body.sort_order,
    )
    db.add(field)
    await db.flush()

    # Seed dropdown options if provided
    if body.data_type == 4 and body.options:
        for i, label in enumerate(body.options):
            db.add(CustomFieldOption(field_def_id=field.field_def_id, option_label=label, sort_order=i))

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="CUSTOM_FIELD_CREATED",
        entity_type="custom_field_definition",
        entity_id=field.field_def_id,
        actor_id=current_user.workspace_user_id,
        after_value={"field_name": body.field_name, "data_type": body.data_type},
    )
    await db.commit()
    await db.refresh(field)
    return field


# ── Stage Required Fields ─────────────────────────────────────────────────────

@router.post("/{pipeline_id}/stages/{stage_id}/required-fields", response_model=MessageResponse, status_code=201)
@default_limit
async def set_stage_required_field(
    request: Request,
    pipeline_id: int,
    stage_id: int,
    body: StageRequiredFieldCreate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F2.4: mark a custom field as required before an opportunity can enter this stage."""
    await _get_stage(db, stage_id, pipeline_id, current_user.workspace_id)

    # Verify field belongs to this workspace
    field_res = await db.execute(
        select(CustomFieldDefinition).where(
            CustomFieldDefinition.field_def_id == body.field_def_id,
            CustomFieldDefinition.workspace_id == current_user.workspace_id,
        )
    )
    if not field_res.scalar_one_or_none():
        raise HTTPException(404, "Custom field not found in this workspace")

    # Idempotent — only insert if not already set
    existing = await db.execute(
        select(StageRequiredField).where(
            StageRequiredField.stage_id == stage_id,
            StageRequiredField.field_def_id == body.field_def_id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(StageRequiredField(stage_id=stage_id, field_def_id=body.field_def_id))
        await db.commit()

    return MessageResponse(message="Required field set for stage")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_pipeline(db: AsyncSession, pipeline_id: int, workspace_id: int) -> Pipeline:
    result = await db.execute(
        select(Pipeline).where(
            Pipeline.pipeline_id == pipeline_id,
            Pipeline.workspace_id == workspace_id,
        )
    )
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(404, "Pipeline not found")
    return pipeline


async def _get_stage(
    db: AsyncSession, stage_id: int, pipeline_id: int, workspace_id: int
) -> PipelineStage:
    result = await db.execute(
        select(PipelineStage)
        .join(Pipeline, PipelineStage.pipeline_id == Pipeline.pipeline_id)
        .where(
            PipelineStage.stage_id == stage_id,
            PipelineStage.pipeline_id == pipeline_id,
            Pipeline.workspace_id == workspace_id,
        )
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise HTTPException(404, "Stage not found")
    return stage
