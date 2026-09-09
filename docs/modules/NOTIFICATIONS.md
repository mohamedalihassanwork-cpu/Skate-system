# Module: Notifications

**Status:** PLANNED / NOT IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Delivers operational alerts to cashiers, primarily for rental expiration warnings.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Alert cashier exactly 1 minute before rental expected end time
- Notification shows: rental ID, customer, skate, end time, remaining time
- In-app notification panel required
- Optional sound notification
- Browser-only timer is NOT authoritative for rental state — server decides

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
