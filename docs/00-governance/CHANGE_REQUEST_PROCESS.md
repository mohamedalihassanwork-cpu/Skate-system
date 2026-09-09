# Change Request Process — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** ACTIVE

---

## Purpose

Every meaningful change to the system must follow this process. It prevents:
- Silent business rule changes
- Unreviewed architecture decisions
- Undocumented changes
- Regressions caused by unplanned scope expansion

---

## When Is a Change Request Required?

A formal Change Request record is required for:

- New business features
- Changes to business rules (pricing, late fees, damage logic, etc.)
- Database schema changes
- Changes to the permission/authorization system
- Changes to financial operations
- Changes to the audit log
- Changes to the rental lifecycle state machine
- Breaking changes to the API
- Changes to the deployment architecture

**Not required for:**
- Minor bug fixes
- Documentation corrections
- Styling/visual tweaks that do not change behavior

---

## Change Request Process Flow

```
REQUEST
  ↓
UNDERSTAND — read PROJECT_STATE, PROJECT_MAP, relevant module docs
  ↓
IMPACT ANALYSIS — identify what will change
  ↓
IDENTIFY AFFECTED MODULES
  ↓
CHECK BUSINESS RULES — does this conflict with any rule?
  ↓
CHECK DESIGN IMPACT — does this affect the UI/UX?
  ↓
CHECK DATABASE IMPACT — new tables, columns, migrations?
  ↓
CHECK API IMPACT — new endpoints, changed contracts?
  ↓
CHECK PERMISSIONS — new permissions needed?
  ↓
DOCUMENT — create/update Change Request record below
  ↓
OBTAIN APPROVAL — from project owner
  ↓
IMPLEMENT
  ↓
TEST
  ↓
VERIFY
  ↓
UPDATE DOCUMENTATION
  ↓
GIT COMMIT
  ↓
GIT PUSH
  ↓
REPORT
```

---

## Change Request Record Format

When creating a change request, record it in `docs/decisions/DECISION_LOG.md` with:

```
## CR-<ID>

**Date:** YYYY-MM-DD
**Type:** CHANGE REQUEST
**Status:** PROPOSED | APPROVED | REJECTED | IMPLEMENTED | COMPLETED

**Title:**
Brief title of the change.

**Description:**
What is being changed and why.

**Business Rule Impact:**
List any business rules affected. If none, state "None."

**Affected Modules:**
- Module 1
- Module 2

**Database Impact:**
Describe schema changes. If none, state "None."

**API Impact:**
Describe API changes. If none, state "None."

**UI Impact:**
Describe visual/UX changes. If none, state "None."

**Permission Impact:**
Describe permission changes. If none, state "None."

**Audit Log Impact:**
Does this require new audit entries? Yes/No.

**Risk:**
LOW | MEDIUM | HIGH

**Approved by:**
Project owner name/confirmation.

**Implementation commit:**
Git commit hash when completed.
```

---

## For AI Agents

When implementing a change request:

1. Read the full Change Request record first
2. Do NOT expand scope beyond what is approved
3. If you discover that implementation requires something beyond the approved scope, **stop** and record the new requirement as a separate CR
4. Report the exact commit hash when done

---

*Last updated: 2026-09-09*
