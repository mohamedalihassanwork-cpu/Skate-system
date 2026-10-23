# Module: Audit Log

**Status:** IMPLEMENTED ? PARTIALLY VERIFIED (see phase specification)
**Last updated:** 2026-10-11 (desktop UI audit)

---

## Purpose

Records significant business operations for accountability and traceability.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Every waiver (late fee, damage charge) must be audited
- Pricing changes audited
- User management changes audited
- Maintenance completion audited
- Audit entry preserves: user, action, entity type, entity ID, old value, new value, timestamp

---

## Frontend

**Implemented page:** `apps/web/src/modules/audit/AuditLogsPage.tsx`

---

## Backend

**Target location:** `apps/api/src/modules/` (path TBD during implementation)

---

## Database

See `docs/architecture/DATABASE_ARCHITECTURE.md` for relevant tables.

---

## APIs

See `docs/architecture/API_ARCHITECTURE.md` for relevant routes.

---

## Permissions

To be defined during implementation phase.

---

## Related Modules

To be documented during implementation.

---

## Tests

**Target location:** `tests/` (TBD during implementation)

See `docs/quality/TEST_MATRIX.md` for relevant test cases.

---

## Known Issues

*None — not yet implemented.*

---

## Known Technical Debt

*None — not yet implemented.*

---

## Future Work

To be defined during or after implementation.

---

## Verification Requirements

To be defined during implementation phase. Reference `docs/00-governance/DEFINITION_OF_DONE.md`.

---

*Last updated: 2026-09-09*

## Desktop UI audit ? 2026-10-11

Reviewed user/entity/action filters, table columns, loading/empty/error states and pagination. Desktop gutters, header hierarchy, filter layout, focus outlines and table spacing now follow the existing design tokens. API filters, translation maps and pagination logic are unchanged.

Presentation changes apply only to screen widths of at least 1024px. Existing mobile/tablet presentation and print output are preserved. See [Desktop UI/UX Audit](../quality/DESKTOP_UI_UX_AUDIT.md) for consolidated coverage, evidence and verification results.


## Phone/tablet presentation — 2026-10-12

Phone/tablet audit filters use a labelled responsive grid. The existing table has readable token-based styling and contained horizontal scrolling; pagination wraps. Audit data/filter logic is unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.


## Approved sub-treasury integration — 2026-10-16

New/touched financial operations use strict awaited transaction-bound audit: funding authorization/acceptance/cancellation, account assignment/activation, count-only opening, close/declaration/replacement/rejection, explicit variance approval, transfer and confirmation. A failure rolls back the financial transaction. Global nonfinancial audit-failure policy remains OWNER-002; this change does not silently resolve it. Original snapshots/attempts and reviewer/approver identities remain auditable.

Authority: [ST-01–06](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). Current workflow: [Treasury](TREASURY.md). Executed checks and limits: [verification report](../quality/SUB_TREASURY_VERIFICATION.md). Earlier proposal/pending wording is historical and superseded only within this approved scope.
