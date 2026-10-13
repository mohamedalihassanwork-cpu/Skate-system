# Module: Payments

**Status:** PLANNED / NOT IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Handles payment recording for rentals, sales, late fees, and damage charges. Supports split payments across multiple payment methods.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Multiple payment methods per transaction (split payment)
- Each payment component is individually identifiable but linked to same transaction
- Every payment must update the corresponding treasury account
- Payment records are immutable after creation
- Supported methods: Cash, Card, InstaPay, Vodafone Cash, configurable others

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


## Phone/tablet presentation — 2026-10-12

Sales and rental payment controls reflow below desktop and receive readable touch targets and accessible names. Payment methods, amounts, split-payment state and submission payloads are unchanged; no live transaction was submitted during UI checks.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.
