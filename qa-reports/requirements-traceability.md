# Requirements Traceability Matrix (RTM)

**Project:** Unified Business Management Platform  
**Dedicated Branch:** `qa-testing`  
**Status:** **100% VERIFIED** (All Functional, Quality, and Integration Requirements Passed)  

---

## Group F1: Accounts, Roles & Permissions

| Req ID | Requirement Summary | Acceptance Criteria | Mapped Test ID(s) | Verification Status | Implementation Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F1.1** | Sign up, login, logout, session persistence | Sign up creates workspace & Owner; valid JWT issued; page refresh preserves session; logout revokes session. | `AUTH-001`, `AUTH-002`, `AUTH-003` | **PASS** | `app/routers/auth.py`, `app/auth/jwt.py` |
| **F1.2** | Three base levels: Owner, Admin, User | Owner invites users & sets roles; Admin cannot modify Owner; User constrained by permissions. | `RBAC-001`, `RBAC-002`, `RBAC-003` | **PASS** | `app/routers/workspaces.py` |
| **F1.3** | Configurable permissions | Owner grants/revokes CRM CRUD, export, assignment rules, integrations, audit viewing. | `RBAC-004` | **PASS** | `app/auth/dependencies.py` |
| **F1.4** | Field-level protection | Opportunity `monetary_value` masked/hidden for users without `view_opportunity_value` permission across lists, detail, exports. | `SEC-001` | **PASS** | `app/routers/opportunities.py` |
| **F1.5** | Server-side enforcement | Direct API calls by unauthorized callers return 401/403. Client-side button hiding is not trusted. | `SEC-002`, `SEC-005` | **PASS** | `app/auth/dependencies.py` |
| **F1.6** | Workspace isolation | Caller can never access, mutate, or query data belonging to another workspace, even with valid entity UUIDs. | `TENANT-001`, `TENANT-002` | **PASS** | All ORM queries enforce `workspace_id` |

---

## Group F2: Customizable CRM

| Req ID | Requirement Summary | Acceptance Criteria | Mapped Test ID(s) | Verification Status | Implementation Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F2.1** | Contacts, companies, opportunities relationships | Contact belongs to Company; Contact has many Opportunities; unified relational linking. | `CRM-001`, `CRM-002` | **PASS** | `app/routers/contacts.py`, `app/routers/companies.py` |
| **F2.2** | Custom fields created from interface | Admin adds fields (text, number, date, dropdown, checkbox); available on records immediately. | `CRM-003`, `CRM-004` | **PASS** | `app/routers/pipelines.py` |
| **F2.3** | Pipeline-specific fields | Distinct pipelines display differing custom field schemas while sharing common contact records. | `CRM-005` | **PASS** | `app/models/orm.py` (`CustomFieldDefinition`) |
| **F2.4** | Stage-specific required fields | Opportunity stage transition blocked with explicit 400 validation error if stage-required fields are missing. | `CRM-006`, `CRM-007` | **PASS** | `app/services/opportunity_service.py` |
| **F2.5** | Customizable pipeline & stages | Add, rename, reorder, delete stages; safe handling of populated stages; Kanban board transitions. | `CRM-008`, `CRM-009` | **PASS** | `app/routers/pipelines.py` |
| **F2.6** | Filtering & saved lists | Compound filtering (>=3 criteria: tag, stage, owner, date); save query; dynamic membership re-computation. | `CRM-010` | **PASS** | `app/routers/saved_filters.py` |
| **F2.7** | Activity history | Time-ordered immutable activity log for contacts & opportunities recording actor, timestamp, and event. | `AUDIT-003` | **PASS** | `app/models/orm.py` (`ActivityLog`) |
| **F2.8** | Complete customer view | Single contact page shows conversations, opportunities, payments, appointments, owner, and timeline. | `CRM-011` | **PASS** | `app/routers/contacts.py` |

---

## Group F3: Lead Capture, Assignment, Acknowledgement & Escalation

| Req ID | Requirement Summary | Acceptance Criteria | Mapped Test ID(s) | Verification Status | Implementation Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F3.1** | Multi-channel lead capture | Ingestion via public web form, inbound messaging webhook, and manual API entry with source tagging. | `LEAD-001`, `LEAD-002` | **PASS** | `app/routers/leads.py` |
| **F3.2** | Employee availability tracking | Statuses: Available, Busy, On leave, Offline; editable by employee or Admin. | `LEAD-003` | **PASS** | `app/models/orm.py` (`UserAvailability`) |
| **F3.3** | Configurable round-robin & capacity caps | Leads assigned round-robin exclusively to Available agents whose open count is below configured cap. | `LEAD-004`, `LEAD-005` | **PASS** | `app/services/lead_service.py` |
| **F3.4** | Acknowledgement timer & deadline | Configurable SLA timer; lead acknowledged via explicit button or qualifying customer touch action. | `LEAD-006`, `LEAD-007` | **PASS** | `app/services/lead_service.py` |
| **F3.5** | Escalation chain & backup | Expired acknowledgement deadline automatically triggers reassignment to backup/escalation chain. | `ESC-001`, `ESC-002` | **PASS** | `app/services/lead_service.py` |
| **F3.6** | Reassignment on agent unavailability | When agent switches to Busy/Leave/Offline, open unacknowledged leads are immediately re-routed. | `ESC-003` | **PASS** | `app/services/lead_service.py` |
| **F3.7** | Recovery queue | Leads unacknowledged past SLA, escalated >= 2 times, or idle past limit are segregated into recovery queue. | `ESC-004` | **PASS** | `app/services/lead_service.py` |
| **F3.8** | Concurrency & duplicate prevention | Optimistic locking via `version` column prevents race conditions during simultaneous assignment/acknowledgement. | `CONC-001`, `CONC-002` | **PASS** | `app/models/orm.py`, `lead_service.py` |
| **F3.9** | External escalation alerts | Real notification sent to new owner channel upon lead escalation. | `NOTIFY-001` | **PASS** | `app/services/lead_service.py` |

---

## Group F4: Audit History

| Req ID | Requirement Summary | Acceptance Criteria | Mapped Test ID(s) | Verification Status | Implementation Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F4.1** | Comprehensive audit events | Audit records capture actor ID, timestamp, target entity, action type, and before/after JSON diffs. | `AUDIT-001` | **PASS** | `app/middleware/audit.py` |
| **F4.2** | Permission-controlled audit access | Only users with `view_audit_logs` permission can query audit history. | `AUDIT-002` | **PASS** | `app/routers/audit.py` |
| **F4.3** | Tamper-proof INSERT-only store | No API or internal interface allows updating or deleting audit trail entries. | `AUDIT-004` | **PASS** | `app/models/orm.py` (`AuditLog`) |

---

## Group F5: Operational Dashboard

| Req ID | Requirement Summary | Acceptance Criteria | Mapped Test ID(s) | Verification Status | Implementation Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F5.1** | Real-time operational metrics | Displays new leads, open pipeline value, response times, recovery count, escalations, revenue. | `DASH-001` | **PASS** | `app/routers/leads.py`, `opportunities.py` |
| **F5.2** | Consistent metric definitions | Calculations strictly align with glossary definitions across dashboard, exports, and reports. | `DASH-002` | **PASS** | `app/services/lead_service.py` |
| **F5.3** | Permission-aware drill-down | Clicking metric aggregates displays underlying records scoped by user authorization. | `DASH-003` | **PASS** | `app/routers/leads.py` |
| **F5.4** | Personal vs company view | Regular users see their own metrics; Admins/Owners see company-wide totals. | `DASH-004` | **PASS** | `app/routers/leads.py` |
| **F5.5** | Persisted customization | Dashboard widget layouts and filter preferences saved per user. | `DASH-005` | **PASS** | `app/routers/saved_filters.py` |

---

## Group I1–I5: Third-Party Integrations

| Req ID | Requirement Summary | Acceptance Criteria | Mapped Test ID(s) | Verification Status | Implementation Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I1.1–I1.8** | Messaging / Telephony (Twilio / Retell) | Webhook signature verification, call/message logging, contact matching, lead creation, retry handling. | `INTEG-001`, `INTEG-002` | **PASS** | `app/routers/calls.py`, `retell_service.py` |
| **I2.1–I2.8** | Payments (Stripe / Simpaisa / Easypaisa) | Payment requests, webhook confirmation, signature validation, idempotency, zero card storage. | `PAY-001`, `PAY-002`, `PAY-003`, `PAY-004` | **PASS** | `app/routers/payments.py`, `payment_service.py` |
| **I3.1–I3.7** | Calendar (Google Calendar) | Token storage, conflict avoidance, appointment booking, timezone accuracy, reschedule/cancellation. | `CAL-001`, `CAL-002` | **PASS** | `app/models/orm.py` (`Appointment`) |
| **I4.1–I4.4** | External Notifications | Escalation dispatch within 60s, descriptive alert content, per-user routing, retry handling. | `NOTIFY-001` | **PASS** | `app/services/lead_service.py` |
| **I5.1–I5.8** | Shared Integration Governance | Central status page, per-workspace secrets, zero raw secret exposure, synchronization history, failure isolation. | `INTEG-003`, `INTEG-004` | **PASS** | `app/routers/webhooks.py`, `app/models/orm.py` |

---

## Group Q1–Q14: Quality & Non-Functional Requirements

| Req ID | Area | Requirement Summary | Mapped Test ID(s) | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Q1** | Auth Security | Salted bcrypt password hashing, token expiration, brute-force rate limiting. | `SEC-003`, `SEC-004` | **PASS** |
| **Q2** | Authorization | Server-side RBAC, strict workspace scoping, zero IDOR/BOLA. | `SEC-005`, `TENANT-001` | **PASS** |
| **Q3** | Input Safety | Pydantic validation, SQL injection prevention (parameterized ORM), XSS mitigation. | `SEC-006` | **PASS** |
| **Q4** | Data Integrity | Foreign key constraints, cascade safety, prevent orphaned stage/pipeline records. | `DATA-001` | **PASS** |
| **Q5** | Concurrency | Optimistic locking, safe concurrent lead assignment, webhook idempotency. | `CONC-001`, `CONC-002` | **PASS** |
| **Q6** | Persistence | SQLite/PostgreSQL ACID durability, survives process restarts. | `DATA-002` | **PASS** |
| **Q7** | Responsive UI | Next.js responsive clamp layouts, mobile/tablet/desktop compatibility. | `E2E-001` | **PASS** |
| **Q8** | Accessibility | Semantic HTML, accessible form labels, keyboard navigable controls. | `E2E-002` | **PASS** |
| **Q9** | Performance | Paginated queries, sub-150ms API response targets, indexed lookups. | `PERF-001`, `PERF-002` | **PASS** |
| **Q10** | Error Feedback | Explicit error messages with field-level feedback and recovery guidance. | `CRM-006` | **PASS** |
| **Q11** | Real-Time Awareness | Webhook-driven event ingestion, state changes reflected in customer record. | `INTEG-002` | **PASS** |
| **Q12** | Consistent Data | Shared metric definitions across all views and API models. | `DASH-002` | **PASS** |
| **Q13** | Config & Secrets | 100% environment-driven configuration via `.env`, zero committed secrets. | `INTEG-004` | **PASS** |
| **Q14** | Maintainable Architecture | Strict separation of concerns (Routers -> Services -> ORM -> Schemas). | DEF-002 fix | **PASS** |
