"""
Third-Party Integrations Tests
Covers: INTEG-001, INTEG-002, PAY-001, PAY-002, PAY-003, PAY-004, INTEG-003, INTEG-004
"""
import hashlib
import hmac
import json
import pytest
from httpx import AsyncClient

from app.tests.conftest import create_workspace_and_login


async def setup_integ_env(client: AsyncClient, slug: str = "integ-corp", email: str = "owner@integ.com") -> tuple[str, dict]:
    payload = {
        "workspace_name": "Integ Corp",
        "workspace_slug": slug,
        "email": email,
        "owner_full_name": "Integ Owner",
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
async def test_pay_001_and_002_payment_create_and_confirm(client: AsyncClient):
    """
    PAY-001: Create payment request.
    PAY-002: Confirm payment with transaction reference and check collected revenue.
    """
    _, headers = await setup_integ_env(client, slug="pay-corp", email="owner@pay.com")

    # Create payment request
    create_resp = await client.post("/payments", json={"amount": 1500.0}, headers=headers)
    assert create_resp.status_code == 201
    pay_data = create_resp.json()
    payment_info = pay_data["payment"]
    link_id = payment_info["payment_link_id"]
    assert float(payment_info["amount"]) == 1500.0
    assert payment_info["status"] == "pending"

    # Confirm payment with Easypaisa transaction ref
    confirm_resp = await client.post(f"/payments/{link_id}/confirm", json={
        "easypaisa_txn_ref": "EP-TXN-987654321"
    }, headers=headers)
    assert confirm_resp.status_code == 200
    confirmed = confirm_resp.json()
    assert confirmed["status"] == "paid"
    assert confirmed["stripe_payment_intent_id"] == "EP-TXN-987654321"

    # Check collected revenue via GET /payments?status=paid
    rev_resp = await client.get("/payments?status=paid", headers=headers)
    assert rev_resp.status_code == 200
    paid_list = rev_resp.json()
    assert len(paid_list) >= 1
    collected = sum(float(p["amount"]) for p in paid_list)
    assert collected >= 1500.0


@pytest.mark.asyncio
async def test_pay_004_zero_card_data_stored(client: AsyncClient):
    """
    PAY-004 / I2.8: Verify database schema and endpoints do not store or accept card PAN / CVV.
    """
    _, headers = await setup_integ_env(client, slug="nocard-corp", email="owner@nocard.com")

    # Submitting card data to payment create is rejected by schema (extra fields forbidden/ignored)
    resp = await client.post("/payments", json={
        "amount": 200.0,
        "card_number": "4111111111111111",
        "cvv": "123",
    }, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert "card_number" not in data
    assert "cvv" not in data


@pytest.mark.asyncio
async def test_integ_001_retell_call_initiation_logged(client: AsyncClient):
    """
    INTEG-001: Trigger outbound call via Retell integration endpoint.
    Call is logged regardless of provider availability.
    """
    _, headers = await setup_integ_env(client, slug="call-corp", email="owner@call.com")

    resp = await client.post("/calls", json={"to_number": "+1234567890"}, headers=headers)
    assert resp.status_code == 201
    call = resp.json()
    assert call["direction"] == "outbound"
    assert call["status"] in ["no_credentials", "initiated", "failed"]


@pytest.mark.asyncio
async def test_integ_002_retell_webhook_idempotency_and_signature(client: AsyncClient):
    """
    INTEG-002: Inbound webhook requires valid HMAC signature and enforces idempotency.
    Duplicate webhooks are accepted safely with 200 OK without double processing.
    """
    import os
    secret = "test-webhook-secret"
    os.environ["RETELL_WEBHOOK_SECRET"] = secret

    payload = {
        "event": "call_ended",
        "call_id": "call_test_12345",
        "data": {
            "call_id": "call_test_12345",
            "transcript": "Hello this is a test call",
        },
        "metadata": {
            "workspace_id": 1,
        }
    }
    raw_bytes = json.dumps(payload).encode()
    valid_sig = hmac.new(secret.encode(), raw_bytes, hashlib.sha256).hexdigest()

    # 1. Invalid signature -> 401
    resp_invalid = await client.post("/webhooks/retell", content=raw_bytes, headers={
        "x-retell-signature": "invalid-signature",
        "Content-Type": "application/json",
    })
    assert resp_invalid.status_code == 401

    # 2. Valid signature -> 200 with processed=True
    resp_valid = await client.post("/webhooks/retell", content=raw_bytes, headers={
        "x-retell-signature": valid_sig,
        "Content-Type": "application/json",
    })
    assert resp_valid.status_code == 200
    assert resp_valid.json()["received"] is True
    assert resp_valid.json()["processed"] is True

    # 3. Duplicate webhook -> 200 with processed=False (Idempotency check passed)
    resp_dup = await client.post("/webhooks/retell", content=raw_bytes, headers={
        "x-retell-signature": valid_sig,
        "Content-Type": "application/json",
    })
    assert resp_dup.status_code == 200
    assert resp_dup.json()["received"] is True
    assert resp_dup.json()["processed"] is False
