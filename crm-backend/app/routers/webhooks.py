"""
Webhook receivers for Retell AI and Stripe.
I1.8: store raw payload in integration_events before processing.
I2.3: Stripe signature verification.
I2.4: idempotency via provider_event_id.
"""
import hashlib
import hmac
import json
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.retell_service import process_retell_webhook
from app.services.payment_service import handle_stripe_webhook

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


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str = Header(default="", alias="stripe-signature"),
):
    """
    I2.3: Stripe webhook — signature verified before any DB write.
    I2.4: idempotency via integration_events.provider_event_id = Stripe event id.
    Handles: checkout.session.completed, checkout.session.expired,
             charge.refunded, payment_intent.payment_failed.
    """
    raw_body = await request.body()
    result = await handle_stripe_webhook(db, raw_body, stripe_signature)
    await db.commit()
    return result
