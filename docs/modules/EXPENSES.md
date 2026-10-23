# Module: Expenses

**Status:** IMPLEMENTED with approved sub-treasury routing and own/all access; [verification status](../quality/SUB_TREASURY_VERIFICATION.md).
**Last updated:** 2026-10-16

Ordinary expenses remain in `apps/api/src/modules/expenses/` and `db/schema/treasury.ts`, entered from the Treasury workspace. POST `/api/v1/expenses` requires `expenses.create` and the acting user's active shift. In managed mode the expense debits that cashier's assigned drawer, checks sufficient recorded funds and posts source row, movement, balance delta and required audit atomically. The shared actor/session guard serializes with closing. Stable operationKey prevents duplicate retries. With the feature disabled, legacy first-cash-drawer routing is retained for cutover.

GET `/api/v1/expenses` requires `expenses.view` for own history or `expenses.view_all` for all history. These scopes are enforced server-side under approved ST-05. The legacy UI accepts either read permission; managed workspace exposes source-linked expense movements. Labels do not imply an unimplemented current-shift filter.

Amount, description, optional category, cashier, shift and source linkage are retained. No attachment upload, arbitrary account selection or category administration is added. System maintenance keeps its separate method/account payment flow. No historical expense is rewritten.

[Approved Treasury workflow](TREASURY.md) describes funding, active/closed drawer restrictions, permissions, audit and reconciliation. [Actual financial and UI verification](../quality/SUB_TREASURY_VERIFICATION.md) replaces the prior pending-proposal status without implying a new physical cash count.
