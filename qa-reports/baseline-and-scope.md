# Baseline and Testing Scope

**Project:** Unified Business Management Platform  
**Testing Branch:** `qa-testing`  
**Baseline Commit:** `07aaeb0` (integrated frontend + backend branches onto `qa-testing`)  
**Parent Merges:** `683fd99` (common base), `81cd471` (backend MVP), `70b9b19` (frontend enhancements)  

---

## 1. System Architecture Under Test

The platform is designed for small service businesses (5–30 employees) needing unified lead intake, lead assignment accountability, CRM pipeline tracking, payment reconciliation, and external integrations:

1. **Backend Service (`crm-backend/`):**
   - **Framework:** FastAPI (Python 3.11+, tested on 3.15)
   - **Database Architecture:** Multi-tenant multi-workspace SQLite (local testing) and PostgreSQL (production Supabase) via SQLAlchemy Async Engine and `aiosqlite`/`asyncpg`.
   - **Security & Identity:** JWT authentication with access/refresh tokens, salted password hashing (`passlib[bcrypt]`), and granular RBAC (Owner, Admin, User).
   - **Business Logic Subsystems:**
     - `lead_service.py`: Multi-source intake (form, messaging, manual), availability tracking, round-robin assignment, acknowledgement timers, automated escalations, recovery queue, and optimistic concurrency locking.
     - `opportunity_service.py`: Pipeline stage progression, stage-required custom fields, field-level monetary value masking.
     - `payment_service.py`: Payment links, webhook ingestion, signature validation, idempotency guards, collected vs projected revenue tracking.
     - `retell_service.py`: Outbound telephony calls, webhook callbacks, transcript ingestion, contact record association.
     - `middleware/audit.py`: INSERT-only audit logging of state-altering events with actor, timestamp, target, and diffs.
     - `middleware/rate_limit.py`: SlowAPI rate limiting (5 req/min on auth, 60 req/min on standard endpoints).

2. **Frontend Application (`src/`):**
   - **Framework:** Next.js 15+ (App Router), React 19, TypeScript
   - **Styling:** CSS Modules, responsive typography clamp, mobile-first layouts
   - **Views:** Landing page hero, trust metrics, CRM dashboard layouts, lead tracking views.

---

## 2. In-Scope Requirement Domains

- **Domain F1:** Accounts, roles, granular permissions, field-level opportunity value protection, server-side authorization, and tenant workspace isolation.
- **Domain F2:** Contacts, companies, opportunities, custom fields, pipeline-specific fields, stage required fields, pipeline stages, compound filters, saved lists, activity history, and unified customer records.
- **Domain F3:** Multi-channel lead intake, employee availability status, round-robin assignment with capacity caps, acknowledgement deadlines, multi-tier escalation chains, recovery queue, concurrency protection, and notification dispatch.
- **Domain F4:** Non-repudiable INSERT-only audit trails with actor, target, timestamp, and field delta tracking.
- **Domain F5:** Operational dashboard metrics (new leads, open pipeline value, first-response time, recovery queue count, escalations, availability, appointments, collected revenue) with drill-down and role-based scoping.
- **Domain I1–I5:** Real and sandbox third-party integration contracts (Twilio/Retell, Stripe/Simpaisa, Google Calendar, notification webhooks, per-workspace secrets, synchronization history, failure isolation).
- **Domain Q1–Q14:** Production-grade non-functional quality gates (salted hash security, server-side auth, SQLi/XSS/CSRF resilience, database ACID constraints, concurrency timing, persistence across restarts, responsive UI, accessible navigation, query performance, and clean error handling).

---

## 3. Out-of-Scope Items (Documented Exclusions)

Per Section 3 of `docs/problem statement.docx`, the following are explicitly out of scope for this MVP:
- Full double-entry accounting (ledgers, reconciliation, financial statements).
- Payroll processing, shift scheduling, and statutory leave rules.
- Public ad-platform analytics and ad campaign attribution.
- Full custom BI report builder.
- Training/onboarding modules and AI role-play simulators.
- Public marketing billing for platform SaaS subscriptions.
