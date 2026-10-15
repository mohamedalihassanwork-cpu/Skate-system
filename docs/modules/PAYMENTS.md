# Module: Payments

**Status:** IMPLEMENTED — prior verification remains partial. Treasury summary addition IMPLEMENTED / TESTED / VERIFIED.
**Last updated:** 2026-10-15 (current payment flow reconciled for Treasury available-balance CR)

## Purpose and current behavior

Payment methods, Treasury accounts, rental/sale payment components and source-linked movements are implemented. Posting stays within each business module's transaction; there is no standalone payment-create endpoint.

Current rentals collect no money at creation. `finalizeRental()` validates split payments after return, records rental/late-fee inflows and updates mapped accounts. Start receipts/estimates are not collected funds. Phase 06's upfront-payment narrative is historical. Fields such as `late_fee_records.collected_fee` set before finalization are not used as Treasury collection evidence.

Sales collect in `createSale()` and refund through existing `cancelSale()`. Damage collection and system maintenance payment have their own guarded operations. Ordinary expenses debit the existing cash-drawer path; external maintenance payments do not spend a system account.

## Business rules

- Split-payment components stay individually identifiable and linked to the same business operation.
- Each configured method maps to an account. Supported master-spec methods include Cash, Card, InstaPay, Vodafone Cash and configured others; actual configured accounts govern balances.
- Multiple methods sharing an account must not duplicate its balance.
- Collected payments update the appropriate account and create source-linked movements within the operation's transaction.
- Financial history remains append-only. Refunds retain original collections and add outflows under existing policies.
- The movement schema has no pending/clearing/settlement state. An estimate, invoice or uncollected charge is not a second collection.
- Shift opening/count/variance figures are separate from Treasury funds. Recorded noncash money is not automatically evidence of settlement/withdrawability.

## Implementation locations and database

| Area | Path |
|---|---|
| Method/account reads and ledger summary | `apps/api/src/modules/payments/` |
| Core account/method/rental-payment/movement schema | `apps/api/src/db/schema/payments.ts` |
| Sale components | Sales schema `sale_payments` |
| Financial writes | Existing rental, sale, damage, maintenance and expense services |
| Web summary reads | `apps/web/src/modules/treasury/treasury.api.ts` |
| Summary display | `apps/web/src/modules/treasury/TreasuryPage.tsx` |

Accounts default to zero. Movements preserve source/cashier/shift references. No migration or historical data rewrite is planned.

The directly related sales fix replaces unlocked stored-balance read/calculate/overwrite with atomic SQL increments/decrements inside existing audited transactions. Implemented and verified under `CR-TREASURY-AVAILABLE-2026-10-15`.

## APIs and permissions

| Endpoint | Permission | State |
|---|---|---|
| `GET /api/v1/payments/methods` | `rentals.create` | Existing active-method API; unchanged |
| `GET /api/v1/payments/treasury-accounts` | `treasury.view` | Existing all-account API/stored balances; unchanged |
| `GET /api/v1/payments/treasury-summary` | `treasury.view` | IMPLEMENTED / TESTED additive read-only API |

The summary uses one consistent account/ledger query: inflows minus outflows per account, with exact integer-piastre aggregation for overall/cash/noncash totals. Monetary fields return decimal strings. Account activity/cash flags, stored balances/differences and read time make the result inspectable. All accounts, including inactive accounts, remain included/flagged; inactivity does not determine fund accessibility.

Backend authentication/permissions remain enforced. Collection/refund permissions remain within source modules. App Treasury route/navigation will admit existing `treasury.view` OR `shifts.manage`, while summary, shift and expense controls independently follow their existing respective permissions. No roles receive new grants.

See [Treasury](TREASURY.md) and the [detailed change plan](../quality/TREASURY_AVAILABLE_BALANCE.md).

## Gaps and owner decisions

Sales create/refund can lose concurrent stored-balance updates; the atomic SQL fix addresses that mechanism. Summary diagnostics expose historical stored-versus-ledger drift without correcting history.

OWNER-001 payment consolidation and OWNER-002 audit-failure policy remain pending. F-002 production-reference verification stays deferred. Electronic settlement/fees/holds, initial funding/imports, balance repair, reconciliation adjustments, account restrictions and transfers require the owner decisions recorded in the Treasury investigation. They are not invented by the recorded-balance summary.

## Verification

Existing API tests are in `apps/api/src/tests/`. Historical Phase 06 counts describe their original execution, not a current run. Focused exact aggregation, permission, rollback, financial regression and concurrent-sales checks pass; see the actual scoped results in the linked report. Preserve mapping, immutable source records, transactions/audit behavior and cash-only shift semantics.

Current results and limitations will be recorded in [Treasury verification](../quality/TREASURY_AVAILABLE_BALANCE.md#8-verification-plan-and-actual-result-record); no passing tests are claimed by this pre-implementation document. Related modules are Treasury, Rentals, Sales POS, Damage, Maintenance, Expenses, Cashier Shifts, Audit Log and Reports.

The presentation audit below remains historical evidence for its own frontend scope.

## Phone/tablet presentation — 2026-10-12

Sales and rental payment controls reflow below desktop and receive readable touch targets and accessible names. Payment methods, amounts, split-payment state and submission payloads are unchanged; no live transaction was submitted during UI checks.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.


## Verification update — 2026-10-15

The scoped recorded-balance feature is IMPLEMENTED / TESTED / VERIFIED: 35 focused API tests, 96 synthetic UI checks across 17 cases, API/web builds and frontend lint pass. See [actual evidence and retained limits](../quality/TREASURY_AVAILABLE_BALANCE.md#9-implemented-changes-and-verified-results), including the test-only schema alignment and unresolved existing migration defect. No physical-cash or electronic-settlement claim.

## Independent sub-treasury proposal — 2026-10-15

[CR-SUB-TREASURY-2026-10-15](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md) records current routing and all six financial producers. Proposed assigned-cash routing, acting-cashier refund funding, locked shift checks and exact close/transfer money require the documented decisions before implementation. Current electronics mappings, source history and uncollected exclusions remain authoritative. No code or permission is changed in this documentation stage.

Clarification of earlier wording: the scoped sales atomic-balance fix is already implemented (not a remaining current lost-update finding); App Treasury access already admits treasury.view OR shifts.manage. Earlier future-tense verification wording describes that prior plan; its actual results are in the verification update above.
