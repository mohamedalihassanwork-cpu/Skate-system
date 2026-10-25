# Reports audit — 2026-10-26

**Status:** IMPLEMENTED / TESTED / DOCUMENTED — browser verification pending owner testing.
**Authorization:** Owner's comprehensive Reports audit/fix request. Browser testing is reserved for the owner.

## Confirmed findings before implementation

1. Legacy rental header fields break current multi-item rental/overdue/customer/skate reporting.
2. Revenue charts omit refunds and refund-only days; category expense totals omit maintenance and disagree with ledger KPIs.
3. Cashier revenue omits refunds, actual late/waived fees and maintenance expenses.
4. Actual rental returns and late settlement breakdowns are missing. Pending maintenance without start times is omitted. Damage repair costs need linked-record aggregation.
5. Generic column inference formats skate codes/counts as dates and leaks raw statuses/headers.
6. Request effects permit stale data; cleared/reversed dates, filtering and pagination need coherent applied-state feedback.
7. Financial loss sign is hidden; overview chart uses overlapping current/period counts. Charts lack exact accessible tables and retry/empty states.
8. Expense UI references undefined desktop tokens; responsive controls/tables need existing wrapping/card patterns.
9. Exports use raw internal keys, one oversized request and an unsupported Arabic jsPDF path. Overview/financial controls reject their action; Print is missing.
10. Module PLANNED placeholders and Phase 13 date-bound text are stale. F-014 remains a real deferred owner policy.

## Scoped implementation plan

1. Repair Reports API/types with normalized item/legacy reads, coherent ledger totals and additive documented filters/insights. Use consistent read snapshots; no source writes/migrations.
2. Implement explicit shared report columns/formatters, applied filters/stale-response handling, truthful financial/chart/table states and existing responsive components.
3. Export all matching pages and summary reports with Arabic typed CSV/Excel and RTL Print/Save as PDF.
4. Add meaningful isolated API regressions and non-browser formatting/export tests. Run relevant/full API suites where supported, both builds and frontend lint.
5. Update module/phase/state/map/changelog with actual results; review diff and create one logical local commit, reporting push status separately.

## Retained boundaries

Cancelled commercial rentals remain in activity counts pending F-014 approval. Retain fixed UTC+03:00; do not invent seasonal policy, ROI/utilization denominators, payment methods absent from expense sources, or duplicate Treasury handover reports.

## Executed verification

| Check | Actual result |
|---|---|
| Reports data/authorization regressions | 55 passed; generated fixtures on guarded koshk_skate_test, exact-ID cleanup |
| Existing Reports smoke and expense tests | 15 passed |
| Pure frontend formatting/export tests | 14 passed; no browser or DOM automation |
| Combined focused Reports run | 84/84 passed, 4 files, 8.01 seconds |
| API TypeScript build | PASS |
| Frontend TypeScript/Vite build | PASS; existing bundle-size and unrelated ineffective dynamic-import warnings |
| Reports-scoped frontend lint | PASS, no warnings |
| Full frontend lint | Exit 0; warnings in existing unrelated modules, no Reports warnings |
| git diff --check | PASS |
| Full serial repository test suite | 478 passed, 35 failed, 7 skipped across 36 files (127.73 seconds); this run preceded the final fractional-fee regression, which passed in the focused rerun |

The full-suite failures are in auth, rentals, returns, payments, notifications, gate41-remediation, audit-phase32 and gate42-batch1. Auth asserts 49 permissions while the current test user has 57. Rental/payment/gate fixtures use the retired single-skate/upfront-payment payload; return/notification fixtures use legacy headers without current active items. These test files and their source modules were not changed. The full repository suite is **not green**, and no claim is made that these failures were fixed or baseline-retested on another checkout.

The first focused DB run caught Drizzle 0.38 producing invalid START TRANSACTION syntax when combining consistent-snapshot and read-only flags. Reports now uses a read-only repeatable-read transaction; the first SELECT establishes its shared snapshot. The rerun passed. No schema migration or development database test was performed.

Final review also fixed report timestamp display to the reporting calendar, scoped mobile card styling for the existing DataTable markup, truthful empty financial-chart states and recovery to page one after results shrink. Actual fractional-fee cash is separately displayed and regression-tested: two settled records of 0.75 each remain 1.50 in the detail records, while the recorded commercial treasury receipt is 2.00. No unsupported per-item allocation or source rounding change was introduced.

No browser verification was performed. Owner manual checks remain: all 11 destinations, quick filter/tab changes, empty/error recovery, phone/tablet/desktop RTL layouts, long labels/large values, keyboard controls, CSV/Excel downloads and Arabic Print/Save as PDF.

## Changed files

- Backend: reports.service.ts, reports.routes.ts and reports.types.ts in apps/api/src/modules/reports/.
- Tests: reports-regression.test.ts and reports-frontend.test.ts added; reports-expense.test.ts fixture corrected/guarded in apps/api/src/tests/.
- Frontend: ReportsPage.tsx, reports.api.ts, exportUtils.ts; added reportSchemas.ts/useReportData.ts; existing Overview/Financial/Revenue/Expense/GenericListReport components updated; added ReportElements.tsx/TimelineReport.tsx, all under apps/web/src/modules/reports/.
- Documentation: module REPORTS, Phase 13, PROJECT_STATE, PROJECT_MAP, CHANGELOG, DECISION_LOG and this audit record.
- Shared components and unrelated business modules were not edited. Pre-existing untracked verify-post-migration.mjs and subtreasury_ui.py were preserved.

## Remaining decisions and data limits

- F-014: whether cancelled commercial rentals should be excluded from activity counts remains owner-pending; inclusion is disclosed and preserved.
- The approved fixed +03:00 report calendar is preserved. Seasonal Africa/Cairo conversion needs an explicit reporting-policy decision if wanted.
- Changing whole-pound late-fee finalization rounding is a separate financial-flow decision. Reports exposes recorded settlements and actual receipts separately.
- Expense category IDs have no authoritative names, and expense sources lack a reliable payment-method link. Use explicit category-number/unclassified labels and account breakdowns; category taxonomy/method storage need a separate data-model decision. Maintenance problems are free text. Actual usage minutes are available; business-hours/capacity/ROI definitions are not invented.
- Multiple export pages are separate read snapshots; the exporter rejects changed totals/incomplete results. Perform large exports during stable activity if a single-instant historical snapshot is required.

## Git delivery

One logical local commit is required after final review. Hash and push status will be reported at delivery; no deployment.
