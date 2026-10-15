# Module: Expenses

**Status:** IMPLEMENTED; verification remains partial. Sub-treasury routing/access proposal PENDING owner decisions.
**Last updated:** 2026-10-15 — current-state reconciliation for CR-SUB-TREASURY-2026-10-15.

## Current implementation

Ordinary expenses are implemented in `apps/api/src/modules/expenses/`, `apps/api/src/db/schema/treasury.ts`, and the web Treasury page. The previous PLANNED/NOT IMPLEMENTED stub was stale.

`recordExpense()` requires the acting user's active shift, creates the expense, selects the first account with `is_cash_drawer=true`, creates an expense outflow, applies an atomic balance decrement and calls the audit helper in one transaction. The shift lookup is not locked; no sufficient-funds guard exists. Account selection is global, not cashier-owned. Category ID is optional; the current expense schema has amount, description, cashier, shift and created time. Receipt upload, arbitrary payment-account selection and category administration are not implemented by this service.

| Route | Current permission and scope |
|---|---|
| POST /api/v1/expenses | expenses.create; acting user requires an active shift |
| GET /api/v1/expenses | expenses.view; all expenses, no ownership/shift filter |

Cashier receives both permissions in seed. Treasury's current-shift captions do not establish server filtering. System maintenance payments use their separate method/account flow; they are not ordinary expense rows.

## Proposed sub-treasury integration

[CR-SUB-TREASURY-2026-10-15](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md) proposes acting-cashier drawer routing, shared shift serialization, nonnegative drawer funds and own/all history scopes. These business changes require ST-01/02/04/05 approval. Merely adding more cash accounts while retaining LIMIT 1 would route money incorrectly.

Preserve expense source linkage and atomic ledger deltas. New/touched financial audit must be awaited and transaction-critical. Historical expense and movement rows remain unchanged; no receipt or other unrelated expense feature is added.

## Verification

Existing Treasury tests cover real expense deduction/audit in the shared-account baseline; they do not verify cashier drawer routing. New two-cashier, balance sufficiency, close-versus-expense, rollback and direct ownership tests are required after approval. No financial tests or database writes were performed for this documentation correction.

## Phone/tablet presentation — 2026-10-12

Expense forms and list rows fit phone/tablet layouts with shared control sizing and wrapped actions. Expense recording, categories and treasury effects are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.
