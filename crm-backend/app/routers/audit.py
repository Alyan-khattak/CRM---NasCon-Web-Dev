"""
Audit log query routes — Phase 5.
F4.2: filterable audit trail per workspace.
F4.3: read-only — no mutations exposed here.
TD-1.1: workspace_id scoped.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.rate_limit import default_limit
from app.models.orm import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogResponse(BaseModel):
    audit_log_id: int = Field(validation_alias="log_id")
    workspace_id: int
    event_type: str
    actor_id: Optional[int]
    actor_type: str
    entity_type: str
    entity_id: int
    before_value: Optional[dict]
    after_value: Optional[dict]
    occurred_at: datetime
    remarks: Optional[str]

    model_config = {"from_attributes": True, "populate_by_name": True}


@router.get("", response_model=list[AuditLogResponse])
@default_limit
async def list_audit_logs(
    request: Request,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    event_type: Optional[str] = None,
    actor_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    F4.2: query audit logs with filters.
    Workspace-scoped (TD-1.1). Read-only (F4.3).
    """
    q = (
        select(AuditLog)
        .where(AuditLog.workspace_id == current_user.workspace_id)
        .order_by(AuditLog.occurred_at.desc())
        .limit(min(limit, 500))
        .offset(offset)
    )
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.where(AuditLog.entity_id == entity_id)
    if event_type:
        q = q.where(AuditLog.event_type == event_type)
    if actor_id is not None:
        q = q.where(AuditLog.actor_id == actor_id)

    result = await db.execute(q)
    return result.scalars().all()
