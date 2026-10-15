# Module: Cashier Shifts

**Status:** IMPLEMENTED; verification remains partial. Sub-treasury/handover proposal PENDING owner decisions, not implemented.
**Last updated:** 2026-10-15 — current-state reconciliation for CR-SUB-TREASURY-2026-10-15.

## Current implementation

Cashier shifts are implemented in `apps/api/src/modules/shifts/` and `apps/api/src/db/schema/treasury.ts`. TreasuryPage hosts the current shift and open/close forms. The previous PLANNED/NOT IMPLEMENTED stub was stale; this correction does not claim new runtime verification.

- `openShift()` checks for an existing active shift and inserts opening cash, with an OPEN_SHIFT audit call. The check lacks a serialization lock/database unique guard, so concurrent opening is a known gap.
- `closeShift()` locks the shift, checks exact cashier ownership and active status, calculates cash expected/count/difference, then stores closed status and emits CLOSE_SHIFT. Closing creates no ledger transfer.
- Opening/actual are physical cash counts, not funding. Expected = opening + cash inflows - cash outflows, selected by shift ID and account cash flag. Electronics are excluded from variance. Current calculation uses floating-point numbers.
- Cashier can close with shortage/overage under DEC-073. Optional supplied closing time is validated only against opening; future times are not excluded.
- Current schema stores cashier, opening/closing timestamps, opening/expected/actual/difference, status and notes. It has no treasury assignment, explicit opened_by/closed_by, handover, receiver or confirmation record.

## Current APIs and permissions

| Route | Current check and scope |
|---|---|
| GET /api/v1/shifts/current | Authenticated user, own active shift |
| POST /api/v1/shifts/open | shifts.manage; own shift |
| POST /api/v1/shifts/:id/close | shifts.manage plus exact ownership |
| GET /api/v1/shifts | shifts.view; currently all users' shifts |

Seeded Cashier has shifts.view as well as shifts.manage; the history endpoint is not manager-only. Current UI does not provide closed-shift review. DEC-071–074 remain authoritative: one active shift per user, cash-only counts, permitted own closing with variance and current-shift refund attribution.

## Gaps and proposed change

[CR-SUB-TREASURY-2026-10-15](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md) documents the source investigation, distinct closing/pending/confirmed workflow, proposed assignment/funding/variance rules, permission migration, APIs, concurrency controls and history-preserving cutover. All ST-01–06 choices remain PENDING. No behavior, schema or permission is changed by this document.

Required integration: all financial producers must hold the same shift guard through posting so close cannot omit an in-flight movement. Required audit must persist atomically; the current shared helper can swallow failures. Counted cash, handover declaration and manager receipt must be separate evidence. Legacy opening counts cannot be converted into funds.

## Verification

No dedicated current shift lifecycle/close-versus-posting/handover suite exists. Existing F-013 evidence tests opening authorization; it must not be represented as complete close authorization/lifecycle coverage. Prior Phase 12 results are historical. Planned exact-money, ownership, concurrent open/close, financial routing, audit rollback and Arabic RTL checks are in the CR. No tests were run for this documentation reconciliation.

## Phone/tablet presentation — 2026-10-12

Phone/tablet open/close shift controls and summaries reflow within the existing treasury screen. The shift workflow, expected/count balances and server operations are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.
