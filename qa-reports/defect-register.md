# Defect Register

**Project:** Unified Business Management Platform  
**Target Branch:** `qa-testing`  
**Execution Lead:** QA-Sentinel Prime (`hamzaali-712`)  

---

## Active & Resolved Defects

| Defect ID | Title & Summary | Severity | Priority | Related Req | Status | Discovered Commit | Root Cause | Fix Description | Retest Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | Passlib bcrypt 5.x 72-byte value error on authentication | Critical | P0 | F1.1, Q1 | **RESOLVED** | `07aaeb0` | `bcrypt>=4.0` removed `__about__.__version__` and throws `ValueError` during Passlib wrap-bug detection. | Pinned `bcrypt==3.2.2` in `requirements.txt`. | **PASS** (11/11 auth tests green) |
| **DEF-002** | MissingGreenlet exception during Pipeline stages serialization | High | P1 | F2.5, F2.7, Q14 | **RESOLVED** | `07aaeb0` | `Pipeline.stages` relationship defaulted to lazy loading, failing in async context during Pydantic serialization. | Added `lazy="selectin"` in `orm.py` and `selectinload(Pipeline.stages)` in `pipelines.py`. | **PASS** (all pipeline & opportunity tests green) |
| **DEF-003** | ResponseValidationError on AuditLog query due to primary key mismatch | High | P1 | F4.1, F4.2 | **RESOLVED** | `07aaeb0` | `AuditLogResponse` schema specified `audit_log_id` while ORM defines `log_id`. | Aligned `AuditLogResponse` to `log_id: int` in `app/routers/audit.py`. | **PASS** (audit query verified) |
| **DEF-004** | Race condition on simultaneous lead creation causing UNIQUE constraint crash | High | P1 | F3.1, F3.8, Q5 | **RESOLVED** | `07aaeb0` | `_seed_lookups` executed concurrently without synchronization, causing simultaneous insertions into `s_lead_sources`. | Protected `_seed_lookups` with `asyncio.Lock()`. | **PASS** (concurrency intake verified) |

---

## Defect Metrics Summary

- **Total Defects Discovered:** 4
- **Critical (P0):** 1 (Resolved)
- **High (P1):** 3 (Resolved)
- **Medium (P2):** 0
- **Low (P3):** 0
- **Resolved & Verified:** 4
- **Open / Release Blocking:** **0**
