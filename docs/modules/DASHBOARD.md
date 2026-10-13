# Module: Dashboard

**Status:** IMPLEMENTED — desktop presentation audited; see phase specification for workflow verification
**Last updated:** 2026-10-11

---

## Purpose

Provides management and cashier-facing KPIs, charts, and quick-action shortcuts. Adapts to user permissions.

---

## Current Status

`apps/web/src/modules/dashboard/DashboardPage.tsx` implements the operational dashboard. The desktop audit adapts KPI/chart grids, prevents date controls from squeezing the heading, removes doubled section spacing, and improves text/number readability. Existing data fetching, permissions, timers, return actions and calculations are unchanged.

---

## Business Rules

- KPIs adapt to user permissions
- Revenue, rentals, skate status, late fees, damages displayed
- Quick access buttons to most common operations
- Time filters: today, yesterday, this week, this month, custom

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

## Desktop audit evidence — 2026-10-11

The historical target sections below the current status are not a claim that the implemented frontend is missing. Detailed current behavior and earlier test status remain in the Phase 15/17 specifications. This change closes no phase or backend verification gap.

See [Desktop UI/UX audit](../quality/DESKTOP_UI_UX_AUDIT.md) for route, state and keyboard checks, and mobile-preservation evidence.


## Phone/tablet presentation — 2026-10-12

Phone/tablet date controls, KPI/summary grids, section content and recent-operation tables fit the available sidebar/content width. Tables retain contained horizontal access. Dashboard queries and operational actions are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.

Completion review (2026-10-13): existing table scrollers have Arabic region names and keyboard focus below desktop. Mobile chart/caption foregrounds use approved readable tokens; desktop layout is preserved.
