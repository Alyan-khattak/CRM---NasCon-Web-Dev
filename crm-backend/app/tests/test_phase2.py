"""
Phase 2 tests — Companies, Contacts, Pipelines, Stages, Custom Fields, Opportunities, Saved Filters.
All tests use in-memory SQLite; no real providers.
"""
import pytest
from httpx import AsyncClient

from app.tests.conftest import WORKSPACE_PAYLOAD, LOGIN_PAYLOAD, create_workspace_and_login

pytestmark = pytest.mark.asyncio


# ── Helpers ───────────────────────────────────────────────────────────────────

async def auth_headers(client: AsyncClient) -> dict:
    token = await create_workspace_and_login(client)
    return {"Authorization": f"Bearer {token}"}


async def make_pipeline(client: AsyncClient, headers: dict, name: str = "Sales") -> int:
    resp = await client.post("/pipelines", json={"pipeline_name": name}, headers=headers)
    assert resp.status_code == 201
    return resp.json()["pipeline_id"]


async def make_stage(client: AsyncClient, headers: dict, pipeline_id: int, name: str = "Lead In") -> int:
    resp = await client.post(
        f"/pipelines/{pipeline_id}/stages",
        json={"stage_name": name, "sort_order": 0},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()["stage_id"]


# ── Companies ─────────────────────────────────────────────────────────────────

async def test_company_crud(client: AsyncClient):
    h = await auth_headers(client)

    resp = await client.post("/companies", json={"company_name": "Acme Corp"}, headers=h)
    assert resp.status_code == 201
    cid = resp.json()["company_id"]

    resp = await client.get("/companies", headers=h)
    assert len(resp.json()) == 1

    resp = await client.patch(f"/companies/{cid}", json={"company_name": "Acme Ltd"}, headers=h)
    assert resp.json()["company_name"] == "Acme Ltd"

    resp = await client.delete(f"/companies/{cid}", headers=h)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Company deleted"


async def test_company_workspace_isolation(client: AsyncClient):
    """TD-1.1: can't access another workspace's company."""
    h = await auth_headers(client)
    resp = await client.post("/companies", json={"company_name": "Acme"}, headers=h)
    cid = resp.json()["company_id"]

    # Second workspace
    await client.post("/auth/signup", json={**WORKSPACE_PAYLOAD, "workspace_slug": "ws2", "email": "o2@ws2.com"})
    resp2 = await client.post("/auth/login", json={"workspace_slug": "ws2", "email": "o2@ws2.com", "password": "securepass123"})
    h2 = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

    resp = await client.get(f"/companies/{cid}", headers=h2)
    assert resp.status_code == 404


# ── Contacts ──────────────────────────────────────────────────────────────────

async def test_contact_crud(client: AsyncClient):
    h = await auth_headers(client)

    resp = await client.post("/contacts", json={"full_name": "Ali Khan", "phone": "+923001234567"}, headers=h)
    assert resp.status_code == 201
    ctid = resp.json()["contact_id"]

    resp = await client.get("/contacts", headers=h)
    assert len(resp.json()) == 1

    resp = await client.patch(f"/contacts/{ctid}", json={"is_opted_out": True}, headers=h)
    assert resp.json()["is_opted_out"] is True

    resp = await client.delete(f"/contacts/{ctid}", headers=h)
    assert resp.status_code == 200


async def test_contact_company_cross_workspace_rejected(client: AsyncClient):
    """Can't link contact to a company from another workspace (TD-1.1)."""
    h = await auth_headers(client)

    await client.post("/auth/signup", json={**WORKSPACE_PAYLOAD, "workspace_slug": "ws-b", "email": "o@wsb.com"})
    r = await client.post("/auth/login", json={"workspace_slug": "ws-b", "email": "o@wsb.com", "password": "securepass123"})
    h2 = {"Authorization": f"Bearer {r.json()['access_token']}"}
    co = await client.post("/companies", json={"company_name": "Other Co"}, headers=h2)
    foreign_co_id = co.json()["company_id"]

    resp = await client.post("/contacts", json={"full_name": "Test", "company_id": foreign_co_id}, headers=h)
    assert resp.status_code == 400


# ── Pipelines & Stages ────────────────────────────────────────────────────────

async def test_pipeline_and_stage_crud(client: AsyncClient):
    h = await auth_headers(client)

    pid = await make_pipeline(client, h)
    sid = await make_stage(client, h, pid, "Prospect")

    resp = await client.get("/pipelines", headers=h)
    assert len(resp.json()) == 1

    resp = await client.patch(f"/pipelines/{pid}/stages/{sid}", json={"stage_name": "Qualified"}, headers=h)
    assert resp.json()["stage_name"] == "Qualified"


async def test_stage_delete_blocked_when_occupied(client: AsyncClient):
    """BR-009: can't delete stage while opportunity occupies it."""
    h = await auth_headers(client)
    pid = await make_pipeline(client, h)
    sid = await make_stage(client, h, pid)

    await client.post("/opportunities", json={
        "opportunity_name": "Deal A",
        "pipeline_id": pid,
        "stage_id": sid,
    }, headers=h)

    resp = await client.delete(f"/pipelines/{pid}/stages/{sid}", headers=h)
    assert resp.status_code == 400
    assert "BR-009" in resp.json()["detail"]


async def test_stage_delete_succeeds_when_empty(client: AsyncClient):
    h = await auth_headers(client)
    pid = await make_pipeline(client, h)
    sid = await make_stage(client, h, pid)

    resp = await client.delete(f"/pipelines/{pid}/stages/{sid}", headers=h)
    assert resp.status_code == 200


# ── Opportunities ─────────────────────────────────────────────────────────────

async def test_opportunity_crud(client: AsyncClient):
    h = await auth_headers(client)
    pid = await make_pipeline(client, h)
    sid = await make_stage(client, h, pid)

    resp = await client.post("/opportunities", json={
        "opportunity_name": "Big Deal",
        "pipeline_id": pid,
        "stage_id": sid,
        "value": 50000,
    }, headers=h)
    assert resp.status_code == 201
    oid = resp.json()["opportunity_id"]

    resp = await client.get(f"/opportunities/{oid}", headers=h)
    assert resp.json()["opportunity_name"] == "Big Deal"

    resp = await client.patch(f"/opportunities/{oid}", json={"status": "won"}, headers=h)
    assert resp.json()["status"] == "won"

    resp = await client.delete(f"/opportunities/{oid}", headers=h)
    assert resp.status_code == 200


async def test_opportunity_stage_move(client: AsyncClient):
    """F2.4: stage move succeeds when no required fields gate it."""
    h = await auth_headers(client)
    pid = await make_pipeline(client, h)
    sid1 = await make_stage(client, h, pid, "Stage 1")
    sid2 = await make_stage(client, h, pid, "Stage 2")

    resp = await client.post("/opportunities", json={
        "opportunity_name": "Move Me",
        "pipeline_id": pid,
        "stage_id": sid1,
    }, headers=h)
    oid = resp.json()["opportunity_id"]

    resp = await client.post(f"/opportunities/{oid}/move-stage", json={"target_stage_id": sid2}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["stage_id"] == sid2


async def test_opportunity_stage_move_blocked_by_required_field(client: AsyncClient):
    """F2.4: stage move blocked when required custom field not filled."""
    h = await auth_headers(client)
    pid = await make_pipeline(client, h)
    sid1 = await make_stage(client, h, pid, "Open")
    sid2 = await make_stage(client, h, pid, "Qualified")

    # Create custom field
    resp = await client.post(f"/pipelines/{pid}/fields", json={
        "entity_type": "opportunity",
        "field_name": "budget",
        "data_type": 2,  # number
    }, headers=h)
    fid = resp.json()["field_def_id"]

    # Mark it required for sid2
    await client.post(
        f"/pipelines/{pid}/stages/{sid2}/required-fields",
        json={"field_def_id": fid},
        headers=h,
    )

    # Create opportunity in sid1 (no custom field value)
    resp = await client.post("/opportunities", json={
        "opportunity_name": "Gated Deal",
        "pipeline_id": pid,
        "stage_id": sid1,
    }, headers=h)
    oid = resp.json()["opportunity_id"]

    # Try to move — should be blocked
    resp = await client.post(f"/opportunities/{oid}/move-stage", json={"target_stage_id": sid2}, headers=h)
    assert resp.status_code == 422
    assert "budget" in resp.json()["detail"]


# ── Saved Filters ─────────────────────────────────────────────────────────────

async def test_saved_filter_requires_3_criteria(client: AsyncClient):
    """F2.6: fewer than 3 criteria rejected."""
    h = await auth_headers(client)
    resp = await client.post("/filters", json={
        "filter_name": "Test",
        "entity_type": "contact",
        "criteria": [
            {"field": "full_name", "operator": "contains", "value": "Ali"},
            {"field": "is_opted_out", "operator": "eq", "value": False},
        ],
    }, headers=h)
    assert resp.status_code == 422


async def test_saved_filter_crud(client: AsyncClient):
    h = await auth_headers(client)
    resp = await client.post("/filters", json={
        "filter_name": "Active Contacts",
        "entity_type": "contact",
        "criteria": [
            {"field": "full_name", "operator": "contains", "value": "Ali"},
            {"field": "is_opted_out", "operator": "eq", "value": False},
            {"field": "lead_source", "operator": "eq", "value": "web_form"},
        ],
    }, headers=h)
    assert resp.status_code == 201
    fid = resp.json()["filter_id"]

    resp = await client.get("/filters", headers=h)
    assert len(resp.json()) == 1

    resp = await client.delete(f"/filters/{fid}", headers=h)
    assert resp.status_code == 200
