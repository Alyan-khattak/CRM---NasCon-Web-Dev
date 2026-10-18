# AI Development Rules
These rules apply to any AI coding assistant working on this repository. They are project constraints, not a substitute for explicit stakeholder approval.

## 1. Documentation-first workflow
1. Read `PRD.md`, `TRD.md`, `Architecture.md`, `appFlow.md`, `database.md`, `design.md`, `Rules.md` and `phases.md` before proposing or changing implementation.
2. Treat the original problem statement and explicitly confirmed stakeholder clarifications as authoritative.
3. Treat any section marked proposed, unresolved, blocked or requiring approval as non-authoritative for implementation.
4. Do not code while the requirements/MVP approval gate remains blocked, unless the user explicitly authorizes a bounded exploratory task.
5. Never infer approval from silence or from the existence of a draft document.

## 2. Scope control
- Implement only explicitly included and approved requirements.
- Do not silently defer included requirements or add new product features.
- The source's explicit exclusions remain excluded unless changed by an authorized stakeholder.
- Do not add vendors, APIs, AI capabilities, user roles, data fields, routes, database entities or acceptance targets without source support or approval.
- Do not implement a proposed architecture or stack until approved.
- AI conversation is limited to conversation and recommendations; it cannot own a lead or perform lead-management actions.
- Human assignment attempts continue after the one-hour AI conversation start condition.
- Keep the human accountability requirement intact.

## 3. Source and decision discipline
- Preserve original source IDs F1.1–F5.5, I1.1–I5.8 and Q1–Q14 in traceability.
- Keep PRD FR aliases mapped to source IDs; do not replace source IDs.
- Record stakeholder clarifications and impacts explicitly.
- If two rules conflict or ordering is unclear, stop the affected behavior and ask a focused question rather than guessing.
- Keep unresolved decisions in the open-question register.
- Do not turn proposals into requirements or infer success metrics.

## 4. Security and data protection
- Enforce workspace and permission checks server-side for every protected endpoint.
- Never trust client-side button visibility as authorization.
- Keep secrets/tokens out of source control, browser payloads and unmasked UI.
- Never store or log card numbers.
- Verify provider signatures before processing protected webhooks.
- Validate input server-side and protect against injection, XSS and CSRF.
- Enforce opt-out before sending messages.
- Do not expose one workspace's data or integration connection to another.
- Preserve audit history immutability.
- Do not log credentials or sensitive provider payload fields.

## 5. Correctness and reliability
- Maintain exactly one accountable human owner for each lead at a time.
- Prevent concurrent timer expiries from escalating the same lead twice.
- Process duplicate provider events idempotently where required.
- Ensure assignment/escalation timing remains correct through server restarts.
- Do not silently overwrite concurrent edits.
- Keep provider failures visible; do not silently drop messages or integration events.
- Isolate provider outages so unrelated platform functionality continues.
- Follow confirmed pipeline stage deletion and custom-field Owner acknowledgement rules.
- Do not invent fallback behavior where no eligible same-department employee exists.

## 6. Code quality and dependencies
- Follow the approved stack and folder structure once they exist.
- Keep business rules, data access, integration code and presentation separate as required by Q14.
- Reuse appropriate components and avoid unnecessary duplication.
- Avoid unrelated refactoring and unnecessary dependencies.
- Do not introduce a new service or architectural layer without approval.
- Use clear names and small, reviewable changes consistent with the chosen stack.

## 7. Testing and verification
- Write and run relevant unit tests.
- Test real integration boundaries in the provider's sandbox/test mode; do not substitute fake stand-ins for required integration acceptance.
- Include tests for unauthorized/cross-tenant access, invalid webhook signatures, duplicate events, retries/failures, timer races, server restarts and record integrity where applicable.
- Verify responsive behavior, keyboard use, labels, contrast and action feedback.
- Run relevant regression tests after changes.
- Never claim tests, deployments, integrations or features succeeded without evidence.
- If a test cannot run, state why, the impact and follow-up required.

## 8. Documentation and reporting
- Update every affected document when approved behavior changes.
- Keep diagrams, flows, schema, requirements IDs and implementation consistent.
- Report assumptions, deviations, incomplete work, test commands/results, limitations and known issues.
- Do not mark roadmap tasks complete before implementation and verification.
- Do not claim deployment or provider configuration succeeded without observed evidence.

## 9. Blocking decisions
The current blockers include the AI/email handover relationship, recipient when no prior assignee exists, email non-response deadline, same-department reassignment fallback, custom-field approval lifecycle, exact I4 email provider, and one-vs-multiple-pipeline scope. Do not silently decide these.
