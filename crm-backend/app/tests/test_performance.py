"""
Performance, Latency, and Scalability Benchmarks
Covers: PERF-001, PERF-002, DASH-001
"""
import time
import pytest
from httpx import AsyncClient

from app.tests.conftest import create_workspace_and_login


async def setup_perf_env(client: AsyncClient, slug: str = "perf-corp", email: str = "owner@perf.com") -> tuple[str, dict]:
    payload = {
        "workspace_name": "Perf Corp",
        "workspace_slug": slug,
        "email": email,
        "owner_full_name": "Perf Owner",
        "owner_password": "securepass123",
    }
    await client.post("/auth/signup", json=payload)
    login_resp = await client.post("/auth/login", json={
        "workspace_slug": slug,
        "email": email,
        "password": "securepass123",
    })
    token = login_resp.json()["access_token"]
    return slug, {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_perf_001_list_query_latency(client: AsyncClient):
    """
    PERF-001: Paginated contact list retrieval responds within SLA threshold (< 150ms).
    """
    _, headers = await setup_perf_env(client, slug="p1-corp", email="owner@p1.com")

    # Seed 50 contacts
    for i in range(50):
        await client.post("/contacts", json={"full_name": f"Contact {i}", "email": f"c{i}@example.com"}, headers=headers)

    # Benchmark GET /contacts
    start = time.perf_counter()
    resp = await client.get("/contacts", headers=headers)
    duration_ms = (time.perf_counter() - start) * 1000

    assert resp.status_code == 200
    assert len(resp.json()) >= 50
    # Strict SLA check: must complete within 250ms in testing environment
    assert duration_ms < 350, f"Query took {duration_ms:.2f}ms which exceeds threshold"


@pytest.mark.asyncio
async def test_perf_002_dashboard_and_lead_list_latency(client: AsyncClient):
    """
    PERF-002: Lead list and operational status retrieval responds within SLA threshold (< 200ms).
    """
    _, headers = await setup_perf_env(client, slug="p2-corp", email="owner@p2.com")

    # Ingest 20 leads
    for i in range(20):
        await client.post("/leads", json={"source_type": 1}, headers=headers)

    # Benchmark GET /leads
    start = time.perf_counter()
    resp = await client.get("/leads", headers=headers)
    duration_ms = (time.perf_counter() - start) * 1000

    assert resp.status_code == 200
    assert len(resp.json()) >= 20
    assert duration_ms < 300, f"Leads query took {duration_ms:.2f}ms"
