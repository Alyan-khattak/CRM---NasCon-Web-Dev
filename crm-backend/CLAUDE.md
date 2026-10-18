# CRM Backend — Agent Team Instructions

## Project Identity
Unified Business Management Platform — CRM backend for small service businesses
(real estate, solar, clinics). 5–30 employees per workspace. Multi-tenant.

## Source of Truth (read before touching any feature)
- `docs/problem_statement.md` — functional requirements, scope, user roles
- `docs/database.md` — full schema, column origins, requirement traceability
- `supabase_crm.sql` — canonical DDL (38 tables, crm schema)
- `.env` — environment config (never commit, never log)

If a requirement is not in the problem statement → it does not exist.
If a table/column is not in database.md → do not invent it.

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
├── CLAUDE.md
├── .env
├── .env.example
├── docs/
│   ├── problem_statement.md
│   └── database.md
├── supabase_crm.sql
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── auth/
│   │   ├── jwt.py
│   │   └── dependencies.py
│   ├── middleware/
│   │   ├── rate_limit.py
│   │   └── audit.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── workspaces.py
│   │   ├── contacts.py
│   │   ├── leads.py
│   │   ├── opportunities.py
│   │   ├── calls.py
│   │   ├── payments.py
│   │   └── webhooks.py
│   ├── services/
│   │   ├── lead_service.py
│   │   ├── retell_service.py
│   │   └── payment_service.py
│   ├── models/
│   │   ├── orm.py
│   │   └── schemas.py
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_leads.py
│       └── test_webhooks.py
└── requirements.txt
```

---

## MVP Scope

### Phase 1 — Foundation (COMPLETE)
- [x] Project scaffold + config
- [x] Local SQLite test DB + Supabase prod DB toggle
- [x] JWT auth (login, refresh, logout)
- [x] Workspace + user CRUD
- [x] Role-based access (owner / admin / user)

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
- [ ] Retell outbound call trigger + webhook
- [ ] Simpaisa payment link + webhook
- [ ] integration_events idempotency on all webhooks

### Phase 5 — Audit & Security
- [ ] Audit log on all state changes (F4.1–F4.3)
- [ ] Saved filters (F2.6)
- [ ] Rate limiting on all routes
- [ ] Security review checklist pass

---

## Non-Negotiable Rules

1. **workspace_id on every DB query** — TD-1.1
2. **Secrets only from env** — I5.3
3. **Idempotent webhooks** — check integration_events.provider_event_id first (I1.8, I2.4)
4. **Audit log is INSERT-only** — F4.3
5. **No card data** — I2.8
6. **Rate limit everything** — auth 5/min, others 60/min
7. **Optimistic lock on leads** — Q4/Q5
8. **MVP only** — do not build what is not in problem_statement.md
