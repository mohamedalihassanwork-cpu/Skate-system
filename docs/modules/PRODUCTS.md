# Module: Products / Spare Parts

**Status:** PLANNED / NOT IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Manages the product catalog used in Sales POS, including spare parts and store products.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Products belong to categories
- Products have price and stock quantity
- Selling a product reduces stock quantity

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

- **Source coverage:** Product list and search, product create/edit dialog and category-create dialog.
- **Changes:** Product/category forms now use the approved 16px desktop field-group gap. The existing shared DataTable and form components remain in use.
- **Boundary:** All new visual rules use `@media screen and (min-width: 1024px)`. Presentation below 1024px, API requests, permissions, validation, financial calculations and workflows are preserved.
- **Verification:** See the central report for the actual build, lint, synthetic-browser and below-desktop regression results. This audit does not claim new live financial or database verification.

The original planned-only sections above are historical stubs. Implemented frontend coverage is listed here and in the central audit; implementation and backend verification status are governed by the current project state and phase records.


## Phone/tablet presentation — 2026-10-12

Product/category forms inherit shared phone/tablet field sizing, spacing and dialog behavior. The sales catalog/card layout adapts to the viewport. Product and stock handlers are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.
