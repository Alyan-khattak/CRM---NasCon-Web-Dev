"""
Audit log helper — INSERT only, never UPDATE or DELETE.
F4.1: record actor, time, entity, before/after values.
F4.3: INSERT-only; PostgreSQL grants enforce this at DB level in prod.
Uses ORM model so SQLAlchemy's JSON type handles serialization for both
SQLite (text) and PostgreSQL JSONB (via asyncpg dict pass-through).
"""
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orm import AuditLog


async def write_audit(
    db: AsyncSession,
    workspace_id: int,
    event_type: str,
    entity_type: str,
    entity_id: int,
    actor_id: int | None = None,
    actor_type: str = "user",   # "user" | "system"
    before_value: dict | None = None,
    after_value: dict | None = None,
    remarks: str | None = None,
) -> None:
    """
    F4.1: write one immutable audit entry in the same transaction as the state change.
    actor_id=None means system-initiated (e.g. auto-escalation).
    Caller commits — do not commit inside this function.
    """
    db.add(AuditLog(
        workspace_id=workspace_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        entity_type=entity_type,
        entity_id=entity_id,
        before_value=before_value,
        after_value=after_value,
        occurred_at=datetime.now(timezone.utc),
        remarks=remarks,
    ))
