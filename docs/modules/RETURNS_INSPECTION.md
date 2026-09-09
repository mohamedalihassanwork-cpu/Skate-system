# Module: Returns & Inspection

**Status:** PLANNED / NOT IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Manages the return workflow and inspection process for returned skates. Triggers the skate's next status (available or maintenance).

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Return records actual return time
- Late fee calculated from expected_end_at to returned_at
- Every returned skate goes through inspection
- Inspection determines: available OR maintenance required
- Inspection areas: wheels, brake, strap, bearings, body, other

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
