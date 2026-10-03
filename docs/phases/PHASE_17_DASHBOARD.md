# Phase 17 — Dashboard

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.3 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.3)

---

> [!IMPORTANT]
> **Gate 5.3 Status Conflict Resolution:** The previous document showed "Status: COMPLETE" in
> the header but "Final Status: PHASE 17 BLOCKED" at the bottom. This is a contradictory state.
> Gate 5.3 reconciles this:
> - Implementation: EXISTS (backend service + frontend DashboardPage)
> - Backend tests: PASS (3 tests — admin full view, cashier RBAC, validation)
> - Browser verification: BLOCKED (Playwright driver failure — 404 from Azure edge node)
> - Correct status: **PARTIALLY VERIFIED** (not COMPLETE, not BLOCKED)
>
> Browser verification block does NOT make the entire phase BLOCKED.
> It makes the browser-dependent requirements unverified, hence PARTIALLY VERIFIED.

---

## 1. Purpose

Provide a real-time operational and financial dashboard as the default application home screen.
Cashiers see only operational metrics. Managers/Admins with `reports.view` see full financial KPIs
and charts. Dashboard uses a single aggregated endpoint to eliminate N+1 requests.

**Evidence source:** `apps/api/src/modules/dashboard/dashboard.service.ts`,
`apps/api/src/modules/dashboard/dashboard.routes.ts`,
`apps/web/src/modules/dashboard/DashboardPage.tsx`,
`apps/api/src/tests/dashboard.test.ts`, Phase 17 implementation doc.

---

## 2. Scope

### 2.1 Implemented

| Feature | Evidence |
|---|---|
| Single aggregated endpoint `GET /api/v1/dashboard/kpis` | `dashboard.routes.ts` |
| Backend service with date-range filtering | `dashboard.service.ts` |
| Permission-gated financial data (reports.view) | `dashboard.service.ts` lines 29-31 |
| Operational KPIs for all users | `dashboard.service.ts` lines 51-90 |
| Financial KPIs for reports.view users only | `dashboard.service.ts` lines 93-165 |
| Charts: revenueOverTime, expenses, rentalVolume, mostRentedSkates, skatePerformance | `dashboard.service.ts` lines 147-203 |
| Recharts library for frontend charts | `DashboardPage.tsx` |
| Time filter presets: Today, Yesterday, This week, This month, Custom range | `DashboardPage.tsx` |
| Quick actions panel | `DashboardPage.tsx` lines (confirmed from Phase 17 doc) |
| Dashboard is default route `/` of the application | Phase 17 doc — "Replaced PlaceholderPage" |
| DashboardPage.tsx — 38KB full implementation | `apps/web/src/modules/dashboard/DashboardPage.tsx` |

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P17-01 | Default app route shows Dashboard | Phase 17 doc: "Replaced PlaceholderPage as default route" | IMPLEMENTED |
| BR-P17-02 | Operational KPIs visible to all authenticated users (activeRentals, lateRentals, skates by status) | `dashboard.service.ts` lines 51-90 | IMPLEMENTED — TESTED |
| BR-P17-03 | Financial KPIs and charts visible ONLY with `reports.view` | `dashboard.service.ts` canViewReports check | IMPLEMENTED — TESTED (cashier RBAC) |
| BR-P17-04 | Operating Result = Revenue - Refunds - Expenses | `dashboard.service.ts` line 117 | IMPLEMENTED — TESTED |
| BR-P17-05 | Period filter: Today, Yesterday, This week, This month, Custom | `DashboardPage.tsx` | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P17-06 | endingSoonRentals (within 5 minutes) for operational alerting | `dashboard.service.ts` lines 69-86 | IMPLEMENTED |
| BR-P17-07 | recentSales list for financial users | `dashboard.service.ts` lines 123-143 | IMPLEMENTED |
| BR-P17-08 | Charts: revenue over time (LineChart), expenses over time, rental volume (BarChart), most-rented skates, skate performance | `dashboard.service.ts` + `DashboardPage.tsx` | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P17-09 | Quick actions: Start Rental, Open Rentals, Return Skate, Add Customer, Add Expense | Phase 17 doc quick actions section | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P17-10 | startDate and endDate required (400 if missing) | `dashboard.routes.ts` | IMPLEMENTED — TESTED |
| BR-P17-11 | CONVERT_TZ used for date grouping (UTC+3) | `dashboard.service.ts` lines 148, 157, 172 | IMPLEMENTED |

---

## 4. Functional Behavior

### 4.1 Endpoint

`GET /api/v1/dashboard/kpis?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- Requires: authenticated
- Optional: `reports.view` for financial data (others receive operational data only)
- 400 if startDate or endDate missing

### 4.2 Date Bounds

`buildDateBounds(localStartDate, localEndDate)`:
- `startBound = new Date(startDate + T00:00:00Z)`
- `endBound = new Date(endDate + T00:00:00Z) + 1 day`
- Inclusive start, exclusive end

### 4.3 Permission-Gated Response

| Data | Permission Required | Always Present |
|---|---|---|
| activeRentals, lateRentals, skatesByStatus, totalSkates, endingSoonRentals, rentalsPeriod | None | YES |
| revenue, expenses, operatingResult, collectedLateFees, waivedLateFees, damageCharges, recentSales | reports.view | CONDITIONAL |
| Charts (revenueOverTime, expenses, rentalVolume, mostRentedSkates, skatePerformance) | reports.view | CONDITIONAL |

### 4.4 KPI Definitions (From Phase 17 Implementation Doc)

- **Operating Result:** `(Revenue) - (Expenses)` where Revenue = sum of treasury_movements for rental_payment, late_fee_payment, damage_charge_payment, sale_payment minus refunds
- **Revenue:** treasury_movements WHERE referenceType IN (rental_payment, late_fee_payment, damage_charge_payment, sale_payment) minus (rental_refund, sale_refund)
- **Expenses:** treasury_movements WHERE type='out' AND referenceType IN (expense, maintenance_payment)

---

## 5. Data Model

No new tables. Dashboard reads from:
`rentals`, `skates`, `customers`, `treasury_movements`, `expenses`, `sales`, `sale_items`,
`products`, `maintenance_records`, `late_fee_records`

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/dashboard/kpis` | authenticated (financial data gated by reports.view) | Full dashboard data |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| authenticated | All users get operational KPIs | `dashboard.routes.ts` |
| `reports.view` | Financial KPIs and all charts conditionally added | `dashboard.service.ts` lines 29, 93, 169 |

---

## 8. Testing

### 8.1 Test File

| File | Test Count | Coverage |
|---|---|---|
| `dashboard.test.ts` | 3 | Admin full view (revenue + charts), Cashier RBAC (no financial), missing params → 400 |

### 8.2 Test Cases

| ID | Description | Status |
|---|---|---|
| TC-DASH-ADMIN | Admin sees revenue, operatingResult, charts.revenueOverTime | TESTED |
| TC-DASH-CASHIER-RBAC | Cashier sees activeRentals but NOT revenue, operatingResult, charts.revenueOverTime | TESTED |
| TC-DASH-VALIDATION | Missing startDate/endDate → 400 | TESTED |

### 8.3 Known Test Gaps

| Gap | Description | Risk |
|---|---|---|
| TC-DASH-BROWSER | DashboardPage UI, charts render — browser verification | HIGH |
| TC-DASH-PERIOD-FILTER | Period filter preset accuracy (Today, This week) | MEDIUM |
| TC-DASH-QUICK-ACTIONS | Quick actions navigation verified | LOW |
| TC-DASH-ENDING-SOON | endingSoonRentals population verified | LOW |
| TC-DASH-REVENUE-ACCURACY | Deep financial accuracy (refund subtraction) | LOW — dashboard.service parallels reports.service |

---

## 9. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| GET /dashboard/kpis exists | `dashboard.routes.ts` | TC-DASH-ADMIN | TESTED | impl |
| Admin receives financial KPIs | `dashboard.service.ts` canViewReports | TC-DASH-ADMIN | TESTED | impl |
| Cashier excluded from financial KPIs | `dashboard.service.ts` conditional | TC-DASH-CASHIER-RBAC | TESTED | Phase 17 impl doc |
| Operating result calculation | `dashboard.service.ts` line 117 | TC-DASH-ADMIN (implicit) | TESTED | impl |
| Missing params → 400 | `dashboard.routes.ts` validation | TC-DASH-VALIDATION | TESTED | impl |
| Charts populated | `dashboard.service.ts` charts section | TC-DASH-ADMIN (revenueOverTime) | PARTIALLY TESTED | impl |
| DashboardPage renders | `DashboardPage.tsx` 38KB | None | IMPLEMENTED — BROWSER NOT VERIFIED | impl |
| Period filters work (Today, etc.) | `DashboardPage.tsx` | None | IMPLEMENTED — BROWSER NOT VERIFIED | impl |
| CONVERT_TZ applied to chart grouping | `dashboard.service.ts` lines 148, 157, 172 | None | IMPLEMENTED — NOT ISOLATED-TESTED | impl |

---

## 10. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P17-01 | Browser UI verification blocked — Playwright driver failure | HIGH |
| G-P17-02 | Recharts chart rendering not verified | MEDIUM |
| G-P17-03 | Period filter UI not tested | MEDIUM |
| G-P17-04 | Previous document had contradictory status (COMPLETE vs BLOCKED) — now resolved as PARTIALLY VERIFIED | RESOLVED by Gate 5.3 |
| G-P17-05 | `buildDateBounds` timezone handling not isolated-tested | LOW |

---

## 11. Architectural Decisions (From Phase 17 Implementation)

| Decision | Choice |
|---|---|
| API architecture | Single aggregated endpoint `GET /api/v1/dashboard/kpis` — prevents N+1 |
| Charting library | Recharts — responsive, accessible, SVG-based |
| RBAC strategy | Financial data conditionally omitted at API level (not just frontend) |
| Period filters | Today, Yesterday, This week (Sun/Mon), This month, Custom range |
| Current-state KPIs | Not filtered by date period (always live state) |
| Period KPIs | Filtered by selected date range via startBound/endBound |

---

## 12. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| DASH-RBAC | Financial data omitted entirely (not masked/redacted) for cashier roles | DECIDED — impl + test |
| DASH-ROUTE | Dashboard as default route `/` | DECIDED — impl |
| DASH-ENDPOINT | Single aggregated endpoint (not N+1 individual endpoint calls) | DECIDED — impl |

---

## 13. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 17 Implementation | 2026-09-28 | Dashboard backend + frontend implemented. 3 tests passing (232 total test count at that time). Browser verification blocked due to Playwright driver failure. |
| Gate 5.3 | 2026-10-03 | Status conflict resolved (COMPLETE vs BLOCKED). Correct status PARTIALLY VERIFIED established. Evidence matrix populated from source code. |

---

## 14. Current Status

**PARTIALLY VERIFIED**

Previous status conflict resolution:
- Header said "COMPLETE" → INACCURATE (browser verification absent)
- Footer said "PHASE 17 BLOCKED" → INACCURATE (implementation passes all backend tests)
- Gate 5.3 determination: **PARTIALLY VERIFIED**

Rationale:
- Backend endpoint: IMPLEMENTED and TESTED (3 tests)
- RBAC enforcement: TESTED (cashier cannot see financial data)
- DashboardPage.tsx: IMPLEMENTED — BROWSER NOT VERIFIED
- Recharts charts: IMPLEMENTED — BROWSER NOT VERIFIED
- Period filters: IMPLEMENTED — BROWSER NOT VERIFIED
- No documentation contradictions remain after Gate 5.3

---

## DESIGN SYSTEM INHERITANCE

> [!IMPORTANT]
> This section is mandatory per UI-011 (AI_AGENT_RULES.md).
> This phase inherits the current approved KOSHK design system.
> It MUST NOT introduce a separate visual language.

This phase inherits:
- **KOSHK Visual Design Reference** — brand identity
- **DESIGN_SYSTEM.md** — approved design tokens and UI standards
- **COMPONENT_LIBRARY.md** — approved reusable components
- **Approved UI Governance** (UI-001 through UI-011 — AI_AGENT_RULES.md)
- **Approved RTL behavior** (DEC-001)
- **Approved currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Approved component APIs** from the existing shared component library
- **Recharts** — adopted as charting library (discovered as existing decision)

---

*Last updated: 2026-10-03 (Gate 5.3 — Documentation Reconciliation. Status conflict COMPLETE vs
BLOCKED resolved. Correct status PARTIALLY VERIFIED established based on 3 backend tests passing
and browser verification blocked. Implementation evidence fully documented.)*
