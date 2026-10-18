"""
Phase 3 tests — Lead Engine.
F3.1: creation; F3.3: assignment pool; F3.4: ack timer; F3.5: escalation;
F3.6: reassign; F3.7: recovery queue; Q4/Q5: optimistic lock.
"""
import pytest
from httpx import AsyncClient

from app.tests.conftest import create_workspace_and_login, WORKSPACE_PAYLOAD

pytestmark = pytest.mark.asyncio


async def auth_headers(client: AsyncClient) -> dict:
    token = await create_workspace_and_login(client)
    return {"Authorization": f"Bearer {token}"}


async def setup_pool(client: AsyncClient, headers: dict) -> tuple[int, int]:
    """Creates rule + pool, returns (pool_id, owner_user_id)."""
    rule = await client.post("/leads/config/rules", json={"rule_type": 1}, headers=headers)
    assert rule.status_code == 201
    rule_id = rule.json()["rule_id"]

    pool = await client.post("/leads/config/pools", json={"pool_name": "Sales", "rule_id": rule_id}, headers=headers)
    assert pool.status_code == 201
    pool_id = pool.json()["pool_id"]

    # get owner user_id
    users = await client.get("/workspaces/users", headers=headers)
    owner_id = users.json()[0]["workspace_user_id"]

    await client.post(f"/leads/config/pools/{pool_id}/members", json={"workspace_user_id": owner_id}, headers=headers)
    return pool_id, owner_id


# ── Lead creation ─────────────────────────────────────────────────────────────

async def test_create_lead_manual(client: AsyncClient):
    """F3.1: create a manual lead."""
    h = await auth_headers(client)
    resp = await client.post("/leads", json={"source_type": 3}, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["source_type"] == 3
    assert data["status"] == 1  # new


async def test_create_lead_auto_assigns_when_pool_exists(client: AsyncClient):
    """F3.3: lead auto-assigned on creation when pool has Available member."""
    h = await auth_headers(client)
    _, owner_id = await setup_pool(client, h)

    resp = await client.post("/leads", json={"source_type": 1}, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["assigned_to"] == owner_id
    assert data["status"] == 2  # assigned


async def test_create_lead_no_pool_stays_new(client: AsyncClient):
    """F3.3: no pool → status remains new, unassigned."""
    h = await auth_headers(client)
    resp = await client.post("/leads", json={"source_type": 3}, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["assigned_to"] is None
    assert data["status"] == 1


# ── Acknowledge ───────────────────────────────────────────────────────────────

async def test_acknowledge_lead(client: AsyncClient):
    """F3.4: assigned employee acknowledges."""
    h = await auth_headers(client)
    await setup_pool(client, h)

    lead = await client.post("/leads", json={"source_type": 3}, headers=h)
    lead_id = lead.json()["lead_id"]

    resp = await client.post(f"/leads/{lead_id}/acknowledge", headers=h)
    assert resp.status_code == 200
    assert resp.json()["status"] == 3  # acknowledged
    assert resp.json()["acknowledged_at"] is not None


async def test_acknowledge_already_acknowledged(client: AsyncClient):
    """F3.4: double-ack rejected."""
    h = await auth_headers(client)
    await setup_pool(client, h)

    lead = await client.post("/leads", json={"source_type": 3}, headers=h)
    lead_id = lead.json()["lead_id"]

    await client.post(f"/leads/{lead_id}/acknowledge", headers=h)
    resp = await client.post(f"/leads/{lead_id}/acknowledge", headers=h)
    assert resp.status_code == 400


# ── Reassign ──────────────────────────────────────────────────────────────────

async def test_reassign_lead(client: AsyncClient):
    """F3.6: admin reassigns to different user."""
    h = await auth_headers(client)
    await setup_pool(client, h)

    # Invite a second user
    roles = await client.get("/workspaces/roles", headers=h)
    user_role_id = next(r["role_id"] for r in roles.json() if r["role_type"] == 3)
    invite = await client.post("/workspaces/users", json={
        "full_name": "Agent Two",
        "email": "agent2@test.com",
        "role_id": user_role_id,
        "password": "testpass123",
    }, headers=h)
    agent2_id = invite.json()["workspace_user_id"]

    lead = await client.post("/leads", json={"source_type": 3}, headers=h)
    lead_id = lead.json()["lead_id"]

    resp = await client.post(f"/leads/{lead_id}/reassign", json={
        "new_assignee_id": agent2_id,
        "reason": "Better suited",
    }, headers=h)
    assert resp.status_code == 200
    assert resp.json()["assigned_to"] == agent2_id
    assert resp.json()["reassignment_reason"] == "Better suited"


# ── Escalation ────────────────────────────────────────────────────────────────

async def test_manual_escalate(client: AsyncClient):
    """F3.5: admin manually escalates a lead."""
    h = await auth_headers(client)
    await setup_pool(client, h)

    lead = await client.post("/leads", json={"source_type": 3}, headers=h)
    lead_id = lead.json()["lead_id"]

    resp = await client.post(f"/leads/{lead_id}/escalate", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert data["escalation_level"] == 1
    assert data["status"] == 4  # escalated


async def test_escalation_config_upsert(client: AsyncClient):
    """F3.5: set escalation timeout config."""
    h = await auth_headers(client)
    resp = await client.post("/leads/config/escalation", json={
        "level": 1,
        "timeout_minutes": 15,
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["timeout_minutes"] == 15

    # Upsert — update same level
    resp = await client.post("/leads/config/escalation", json={
        "level": 1,
        "timeout_minutes": 30,
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["timeout_minutes"] == 30


# ── Recovery queue ────────────────────────────────────────────────────────────

async def test_recovery_queue_contains_escalated_lead(client: AsyncClient):
    """F3.7: escalated leads appear in recovery queue."""
    h = await auth_headers(client)
    await setup_pool(client, h)

    lead = await client.post("/leads", json={"source_type": 3}, headers=h)
    lead_id = lead.json()["lead_id"]

    # Escalate twice → escalation_level > 1
    await client.post(f"/leads/{lead_id}/escalate", headers=h)
    await client.post(f"/leads/{lead_id}/escalate", headers=h)

    resp = await client.get("/leads/recovery-queue", headers=h)
    assert resp.status_code == 200
    ids = [l["lead_id"] for l in resp.json()]
    assert lead_id in ids


# ── Workspace isolation ───────────────────────────────────────────────────────

async def test_lead_workspace_isolation(client: AsyncClient):
    """TD-1.1: can't access lead from another workspace."""
    h = await auth_headers(client)
    lead = await client.post("/leads", json={"source_type": 3}, headers=h)
    lead_id = lead.json()["lead_id"]

    await client.post("/auth/signup", json={**WORKSPACE_PAYLOAD, "workspace_slug": "ws-x", "email": "o@wsx.com"})
    r2 = await client.post("/auth/login", json={"workspace_slug": "ws-x", "email": "o@wsx.com", "password": "securepass123"})
    h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}

    resp = await client.get(f"/leads/{lead_id}", headers=h2)
    assert resp.status_code == 404
