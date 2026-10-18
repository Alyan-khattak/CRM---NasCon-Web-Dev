"""
Workspace and user management routes.
F1.2: Owner invites users, assigns roles; Admin cannot modify Owner.
F1.3: Owner configures permissions.
TD-1.1: all queries scoped by workspace_id from JWT — never from request body.
Q2: server-side authorization on every endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import (
    CurrentUser,
    ROLE_OWNER,
    ROLE_ADMIN,
    admin_or_above,
    get_current_user,
    owner_only,
    require_role,
)
from app.database import get_db
from app.middleware.audit import write_audit
from app.middleware.rate_limit import default_limit
from app.models.orm import Role, RolePermission, UserCredential, WorkspaceUser
from app.models.schemas import (
    MessageResponse,
    PermissionUpdate,
    RoleCreate,
    RoleResponse,
    UserInvite,
    UserResponse,
    UserUpdate,
)
import os

router = APIRouter(prefix="/workspaces", tags=["workspaces"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash(password: str) -> tuple[str, str]:
    salt = os.urandom(16).hex()
    return pwd_ctx.hash(password + salt), salt


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
@default_limit
async def list_users(
    request: Request,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F1.2: list users in the caller's workspace. Admin or Owner only."""
    result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_id == current_user.workspace_id
        )
    )
    return result.scalars().all()


@router.post("/users", response_model=UserResponse, status_code=201)
@default_limit
async def invite_user(
    request: Request,
    body: UserInvite,
    current_user: CurrentUser = Depends(owner_only()),
    db: AsyncSession = Depends(get_db),
):
    """F1.2: Owner invites a user. Only Owner can assign roles."""
    # Verify role belongs to this workspace
    role_result = await db.execute(
        select(Role).where(
            Role.role_id == body.role_id,
            Role.workspace_id == current_user.workspace_id,
        )
    )
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(400, "Role not found in this workspace")

    # F1.2: Admin cannot modify Owner — prevent creating another Owner
    if role.role_type == ROLE_OWNER:
        raise HTTPException(403, "Cannot create another Owner")

    # Email uniqueness within workspace
    existing = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_id == current_user.workspace_id,
            WorkspaceUser.email == body.email,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already exists in this workspace")

    user = WorkspaceUser(
        workspace_id=current_user.workspace_id,
        full_name=body.full_name,
        email=body.email,
        cell_no=body.cell_no,
        role_id=body.role_id,
        availability_status=1,  # Available by default
    )
    db.add(user)
    await db.flush()

    pwd_hash, salt = _hash(body.password)
    db.add(UserCredential(workspace_user_id=user.workspace_user_id, pwd_hash=pwd_hash, salt=salt))

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="USER_INVITED",
        entity_type="workspace_user",
        entity_id=user.workspace_user_id,
        actor_id=current_user.workspace_user_id,
        after_value={"email": body.email, "role_id": body.role_id},
    )

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
@default_limit
async def update_user(
    request: Request,
    user_id: int,
    body: UserUpdate,
    current_user: CurrentUser = Depends(admin_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """F1.2, F3.2: update user fields. Admins cannot modify Owner accounts."""
    result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_user_id == user_id,
            WorkspaceUser.workspace_id == current_user.workspace_id,  # TD-1.1
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    # F1.2: Admin cannot modify Owner
    target_role = await db.execute(select(Role).where(Role.role_id == user.role_id))
    target_role = target_role.scalar_one()
    if target_role.role_type == ROLE_OWNER and current_user.role_type != ROLE_OWNER:
        raise HTTPException(403, "Cannot modify Owner account")

    before = {"role_id": user.role_id, "availability_status": user.availability_status, "is_active": user.is_active}

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    after = {"role_id": user.role_id, "availability_status": user.availability_status, "is_active": user.is_active}

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="USER_UPDATED",
        entity_type="workspace_user",
        entity_id=user_id,
        actor_id=current_user.workspace_user_id,
        before_value=before,
        after_value=after,
    )

    await db.commit()
    await db.refresh(user)
    return user


# ── Roles ─────────────────────────────────────────────────────────────────────

@router.get("/roles", response_model=list[RoleResponse])
@default_limit
async def list_roles(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """F1.2: list roles in this workspace."""
    result = await db.execute(
        select(Role).where(Role.workspace_id == current_user.workspace_id)
    )
    return result.scalars().all()


@router.post("/roles", response_model=RoleResponse, status_code=201)
@default_limit
async def create_role(
    request: Request,
    body: RoleCreate,
    current_user: CurrentUser = Depends(owner_only()),
    db: AsyncSession = Depends(get_db),
):
    """F1.2: Owner creates a custom role (is_system_role=False)."""
    role = Role(
        workspace_id=current_user.workspace_id,
        role_name=body.role_name,
        role_type=body.role_type,
        is_system_role=False,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.put("/roles/{role_id}/permissions", response_model=MessageResponse)
@default_limit
async def set_permission(
    request: Request,
    role_id: int,
    body: PermissionUpdate,
    current_user: CurrentUser = Depends(owner_only()),
    db: AsyncSession = Depends(get_db),
):
    """F1.3: Owner sets CRUD flags for a role + functionality code."""
    # Verify role belongs to this workspace
    role_res = await db.execute(
        select(Role).where(Role.role_id == role_id, Role.workspace_id == current_user.workspace_id)
    )
    if not role_res.scalar_one_or_none():
        raise HTTPException(404, "Role not found")

    # Upsert permission
    perm_res = await db.execute(
        select(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.functionality_code == body.functionality_code,
        )
    )
    perm = perm_res.scalar_one_or_none()
    if perm:
        perm.can_view = body.can_view
        perm.can_create = body.can_create
        perm.can_edit = body.can_edit
        perm.can_delete = body.can_delete
    else:
        db.add(RolePermission(
            role_id=role_id,
            functionality_code=body.functionality_code,
            can_view=body.can_view,
            can_create=body.can_create,
            can_edit=body.can_edit,
            can_delete=body.can_delete,
        ))

    await write_audit(
        db,
        workspace_id=current_user.workspace_id,
        event_type="PERMISSION_CHANGED",
        entity_type="role_permission",
        entity_id=role_id,
        actor_id=current_user.workspace_user_id,
        after_value=body.model_dump(),
    )

    await db.commit()
    return MessageResponse(message="Permission updated")
