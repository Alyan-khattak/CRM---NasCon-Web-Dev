"""
Contact CRUD routes. F2.1, F2.8.
TD-1.1: all queries scoped to current_user.workspace_id.
I1.9: is_opted_out exposed for messaging enforcement.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit import write_audit
from app.middleware.rate_limit import default_limit
from app.models.orm import Company, Contact
from app.models.schemas import ContactCreate, ContactResponse, ContactUpdate, MessageResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactResponse])
@default_limit
async def list_contacts(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.1: list contacts in caller's workspace. TD-1.1: workspace_id scoped."""
    result = await db.execute(
        select(Contact).where(Contact.workspace_id == current_user.workspace_id)
    )
    return result.scalars().all()


@router.post("", response_model=ContactResponse, status_code=201)
@default_limit
async def create_contact(
    request: Request,
    body: ContactCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.1: create contact within workspace."""
    if body.company_id:
        co = await db.execute(
            select(Company).where(
                Company.company_id == body.company_id,
                Company.workspace_id == current_user.workspace_id,
            )
        )
        if not co.scalar_one_or_none():
            raise HTTPException(400, "Company not found in this workspace")

    contact = Contact(workspace_id=current_user.workspace_id, **body.model_dump())
    db.add(contact)
    await db.flush()

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="CONTACT_CREATED",
        entity_type="contact",
        entity_id=contact.contact_id,
        actor_id=current_user.workspace_user_id,
        after_value={"full_name": contact.full_name, "email": contact.email},
    )

    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactResponse)
@default_limit
async def get_contact(
    request: Request,
    contact_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.8: get contact detail. TD-1.1: workspace_id scoped."""
    result = await db.execute(
        select(Contact).where(
            Contact.contact_id == contact_id,
            Contact.workspace_id == current_user.workspace_id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactResponse)
@default_limit
async def update_contact(
    request: Request,
    contact_id: int,
    body: ContactUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.1, I1.9: update contact fields including opt-out."""
    result = await db.execute(
        select(Contact).where(
            Contact.contact_id == contact_id,
            Contact.workspace_id == current_user.workspace_id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")

    before = {"full_name": contact.full_name, "is_opted_out": contact.is_opted_out}
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(contact, field, value)

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="CONTACT_UPDATED",
        entity_type="contact",
        entity_id=contact_id,
        actor_id=current_user.workspace_user_id,
        before_value=before,
        after_value={"full_name": contact.full_name, "is_opted_out": contact.is_opted_out},
    )

    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", response_model=MessageResponse)
@default_limit
async def delete_contact(
    request: Request,
    contact_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete contact. TD-1.1: workspace_id scoped."""
    result = await db.execute(
        select(Contact).where(
            Contact.contact_id == contact_id,
            Contact.workspace_id == current_user.workspace_id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")

    await db.delete(contact)
    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="CONTACT_DELETED",
        entity_type="contact",
        entity_id=contact_id,
        actor_id=current_user.workspace_user_id,
        before_value={"full_name": contact.full_name},
    )
    await db.commit()
    return MessageResponse(message="Contact deleted")
