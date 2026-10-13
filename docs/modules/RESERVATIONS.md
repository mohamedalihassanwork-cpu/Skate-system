# Module: Reservations

**Status:** PLANNED / NOT IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Allows pre-booking of skates for future use. Prevents conflicting reservations.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Conflicting reservations are prohibited
- Reserved skate is not treated as normally available during reservation period
- Reservation linked to customer and optionally to specific skate or size

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

---

## Desktop UI/UX audit — 2026-10-11

**Status:** IMPLEMENTED — desktop presentation changes; verification evidence is maintained in the [central desktop audit report](../quality/DESKTOP_UI_UX_AUDIT.md).

- **Source coverage:** Reservation status list and actions, create/edit reservation dialog and cancellation confirmation.
- **Changes:** The reservation form now separates shared fields/groups by the approved 16px desktop gap and permits its date-time field wrappers to shrink. Existing customer-ID entry, reservation fulfillment and cancellation behavior are unchanged.
- **Boundary:** All new visual rules use `@media screen and (min-width: 1024px)`. Presentation below 1024px, API requests, permissions, validation, financial calculations and workflows are preserved.
- **Verification:** See the central report for the actual build, lint, synthetic-browser and below-desktop regression results. This audit does not claim new live financial or database verification.

The original planned-only sections above are historical stubs. Implemented frontend coverage is listed here and in the central audit; implementation and backend verification status are governed by the current project state and phase records.


## Phone/tablet presentation — 2026-10-12

Reservation fields have consistent spacing and a responsive datetime pair; dialog actions wrap. Phone/tablet cancellation uses the shared ConfirmDialog with the existing confirmed cancellation operation. Desktop confirmation behavior and reservation rules are preserved.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.
