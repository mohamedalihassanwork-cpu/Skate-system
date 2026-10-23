# Sub-Treasury Management and Cashier Daily Closing

**CR:** CR-SUB-TREASURY-2026-10-15
**Status:** APPROVED 2026-10-16 / IMPLEMENTATION IN PROGRESS — verification pending
**Date:** 2026-10-15
**Investigation baseline:** `a0f157f`, branch `master`; proposal committed/pushed as `0a05836`. The owner intentionally removed earlier unrelated rental-receipt/audit-filter edits; implementation began with a clean tree and does not restore them.

## 1. Authorization and scope

This is an independent change request. The owner authorizes separate cashier funds, daily closing, pending handover, manager confirmation, server-side access controls, atomic financial effects and complete audit history. Closing alone must never credit the main treasury or assert receipt.

The owner approved ST-01–06 on 2026-10-16 with clarified account independence and cashier-entered opening cash. A follow-up explicitly confirmed: opening is a count only; ledger funds come from recorded transfers. The approved contract below supersedes conflicting proposal wording. Implementation may proceed under Rule 16; no verification is inferred from approval.

Governance: [source hierarchy](../00-governance/SOURCE_OF_TRUTH.md), [agent rules](../00-governance/AI_AGENT_RULES.md) Rules 4, 5, 11, 16, 20, [change process](../00-governance/CHANGE_REQUEST_PROCESS.md), [verification rules](../quality/VERIFICATION_RULES.md). The current owner request also explicitly requires approval of unresolved business decisions before implementation.

## Approved clarifications — 2026-10-16

- **ST-01 APPROVED:** Every treasury account is independent, including main cash, cashier cash drawers and electronic accounts. Each has its own ledger and balance. A designated receiving account is a transfer destination, not a parent balance containing child funds. Electronic methods keep their configured independent accounts; no electronic account is silently merged into cash or automatically handed over. One persistent assigned cash drawer per cashier remains approved.
- **ST-02 APPROVED:** Cashier enters the opening cash count; store actor, time, count and opening ledger snapshot separately. Explicit follow-up: **count only; ledger funds come from recorded transfers**. Entering a count never inserts a funding movement or changes spendable ledger balance. Retain any count-versus-ledger difference for review; the entered count does not certify funds. Manager-authorized funding/top-ups require separate cashier acknowledgment and paired transfer. Full handover, frozen closed drawer, Cairo opening business date and one active session remain approved.
- **ST-03–06 APPROVED:** Explicit shortage/overage adjustment acknowledgment by a manager with reconcile+confirm permissions; immutable rejection/replacement; acting-cashier cash refund funding; own/all permissions and no self-confirmation; safe forward-only cutover/history preservation and migration repair.
- **Opening count arithmetic:** Expected counted cash = entered opening count + subsequent cash movements. Ledger due = opening ledger snapshot + subsequent cash movements. Persist/display both and their difference. Closing count variance compares count with expected counted cash; manager settlement adjustment compares received funds with ledger due. This distinction is required to keep opening count-only and transfer arithmetic correct. Approved ST-03 authorizes explicit settlement adjustment, never automatic posting from an opening discrepancy.
- **Integrity scope APPROVED:** shared transaction/shift routing and strict audit for all touched financial producers. Existing broader OWNER-001/002 remain outside this bounded implementation.
- **Migration and cutover:** no redistribution of historical money, no invented legacy handovers and no production deployment. Legacy shifts close through their existing path before explicit activation; new drawers start zero and obtain ledger funds only via transfers.

The investigation below describes the pre-change architecture. Approved decisions are consolidated here; the original proposal/alternatives remain available in commit `0a05836`. Remaining unknowns concern actual deployment configuration/account/user identities and unrecorded historical funds, not authorization to implement this workflow.

## 2. Investigated baseline architecture and gaps

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
| System maintenance | `modules/maintenance/maintenance.service.ts:419–494`: selected payment method determines account; current source requires active shift for system payment (cash and noncash). | Apply ownership/cash routing and awaited audit; preserve authorized central/noncash paths. |
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

## 4. Approved decision record

| ID | Owner-approved rule |
|---|---|
| ST-01 | Independent main, cashier and electronic accounts; one persistent explicitly assigned cash drawer per cashier. Main is a transfer destination/source, not a stored parent rollup. Electronic methods retain independent configured mappings. |
| ST-02 | Cashier enters count-only opening; ledger funds come from recorded transfers. Separate manager authorization/cashier acknowledgment for funding and top-ups. Full counted handover, closed drawer frozen until settlement, one active shift/user, sequential sessions and Cairo opening business date. |
| ST-03 | Close with explained discrepancy; record expected count, actual count, declaration and ledger due separately. Received must match latest declaration. Reject with reason and append linked replacement; preserve original count. Explicit reconcile+confirm permission and acknowledgment authorize signed adjustment and actual transfer atomically. Same manager may hold both rights. Zero gets acknowledgment without fictitious transfer. |
| ST-04 | Cash payment/refund uses acting cashier's funded active drawer; electronic refund uses original recorded account. Preserve original sale/component/account references. No drawer overdraft or fallback to another/main account. |
| ST-05 | Own/all history scopes and distinct assignment/funding/review/confirmation/reconciliation rights. No self-confirmation or both funding actors, even with all permissions. No hardcoded Administrator bypass. |
| ST-06 | Forward-only disabled-by-default cutover after legacy sessions close, explicit main/assignments and ledger agreement. Preserve historical values and null links; no inferred historical handovers or redistribution. Safely repair 0020 prerequisite; no production execution. |

Approval includes shared transactional routing/shift guards and required audit rollback for all six touched producers plus new Treasury actions. It does not resolve global OWNER-001/002 or authorize electronic clearing/fees, arbitrary initial-money import, historical balance repair, reassignment or production deployment.

## 5. Approved lifecycle and reconciliation

| Record | States | Financial effect |
|---|---|---|
| Shift | active → closed | Immutable closing snapshots only; no reopening/editing. |
| Handover attempt | pending → confirmed OR rejected; replacement is a new linked attempt | Pending/rejection posts nothing. One live attempt and at most one settlement per closing. |
| Transfer | Completed paired transaction uniquely linked to accepted handover/funding | Both ledger legs, deltas, status and audit commit together; no visible partial transfer. |
| Zero-funds acknowledgment | Manager acknowledgment linked to close | No zero transfer legs; shortage adjustment still requires approval when applicable. |
| Funding authorization | pending → accepted/cancelled | Pending does not post/reserve funds; main availability rechecked on cashier acknowledgment. |

1. Manager assigns drawer and authorizes any float. Cashier acknowledgment atomically transfers authorized funding; opening separately snapshots the recorded ledger and entered count. Active-shift top-ups are accepted under the same two-actor rule and linked to that active shift. Recheck funds/status inside each transaction; a pending authorization is not spendable. Opening count/ledger mismatch is retained for review and cannot create money or increase spendable funds.
2. Every eligible producer resolves/locks the active shift and assigned account inside its source transaction. Electronic amounts remain separately attributable to current cashier/shift.
3. Close serializes with producers, calculating expected counted cash `E` from opening count plus subsequent signed drawer movements, and ledger due `L` from the opening ledger snapshot plus the same movements. Opening funding is already in the snapshot and is excluded from subsequent activity; accepted active-shift top-ups count once. The snapshot records a durable transaction boundary, not a timestamp-only cutoff. Compare with source ledger and stored balance. Data-integrity drift is reported separately from a physical cash discrepancy and prevents settlement until repaired through approved action.
4. Store original counted cash `C`, declared handover `H`, expected count `E`, ledger due `L`, `C-E`, reason, actor and server time. Under full handover `C=H`; retain distinct fields. Close shift and create pending attempt atomically, with no treasury movement. Drawer becomes unavailable under ST-02.
5. Manager reviews original count, current declaration, expected, discrepancy, movements and prior attempts. Reject records actor/time/reason only; cashier submits append-only replacement. Original closing count/variance is never overwritten or presented as recounted.
6. Manager records received `R`, required to equal latest `H`. Exact-match confirmation posts paired transfer for `R`. Real difference needs ST-03 authorization for adjustment `A=R-L`, posted atomically with transfer and all audit events. Recounted handover difference remains separate from original closing variance.
7. Source after settlement is `L+A-R=0`; main increases by `R`; consolidated funds change only by explicit adjustment `A`. Internal transfer itself nets zero. Adjustments appear separately, not in operating revenue/expense without further accounting approval.
8. When `R=0`, record no-funds acknowledgment and no transfer. If expected exceeds zero, settling still needs explicit shortage approval. Zero acknowledgment must not be labeled funds received.

| Ledger due EGP | Received EGP | Explicit adjustment if approved | Main increase EGP |
|---:|---:|---:|---:|
| 1,000.00 | 1,000.00 | 0.00 | 1,000.00 |
| 1,000.00 | 980.00 | -20.00 shortage | 980.00 |
| 1,000.00 | 1,020.00 | +20.00 overage | 1,020.00 |

A manager confirmation is the responsible user's recorded attestation. Software cannot independently establish that cash was physically counted or delivered.

## 6. Implemented technical design

- Reuse treasury_accounts and ledger. Add account role metadata and persistent assignment (cashier, account, active flag, responsible administrator and time). Enforce one live drawer assignment per cashier and exclusive ownership; do not reuse a historical cashier account for another person.
- Extend new shifts with assignment/account snapshot, business date and closing actor/server time; preserve explicit legacy nullability. Serialize opening through user/assignment lock and database uniqueness. Detect legacy duplicate active shifts before adding constraints.
- Add closing/handover attempts, settlement/transfer, funding authorization and discrepancy approval records with exact amounts, source/destination, reasons, actors, timestamps and immutable replacement links. Add dedicated movement types/transfer-leg links, unique `(transfer_id, leg)` and one settlement per close/accepted funding. Do not overload `other` or fake source IDs.
- Preserve actual posting-account and cash-classification snapshots, including rental components whose schema currently lacks account. Method/account/assignment changes cannot reinterpret historical movements or closed summaries.
- Use transaction-scoped account/shift guard across all six financial producers. Define one consistent lock order across users/assignments, shifts, business sources and ordered accounts; reconcile with existing rental/stock locks and prove controlled concurrency tests. Support raw mysql2 and Drizzle transaction contexts without committing independently.
- Persist idempotency keys scoped to actor/operation for close, confirm, reject, replacement and funding. Same key/payload returns original result, changed payload conflicts. State/unique guards prevent repeated settlement of the same source even under different request keys; confirm versus reject has one outcome. Creation retries for sales/expenses use a stable persisted logical-operation token. Arbitrary new tokens cannot be distinguished from legitimate separate sales/expenses; no semantic deduplication claim is made.
- Source state, movement legs, balance deltas, approval and required audit share transaction/connection. Audit insertion failure rolls back affected financial work. General nonfinancial audit behavior remains outside scope.
- New money contracts use bounded two-decimal strings and exact piastres/SQL DECIMAL. Reject nonfinite, exponent/malformed, negative where invalid, overprecision and overflow. Bound operations by both movement and account capacity; accumulated closing maximum needs explicit validated schema sizing.
- Enforce permission, ownership, active status and actor separation on server; no arbitrary client account/shift override. No post into closed drawer. Inactive assignment/nonzero residual/pending liability/data drift cannot be silently cleared.

### APIs, permissions and UI

`/api/v1/treasury` exposes configuration, account creation/list/movements, setup options, assignments, activation, funding, own workspace, handover summary/history/detail and actions. Existing shift open/close contracts add operationKey, managed declaration/reason and ledger snapshots; legacy numeric DTO fields remain compatible. Exact routes/payloads are documented in [API architecture](../architecture/API_ARCHITECTURE.md). Old clients cannot bypass required managed keys/declaration after activation.

| Capability | Permission/scope |
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

Reports keep transfer/variance sources distinct from revenue/expense, show pending versus received amounts, preserve original closing variance and later recount/adjustment. Sum each account once; all-account totals are derived, never a duplicate stored asset.

## 7. Migration and historical data

1. Read-only preflight of actual schema/journal, mappings, active/duplicate shifts, ledger/stored agreement and legacy references. Only dedicated test/disposable databases were changed during implementation; no development or production migration was performed.
2. Baseline 0020 was absent from the journal, duplicated started_at, omitted late_fee_records.rental_item_id and contained inferred backfills. The repaired schema-only migration and guarded repair scripts validate actual schemas, preserve original values and record canonical journal entries only after verified completion. Fresh/upgrade/partial fixtures and current seed are tested; see the runbook for exact evidence.
3. Add reviewed Drizzle migration/schema/journal changes. Preserve all historical account IDs, amounts, payments, movements, shift values/times and nullable source links. No automatic historical custody allocation from cashier_id; actor is not proof of custody.
4. Cutover prevents legacy open sessions mixing with new routing. New drawers start zero; no old close becomes confirmed handover. Owner configures main/assignments and separately approves any unrecorded initial cash.
5. Verify fresh and legacy-upgrade fixtures, constraints, seeds, repeatability, exact historical-value and count/total preservation. MySQL DDL is not assumed transactional.
6. Before activation, disabled mode remains compatible with legacy workflows. There is no financial rollback/down migration or post-activation toggle. After financial use retain schema/history and use reviewed forward repair. Never drop transfer records or imply code rollback reverses physical custody.

Migration0021 is generated and verified. Its first shared-test application stopped on a MySQL foreign-key identifier over64 bytes; the identifier was shortened before fresh verification. Guarded partial recovery then completed exactly19 missing statements and preserved all7558 pre-repair rows, with only approved permission/config additions. The earlier failed attempt has no separate pre-attempt row fingerprint; preservation evidence is the pre-repair snapshot plus fresh/upgrade fixtures. No claim is made beyond that evidence.

The old destructive verifier is replaced by guarded disposable database ownership-token checks. It never adopts/drops a pre-existing database. [Migration runbook](../quality/SUB_TREASURY_MIGRATION.md) records commands, actual results, fingerprints and forward-repair limits.

## 8. Rule16 implementation sequence

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

Tests share koshk_skate_test and run serially with dedicated fixtures; never reset development/demo/production. Reconcile obsolete upfront-payment test assumptions before citing them. Existing modern treasury.test.ts, sales-balance.test.ts and maintenance-payments.test.ts provide useful regressions, not coverage for every new handover state.

**Actual results:** recorded in [SUB_TREASURY_VERIFICATION.md](../quality/SUB_TREASURY_VERIFICATION.md), with initial failures, corrected reruns, exact counts, browser fixture limits, blocked/not-run checks and Git delivery status. Prior35API/96UI checks belong to the earlier recorded-balance CR and are not reused as new evidence.

## 10. Delivery status

Owner approval was recorded before implementation; approved code, schema, UI and documentation are now present. Verification and final Git status are maintained in the linked report and Project State. A build or recorded manager attestation is not proof of physically counted/delivered funds. No deployment is claimed. The owner-approved unrelated cleanup remains intact.


### Verification prerequisite correction — 2026-10-16

The existing npm test flag `--file-parallelism=false` parses in installed Vitest5 as truthy string `"false"`, overriding the boolean configuration and allowing shared-database fixtures to overlap. This directly invalidates financial verification. The scoped correction is `--no-file-parallelism` for test/watch; no test semantics or business behavior changes. Initial combined results are retained as failed/contaminated evidence; final suites are rerun with actual serialization. Existing obsolete pool-option warnings remain outside this correction.


### Managed balance read authorization — 2026-10-16

Final scoped review found that GET shifts/current accepted a still-valid JWT for a disabled user, unlike other touched financial routes. Because this endpoint now exposes managed session balances, add an active-user check while retaining its authenticated-own access contract. This enforces existing account activity policy; it adds no role privilege or new financial rule. A direct disabled-token regression covers the correction.
