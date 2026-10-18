# UI/UX and Design System
**Status:** Draft. No established brand identity, visual reference, color palette, typography or component library has been approved for this project.  
**Related:** [PRD](PRD.md) · [App Flow](appFlow.md)

## 1. Confirmed experience requirements
The application is a web platform for Owners, Admins, Users and configurable Manager roles, plus customer-facing intake/conversation entry points. All screens must be usable on phone, tablet and laptop without horizontal scrolling or hidden controls (Q7). Interactive elements must be keyboard accessible, forms labeled, color not the only signal, and contrast readable (Q8). Every action needs loading, success and failure feedback (Q10).

## 2. Visual direction
**Proposed — requires approval:** Use a clear, restrained business-workspace interface optimized for frequent operational tasks. Prioritize readable data tables, visible ownership and timers, accessible status labels, and predictable forms. This is a recommendation, not an established brand identity.

No specific colors, font, logo, icon set, shadows or visual references are established by the source.

## 3. Design tokens
All values below are intentionally unresolved rather than invented.

| Token group | Status | Notes |
|---|---|---|
| Brand/semantic colors | Unresolved | Must support readable contrast and non-color status cues. |
| Typography and font scale | Unresolved | Choose and approve during design work. |
| Spacing scale | Unresolved | Choose and approve. |
| Border/radius/shadow | Unresolved | Choose and approve. |
| Breakpoints/grid | Unresolved | Must support phone, tablet and laptop without horizontal scrolling. |
| Iconography | Unresolved | Do not assume an icon library. |
| Motion/animation | Unresolved | No motion preference specified. |

## 4. Reusable interaction patterns (requirements-driven)
- **Permission-aware actions:** hide or disable controls as appropriate, but server-side authorization remains mandatory; client presentation is not security.
- **Opportunity value:** hidden or masked in lists, detail views and exports for users lacking matching permission.
- **Forms:** associated labels, keyboard access, server-side validation feedback, loading/success/failure states.
- **Timers:** acknowledgement time remaining must be visible to assignee.
- **Lead status:** show current accountable employee and distinguish automatic escalation from manual reassignment.
- **Integration status:** show not connected / connected / error, last successful operation and recent errors.
- **Provider failure:** show failure reason and retry path where the source requires one.
- **Opt-out:** explicitly explain why messaging is blocked.
- **Stage transition:** explain required fields blocking a move.
- **Deletion:** stage deletion is blocked until its opportunities are moved; custom-field change/deletion awaits tenant Owner acknowledgement.
- **Dashboard:** support figure show/hide preferences and permitted drill-downs.
- **Audit history:** filter by event type, user and date; no edit/delete controls.

## 5. Screen-level design requirements
| View | Key content | Important states |
|---|---|---|
| Dashboard | Required operational figures, availability, appointments, payments | Loading, no data, permission-limited values, live refresh/update |
| Lead/conversation | Lead source, accountable human, timer, messages, activity | Unassigned, assigned, overdue, AI conversation active, provider failure, opted out |
| Recovery queue | Lead, recovery reason, escalation history/actionability | Empty queue, loading, permission restriction |
| CRM contact | Related company/opportunities, conversations, payments, appointments, employee, activity | Missing optional relationships; permission-masked fields |
| Pipeline board/list | Opportunities and stages | Required-field validation; stage deletion blocked while occupied |
| Custom-field settings | Field name/type and pipeline/stage configuration | Pending Owner acknowledgement; rejected/pending behavior unresolved |
| Integrations | Connection status, last worked, recent errors, sync history | Not connected, connected, error, reconnection required |
| Calendar booking | Busy times, appointment details, connected account state | Conflict warning/block, no calendar connection, provider failure |
| Payment request/status | Amount/currency, hosted link, status | Paid, expired, abandoned, failed, refunded |
| Audit history | Actor/system, time, target, changes and filters | No results; immutable entries |

## 6. Accessibility and responsive behavior
Required by Q7–Q8:
- Keyboard access to all interactive controls.
- Visible focus treatment and logical focus order.
- Labels for form inputs.
- Color is never the sole carrier of status or meaning.
- Readable contrast.
- Layout adapts to phone/tablet/laptop without horizontal scrolling or hidden controls.
- Slow operations provide progress while users can continue working where applicable (Q9).

Specific WCAG conformance level is not stated and must not be claimed.

## 7. Open design decisions
- Brand name treatment/logo and approved design reference.
- Palette, typography, spacing, components and breakpoints.
- Final navigation and screen inventory after requirements approval.
- Exact AI chat presentation and how it coexists with human ownership.
- Approval-request interaction for custom-field changes/deletion.
- Exact copy for errors, empty states, confirmations and provider limitations.
