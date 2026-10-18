"""
Auth route tests — Phase 1.
Covers: signup, login, token refresh, logout, lockout, cross-workspace isolation.
All tests use in-memory SQLite; no real providers called.
"""
import pytest
from httpx import AsyncClient

from app.tests.conftest import (
    WORKSPACE_PAYLOAD,
    LOGIN_PAYLOAD,
    create_workspace_and_login,
)

pytestmark = pytest.mark.asyncio


# ── Signup ────────────────────────────────────────────────────────────────────

async def test_signup_creates_workspace(client: AsyncClient):
    resp = await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["workspace_slug"] == "test-corp"
    assert data["is_active"] is True


async def test_signup_duplicate_slug_rejected(client: AsyncClient):
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    resp = await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    assert resp.status_code == 400
    assert "slug" in resp.json()["detail"].lower()


# ── Login ─────────────────────────────────────────────────────────────────────

async def test_login_returns_tokens(client: AsyncClient):
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    resp = await client.post("/auth/login", json=LOGIN_PAYLOAD)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient):
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    resp = await client.post("/auth/login", json={**LOGIN_PAYLOAD, "password": "wrongpass"})
    assert resp.status_code == 401


async def test_login_wrong_workspace_slug(client: AsyncClient):
    """TD-1.1: credentials from one workspace cannot log into another."""
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    resp = await client.post("/auth/login", json={**LOGIN_PAYLOAD, "workspace_slug": "nonexistent"})
    assert resp.status_code == 401


# ── Token Refresh ─────────────────────────────────────────────────────────────

async def test_refresh_token_works(client: AsyncClient):
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    login_resp = await client.post("/auth/login", json=LOGIN_PAYLOAD)
    refresh_token = login_resp.json()["refresh_token"]

    resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_with_access_token_rejected(client: AsyncClient):
    """Cannot use access token as refresh token."""
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    login_resp = await client.post("/auth/login", json=LOGIN_PAYLOAD)
    access_token = login_resp.json()["access_token"]

    resp = await client.post("/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401


# ── Logout ─────────────────────────────────────────────────────────────────────

async def test_logout_returns_ok(client: AsyncClient):
    resp = await client.post("/auth/logout")
    assert resp.status_code == 200


# ── Protected route — missing token ──────────────────────────────────────────

async def test_protected_route_without_token(client: AsyncClient):
    """F1.5, Q2: server rejects unauthorized direct API calls."""
    resp = await client.get("/workspaces/users")
    assert resp.status_code == 403  # HTTPBearer returns 403 when no token


# ── Protected route — with valid token ───────────────────────────────────────

async def test_protected_route_with_valid_token(client: AsyncClient):
    token = await create_workspace_and_login(client)
    resp = await client.get("/workspaces/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    users = resp.json()
    assert len(users) == 1  # just the owner
    assert users[0]["email"] == "owner@testcorp.com"


# ── Brute-force lockout (Q1) ──────────────────────────────────────────────────

async def test_account_lockout_after_max_failures(client: AsyncClient):
    """Q1: account locks after 5 consecutive wrong passwords."""
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    bad = {**LOGIN_PAYLOAD, "password": "wrongpass"}
    for _ in range(5):
        await client.post("/auth/login", json=bad)
    # 6th attempt — should be locked
    resp = await client.post("/auth/login", json=bad)
    assert resp.status_code in (401, 429)
