"""
JWT token creation and verification.
F1.1: persistent sessions; Q1: session/token expiry.
I5.3: SECRET_KEY from env only.
"""
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings

# Token type constants
ACCESS = "access"
REFRESH = "refresh"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(workspace_user_id: int, workspace_id: int, role_type: int) -> str:
    """
    F1.1, Q1: short-lived access token carrying identity + workspace scope.
    Payload is minimal — never store sensitive data in JWT.
    """
    expire = _now() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(workspace_user_id),
        "wid": workspace_id,          # workspace_id for TD-1.1 scoping
        "role": role_type,
        "type": ACCESS,
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(workspace_user_id: int, workspace_id: int) -> str:
    """Q1: longer-lived refresh token, refresh-only type."""
    expire = _now() + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": str(workspace_user_id),
        "wid": workspace_id,
        "type": REFRESH,
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Raises JWTError on invalid/expired token.
    Caller checks 'type' field to distinguish access vs refresh.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def verify_access_token(token: str) -> dict:
    """Returns payload dict or raises ValueError."""
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
    if payload.get("type") != ACCESS:
        raise ValueError("Not an access token")
    return payload


def verify_refresh_token(token: str) -> dict:
    """Returns payload dict or raises ValueError."""
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
    if payload.get("type") != REFRESH:
        raise ValueError("Not a refresh token")
    return payload
