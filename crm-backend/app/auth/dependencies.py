"""
FastAPI dependency injection for auth + RBAC.
F1.5: server rejects unauthorized direct API calls.
Q2: server-side workspace and permission checks on every protected endpoint.
TD-1.1: workspace_id pulled from token, not from request body.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import verify_access_token
from app.database import get_db
from app.models.orm import WorkspaceUser

bearer_scheme = HTTPBearer()

ROLE_OWNER = 1
ROLE_ADMIN = 2
ROLE_USER = 3


class CurrentUser:
    """Parsed identity from a verified JWT — attached to every protected request."""
    def __init__(self, workspace_user_id: int, workspace_id: int, role_type: int, role_id: int):
        self.workspace_user_id = workspace_user_id
        self.workspace_id = workspace_id
        self.role_type = role_type
        self.role_id = role_id


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """
    Q2, F1.5: verifies JWT, loads user from DB, enforces workspace isolation.
    Raises 401 on any token problem; 403 if user is inactive.
    """
    token = credentials.credentials
    try:
        payload = verify_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])
    workspace_id = int(payload["wid"])
    role_type = int(payload["role"])

    # Confirm user still active in this workspace (Q2 — never trust token alone)
    result = await db.execute(
        select(WorkspaceUser).where(
            WorkspaceUser.workspace_user_id == user_id,
            WorkspaceUser.workspace_id == workspace_id,
            WorkspaceUser.is_active == True,
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive or not found")

    return CurrentUser(user_id, workspace_id, role_type, user.role_id)


def require_role(*allowed_roles: int):
    """
    F1.2: role gate — usage: Depends(require_role(ROLE_OWNER, ROLE_ADMIN)).
    """
    async def _check(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role_type not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return _check


def owner_only():
    """Convenience: Owner-only gate."""
    return require_role(ROLE_OWNER)


def admin_or_above():
    """Owner or Admin."""
    return require_role(ROLE_OWNER, ROLE_ADMIN)
