"""
Webhook receivers for Retell AI.
I1.8: store raw payload in integration_events before processing.
Idempotency key = provider_event_id (retell_{event_type}_{call_id}).
Signature verification per Retell docs.
"""
import hashlib
import hmac
import json
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.retell_service import process_retell_webhook

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_retell_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    """Verify Retell webhook HMAC-SHA256 signature."""
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/retell")
async def retell_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_retell_signature: str = Header(default=""),
):
    """
    I1.8: Retell webhook receiver.
    Stores raw event in integration_events before processing (idempotency).
    Silently accepts duplicates (returns 200).
    """
    raw_body = await request.body()

    # Signature verification — skip if no secret configured (dev env)
    webhook_secret = os.getenv("RETELL_WEBHOOK_SECRET", "")
    if webhook_secret:
        if not _verify_retell_signature(raw_body, x_retell_signature, webhook_secret):
            raise HTTPException(401, "Invalid Retell webhook signature")

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    event_type = payload.get("event", "")
    call_id = payload.get("data", {}).get("call_id", "") or payload.get("call_id", "")

    if not event_type or not call_id:
        raise HTTPException(400, "Missing event or call_id")

    is_new = await process_retell_webhook(db, event_type, call_id, payload)
    await db.commit()

    return {"received": True, "processed": is_new}
