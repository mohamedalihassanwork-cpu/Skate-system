# Sub-treasury implementation and verification

**Change:** CR-SUB-TREASURY-2026-10-15, approved ST-01–06 on 2026-10-16.
**Current status:** IMPLEMENTED / verification IN PROGRESS; final Git delivery pending.

## Architecture and approved workflow

The original system stored independent named accounts/method mappings and source movements, with opening/closing cash counts but no cashier ownership or manager receipt. Expense routing selected a shared cash account; source posting and closing did not share a transaction lock. The implementation reuses that ledger with persistent cashier assignments. Main cash is an independent transfer account; electronics retain independent mapped balances. See [approved decision](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md) and [Treasury module](../modules/TREASURY.md).

Opening count is recorded/audited without funding. Ledger funds come from manager-authorized/cashier-acknowledged transfers. Close stores immutable count/ledger snapshots and a pending declaration, without moving funds. Separate manager confirmation settles only the latest matching declaration. Rejection/replacement retains original count, explicit reconcile approval records a separate variance adjustment, and zero receipt has no fictitious transfer. Pending amounts remain in their source drawer and never count as main receipts. No self-confirmation is allowed.

## Verification ledger

All results below concern actual commands in this task. Dedicated financial tests use koshk_skate_test serially; migration tests use guarded disposable databases. No development/production data changes or deployment were performed.

| Check | Actual result |
|---|---|
| API TypeScript build | PASS before final concurrency correction; final build pending |
| New lifecycle suite | 23/23 PASS before final concurrency correction; final rerun pending |
| Producer suite first run | 12/17 PASS; two concurrent-retry deadlocks and three fixture failures. Actor lock order corrected; fixture timestamps corrected; rerun pending |
| Corrected0020/0021 fresh/upgrade/partial migration | PASS; see migration runbook for exact fixture preservation and commands |
| Shared test0021 first application | FAILED at overlong foreign-key identifier after partial nontransactional DDL; no completion claimed |
| Guarded shared test recovery | PASS: exactly19 missing statements, canonical journal recorded, all7558 pre-repair rows preserved; subsequent check0 statements |
| Frontend initial build/lint | PASS; final UI summary changes pending rerun |
| Initial synthetic Arabic RTL browser suite | 124 checks PASS; extended summary/administration and legacy regression pending |
| Final diff/document link checks, commit and push | Pending |

Failures are retained here because successful corrected reruns do not erase initial outcomes. In particular no separate fingerprint was taken before the first failed0021 application. The preservation proof covers the pre-repair shared-test snapshot and independent populated-upgrade fixtures, not an invented pre-attempt comparison.

## Scope of changed files

- Schema/migration: payments, treasury and new subtreasury schema, preserved legacy rental indexes, Drizzle configuration/snapshots/journal, repaired0020, new0021 and guarded repair/verification scripts.
- Backend: Treasury routes/service/shared posting, cashier shifts, six source producer paths, own/all expense access, permission seed and app route mount.
- Frontend: managed Treasury workspace, account/funding administration, handover queue/history/detail/summary, shared retry-token utility, scoped sale/damage operation keys and App access gates. Existing disabled-mode Treasury retained.
- Tests: lifecycle, producer integration, synthetic Treasury UI and only the necessary disabled-configuration fixtures in legacy UI harnesses.
- Documentation: approved CR/decision log, Treasury/related module docs, API/database/backend/security architecture, migration and verification records, project map/state and changelog.

## Migration, cutover and remaining operational limits

Migration expands shift/movement precision to DECIMAL(12,2), adds nullable historical links and new financial entities, and leaves managed mode disabled. It never redistributes old amounts, converts opening counts to money, or invents historical handovers. Activation requires no active legacy session, an explicit main cash account and consistent stored/ledger balances. Assignment uses fresh unused zero-balance cash accounts. Run [guarded preflight/repair](SUB_TREASURY_MIGRATION.md) before cutover; MySQL DDL is not transactional.

Real deployment account/cashier identities, any unrecorded initial funds or historical drift resolution require operational evidence and separate approval where they change financial history. Account reassignment/deletion and electronic settlement/fees/holds are outside this scope. OWNER-001/002 remain unresolved globally; required audit applies to this bounded financial implementation. No production execution is authorized.

Synthetic browser fixtures prove rendered Arabic RTL behavior and request contracts, with zero real financial API writes. Database suites prove server behavior independently. These do not constitute a live production browser-to-database acceptance test, physical cash count, cash delivery verification or bank reconciliation. Full repository tests and unrelated historical phase checks are not implicitly claimed by scoped passing results.

## Git and owner work

Proposal `0a05836` was committed/pushed before implementation. Owner approval was recorded before code changes. The owner intentionally removed earlier unrelated rental-receipt/audit-filter edits; cleanup remains intact. Final reviewed logical implementation commit/push is pending. No force push, history reset or deployment is included.
