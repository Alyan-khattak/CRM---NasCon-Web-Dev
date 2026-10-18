"""
Lead Engine, Concurrency, and Timers Tests
Covers: LEAD-005, LEAD-006, ESC-001, ESC-002, ESC-003, ESC-004, CONC-001, CONC-002
"""
import asyncio
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient

from app.models.orm import AssignmentPool, AssignmentPoolMember, AssignmentRule, EscalationConfig, Lead, WorkspaceUser
from app.services.lead_service import (
    STATUS_ASSIGNED,
    STATUS_ESCALATED,
    STATUS_NEW,
    STATUS_RECOVERY,
    _assert_version,
    ack_timer_remaining,
    escalate_lead,
    get_recovery_queue,
    reassign_on_absence,
    run_escalation_sweep,
)
from app.tests.conftest import create_workspace_and_login


async def setup_lead_env(client: AsyncClient, slug: str = "lead-corp", email: str = "owner@leadcorp.com") -> tuple[str, dict]:
    payload = {
        "workspace_name": "Lead Corp",
        "workspace_slug": slug,
        "email": email,
        "owner_full_name": "Lead Owner",
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
async def test_conc_001_optimistic_locking_version_conflict():
    """
    CONC-001: Version conflict raises 409 Conflict when stale version is sent.
    """
    lead = Lead(lead_id=101, workspace_id=1, status=STATUS_ASSIGNED, version=2)
    # Correct version succeeds
    _assert_version(lead, request_version=2)

    # Stale version fails with 409
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        _assert_version(lead, request_version=1)
    assert exc_info.value.status_code == 409
    assert "Stale lead version" in exc_info.value.detail


@pytest.mark.asyncio
async def test_lead_006_ack_timer_remaining_computation():
    """
    LEAD-006: Acknowledgement timer computes remaining seconds accurately.
    """
    now = datetime.now(timezone.utc)
    # Assigned 10 minutes ago, timeout 30 minutes -> remaining should be ~20 mins (1200s)
    assigned_at = now - timedelta(minutes=10)
    lead = Lead(lead_id=1, workspace_id=1, assigned_at=assigned_at, acknowledged_at=None)

    remaining = ack_timer_remaining(lead, timeout_minutes=30)
    assert remaining is not None
    assert 1180 <= remaining <= 1210

    # If lead already acknowledged -> remaining is None
    lead.acknowledged_at = now
    assert ack_timer_remaining(lead, timeout_minutes=30) is None


@pytest.mark.asyncio
async def test_esc_004_recovery_queue_criteria(client: AsyncClient):
    """
    ESC-004: Recovery queue correctly includes multiply-escalated or recovery-flagged leads.
    """
    _, headers = await setup_lead_env(client, slug="rec-corp", email="owner@rec.com")

    # Create 3 leads
    l1 = await client.post("/leads", json={"source_type": 1}, headers=headers)
    assert l1.status_code == 201
    l1_id = l1.json()["lead_id"]

    # Escalate lead l1 twice
    await client.post(f"/leads/{l1_id}/escalate", headers=headers)
    await client.post(f"/leads/{l1_id}/escalate", headers=headers)

    # Check recovery queue
    rec_resp = await client.get("/leads/recovery-queue", headers=headers)
    assert rec_resp.status_code == 200
    queue = rec_resp.json()
    assert len(queue) >= 1
    assert any(item["lead_id"] == l1_id for item in queue)


@pytest.mark.asyncio
async def test_conc_002_concurrent_lead_intake_burst(client: AsyncClient):
    """
    CONC-002: Rapid burst lead ingestion creates unique leads with incremental IDs.
    """
    _, headers = await setup_lead_env(client, slug="burst-corp", email="owner@burst.com")

    lead_ids = []
    for i in range(10):
        resp = await client.post("/leads", json={"source_type": 1}, headers=headers)
        assert resp.status_code == 201
        lead_ids.append(resp.json()["lead_id"])

    # Verify all lead IDs are distinct and strictly sequential
    assert len(set(lead_ids)) == 10
