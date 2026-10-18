"""
Platform admin portal — Option A.
Separate auth, separate JWT, manage all workspaces across tenants.
PLATFORM_SECRET_KEY from env — never share with workspace JWTs.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rate_limit import auth_limit
from app.models.orm import Workspace, WorkspaceUser

router = APIRouter(prefix="/platform", tags=["platform-admin"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

_PLATFORM_SECRET = os.getenv("PLATFORM_SECRET_KEY", "platform-change-me-32-chars-xxxx")
_ALGO = "HS256"
_EXPIRE_MINUTES = 480  # 8h sessions for admin


# ── In-memory admin store for MVP (replace with DB table when needed) ──────────
# Seeded from env: PLATFORM_ADMIN_EMAIL + PLATFORM_ADMIN_PASSWORD_HASH
def _get_admin_email() -> str:
    return os.getenv("PLATFORM_ADMIN_EMAIL", "admin@platform.local")

def _get_admin_pwd_hash() -> str:
    return os.getenv("PLATFORM_ADMIN_PASSWORD_HASH", "")


def _issue_platform_token(admin_email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": admin_email, "aud": "platform", "exp": exp},
        _PLATFORM_SECRET,
        algorithm=_ALGO,
    )


def _verify_platform_token(token: str) -> str:
    try:
        payload = jwt.decode(token, _PLATFORM_SECRET, algorithms=[_ALGO], audience="platform")
        return payload["sub"]
    except JWTError:
        raise HTTPException(401, "Invalid platform token")


# ── Dependency ─────────────────────────────────────────────────────────────────

def get_platform_admin(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing platform token")
    return _verify_platform_token(auth[7:])


# ── Schemas ────────────────────────────────────────────────────────────────────

class PlatformLoginRequest(BaseModel):
    email: str
    password: str


class WorkspaceListItem(BaseModel):
    workspace_id: int
    workspace_name: str
    workspace_slug: str
    email: str
    is_active: bool
    created_at: datetime
    user_count: Optional[int] = None

    model_config = {"from_attributes": True}


class WorkspaceSuspendRequest(BaseModel):
    reason: Optional[str] = None


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/auth/login")
@auth_limit
async def platform_login(request: Request, body: PlatformLoginRequest):
    """Platform admin login. Separate token with aud=platform."""
    admin_email = _get_admin_email()
    pwd_hash = _get_admin_pwd_hash()

    if body.email != admin_email:
        raise HTTPException(401, "Invalid credentials")

    if not pwd_hash:
        raise HTTPException(503, "Platform admin not configured — set PLATFORM_ADMIN_PASSWORD_HASH in env")

    if not pwd_ctx.verify(body.password, pwd_hash):
        raise HTTPException(401, "Invalid credentials")

    token = _issue_platform_token(admin_email)
    return {"access_token": token, "token_type": "bearer", "admin_email": admin_email}


@router.post("/auth/setup", status_code=201)
async def platform_setup(body: PlatformLoginRequest):
    """
    One-time helper to generate password hash for PLATFORM_ADMIN_PASSWORD_HASH.
    Returns the hash to paste into .env — remove this route after setup in prod.
    """
    hashed = pwd_ctx.hash(body.password)
    return {
        "hash": hashed,
        "instruction": f"Set PLATFORM_ADMIN_EMAIL={body.email} and PLATFORM_ADMIN_PASSWORD_HASH=<hash> in .env",
    }


@router.get("/workspaces", response_model=list[WorkspaceListItem])
async def list_workspaces(
    request: Request,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    admin: str = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces across all tenants."""
    q = select(Workspace).order_by(Workspace.created_at.desc()).limit(min(limit, 200)).offset(offset)
    if search:
        q = q.where(Workspace.workspace_name.ilike(f"%{search}%"))
    if is_active is not None:
        q = q.where(Workspace.is_active == is_active)
    result = await db.execute(q)
    workspaces = result.scalars().all()

    # Attach user counts
    items = []
    for ws in workspaces:
        cnt_result = await db.execute(
            select(func.count()).where(WorkspaceUser.workspace_id == ws.workspace_id)
        )
        cnt = cnt_result.scalar_one()
        item = WorkspaceListItem(
            workspace_id=ws.workspace_id,
            workspace_name=ws.workspace_name,
            workspace_slug=ws.workspace_slug,
            email=ws.email,
            is_active=ws.is_active,
            created_at=ws.created_at,
            user_count=cnt,
        )
        items.append(item)
    return items


@router.get("/workspaces/{workspace_id}")
async def get_workspace(
    workspace_id: int,
    admin: str = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get single workspace details."""
    result = await db.execute(select(Workspace).where(Workspace.workspace_id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(404, "Workspace not found")

    users_result = await db.execute(
        select(WorkspaceUser).where(WorkspaceUser.workspace_id == workspace_id)
    )
    users = users_result.scalars().all()

    return {
        "workspace_id": ws.workspace_id,
        "workspace_name": ws.workspace_name,
        "workspace_slug": ws.workspace_slug,
        "email": ws.email,
        "phone": ws.phone,
        "is_active": ws.is_active,
        "created_at": ws.created_at,
        "users": [
            {
                "workspace_user_id": u.workspace_user_id,
                "full_name": u.full_name,
                "email": u.email,
                "is_active": u.is_active,
            }
            for u in users
        ],
    }


@router.patch("/workspaces/{workspace_id}/suspend", status_code=200)
async def suspend_workspace(
    workspace_id: int,
    body: WorkspaceSuspendRequest,
    admin: str = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Suspend a workspace — all logins will be rejected."""
    result = await db.execute(select(Workspace).where(Workspace.workspace_id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    ws.is_active = False
    await db.commit()
    return {"workspace_id": workspace_id, "is_active": False, "reason": body.reason}


@router.patch("/workspaces/{workspace_id}/activate", status_code=200)
async def activate_workspace(
    workspace_id: int,
    admin: str = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reactivate a suspended workspace."""
    result = await db.execute(select(Workspace).where(Workspace.workspace_id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    ws.is_active = True
    await db.commit()
    return {"workspace_id": workspace_id, "is_active": True}


@router.get("/stats")
async def platform_stats(
    admin: str = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide counts."""
    total_ws = (await db.execute(select(func.count()).select_from(Workspace))).scalar_one()
    active_ws = (await db.execute(select(func.count()).select_from(Workspace).where(Workspace.is_active == True))).scalar_one()
    total_users = (await db.execute(select(func.count()).select_from(WorkspaceUser))).scalar_one()
    return {
        "total_workspaces": total_ws,
        "active_workspaces": active_ws,
        "suspended_workspaces": total_ws - active_ws,
        "total_users": total_users,
    }
