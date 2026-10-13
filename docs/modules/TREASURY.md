# Module: Treasury

**Status:** IMPLEMENTED ? PARTIALLY VERIFIED (see phase specification)
**Last updated:** 2026-10-11 (desktop UI audit)

---

## Purpose

Manages financial accounts and tracks all money movements, ensuring traceable financial records.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Each account has a current balance
- Every financial event creates a treasury movement
- Movements are traceable to the source operation (rental, sale, expense)
- Movements are immutable after creation
- Treasury balances must remain accurate

---

## Frontend

**Implemented page:** `apps/web/src/modules/treasury/TreasuryPage.tsx`

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

Reviewed active/inactive shifts, opening/closing forms, petty-expense entry and the expense list. Desktop close-shift fields and action wrap without squeezing the native date/time input; opening controls, expense headers and long descriptions remain contained. Shift, expense, amount and permission behavior is unchanged. The current page also uses Phase 12 shift/expense functionality.

Presentation changes apply only to screen widths of at least 1024px. Existing mobile/tablet presentation and print output are preserved. See [Desktop UI/UX Audit](../quality/DESKTOP_UI_UX_AUDIT.md) for consolidated coverage, evidence and verification results.


## Phone/tablet presentation — 2026-10-12

Shift summary/open/close controls and expense rows stack or wrap below desktop, including native datetime input clearance. Treasury calculations and operations are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.

Completion review (2026-10-13): mobile close-shift headings/captions and expense amounts use approved readable foreground tokens. Financial values, validation and submit handlers are unchanged.
