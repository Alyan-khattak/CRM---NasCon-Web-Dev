"""
Saved filters CRUD. F2.6: combine ≥3 criteria, save, auto-update as records match.
TD-1.1: all queries scoped to current_user.workspace_id.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.rate_limit import default_limit
from app.models.orm import SavedFilter
from app.models.schemas import MessageResponse, SavedFilterCreate, SavedFilterResponse

router = APIRouter(prefix="/filters", tags=["saved-filters"])


@router.get("", response_model=list[SavedFilterResponse])
@default_limit
async def list_filters(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.6: list saved filters for this workspace."""
    result = await db.execute(
        select(SavedFilter).where(SavedFilter.workspace_id == current_user.workspace_id)
    )
    return result.scalars().all()


@router.post("", response_model=SavedFilterResponse, status_code=201)
@default_limit
async def create_filter(
    request: Request,
    body: SavedFilterCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F2.6: save a filter with ≥3 criteria (enforced by schema)."""
    criteria = [c.model_dump() for c in body.criteria]
    saved = SavedFilter(
        workspace_id=current_user.workspace_id,
        created_by=current_user.workspace_user_id,
        filter_name=body.filter_name,
        entity_type=body.entity_type,
        criteria_json=criteria,
    )
    db.add(saved)
    await db.commit()
    await db.refresh(saved)
    return saved


@router.get("/{filter_id}", response_model=SavedFilterResponse)
@default_limit
async def get_filter(
    request: Request,
    filter_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_filter(db, filter_id, current_user.workspace_id)


@router.delete("/{filter_id}", response_model=MessageResponse)
@default_limit
async def delete_filter(
    request: Request,
    filter_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    saved = await _get_filter(db, filter_id, current_user.workspace_id)
    await db.delete(saved)
    await db.commit()
    return MessageResponse(message="Filter deleted")


async def _get_filter(db: AsyncSession, filter_id: int, workspace_id: int) -> SavedFilter:
    result = await db.execute(
        select(SavedFilter).where(
            SavedFilter.filter_id == filter_id,
            SavedFilter.workspace_id == workspace_id,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Filter not found")
    return f
