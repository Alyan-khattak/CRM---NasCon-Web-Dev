"""
Company CRUD routes. F2.1.
TD-1.1: all queries scoped to current_user.workspace_id.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit import write_audit
from app.middleware.rate_limit import default_limit
from app.models.orm import Company
from app.models.schemas import CompanyCreate, CompanyResponse, CompanyUpdate, MessageResponse

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyResponse])
@default_limit
async def list_companies(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.workspace_id == current_user.workspace_id)
    )
    return result.scalars().all()


@router.post("", response_model=CompanyResponse, status_code=201)
@default_limit
async def create_company(
    request: Request,
    body: CompanyCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    company = Company(workspace_id=current_user.workspace_id, **body.model_dump())
    db.add(company)
    await db.flush()

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="COMPANY_CREATED",
        entity_type="company",
        entity_id=company.company_id,
        actor_id=current_user.workspace_user_id,
        after_value={"company_name": company.company_name},
    )

    await db.commit()
    await db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyResponse)
@default_limit
async def get_company(
    request: Request,
    company_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(
            Company.company_id == company_id,
            Company.workspace_id == current_user.workspace_id,
        )
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@router.patch("/{company_id}", response_model=CompanyResponse)
@default_limit
async def update_company(
    request: Request,
    company_id: int,
    body: CompanyUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(
            Company.company_id == company_id,
            Company.workspace_id == current_user.workspace_id,
        )
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Company not found")

    before = {"company_name": company.company_name}
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(company, field, value)

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="COMPANY_UPDATED",
        entity_type="company",
        entity_id=company_id,
        actor_id=current_user.workspace_user_id,
        before_value=before,
        after_value={"company_name": company.company_name},
    )

    await db.commit()
    await db.refresh(company)
    return company


@router.delete("/{company_id}", response_model=MessageResponse)
@default_limit
async def delete_company(
    request: Request,
    company_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(
            Company.company_id == company_id,
            Company.workspace_id == current_user.workspace_id,
        )
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Company not found")

    await db.delete(company)
    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="COMPANY_DELETED",
        entity_type="company",
        entity_id=company_id,
        actor_id=current_user.workspace_user_id,
        before_value={"company_name": company.company_name},
    )
    await db.commit()
    return MessageResponse(message="Company deleted")
