# Module: Cashier Shifts

**Status:** Approved managed-session workflow IMPLEMENTED; [verification status](../quality/SUB_TREASURY_VERIFICATION.md).
**Last updated:** 2026-10-16

## Current behavior

[ST-01–06](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md) supersede the prior sub-treasury proposal. `apps/api/src/modules/shifts/` uses shared financial transactions and actor/session locking. One active shift per cashier is enforced by serialization, plus a generated unique managed-active-cashier column; old historical duplicates are not silently altered. Duplicate legacy active sessions block operations pending review.

Opening stores the cashier's declared count separately from the account's ledger snapshot. It never creates money. Expected counted cash = opening count + subsequent signed drawer movements. Ledger due = opening ledger + those movements. Funding accepted before opening is already in the snapshot; session top-ups count exactly once. Electronics are independent and excluded from cash count variance. Opening count-versus-ledger mismatch is retained/audited without a funding or adjustment posting.

Closing requires exact ownership and active state, nonnegative actual count/full declaration, and a reason for discrepancy. It records immutable snapshots, server closing time, closedBy and a pending handover in one transaction; no transfer occurs. Managed sessions reject caller-supplied closing time. Africa/Cairo business date remains the opening date through overnight work. All financial producers hold the common shift guard through commit so closing cannot omit a concurrent committed movement.

A closed drawer remains frozen until manager settlement. Rejection and replacement preserve original count/difference; zero receipt is acknowledged without a transfer. Read [Treasury](TREASURY.md) for confirmation, variance and two-user rules.

## API and permissions

| Route | Server scope |
|---|---|
| GET /api/v1/shifts/current | Authenticated user's active session |
| POST /api/v1/shifts/open | shifts.manage; own session |
| POST /api/v1/shifts/:id/close | shifts.manage plus exact ownership |
| GET /api/v1/shifts | shifts.view: own; shifts.view_all: all |

Managed open/close requires a stable operationKey. Treasury own/detail endpoints return decimal-string snapshots and histories. Existing shift DTO numeric fields are retained for compatibility; new ledger snapshot fields are additive. Required financial audits are transaction-critical.

## Historical compatibility and evidence

Migration leaves old account/assignment/ledger links null, preserving counts and movements. Legacy sessions close through their prior cash-count flow before explicit activation; no old closure becomes a receipt. Legacy caller closing times remain supported. New cashier drawers start zero and obtain funds through recorded transfers.

The lifecycle and producer suites cover exact money, ownership, concurrent opens/confirmations/close-versus-sale, funding, count-only opening, rejection/replacement, shortages/overages, zero receipt and rollback. UI uses the existing Arabic RTL design system with desktop/mobile checks. Exact executed counts and remaining limits are in the [verification report](../quality/SUB_TREASURY_VERIFICATION.md); older Phase12/presentation tests remain historical evidence only.
