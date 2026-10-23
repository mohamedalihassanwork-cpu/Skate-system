# Module: Treasury

**Status:** Approved sub-treasury workflow IMPLEMENTED; current verification and delivery status are recorded in [the verification report](../quality/SUB_TREASURY_VERIFICATION.md).
**Last updated:** 2026-10-16

## Authority and architecture

[CR-SUB-TREASURY-2026-10-15](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md), ST-01–06, approved 2026-10-16, governs this independent change. Opening cash is explicitly **count only; ledger funds come from recorded transfers**. Earlier Treasury available-balance and presentation audit records retain their own historical scope.

The existing modular monolith uses MySQL/InnoDB, Express/TypeScript, Drizzle/mysql2 and React. Previously methods mapped globally to accounts, shifts had counts without custody/receipt records, expenses selected the first cash account, and closing could race posting. The approved model extends those accounts and movements instead of creating a second ledger.

Every account is independent: main cash, persistent assigned cashier drawers and configured electronic accounts. Main cash is a receiving/funding account, never a parent balance containing drawer funds. One cashier owns one drawer; ownership is persistent and historical assignments are not reused. No terminal/branch structure is inferred. Cash collections and payments route to the acting cashier's active assigned drawer. Electronic payment methods retain their configured accounts. Split components and actual posting account snapshots remain traceable.

## Count, session and handover

1. Administration creates independent zero-balance accounts, assigns fresh unused cash drawers and explicitly selects main cash for activation. No opening count creates money.
2. A manager authorizes funding; the cashier separately acknowledges receipt. Authorization alone neither reserves nor transfers funds. Acceptance rechecks available main funds and atomically records both legs. Pre-opening acceptance is included in the later opening ledger snapshot; accepted session top-ups count once as subsequent movements.
3. Opening stores cashier-entered count, recorded ledger snapshot, cashier, server time and Africa/Cairo business date. Expected count = opening count + subsequent signed drawer movements. Ledger due = opening ledger snapshot + those movements. Electronics do not affect expected cash.
4. Closing stores original actual count, full declared handover, expected count, ledger due, count variance, reason, actor and server time. Count must equal original full declaration. Closing creates a pending attempt and no financial movement. The closed drawer cannot reopen, spend or accept funding before settlement.
5. Manager reviews snapshots, movements and attempts. Received amount must equal the latest declaration. Rejection needs a reason and changes no balance; cashier supplies a new linked declaration without changing original counts.
6. Manager confirmation requires a different user. Adjustment = received amount − ledger due. A nonzero adjustment needs explicit `treasury.reconcile` acknowledgment and reason, recorded separately from confirmation. Adjustment, paired transfer, account deltas, settlement, status and audit commit together. The drawer ends at zero; main increases only by received amount.
7. Zero is recorded as `zero_acknowledged` with no fictitious transfer. A total shortage still requires an approved adjustment. Count variance and approved settlement adjustment are distinct historical facts.

| Entity | States | Balance effect |
|---|---|---|
| Session | active → closed | Opening/closing counts do not post money |
| Handover attempt | pending → rejected / confirmed / zero_acknowledged | Pending/rejected posts nothing |
| Funding | pending → accepted / cancelled | Only acceptance posts paired legs |
| Transfer | completed | Equal out/in legs; net zero across accounts |
| Settlement | one per session and accepted attempt | Separate signed variance, then actual receipt transfer if positive |

Cash refunds use the performing cashier's funded drawer; electronic refunds retain the original recorded account. New drawers cannot overdraw or silently fall back to main/another cashier. Insufficient funding fails atomically. Recorded balances and receipt acknowledgments do not certify physically counted funds or bank settlement.

## Integrity and access

- Exact decimal strings/integer piastres; source pricing and legacy tolerances remain scoped to their existing modules.
- Shared config and user/session locks serialize activation, opening, posting and closing. Sorted account locks and unique transfer-leg/session-settlement/active-session constraints prevent duplicate state.
- Persisted actor/scope/operation keys return the original result for identical retries and reject a changed payload. New Treasury writes always require a key; existing producer/open/close calls require it after activation. Browser keys survive retries/reload and are cleared only after success.
- Required financial audit failures roll back the transaction. Unrelated global audit policy remains OWNER-002, outside this CR.
- Multi-read Treasury views use a consistent read-only snapshot. Ledger/stored drift is shown and prevents financial settlement; no automatic historical correction is made.

| Permission | Scope |
|---|---|
| treasury.view | All independent account balances and movements |
| treasury.view_own or shifts.manage | Own drawer, funding acknowledgment, handovers and summary |
| treasury.assign | Create account, assign drawer, configure activation |
| treasury.fund | Authorize/cancel funding and view funding requests |
| treasury.handovers.view | All cashier handovers, details and aggregate summary |
| treasury.handovers.confirm | Confirm/reject; does not independently grant all-history reads |
| treasury.reconcile | Explicit variance approval, additionally requiring confirmation rights |
| shifts.view / shifts.view_all | Own / all session history |
| expenses.view / expenses.view_all | Own / all expense history |

All checks are server-side; there is no Administrator-name bypass. Self-confirmation and authorizing/accepting one's own funding are forbidden even with every permission. Migration grants new management rights to existing treasury.manage roles and the Administrator system role, and own access to shifts.manage roles; custom roles remain permission-based.

## Reports and UI

The Arabic RTL workspace provides own balance/counts/movements, opening/closing, funding acknowledgment, manager queue/detail/rejection/confirmation, paginated historical attempts, and account administration. Manager confirmation includes an explicit recorded-receipt acknowledgment. All accounts display independent balances.

`GET /api/v1/treasury/summary` reports all-time latest pending/rejected declaration counts and amounts, positive completed receipt count, zero-acknowledgment count, recorded receipt total and signed approved adjustment total. Replaced rejected attempts do not inflate outstanding amounts. Summary scope matches handover history. These figures are not added to account balances. Operating reports/dashboard continue to whitelist actual revenue/expense sources, excluding internal transfers and variance adjustments. Classification of variances into income/expense remains outside the approved scope.

Existing `GET /payments/treasury-summary` remains the recorded all-account balance, cash/noncash breakdown and drift diagnostics. Pending handovers remain in the source drawer, with no main credit. Treasury reads are not financial events.

## Implementation and cutover

Core locations: `apps/api/src/modules/treasury/{treasury.service,treasury-posting,treasury.routes}.ts`, `db/schema/subtreasury.ts`, existing payments/treasury schema, and `apps/web/src/modules/treasury/`. Producers: rentals, sales/refunds, damage, expenses and system maintenance. See [API architecture](../architecture/API_ARCHITECTURE.md) and [project map](../PROJECT_MAP.md).

Migration 0021 adds nullable historical links, assignment/session snapshots, funding, handovers, transfers, settlements, idempotency and permission records. Existing amounts are preserved while movement/shift precision expands to DECIMAL(12,2). Feature defaults disabled. Close legacy active shifts before activation; ensure stored/ledger agreement, explicitly select main account and assign drawers. No old money is redistributed, no old opening count becomes funding, and no historical handover is inferred. Initial unrecorded funds/historical repairs require separate evidence and owner authorization. Follow the [guarded 0020/0021 runbook](../quality/SUB_TREASURY_MIGRATION.md); MySQL DDL is not transactional and partially applied migrations must not be blindly rerun.

Account reassignment/deletion, electronic settlement/fees/holds and production configuration/deployment are not included. [Actual checks and limitations](../quality/SUB_TREASURY_VERIFICATION.md) govern completion claims.
