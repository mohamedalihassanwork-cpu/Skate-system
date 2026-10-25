# Module: Reports

**Status:** IMPLEMENTED — automated and browser verification tracked separately.
**Last updated:** 2026-10-26 — audit contract documented before implementation.

## Purpose and authority

Arabic-first, read-only reporting across the existing 11 destinations. Authority: Master Business/Product Specification §§33–45, DEC-001/013/042, Phase 13 and approved ST-01–06. The owner's 2026-10-26 comprehensive audit request authorizes corrections and justified completion of existing report requirements. Earlier PLANNED placeholders were stale.

Implementation: apps/web/src/modules/reports/ and apps/api/src/modules/reports/. See [audit plan and actual verification](../quality/REPORTS_AUDIT.md).

## Data and calculations

- Preserve all 11 authenticated endpoints and reports.view enforcement, including export fetches. No new permissions/grants.
- Validate actual calendar dates (YYYY-MM-DD), normalize reversed ranges, and bound positive integer pagination (limit at most 100). Preserve approved fixed UTC+03:00 bounds and grouping, using UTC next-day arithmetic. This is a fixed reporting calendar, not seasonal Africa/Cairo conversion.
- Net collected revenue = committed rental/late-fee/damage/sale payments minus rental/sale refunds in the selected payment-date period. Chart sums equal the KPI, including refund-only dates. Exclude internal transfers, variance adjustments, deposits and opening counts.
- Recorded expenses = outward expense and maintenance-payment movements. Category/user/account breakdowns reconcile to this same total. External/unpaid repair costs are separate from treasury outflows. Category IDs have no lookup table: use the existing UI category names where defined, and explicit fallback labels otherwise. Do not invent a taxonomy or infer a payment method from an account where multiple methods may share it.
- Operating result = net collected revenue minus recorded expenses, displayed with its sign; never accounting net profit.
- Prefer rental_items, falling back to legacy headers only for rentals with no items. Rental details are per skate/item with commercial code, expected/actual duration, billed amount, start/expected/actual return, item/commercial statuses and cashier. Overview/customer/cashier counts remain commercial rental counts, including cancelled rentals pending F-014 approval.
- Active/overdue rentals and open maintenance are explicitly current snapshots. Overdue counts inspect active items with historical fallback. Period counts and current snapshots must not become overlapping pie slices.
- Late reports distinguish recorded calculated/waived fees, finalized collections and amounts pending commercial finalization. Returning an item does not mean its designated collected_fee is already cash. Include period totals/waiver percentage and explicit cashier attribution.
- Finalization rounds the commercial sum of fee records to whole pounds. Therefore per-record collectedFee and collectedLateFees are labelled settled recorded fees, and actualCollectedLateFees separately reports actual late-fee movements in the selected payment period for distinct rentals in the filtered results. Never distribute rounded cash among items without an approved allocation rule. Revenue/Cashier remain actual ledger-based; changes to the source rounding policy require separate financial-flow review.
- Damage charges/collections/waivers/outstanding amounts and repair costs remain separate. Sum all linked maintenance costs once. Include damage-type breakdowns.
- Maintenance period uses created_at so pending records without started_at remain visible. Keep nullable start/completion and recorded payment status. Include operation count, total/average cost and completed duration. Problem descriptions are free text, not an invented category system.
- Customers use distinct commercial activity counts and net ledger spending linked through rentals/damage/sales. Anonymous sales remain outside identified-customer spending. Label payment-date spending versus start-date activity.
- Skate analytics use per-item billed rental values/counts and actual usage minutes, current status, damage charges and maintenance costs. Retain unused skates. No invented ROI/utilization percentage/replacement threshold or allocation of commercial refunds among skates.
- Cashier monetary totals use movements attributed to the performing cashier, including refunds and maintenance. Report actual late fees and waivers separately; preserve signed recorded shift differences. Describe activity/waiver actor/date bases.
- Related aggregates and pagination reads use consistent read snapshots or a single query to avoid internal drift during live writes; all remain read-only.

## Filters, UI and exports

- Rental filters: customer/cashier/skate text, size, item status, commercial status and configured expected duration. Relevant status/text filters for damage/maintenance and text filters for other lists apply before pagination and to summaries/exports. No cross-module permission-dependent lookup requests.
- Customer rankings switch between payment spending and rental frequency. Skate rankings switch between billed value, most/least used, maintenance frequency and damage frequency, using existing recorded metrics (Master §§37/42). These server-side orderings apply to the full matching dataset and exports.
- Deterministic ordering and matching totals; exports iterate all server-sized pages with the same applied filters.
- Explicit report columns provide Arabic labels and typed number/currency/date/status formatting. Codes and counts are never inferred as dates. Display/export definitions agree.
- Use existing KOSHK tokens/shared forms, tables/cards, loading, empty/error/retry, Pagination and Toast. Ignore stale responses, clear obsolete rows, reset pagination coherently, show applied period/filter context.
- Signed financial values, reconciled refunds and exact accessible table alternatives accompany charts. Respect reduced motion. Wrap controls/context and use shared mobile cards with document scrolling and RTL.
- Report timestamp display uses the same fixed UTC+03:00 calendar as filtering, through Intl timeZone formatting. This is local to Reports; other modules' timestamp displays are unchanged. Scope card styling to Reports because current shared DataTable row markup lacks the card class.
- CSV/Excel: Arabic headers/statuses, numeric cell types and spreadsheet formula protection. Summary destinations use existing report data and are exportable.
- Print/PDF: dedicated Arabic RTL print document with title, period, filters and full data. The browser print dialog supports Save as PDF and native Arabic shaping, replacing unsupported jsPDF font/prototype output. No added font/dependency; manual print/download checks remain with the owner.

## Deferred decisions and limits

- F-014: exclusion of cancelled rentals from counts still requires explicit owner policy; preserve inclusion and disclose it.
- Seasonal Africa/Cairo reporting and utilization/ROI denominators are undefined/unapproved; preserve fixed +03:00 and report actual minutes rather than invent percentages.
- No schema/source financial writes/history repair/unrelated redesign/new report destinations. Treasury handovers remain in existing Treasury reports, avoiding duplication.

## Verification

Use guarded koshk_skate_test only, serial DB suites. Meaningful regressions cover multi-item/legacy values, refunds, boundaries/calendar/pagination, matching filters/summaries, fees/damage/maintenance/customer/cashier data, transfer exclusions and 401/403. Run API/frontend builds, frontend lint and pure formatting/export tests. Browser testing is reserved for the owner and will not be claimed as completed. Current results: [audit record](../quality/REPORTS_AUDIT.md).
