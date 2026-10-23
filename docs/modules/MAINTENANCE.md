# Module: Maintenance

**Status:** IMPLEMENTED ? PARTIALLY VERIFIED (see phase specification)
**Last updated:** 2026-10-11 (desktop UI audit)

---

## Purpose

Manages the maintenance lifecycle for skates requiring repair. Tracks problem, repair, parts, labor cost, and completion.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Skate in maintenance cannot be rented
- Skate returns to available only after maintenance is marked Completed
- Maintenance cost is a business expense
- Parts and labor tracked separately
- Statuses: pending, in_progress, completed

---

## Frontend

**Implemented page:** `apps/web/src/modules/maintenance/MaintenancePage.tsx`

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

Reviewed list/status filtering, create/edit/completed records, parts and system/external payment dialogs. The desktop audit identified missing utility styles in the existing dialogs; shared desktop utility restoration supplies their intended grid, spacing, summary and action layout. New-record dialogs use the full desktop form width; existing records retain two detail/parts columns. Maintenance lifecycle, costs and payment actions are unchanged.

Presentation changes apply only to screen widths of at least 1024px. Existing mobile/tablet presentation and print output are preserved. See [Desktop UI/UX Audit](../quality/DESKTOP_UI_UX_AUDIT.md) for consolidated coverage, evidence and verification results.


## Phone/tablet presentation — 2026-10-12

Existing record details, parts, summary/payment controls and footer actions receive scoped layout/spacing; new records use the full form width. Part deletion controls meet the approved touch size. Maintenance rules and operations are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.


## Approved sub-treasury integration — 2026-10-16

System maintenance payment uses the active performing cashier’s assigned drawer for cash and configured account for electronics. Existing active-shift requirements remain for both. Paid-state/source locks prevent duplicates; financial movement, balance and awaited required audit commit together. External payments and completion/cost estimates still do not spend system funds.

Authority: [ST-01–06](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). Current workflow: [Treasury](TREASURY.md). Executed checks and limits: [verification report](../quality/SUB_TREASURY_VERIFICATION.md). Earlier proposal/pending wording is historical and superseded only within this approved scope.
