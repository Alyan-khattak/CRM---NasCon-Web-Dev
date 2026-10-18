"""
Easypaisa manual payment routes.
I2.x: no card data, no payment API — manual flow.
Employee creates request, shares workspace Easypaisa number, customer pays, employee confirms txn ref.
TD-1.1: workspace_id scoped.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.rate_limit import default_limit
from app.models.orm import IntegrationCredential, PaymentRequest
from app.services.payment_service import (
    cancel_payment,
    confirm_payment,
    create_payment_request,
    get_easypaisa_number,
)

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentCreateRequest(BaseModel):
    """I2.1: create payment request."""
    amount: float
    opportunity_id: Optional[int] = None
    contact_id: Optional[int] = None

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v


class PaymentConfirmRequest(BaseModel):
    """I2.2: confirm with Easypaisa transaction reference."""
    easypaisa_txn_ref: str


class EasypaisaConfigRequest(BaseModel):
    """Configure workspace Easypaisa account number."""
    account_number: str


class PaymentResponse(BaseModel):
    payment_link_id: int
    workspace_id: int
    opportunity_id: Optional[int]
    contact_id: Optional[int]
    stripe_session_id: str  # internal ref (EP-xxxx)
    stripe_payment_intent_id: Optional[str]  # Easypaisa txn ref after confirmation
    amount: float
    currency: str
    status: str

    model_config = {"from_attributes": True}


@router.post("", response_model=dict, status_code=201)
@default_limit
async def create_payment(
    request: Request,
    body: PaymentCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """I2.1: create Easypaisa payment request. Returns request + workspace account number."""
    payment, easypaisa_number = await create_payment_request(
        db,
        workspace_id=current_user.workspace_id,
        actor_id=current_user.workspace_user_id,
        amount=body.amount,
        opportunity_id=body.opportunity_id,
        contact_id=body.contact_id,
    )
    await db.commit()
    await db.refresh(payment)
    return {
        "payment": {
            "payment_link_id": payment.payment_link_id,
            "internal_ref": payment.stripe_session_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
        },
        "easypaisa_number": easypaisa_number,
        "instructions": (
            f"Customer should pay PKR {payment.amount} to Easypaisa number: "
            f"{easypaisa_number or 'NOT CONFIGURED — set via POST /payments/config/easypaisa'}. "
            f"Use reference: {payment.stripe_session_id}"
        ),
    }


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
    """List payment requests for this workspace."""
    q = select(PaymentRequest).where(PaymentRequest.workspace_id == current_user.workspace_id)
    if status:
        q = q.where(PaymentRequest.status == status)
    if contact_id:
        q = q.where(PaymentRequest.contact_id == contact_id)
    if opportunity_id:
        q = q.where(PaymentRequest.opportunity_id == opportunity_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/{payment_id}/confirm", response_model=PaymentResponse)
@default_limit
async def confirm(
    request: Request,
    payment_id: int,
    body: PaymentConfirmRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """I2.2: employee confirms payment received with Easypaisa transaction reference. I2.8: no card data."""
    payment = await confirm_payment(
        db,
        workspace_id=current_user.workspace_id,
        payment_id=payment_id,
        actor_id=current_user.workspace_user_id,
        easypaisa_txn_ref=body.easypaisa_txn_ref,
    )
    await db.commit()
    await db.refresh(payment)
    return payment


@router.post("/{payment_id}/cancel", response_model=PaymentResponse)
@default_limit
async def cancel(
    request: Request,
    payment_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending payment request."""
    payment = await cancel_payment(
        db,
        workspace_id=current_user.workspace_id,
        payment_id=payment_id,
        actor_id=current_user.workspace_user_id,
    )
    await db.commit()
    await db.refresh(payment)
    return payment


@router.post("/config/easypaisa", status_code=200)
@default_limit
async def configure_easypaisa(
    request: Request,
    body: EasypaisaConfigRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set workspace Easypaisa account number. Upserts integration credential."""
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.workspace_id == current_user.workspace_id,
            IntegrationCredential.integration_type == "easypaisa",
        )
    )
    cred = result.scalar_one_or_none()
    if cred:
        cred.metadata_json = {"account_number": body.account_number}
        cred.is_active = True
    else:
        cred = IntegrationCredential(
            workspace_id=current_user.workspace_id,
            integration_type="easypaisa",
            metadata_json={"account_number": body.account_number},
            is_active=True,
        )
        db.add(cred)
    await db.commit()
    return {"easypaisa_number": body.account_number, "configured": True}


@router.get("/config/easypaisa")
@default_limit
async def get_easypaisa_config(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get workspace Easypaisa account number."""
    number = await get_easypaisa_number(db, current_user.workspace_id)
    return {"easypaisa_number": number, "configured": number is not None}
