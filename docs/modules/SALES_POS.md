# Module: Sales POS

**Status:** IMPLEMENTED — scoped Treasury balance regression VERIFIED (2026-10-15)
**Last updated:** 2026-09-09

---

## Purpose

Separate POS for selling products and spare parts, intentionally distinct from the Rental POS.

---

## Current Status

Sales POS and its API are implemented. Historical target sections below are not implementation-status evidence; current Treasury integration is documented in the 2026-10-15 section.

---

## Business Rules

- Sales POS is separate from Rental POS — not merged
- Supports product selection, cart, quantities, pricing, payment, invoice
- Sales history maintained
- Payment updates treasury

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

- **Source coverage:** Sales POS catalog/search/categories, cart quantities and split payments, sales history, sale-details dialog and cancellation confirmation.
- **Changes:** The desktop POS catalog and cart fit the available width beside the sidebar. Categories wrap, long product names remain visible, and the cart heading uses inverse text on navy. Catalog and cart scroll independently; checkout remains reachable as payment rows grow. Sales history inherits shared desktop table improvements. Existing native cancellation confirmations and the bespoke sale-details modal remain recorded cross-breakpoint findings in the central report.
- **Boundary:** All new visual rules use `@media screen and (min-width: 1024px)`. Presentation below 1024px, API requests, permissions, validation, financial calculations and workflows are preserved.
- **Verification:** See the central report for the actual build, lint, synthetic-browser and below-desktop regression results. This audit does not claim new live financial or database verification.

The original planned-only sections above are historical stubs. Implemented frontend coverage is listed here and in the central audit; implementation and backend verification status are governed by the current project state and phase records.


## Phone/tablet presentation — 2026-10-12

Phone/tablet catalog, categories and cart use document scrolling; product names and split-payment rows wrap. Sale details use the existing shared Modal below 1024px; sales cancellation uses the shared ConfirmDialog there. Desktop wrappers/confirmation paths and business handlers are preserved.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.

## Treasury balance integrity — 2026-10-15

CR-TREASURY-AVAILABLE-2026-10-15 corrects `apps/api/src/modules/sales/sales.service.ts` account updates. Collections now use SQL `balance = balance + amount`; cancellation refunds use `balance = balance - amount`, inside the existing transaction. This prevents stale read/absolute write lost updates. Existing payment mapping, source-linked append-only movements, refund rules, stock handling and audit events are preserved.

`src/tests/sales-balance.test.ts` reproduced concurrent collection/refund failures before the fix (2 fail / 3 pass), then passed all 5 after the fix. The combined scoped Treasury/sales/maintenance suite passes 35 tests. No historical account repair or financial-policy change is included. See [Treasury investigation](../quality/TREASURY_AVAILABLE_BALANCE.md).
