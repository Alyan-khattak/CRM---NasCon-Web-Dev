"""
Stripe payment service — test mode.
I2.1: create Stripe Checkout Session (hosted page, no card data touches server).
I2.2: webhook-confirmed status update (checkout.session.completed).
I2.3: signature verification via stripe.WebhookSignature.
I2.4: idempotency via integration_events.provider_event_id (Stripe event id).
I2.5: failure/expiry states from checkout.session.expired, payment_intent.payment_failed.
I2.6: refund state from charge.refunded.
I2.8: no card data stored ever — only Stripe session/intent IDs.
"""
import os
from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.middleware.audit import write_audit
from app.models.orm import IntegrationEvent, PaymentRequest


def _stripe_client() -> stripe.StripeClient:
    key = settings.STRIPE_SECRET_KEY
    if not key:
        raise HTTPException(503, "Stripe not configured — set STRIPE_SECRET_KEY in .env")
    return stripe.StripeClient(key)


async def create_checkout_session(
    db: AsyncSession,
    workspace_id: int,
    actor_id: int,
    amount: float,
    currency: str = "usd",
    opportunity_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    description: str = "CRM Payment",
) -> PaymentRequest:
    """
    I2.1: create Stripe Checkout Session.
    Stores session_id in stripe_session_id (no card data, I2.8).
    Returns PaymentRequest with checkout_url in metadata for redirect.
    """
    client = _stripe_client()

    # Build metadata so webhook can route back to workspace+payment
    # These are stored server-side in Stripe, not in our DB card fields
    checkout_meta = {
        "workspace_id": str(workspace_id),
        "actor_id": str(actor_id),
    }
    if opportunity_id:
        checkout_meta["opportunity_id"] = str(opportunity_id)
    if contact_id:
        checkout_meta["contact_id"] = str(contact_id)

    session = client.checkout.sessions.create(params={
        "line_items": [{
            "price_data": {
                "currency": currency.lower(),
                "product_data": {"name": description},
                "unit_amount": int(amount * 100),  # Stripe uses cents
            },
            "quantity": 1,
        }],
        "mode": "payment",
        "success_url": settings.STRIPE_SUCCESS_URL,
        "cancel_url": settings.STRIPE_CANCEL_URL,
        "metadata": checkout_meta,
    })

    payment = PaymentRequest(
        workspace_id=workspace_id,
        opportunity_id=opportunity_id,
        contact_id=contact_id,
        created_by=actor_id,
        stripe_session_id=session.id,          # I2.8: session ID only, no card data
        amount=amount,
        currency=currency.upper(),
        status="pending",
    )
    db.add(payment)
    await db.flush()

    await write_audit(
        db,
        workspace_id=workspace_id,
        event_type="PAYMENT_REQUEST_CREATED",
        entity_type="payment_link",
        entity_id=payment.payment_link_id,
        actor_id=actor_id,
        after_value={
            "stripe_session_id": session.id,
            "amount": amount,
            "currency": currency.upper(),
            "checkout_url": session.url,
        },
    )

    # Attach checkout_url as transient attribute for the route to return
    payment.__dict__["checkout_url"] = session.url
    return payment


async def handle_stripe_webhook(
    db: AsyncSession,
    raw_body: bytes,
    stripe_signature: str,
) -> dict:
    """
    I2.3: verify Stripe webhook signature.
    I2.4: idempotency via integration_events.provider_event_id = stripe event id.
    Handles: checkout.session.completed, checkout.session.expired,
             payment_intent.payment_failed, charge.refunded.
    """
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET
    if not webhook_secret:
        raise HTTPException(503, "STRIPE_WEBHOOK_SECRET not set — run: stripe listen --forward-to localhost:8000/webhooks/stripe")

    try:
        event = stripe.WebhookSignature.verify_header(
            raw_body.decode(),
            stripe_signature,
            webhook_secret,
        )
        # verify_header returns the payload dict directly in stripe 16+
        import json
        event = json.loads(raw_body)
    except Exception:
        # Fallback for stripe 16 API difference
        try:
            import json
            event = json.loads(raw_body)
            # Verify manually
            import hashlib, hmac, time
            parts = {k: v for p in stripe_signature.split(",") for k, v in [p.split("=", 1)]}
            ts = parts.get("t", "0")
            sig = parts.get("v1", "")
            signed_payload = f"{ts}.{raw_body.decode()}"
            expected = hmac.new(webhook_secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, sig):
                raise HTTPException(401, "Invalid Stripe webhook signature")
            # Replay protection: reject events older than 5 minutes
            if abs(int(time.time()) - int(ts)) > 300:
                raise HTTPException(400, "Webhook timestamp too old")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(400, f"Webhook parse error: {e}")

    event_id = event.get("id", "")
    event_type = event.get("type", "")

    # I2.4: idempotency check
    existing = await db.execute(
        select(IntegrationEvent).where(IntegrationEvent.provider_event_id == event_id)
    )
    if existing.scalar_one_or_none():
        return {"received": True, "processed": False, "reason": "duplicate"}

    # Store raw event before processing
    ie = IntegrationEvent(
        workspace_id=0,  # will update after we find workspace_id below
        integration_type="stripe",
        provider_event_id=event_id,
        event_type=event_type,
        payload_json=event,
        status="processing",
    )
    db.add(ie)
    await db.flush()

    data_obj = event.get("data", {}).get("object", {})
    processed = False

    if event_type == "checkout.session.completed":
        session_id = data_obj.get("id")
        payment_intent_id = data_obj.get("payment_intent")
        meta = data_obj.get("metadata", {})
        workspace_id = int(meta.get("workspace_id", 0))

        ie.workspace_id = workspace_id

        result = await db.execute(
            select(PaymentRequest).where(
                PaymentRequest.stripe_session_id == session_id,
                PaymentRequest.workspace_id == workspace_id,
            )
        )
        payment = result.scalar_one_or_none()
        if payment and payment.status == "pending":
            before = {"status": payment.status}
            payment.status = "paid"
            payment.paid_at = datetime.now(timezone.utc)
            payment.stripe_payment_intent_id = payment_intent_id  # I2.8: intent ID, not card
            await write_audit(
                db, workspace_id=workspace_id,
                event_type="PAYMENT_CONFIRMED",
                entity_type="payment_link",
                entity_id=payment.payment_link_id,
                actor_id=None, actor_type="system",
                before_value=before,
                after_value={"status": "paid", "payment_intent_id": payment_intent_id},
            )
            processed = True

    elif event_type == "checkout.session.expired":
        session_id = data_obj.get("id")
        meta = data_obj.get("metadata", {})
        workspace_id = int(meta.get("workspace_id", 0))
        ie.workspace_id = workspace_id
        result = await db.execute(
            select(PaymentRequest).where(
                PaymentRequest.stripe_session_id == session_id,
                PaymentRequest.workspace_id == workspace_id,
            )
        )
        payment = result.scalar_one_or_none()
        if payment and payment.status == "pending":
            payment.status = "expired"
            await write_audit(db, workspace_id=workspace_id, event_type="PAYMENT_EXPIRED",
                entity_type="payment_link", entity_id=payment.payment_link_id,
                actor_id=None, actor_type="system",
                before_value={"status": "pending"}, after_value={"status": "expired"})
            processed = True

    elif event_type == "charge.refunded":
        payment_intent_id = data_obj.get("payment_intent")
        workspace_id = 0
        result = await db.execute(
            select(PaymentRequest).where(
                PaymentRequest.stripe_payment_intent_id == payment_intent_id,
            )
        )
        payment = result.scalar_one_or_none()
        if payment:
            ie.workspace_id = payment.workspace_id
            before = {"status": payment.status}
            payment.status = "refunded"
            await write_audit(db, workspace_id=payment.workspace_id, event_type="PAYMENT_REFUNDED",
                entity_type="payment_link", entity_id=payment.payment_link_id,
                actor_id=None, actor_type="system",
                before_value=before, after_value={"status": "refunded"})
            processed = True

    elif event_type == "payment_intent.payment_failed":
        payment_intent_id = data_obj.get("id")
        failure_msg = data_obj.get("last_payment_error", {}).get("message", "Payment failed")
        result = await db.execute(
            select(PaymentRequest).where(
                PaymentRequest.stripe_payment_intent_id == payment_intent_id,
            )
        )
        payment = result.scalar_one_or_none()
        if payment:
            ie.workspace_id = payment.workspace_id
            payment.status = "failed"
            await write_audit(db, workspace_id=payment.workspace_id, event_type="PAYMENT_FAILED",
                entity_type="payment_link", entity_id=payment.payment_link_id,
                actor_id=None, actor_type="system",
                before_value={"status": "pending"}, after_value={"status": "failed", "reason": failure_msg})
            processed = True

    ie.status = "processed" if processed else "skipped"
    ie.processed_at = datetime.now(timezone.utc)
    return {"received": True, "processed": processed, "event_type": event_type}


async def cancel_payment(
    db: AsyncSession,
    workspace_id: int,
    payment_id: int,
    actor_id: int,
) -> PaymentRequest:
    """Cancel a pending payment request (before customer pays)."""
    result = await db.execute(
        select(PaymentRequest).where(
            PaymentRequest.payment_link_id == payment_id,
            PaymentRequest.workspace_id == workspace_id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.status != "pending":
        raise HTTPException(400, f"Cannot cancel payment in status '{payment.status}'")

    before = {"status": payment.status}
    payment.status = "abandoned"
    await write_audit(db, workspace_id=workspace_id, event_type="PAYMENT_CANCELLED",
        entity_type="payment_link", entity_id=payment_id, actor_id=actor_id,
        before_value=before, after_value={"status": "abandoned"})
    return payment
