"""
Retell AI call routes.
I1.1: trigger outbound call; I1.x: list calls per lead/contact.
TD-1.1: workspace_id scoped.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.rate_limit import default_limit
from app.models.orm import CallLog, Contact, Lead
from app.services.retell_service import trigger_call

router = APIRouter(prefix="/calls", tags=["calls"])


class CallTriggerRequest(BaseModel):
    """I1.1: trigger outbound call to a contact phone number."""
    to_number: str
    lead_id: int | None = None
    contact_id: int | None = None


class CallLogResponse(BaseModel):
    call_log_id: int
    workspace_id: int
    lead_id: int | None
    contact_id: int | None
    retell_call_id: str | None
    direction: str
    status: str
    duration_seconds: int | None
    summary: str | None
    initiated_by: int

    model_config = {"from_attributes": True}


@router.post("", response_model=CallLogResponse, status_code=201)
@default_limit
async def initiate_call(
    request: Request,
    body: CallTriggerRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """I1.1: trigger outbound Retell call. Logs call regardless of provider availability."""
    if body.lead_id:
        r = await db.execute(
            select(Lead).where(Lead.lead_id == body.lead_id, Lead.workspace_id == current_user.workspace_id)
        )
        if not r.scalar_one_or_none():
            raise HTTPException(404, "Lead not found")

    if body.contact_id:
        r = await db.execute(
            select(Contact).where(Contact.contact_id == body.contact_id, Contact.workspace_id == current_user.workspace_id)
        )
        if not r.scalar_one_or_none():
            raise HTTPException(404, "Contact not found")

    call = await trigger_call(
        db,
        workspace_id=current_user.workspace_id,
        actor_id=current_user.workspace_user_id,
        to_number=body.to_number,
        lead_id=body.lead_id,
        contact_id=body.contact_id,
    )
    await db.commit()
    await db.refresh(call)
    return call


@router.get("", response_model=list[CallLogResponse])
@default_limit
async def list_calls(
    request: Request,
    lead_id: int | None = None,
    contact_id: int | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List call logs for this workspace, optionally filtered by lead or contact."""
    q = select(CallLog).where(CallLog.workspace_id == current_user.workspace_id)
    if lead_id:
        q = q.where(CallLog.lead_id == lead_id)
    if contact_id:
        q = q.where(CallLog.contact_id == contact_id)
    result = await db.execute(q)
    return result.scalars().all()
