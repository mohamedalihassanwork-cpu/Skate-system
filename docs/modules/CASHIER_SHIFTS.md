# Module: Cashier Shifts

**Status:** PLANNED / NOT IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Manages cashier shift open/close lifecycle with opening balance, expected balance, and cash reconciliation.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- One open shift per cashier at a time
- Closing balance = opening + revenue - expenses
- Difference = actual cash - expected cash
- Shift preserves all revenue and expense activity during its period

---

## Frontend

**Target location:** `apps/web/src/modules/` (path TBD during implementation)

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
