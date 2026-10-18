# Product Requirements Document (PRD)
**Product:** Unified Business Management Platform  
**Document status:** Draft — requirements baseline and MVP scope not yet approved  
**Authority:** `problem statement.docx` plus explicitly confirmed stakeholder clarifications captured in the project conversation  
**Related documents:** [TRD](TRD.md) · [Architecture](Architecture.md) · [App Flow](appFlow.md) · [Database](database.md) · [Design](design.md) · [Rules](Rules.md) · [Phases](phases.md)

## 1. Evidence and decision labels
- **Explicitly stated:** Directly required by the problem statement.
- **Confirmed clarification:** Explicitly added by the stakeholder in the project conversation.
- **Directly supported interpretation:** Clarifies wording without adding a business policy.
- **Proposed — requires approval:** Recommendation only; not an approved requirement.
- **Unresolved / blocked:** Insufficient information to finalize.

This is a documentation draft, not a sign-off. The source problem statement remains authoritative; approved stakeholder clarifications supplement it. Requirements not answered by the source or stakeholder remain unresolved.

## 2. Product overview and problem
Small and growing service businesses lose revenue when inbound leads are missed or answered late. Ownership can be unclear; employee absence or workload can interrupt follow-up; escalation may not happen; and customer records, conversations, payments, appointments, and employee activity are split across tools.

The product is a connected web platform for company workspaces to manage customer relationships and sales pipelines, assign and track leads, communicate with customers, collect payments, schedule appointments through real external services, and retain traceable activity history.

## 3. Goals
1. Ensure each lead has exactly one accountable human owner at a time.
2. Capture leads from a public web form, incoming messages, and manual entry.
3. Provide a customizable CRM with contacts, companies, opportunities, fields, pipelines, filters, saved lists, and activity history.
4. Support acknowledgement, escalation, reassignment, and recovery of leads.
5. Connect real messaging, payment, calendar, and one additional notification integration.
6. Present an operational dashboard using consistent definitions and live stored data.
7. Enforce workspace isolation and server-side permissions.
8. Make important actions traceable.

## 4. Users and actors
| Actor | Confirmed purpose |
|---|---|
| Owner | Owns the workspace; manages users, levels, permissions and settings; sees company-wide figures. |
| Admin | Configures CRM, assignment rules and integrations within granted permissions; cannot modify the Owner. |
| User / sales or support employee | Handles assigned leads, customer conversations, notes, payments and appointments within permissions. |
| Manager | Configurable role composed of permissions, not a fourth hard-coded base role; supervises team and can reassign where permitted. |
| Customer | External person contacting the company, receiving messages/payment links and appointments. |
| System | Performs automatic assignment, timers, escalations, event processing and audit recording where required. |
| Conversational AI | Confirmed clarification: can converse and recommend only; cannot independently own a lead or perform lead-management actions. |

The platform serves sales-driven service companies with approximately 5–30 employees and multiple isolated company workspaces.

## 5. Scope boundaries

### 5.1 Explicitly included in the source scope
- Accounts, workspaces, roles and configurable permissions.
- Customizable CRM: contacts, companies, opportunities, custom fields and one customizable pipeline (the source also refers to different fields for different pipelines; see open question OQ-09).
- Lead capture, assignment, acknowledgement, escalation and recovery.
- Audit history of important actions.
- Operational dashboard on live data.
- Real integrations for messaging, payments and calendar, plus one team-selected notification integration.
- Quality requirements Q1–Q14 in the source.

### 5.2 Explicitly excluded by the source
- Full accounting: ledgers, reconciliation and financial statements.
- Payroll, shift scheduling, and legal leave/break rules.
- Advertising-platform analytics and campaign attribution.
- Full report builder and business intelligence.
- Training/onboarding modules and AI role-play.
- Public marketing website.
- Billing for the platform itself.

### 5.3 Proposed deferrals
**None approved.** Any reduction or deferral from the explicitly included scope requires stakeholder approval. MVP prioritization remains unresolved.

### 5.4 Additional confirmed clarifications
- If no employee is assigned to a lead, the system keeps trying to assign one. After one hour without an assignment, the conversational AI starts conversing with the lead. Human assignment attempts continue after AI starts.
- AI is limited to conversation and recommendations; it cannot independently take ownership or perform lead-management actions. A designated human remains accountable.
- When an employee becomes Offline or On leave, their acknowledged leads are also reassigned to another free employee in the same department. This supplements source F3.6.
- Transactional email is the selected category for I4 escalation notifications; exact provider is not selected.
- Before deleting a pipeline stage, the Admin must move all opportunities in that stage to another stage.
- The company/tenant Owner who registered with the platform must acknowledge an Admin's proposed custom-field change or deletion; without acknowledgement, the Admin's decision is invalid. Workflow details remain unresolved.
- Duplicate lead/contact matching uses known messaging phone numbers only, as required for messaging. No additional cross-source duplicate matching rule is authorized.
- A summarized email of the whole conversation context is sent to the employee previously assigned to the lead. If that employee does not respond to the email, the chatbot handles the conversation and that person remains responsible. Its relationship to the one-hour AI start condition is unresolved.

## 6. Functional requirements register
Source IDs are retained. `FR-*` aliases provide a stable cross-document namespace; source IDs remain authoritative.

| Alias | Source ID | Requirement summary | Evidence / status |
|---|---|---|---|
| FR-001 | F1.1 | Sign-up, login, logout, persistent sessions; signup creates workspace and first user as Owner. | Explicitly stated |
| FR-002 | F1.2 | Owner invites users and assigns Owner/Admin/User levels; Admin cannot modify Owner; User sees permitted data. | Explicitly stated |
| FR-003 | F1.3 | Owner configures view/create/edit/delete/export for CRM records, assignment rules, integrations, audit log. | Explicitly stated |
| FR-004 | F1.4 | Opportunity value hidden/masked in lists, detail and exports without permission. | Explicitly stated |
| FR-005 | F1.5 | Server rejects unauthorized direct API calls. | Explicitly stated |
| FR-006 | F1.6 | Complete workspace isolation, including guessed identifiers. | Explicitly stated |
| FR-007 | F2.1 | Contacts, companies, opportunities with relationships; contact page shows related records. | Explicitly stated |
| FR-008 | F2.2 | Admin creates text, number, date, dropdown and checkbox custom fields without code. | Explicitly stated |
| FR-009 | F2.3 | Different pipelines can show different custom-field sets while sharing contact information. | Explicitly stated; clarify relationship to “one customizable pipeline” in scope |
| FR-010 | F2.4 | Configured required fields block a stage move until filled. | Explicitly stated |
| FR-011 | F2.5 | Admin adds, renames, reorders and safely deletes stages; opportunities can move between stages. | Explicitly stated + confirmed deletion policy |
| FR-012 | F2.6 | Combine at least three supported criteria, save a list, and update it as records match/unmatch. | Explicitly stated |
| FR-013 | F2.7 | Contact/opportunity time-ordered activity history includes notes, stage changes, assignments, field edits, messages, payments, appointments, actor and time. | Explicitly stated |
| FR-014 | F2.8 | Contact page shows conversations, opportunities, payments, appointments, assigned employee and history. | Explicitly stated |
| FR-015 | F3.1 | Create leads from public form, incoming messaging integration and manual entry, with source label. | Explicitly stated |
| FR-016 | F3.2 | Employee status is Available, Busy, On leave or Offline; employee or Admin can set it. | Explicitly stated |
| FR-017 | F3.3 | Configurable round-robin among Available employees and maximum open-lead count; unavailable statuses never receive new leads. | Explicitly stated |
| FR-018 | F3.4 | Assignee notified; must acknowledge or act within configurable window; remaining time visible. | Explicitly stated |
| FR-019 | F3.5 | Expired window escalates to next eligible employee, designated backup, then manager; levels and times configurable. | Explicitly stated; detailed interaction with AI remains unresolved |
| FR-020 | F3.6 | On leave/Offline immediately reassigns unacknowledged leads; acknowledged-lead handling is visible. | Explicitly stated + confirmed clarification for acknowledged leads |
| FR-021 | F3.7 | Recovery queue lists overdue unacknowledged leads, leads escalated more than once, or untouched beyond configured idle period, with reason. | Explicitly stated |
| FR-022 | F3.8 | Never have two owners simultaneously; concurrent timers cannot escalate same lead twice. | Explicitly stated |
| FR-023 | F3.9 | New owner receives an external alert through I4 when lead escalates. | Explicitly stated |
| FR-024 | F4.1 | Record important assignments, acknowledgements, escalations, reassignments, permission/configuration/integration changes and deletions with actor/system, time, target and before/after values where relevant. | Explicitly stated |
| FR-025 | F4.2 | Audit history is permission-restricted and filterable by event type, user and date. | Explicitly stated |
| FR-026 | F4.3 | Audit entries cannot be edited or deleted through screens or endpoints. | Explicitly stated |
| FR-027 | F5.1 | Dashboard shows new leads today, open pipeline value by stage, average first-response time, recovery queue, 24-hour escalations, availability, upcoming appointments, monthly payments received. | Explicitly stated |
| FR-028 | F5.2 | Dashboard figures follow glossary definitions and match underlying records. | Explicitly stated |
| FR-029 | F5.3 | At least three dashboard figures drill down to permitted filtered records. | Explicitly stated |
| FR-030 | F5.4 | User sees personal figures; Owner/Admin see company-wide figures. | Explicitly stated |
| FR-031 | F5.5 | User can show/hide dashboard figures and preference is remembered. | Explicitly stated |
| FR-032 | I1.1–I1.9 | Real Twilio WhatsApp Sandbox (SMS alternative) messaging: inbound webhook, signature verification, outbound messages, delivery status, known-number matching, ownership/visibility, failure/retry, duplicate handling, opt-out. | Explicitly stated |
| FR-033 | I2.1–I2.8 | Stripe test-mode payment requests, webhook-confirmed status, signature validation, idempotency, failure/expiry/refund states, collected vs projected revenue, traceability, no card data storage/logging. | Explicitly stated |
| FR-034 | I3.1–I3.7 | Google Calendar OAuth 2.0 consent, token refresh/storage, real booking, conflict handling, timezone correctness, change/cancel sync, connection status. | Explicitly stated |
| FR-035 | I4.1–I4.4 | Transactional email alert for escalations; real delivery, useful content, per-user routing, bounded retry/failure visibility. | Category confirmed; provider unresolved |
| FR-036 | I5.1–I5.8 | Central integration status, workspace-specific config, secret protection, sync history, retry/error handling, stated limits, permission/audit, provider failure isolation. | Explicitly stated |
| FR-037 | Q1–Q14 | Authentication, authorization, input safety, integrity, concurrency/timing, persistence, responsive design, accessibility, performance, feedback, real-time updates, consistency, secrets/configuration, maintainable separation. | Explicitly stated |

## 7. Business rules and metric definitions
| ID | Rule |
|---|---|
| BR-001 | Exactly one accountable human owner at any moment; AI does not own the lead. |
| BR-002 | Employees not Available never receive new leads. |
| BR-003 | Acknowledgement is an explicit click or a recorded action on the lead (note, message, call log, stage change, appointment). |
| BR-004 | Automatic escalation and manual reassignment are counted separately. |
| BR-005 | Open pipeline value excludes opportunities in won or lost stages. |
| BR-006 | Collected revenue = provider-confirmed payments minus confirmed refunds. |
| BR-007 | Opted-out contacts cannot be messaged. |
| BR-008 | Duplicate provider events must not create duplicate messages/leads/payments where specified. |
| BR-009 | Before a pipeline stage is deleted, all opportunities in it must be moved to another stage. |
| BR-010 | Admin custom-field change/delete is not valid until the registered tenant Owner acknowledges it. |
| BR-011 | If no employee has been assigned, assignment attempts continue; after one hour, AI starts conversation; human assignment attempts continue. |
| BR-012 | When employee becomes Offline/On leave, their acknowledged leads are reassigned to a free employee in the same department. |
| BR-013 | Duplicate matching is limited to known messaging phone numbers; no other matching rule is approved. |

Glossary terms must retain the source definitions: Workspace, Lead, Assigned time, Acknowledged, Time to first response, Escalation, Recovery queue item, Available employee, Open pipeline value, Projected revenue, Collected revenue, Conversation, Appointment, Integration event.

## 8. Quality requirements
Preserve Q1–Q14 from the source as a single authoritative register. They cover password hashing/session expiry/guess protection; server-side workspace/permission checks; validation and injection/XSS/CSRF protection; data integrity and concurrent edits; correct assignment/timers/webhooks across duplicate/concurrent events and restarts; durable database persistence; responsive screens; keyboard access/labels/contrast; pagination/search/filter behavior on hundreds of records; action feedback and actionable errors; live updates; consistent metric definitions; secrets outside source; and separation of business rules, data access, integrations and presentation.

No numeric targets beyond those explicitly stated in Q9 and I4.1 should be invented.

## 9. User stories and acceptance
Examples traced to source requirements:
- As an Owner, I can invite users and configure permissions so access is controlled (FR-002–FR-006).
- As an Admin, I can configure fields and stages without code while preserving existing records (FR-008–FR-011).
- As an employee, I receive a lead assignment and can see the acknowledgement timer (FR-017–FR-019).
- As a manager, I can find overdue or repeatedly escalated leads in the recovery queue (FR-021).
- As an employee, I can message a customer and see delivery/failure state (FR-032).
- As an employee, I can create a payment request and see webhook-confirmed outcomes (FR-033).
- As an employee, I can book an appointment that appears on my Google Calendar (FR-034).
- As an authorized manager, I can inspect operational metrics and drill into records I am allowed to see (FR-027–FR-031).

The detailed acceptance criteria are the source's F/I/Q acceptance criteria; no new business acceptance thresholds are approved.

## 10. Success measurement
Source-supported observable outcomes include fewer missed/late leads, visible first-response times and escalations, real provider events on customer records, consistent dashboard figures, and traceable actions. Numeric targets and the method/baseline for measuring business improvement are **unresolved**.

## 11. Risks and dependencies
- Provider accounts, sandbox/test configuration and publicly reachable HTTPS webhooks are required by the source.
- Assignment, timer, webhook idempotency and server restart behavior are correctness-critical.
- Multi-tenant data isolation and server-side authorization are high-impact requirements.
- AI conversation timing and responsibility handover contain unresolved interaction rules.
- Custom-field approval workflow and unavailable same-department replacement behavior are incomplete.
- The exact I4 email provider and MVP prioritization are unresolved.

## 12. Open questions / blockers
| ID | Question | Why it matters |
|---|---|---|
| OQ-01 | If no employee has ever been assigned, who receives the summarized conversation-context email? | “Previously assigned employee” may not exist. |
| OQ-02 | What exactly counts as non-response to that email, and after what deadline? | Determines when chatbot takes over; one-hour AI start condition is separate unless explicitly unified. |
| OQ-03 | How do the email handover rule and the one-hour AI start rule interact and in what order? | Avoids conflicting AI/human conversation behavior. |
| OQ-04 | Who designates the human accountable person when there is no current/previous assignee? | AI cannot own the lead, but accountability fallback is incomplete. |
| OQ-05 | What happens if no free employee exists in the same department for absence reassignment? | Required reassignment cannot complete under that condition. |
| OQ-06 | What is the approval lifecycle for custom-field changes/deletion (pending state, notification, rejection, timeout)? | Only the Owner-acknowledgement rule is confirmed. |
| OQ-07 | Which transactional email provider is approved for I4? | Integration implementation depends on provider selection. |
| OQ-08 | What timer reset/continuation rules apply when assignments, manual actions, AI conversation, or reassignment occur? | Affects escalation correctness and response metrics. |
| OQ-09 | Does the product MVP have one pipeline only, or multiple pipelines as implied by F2.3? | Source scope says one customizable pipeline but F2.3 discusses different pipelines. |
| OQ-10 | What MVP deferrals, if any, are approved? | Scope reductions are not approved. |
| OQ-11 | What numeric business-success targets and baseline should be used, if any? | Source gives observable outcomes but no target values. |
| OQ-12 | What should happen when an Admin requests custom-field change/deletion and the Owner does not acknowledge? | Pending behavior is unspecified. |

## 13. Approval gate
**Not approved.** Do not treat this PRD as a frozen baseline. Confirm unresolved business rules, resolve source ambiguity, review traceability, and explicitly approve requirements and MVP scope before finalizing architecture or selecting any additional third-party provider.
