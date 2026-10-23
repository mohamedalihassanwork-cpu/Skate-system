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


## Phone/tablet presentation — 2026-10-12

All 11 report destinations remain visible in a wrapping phone/tablet navigation grid. Date/export controls, KPIs, financial panels and charts fit with document scrolling. Export failure feedback uses the shared Toast below desktop. Report data interpretation and export logic are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.


## Approved sub-treasury integration — 2026-10-16

The additive Treasury summary (/api/v1/treasury/summary) and paginated handover history report pending/rejected latest declarations separately from completed recorded receipts, zero acknowledgments and signed approved adjustments. Own/all handover permissions apply. Existing Reports/dashboard revenue and expense whitelists exclude treasury_transfer and treasury_variance: internal transfers never inflate operating totals and pending handovers never count as manager receipts. Adjustment accounting classification remains outside ST scope.

Authority: [ST-01–06](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). Current workflow: [Treasury](TREASURY.md). Executed checks and limits: [verification report](../quality/SUB_TREASURY_VERIFICATION.md). Earlier proposal/pending wording is historical and superseded only within this approved scope.
