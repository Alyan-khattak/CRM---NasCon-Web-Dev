"""
Test fixtures — all tests use in-memory SQLite. No Supabase, no real providers.
DB_MODE forced to sqlite; SQLITE_PATH set to :memory: for isolation.
"""
import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Force sqlite before importing app modules
os.environ["DB_MODE"] = "sqlite"
os.environ["SQLITE_PATH"] = ":memory:"
os.environ["SECRET_KEY"] = "test-secret-key-32-chars-minimum!"
os.environ["RATE_LIMIT_AUTH"] = "1000/minute"
os.environ["RATE_LIMIT_DEFAULT"] = "1000/minute"

from app.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create fresh tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Async test client with DB override."""
    async def override_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Helpers ───────────────────────────────────────────────────────────────────

WORKSPACE_PAYLOAD = {
    "workspace_name": "Test Corp",
    "workspace_slug": "test-corp",
    "email": "owner@testcorp.com",
    "owner_full_name": "Test Owner",
    "owner_password": "securepass123",
}

LOGIN_PAYLOAD = {
    "workspace_slug": "test-corp",
    "email": "owner@testcorp.com",
    "password": "securepass123",
}


async def create_workspace_and_login(client) -> str:
    """Creates workspace, logs in, returns access token."""
    await client.post("/auth/signup", json=WORKSPACE_PAYLOAD)
    resp = await client.post("/auth/login", json=LOGIN_PAYLOAD)
    return resp.json()["access_token"]
