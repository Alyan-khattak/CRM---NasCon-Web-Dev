"""
Retell AI integration service.
I1.x: outbound call trigger, webhook event processing, idempotency.
Idempotency key: retell_{event_type}_{call_id} stored in integration_events.
"""
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import write_audit
from app.models.orm import CallLog, IntegrationCredential, IntegrationEvent


async def _get_retell_key(db: AsyncSession, workspace_id: int) -> Optional[str]:
    """Load Retell API key from integration_credentials. I5.3: never hardcode."""
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.workspace_id == workspace_id,
            IntegrationCredential.integration_type == "retell",
            IntegrationCredential.is_active == True,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        # Fall back to global env key if no workspace-specific key
        return os.getenv("RETELL_API_KEY") or None
    return cred.encrypted_secret or None


async def trigger_call(
    db: AsyncSession,
    workspace_id: int,
    actor_id: int,
    to_number: str,
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
) -> CallLog:
    """
    I1.1: trigger outbound Retell call.
    Stores call log regardless of Retell availability.
    """
    api_key = await _get_retell_key(db, workspace_id)
    from_number = os.getenv("RETELL_FROM_NUMBER", "")

    retell_call_id = None
    status = "initiated"
    error = None

    if api_key and from_number:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://api.retellai.com/v2/create-phone-call",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "from_number": from_number,
                        "to_number": to_number,
                        "metadata": {
                            "lead_id": lead_id,
                            "workspace_id": workspace_id,
                            "contact_id": contact_id,
                        },
                    },
                )
            if resp.status_code == 201:
                data = resp.json()
                retell_call_id = data.get("call_id")
                status = "in_progress"
            else:
                status = "failed"
                error = resp.text[:500]
        except Exception as exc:
            status = "failed"
            error = str(exc)[:500]
    else:
        status = "no_credentials"

    call = CallLog(
        workspace_id=workspace_id,
        lead_id=lead_id,
        contact_id=contact_id,
        retell_call_id=retell_call_id,
        direction="outbound",
        status=status,
        initiated_by=actor_id,
    )
    db.add(call)
    await db.flush()

    await write_audit(
        db,
        workspace_id=workspace_id,
        event_type="CALL_INITIATED",
        entity_type="call_log",
        entity_id=call.call_log_id,
        actor_id=actor_id,
        after_value={
            "to_number": to_number,
            "retell_call_id": retell_call_id,
            "status": status,
            "error": error,
        },
    )
    return call


async def process_retell_webhook(
    db: AsyncSession,
    event_type: str,
    call_id: str,
    payload: dict,
) -> bool:
    """
    I1.8: idempotent webhook processing.
    Returns False if already processed (duplicate), True if new.
    """
    idempotency_key = f"retell_{event_type}_{call_id}"

    existing = await db.execute(
        select(IntegrationEvent).where(IntegrationEvent.provider_event_id == idempotency_key)
    )
    if existing.scalar_one_or_none():
        return False  # duplicate — safe to ignore

    # Find workspace_id from call metadata
    metadata = payload.get("metadata", {}) or {}
    workspace_id = metadata.get("workspace_id", 0)

    # Store raw event first (I1.8: store before processing)
    event = IntegrationEvent(
        workspace_id=workspace_id,
        integration_type="retell",
        provider_event_id=idempotency_key,
        event_type=event_type,
        payload_json=payload,
        status="processing",
    )
    db.add(event)
    await db.flush()

    # Update call log if found
    call_result = await db.execute(
        select(CallLog).where(CallLog.retell_call_id == call_id)
    )
    call = call_result.scalar_one_or_none()
    if call:
        if event_type == "call_ended":
            call.status = "completed"
            call.duration_seconds = payload.get("duration_ms", 0) // 1000
        elif event_type == "call_analyzed":
            call.summary = payload.get("call_analysis", {}).get("call_summary", "")
            if call.status != "completed":
                call.status = "analyzed"

    event.status = "processed"
    event.processed_at = datetime.now(timezone.utc)
    return True
