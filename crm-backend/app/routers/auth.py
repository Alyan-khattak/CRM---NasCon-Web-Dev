"""
Auth routes: signup, login, token refresh, logout.
F1.1: sign-up creates workspace + Owner; login/logout + persistent sessions.
Q1: brute-force lockout, password hashing.
Rate limit: 5/minute (stricter than default).
"""
import os
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.database import get_db
from app.middleware.rate_limit import auth_limit, limiter
from app.models.orm import AvailabilityStatus, Role, UserCredential, Workspace, WorkspaceUser
from app.models.schemas import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    TokenResponse,
    WorkspaceCreate,
    WorkspaceResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

MAX_FAILED = 5          # Q1: lock after 5 bad attempts
LOCKOUT_MINUTES = 15    # Q1: lockout duration


def _hash(password: str) -> tuple[str, str]:
    """Returns (pwd_hash, salt). bcrypt embeds salt; we store separately for audit."""
    salt = os.urandom(16).hex()
    pwd_hash = pwd_ctx.hash(password + salt)
    return pwd_hash, salt


def _verify(password: str, pwd_hash: str, salt: str) -> bool:
    return pwd_ctx.verify(password + salt, pwd_hash)


@router.post("/signup", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
@auth_limit
async def signup(request: Request, body: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    """
    F1.1: creates workspace + first user as Owner.
    Also seeds the three system roles and four availability statuses.
    """
    # Uniqueness check on slug
    existing = await db.execute(select(Workspace).where(Workspace.workspace_slug == body.workspace_slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="workspace_slug already taken")

    # Create workspace
    workspace = Workspace(
        workspace_name=body.workspace_name,
        workspace_slug=body.workspace_slug,
        email=body.email,
        phone=body.phone,
        timezone=body.timezone,
    )
    db.add(workspace)
    await db.flush()  # get workspace_id

    # Seed availability statuses (idempotent — only insert if table empty)
    status_count = await db.execute(select(AvailabilityStatus))
    if not status_count.scalars().first():
        for s in [
            AvailabilityStatus(status_id=1, status_name="Available", is_assignment_eligible=True),
            AvailabilityStatus(status_id=2, status_name="Busy", is_assignment_eligible=False),
            AvailabilityStatus(status_id=3, status_name="On Leave", is_assignment_eligible=False),
            AvailabilityStatus(status_id=4, status_name="Offline", is_assignment_eligible=False),
        ]:
            db.add(s)
        await db.flush()

    # Seed Owner role for this workspace
    owner_role = Role(
        workspace_id=workspace.workspace_id,
        role_name="Owner",
        role_type=1,
        is_system_role=True,
    )
    db.add(owner_role)
    db.add(Role(workspace_id=workspace.workspace_id, role_name="Admin", role_type=2, is_system_role=True))
    db.add(Role(workspace_id=workspace.workspace_id, role_name="User", role_type=3, is_system_role=True))
    await db.flush()

    # Create Owner user
    user = WorkspaceUser(
        workspace_id=workspace.workspace_id,
        full_name=body.owner_full_name,
        email=body.email,
        availability_status=1,
        role_id=owner_role.role_id,
    )
    db.add(user)
    await db.flush()

    pwd_hash, salt = _hash(body.owner_password)
    db.add(UserCredential(
        workspace_user_id=user.workspace_user_id,
        pwd_hash=pwd_hash,
        salt=salt,
    ))

    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.post("/login", response_model=TokenResponse)
@auth_limit
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    F1.1, Q1: authenticate email + password within a workspace slug.
    Enforces lockout after MAX_FAILED consecutive failures.
    """
    # Resolve workspace
    ws_result = await db.execute(
        select(Workspace).where(Workspace.workspace_slug == body.workspace_slug, Workspace.is_active == True)
    )
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Resolve user within workspace — TD-1.1: scoped by workspace_id
    user_result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_id == workspace.workspace_id,
            WorkspaceUser.email == body.email,
            WorkspaceUser.is_active == True,
        )
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Load credential
    cred_result = await db.execute(
        select(UserCredential).where(UserCredential.workspace_user_id == user.workspace_user_id)
    )
    cred = cred_result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Q1: lockout check — SQLite returns naive datetimes; normalize before compare
    now = datetime.now(timezone.utc)
    locked_until = cred.locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until and locked_until > now:
        raise HTTPException(status_code=429, detail="Account locked — try again later")

    if not _verify(body.password, cred.pwd_hash, cred.salt):
        cred.failed_attempts = (cred.failed_attempts or 0) + 1
        if cred.failed_attempts >= MAX_FAILED:
            from datetime import timedelta
            cred.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            cred.failed_attempts = 0
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Success — reset lockout counters
    cred.failed_attempts = 0
    cred.locked_until = None
    cred.last_login_at = now

    # Load role_type for token
    role_result = await db.execute(select(Role).where(Role.role_id == user.role_id))
    role = role_result.scalar_one()

    await db.commit()

    from app.config import settings as cfg
    return TokenResponse(
        access_token=create_access_token(user.workspace_user_id, workspace.workspace_id, role.role_type),
        refresh_token=create_refresh_token(user.workspace_user_id, workspace.workspace_id),
        expires_in=cfg.JWT_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
@auth_limit
async def refresh(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """F1.1, Q1: issue new access token from a valid refresh token."""
    try:
        payload = verify_refresh_token(body.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = int(payload["sub"])
    workspace_id = int(payload["wid"])

    user_result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_user_id == user_id,
            WorkspaceUser.workspace_id == workspace_id,
            WorkspaceUser.is_active == True,
        )
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    role_result = await db.execute(select(Role).where(Role.role_id == user.role_id))
    role = role_result.scalar_one()

    from app.config import settings as cfg
    return TokenResponse(
        access_token=create_access_token(user.workspace_user_id, workspace_id, role.role_type),
        refresh_token=create_refresh_token(user.workspace_user_id, workspace_id),
        expires_in=cfg.JWT_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """
    F1.1, Q1: client discards tokens. Stateless JWT — no server-side revocation in Phase 1.
    Phase 5 can add a token denylist via lgs.jwt_token_log if needed.
    """
    return MessageResponse(message="Logged out successfully")
