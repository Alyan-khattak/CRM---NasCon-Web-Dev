"""
Stripe payment routes — test mode.
I2.1: create Stripe Checkout Session (hosted page, no card data, I2.8).
I2.3: webhook signature verified in payment_service.
I2.4: idempotency via integration_events.
TD-1.1: workspace_id scoped.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.rate_limit import default_limit
from app.models.orm import PaymentRequest
from app.services.payment_service import (
    cancel_payment,
    create_checkout_session,
)

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentCreateRequest(BaseModel):
    """I2.1: initiate Stripe Checkout Session."""
    amount: float
    currency: str = "usd"
    description: str = "CRM Payment"
    opportunity_id: Optional[int] = None
    contact_id: Optional[int] = None

    @field_validator("amount")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v


class PaymentResponse(BaseModel):
    payment_link_id: int
    workspace_id: int
    opportunity_id: Optional[int]
    contact_id: Optional[int]
    stripe_session_id: str
    stripe_payment_intent_id: Optional[str]
    amount: float
    currency: str
    status: str
    checkout_url: Optional[str] = None

    model_config = {"from_attributes": True}


@router.post("", response_model=PaymentResponse, status_code=201)
@default_limit
async def create_payment(
    request: Request,
    body: PaymentCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    I2.1: create Stripe Checkout Session.
    Returns checkout_url — redirect customer there to pay.
    No card data touches our server (I2.8).
    Status updates automatically via Stripe webhook (I2.2).
    """
    payment = await create_checkout_session(
        db,
        workspace_id=current_user.workspace_id,
        actor_id=current_user.workspace_user_id,
        amount=body.amount,
        currency=body.currency,
        opportunity_id=body.opportunity_id,
        contact_id=body.contact_id,
        description=body.description,
    )
    # Capture transient checkout_url before refresh wipes __dict__
    checkout_url = payment.__dict__.get("checkout_url")
    await db.commit()
    await db.refresh(payment)

    return PaymentResponse(
        payment_link_id=payment.payment_link_id,
        workspace_id=payment.workspace_id,
        opportunity_id=payment.opportunity_id,
        contact_id=payment.contact_id,
        stripe_session_id=payment.stripe_session_id,
        stripe_payment_intent_id=payment.stripe_payment_intent_id,
        amount=float(payment.amount),
        currency=payment.currency,
        status=payment.status,
        checkout_url=checkout_url,
    )


@router.get("", response_model=list[PaymentResponse])
@default_limit
async def list_payments(
    request: Request,
    status: Optional[str] = None,
    contact_id: Optional[int] = None,
    opportunity_id: Optional[int] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List payment requests for this workspace. TD-1.1."""
    q = select(PaymentRequest).where(PaymentRequest.workspace_id == current_user.workspace_id)
    if status:
        q = q.where(PaymentRequest.status == status)
    if contact_id:
        q = q.where(PaymentRequest.contact_id == contact_id)
    if opportunity_id:
        q = q.where(PaymentRequest.opportunity_id == opportunity_id)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        PaymentResponse(
            payment_link_id=p.payment_link_id,
            workspace_id=p.workspace_id,
            opportunity_id=p.opportunity_id,
            contact_id=p.contact_id,
            stripe_session_id=p.stripe_session_id,
            stripe_payment_intent_id=p.stripe_payment_intent_id,
            amount=float(p.amount),
            currency=p.currency,
            status=p.status,
        )
        for p in rows
    ]


@router.post("/{payment_id}/cancel", response_model=PaymentResponse)
@default_limit
async def cancel(
    request: Request,
    payment_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending payment before customer pays."""
    payment = await cancel_payment(
        db,
        workspace_id=current_user.workspace_id,
        payment_id=payment_id,
        actor_id=current_user.workspace_user_id,
    )
    await db.commit()
    await db.refresh(payment)
    return PaymentResponse(
        payment_link_id=payment.payment_link_id,
        workspace_id=payment.workspace_id,
        opportunity_id=payment.opportunity_id,
        contact_id=payment.contact_id,
        stripe_session_id=payment.stripe_session_id,
        stripe_payment_intent_id=payment.stripe_payment_intent_id,
        amount=float(payment.amount),
        currency=payment.currency,
        status=payment.status,
    )
