# Module: Treasury

**Status:** Existing accounts/ledger, shifts and expenses IMPLEMENTED — prior verification remains partial. Recorded-balance change IMPLEMENTED / TESTED / VERIFIED.
**Last updated:** 2026-10-15 (implementation and scoped verification)

## Purpose and current status

Treasury manages financial accounts and traceable collections/payments. The existing page hosts cashier shifts and ordinary expenses. The owner-authorized `CR-TREASURY-AVAILABLE-2026-10-15` adds **الرصيد المتاح المسجل**, the committed ledger balance with account and cash/noncash breakdowns. It is not physically verified cash or electronic settlement certification.

| Area | State |
|---|---|
| Account/method schema, source movements and existing stored-balance API | IMPLEMENTED |
| Shift/expense page | IMPLEMENTED; prior audit evidence retained below |
| Ledger summary API and current-balance display | IMPLEMENTED / TESTED / VERIFIED |
| Sales balance concurrency correction | IMPLEMENTED / TESTED: atomic SQL account increments/decrements |
| Transfers, settlement, opening-funding and reconciliation postings | Not implemented by this CR; owner decisions required |

The [investigation and implementation plan](../quality/TREASURY_AVAILABLE_BALANCE.md) defines authorization, findings, calculation, scope, pending decisions and verification. Earlier Phase 06 upfront-rental descriptions are historical: current rental creation collects no payment; finalization posts collections.

## Current financial model and approved calculation

- Methods map to Treasury accounts; multiple methods may share one account. Every split component remains identifiable and linked to its source.
- Committed inflows add funds; committed outflows reduce them. Invoice amounts, estimates, unpaid charges and pending actions are not additional collections.
- Current ledger movements have no pending/cleared/settled status. Late-fee fields set before final payment are not used as collection evidence.
- Source movements are append-only and traceable. Existing refunds append outflows while retaining original collections.
- The new summary uses a single consistent account/ledger query: per-account `SUM(in) - SUM(out)`, then exact integer-piastre aggregation for totals. API money fields are two-decimal strings.
- Cash/noncash uses `is_cash_drawer`, not method labels. Accounts are summed once, including inactive accounts with visible flags; activity is not a spendability guarantee.
- An account with no movements has recorded balance `0.00` under the current zero-default model. This does not rule out unrecorded opening funds.
- Stored `account.balance` and stored-minus-ledger difference are diagnostics. No historic repair/backfill is authorized.
- Shift opening/actual cash and variances are separate counts, not funding/reconciliation postings; exclude them from the global balance (DEC-072).
- Equal recorded transfer out/in legs net to zero overall. No transfer workflow is introduced.

## Implementation locations

| Area | Path |
|---|---|
| Account/method/ledger schema | `apps/api/src/db/schema/payments.ts` |
| Account reads and ledger summary | `apps/api/src/modules/payments/` |
| Financial posting | Existing rentals, sales, damage, maintenance and expense services |
| Shift counts/variance | `apps/api/src/modules/shifts/` |
| Treasury page | `apps/web/src/modules/treasury/TreasuryPage.tsx` |
| Web summary reads | `apps/web/src/modules/treasury/treasury.api.ts` |
| Route/navigation visibility | `apps/web/src/App.tsx` |

Accounts have names/activity/cash flags and `balance DECIMAL(12,2)` default zero. Movements have account, `amount DECIMAL(10,2)`, direction, reference type/ID, cashier, optional shift and timestamp. No schema migration is planned. Older architecture target field names must not be mistaken for the actual implemented schema.

## APIs and permissions

| Endpoint | Permission | State |
|---|---|---|
| `GET /api/v1/payments/treasury-accounts` | `treasury.view` | Existing all-account/stored-balance contract; unchanged |
| `GET /api/v1/payments/treasury-summary` | `treasury.view` | IMPLEMENTED additive exact ledger summary, account flags, stored-balance diagnostics and read time |

The route/navigation accepts existing `treasury.view` OR `shifts.manage`, preserving shift-only access. Financial summary display/requests require `treasury.view`; shift controls retain `shifts.manage`; expense read/create controls follow `expenses.view`/`expenses.create` independently. All existing backend checks remain; no new permission grants.

The summary refreshes on entry, focus, manual request and successful expense recording. It shows last successful read time, handles stale/error states, and loads independently from shift/expense requests. Existing Arabic RTL tokens and shared components are reused.

## Financial effects and boundaries

Current rental finalization, sale collection and damage collection post inflows. Recorded ordinary expenses, system maintenance payments and existing refunds post outflows. Rental start/estimates, waived/uncollected charges, maintenance completion/cost estimates and external maintenance payment do not add or subtract system funds on their own.

Only sales create/refund account balance writes change: replace unlocked read/calculate/overwrite with atomic SQL `balance +/- amount` inside the existing audited transactions. Mapping, eligibility, ledger history, permissions, refund policy and shift calculations are preserved. Summary reads are not financial events.

## Findings, unknown decisions and verification

The prior page lacked a global balance and sales account writes could lose concurrent updates. The scoped implementation resolves both, and exposes stored-balance drift without inventing historical funds. Pending policy and migration limitations remain in the linked investigation.

Initial funding/imports, historical corrections, electronic settlement/fees/holds, formal reconciliation adjustments, transfers and restricted-funds policy require owner decisions in the [investigation](../quality/TREASURY_AVAILABLE_BALANCE.md#7-business-decisions-remaining-unapproved). OWNER-001 payment consolidation and OWNER-002 audit-failure policy remain pending. F-002 production-reference verification remains deferred.

Verify exact amounts, mapping, refunds/expenses, unpaid exclusions, rollback, concurrent account updates, server permissions and unchanged shifts. Verify Arabic RTL responsive layout and independent loading/empty/error/refresh states. Actual results belong in the [verification record](../quality/TREASURY_AVAILABLE_BALANCE.md#8-verification-plan-and-actual-result-record). Section 9 records the completed scoped checks. Use the dedicated test database. Existing phase and synthetic-UI evidence retain their original limits.

The presentation audit additions below remain historical evidence for their own scope.

## Desktop UI audit ? 2026-10-11

Reviewed active/inactive shifts, opening/closing forms, petty-expense entry and the expense list. Desktop close-shift fields and action wrap without squeezing the native date/time input; opening controls, expense headers and long descriptions remain contained. Shift, expense, amount and permission behavior is unchanged. The current page also uses Phase 12 shift/expense functionality.

Presentation changes apply only to screen widths of at least 1024px. Existing mobile/tablet presentation and print output are preserved. See [Desktop UI/UX Audit](../quality/DESKTOP_UI_UX_AUDIT.md) for consolidated coverage, evidence and verification results.


## Phone/tablet presentation — 2026-10-12

Shift summary/open/close controls and expense rows stack or wrap below desktop, including native datetime input clearance. Treasury calculations and operations are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.

Completion review (2026-10-13): mobile close-shift headings/captions and expense amounts use approved readable foreground tokens. Financial values, validation and submit handlers are unchanged.


## Verification update — 2026-10-15

The scoped recorded-balance feature is IMPLEMENTED / TESTED / VERIFIED: 35 focused API tests, 96 synthetic UI checks across 17 cases, API/web builds and frontend lint pass. See [actual evidence and retained limits](../quality/TREASURY_AVAILABLE_BALANCE.md#9-implemented-changes-and-verified-results), including the test-only schema alignment and unresolved existing migration defect. No physical-cash or electronic-settlement claim.
