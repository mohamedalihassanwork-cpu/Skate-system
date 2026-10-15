# Treasury — Actual Available Balance

**Change request:** `CR-TREASURY-AVAILABLE-2026-10-15`
**Date:** 2026-10-15
**Status:** IMPLEMENTED / TESTED / VERIFIED — scoped results and retained limits in section 9
**Authorization:** The owner's current Treasury change request authorizes the existing-model changes below. Missing financial policies remain unapproved.

## 1. Purpose and authority

Show current funds represented by committed financial movements, with account and cash/noncash breakdowns. Invoice totals, rental estimates, unpaid charges and pending user actions are not collections.

The source hierarchy is the owner's request, approved decisions, master specification, approved architecture, phase specifications and existing verified implementation. Master specification sections 14, 30 and 31 require identifiable split payments, correct account association, current balances and traceable expense deductions. DEC-072 separates counted shift cash from electronic accounts; DEC-074 preserves existing refund and append-only movement behavior. This investigation and scoped plan precede application changes, as required by AI_AGENT_RULES Rule 16.

The label **الرصيد المتاح المسجل** means the net balance represented by committed Treasury movements in this system. It is not a certification of physical cash, cleared bank funds, withdrawable wallet funds or a completed reconciliation.

## 2. Investigated current financial model

| Area | Current representation and behavior | Evidence |
|---|---|---|
| Accounts | `treasury_accounts` has Arabic/English names, `is_active`, `is_cash_drawer` and `balance DECIMAL(12,2)` defaulting to `0.00`. Cash is identified by the account flag, not a method name. | `apps/api/src/db/schema/payments.ts` |
| Methods | Each configured `payment_methods` row maps to one Treasury account; several methods can share an account. The master supports Cash, Card, InstaPay, Vodafone Cash and configured others. Display actual configured accounts. | Payment schema; `payments.service.ts`; master section 14 |
| Ledger | `treasury_movements` stores account, amount, `in`/`out`, source type/ID, cashier, optional shift, notes and timestamp. It has no pending/cleared/settled status. Source writes happen inside financial transactions. | Payment schema and source services |
| Rentals | `startRental()` collects no money. `finalizeRental()` validates split payments, creates rental/late-fee inflows and increments mapped accounts within its transaction. Start estimates/receipts are not collections; issuing the final invoice is not a second inflow. Current cancellation needs no refund because start collects nothing. Historical refund movements remain part of the ledger. | `rentals.service.ts` |
| Late fees | Return handling can set `late_fee_records.collected_fee` before final payment. That field is not evidence of funds arriving; use committed Treasury movements. | Current rental return/finalization flow |
| Sales | Creation persists split components and inflows. Cancellation retains originals and appends refund outflows. Existing audit events are written within the sale/refund transactions. | `sales.service.ts` |
| Damage | Reporting, calculating or waiving a charge does not collect money. `collectCharge()` posts the actual inflow. | `damage.service.ts` |
| Expenses | `recordExpense()` requires an active shift and atomically records expense/outflow, debits the first cash-drawer account and audits the operation. There is no separate pending-expense posting workflow. | `expenses.service.ts`; Phase 12 section 4.4 |
| Maintenance | Estimated cost/completion alone does not spend Treasury funds. `payRecord()` posts a system-account outflow. `payRecordExternal()` records externally paid status without debiting a system account. | `maintenance.service.ts` |
| Shifts | Opening/count/variance fields belong to `cashier_shifts`. Expected cash equals opening cash plus net cash-drawer movements assigned to that shift. Opening/closing does not post account funding or reconciliation adjustments. | `shifts.service.ts`; DEC-072/073 |
| Existing read API | `GET /api/v1/payments/treasury-accounts` returns all accounts, including inactive accounts, with stored balances; it requires `treasury.view`. Preserve this contract. | `payments.routes.ts`, `payments.service.ts` |
| Existing UI access | Treasury page shows shifts and expenses. App route/navigation currently use `shifts.manage`, preventing a Treasury viewer without that permission from reaching a balance view. | `App.tsx`, `TreasuryPage.tsx` |

Balances are summed once per account, regardless of how many methods map to it. Existing EGP currency presentation is retained; there is no new multicurrency or exchange-rate model.

## 3. Findings and disposition

| ID | Finding | Disposition |
|---|---|---|
| TAB-001 | No clear global current balance/account breakdown on the Treasury page. | APPROVED ACTION: read-only summary and display. |
| TAB-002 | Sales create/cancel read a stored account balance without locking it, calculate in JavaScript and overwrite it. Concurrent writes can be lost while movements remain recorded. | APPROVED ACTION: atomic SQL increments/decrements inside existing transactions. |
| TAB-003 | Stored balances may drift from movements. Using only the stored value obscures this; rebuilding it silently invents historical/opening-funds assumptions. | APPROVED ACTION: ledger-derived display plus stored-balance/difference diagnostics. No repair. |
| TAB-004 | Treasury/Payments module stubs and Phase 06 upfront-rental descriptions are stale. | DOCUMENTATION UPDATE: reconcile current modules and preserve historical phase evidence as historical. |
| TAB-005 | Shift counts and pre-finalization fee fields can be mistaken for collected money. | Use movements exclusively; preserve cash-only shift calculations. |
| TAB-006 | No approved settlement, opening-funding, transfer or reconciliation-adjustment workflow. | UNKNOWN / OWNER DECISION REQUIRED; see section 7. |
| TAB-007 | Existing route visibility does not admit a Treasury viewer alone. | APPROVED ACTION: route/navigation allow existing `treasury.view` OR `shifts.manage`; summary remains `treasury.view` only. |
| TAB-008 | F-002 production reference verification and OWNER-001/002 decisions remain open. | Preserve existing status; this change does not close them. |

## 4. Approved calculation and API plan

Add **`GET /api/v1/payments/treasury-summary`**, authenticated and protected by existing **`treasury.view`**. Existing account-list and method contracts remain unchanged.

Use one consistent database query for all accounts and committed movement aggregates:

```text
account recorded balance = SUM(in amounts) - SUM(out amounts)
stored balance difference = stored treasury_accounts.balance - account recorded balance
total = sum(each account recorded balance once)
cash = sum(account recorded balances where is_cash_drawer = true)
noncash = sum(account recorded balances where is_cash_drawer = false)
total = cash + noncash
```

An account with no movements has ledger balance `0.00`. This follows the existing zero-default model; it does not assert there is no unrecorded business opening money. Stored balance/difference are diagnostics, not inferred opening funds.

The response contains read time, names/activity/cash flags, per-account ledger and stored balances/differences, and overall/cash/noncash totals. Monetary fields use exact two-decimal strings. Convert database decimal sums to integer piastres for server aggregation; binary floating-point sums must not determine financial totals.

Include all accounts, including inactive accounts, and display activity explicitly. This preserves the existing list's scope and prevents deactivation silently erasing residual funds. Inactivity does not establish accessibility or restriction.

Do not sum invoices, estimates, unpaid charges, maintenance costs, shift counts, pre-finalization fee fields or uncommitted operations. Do not drop original payments when their source is cancelled: recorded refunds offset them. Pending user actions have no Treasury effect until an existing workflow commits a movement. There is no clearing status from which to infer electronic settlement.

No transfer mutation is introduced. Equal recorded out/in legs between accounts have zero consolidated effect. Testing this arithmetic does not certify an existing transfer workflow or authorize manual production postings.

## 5. Approved interface, permissions and integrity plan

- Show **الرصيد المتاح المسجل**, cash/noncash totals and accounts with existing Arabic RTL tokens, shared Card/Badge/Button/loading/error components and currency presentation.
- Show the last successful read time and manual refresh. Refresh on entry, window focus and successful expense recording. Failed/stale reads must not appear newly verified.
- Keep summary request/loading/error state independent from shifts and expenses, so a shift failure does not hide a valid financial summary or block its refresh.
- Display inactive flags and stored-versus-ledger differences, with concise recorded-funds/settlement/reconciliation explanation.
- App route/navigation accept existing `treasury.view` OR `shifts.manage`, preserving shift-only access. Summary is shown/requested only with `treasury.view`; shift controls use `shifts.manage`; expense reads/create controls use `expenses.view`/`expenses.create` independently. Retain all existing server permissions; do not grant roles new permissions.
- Replace only sales account read/calculate/overwrite paths with SQL `balance = balance + amount` / `balance = balance - amount`. Preserve mapping, eligibility, transaction boundaries, immutable movements and existing audit events.

No schema migration, historical rewrite, new financial mutation, permission grant, dependency, refund policy, shift calculation, transfer workflow or automatic reconciliation is included. Summary reads are not financial events. Existing audited write operations remain audited.

## 6. Implementation sequence and affected paths

1. Save this investigation, formal CR and Treasury/Payments documentation before application changes.
2. Add summary types/service/route in `apps/api/src/modules/payments/`; one query, exact totals and existing server permission.
3. Correct sales account increments/decrements in `apps/api/src/modules/sales/sales.service.ts`.
4. Extend web payments service, Treasury page/styles and existing App route/navigation permission alternatives.
5. Add focused financial/API tests and isolated responsive UI checks; run relevant regressions and builds.
6. Record actual results/limits here, update project state/changelog/map/API docs, review diff and create one logical Git commit. Report push status explicitly.

Exact changed paths and results will be recorded after implementation. This plan is not evidence of completed code or tests.

## 7. Business decisions remaining unapproved

| ID | Owner question | Current boundary |
|---|---|---|
| TAB-OWNER-001 | How should initial funds/imports or historical unrecorded money enter the ledger, with what evidence, dates, permissions and approval? | No balance repair/backfill; do not turn shift openings or drift into new money. |
| TAB-OWNER-002 | Which electronic methods require clearing, settlement, fees or holds, and what proves availability? | Recorded noncash totals only; no invented settlement or withdrawability rule. |
| TAB-OWNER-003 | Who reviews counted-cash discrepancies, and how are approved cash/bank/wallet adjustments posted? | Preserve counts/variances; no physical verification claim or automatic adjustment. |
| TAB-OWNER-004 | What transfer workflow, paired reference, account eligibility and approval/audit rules are required? | No transfer UI/API or synthetic production postings; equal recorded legs net to zero. |
| TAB-OWNER-005 | Does account inactivity mean frozen/closed funds, and how should restrictions/spendability be represented? | Include/flag existing accounts; do not infer accessibility. |
| OWNER-001 (existing) | Centralize payment/active-shift enforcement or retain per-module flows? | No consolidation; sales atomic-update fix does not answer this policy. |
| OWNER-002 (existing) | Must audit failure abort operations or can it be nonblocking? | Preserve existing behavior; no policy change. |

These questions require approval before their respective behaviors are implemented. They do not block the owner-authorized recorded-ledger summary and directly related atomic sales fix. A settled, physically verified or unrestricted balance claim would need applicable decisions and supporting workflows/data first.

## 8. Verification plan and actual result record

The following plan was recorded before implementation. Actual passing results, environment repairs and limitations are recorded in section 9.

| Area | Planned evidence |
|---|---|
| Permissions | 401 unauthenticated; 403 without `treasury.view`; authorized summary reader; unchanged account-list contract; Treasury-view-only and shift-only UI access. |
| Aggregation | Empty/zero state; exact decimal amounts; cash/noncash/account totals; negatives; shared method accounts; inactive residuals. |
| Financial writes | Actual collections affect mapped accounts; expenses/system maintenance decrease totals; refunds offset originals; rejected/rolled-back work has no ledger effect. |
| Uncollected/external | Rental start/estimates and unpaid charges do not change totals; external maintenance does not consume system account money. |
| Diagnostics | Test stored-balance discrepancy is exposed without rewriting accounts or movement history. |
| Transfer arithmetic | Equal test out/in legs preserve consolidated total; no transfer workflow certification. |
| Concurrency/audit | Atomic sales increments/decrements preserve concurrent writes; sale/refund regressions retain transaction/audit behavior. |
| Shifts | Opening/count figures excluded from global totals; cash-only shift semantics preserved. |
| UI | Arabic RTL desktop/phone/tablet; loading/empty/error/refresh states; last-read time; differences; accessible controls; independence from shift errors. |
| Delivery | Relevant API tests/builds, frontend checks, reviewed diff and final Git status with precise environment limitations. |

Tests must use the dedicated test database, never development/demo or production. Synthetic UI checks do not certify live financial persistence. Historical results are not new results for this change. F-002 remains production-deferred; broader phase gaps remain explicit.

## 9. Implemented changes and verified results

**Result:** IMPLEMENTED / TESTED / VERIFIED for this scoped recorded-funds change. Documentation above was saved before implementation; no pending business decision was silently implemented.

- Added the read-only, no-store summary with exact SQL decimal / BigInt aggregation and all-account breakdown. Stored-balance differences remain diagnostic; the existing account-list contract is unchanged.
- Added the independent Arabic RTL balance panel, timestamp, refresh/retry, inactive flags and discrepancy explanation. Financial amounts use explicit LTR isolation; the shared formatter preserves exact two-decimal strings even above Number's safe precision.
- Corrected sales collection/refund updates with atomic SQL arithmetic, retaining existing movements, stock transactions and audit events.
- Preserved shift-only Treasury access and enabled existing treasury.view-only access. Expense controls follow existing server permission names.
- Did not implement opening funding, settlement, restrictions, transfers, reconciliation postings or historical repairs.

| Verification | Actual result |
|---|---|
| Pre-fix sales concurrency reproduction | 2 failing / 3 passing: concurrent collection ledger 30.50 versus stored 10.20; concurrent refund ledger 0.00 versus stored 10.20. |
| Fixed concurrency/rollback suite | 5/5 PASS, including stale-snapshot overlap, split/historical-account mapping, source/audit records and complete rollback. |
| New Treasury API/source-flow suite | 14/14 PASS, including 401/403, viewer without a shift, exact/negative/inactive/zero-account amounts, discrepancy/read immutability, internal-pair neutrality, real sales/refunds, rental start/return exclusion and finalization/rollback, unpaid/external/system-paid maintenance and real expense deduction/audit. |
| Combined financial regressions | 35/35 PASS across treasury.test.ts, sales-balance.test.ts, sales.test.ts and maintenance-payments.test.ts, serially on koshk_skate_test. |
| API / web build | PASS. Existing Vite bundle/dynamic-import and Vitest configuration warnings remain. |
| Frontend lint | PASS, zero errors. Existing repository warnings plus two advisory React effect/ref warnings in TreasuryBalance remain: starting an asynchronous fetch in an effect and intentionally invalidating its request generation during cleanup. |
| Synthetic UI | 96/96 checks PASS across 17 cases; 375x812, 768x1024, 1024x768 and 1440x900. Includes permissions, independent failures, no-shift state, refresh/retry, intercepted expense success, exact huge decimals and LTR money direction. Zero runtime errors/unexpected API endpoints/real business writes. |
| Visual review | Phone and desktop screenshots inspected after correcting negative-sign direction; no clipped balances or horizontal document overflow. |
| Development DB inspection | SELECT only: 5 accounts (1 cash drawer), 28 movements, 0 stored/ledger discrepancies. No amounts/PII exposed and no writes. This verifies local stored/ledger agreement only. |
| Git review | Task files and whitespace reviewed; pre-existing rental/audit work excluded from the feature commit. |

Reproduction commands:

```powershell
npm test --prefix apps/api -- src/tests/treasury.test.ts src/tests/sales-balance.test.ts src/tests/sales.test.ts src/tests/maintenance-payments.test.ts
npm run build --prefix apps/api
npm run build --prefix apps/web
npm run lint --prefix apps/web
# With local Vite serving 127.0.0.1:5173:
python tests/treasury_balance_ui.py
```

Local ignored evidence: `tests/desktop-artifacts/treasury-balance/results.json` and viewport screenshots. Browser results use synthetic financial data; persistent financial assertions use the dedicated test database.

### Verification environment and retained limits

The first Treasury run passed 13/14; its real rental-flow case failed because koshk_skate_test lacked the current multi-skate schema. Existing migration `0020_multi_skate_rentals.sql` is absent from the migration journal, tries to add an already-existing `started_at`, and omits `late_fee_records.rental_item_id`. It was not run blindly or represented as repaired.

A reviewed local helper, `tmp/treasury-change/align-test-schema.cjs`, applied 15 schema-only, non-destructive DDL statements to **koshk_skate_test only**, guarded by exact database-name checks. It created the existing-source item structures/links and made legacy rental fields nullable; it performed no historical backfill, DROP, reset or financial DML. Before/after checks preserved all 159 existing rental row values, financial row counts/totals and the 20-entry migration journal. The full focused suite then passed. This local test-schema alignment is not a source migration, a production change or proof of a working fresh-database migration path; repair of that pre-existing migration defect remains separate work.

Legacy `payments.test.ts` still assumes upfront single-skate rental collection. Its outdated assumptions were identified by inspection; it was not run or counted as current passing coverage. Broader phase suites, production F-002, audit-failure policy, full physical reconciliation and settlement validation remain outside the verified claims. Existing expense-list captions still imply current-shift filtering while the API returns all expenses; this unrelated behavior remains documented, not silently changed.

### Affected files

| Area | Files |
|---|---|
| API | `apps/api/src/modules/payments/payments.service.ts`, `payments.routes.ts`, `payments.types.ts`; `apps/api/src/modules/sales/sales.service.ts` |
| API tests | `apps/api/src/tests/treasury.test.ts`, `sales-balance.test.ts` |
| Web | `apps/web/src/App.tsx`; `apps/web/src/modules/treasury/TreasuryPage.tsx`, `treasury.api.ts`, `TreasuryBalance.tsx`, `treasury-balance.css`; `apps/web/src/utils/currency.ts` |
| Browser tests | `tests/treasury_balance_ui.py`, `tests/desktop_ui_audit.py` (summary fixture only) |
| Documentation | This report; `docs/decisions/DECISION_LOG.md`; `docs/modules/TREASURY.md`, `PAYMENTS.md`, `SALES_POS.md`; `docs/architecture/API_ARCHITECTURE.md`, `DATABASE_ARCHITECTURE.md`; `docs/PROJECT_STATE.md`, `PROJECT_MAP.md`, `CHANGELOG.md` |

Delivery is recorded in the logical feature commit `fix(treasury): show recorded available balances`; the final task report gives its exact hash and push status. No deployment was performed.
