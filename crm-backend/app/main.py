"""
FastAPI application entry point.
Registers middleware, routers, startup/shutdown lifecycle.
Q14: business rules, data access, integrations, presentation are separated.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.database import create_tables
from app.middleware.rate_limit import limiter
from app.routers import auth, workspaces, contacts, companies, pipelines, opportunities, saved_filters, leads, calls, payments, webhooks, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create SQLite tables on startup (Supabase uses supabase_crm.sql)."""
    await create_tables()
    yield


app = FastAPI(
    title="CRM Backend",
    description="Unified Business Management Platform — MVP backend",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# Health check — no auth required
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


# Phase 1
app.include_router(auth.router)
app.include_router(workspaces.router)

# Phase 2
app.include_router(companies.router)
app.include_router(contacts.router)
app.include_router(pipelines.router)
app.include_router(opportunities.router)
app.include_router(saved_filters.router)

# Phase 3
app.include_router(leads.router)

# Phase 4
app.include_router(calls.router)
app.include_router(payments.router)
app.include_router(webhooks.router)

# Phase 5
app.include_router(audit.router)
