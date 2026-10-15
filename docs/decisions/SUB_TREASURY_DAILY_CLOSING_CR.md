# Sub-Treasury Management and Cashier Daily Closing

**CR:** CR-SUB-TREASURY-2026-10-15
**Status:** PROPOSED / DOCUMENTED — owner decisions PENDING; NOT IMPLEMENTED
**Date:** 2026-10-15
**Baseline:** `a0f157f`, branch `master`, plus unrelated uncommitted rental-receipt/audit-filter work.

## 1. Authorization and scope

This is an independent change request. The owner authorizes separate cashier funds, daily closing, pending handover, manager confirmation, server-side access controls, atomic financial effects and complete audit history. Closing alone must never credit the main treasury or assert receipt.

This document completes investigation and presents a concrete proposal. Recommendations below are **not approved business rules**. No implementation, permission grant, schema migration or financial-data change is performed in this stage.

Governance: [source hierarchy](../00-governance/SOURCE_OF_TRUTH.md), [agent rules](../00-governance/AI_AGENT_RULES.md) Rules 4, 5, 11, 16, 20, [change process](../00-governance/CHANGE_REQUEST_PROCESS.md), [verification rules](../quality/VERIFICATION_RULES.md). The current owner request also explicitly requires approval of unresolved business decisions before implementation.

## 2. Current architecture and gaps

Evidence is source inspection, not new runtime verification. Code paths below are relative to `apps/api/src/` unless stated otherwise.

| Area | Current implementation | Gap |
|---|---|---|
| Architecture | Single-store modular monolith, Express/TypeScript, React, Drizzle/mysql2 and MySQL/InnoDB. | No branch or POS-terminal ownership model supports assuming a terminal-based drawer. |
| Accounts | `db/schema/payments.ts:14`: names, activity, cash flag and stored `balance DECIMAL(12,2)`. Methods map globally to accounts. | No main/sub classification, cashier ownership, assignment or custody lifecycle. Seeded Main Cash is a name, not a structural role. |
| Ledger | `db/schema/payments.ts:55`: `amount DECIMAL(10,2)`, in/out, source type/nullable ID, cashier, optional shift, timestamp. | No transfer entity, paired-leg constraint, handover status or request idempotency. |
| Summary | `modules/payments/payments.service.ts:52`: consistent SQL account/ledger query, exact decimal-string/BigInt totals, stored-versus-ledger diagnostics. | No own drawer/held funds/main breakdown. Pending handovers must remain outside movements. |
| Shifts | `db/schema/treasury.ts:11`; `modules/shifts/shifts.service.ts:59,107,151`: active/closed, opening/expected/actual/difference, cashier/times. | No assigned account, handover or receiver. Opening count is not a ledger funding transaction. |
| Concurrency | `shifts.service.ts:59–84`: unprotected check then insert; close locks shift at 153. | No active-shift unique constraint; financial producers do not hold the same shift lock through posting. |
| Closing | Own-shift check; cash-only calculation using floating-point arithmetic; audited active-to-closed update. Optional supplied time can be in the future. | No first-class closing actor field, immutable server event time, pending declaration or manager receipt. |
| RBAC | Exact DB permission checks, no hardcoded Administrator bypass. Cashier has shifts.view/manage and expenses.view/create, but no treasury.view. | GET shifts and expenses return all users' records. Existing shifts.view is not manager-only. |
| Audit | `modules/audit/audit.service.ts` accepts transaction context but catches insert failures; one maintenance audit call is not awaited. | New/touched financial transactions must fail if required audit cannot persist. Global OWNER-002 remains unresolved. |
| UI | `apps/web/src/modules/treasury/TreasuryPage.tsx`: current shift, open/close, global expense list, authorized recorded summary. | No closed-shift review, cashier movements or handover queue. Expense captions imply current-shift filtering that API does not perform. |
| Reports | `modules/reports/reports.service.ts` uses income/expense source-type whitelists and cashier/shift aggregates. | No handover status or transfer report. Internal transfers must remain outside operating income/expense. |

### Financial write paths

| Operation | Current flow | Required integration |
|---|---|---|
| Rental start/return | Current multi-skate start, item return, extension and unpaid cancellation do not post funds. | Preserve estimates/waivers as noncollections. |
| Rental finalization | `modules/rentals/rentals.service.ts:1150–1324`: current finalizing cashier/shift; mapped accounts; split rent/late-fee inflows, atomic deltas. Shift read before raw mysql2 transaction. | Resolve cash account and hold shift lock inside transaction; retain actual posting account/component evidence. |
| Sales | `modules/sales/sales.service.ts:85–239`: current actor/shift, mapped accounts, sale payment account snapshots, atomic deltas. | Shared transactional routing and duplicate-submission protection. |
| Sale refunds | Same service:259–326: debit original sale payment account, attribute current refund actor/shift. | ST-04 must resolve cross-cashier/after-handover cash source; preserve electronic historical mapping. |
| Damage collections | `modules/damage/damage.service.ts:224–296`: current shift, method account, report lock and atomic inflow. | Hold common shift lock and use assigned cash resolver. Existing partial charges/waivers retained. |
| Ordinary expenses | `modules/expenses/expenses.service.ts:10–68`: active shift and FIRST global `is_cash_drawer=true LIMIT 1`, source/outflow/atomic debit. | Adding drawers alone misroutes expenses. Replace account selection and add approved own/all read scopes. |
| System maintenance | `modules/maintenance/maintenance.service.ts:419–494`: selected payment method determines account; cash needs active shift, noncash does not. | Apply ownership/cash routing and awaited audit; preserve authorized central/noncash paths. |
| External maintenance / reservations | External maintenance and completion/estimates do not spend system funds. No reservation treasury writer exists. | Preserve; do not introduce deposits or additional payment workflows. |

The six producers are rental finalization, sale collection/refund, damage collection, expenses and system maintenance payment. None consistently serializes with close via its shift lock. Current outgoing paths also lack sufficient-funds guards. Exact close/handover money must use decimal strings/piastres; do not silently rewrite unrelated pricing tolerances.

## 3. Reconciliation of documentation and existing decisions

| Source | Treatment |
|---|---|
| Master specification §§30–32 | Establishes accounts, traceable movements and cash variance; does not specify custody, handovers or discrepancy postings. |
| DEC-071 | Retain one active shift per cashier; cashier work needs a shift, administrative work follows its existing distinct requirements. |
| DEC-072 | Retain cash-only expected/count variance and separately visible electronics. Changing cash routing from global mapping needs ST-01. |
| DEC-073 | Cashier already may close with shortage/overage without immediate admin override. This does not authorize receipt or automatic adjustments. |
| DEC-074 | Retain refund history/current-shift attribution. Isolated drawer funding conflicts with current original-account cash refund; ST-04 decides explicitly. |
| Cashier Shifts / Expenses docs | PLANNED stubs contradict implemented code; corrected in this documentation stage. Old expense attachment/category-management claims are targets, not current features. |
| Project Map / database target | Old planned treasury directory and current_balance/movement_type names are targets. Current accounts/ledger are schema/payments.ts, shifts/expenses schema/treasury.ts, web Treasury. Scoped current-state notes take precedence over stale navigation. |
| Phase 06 / legacy payments tests | Upfront single-skate payment assumptions are historical. Current collection is rental finalization; old passing counts cannot certify this CR. |
| OWNER-001 | Described inconsistently as payment consolidation A/B/C and centralized active-shift checks; option definitions are not in the relevant decision log. Proposed shared transactional routing/guard is scoped to this CR, not resolution of the entire old decision. |
| OWNER-002 | Global nonblocking versus mandatory audit remains pending. Existing audit-phase32 test intentionally allows a role mutation to survive audit failure. Strict audit here applies to new/touched financial operations only. |
| TAB-OWNER-001–005 | Earlier funding, settlement, reconciliation, transfer and spendability questions are not collectively approved by this request. This proposal resolves only the selected ST rules below. |

## 4. Owner decisions — all PENDING

The owner may approve the recommended package or replace choices by ID. Account/user identities are configured through administration, not invented in a migration.

| ID | Recommended rule | Alternative / consequence |
|---|---|---|
| **ST-01 Structure and methods** | One persistent cash sub-account per explicitly assigned cashier, with selected main cash parent. Shift snapshots assignment. Cash collections route to that drawer; electronic methods retain central mappings. No shared drawer between cashiers. | Shared POS custody or per-cashier electronics need different assignment/settlement rules. |
| **ST-02 Float and session policy** | Full counted cash handover; no retained float/partial handover. Opening is zero or manager-authorized main-to-sub funding acknowledged by cashier at opening. Active-shift top-ups use the same two-actor authorization/acknowledgment and atomic transfer. Only acknowledgment posts funding. Closed drawer cannot spend, reopen or be reassigned until settled. One active session/user; multiple sequential sessions allowed. Business date is the immutable Africa/Cairo opening date, including overnight sessions; server close time remains separate, with no forced midnight close. | Retained float, partial handover or next shift before receipt require reservations/carryover liabilities. Unrecorded opening cash needs separate initial-funds approval. |
| **ST-03 Discrepancy and rejection** | Own closing remains allowed with any nonnegative declaration; difference requires explanation. Manager enters received amount. If different from latest declaration, reject with reason and obtain a new linked declaration, retaining original close. Actual shortage/overage settlement requires explicit treasury.reconcile approval and reason. The confirming manager may also approve that adjustment when holding both permissions, through a separately recorded acknowledgment; a third user is not required. A distinct signed variance adjustment and actual transfer then commit atomically. No automatic write-off or revenue/expense classification. Zero is acknowledged without fictitious transfer. | Hold all discrepant handovers with no adjustment until a separate reconciliation workflow is approved; this can prevent a new session under ST-02. Owner must choose. |
| **ST-04 Payment and refund source** | Eligible cash collections/payments use acting cashier's assigned active drawer. Cash sale refund uses refunding cashier's funded drawer, retaining original sale/component/account references. Electronic refunds use original recorded account. No new drawer overdrafts or silent fallback to another drawer/main. Insufficient funds fail atomically; explicit funding required first. | Original cashier drawer as refund source needs manager transfer/approval and can block after close. Recommended choice explicitly changes current cash-refund account selection. |
| **ST-05 Rights and actor separation** | Existing shifts.view/expenses.view become own scope; new all-record permissions serve managers. Add own treasury, assignment, funding, handover review/confirmation and reconciliation permissions. Existing treasury.view remains global. No self-confirmation of handovers or both sides of float funding, even for a user granted every permission. Manager is permission-based; no new hardcoded role. | Any emergency same-user exception requires explicit rules. Own/all change tightens seeded Cashier and custom-role history access and requires approval. |
| **ST-06 Cutover and migration** | Forward-only activation: legacy active shifts close using old flow, owner selects main/assignments, verify ledger/stored agreement, new drawers start zero. Preserve all old financial rows, null references and counts. No synthetic historic handovers/adjustments. Prepare repair of existing 0020 migration path as prerequisite; no production execution or historical financial redistribution authorized. | Migrating open shifts/reconstructing old custody requires separately evidenced allocation. Unrecorded main cash requires initial-funding approval before drawer funding. |

Approval of ST-01–06 also approves the bounded implementation in section 6: shared transactional routing/shift guards and mandatory audit rollback for all six touched financial producers plus new closing/funding/handover actions. This satisfies this request’s integrity requirement without resolving global OWNER-001/002 for unrelated operations.

Known unknowns: real physical drawer arrangement, electronics custody, float/retention, shortage/overage authorization and accounting classification, refund funding, same-user exception, business-day policy and operational cutover. The recommendations are reviewable choices, not inferred facts about the business.

## 5. Proposed lifecycle and reconciliation (conditional on approval)

| Record | States | Financial effect |
|---|---|---|
| Shift | active → closed | Immutable closing snapshots only; no reopening/editing. |
| Handover attempt | pending → confirmed OR rejected; replacement is a new linked attempt | Pending/rejection posts nothing. One live attempt and at most one settlement per closing. |
| Transfer | Completed paired transaction uniquely linked to accepted handover/funding | Both ledger legs, deltas, status and audit commit together; no visible partial transfer. |
| Zero-funds acknowledgment | Manager acknowledgment linked to close | No zero transfer legs; shortage adjustment still requires approval when applicable. |
| Funding authorization | pending → accepted/cancelled | Pending does not post/reserve funds; main availability rechecked on cashier acknowledgment. |

1. Manager assigns drawer and authorizes any float. Cashier acknowledgment at opening atomically transfers authorized funding and snapshots ledger-backed opening. Active-shift top-ups are accepted under the same two-actor rule and linked to that active shift. Recheck funds/status inside each transaction; a pending authorization is not spendable. A mismatched opening count blocks opening for review. Counts alone cannot create money.
2. Every eligible producer resolves/locks the active shift and assigned account inside its source transaction. Electronic amounts remain separately attributable to current cashier/shift.
3. Close serializes with producers, calculating exact expected cash `E` from the opening ledger snapshot plus subsequent eligible signed cash movements. Opening funding is already in the snapshot and is excluded from subsequent activity; accepted active-shift top-ups count once. The snapshot records a durable transaction boundary, not a timestamp-only cutoff. Compare with source ledger and stored balance. Data-integrity drift is reported separately from a physical cash discrepancy and prevents settlement until repaired through approved action.
4. Store original counted cash `C`, declared handover `H`, expected `E`, `C-E`, reason, actor and server time. Under full handover `C=H`; retain distinct fields. Close shift and create pending attempt atomically, with no treasury movement. Drawer becomes unavailable under ST-02.
5. Manager reviews original count, current declaration, expected, discrepancy, movements and prior attempts. Reject records actor/time/reason only; cashier submits append-only replacement. Original closing count/variance is never overwritten or presented as recounted.
6. Manager records received `R`, required to equal latest `H`. Exact-match confirmation posts paired transfer for `R`. Real difference needs ST-03 authorization for adjustment `A=R-E`, posted atomically with transfer and all audit events. Recounted handover difference remains separate from original closing variance.
7. Source after settlement is `E+A-R=0`; main increases by `R`; consolidated funds change only by explicit adjustment `A`. Internal transfer itself nets zero. Adjustments appear separately, not in operating revenue/expense without further accounting approval.
8. When `R=0`, record no-funds acknowledgment and no transfer. If expected exceeds zero, settling still needs explicit shortage approval. Zero acknowledgment must not be labeled funds received.

| Expected EGP | Received EGP | Explicit adjustment if approved | Main increase EGP |
|---:|---:|---:|---:|
| 1,000.00 | 1,000.00 | 0.00 | 1,000.00 |
| 1,000.00 | 980.00 | -20.00 shortage | 980.00 |
| 1,000.00 | 1,020.00 | +20.00 overage | 1,020.00 |

A manager confirmation is the responsible user's recorded attestation. Software cannot independently establish that cash was physically counted or delivered.

## 6. Proposed technical design

- Reuse treasury_accounts and ledger. Add role/parent metadata and assignment history (cashier, account, validity, responsible administrator). Enforce one live drawer assignment per cashier and exclusive ownership; do not reuse a historical cashier account for another person.
- Extend new shifts with assignment/account snapshot, business date and closing actor/server time; preserve explicit legacy nullability. Serialize opening through user/assignment lock and database uniqueness. Detect legacy duplicate active shifts before adding constraints.
- Add closing/handover attempts, settlement/transfer, funding authorization and discrepancy approval records with exact amounts, source/destination, reasons, actors, timestamps and immutable replacement links. Add dedicated movement types/transfer-leg links, unique `(transfer_id, leg)` and one settlement per close/accepted funding. Do not overload `other` or fake source IDs.
- Preserve actual posting-account and cash-classification snapshots, including rental components whose schema currently lacks account. Method/account/assignment changes cannot reinterpret historical movements or closed summaries.
- Use transaction-scoped account/shift guard across all six financial producers. Define one consistent lock order across users/assignments, shifts, business sources and ordered accounts; reconcile with existing rental/stock locks and prove controlled concurrency tests. Support raw mysql2 and Drizzle transaction contexts without committing independently.
- Persist idempotency keys scoped to actor/operation for close, confirm, reject, replacement and funding. Same key/payload returns original result, changed payload conflicts. State/unique guards prevent repeated settlement of the same source even under different request keys; confirm versus reject has one outcome. Creation retries for sales/expenses use a stable persisted logical-operation token. Arbitrary new tokens cannot be distinguished from legitimate separate sales/expenses; no semantic deduplication claim is made.
- Source state, movement legs, balance deltas, approval and required audit share transaction/connection. Audit insertion failure rolls back affected financial work. General nonfinancial audit behavior remains outside scope.
- New money contracts use bounded two-decimal strings and exact piastres/SQL DECIMAL. Reject nonfinite, exponent/malformed, negative where invalid, overprecision and overflow. Bound operations by both movement and account capacity; accumulated closing maximum needs explicit validated schema sizing.
- Enforce permission, ownership, active status and actor separation on server; no arbitrary client account/shift override. No post into closed drawer. Inactive assignment/nonzero residual/pending liability/data drift cannot be silently cleared.

### Proposed APIs, permissions and UI

Add `/api/v1/treasury` own account/movement, assignment, funding and handover detail/history/action routes; finalize exact payloads after approval. Extend existing shift open/close with versioned validated contracts; old clients must not bypass declaration/new routing after cutover.

| Capability | Proposed permission/scope |
|---|---|
| Own drawer/movements/handovers | treasury.view_own plus ownership |
| Own shift open/close | Existing shifts.manage plus assignment/ownership |
| Own shift/expense history | Existing shifts.view / expenses.view, self-scoped after ST-05 |
| All shift/expense history | New shifts.view_all / expenses.view_all |
| All account balances | Existing treasury.view |
| Assignment/funding authorization | treasury.assign / treasury.fund |
| Handover review/confirm/reject | treasury.handovers.view / treasury.handovers.confirm |
| Discrepancy adjustment approval | treasury.reconcile, additionally required at settlement |

Review permission provides linked closing/movement evidence; query ownership filters apply before pagination/aggregates. Role migration grants manager all-record access deliberately and own rights to Cashier; never grant all cashiers global treasury visibility. Administrator is configured through role_permissions like other users, not an authorization bypass.

**DESIGN SYSTEM INHERITANCE:** KOSHK VDR, DESIGN_SYSTEM.md, COMPONENT_LIBRARY.md, current APIs and UI-001–UI-011 apply. Reuse shared forms, tables/cards, badges, dialogs and toasts with Arabic RTL. Show current recorded drawer funds, unavailability/pending liability and cash/noncash detail. Managers get pending/history review. Distinct labels for closed, awaiting receipt, confirmed, rejected and zero acknowledgment; intentional phone/tablet/desktop views and accessible controls. No new visual language.

Reports keep transfer/variance sources distinct from revenue/expense, show pending versus received amounts, preserve original closing variance and later recount/adjustment. Sum each account once; parent totals are derived, not a duplicate stored asset.

## 7. Migration and historical data

1. Read-only preflight of actual schema/journal, mappings, active/duplicate shifts, ledger/stored agreement and legacy references. Actual business database has not been queried in this documentation stage.
2. Existing 0020 is absent from journal, adds already-existing started_at, omits late_fee_records.rental_item_id, and includes historical rental backfills. Do not blindly register/replay it. Prepare reviewed fresh-install and already-upgraded paths, preserving actual history and honest migration metadata. Prior local test-only alignment is not migration proof.
3. Add reviewed Drizzle migration/schema/journal changes. Preserve all historical account IDs, amounts, payments, movements, shift values/times and nullable source links. No automatic historical custody allocation from cashier_id; actor is not proof of custody.
4. Cutover prevents legacy open sessions mixing with new routing. New drawers start zero; no old close becomes confirmed handover. Owner configures main/assignments and separately approves any unrecorded initial cash.
5. Verify fresh and legacy-upgrade fixtures, constraints, seeds, repeatability, exact historical-value and count/total preservation. MySQL DDL is not assumed transactional.
6. Before use, compatible rollback may disable feature; after financial use retain history/schema and use reviewed forward repair. Never drop transfer records or imply code rollback reverses physical custody.

No migration has been generated/applied. Existing `scripts/verify-migrations.ts` drops its selected database without a target safety guard; do not run it blindly. Fresh/upgrade tests need explicitly guarded disposable targets and reviewed cleanup; ordinary API tests must use koshk_skate_test only.

## 8. Implementation sequence after approval

1. Record owner choices/approval and explicit supersessions in Decision Log; finalize module/API/database contracts.
2. Resolve migration prerequisite; add schema, uniqueness, exact money and scoped strict audit.
3. Implement assignment/funding and all affected source routing/serialization.
4. Implement immutable closing/attempts, confirmed/zero settlement, approved exception rules and own/all scopes.
5. Implement Arabic Treasury manager/cashier interfaces and report distinctions.
6. Verify below, document actual evidence, preserve unrelated work, review diff and make one logical implementation commit. Follow Git push requirements and report exact status. No deployment is authorized.

## 9. Verification plan and actual stage results

| Area | Required cases after implementation |
|---|---|
| Accounts | Two-cashier isolation; split cash/electronics; all source paths; stored=ledger; transfer net zero; adjustment separately classified. |
| Lifecycle | Closing/pending/rejection no movements; replacement preserves count; one settlement; zero acknowledgment; deactivation/history. |
| Concurrency/idempotency | Open/open; close versus collection/expense/refund; confirm/confirm; confirm/reject; replacement/confirm; funding/spend; controlled interleavings and exact row counts. |
| Rollback | Failure after source change/first leg/balance delta/audit insert leaves no partial state. |
| Access | 401/403; cross-user IDs; forged account/shift; own/all filtered totals; legacy-client bypass; manager evidence; no self-confirmation even with all permissions. |
| Boundaries | Zero/cents/max/overflow/invalid decimals; inadequate funds; inactive/stale mapping; overnight session; duplicate legacy shifts; mismatch and shortage/overage. |
| Regression | Multi-skate start/return/finalization, split/waiver, sales/refund, damage, expenses, system/external maintenance, unchanged reservations and no transfer inflation. |
| Migration | Fresh/upgrade; FKs/uniqueness; journal; seeds; historical equality; repeatability and recovery notes. |
| UI | Arabic RTL phone/tablet/desktop, exact amounts/statuses, permissions, loading/empty/error/stale/retry, keyboard/touch. |

Tests share koshk_skate_test and run serially with dedicated fixtures; never reset development/demo/production. Reconcile obsolete upfront-payment test assumptions before citing them. Existing modern treasury.test.ts, sales-balance.test.ts and maintenance-payments.test.ts provide useful regressions, not coverage for the unimplemented handover.

**Actual results:** source/document/test inspection completed. No application code/database changes; builds, integration tests and browser behavior tests NOT RUN for this documentation stage. Prior 35 API/96 UI checks belong to the earlier recorded-balance CR. Feature verification is NOT STARTED pending decisions and migration prerequisite. Documentation checks PASS: proposal/reconciled-module links resolve, git diff whitespace check is clean, and staged scope contains exactly 10 documentation files. Original unstaged tracked changes were compared against the pre-work snapshot and preserved (ignoring changed Git blob hashes only). Two independent reviews were incorporated; no financial-runtime verification is implied.

## 10. Delivery status

Investigation/proposal is DOCUMENTED; financial feature is NOT IMPLEMENTED and not complete. New file is this specification. Reconciled docs: Cashier Shifts, Expenses, Treasury, Payments, database architecture, Project Map, Project State, Changelog and Decision Log. Planned source/migration/test areas above are not implemented changes.

Pre-existing rental/audit work is outside this CR. Exact Git commit/push status is reported at delivery. No physical cash verification, electronic settlement certification or deployment is claimed.
