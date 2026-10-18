"""
Easypaisa manual payment service.
No API integration — employee generates payment request with workspace Easypaisa
account number, customer pays manually, employee confirms with transaction ref.
I2.8: no card data stored ever. Only internal refs + Easypaisa txn refs.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import write_audit
from app.models.orm import IntegrationCredential, PaymentRequest


async def get_easypaisa_number(db: AsyncSession, workspace_id: int) -> Optional[str]:
    """Load workspace Easypaisa account number from integration_credentials."""
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.workspace_id == workspace_id,
            IntegrationCredential.integration_type == "easypaisa",
            IntegrationCredential.is_active == True,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred or not cred.metadata_json:
        return None
    return cred.metadata_json.get("account_number")


async def create_payment_request(
    db: AsyncSession,
    workspace_id: int,
    actor_id: int,
    amount: float,
    opportunity_id: Optional[int] = None,
    contact_id: Optional[int] = None,
) -> tuple[PaymentRequest, Optional[str]]:
    """
    I2.1: create payment request.
    Returns (payment_request, easypaisa_number).
    easypaisa_number is None if workspace hasn't configured one — still creates request.
    """
    internal_ref = f"EP-{uuid.uuid4().hex[:12].upper()}"
    easypaisa_number = await get_easypaisa_number(db, workspace_id)

    payment = PaymentRequest(
        workspace_id=workspace_id,
        opportunity_id=opportunity_id,
        contact_id=contact_id,
        created_by=actor_id,
        stripe_session_id=internal_ref,  # used as internal payment reference
        amount=amount,
        currency="PKR",
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
            "internal_ref": internal_ref,
            "amount": amount,
            "currency": "PKR",
            "easypaisa_number": easypaisa_number,
        },
    )
    return payment, easypaisa_number


async def confirm_payment(
    db: AsyncSession,
    workspace_id: int,
    payment_id: int,
    actor_id: int,
    easypaisa_txn_ref: str,
) -> PaymentRequest:
    """
    I2.2: employee confirms payment received, records Easypaisa transaction reference.
    I2.8: txn_ref is NOT a card number — it is the Easypaisa transaction ID.
    """
    result = await db.execute(
        select(PaymentRequest).where(
            PaymentRequest.payment_link_id == payment_id,
            PaymentRequest.workspace_id == workspace_id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Payment request not found")
    if payment.status == "paid":
        raise HTTPException(400, "Payment already confirmed")
    if payment.status not in ("pending",):
        raise HTTPException(400, f"Cannot confirm payment in status '{payment.status}'")

    before = {"status": payment.status}
    payment.stripe_payment_intent_id = easypaisa_txn_ref  # Easypaisa txn ref
    payment.status = "paid"
    payment.paid_at = datetime.now(timezone.utc)

    await write_audit(
        db,
        workspace_id=workspace_id,
        event_type="PAYMENT_CONFIRMED",
        entity_type="payment_link",
        entity_id=payment_id,
        actor_id=actor_id,
        before_value=before,
        after_value={"status": "paid", "easypaisa_txn_ref": easypaisa_txn_ref},
    )
    return payment


async def cancel_payment(
    db: AsyncSession,
    workspace_id: int,
    payment_id: int,
    actor_id: int,
) -> PaymentRequest:
    """Cancel a pending payment request."""
    result = await db.execute(
        select(PaymentRequest).where(
            PaymentRequest.payment_link_id == payment_id,
            PaymentRequest.workspace_id == workspace_id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Payment request not found")
    if payment.status != "pending":
        raise HTTPException(400, f"Can only cancel pending requests, current: {payment.status}")

    before = {"status": payment.status}
    payment.status = "abandoned"

    await write_audit(
        db,
        workspace_id=workspace_id,
        event_type="PAYMENT_CANCELLED",
        entity_type="payment_link",
        entity_id=payment_id,
        actor_id=actor_id,
        before_value=before,
        after_value={"status": "abandoned"},
    )
    return payment
