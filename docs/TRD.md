# Technical Requirements Document (TRD)
**Status:** Draft; technology stack and technical architecture are not approved.  
**Related:** [PRD](PRD.md), [Architecture](Architecture.md), [Database](database.md), [Rules](Rules.md)

## 1. Purpose and evidence
This document translates approved-source requirements into technical constraints without choosing an unsupported stack. Source requirement IDs F*, I*, and Q* remain authoritative; PRD aliases FR-* map to them.

## 2. Confirmed technical constraints
- The product is a connected **web platform**.
- All product data and workspace configuration must persist in a real database and survive restart (Q6).
- Authorization and tenant isolation must be enforced server-side (F1.5, F1.6, Q2).
- External integrations must use real provider sandbox/test modes, not hard-coded stand-ins.
- Webhook endpoints must be reachable over public HTTPS for provider callbacks.
- Provider signatures must be verified for messaging and payment callbacks.
- Provider events/calls must be traceable, retried when temporary errors occur, and processed idempotently where required.
- Secrets and tokens must not be exposed to the browser, committed to source, or shown in full in the UI.
- The code must separate business rules, data access, integrations, and presentation (Q14).
- All timers and thresholds must be configurable and demonstrable in seconds where specified by the source.
- Transactional email is the confirmed I4 category; provider remains unresolved.

## 3. Technology decisions
| Area | Status | Decision |
|---|---|---|
| Frontend framework | Unresolved | No framework approved. |
| Backend framework/runtime | Unresolved | No framework/runtime approved. |
| Database engine | Unresolved | A real persistent database is required; engine/schema not approved. |
| Authentication/session implementation | Unresolved | Security behavior is required; provider/library is not chosen. |
| Real-time update mechanism | Unresolved | New leads, escalations and messages must appear without manual refresh (Q11); mechanism not chosen. |
| Background jobs/timers | Unresolved | Assignment/escalation timers must survive restarts and concurrent events (Q5); mechanism not chosen. |
| Hosting/deployment | Unresolved | Public HTTPS webhook reachability required; host not selected. |
| Test framework/CI | Unresolved | Verification required, specific tools not chosen. |
| I1 messaging | Explicit provider requirement | Twilio WhatsApp Sandbox; Twilio SMS is an accepted alternative. |
| I2 payments | Explicit provider requirement | Stripe test mode. |
| I3 calendar | Explicit provider requirement | Google Calendar via OAuth 2.0. |
| I4 notifications | Category confirmed | Transactional email; exact provider unresolved. |

No technology recommendation is approved in this document.

## 4. Security requirements
- Store passwords only as salted hashes from a recognized algorithm; sessions/tokens expire and can be ended; protect login from repeated guessing (Q1).
- Check workspace and permission on every protected endpoint; guessed IDs cannot cross tenant or user boundaries (Q2).
- Validate all input server-side and protect against injection, XSS and CSRF; never trust imported/uploaded content (Q3).
- Apply field-level permission to opportunity values in lists, detail views and exports (F1.4).
- Keep provider credentials and OAuth tokens server-side; never expose secrets in the browser or full in the UI (I5.3).
- Never store or log card numbers; payment details belong on the provider-hosted page (I2.8).
- Verify Twilio and Stripe webhook authenticity before changing records (I1.2, I2.3).
- Do not allow audit history edits/deletes through screens or endpoints (F4.3).
- Do not message opted-out contacts (I1.9).

## 5. Data integrity and concurrency
Technical behavior must preserve:
- Exactly one accountable human owner per lead at a time (F3.8 and confirmed AI constraints).
- No duplicate escalation from overlapping timers (F3.8).
- Idempotent processing of repeated provider webhooks for messages/leads and payments (I1.8, I2.4).
- Correct timer behavior through server restarts (Q5).
- No orphaned/contradictory records after field, stage, user or contact changes/deletions (Q4).
- Concurrent edits must not silently overwrite one another (Q4).
- One workspace's credentials/configuration must never be used by another workspace (I5.2).

Implementation mechanism is not selected.

## 6. Integration contracts required by source
### Messaging (I1)
Inbound webhook, provider signature verification, outgoing message, status callback, known phone-number contact matching, conversation ownership, failure reason/retry, duplicate event prevention and opt-out enforcement.

### Payments (I2)
Create a hosted payment link/checkout session from an opportunity; persist provider-confirmed status from signed webhooks; handle expired/abandoned/failed/refunded states; distinguish collected from projected revenue; record opportunity/contact/requesting employee/provider reference; never store card data.

### Calendar (I3)
Employee-consented OAuth 2.0 connection; server-side token handling and refresh; detect revoked/expired connection; create, reschedule and cancel actual Google Calendar events; read busy times; preserve timezone correctness; show connection state.

### Notifications (I4)
Real transactional email for escalations; message includes lead, source, escalation reason and a link; per-user email destination; record failure and retry a limited number of times. Provider and retry count/backoff policy are unresolved unless specified by provider constraints and approved later.

### Shared integration behavior (I5)
Central status page; per-workspace credentials/connections; synchronization history; temporary-error retry; clear permanent-error explanation; provider limits visible; permission/audit controls; failure isolation.

## 7. Quality requirements and verification
| Source ID | Technical obligation | Source-grounded verification |
|---|---|---|
| Q1 | Password/session/login protection | Verify hash storage, expiry/end-session and repeated-guess protections. |
| Q2 | Server-side authorization and tenant isolation | Direct API negative tests using unauthorized and cross-workspace IDs. |
| Q3 | Validation and injection/XSS/CSRF protections | Input/security tests for relevant endpoints and forms. |
| Q4 | Record integrity and concurrent edit safety | Change/delete dependency tests and concurrent update tests. |
| Q5 | Assignment/timers/webhooks correct under races, duplicates and restarts | Concurrency, replay and restart tests. |
| Q6 | Persistent database and workspace configuration | Restart and persistence tests. |
| Q7 | Responsive phone/tablet/laptop UI | Test supported screen sizes; no horizontal scrolling/hidden controls. |
| Q8 | Keyboard, labels, color and contrast | Keyboard-only and accessibility review. |
| Q9 | Pagination/filter/search/progress behavior | Several-hundred-record scenario; avoid UI freeze; show progress on slow operations. |
| Q10 | Loading/success/failure feedback | Exercise success and failure paths for each action. |
| Q11 | Live updates | Verify new leads, escalations and messages appear without manual refresh. |
| Q12 | Consistent metrics | Reconcile dashboard values with record-level data and glossary. |
| Q13 | Externalized secrets and reproducible setup | Inspect repository/configuration and follow written setup instructions with sample data. |
| Q14 | Separation of concerns | Review code boundaries for business rules, data access, integrations and presentation. |

## 8. Environments and operations
- Required external provider modes: Twilio WhatsApp Sandbox (or accepted Twilio SMS alternative), Stripe test mode, Google Calendar OAuth 2.0, and selected transactional email provider.
- Public HTTPS is required for inbound webhooks.
- Credentials and secrets must be external to source code.
- Setup instructions and sample data are required (Q13).
- Logging of integration events is required, but secrets and card numbers must not be logged.
- Hosting provider, deployment topology, monitoring vendor, backup policy, retention period, and availability target are not specified.

## 9. Open technical decisions
See PRD OQ-01–OQ-12. Additional technical decisions should be made only after business behavior is approved: stack, database engine, session model, real-time mechanism, durable scheduler, provider-specific retry policy, deployment environment, backup/recovery targets, logging retention and test tooling.

## 10. Approval status
This TRD records requirements and unresolved decisions; it does not authorize a technology stack, vendor beyond source-mandated providers, or final architecture.
