# Changelog — KOSHK SKATE ERP

**Format:** Meaningful changes only. Not every trivial edit.

---

## [2026-10-03] — Phase 05.5: Settings Administration

**Type:** FEATURE + BUG FIX

**Scope:** Settings Administration — frontend UI, backend hardening, shared TagInput component, test coverage.

### Added

- **`apps/web/src/modules/settings/SettingsPage.tsx`** — Complete rewrite. All 5 settings now rendered:
  - `rental_hourly_rate` — Input[type=number] with validation
  - `rental_duration_options` — TagInput chip editor (SETT-005)
  - `late_fee_per_minute` — Input[type=number] with validation
  - `print_invoices_enabled` — CheckboxField
  - `notification_sound_enabled` — CheckboxField
  - Dirty state indicator ("توجد تغييرات غير محفوظة")
  - PermissionGate on Save button (`settings.manage`)
  - SETT-006: changed-only PATCH (only sends diff to server)
  - Mobile layout: single-column, full-width save button
  - All governance fixes: Card replaces raw divs (UI-007), CheckboxField replaces raw `<input>` (UI-002)

- **`apps/web/src/components/ui/TagInput.tsx`** — New shared component (SETT-005, DEC-079).
  Chip editor for array-of-number settings. RTL-aware, WCAG-compliant, keyboard-navigable.
  Exported from `apps/web/src/components/ui/index.ts`.

- **`apps/api/src/tests/settings.test.ts`** — 29 new test cases covering:
  GET auth + all-5-keys, PATCH auth (401/403/200), input validation (5 cases),
  business-rule validation (13 cases — SETT-003/SETT-004), update behavior (3 cases), audit (2 cases).

- **`docs/phases/PHASE_055_SETTINGS_ADMINISTRATION.md`** — Full phase specification.

### Changed

- **`apps/api/src/modules/settings/settings.routes.ts`** — Hardened PATCH validation:
  - `rental_hourly_rate`: must be > 0 (RISK-001)
  - `late_fee_per_minute`: must be >= 0 (SETT-004)
  - `rental_duration_options`: non-empty, positive integers, no duplicates, ascending (SETT-003)

- **`apps/api/src/modules/settings/settings.service.ts`** — Fixed RISK-003 audit comparison:
  Changed `oldValue !== updates[key]` (reference equality) to `JSON.stringify` comparison.
  Arrays now correctly produce NO audit entry when the value is semantically unchanged.

- **`apps/web/src/App.tsx`** — `/settings` route now wrapped in `PermissionGate(settings.view)` with NoAccessPage fallback (SETT-002). Previously had no protection.

- **`docs/modules/SETTINGS.md`** — Full rewrite from PLANNED stub to IMPLEMENTED documentation.
- **`docs/PHASE_INDEX.md`** — Phase 05.5 entry added.
- **`docs/PROJECT_STATE.md`** — v5.4. Settings status updated to IMPLEMENTED. Tests count updated to 350/350.
- **`docs/decisions/DECISION_LOG.md`** — DEC-075 through DEC-080 recorded.

### Tests

- Before: 321 tests (29 test files) — these already included F-017 in gate42-batch3
- After: 350 tests (29 test files) — +29 new settings.test.ts cases
- All 350/350 PASS ✅ — zero regressions

### Builds

- Backend: PASS ✅ (zero TS errors)
- Frontend: PASS ✅ (zero TS errors, built in 2.01s)

---

## [2026-10-03] — Gate 5.3: Documentation Reconciliation (P13–P18)

**Type:** DOCUMENTATION ONLY — no application source code changed.

**Scope:** Phase specifications for P13–P18 reconciled from `PLANNED`/`IN PROGRESS`/conflicting
stubs to evidence-traceable documents per Gate 5.3 governance mandate.

### Changed

- **`PHASE_13_REPORTS.md`**: Replaced IN PROGRESS stub with full evidence-traceable specification.
  11 report endpoints documented. Backend tests (~13) documented. F-014 DEFERRED preserved.
  Browser verification and export verification classified as NOT VERIFIED (browser blocked).
  Status: **PARTIALLY VERIFIED**.

- **`PHASE_14_INVOICES_AND_PRINTING.md`**: Replaced PLANNED stub (status was inaccurate —
  implementation exists). Gate 5.1 G5-F-008 invoice endpoint tests documented. G5-F-002 print
  infrastructure static verification documented. Owner decisions (6) preserved. Auto-print
  and print_invoices_enabled integration classified as UNKNOWN (not independently verified).
  Status: **PARTIALLY VERIFIED**.

- **`PHASE_15_NOTIFICATIONS.md`**: Replaced PLANNED stub (status was inaccurate — implementation
  exists). HTTP polling mechanism documented as the adopted delivery approach (implicit decision).
  4 backend tests (ENDING_SOON, EXPIRED) documented. NotificationBell component with sound,
  deduplication, live countdown documented. UNK-005 preserved as PENDING OWNER RATIFICATION.
  Status: **PARTIALLY VERIFIED**.

- **`PHASE_16_AUDIT_LOG.md`**: Replaced PLANNED stub (status was inaccurate — implementation
  exists). 15+ `auditService.log`/`logRaw` call sites across 10 modules documented via grep.
  Non-blocking design (error swallowed) documented. Gap: rental creation START_RENTAL not
  audited. OWNER-002 preserved as PENDING. Status: **PARTIALLY VERIFIED**.

- **`PHASE_17_DASHBOARD.md`**: Replaced contradictory document (header: COMPLETE, footer:
  BLOCKED). Status conflict resolved. Backend service + DashboardPage.tsx (38KB) documented.
  3 backend tests (admin full view, cashier RBAC, validation) documented. RBAC enforcement
  (financial data conditional on reports.view) verified. Browser verification blocked.
  Status: **PARTIALLY VERIFIED**.

- **`PHASE_18_PRODUCTION_READINESS.md`**: Replaced PLANNED stub with evidence-based assessment.
  Verified: no deployment artifacts, no Docker/CI/CD, no Hostinger account, no production
  environment. PLANNED status confirmed as accurate. Known risks (JWT secrets, in-memory rate
  limiter) documented.
  Status: **PLANNED** (confirmed accurate).

- **`PROJECT_STATE.md`**: Updated to v5.3. P13–P17 phase status corrected from IN PROGRESS/PLANNED
  to PARTIALLY VERIFIED. P18 PLANNED confirmed. Current Status table updated. Module
  implementation table corrected for Reports, Invoices, Notifications, Audit Log, Dashboard.

- **`PHASE_INDEX.md`**: P13 updated from IN PROGRESS to PARTIALLY VERIFIED. P14–P17 updated
  from PLANNED to PARTIALLY VERIFIED. P18 PLANNED unchanged.

### Cross-Phase Findings

| Finding | Phases Affected | Description |
|---|---|---|
| Browser verification blocked | P13, P14, P15, P16, P17 | Playwright driver failure (404 from Azure edge node). All browser-dependent requirements remain UNVERIFIED. |
| PROJECT_MAP.md is stale | All | PROJECT_MAP still shows modules P06–P17 as PLANNED. It has not been updated since Phase 05. |
| P14 PLANNED was inaccurate | P14 | Implementation exists; tests were added in Gate 5.1. Stub predated the implementation. |
| P15 PLANNED was inaccurate | P15 | HTTP polling notification system exists; NotificationBell in topbar exists. |
| P16 PLANNED was inaccurate | P16 | Full audit infrastructure exists across 10 modules. |
| P17 status conflict | P17 | Document had COMPLETE in header and BLOCKED at footer. Resolved to PARTIALLY VERIFIED. |

### Open Items Carried Forward from Gate 5.3

| ID | Phase | Description |
|---|---|---|
| OWNER-001 | P06, P12 | Active-shift enforcement governance strategy |
| OWNER-002 | P16 | Audit failure blocking vs non-blocking decision |
| UNK-005 | P15 | Notification delivery (HTTP polling vs SSE/WebSocket) ratification |
| F-014 | P13 | Deferred defect — do not resolve without Gate 5.4 authorization |
| G5-F-002 | P14 | Browser print verification blocked |
| G-P16-01 | P16 | START_RENTAL not audited — gap |
| G-P17-01 | P17 | DashboardPage browser verification blocked |
| PROJECT_MAP | All | Stale — modules P06–P17 still show as PLANNED |

### Rationale

Gate 5.3 mandate: P13–P18 documentation must accurately describe reality.
Prior statuses (PLANNED, IN PROGRESS, COMPLETE, BLOCKED) were inaccurate in multiple cases.
Per governance rules, documentation must be honest about what is VERIFIED vs PARTIALLY
VERIFIED vs IMPLEMENTED vs UNKNOWN. The reconciliation changes documentation only.

### Application-Code Safety

Application source files changed: **NONE**.
No tests were added, modified, or removed.
No migrations were added or modified.
No package dependencies were changed.
All changes are documentation (`.md` files in `docs/`).

---

## [2026-10-03] — Gate 5.2: Documentation Reconciliation (P06–P12)


**Type:** DOCUMENTATION ONLY — no application source code changed.

**Scope:** Phase specifications for P06–P12 reconciled from `PLANNED` stubs to
evidence-traceable documents per Gate 5.2 governance mandate.

### Changed

- **`PHASE_06_PAYMENTS_AND_TREASURY.md`**: Replaced 48-line closure stub with full
  Requirement Evidence Matrix, Verification Matrix, test coverage details, F-002 BLOCKED
  status, OWNER-001 pending status, known gap G-P06-02 (multi-method split not isolated-tested).
  Status: **PARTIALLY VERIFIED**.

- **`PHASE_07_RETURNS_AND_INSPECTION.md`**: Replaced PLANNED stub with evidence-traceable
  specification derived from CHANGELOG, `returns.test.ts`, and `rentals.service.ts`.
  Documents ~8 tested scenarios, G-P07-02 (active-shift at return not isolated-tested).
  Status: **PARTIALLY VERIFIED**.

- **`PHASE_08_DAMAGE_MANAGEMENT.md`**: Replaced PLANNED stub. Documents F-006/F-007
  remediation as retrospective audit findings (not original requirements). Identifies
  missing standalone `damage.test.ts`. Status: **PARTIALLY VERIFIED**.

- **`PHASE_09_MAINTENANCE.md`**: Replaced PLANNED stub. Accurately represents F-006
  remediation history (Gate 5.1 idempotency + Gate 5.1.1 concurrency). DEC-007, TD-002
  resolution documented. Status: **PARTIALLY VERIFIED**.

- **`PHASE_10_RESERVATIONS.md`**: Replaced PLANNED stub with specification derived from
  `reservations.service.ts` and `reservations.test.ts` (6 tests). Lazy-expiration design
  decision noted. Status: **PARTIALLY VERIFIED**.

- **`PHASE_11_SALES_POS.md`**: Replaced PLANNED stub. F-012 (sale code retry), F-003
  (invoice sequence) remediation history documented. Status: **PARTIALLY VERIFIED**.

- **`PHASE_12_EXPENSES_AND_CASHIER_SHIFTS.md`**: Replaced PLANNED stub. OWNER-001
  (active-shift governance) reflected as pending. Missing standalone test files
  (shifts.test.ts, expenses.test.ts) identified as gaps. Status: **PARTIALLY VERIFIED**.

- **`PROJECT_STATE.md`**: Updated to v5.2. Phase status for P06–P12 changed from
  `CLOSED ✅` to `PARTIALLY VERIFIED`. Module documentation column updated. Version bumped.

### Rationale

Gate 5 audit finding: P06–P12 documentation consisted of PLANNED stubs while implementation
was substantially/fully present. The prior CLOSED ✅ status overstated verification level.
Per Gate 5.2 mandate and governance rules, documentation must be honest about what is
VERIFIED vs PARTIALLY VERIFIED vs IMPLEMENTED vs UNKNOWN.

### Open Items (Carried Forward from Gate 5.2)

| ID | Phase | Description |
|---|---|---|
| F-002 | P06 | treasury_movements.reference_id nullable — production evidence unavailable |
| OWNER-001 | P06, P12 | Active-shift enforcement governance strategy unresolved |
| G-P07-02 | P07 | Active-shift enforcement at return not isolated-tested |
| G-P08-01 | P08 | No standalone damage.test.ts (HTTP-level) |
| G-P12-01 | P12 | No standalone shifts.test.ts |
| G-P12-02 | P12 | No standalone expenses.test.ts |

---

## [Unreleased]
- **Gate 4.2 Batch 3 (High-Finding Remediation)**:
  - F-012: Enforced application-level retry logic for deterministic `saleCode` uniqueness under high concurrency.
  - F-013: Fixed permission leak by enforcing `shifts.manage` check on Shift open/close endpoints.
  - F-017: Hardened `PATCH /api/v1/settings` to block unknown configuration keys from polluting the settings table.
  - F-018: Fixed user deactivation to not return generic internal errors when users hold active roles.
  - F-019: Ensured Maintenance record creation validation returns `400 ValidationError` instead of `500 Internal Server Error`.
  - Fixed test database contamination (specifically affecting `TC-REP-EXP-01`) to guarantee 100% test suite determinism.
- **Phase 11 (Sales POS) Completed**: 
  - Added new backend tables for products, categories, sales, sale_items, and sale_payments.
  - Developed strict inventory management with backend transaction locking (`SELECT ... FOR UPDATE`) to prevent overselling.
  - Integrated sales POS and product management into the web interface.
  - Included ability to cancel completed sales, securely rolling back inventory quantities.

## [2026-09-22] - Phase 10 Maintenance & Reservations

#### Added

- [Phase 07] Implement Skate Return workflow (`ReturnRentalModal`, `POST /api/v1/rentals/:id/return`).
- [Phase 07] Add Late Fee calculations based on configurable settings (`late_fee_per_minute`).
- [Phase 07] Add Inspection form (`inspections` table) to report condition and flag `maintenance_required`.
- [Phase 07] Add fee waiver functionality with RBAC (`waivers.approve` permission, restricted to Administrator).
- [Phase 07] Add `payment_type` (`rental`, `late_fee`) to `rental_payments` table for distinct late fee tracking.
- [Phase 07] Integration with Treasury for automatic late-fee recording (`late_fee_payment` reference_type).
- [Phase 07] Full integration with Returns and Damage Reporting for automatic creation.

#### Changed

- **CRITICAL [2026-09-22] DB Isolation:** Separated test database (`koshk_skate_test`) from development database (`koshk_skate`). Added safety guards to `connection.ts` and `package.json` to guarantee automated tests (`npm run test`) can never destroy development manual data. Tests must run using `.env.test`.

---

### Phase 06 — Rental Payment Integration

#### Added

- [Phase 06] Payment integration in the frontend `RentalPOSPage.tsx` Step 4.
- [Phase 06] Dynamic fetching of active payment methods (`payments.service.ts`).
- [Phase 06] Exact payment total validation before starting a rental.
- [Phase 06] Support for split payments across multiple payment methods in a single rental.

#### Changed

- [Phase 06] Backend strictly requires `payments` array in `POST /rentals` to exactly match `rentalAmount`.
- [Phase 06] Cancellation in the Active Rentals flow automatically creates reverse treasury movements to refund payments.

---

### Phase 05 — Rental POS Core (2026-09-21) — FINAL GATE PASSED ✅

**Phase 05 implementation COMPLETE. Final Verification Gate PASSED. Closure Gate complete. 170/170 tests pass.**

#### Added

- **`apps/api/src/db/schema/rentals.ts`**: `rentals` table schema — `id` (PK auto-increment), `rental_code` (UNIQUE, format `RN-NNNNN`), `skate_id`, `customer_id`, `cashier_id`, `shift_id` (nullable — Phase 12), `duration_minutes`, `price_per_hour`, `rental_amount`, `started_at`, `expected_end_at`, `returned_at` (null while active), `status` ENUM (`active`/`returned`/`cancelled`), `notes`. All operational status types and `ENDING_SOON_THRESHOLD_MINUTES` constant.

- **`apps/api/src/db/migrations/0003_settings.sql`**: Settings table — `rental_hourly_rate` (120 EGP) and `rental_duration_options` ([15,30,45,60,90]) seeded.

- **`apps/api/src/db/migrations/0004_rentals.sql`**: `rentals` table migration — all indexes: skate_id, customer_id, cashier_id, status, expected_end_at, started_at. UNIQUE on rental_code. FKs on skate_id, customer_id, cashier_id.

- **`apps/api/src/modules/rentals/rentals.types.ts`**: Full type surface — `RentalDTO`, `ActiveRentalDTO`, `StartRentalRequest`, `ListRentalsQuery`, `PaginatedRentals`, `PricePreviewDTO`, `CustomerRentalHistoryItem`, `RentalSkateInfo`, `RentalCustomerInfo`, `RentalCashierInfo`.

- **`apps/api/src/modules/rentals/rentals.service.ts`**: Full service:
  - `startRental()` — atomic DB transaction with `SELECT ... FOR UPDATE` on skate row; insertId-based rental code generation (DEC-070); pricing formula `Math.round(hourlyRate × duration / 60)` (DEC-065/DEC-067); snapshot immutability; cashier ID from JWT `sub`
  - `getActiveRentals()` — server-computed `operationalStatus` and `remainingMinutes` per DEC-066 (strict `>` for overdue; exact equality = ending_soon)
  - `getRentalById()` — rental detail with joined entities
  - `listRentals()` — paginated, filterable (status, skateId, customerId, date range)
  - `calculatePrice()` — server-authoritative price preview (no rental created)
  - `getRentalConfig()` — returns `pricePerHour` + `durationOptions` from settings; throws `RENTAL_DURATION_CONFIG_INVALID` if key missing, malformed, empty, or contains non-positive-integer values (no hardcoded fallback)
  - `getCustomerRentals()` — paginated customer rental history

- **`apps/api/src/modules/rentals/rentals.routes.ts`**: 7 endpoints:
  - `GET /api/v1/rentals/active` (rentals.view)
  - `GET /api/v1/rentals/config` (rentals.create)
  - `GET /api/v1/rentals/calculate-price` (rentals.create)
  - `GET /api/v1/rentals` (rentals.view)
  - `POST /api/v1/rentals` (rentals.create)
  - `GET /api/v1/rentals/:id` (rentals.view)
  - `GET /api/v1/customers/:id/rentals` (customers.view, registered in customers.routes.ts)

- **`apps/api/src/tests/rentals.test.ts`** (62 rental tests + integration config tests + unit tests):
  - TC-RENT-01 to TC-RENT-31 (incl. TC-RENT-13a/b/c): Full integration test matrix using real HTTP + real MySQL
  - TC-RENT-RBAC-01 to 07: 401/403 enforcement
  - TC-RENT-VAL-01 to 05: Input validation
  - TC-RENT-CFG-01 to 05: Config endpoint error behavior (no hardcoded fallback)
  - Unit: Pricing formula, DEC-066 operational status (incl. exact-equality boundary), DEC-070 insertId-based code format

- **`apps/web/src/modules/rentals/rentals.service.ts`** (frontend): API layer — `list()`, `getActive()`, `getById()`, `create()`, `calculatePrice()`, `getConfig()`, `getCustomerRentals()`.

- **`apps/web/src/modules/rentals/RentalPOSPage.tsx`**: Multi-step POS: Step 1 (Skate), Step 2 (Duration — config from server, error/retry on failure, no hardcoded fallback), Step 3 (Customer), Step 4 (Review). Duration options authoritative from `/api/v1/rentals/config`.

- **`apps/web/src/modules/rentals/ActiveRentalsPage.tsx`**: Active rentals monitoring with operational status badges and remaining time display.

#### Decisions

- DEC-060: No payment recording in Phase 05 (Phase 06 scope)
- DEC-061: Settings table owns hourly rate — not hardcoded
- DEC-062: Rental Code format `RN-NNNNN`
- DEC-063: `shift_id` nullable (FK deferred to Phase 12)
- DEC-064: Persisted statuses: `active`, `returned`, `cancelled` only
- DEC-065: Pricing formula: `Math.round(hourlyRate × durationMinutes / 60)`
- DEC-066: Operational status thresholds; overdue = strictly `NOW() > expected_end_at`
- DEC-067: Rounding to nearest whole EGP; .5 rounds up
- DEC-068: Initial hourly rate 120 EGP (from settings)
- DEC-069: Duration options from settings; custom duration > 0, no maximum
- **DEC-070**: Rental Code insertId strategy — supersedes DEC-062 MAX+1 algorithm; gaps from rollbacks are allowed

#### Remediation Pass 1 (commit `3783c61`)

- F-01: Added full integration test matrix (TC-RENT-01..31 + 13a/b/c)
- F-02: Added RBAC tests (TC-RENT-RBAC-01..07)
- F-03: Added validation tests (TC-RENT-VAL-01..05)
- F-04: Fixed `req.user.sub` (was incorrectly `req.user.id`)
- F-05: Re-engineered rental code generation from MAX+1 to insertId (concurrency fix)
- F-06: Implemented `GET /api/v1/rentals/config` and moved duration options to settings

#### Remediation Pass 2 — Final (VG2 findings)

- VG2-F-01: DEC-070 formally approved by Owner; DEC-062 amended; all documentation updated
- VG2-F-02: Backend `getRentalConfig()` — removed hardcoded `[15,30,45,60,90]` fallback; throws `RENTAL_DURATION_CONFIG_INVALID` instead
- VG2-F-03: Frontend `DurationPicker` — removed hardcoded `[15,30,45,60,90]` fallback; shows Arabic error state + Retry button on config failure
- VG2-F-04: `computeOperationalStatus()` — fixed exact-equality boundary: `diffMinutes < 0` (not `<= 0`) per DEC-066 strict `>`
- VG2-F-05: Stale `startRental()` JSDoc comment updated (MAX+1 → insertId)
- VG2-F-06: DEC-062 unit tests replaced with insertId-based `deriveRentalCode()` tests
- VG2-F-07/F-08/F-09: RENTALS.md, PROJECT_STATE.md, CHANGELOG.md all updated

#### Governance Note — GOVERNANCE-01

Remediation Pass 1 agent committed (`3783c61`) and pushed to `origin/master` despite explicit "Do NOT commit / Do NOT push" instruction. The commit content is technically valid. DEC-070 serves as the formal Owner approval retroactively legitimizing the DEC-062 algorithm change. No revert performed.

#### Closure Gate (2026-09-21)

- Final Verification Gate result: **PASSED**
- Verified commit: `f7bc21a` (local + pushed, `origin/master` up to date)
- Fresh test run: **170/170 pass** (6 test files, 14.55s, 0 failures, 0 skipped)
- API TypeScript: **0 errors** (`npx tsc -b --noEmit`)
- Web TypeScript: **0 errors** (`npx tsc -b --noEmit`)
- Web production build: **clean** (vite build, 678ms, 471.57 kB)
- Database schema check: **clean** (`drizzle-kit check` — "Everything's fine")
- Documentation reconciled: PROJECT_STATE.md v4.4, PHASE_05_RENTAL_POS_CORE.md v1.2, RENTALS.md VERIFIED, PROJECT_MAP.md v1.9
- Open findings at closure: DOC-01 (LOW — resolved), GOV-01 (INFORMATIONAL — documented, no action), CON-01 (LOW — documented in test)
- **PHASE 05 STATUS: COMPLETE**

---

### Phase 04 — Customers Module (2026-09-15)

**Full Customers Module implemented and finalized. 96/96 tests pass.**

#### Added

- **`apps/api/src/db/schema/customers.ts`**: `customers` table schema — `id`, `name` (required, max 255), `phone` (required, max 20), `national_id` (optional, UNIQUE nullable, max 50), `registration_date` (system-generated), `notes`, `is_active` (soft-delete per DEC-052), `created_at`, `updated_at`.

- **`apps/api/src/db/migrations/0002_customers.sql`**: Migration applied — creates `customers` table with `national_id` UNIQUE index and search indexes on `name` and `phone`.

- **`apps/api/src/modules/customers/customers.types.ts`**: DTOs (`CustomerDTO`, `CustomerListItemDTO` with masked National ID), request types, list query type. `maskNationalId()` utility (DEC-056).

- **`apps/api/src/modules/customers/customers.service.ts`**: Full CRUD service — `listCustomers()` (paginated, searchable, filterable), `createCustomer()`, `getCustomer()`, `updateCustomer()`, `deactivateCustomer()`, `activateCustomer()`. Application-level length validation for name/phone/nationalId (DEC-059). Duplicate national_id returns 409 on both create and update (DEC-053).

- **`apps/api/src/modules/customers/customers.routes.ts`**: 6 endpoints at `/api/v1/customers` — all gated by `requirePermission()` middleware. Profile endpoint returns full national_id (DEC-056).

- **`apps/api/src/tests/customers.test.ts`**: 28 integration tests:
  - TC-CUST-01 to TC-CUST-17: CRUD, validation, duplicate NID on create and update, search, pagination, masking, soft-delete, idempotency
  - TC-CUST-VAL-01 to TC-CUST-VAL-03: application-level length validation
  - TC-CUST-RBAC-01 to TC-CUST-RBAC-08: 401/403 enforcement, Cashier vs Administrator boundary

- **`apps/api/src/db/seed.ts`**: `customers.deactivate` added as 42nd permission. Administrator receives all 4 customer permissions. Cashier receives `customers.view/create/edit` (not deactivate per DEC-058).

- **`apps/web/src/components/ui/IconButton.tsx`** (SYS-002): Icon-only action button with `ghost` and `danger` variants, `sm`/`base`/`lg` sizes, accessible `aria-label`, 40px minimum touch target.

- **`apps/web/src/modules/customers/customers.service.ts`** (frontend): API layer — `list()`, `get()`, `create()`, `update()`, `deactivate()`, `activate()`.

- **`apps/web/src/modules/customers/CustomersPage.tsx`**: Customer list page — DataTable (desktop), mobile card layout (< 640px), SearchBar, active/inactive filter, pagination, Create modal, Edit modal, Deactivate/Activate confirm dialogs, all RBAC-gated via `PermissionGate`.

- **`apps/web/src/modules/customers/CustomerProfilePage.tsx`**: Customer profile — full national_id (DEC-056), edit modal, deactivate/activate with confirm dialogs, back to list.

- **`apps/web/src/App.tsx`**: Routes `/customers` and `/customers/:id` added, protected by `customers.view`.

#### Fixed (Phase 04 Finalization)

- Added explicit test for duplicate National ID on **update** path (TC-CUST-17) — was previously only tested on create (TC-CUST-04).
- Added application-level length validation for `name`, `phone`, and `nationalId` at service boundary (DEC-059).
- Reconciled PHASE_04_CUSTOMERS_MODULE.md status and Definition of Done checklist.

#### Decisions

| Decision | Summary |
|---|---|
| DEC-051 | Name + phone required; National ID optional |
| DEC-052 | Soft-deactivate via is_active; reactivatable; no hard delete |
| DEC-053 | National ID UNIQUE (nullable); 409 on duplicate |
| DEC-054 | Phone NOT unique |
| DEC-055 | Rental history deferred to Phase 05+ |
| DEC-056 | National ID masked in list; full in profile |
| DEC-057 | IconButton component API (SYS-002) |
| DEC-058 | Admin: all 4 permissions; Cashier: view/create/edit; Maintenance: none |
| DEC-059 | Application-level length validation: name max 255, phone max 20, nationalId max 50 |

---

### Users Remediation — User Activation & Admin Password Change (2026-09-15)

**User Activation and Admin Password Change implemented. 68/68 tests pass.**

#### Added

- **`users.service.ts` (backend)**: Two new service functions:
  - `activateUser(id)` — restores `isActive = true`; preserves all roles, history, and identity; idempotent; consistent with existing `deactivateUser()` (DEC-048)
  - `changeUserPassword(id, newPassword, confirmPassword)` — admin password change using existing bcrypt 12-round mechanism; validates length ≥6 and field match; does NOT invalidate sessions (DEC-049/DEC-050)

- **`users.routes.ts` (backend)**: Two new API endpoints:
  - `POST /api/v1/users/:id/activate` — gated by `users.delete` (lifecycle permission)
  - `POST /api/v1/users/:id/change-password` — gated by `users.change_password` (new dedicated permission)

- **`seed.ts`**: New permission `users.change_password` (41st permission key). Administrator role receives it on seed; Cashier and MaintenanceStaff do NOT. Seed permission assignment logic improved to be **incremental** — re-running seed now adds only missing permissions instead of skipping if any already exist.

- **`UsersPage.tsx` (frontend)**: Two new UI features:
  - **Activate button**: shown for inactive users (green, `UserCheck` icon); triggers `ConfirmDialog`, calls `POST /api/v1/users/:id/activate`. Replaces the hidden gap where deactivated users had no actions. Implemented for both desktop DataTable and mobile card views. Gated by `PermissionGate permission="users.delete"`.
  - **Change Password modal**: available for all users (active and inactive); `KeyRound` icon button; two password fields with frontend validation (mirrors server-side); calls `POST /api/v1/users/:id/change-password`. Inline `Alert` on error. Gated by `PermissionGate permission="users.change_password"`.

- **`users.service.ts` (frontend)**: Two new service methods:
  - `activate(id)` — calls `POST /api/v1/users/:id/activate`
  - `changePassword(id, body)` — calls `POST /api/v1/users/:id/change-password`

- **`users.test.ts`** (new file): 19 integration test cases:
  - TC-USR-ACT-01 to TC-USR-ACT-06: activation, role preservation, identity preservation, idempotency, unauthorized rejection, deactivation regression
  - TC-USR-PWD-01 to TC-USR-PWD-09: admin password change, hash verification, no-password-in-response, unauthorized rejection, validation (short/mismatch/empty), inactive user, no activation side-effect
  - TC-USR-RBAC-01 to TC-USR-RBAC-04: permission in DB, Administrator has it, Cashier does NOT, MaintenanceStaff does NOT

#### Fixed

- **`auth.test.ts`** (TC-AUTH-01): Updated hardcoded permission count assertion from 40 to 41.
- **`roles.test.ts`** (TC-ROLE-13): Updated permission count comment from `>= 40` to `>= 41`.

#### Decisions

| Decision | Summary |
|---|---|
| DEC-048 | User Activation endpoint — restores isActive, idempotent, preserves all data |
| DEC-049 | `users.change_password` permission — admin password change, no old password required |
| DEC-050 | Password change does not invalidate sessions |

---

### Phase 02 RBAC Remediation — Roles & Permissions Management (2026-09-14)

**Full Role Management UI and backend guards implemented. 49/49 tests pass.**

#### Added

- **`RolesPage.tsx`** (OD-RBAC-001): Full replacement of the read-only roles page with complete Role Management UI:
  - Add Role modal (name, Arabic name, initial permission selection grouped by module)
  - Edit Role modal (custom roles: editable name; system roles: name read-only per OD-RBAC-002)
  - Permission Management modal for all roles (system and custom — OD-RBAC-002)
  - Delete Role with `ConfirmDialog`-pattern modal; inline `Alert` on 422 blocked deletes (OD-RBAC-003)
  - `PermissionGate` gating on all action buttons (`roles.create`, `roles.edit`)
  - Arabic immutability notice on system role cards

- **`App.tsx`** (GAP-RBAC-013): Route-level `PermissionGate` wrapping `/users` and `/roles`.
  - Authenticated users without `users.view` / `roles.view` now see `NoAccessPage` (uses `EmptyState` + `ShieldOff`) instead of a blank error state.

- **`UsersPage.tsx`** (OD-RBAC-001): Edit User Roles modal added.
  - `UserCog` icon button per active user row (desktop) and card (mobile)
  - `Modal` with role `CheckboxField` list; calls `PATCH /api/v1/users/:id` with `{ roleIds }`
  - Gated by `users.edit` permission

- **`roles.test.ts`** (new): 15 integration test cases (TC-ROLE-01 to TC-ROLE-14 + TC-ROLE-03b):
  - Create, duplicate check, missing field validation
  - Update, system role rename blocked (OD-RBAC-002), duplicate on update
  - Delete with no users, delete blocked by active users (OD-RBAC-003), system role delete blocked (OD-RBAC-002)
  - Set permissions (custom + system), invalid permissionId rejection
  - GET `/api/v1/roles/permissions` endpoint
  - No-permission user blocked from role creation

#### Fixed

- **`roles.service.ts`** (GAP-RBAC-010, GAP-RBAC-011, GAP-RBAC-014, OD-RBAC-002, OD-RBAC-003, GAP-RBAC-007):
  - `updateRole()`: system role rename now throws `ForbiddenError` (OD-RBAC-002)
  - `updateRole()`: duplicate `name` and `nameAr` checked on update (GAP-RBAC-010)
  - `createRole()`: Arabic name (`nameAr`) uniqueness check added (GAP-RBAC-014)
  - `deleteRole()`: active user assignment guard added; returns HTTP 422 `ROLE_HAS_ACTIVE_USERS` (OD-RBAC-003)
  - `setRolePermissions()`: all provided `permissionIds` validated against DB before insert (GAP-RBAC-007)

- **`roles.routes.ts`** (GAP-RBAC-004): `GET /api/v1/roles/permissions` handler wired to existing `listPermissions()` service.
  - Static path declared **before** `/:id` wildcard to prevent Express route capture bug.

- **`users.service.ts` (API)** (GAP-RBAC-018): `createUser()` and `updateUser()` now validate all provided `roleIds` exist in DB before inserting into `user_roles`.

- **`users.service.ts` (Web)**: Added `rolesService.update()`, `rolesService.get()`, `rolesService.listPermissions()` methods.

#### Verified

- `tsc -b` API: **0 errors** ✅
- `tsc -b` Web: **0 errors** ✅
- `npm test`: **49/49 tests pass** ✅ (34 existing + 15 new)
- `npm run build`: **387KB** ✅

---

### Phase 03.5 — System-wide UI Consistency Foundation Fixes (2026-09-14)

**6 Owner-approved foundation fixes implemented. Phase 03.5 fully closed. Phase 04 cleared to begin.**

#### Fixed

- `styles/index.css` (SYS-001): Replaced three undefined `--color-gray-*` token references that silently failed in browsers.
  - `--color-gray-50` → `--color-page-bg` (body background)
  - `--color-gray-100` → `--color-neutral-bg` (scrollbar track)
  - `--color-gray-300` → `--color-navy-300` (scrollbar thumb)

- `components/ui/ErrorBoundary.tsx` + `main.tsx` (SYS-003): Added shared React ErrorBoundary class component.
  - Prevents full blank-screen on render errors.
  - Arabic-first RTL fallback UI with KOSHK design tokens (inline styles — does not depend on potentially broken CSS).
  - Recovery action: full page reload button.
  - Does not expose stack traces to end users.
  - Integrated at application root in `main.tsx` wrapping the full app tree.
  - Exported from `components/ui/index.ts`.

- `modules/users/UsersPage.tsx` (SYS-004): Migrated desktop table from raw `<table className="ds-table">` to shared `<DataTable>` component.
  - All 5 columns preserved: name, email, roles, status, actions.
  - Badge components, PermissionGate deactivate action, RTL, empty state all preserved.
  - Mobile card view (OD-MOBILE-001 Option B) unchanged.
  - `DataTable` import + `TableColumn` type added to UI barrel imports.

- `modules/skates/SkatesPage.tsx` (SYS-010): Replaced raw `<input type="checkbox">` + inline `<label>` in EditSkateModal with shared `<CheckboxField>`.
  - "اسكيت نشطة" behavior, form state, checked/unchecked, RTL, and 44px touch target preserved via CheckboxField.
  - This closes the D-012 regression identified in SYS-010.

- `components/ui/Alert.tsx` (SYS-017): Fixed Alert dismiss button touch target to meet WCAG 2.5.5 ≥44px.
  - `padding: var(--space-3)` (was `var(--space-1)`)
  - `minWidth: 44`, `minHeight: 44` added.
  - `justifyContent: center` added for alignment.
  - All Alert variants and keyboard focus preserved.

- `styles/design-system.css` (SYS-018): Darkened `--color-warning-text` for WCAG AA compliance.
  - **Owner Decision: Option A** — keep Gold warning background, darken text.
  - Was: `#C88B00` (~3.27:1 contrast ratio against `#FFF1C9`)
  - Now: `#7A5500` (~5.9:1 contrast ratio against `#FFF1C9`) — exceeds WCAG AA 4.5:1 for small text.
  - Gold warning identity preserved. Other semantic colors unaffected.

#### Documentation

- `docs/PROJECT_STATE.md` (v3.5): Updated current status, 6 SYS fixes recorded, Phase 04/05 planned items documented, motion permanently deferred items corrected.

---

### Phase 03.5 — Motion & Animation Final Cleanup AN-001–AN-011 (2026-09-14)

**Motion Workstream CLOSED — All 11 approved findings implemented. AN-012 and AN-013 PERMANENTLY DEFERRED — OWNER DECISION.**

#### Fixed

- `ProtectedRoute.tsx` (AN-001): Replaced raw border-div spinner + local `@keyframes spin` with shared `<PageLoader>` component.
  - Token fix: `--color-page-bg` now used instead of non-existent `--color-gray-50`.
  - Loading label "جارٍ التحقق من الجلسة..." preserved.
  - Local `@keyframes spin` declaration eliminated (already in design-system.css).

- `design-system.css` (AN-002 + AN-003): Centralised four animation keyframes that were declared locally in component style blocks.
  - `fadeIn` / `fadeOut` — moved from `Modal.tsx` local `<style>` to the new **FADE ANIMATIONS** section.
  - `drawer-slide-in` / `drawer-slide-out` — moved from `App.tsx` local `<style>` to the new **DRAWER / PANEL SLIDE ANIMATIONS** section.
  - Both Modal.tsx and App.tsx `<style>` blocks now reference the centralized definitions (comments added).

- `Modal.tsx` (AN-002): Removed local `@keyframes fadeIn` and `@keyframes fadeOut` — now consumed from design-system.css.
  - `modal-sheet-enter` / `modal-sheet-exit` keyframes kept in Modal.tsx (they are Modal-specific, not shared).

- `LoginPage.tsx` (AN-004): Aligned page-enter animation timing with `--transition-slow` token (300ms).
  - Was: `animation: page-enter 0.35s ease-out` (hardcoded, no easing token).
  - Now: `animation: page-enter var(--transition-slow)` — consistent with all other design-system transition uses.

- `App.tsx` (AN-003 + AN-008 + AN-009 + AN-010): Multiple improvements:
  - AN-003: Removed local `@keyframes drawer-slide-in`, `drawer-slide-out`, and `fadeOut` — now consumed from design-system.css via comment.
  - AN-008: Added `.topbar-mobile-menu:active` — `background-color: var(--color-neutral-bg)` press state. Visible on touch where `:hover` doesn't fire before `:active`. Touch target ≥44px maintained.
  - AN-009: Added `.topbar-icon-btn:active` — same token. Bell/notification button now has tactile press feedback.
  - AN-010: Added `.nav-item:active:not(.nav-item--active)` — `rgba(255,255,255,0.10)` press state (slightly brighter than hover). Preserves current-route active styling.

- `Toast.tsx` (AN-007): Wired the existing `toast-slide-out` keyframe (defined in design-system.css since initial design-system build) into the toast lifecycle — it was declared but never triggered.
  - Added `exitingIds: ReadonlySet<string>` state to `ToastProvider`.
  - `startDismiss(id)` adds id to exitingIds, then after `TOAST_EXIT_MS` (200ms) removes it from both `toasts` and `exitingIds`.
  - Auto-dismiss `setTimeout` now calls `startDismiss` at `duration - TOAST_EXIT_MS` ms, so exit animation completes within the original duration window.
  - Manual dismiss (X button) also calls `startDismiss`; button is disabled during exit.
  - `ToastItemComponent` applies `.toast-item--exiting` class which triggers `animation: toast-slide-out 200ms ease-in forwards`.
  - `pointer-events: none` on exiting items prevents interaction during animation.
  - `prefers-reduced-motion` handled globally by design-system.css `0.01ms` override — no per-component work needed.

- `Card.tsx` (AN-011): Separated hover elevation from cursor affordance.
  - `.card--hover:hover` — retains `box-shadow` + `translateY(-1px)` elevation for all hover cards.
  - `cursor: pointer` **removed** from `.card--hover:hover`.
  - New `.card--clickable { cursor: pointer }` — applied **only** when `onClick` prop is provided (i.e., `isClickable = true`).
  - Non-clickable cards with `hover=true` (e.g., SkateCard which uses `Card hover as="article"`) correctly show default cursor.
  - SkateCard `edit` button still shows `cursor: pointer` because it is a `<button>`.

#### Deferred (explicitly — permanently out of scope for Motion workstream)
- AN-012 (EmptyState entrance animation) — deferred; owner decision pending.
- AN-013 (Alert entrance animation) — deferred; owner decision pending.

#### Previously Implemented (same workstream, prior commit)
- AN-005: Modal exit animation (desktop + mobile bottom-sheet).
- AN-006: Mobile drawer exit animation.
- AN-014: Sidebar collapse label fade.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors ✅
- Build: `npm run build` → 369KB (clean) ✅
- Browser — 10/10 manual tests PASS ✅:
  - Modal enter animation (desktop)
  - Modal exit animation — X, backdrop, Escape (desktop) — AN-005 no regression
  - Toast slide-in + slide-out (auto-dismiss + manual X) — AN-007
  - Bell button :active press state — AN-009
  - Sidebar label fade on collapse/expand — AN-014 no regression
  - Skate card: no pointer cursor on card body; pointer on edit button — AN-011
  - Hamburger :active press state at 375px — AN-008
  - Mobile drawer exit animation — AN-006 no regression
  - Nav item :active press state in mobile drawer — AN-010
  - No horizontal overflow at 375px

---

### Phase 03.5 — Motion & Animation Audit AN-005, AN-006, AN-014 (2026-09-14)

**Motion & Animation UX Audit — 3 owner-approved findings implemented**

#### Fixed

- `Modal.tsx` (AN-005): Added exit animation via three-state lifecycle (`'hidden'` → `'visible'` → `'closing'` → `'hidden'`).
  - Desktop exit: `modal-exit` keyframe (opacity + `translateY(0→8px)`) at `--transition-slow` (300ms).
  - Mobile bottom-sheet exit: `modal-sheet-exit` keyframe (`translateY(0→100%)`) at `--transition-slow` (300ms).
  - Backdrop exit: `fadeOut` at `--transition-base` (200ms) — faster than container.
  - `pointer-events:none` on backdrop + container during closing — prevents mid-animation interaction.
  - Close button disabled during closing; Escape / backdrop-click ignored during closing.
  - Scroll lock persists through exit animation (released only on `'hidden'`).
  - All existing Modal APIs (`isOpen`, `onClose`, `title`, `children`, `footer`, `size`, `hideCloseButton`, `closeOnBackdrop`) preserved without change.
  - `fadeIn` / `fadeOut` keyframes now co-located in `Modal.tsx` `<style>` (alongside existing enter counterparts).

- `App.tsx` — AppShell (AN-006): Added `isDrawerClosing` state; mobile drawer now animates OUT before unmounting.
  - `handleMobileClose` guarded with `if (isDrawerClosing) return` to prevent double-trigger.
  - `drawer-slide-out` keyframe added (`translateX(0→100%)` — RTL correct) at `--transition-slow` (300ms).
  - Backdrop `fadeOut` at `--transition-base` (200ms).
  - `.sidebar-mobile-backdrop--closing` and `.sidebar-mobile-drawer--closing` CSS classes apply `pointer-events:none`.
  - Resize-to-desktop immediately clears both `mobileOpen` and `isDrawerClosing` (no exit animation on resize).
  - Focus restoration to hamburger button preserved; keyboard/focus/RTL/z-index behavior unchanged.
  - `isDrawerClosing` prop forwarded to `<Sidebar>` component via `SidebarProps`.

- `App.tsx` — Sidebar (AN-014): Navigation labels now fade correctly on sidebar collapse/expand.
  - `nav-item-label` and logout button label spans always rendered (removed `{!collapsed && ...}` conditional).
  - **Collapsing**: labels fade out immediately at `--transition-fast` (150ms, 0ms delay) — disappear before sidebar width shrinks.
  - **Expanding**: labels fade in with 150ms delay, then 150ms fade (`--transition-fast`) — appear after space has opened.
  - CSS handles entirely: `.nav-item-label { opacity:1; transition: opacity 150ms 150ms }` + `.sidebar--collapsed .nav-item-label { opacity:0; pointer-events:none; transition: opacity 150ms 0ms }`.
  - Clipping by `overflow:hidden` + `white-space:nowrap` on nav-item handles text hiding at collapsed width.

#### Deferred (explicitly — not in scope of this implementation)
- AN-012 (EmptyState entrance animation): Deferred — owner decision pending.
- AN-013 (Alert entrance animation): Deferred — owner decision pending.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors ✅
- Build: `npm run build` → 368KB (clean) ✅
- Browser — 10/10 manual tests PASS ✅:
  - Modal enter animation (desktop)
  - Modal exit animation via X button (desktop)
  - Modal exit animation via backdrop click (desktop)
  - Modal exit animation via Escape key (desktop)
  - Sidebar label fade on collapse and expand (desktop, AN-014)
  - Mobile drawer enter animation (RTL correct)
  - Mobile drawer exit animation (RTL correct, AN-006)
  - Mobile bottom-sheet enter + exit animation (AN-005)
  - No horizontal overflow at 375px
  - Focus restoration to hamburger after drawer close

---

### Phase 03.5 — Desktop UI Consistency Audit D-010 & D-012 (2026-09-14)

**Desktop UI Consistency Audit — D-010 and D-012 implemented**

#### Added
- `FormFields.tsx` (D-012): New `CheckboxField` shared form component — follows Input/Select/Textarea architecture and design tokens exactly.
  - Controlled checked state, label, disabled, error, helperText, RTL, keyboard, WCAG 2.5.5 44px touch target, CSS focus ring.
  - Custom visual box (18×18px, navy-800 filled + white SVG checkmark on checked) over hidden native `<input type="checkbox">`.
  - Focus ring via CSS sibling selector `.checkbox-native:focus-visible ~ .checkbox-box` — no JS required.
  - RTL: label at `order:0` (left in RTL), box at `order:1` (right in RTL) — standard Arabic checkbox convention.
  - Disabled state: `opacity: 0.6`, `cursor: not-allowed`.
  - Error state: danger-500 border on box, danger-text on label.
- `index.ts`: `CheckboxField` added to UI barrel export.

#### Fixed / Refactored
- `SkatesPage.tsx` (D-010): `SkateCard` outer raw `<div>` (8+ inline styles + JS `onMouseEnter`/`onMouseLeave` hover handlers) replaced with shared `<Card padding="compact" hover as="article">`.
  - `card--inactive` CSS class added in SkatesPage `<style>` for soft-disabled skate (opacity 0.65, muted bg).
  - JS hover handlers removed — design-system `card--hover` CSS (`translateY(-1px)`, `shadow-md`) now handles hover.
  - Inner `.skate-card-inner` flex wrapper with `height: 100%` added.
- `SkatesPage.tsx` (D-014, via D-010): Resolved — `height: 100%` on `.skate-card-inner` + CSS Grid stretch ensures equal card heights per row. JS `marginTop: auto` on edit button replaced by `.skate-card-inner .btn { margin-top: auto }` CSS rule.
- `UsersPage.tsx` (D-012): Role checkboxes in Create User modal replaced with `<CheckboxField>` per role. Raw `<label>` + raw `<input type="checkbox">` + inline styles removed. `<fieldset>`/`<legend>` used for semantic role-group.
- `FormFields.tsx` module header comment updated to reflect CheckboxField addition.
- User's label update preserved: purchase cost label changed from `ر.س` to `EGP` in both Create and Edit Skate modals.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors
- Build: `npm run build` → 0 errors, 365KB bundle
- API tests: `npm test` → 34/34 PASS
- Browser: D-010 PASS at 375px, 430px, 768px, 1200px — cards consistent, equal height (D-014 resolved)
- Browser: D-012 PASS at 375px and 1200px — custom checkbox, checked state, RTL, touch target

### Phase 03.5 — Desktop UI Consistency Audit Fixes (2026-09-14)

**Desktop UI Consistency Audit — 9 findings resolved**

Owner decisions applied:
- Currency: EGP / `ج.م` symbol / Western Arabic numerals (`1,250 ج.م`)
- Badge API: semantic-status approach — `status="role"` + `status="system"` added to `Badge.tsx`

#### Added
- `apps/web/src/utils/currency.ts` (D-009): New `formatCurrency()` shared utility — EGP, Western Arabic numerals (`en-US` locale), `ج.م` suffix. Single source of truth for all ERP modules.
- `Badge.tsx`: New `BadgeStatus` values `'role'` (navy-50/navy-700) and `'system'` (maps to warning/gold variant) — approved semantic-status approach.
- `Badge.tsx`: New `BadgeVariant` `'role'` with `--color-navy-50` bg / `--color-navy-700` text.

#### Fixed
- `Button.tsx` (D-001): `btn-sm` `min-height` raised from 32px → 44px for WCAG 2.5.5 touch-target compliance on touch-capable desktops. Visual 32px height unchanged.
- `Modal.tsx` (D-003): `titleId` replaced `Math.random()` with React 18 `useId()` — stable, hydration-safe `aria-labelledby` relationship on all modals.
- `SkatesPage.tsx` (D-004): Removed inline `{ backgroundColor: gold-500, color: navy-900 }` override on EditSkateModal submit button. Standard `variant="primary"` (navy-800) now applies consistently.
- `SkatesPage.tsx` (D-009): Purchase cost display replaced `toLocaleString('ar-SA')` with `formatCurrency()` — now shows `1,000 ج.م` instead of Eastern Arabic numerals `١٬٠٠٠ ر.س`.
- `RolesPage.tsx` (D-005): System badge (`نظامي`) replaced raw `<span>` (non-token 0.65rem, gold-100/gold-600 inline) with `<Badge status="system">`.
- `RolesPage.tsx` (D-006): Permission count badge replaced raw `<span>` (navy-50/navy-700 inline) with `<Badge status="role">`.
- `RolesPage.tsx` (D-007): Permission chips replaced raw `<span>` (non-token 0.7rem, `border-radius: var(--radius-base)` — rectangular) with `<Badge variant="neutral">` — now pill-shaped (`--radius-full`) and `var(--font-size-xs)`.
- `UsersPage.tsx` (D-002): Role-name pills in desktop table AND mobile card list replaced raw `<span>` (inline navy-50/navy-700, inconsistent padding `1px`/`2px`) with `<Badge status="role">`.
- `UsersPage.tsx` (D-008): Desktop table empty state `<td>` plain text and mobile card empty state raw `<div>` both replaced with shared `<EmptyState icon={Users}>` component.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors
- Build: `npm run build` → 0 errors, 361KB bundle
- API tests: `npm test` → 34/34 PASS
- Manual browser verification at 375px and 1200px — all 9 fixes PASS
- Currency: `1,000 ج.م` (Western numerals, correct symbol) ✅
- Badges: role pills navy-blue, system badge amber, permission chips pill-shaped ✅
- EditSkateModal save button: navy primary (no gold override) ✅
- btn-sm: touch target 44px min, visual size unchanged ✅
- Modal aria-labelledby stable across re-renders ✅

### Phase 03.5 — Mobile UX Audit Fixes (2026-09-14)

**Mobile UX Audit Bug Fixes — 7 items implemented from pre-Phase-04 audit report**

#### Fixed
- `SearchBar.tsx` (M-003): Added `@media (max-width: 479px) { min-width: 0; width: 100% }` so the search bar never causes horizontal overflow at 375–479px in the `.filters-row` column layout
- `App.tsx` (M-004): Topbar notification/bell button enlarged from 36×36px → 44×44px (WCAG 2.5.5 minimum touch target)
- `App.tsx` (M-017): Mobile drawer now has `role="dialog"` + `aria-modal="true"`. Added focus trap (Tab/Shift-Tab cycle within drawer, Escape closes and returns focus to hamburger). Hamburger button gets stable `id="topbar-mobile-menu-btn"` + ref for focus restoration. `AppShell` exposes `hamburgerRef` wired through both `Topbar` and `Sidebar`. Focus restored via `requestAnimationFrame` on all close paths (Escape, backdrop click, nav item click).
- `Modal.tsx` (M-005): Modal X close button enlarged from 36×36px → 44×44px (WCAG 2.5.5 minimum touch target)
- `RolesPage.tsx` (M-008): Header now uses shared `.page-header` / `.page-header-text` wrapper structure — consistent with `SkatesPage` and `UsersPage`. Removes inline style `marginBottom` in favor of the shared responsive pattern.
- `SkatesPage.tsx` (M-001/M-009/M-020): Removed local `Field` component and `inputStyle` inline style object. `CreateSkateModal` and `EditSkateModal` form fields now use shared `<Input>`, `<Select>`, `<Textarea>` from `FormFields.tsx`. Edit status select retains raw `<select className="field-control">` for DEC-031 disabled-option requirement (rented/reserved shown as read-only).
- `SkatesPage.tsx` (M-002/M-014): Filter-row status `<select>` inline `width:'auto'` removed. Now uses `className="field-control skates-filter-select"` with a dedicated CSS class (`flex: 0 0 auto; width: 160px` at desktop; `flex: none; width: 100%` at ≤479px). This fixes the CSS override priority issue where inline style prevented the `.filters-row` column mode from expanding the select.

#### Verified
- TypeScript: `npx tsc --noEmit` → 0 errors
- Build: `npm run build` → 0 errors, 361KB bundle
- API tests: `npm test` → 34/34 PASS
- Manual browser verification at 375px, 390px, 430px, 768px, 1200px — all PASS
- Mobile drawer: Escape closes + focus restored to hamburger ✅, Tab trapped inside drawer ✅, backdrop click closes ✅
- Form controls: consistent 40px height in both Create and Edit modals ✅
- Filter row column mode: SearchBar + select both full-width at 375px ✅
- Roles page header: aligned with other pages ✅

### Phase 03.5 — Mobile / Phone View Review & Improvement (2026-09-11)

**Mobile UX Audit & Implementation — all responsive improvements**

#### Added
- `index.css`: `.page-container` shared utility (32px desktop / 16px mobile padding, responsive)
- `index.css`: `.page-header` shared utility (flex header, wraps to column on < 480px)
- `index.css`: `.page-header-title` / `.page-header-subtitle` typography utilities
- `index.css`: `.form-grid-2col` shared utility (2-col desktop, 1-col at < 640px) — OD-MOBILE-002
- `index.css`: `.skates-grid` shared utility (auto-fill cards, forced 1-col at < 480px)
- `index.css`: `.filters-row` shared utility (flex filters, column on < 480px)
- `UsersPage.tsx`: Mobile card-list view (< 640px) — OD-MOBILE-001 Option B. Avatar, name, email, roles, status, action per card. Desktop table kept for >= 640px.

#### Fixed
- `App.tsx`: Hamburger button touch target enlarged from 36×36px to 44×44px (WCAG compliant)
- `App.tsx`: Mobile drawer close button enlarged to 44×44px with focus-visible ring
- `App.tsx`: Topbar role badge protected with `max-width: 100px` + ellipsis overflow
- `App.tsx`: Desktop-only sidebar collapse toggle hidden inside mobile drawer (isMobile flag)
- `App.tsx`: Mobile drawer rebuilt inline to render correct nav without collapse toggle
- `App.tsx`: Safe-area-inset support added to topbar (`padding-top`, height calc)
- `App.tsx`: Safe-area-inset support added to sidebar mobile drawer (top/bottom/right padding)
- `App.tsx`: Mobile drawer close button gets `background-color` hover + focus-visible outline
- `App.tsx`: `PlaceholderPage` uses `.page-container` (16px padding on mobile)
- `Modal.tsx`: Bottom-sheet gets `max-height: 85dvh` + `overflow-y: auto` (scroll long forms)
- `Modal.tsx`: Bottom-sheet adds `padding-bottom: env(safe-area-inset-bottom)` for iOS home indicator
- `Modal.tsx`: Modal body padding reduces to 16px on mobile (< 640px)
- `Modal.tsx`: Modal footer stacks to full-width column on mobile for better thumb reach
- `SkatesPage.tsx`: Page container, page header, skates grid converted to shared CSS classes
- `SkatesPage.tsx`: All 5 inline 2-col form grids → `.form-grid-2col` (OD-MOBILE-002)
- `SkatesPage.tsx`: Filters row uses `.filters-row` (column layout on < 480px)
- `UsersPage.tsx`: Page container + page header converted to shared CSS classes
- `UsersPage.tsx`: Desktop table wrapped in `overflow-x: auto` container (M-010 resolved)
- `RolesPage.tsx`: Page container + title converted to shared CSS classes
- `RolesPage.tsx`: Role card header uses `flex-wrap` + `gap` to prevent overflow
- `RolesPage.tsx`: Role card permission badge gets `flex-shrink: 0`

#### Verification
- `npm run build` (apps/web): ✅ 0 TypeScript errors, 358KB bundle
- `npm test` (apps/api): ✅ 34/34 pass
- Breakpoints covered: 375px, 390px, 430px (mobile), 640px (mobile/tablet threshold), 768px (sidebar visible), 1280px (desktop)

---

## [Phase 03.5 Corrective Fix — Mobile Drawer Navigation] — 2026-09-14

### Bug Fixed

**Root Cause:** Z-index inversion in the mobile sidebar drawer. The `.sidebar-mobile-backdrop` was assigned `--z-overlay` (400) while `.sidebar-mobile-drawer` was assigned `--z-sidebar` (300). Because the backdrop was stacked *above* the drawer, every tap on a drawer nav item was intercepted by the backdrop's `onClick={onMobileClose}` handler, closing the drawer without ever triggering React Router navigation. The result: the drawer closed but the page did not change.

### Files Changed

- **`apps/web/src/App.tsx`** — CSS block inside `Sidebar` component:
  - `.sidebar-mobile-backdrop`: `z-index` changed from `var(--z-overlay)` (400) → `var(--z-sidebar)` (300)
  - `.sidebar-mobile-drawer`: `z-index` changed from `var(--z-sidebar)` (300) → `var(--z-modal)` (500)
  - Mobile media query for `.sidebar-desktop-wrapper`: added `pointer-events: none` alongside `display: none` as a defensive fix for iOS WebKit fixed-position stacking context edge cases

### Verification

- `npm run build` (apps/web): ✅ 0 TypeScript errors, clean bundle
- `npm test` (apps/api): ✅ 34/34 pass — zero regressions
- 375px (iPhone SE): nav tap navigates + drawer closes ✅, backdrop dismiss ✅, X button dismiss ✅
- 390px (iPhone 14): nav tap navigates + drawer closes ✅
- 430px (iPhone 14 Pro Max): nav tap navigates + drawer closes ✅
- 768px (tablet breakpoint): fixed desktop sidebar visible, direct nav works ✅
- 1200px (desktop): sidebar nav works, collapse toggle works ✅
- RTL: sidebar on right, text right-aligned ✅
- Console errors: none ✅

---

## [Phase 03.5 Corrective Fix] — 2026-09-11 — Sidebar Expand Control Restored

### Bug Fixed

**Root Cause:** When the sidebar collapsed to 64px, the `sidebar-header` flex row overflowed the available width. The header contained: logo (36px) + gap (12px) + collapse button (~24px) = ~72px — exceeding the 64px collapsed width. Because `.sidebar` has `overflow: hidden`, the toggle button was visually clipped and became inaccessible. The user could collapse the sidebar but had no visible or clickable control to expand it again.

### Files Changed

- **`apps/web/src/App.tsx`** — Sidebar corrective fix:
  - Added `sidebar-header--collapsed` CSS modifier class applied when sidebar is collapsed
  - Collapsed header switches to `flex-direction: column` with centered alignment and reduced padding so both the logo and toggle button fit within the 64px width
  - Added `sidebar-collapse-btn--collapsed` CSS modifier: resets `margin-inline-start: auto` to 0, gives the button a 36×36px rounded appearance matching the logo size for visual consistency
  - Fixed `margin-right: auto` → `margin-inline-start: auto` (correct logical property for RTL)
  - Added `title` attribute on toggle button for tooltip in both states
  - Toggle button remains fully visible and clickable in both expanded and collapsed states

### Verification

- `npm run build` (apps/web) → **0 TypeScript errors**, 353KB bundle ✅
- `npm test` (apps/api) → **34/34 PASS** — zero regressions ✅
- Sidebar collapse: ✅ works
- Sidebar expand (from collapsed): ✅ works — toggle button accessible
- Toggle visible in collapsed state: ✅ logo + toggle button both render in 64px column layout
- Active nav state in collapsed state: ✅ gold icon + indicator bar
- RTL layout: ✅ maintained
- Lucide icons: ✅ `PanelRightClose` / `PanelRightOpen` (no emoji)
- Mobile drawer: ✅ unaffected (separate code path)

---

## [Phase 03.5 Stage 1] — 2026-09-10 — Documentation & Governance Alignment

### Purpose
Establish the documentation and governance foundation for Phase 03.5 (ERP Design System & Interface Standardization). No application code was modified.

### Created — New Documentation

- **`docs/design/DESIGN_SYSTEM.md`** — Authoritative design system reference (v1.0): approved color tokens (brand + semantic), typography rules, spacing system, border radius, shadows, z-index, motion/animation rules, icon system (Lucide React), RTL rules, accessibility requirements, page anatomy, all component standards (17 components), sidebar behavior (expanded/collapsed/mobile), login layout, responsive breakpoints, visual density, UI governance rules UI-001 through UI-010, anti-pattern catalogue, new-screen checklist
- **`docs/design/COMPONENT_LIBRARY.md`** — Developer reference (v1.0): per-component specifications for all 17 shared UI components — purpose, expected props, important states, RTL considerations, accessibility expectations, and reuse rules
- **`docs/phases/PHASE_035_UI_DESIGN_SYSTEM.md`** — Complete phase specification: all four stages defined (documentation / implementation / testing / finalization), owner decisions, in/out of scope, deliverables, Definition of Done (42 checklist items), risk matrix, dependencies

### Updated — Governance Documents

- **`docs/00-governance/AI_AGENT_RULES.md`** (v1.0 → v2.0) — Added Rule 16 (Documentation-First Development), Rule 17 (Future Phase Inheritance), and all UI governance rules UI-001 through UI-010 (OD-004 APPROVED)
- **`docs/00-governance/DEFINITION_OF_DONE.md`** (v1.0 → v2.0) — UI/UX DoD section expanded with 15 design system compliance items: Lucide icons, token-only colors, shared components, no native dialogs, no inline style objects, Arabic text compliance, touch target minimums, and focus ring verification
- **`docs/00-governance/SOURCE_OF_TRUTH.md`** (v1.0 → v2.0) — Updated priority hierarchy to include `docs/design/DESIGN_SYSTEM.md` (priority 5.1), added Design Documents section to document register, corrected all architecture document statuses from INITIAL/PLANNED to ACTIVE, corrected operational document statuses, added Documentation-First Development section

### Updated — Operational Documents

- **`docs/PROJECT_STATE.md`** (v2.6 → v2.7) — Current phase updated to Phase 03.5 Stage 1; Phase 03.5 row added to phase table; documentation status table updated with all Phase 03.5 docs; design docs section added
- **`docs/PROJECT_MAP.md`** (v1.4 → v1.5) — Design directory entries added; component library paths planned; Phase 035 spec registered; note updated to reflect Phase 03 FINAL GATE PASSED and Phase 03.5 Stage 1 COMPLETE
- **`docs/decisions/DECISION_LOG.md`** — DEC-034 through DEC-040 recorded:
  - DEC-034: Semantic color tokens (OD-001)
  - DEC-035: Login page split-screen layout (OD-002)
  - DEC-036: Lucide React icon library (OD-003)
  - DEC-037: UI governance rules UI-001 through UI-010 (OD-004)
  - DEC-038: Sidebar expanded/collapsed/mobile behavior (OD-005)
  - DEC-039: Documentation-First Development lifecycle (governance)
  - DEC-040: Future phase inheritance rules (governance)

### Decisions Recorded

- **DEC-034** — Semantic color system: success `#58C89A`, warning `#F3B735`, danger `#ED4547`, neutral `#EEF1F5` — ACTIVE
- **DEC-035** — Login split-screen desktop + centered mobile — ACTIVE
- **DEC-036** — Lucide React as sole icon library — ACTIVE
- **DEC-037** — UI-001 through UI-010 governance rules — ACTIVE
- **DEC-038** — Sidebar: expanded + collapsible desktop; drawer mobile — ACTIVE
- **DEC-039** — Documentation-First Development lifecycle — ACTIVE
- **DEC-040** — Future phase inheritance — ACTIVE

### Verification

- No application source code was modified (confirmed)
- No database migrations were created (confirmed)
- No tests were modified (confirmed)
- No API behavior was changed (confirmed)
- All documentation files reviewed for internal consistency

### Stage Status

Stage 1: COMPLETE — awaiting owner review and approval to begin Stage 2 (Implementation)

## [v0.3.0 — FINAL GATE PASSED ✅] — 2026-09-10 — Phase 03: Skates / Asset Management

**Commit:** `f12c5b72cdb87a2a34866c252ce63b864b7e8fdc`
**Gate result:** APPROVED — all automated and manual checks passed.


### Added — Backend
- `apps/api/src/db/schema/skates.ts` — Drizzle schema for `skates` table (14 columns, 6-value status enum, 3-value condition enum)
- `apps/api/src/db/migrations/0001_glossy_darwin.sql` — Auto-generated Drizzle migration; creates `skates` table
- `apps/api/src/modules/skates/skates.types.ts` — Backend TypeScript types (SkateDTO, CreateSkateRequest, UpdateSkateRequest, etc.)
- `apps/api/src/modules/skates/skates.service.ts` — Business logic: `SK-NNN` auto-generation, status transition enforcement, QR/barcode auto-set, soft-disable, paginated list, history stub
- `apps/api/src/modules/skates/skates.routes.ts` — 6 Express routes (`/available` registered before `/:id` per spec)
- `apps/api/src/tests/skates.test.ts` — 16 integration tests (TC-SK-01 to TC-SK-16)

### Added — Frontend
- `apps/web/src/modules/skates/skates.service.ts` — Frontend types, status labels, badge colors, API wrappers
- `apps/web/src/modules/skates/SkatesPage.tsx` — Full management UI: card grid, status badges, search/filter, create modal, edit modal, loading/empty/error states (Arabic RTL)

### Modified
- `apps/api/src/db/schema/index.ts` — Added `skates.ts` export
- `apps/api/drizzle.config.ts` — Added `skates.ts` to schema array
- `apps/api/src/app.ts` — Mounted `/api/v1/skates` routes; updated health/index to Phase 03
- `apps/web/src/App.tsx` — Replaced `/skates` placeholder with `SkatesPage`; imported SkatesPage; updated phase badge to "المرحلة 03 ✓"

### Business Rules Enforced
- **DEC-030**: `skate_code` optional; auto-generated as `SK-NNN` (3-digit zero-padded MAX+1); never reused even after deactivation
- **DEC-031**: Admin API cannot set `status = rented` or `status = reserved` (HTTP 422 `SKATE_STATUS_NOT_ALLOWED`)
- **DEC-032**: `qr_code` and `barcode` auto-set to `skate_code` at creation; user-editable independently after creation
- **DEC-033**: Skate Type is a free-text input — no hardcoded dropdown values
- **DEC-009**: No hard delete — soft-disable via `is_active = false`; deactivated skates permanently hold their `skate_code`

### Verification
- API build: ✅ zero TypeScript errors
- Web build: ✅ zero TypeScript errors (Vite bundle 310 kB)
- Tests: ✅ 34/34 pass (16 Phase 03 + 18 Phase 02 — zero regressions)
- Migration: ✅ `skates` table created in `koshk_skate` DB

---

## [Phase 03 Pre-Implementation Final] — 2026-09-10 (Phase 03 Final Owner Decisions — All Implementation Details Resolved)

### Decisions Updated
- **`docs/decisions/DECISION_LOG.md`** — DEC-030 updated: `SK-NNN` format (3-digit zero-padded sequential), never reuse codes even after deactivation (IMPL-001)
- **`docs/decisions/DECISION_LOG.md`** — DEC-032 updated: `qr_code = skate_code`, `barcode = skate_code`; user-editable strings; no image rendering in Phase 03 (IMPL-002, IMPL-003)
- **`docs/decisions/DECISION_LOG.md`** — DEC-033 updated: Skate Type changed from "fixed dropdown" to **free-text input** — no hardcoded type list; Settings-configurable in future (IMPL-004)

### Documentation Updated
- **`docs/phases/PHASE_03_SKATES_MODULE.md`** — All IMPL items resolved: skate code algorithm (`SK-NNN`), QR/barcode payloads (`= skate_code`), type as free-text; TC-SK-02 updated to verify `SK-NNN` pattern; Unresolved Items section removed; status updated to READY FOR IMPLEMENTATION
- **`docs/modules/SKATES.md`** — All IMPL items resolved; unresolved items section cleared; status updated
- **`docs/PROJECT_STATE.md`** — Version 2.4: current phase updated to READY FOR IMPLEMENTATION; all four IMPL rows updated to RESOLVED; blocked work cleared

### Notes
- No application source code was modified.
- No database migrations were created.
- No tests were modified.
- Phase 03 implementation is now fully unblocked.

---

## [Phase 03 Pre-Implementation] — 2026-09-10 (Phase 03 Owner Decisions & Documentation Reconciliation)

### Added — Decisions
- **`docs/decisions/DECISION_LOG.md`** — DEC-030: Skate code is optional input — auto-generated when omitted; generation algorithm PENDING
- **`docs/decisions/DECISION_LOG.md`** — DEC-031: Admin API status transition matrix — `rented`/`reserved` blocked; `available↔maintenance/damaged/lost` permitted
- **`docs/decisions/DECISION_LOG.md`** — DEC-032: QR code and barcode auto-generated on create, user-editable; exact payload format PENDING
- **`docs/decisions/DECISION_LOG.md`** — DEC-033: Phase 03 uses temporary fixed Skate Type dropdown; Settings module deferred; initial values PENDING

### Updated — Documentation
- **`docs/phases/PHASE_03_SKATES_MODULE.md`** — Completely rewritten from stub to full phase specification: scope, business rules, status transition matrix (DEC-031), skate code behavior (DEC-030), QR/barcode policy (DEC-032), skate type policy (DEC-033), full API routes, DB design, 16 test cases, verification criteria, known risks, unresolved items (IMPL-001 to IMPL-004)
- **`docs/modules/SKATES.md`** — Completely rewritten from stub to full module reference: all business rules, transition table, frontend/backend/DB plan, API table, permissions table, known technical debt (TD-002, TD-003)
- **`docs/PROJECT_STATE.md`** — Version 2.3: current status updated to Phase 03 PRE-IMPLEMENTATION; IMPL-001 to IMPL-004 added to unknowns; TD-002, TD-003 added to technical debt; docs status updated
- **`docs/PROJECT_MAP.md`** — Version 1.4: Skates module paths updated to PLANNED; planned file tree added; decisions reference added; known risks updated

### Conflicts Resolved
- **TC-SK-02 (missing skate_code → 400)** — CORRECTED: missing `skate_code` triggers auto-generation → 201 (not 400) — per DEC-030
- **Status transition plan ambiguity** — RESOLVED: explicit admin-permitted and admin-forbidden transitions documented per DEC-031
- **QR/barcode "assumed to equal skate_code"** — CORRECTED: no assumption; format PENDING per DEC-032
- **Phase 03 createSkate() contradiction** — RESOLVED: `skate_code` optional; TC-SK-02 updated per DEC-030

### Remaining Unresolved (awaiting owner)
- **IMPL-001** — `skate_code` auto-generation algorithm (format, sequence, padding)
- **IMPL-002** — `qr_code` stored value format
- **IMPL-003** — `barcode` stored value format
- **IMPL-004** — Initial Skate Type values for Phase 03 fixed dropdown

### Technical Debt Added
- **TD-002** — DEC-007 enforcement deferred to Phase 09 (maintenance→available check)
- **TD-003** — Skate Type hardcoded in Phase 03; migration to Settings required

### Notes
- No application source code was modified in this release.
- No database migrations were created.
- No tests were modified.
- Phase 03 implementation blocked on IMPL-001 through IMPL-004 (awaiting owner confirmation).

---

## [0.3.1] — 2026-09-09 (Phase 02 Final Gate Verification & Reconciliation)

### Fixed
- **`apps/api/src/modules/auth/auth.service.ts`** — Added `jti` (UUID) to refresh token JWT payload; prevents `ER_DUP_ENTRY` when same user logs in multiple times within the same second (duplicate token hash collision)
- **`apps/api/src/db/seed.ts`** — Removed non-existent `payments.view` from Cashier `permissionKeys` (that key is not in Phase 02 permission set; it was silently filtered but left misleading); fixed comment from "39 keys" to "40 keys"

### Added
- **`apps/api/src/app.ts`** — App factory module (extracted from `index.ts`): configures Express, middleware, and routes without starting the HTTP listener. Required for test isolation.
- **`apps/api/src/tests/auth.test.ts`** — 14 integration test cases, 18 assertions: login success/failure, GET /me, refresh rotation, logout revocation, 401 (unauth), 403 (permission denied), deactivated user. All 18 PASS.
- **`apps/api/src/tests/setup.ts`** — Test setup file
- **`apps/api/vitest.config.ts`** — Vitest configuration (30s timeout, serial execution, dotenv)
- **`apps/api/src/modules/auth/auth.types.ts`** — Added `jti?` field to `TokenPayload`

### Modified
- **`apps/api/src/index.ts`** — Refactored to import app from `app.ts`; now only handles DB connection test + HTTP listener startup
- **`apps/api/package.json`** — Added `test` and `test:watch` scripts; added `dotenv-cli`, `cross-env`, `supertest`, `vitest` dev dependencies
- **`docs/phases/PHASE_02_AUTHENTICATION_AND_PERMISSIONS.md`** — Completely rewritten from stub to full spec: scope, all 14 API routes, DB schema, 40 permission keys table, full test matrix (14 TCs), DoD checklist, known risks
- **`docs/PROJECT_MAP.md`** — All Phase 02 files and modules updated from PLANNED → VERIFIED
- **`docs/PROJECT_STATE.md`** — Final Gate results: tests, builds, verification timestamp

### Verified (Final Gate)
- `npm test` → **18/18 PASS** (zero failures)
- `npm run build` (api) → **zero TypeScript errors**
- `npm run build` (web) → **zero TypeScript errors**
- Browser: login, protected routes, users page, roles page, logout — **all pass**
- Security: duplicate hash bug fixed, rotation enforced, revocation confirmed

---

## [0.3.0] — 2026-09-09 (Phase 02 — Authentication & Permissions)

### Added — Backend
- **`apps/api/src/db/schema/users.ts`** — Drizzle schema: `users`, `roles`, `permissions`, `user_roles`, `role_permissions` tables
- **`apps/api/src/db/schema/auth.ts`** — Drizzle schema: `refresh_tokens` table (single-use rotation, SHA-256 hash stored — DEC-025)
- **`apps/api/src/db/migrations/0000_*.sql`** — Migration 001: 6 tables created in `koshk_skate` DB
- **`apps/api/src/db/seed.ts`** — Idempotent seed: 40 permission keys, 3 system roles, default admin user (DEC-026)
- **`apps/api/src/modules/auth/auth.types.ts`** — Auth TypeScript types
- **`apps/api/src/modules/auth/auth.service.ts`** — login, refresh (with rotation), logout, verifyAccessToken, loadUserWithPermissions
- **`apps/api/src/modules/auth/auth.routes.ts`** — POST /login, POST /refresh, POST /logout, GET /me with HttpOnly cookie handling (DEC-025)
- **`apps/api/src/modules/users/users.types.ts`** — User/Role/Permission DTO types
- **`apps/api/src/modules/users/users.service.ts`** — User CRUD with bcrypt + soft deactivation
- **`apps/api/src/modules/users/users.routes.ts`** — GET/POST/PATCH/DELETE /users (permission-gated)
- **`apps/api/src/modules/users/roles.service.ts`** — Role CRUD + permission assignment (system roles protected)
- **`apps/api/src/modules/users/roles.routes.ts`** — GET/POST/PATCH/DELETE /roles + PUT /roles/:id/permissions
- **`apps/api/src/middleware/auth.ts`** — `authenticate()` — JWT Bearer token verification, req.user injection
- **`apps/api/src/middleware/permission.ts`** — `requirePermission(key)` — RBAC server-side enforcement, returns 403
- **`apps/api/src/middleware/rateLimiter.ts`** — `loginLimiter` — 10 req/min/IP (DEC-027), in-memory

### Added — Frontend
- **`apps/web/src/modules/auth/`** — auth.types.ts, auth.service.ts (login/refresh/logout/me API calls)
- **`apps/web/src/modules/auth/LoginPage.tsx`** — Arabic RTL login page, KOSHK SKATE design, loading state, Arabic error messages
- **`apps/web/src/modules/users/users.service.ts`** — Users/Roles API client wrappers
- **`apps/web/src/modules/users/UsersPage.tsx`** — User list + create modal + deactivate
- **`apps/web/src/modules/users/RolesPage.tsx`** — Role cards with permissions
- **`apps/web/src/contexts/AuthContext.tsx`** — In-memory token storage, silent refresh on mount, login/logout
- **`apps/web/src/hooks/usePermission.ts`** — `usePermission(key): boolean`
- **`apps/web/src/components/ProtectedRoute.tsx`** — Redirect to /login if not authenticated
- **`apps/web/src/components/PermissionGate.tsx`** — Render children only if user has permission

### Modified
- **`apps/api/src/index.ts`** — Added cookie-parser, mounted auth/users/roles routes, CORS credentials:true
- **`apps/api/src/config/env.ts`** — Added JWT_REFRESH_SECRET, token expiry vars, seed vars, production secret enforcement
- **`apps/api/src/utils/errors.ts`** — Added UnauthorizedError class
- **`apps/api/src/db/schema/index.ts`** — Exports Phase 02 tables
- **`apps/api/drizzle.config.ts`** — Schema array for drizzle-kit compatibility
- **`apps/api/package.json`** — Added db:seed script
- **`apps/api/.env.example`** — Added JWT_REFRESH_SECRET, token expiry, CORS, seed credential vars
- **`apps/web/src/main.tsx`** — Wrapped with BrowserRouter + AuthProvider
- **`apps/web/src/App.tsx`** — Full routing: /login (public) + protected app shell with NavLink sidebar
- **`apps/web/src/services/api.ts`** — Bearer token injection, 401 silent refresh retry, credentials:include

### Decisions Recorded
- DEC-025: Refresh token stored as HttpOnly cookie
- DEC-026: Seed admin credentials via env vars, idempotent
- DEC-027: In-memory rate limiter, 10 req/min/IP
- DEC-028: Separate JWT_SECRET / JWT_REFRESH_SECRET
- DEC-029: Password reset out of scope for Phase 02

### Dependencies Added
- Backend: `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `cookie-parser` + type definitions
- Frontend: `react-router-dom`

---

## [0.2.0] — 2026-09-09 (Phase 01 — Foundation & Project Setup)

### Added
- **Frontend scaffold** (`apps/web/`) — Vite + React + TypeScript initialized and building cleanly
- **`apps/web/index.html`** — Updated to `lang="ar" dir="rtl"`, Cairo font loaded via Google Fonts, proper meta description
- **`apps/web/src/styles/design-system.css`** — Complete KOSHK SKATE CSS token system (colors, typography, spacing, shadows, radii, z-index, transitions, layout variables)
- **`apps/web/src/styles/index.css`** — Global RTL reset, Cairo font applied, branded scrollbar, gold focus ring
- **`apps/web/src/App.tsx`** — Application shell (navy sidebar RTL-anchored + topbar + content area using design system tokens)
- **`apps/web/src/services/api.ts`** — Typed fetch-based API client base
- **`apps/web/.env.example`** — Frontend environment variable template
- **Backend scaffold** (`apps/api/`) — Express + TypeScript with dev/build scripts
- **`apps/api/src/index.ts`** — Express entry, CORS, JSON parsing, Morgan, `GET /api/v1/health`, 404 handler, global error handler
- **`apps/api/src/config/env.ts`** — Centralized environment config (no direct `process.env` access elsewhere)
- **`apps/api/src/middleware/errorHandler.ts`** — Global structured JSON error handler with dev/prod stack trace control
- **`apps/api/src/utils/errors.ts`** — 8 typed error classes (AppError, ValidationError, AuthenticationError, ForbiddenError, NotFoundError, ConflictError, BusinessRuleError, InternalError)
- **`apps/api/src/utils/financial.ts`** — Financial utilities (calculateLateFee, calculateExpectedEndTime, roundCurrency, formatCurrency)
- **`apps/api/src/db/connection.ts`** — Drizzle ORM + mysql2 pool with `testConnection()` (DEC-022)
- **`apps/api/src/db/schema/index.ts`** — Empty Drizzle schema anchor
- **`apps/api/drizzle.config.ts`** — Drizzle Kit config for migrations
- **`apps/api/.env.example`** — Backend environment variable template
- **`.gitignore`** (root) — Comprehensive exclusion rules covering both apps
- **`README.md`** (root) — Arabic README with tech stack, structure, and local setup

### Decisions Made
- **DEC-022** — ORM: Drizzle ORM with mysql2 driver (project owner approved)
- **DEC-023** — Arabic font: Cairo (Google Fonts) (project owner approved)

### Technical
- Frontend builds: ✅ zero TypeScript errors
- Backend: TypeScript strict mode, CommonJS output for Node.js/Hostinger compatibility
- Database: utf8mb4 charset enforced for Arabic text
- All monetary calculations use integer arithmetic (no floating-point)
- RTL enforced at HTML root level (`<html lang="ar" dir="rtl">`)

---

## [0.1.1] — 2026-09-09 (Documentation Reconciliation)

### Changed
- `docs/PROJECT_STATE.md` — Corrected Git remote from NONE to GitHub (`https://github.com/mohamedalihassanwork-cpu/Skate-system`); corrected branch from `main` to `master`; updated technology decisions to reflect approved stack; resolved UNK-001 and UNK-002
- `docs/PROJECT_MAP.md` — Added approved technology reference table; corrected `.js` paths to `.ts`; updated governance file tree
- `docs/decisions/DECISION_LOG.md` — Marked DEC-014 as SUPERSEDED; added DEC-019 (React+Vite+TypeScript), DEC-020 (Node.js+Express+TypeScript), DEC-021 (GitHub)
- `docs/architecture/TECHNICAL_ARCHITECTURE.md` — Updated tech stack from UNKNOWN/candidates to approved decisions; updated summary table
- `docs/architecture/FRONTEND_ARCHITECTURE.md` — Updated framework from candidates to approved React+Vite+TypeScript; updated state management to React options
- `docs/architecture/BACKEND_ARCHITECTURE.md` — Updated framework from candidates to approved Node.js+Express+TypeScript; updated all file paths from `.js` to `.ts`
- `docs/architecture/DEPLOYMENT_ARCHITECTURE.md` — Added GitHub repository URL; corrected branch from `main` to `master`

### Added
- `docs/00-governance/AI_AGENT_WORKFLOW_AR.md` — New: Arabic operating guide for project owner (workflow, templates, governance rules in Arabic)

### Notes
- No application code was added or modified in this release.
- This is a documentation reconciliation only.
- Frontend and backend framework decisions are now APPROVED (DEC-019, DEC-020).
- ORM, authentication mechanism, and notification delivery remain PENDING.

---

## [0.1.0] — 2026-09-09

### Added
- Repository initialized with Git
- Master Business & Product Specification (`Skate_Rental_ERP_Master_Business_Product_Specification.md`)
- Visual Design Reference (`KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`)
- Complete governance documentation:
  - `docs/00-governance/AI_AGENT_RULES.md`
  - `docs/00-governance/SOURCE_OF_TRUTH.md`
  - `docs/00-governance/DEFINITION_OF_DONE.md`
  - `docs/00-governance/CHANGE_REQUEST_PROCESS.md`
  - `docs/00-governance/DOCUMENTATION_RULES.md`
- Complete architecture documentation (target/planned):
  - `docs/architecture/TECHNICAL_ARCHITECTURE.md`
  - `docs/architecture/DATABASE_ARCHITECTURE.md`
  - `docs/architecture/API_ARCHITECTURE.md`
  - `docs/architecture/FRONTEND_ARCHITECTURE.md`
  - `docs/architecture/BACKEND_ARCHITECTURE.md`
  - `docs/architecture/SECURITY_ARCHITECTURE.md`
  - `docs/architecture/DEPLOYMENT_ARCHITECTURE.md`
- Project navigation system:
  - `docs/PROJECT_MAP.md`
  - `docs/PROJECT_STATE.md`
- Decision log with 18 initial decisions (`docs/decisions/DECISION_LOG.md`)
- Module documentation stubs for all 21 modules (`docs/modules/`)
- Quality documentation:
  - `docs/quality/QA_STRATEGY.md`
  - `docs/quality/TEST_MATRIX.md` (62 test cases defined)
  - `docs/quality/VERIFICATION_RULES.md`
  - `docs/quality/REGRESSION_STRATEGY.md`
- Initial project audit (`docs/INITIAL_PROJECT_AUDIT.md`)

### Notes
- This is the documentation and governance initialization only.
- No application code exists.
- Technology stack decisions were recorded as pending at this stage (see DEC-014, now SUPERSEDED by DEC-019/020).

---

*Future entries will appear above as implementation progresses.*
