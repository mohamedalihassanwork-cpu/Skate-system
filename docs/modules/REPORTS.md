# Module: Reports

**Status:** IMPLEMENTED ? PARTIALLY VERIFIED (see phase specification)
**Last updated:** 2026-10-11 (desktop UI audit)

---

## Purpose

Provides management and operational reporting across all business areas.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Reports are read-only
- Support date range filters
- PDF, Excel, CSV, Print export
- Operating result NOT labeled Net Profit unless full accounting implemented
- Available reports: overview, revenue, rentals, skate performance, late returns, damage, maintenance, expenses, customers, cashiers, operating result

---

## Frontend

**Implemented page:** `apps/web/src/modules/reports/ReportsPage.tsx`

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

Reviewed all 11 tabs, charts, date controls, exports and list/empty/loading/error states. Desktop report panes now use page scrolling, a sticky secondary navigation column, shrinkable charts and KPI cards, wrapping controls and readable operating-result contrast. The existing generic-list field-formatting heuristic and native export alerts remain outside this layout-only change.

Presentation changes apply only to screen widths of at least 1024px. Existing mobile/tablet presentation and print output are preserved. See [Desktop UI/UX Audit](../quality/DESKTOP_UI_UX_AUDIT.md) for consolidated coverage, evidence and verification results.
