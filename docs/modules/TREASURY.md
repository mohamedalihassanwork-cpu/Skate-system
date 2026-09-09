# Module: Treasury

**Status:** PLANNED / NOT IMPLEMENTED
**Last updated:** 2026-09-09

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
