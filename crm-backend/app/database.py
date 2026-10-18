"""
Database engine and session factory.
Toggles between SQLite (local) and Supabase PostgreSQL (prod) via DB_MODE env.
Q6: real persistent database, survives restarts.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


def _build_url() -> str:
    if settings.DB_MODE == "sqlite":
        return f"sqlite+aiosqlite:///{settings.SQLITE_PATH}"
    # Supabase: set search_path=crm so all queries resolve to crm schema
    url = settings.SUPABASE_DB_URL
    if not url:
        raise RuntimeError("SUPABASE_DB_URL must be set when DB_MODE=supabase")
    return url


engine = create_async_engine(
    _build_url(),
    echo=settings.APP_ENV == "development",
    # SQLite needs this; PostgreSQL ignores it
    connect_args={"check_same_thread": False} if settings.DB_MODE == "sqlite" else {},
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables on startup (SQLite only — Supabase uses supabase_crm.sql)."""
    if settings.DB_MODE == "sqlite":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
