# CRM Backend — Agent Team Instructions

## Project Identity
Unified Business Management Platform — CRM backend for small service businesses
(real estate, solar, clinics). 5–30 employees per workspace. Multi-tenant.

## Source of Truth — Read These Files First, Every Session

| File | What it contains | When to read |
|------|-----------------|--------------|
| `docs/problem_statement.md` | Functional requirements, user roles, business scope | Before every feature |
| `docs/db_schema.md` | 38-table schema, column origins [R/M/N/PTD], requirement IDs | Before every DB query or migration |
| `supabase_crm.sql` | Canonical DDL — 38 tables, indexes, triggers | Before any schema change |
| `.env` | All secrets and config | Never commit, never log |

**Hard rules derived from these docs:**
- A requirement not in `problem_statement.md` → it does not exist, do not build it
- A table not in `database.md` → do not create it
- A column not in `database.md` → do not add it
- Every function must cite the requirement ID it implements in its docstring

---

## Agent Team

### 1. architect (you, lead)
- Reads problem_statement + database.md before every task
- Breaks work into tasks for sub-agents
- Final reviewer — nothing merges without architect sign-off
- Enforces: no out-of-scope features, no schema drift

### 2. backend-dev
- Owns: FastAPI routes, services, dependency injection
- Rules: every route has rate limiting, every mutating route is idempotent,
  all secrets from env only, no business logic in routes (goes in services/)
- Must reference requirement ID (e.g. F3.4, I1.8) in docstrings

### 3. db-agent
- Owns: Supabase queries, migrations, local DB setup
- Rules: always use parameterised queries, never raw string SQL,
  workspace_id filter on EVERY query, use integration_events for idempotency

### 4. security-agent
- Reviews every PR/change for: exposed secrets, missing auth, SQL injection,
  missing rate limits, audit log gaps
- Checklist (must pass before any route goes live):
  [ ] JWT verified on every protected route
  [ ] workspace_id scoping enforced
  [ ] Rate limit decorator applied
  [ ] Secrets only from os.getenv()
  [ ] No card data stored (I2.8)
  [ ] Audit log written on every state change (F4.1)

### 5. integration-agent
- Owns: Retell (calls), Simpaisa (payments), Supabase client
- Rules: all webhooks verified by signature, all events stored in
  integration_events before processing, idempotency key = provider_event_id

---

## Tech Stack (MVP — do not add to this list)
- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **DB (production)**: Supabase (PostgreSQL)
- **DB (local testing)**: SQLite via SQLAlchemy (same models, swap via env)
- **Auth**: JWT (python-jose)
- **Rate limiting**: slowapi
- **Calling**: Retell AI SDK (retell-sdk)
- **Payments**: Simpaisa REST API
- **HTTP client**: httpx (async)
- **Validation**: Pydantic v2
- **Password hashing**: passlib[bcrypt]
- **Env**: python-dotenv

---

## Project Structure
```
crm-backend/
├── CLAUDE.md                  ← you are here
├── .env                       ← never commit
├── .env.example               ← commit this
├── docs/
│   ├── problem_statement.md
│   └── database.md
├── supabase_crm.sql
├── app/
│   ├── main.py                ← FastAPI app, middleware, routers
│   ├── config.py              ← Settings from env
│   ├── database.py            ← DB client (Supabase + SQLite toggle)
│   ├── auth/
│   │   ├── jwt.py             ← token create/verify
│   │   └── dependencies.py    ← get_current_user, require_role
│   ├── middleware/
│   │   ├── rate_limit.py      ← slowapi setup
│   │   └── audit.py           ← audit log helper
│   ├── routers/
│   │   ├── auth.py            ← login, refresh
│   │   ├── workspaces.py
│   │   ├── contacts.py
│   │   ├── leads.py           ← F3.x escalation engine
│   │   ├── opportunities.py
│   │   ├── calls.py           ← Retell integration
│   │   ├── payments.py        ← Simpaisa integration
│   │   └── webhooks.py        ← Retell + Simpaisa webhooks
│   ├── services/
│   │   ├── lead_service.py    ← assignment, escalation logic
│   │   ├── retell_service.py
│   │   └── payment_service.py
│   ├── models/
│   │   └── schemas.py         ← Pydantic request/response models
│   └── tests/
│       ├── conftest.py        ← SQLite test DB, test client
│       ├── test_auth.py
│       ├── test_leads.py
│       └── test_webhooks.py
└── requirements.txt
```

---

## MVP Scope (build only these — in this order)

### Phase 1 — Foundation
- [x] Project scaffold + config
- [ ] Local SQLite test DB + Supabase prod DB toggle
- [ ] JWT auth (login, refresh, logout)
- [ ] Workspace + user CRUD
- [ ] Role-based access (owner / admin / user)

### Phase 2 — Core CRM
- [ ] Contacts CRUD (F2.1–F2.5)
- [ ] Companies CRUD
- [ ] Pipelines + stages (F2.7)
- [ ] Opportunities CRUD

### Phase 3 — Lead Engine
- [ ] Lead capture (F3.1–F3.3)
- [ ] Auto-assignment round-robin (F3.5–F3.7)
- [ ] Acknowledgement timer (F3.4)
- [ ] Escalation engine (F3.8–F3.10)
- [ ] Optimistic locking on leads (version column)

### Phase 4 — Integrations
- [ ] Retell outbound call trigger
- [ ] Retell webhook receiver
- [ ] Simpaisa payment link creation
- [ ] Simpaisa webhook receiver
- [ ] integration_events idempotency on all webhooks

### Phase 5 — Audit & Security
- [ ] Audit log on all state changes (F4.1–F4.3)
- [ ] Saved filters (F2.6)
- [ ] Rate limiting on all routes
- [ ] Security review checklist pass

---

## Non-Negotiable Rules

1. **workspace_id on every DB query** — no cross-tenant data leaks (TD-1.1)
2. **Secrets only from env** — never hardcode, never log (I5.3)
3. **Idempotent webhooks** — check integration_events.provider_event_id first (I1.8, I2.4)
4. **Audit log is INSERT-only** — never UPDATE or DELETE audit records (F4.3)
5. **No card data** — store only Simpaisa session refs, never card numbers (I2.8)
6. **Rate limit everything** — auth routes strictest (5/min), others 60/min
7. **Optimistic lock on leads** — increment version, reject stale updates (Q4/Q5)
8. **Do not build what is not in problem_statement.md** — MVP only

---

## Environment Variables (.env.example)
```env
# App
APP_ENV=development           # development | production
SECRET_KEY=change-me-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Database
DB_MODE=sqlite               # sqlite | supabase
SUPABASE_URL=https://hqmsxkqipzrxqtjceezd.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SQLITE_PATH=./local_test.db  # only used when DB_MODE=sqlite

# Retell
RETELL_API_KEY=
RETELL_FROM_NUMBER=          # your Retell phone number

# Payments
SIMPAISA_API_KEY=
SIMPAISA_BASE_URL=https://sandbox.simpaisa.com

# Rate Limiting
RATE_LIMIT_AUTH=5/minute
RATE_LIMIT_DEFAULT=60/minute
```

---

## How to Start Any Task

1. Read `docs/problem_statement.md` — find the requirement ID
2. Check `docs/database.md` — find the table(s) involved
3. Write service logic first, then route, then tests
4. Run security checklist before marking done
5. Every function docstring must cite requirement ID

## Testing
- All tests use SQLite (DB_MODE=sqlite) — no Supabase needed locally
- Run: `pytest app/tests/ -v`
- Webhook tests use mocked signatures
- Never call real Retell/Simpaisa in tests — mock httpx