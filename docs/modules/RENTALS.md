# Module: Rentals

**Status:** VERIFIED — FINAL GATE PASSED ✅  
**Last updated:** 2026-09-21 (Phase 05 Closure Gate — FINAL GATE PASSED ✅. Final Verification Gate passed. 170/170 tests. All VG2 findings resolved.)

---

## Purpose

The Rentals module is the core operational module of KOSHK SKATE ERP. It manages the full rental lifecycle from skate selection through payment, active monitoring, return, and late fee handling.

---

## Current Implementation Status (Phase 05)

| Component | Status | Notes |
|---|---|---|
| Frontend — Rental POS | IMPLEMENTED | Multi-step flow: Skate → Duration → Customer → Review → Start |
| Frontend — Active Rentals view | IMPLEMENTED | Operational status (normal/ending_soon/overdue) computed server-side |
| Frontend — Return workflow | PLANNED | Phase 07 |
| Backend — Rental service | IMPLEMENTED | `startRental()`, `getActiveRentals()`, `getRentalConfig()`, `calculatePrice()` |
| Backend — Late fee calculation | PLANNED | Phase 07 |
| Database — rentals table | IMPLEMENTED | Migration `0004_rentals.sql` applied — all indexes present |
| Database — settings table | IMPLEMENTED | `rental_hourly_rate` + `rental_duration_options` seeded |
| Database — rental_payments table | PLANNED | Phase 06 |
| Database — late_fee_records table | PLANNED | Phase 07 |
| API routes | IMPLEMENTED | POST /rentals, GET /rentals, GET /rentals/active, GET /rentals/:id, GET /rentals/calculate-price, GET /rentals/config, GET /customers/:id/rentals |
| Tests | VERIFIED ✅ | 74 Phase 05 tests (31 TC-RENT-01..31 integration + 7 RBAC + 5 VAL + 5 CFG + 8 op-status unit + 8 code-format unit + 10 pricing unit). 170/170 total system tests pass. Manual visual verification not performed during automated gate. |

---

## Phase 05 — Implemented APIs

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/v1/rentals` | `rentals.create` | Start rental |
| GET | `/api/v1/rentals` | `rentals.view` | List rentals (paginated, filterable) |
| GET | `/api/v1/rentals/active` | `rentals.view` | Active rentals with operational status |
| GET | `/api/v1/rentals/:id` | `rentals.view` | Rental detail |
| GET | `/api/v1/rentals/calculate-price` | `rentals.create` | Preview price (server-authoritative, no rental created) |
| GET | `/api/v1/rentals/config` | `rentals.create` | Rental POS configuration (rate + standard durations) |
| GET | `/api/v1/customers/:id/rentals` | `customers.view` | Customer rental history (paginated) |

**Phase 07 endpoints — NOT implemented in Phase 05:**
- `POST /api/v1/rentals/:id/return`
- `POST /api/v1/rentals/:id/waive-late-fee`

---

## Rental Code Strategy (DEC-062, DEC-070)

Rental Codes use format `RN-NNNNN`. The numeric portion is derived from the auto-increment `insertId` of the inserted Rental row.

- INSERT with temporary placeholder → read `insertId` → derive `'RN-' + String(insertId).padStart(5, '0')` → UPDATE in same transaction
- Gaps in numbering caused by rolled-back transactions are explicitly **allowed** (DEC-070)
- Codes are **never reused**
- UNIQUE constraint enforced at DB level

---

## Operational Status (DEC-066)

Server-computed display states (never persisted):

| State | Condition |
|---|---|
| `normal` | remaining time > 5 minutes |
| `ending_soon` | remaining time ≤ 5 minutes AND current time has NOT passed expected end (including exact equality) |
| `overdue` | current time **strictly greater than** expected end (`NOW() > expected_end_at`) |

At exact equality (`NOW() === expected_end_at`): **NOT overdue** — classified as `ending_soon` with `remainingMinutes = 0`.

---

## Duration Configuration (DEC-069, F-06, DEC-070)

Standard duration options are read from the `settings` table (`rental_duration_options` key).

- Backend throws `RENTAL_DURATION_CONFIG_INVALID` if the key is missing, malformed, empty, or contains non-positive-integer values
- No hardcoded fallback list exists in application code
- Frontend displays an error state with a Retry button if configuration cannot be loaded
- Custom duration input remains available per DEC-069 (must be > 0, no maximum)

---

## Business Rules (Phase 05)

1. Skate must be `available` to start a rental
2. Only one active rental per skate at any time (FOR UPDATE lock inside transaction)
3. Rental price = `Math.round(hourlyRate × durationMinutes / 60)` — whole EGP
4. `price_per_hour` and `rental_amount` are immutable snapshots at creation
5. `expected_end_at = started_at + durationMinutes`
6. Deactivated customers cannot start a rental (422 CUSTOMER_INACTIVE)
7. No payment recording in Phase 05 (Phase 06)

---

## Database

| Table | Purpose | Phase |
|---|---|---|
| `rentals` | Core rental record | Phase 05 — IMPLEMENTED |
| `settings` | Hourly rate + duration config | Phase 05 — IMPLEMENTED |
| `rental_payments` | Payment components | Phase 06 — PLANNED |
| `late_fee_records` | Late fee tracking | Phase 07 — PLANNED |

---

## Permissions

| Permission Key | Description |
|---|---|
| `rentals.view` | View rental list and details |
| `rentals.create` | Start a new rental |
| `rentals.return` | Return a rental (Phase 07) |
| `waivers.approve` | Waive late fees (Phase 07) |

---

## Related Modules

- SKATES — skate availability and status
- CUSTOMERS — customer selection / creation
- PAYMENTS — payment recording (Phase 06)
- TREASURY — financial movements (Phase 06)
- INSPECTIONS — triggered on return (Phase 07)
- NOTIFICATIONS — rental expiry alerts (Phase 15)
- CASHIER_SHIFTS — shift context (Phase 12)
- AUDIT_LOG — waiver auditing (Phase 07)
- REPORTS — rental reports (future)

---

## Test Coverage (Phase 05)

| Suite | IDs | Count | Status |
|---|---|---|---|
| Availability & Creation | TC-RENT-01 to TC-RENT-06 | 6 | ✅ PASS |
| Pricing Formula | TC-RENT-07 to TC-RENT-13c | 10 | ✅ PASS |
| Time & Snapshot Immutability | TC-RENT-14 to TC-RENT-16 | 3 | ✅ PASS |
| Rental Code | TC-RENT-17 to TC-RENT-19 | 3 | ✅ PASS |
| Concurrency (same-skate) | TC-RENT-20 | 1 | ✅ PASS (architectural) |
| Rental Code Concurrency | TC-RENT-21 | 1 | ✅ PASS |
| Entity Validation | TC-RENT-22 to TC-RENT-24 | 3 | ✅ PASS |
| Active Rentals | TC-RENT-25 to TC-RENT-26 | 2 | ✅ PASS |
| Rental Detail | TC-RENT-27 | 1 | ✅ PASS |
| Calculate Price | TC-RENT-28 | 1 | ✅ PASS |
| Customer History | TC-RENT-29 to TC-RENT-30 | 2 | ✅ PASS |
| Regression | TC-RENT-31 | 1 | ✅ PASS |
| RBAC | TC-RENT-RBAC-01 to 07 | 7 | ✅ PASS |
| Validation | TC-RENT-VAL-01 to 05 | 5 | ✅ PASS |
| Config Endpoint | TC-RENT-CFG-01 to 05 | 5 | ✅ PASS |
| Unit (pricing, op-status, code) | — | ~16 | ✅ PASS |

---

## Known Technical Debt

| ID | Description | Phase |
|---|---|---|
| TD-RENT-01 | `shift_id` nullable — FK to `cashier_shifts` deferred to Phase 12 | Phase 12 |
| TD-RENT-02 | Payment recording missing — deferred to Phase 06 | Phase 06 |
| TD-RENT-03 | `settings` table has no admin UI — values require direct DB access | Future Settings phase |

---

## Verification State

**Phase 05 Implementation:** COMPLETE  
**Verification Gate 1:** FAILED (F-01 through F-06)  
**Remediation Pass 1:** COMPLETE (3783c61)  
**Verification Gate 2:** FAILED (VG2-F-01 through VG2-F-04 + documentation)  
**Remediation Pass 2 (Final):** COMPLETE — PENDING FINAL VERIFICATION GATE  

---

*Last updated: 2026-09-21 (Phase 05 Final Remediation — component status updated to IMPLEMENTED, insertId strategy documented, operational status boundary clarified, config error behavior documented, test coverage table added)*


---

## Business Responsibility

- Skate rental lifecycle: start → active → return
- Late fee calculation and collection/waiver
- Rental status monitoring
- Payment collection (single or split)
- Integration with inspection workflow on return

---

## Business Rules

1. Skate must be `available` to start a rental
2. Only one active rental per skate at any time (concurrent prevention required)
3. Rental price comes from configuration (stored at time of rental, not referenced later)
4. Expected end time = `started_at` + `duration_minutes`
5. Late time starts only after `expected_end_at`
6. Late fee = `late_minutes × configured_rate_per_minute`
7. System distinguishes: calculated fee, collected fee, waived fee
8. Late fee waiver requires the `waivers.approve` permission
9. Every waiver must be recorded in audit log with user, amount, timestamp, reason
10. Skate becomes `rented` on rental start; back to inspection on return
11. Historical rental amounts are immutable after creation

---

## Frontend

**Location (target):** `apps/web/src/modules/rentals/`

**Key screens:**
- Skate selection grid (cashier home)
- Rental POS form (duration, price, customer, payment)
- Rental summary / confirmation
- Active rentals table
- Return flow (return time, late fee, payment)

---

## Backend

**Location (target):** `apps/api/src/modules/rentals/`

**Key services:**
- `RentalService.startRental()` — atomic: validate skate + create rental + record payment + update treasury + update skate status
- `RentalService.returnRental()` — record return time + calculate late fee + trigger inspection
- `RentalService.waiveLateFee()` — check permission + record waiver + create audit entry
- `RentalService.getActiveRentals()` — return rentals with computed remaining time

---

## Database

| Table | Purpose |
|---|---|
| `rentals` | Core rental record |
| `rental_payments` | Payment components (supports split) |
| `late_fee_records` | Calculated, collected, waived amounts |

**See:** `docs/architecture/DATABASE_ARCHITECTURE.md` for full schema.

---

## APIs

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/rentals` | Start rental |
| GET | `/api/v1/rentals` | List rentals |
| GET | `/api/v1/rentals/active` | Active rentals |
| GET | `/api/v1/rentals/:id` | Rental detail |
| POST | `/api/v1/rentals/:id/return` | Return skate |
| POST | `/api/v1/rentals/:id/waive-late-fee` | Waive late fee |
| GET | `/api/v1/rentals/calculate-price` | Preview price |

---

## Permissions

| Permission Key | Description |
|---|---|
| `rentals.view` | View rental list and details |
| `rentals.create` | Start a new rental |
| `rentals.return` | Return a rental |
| `waivers.approve` | Waive late fees |

---

## Related Modules

- SKATES — skate availability and status
- CUSTOMERS — customer selection / creation
- PAYMENTS — payment recording
- TREASURY — financial movements
- INSPECTIONS — triggered on return
- NOTIFICATIONS — rental expiry alerts
- CASHIER_SHIFTS — shift context
- AUDIT_LOG — waiver auditing
- REPORTS — rental reports

---

## Tests

**Target location:** `tests/rentals/`

**Critical tests (see TEST_MATRIX.md):**
- Cannot rent unavailable skate
- Cannot rent skate in maintenance
- Rental price calculated correctly
- Historical amount immutable
- Concurrent rental prevented
- Expected end time correct
- Late fee calculation (on-time: 0 fee, late: correct fee)
- Waiver with permission
- Waiver without permission (403)
- Waiver creates audit entry

---

## Known Issues

*None — not yet implemented.*

---

## Known Technical Debt

*None — not yet implemented.*

---

## Future Work

- Support for custom duration (beyond predefined options)
- Rental renewal / extension workflow
- Customer rental history in detail view

---

## Verification Requirements

Before marking RENTALS as COMPLETED:
- [ ] All critical tests passing (see TEST_MATRIX.md items 10–25)
- [ ] Late fee calculation verified against multiple scenarios
- [ ] Concurrent rental prevention tested
- [ ] Waiver audit verified
- [ ] RTL layout verified for Rental POS, Active Rentals, Return flow
- [ ] Arabic text throughout
- [ ] Mobile usable for core flow

---

*Last updated: 2026-09-09*

---

## Desktop UI/UX audit — 2026-10-11

**Status:** IMPLEMENTED — desktop presentation changes; verification evidence is maintained in the [central desktop audit report](../quality/DESKTOP_UI_UX_AUDIT.md).

- **Source coverage:** Rental list, all four POS steps, inline customer creation, active cards, rental details and extension, return inspection, finalization payments and damage-report dialogs.
- **Changes:** Desktop POS progress aligns with the existing form width; the skate-selection step no longer nests two padded cards. RTL step arrows and long labels are corrected. Active/detail cards wrap long content, Arabic detail values align right, and invoice amounts remain legible. Return/finalization dialogs retain one scrollable content area with reachable action rows. Existing frontend DTO declarations now include the nullable lateMinutes and lateFeeCollected fields already returned by the server and rendered by finalization; calculations and payloads are unchanged.
- **Boundary:** All new visual rules use `@media screen and (min-width: 1024px)`. Presentation below 1024px, API requests, permissions, validation, financial calculations and workflows are preserved.
- **Verification:** See the central report for the actual build, lint, synthetic-browser and below-desktop regression results. This audit does not claim new live financial or database verification.


## Phone/tablet presentation — 2026-10-12

Rental lists, active cards, detail grids and the creation wizard fit phone/tablet widths. Inspection and payment rows reflow, and existing rental-content error scrolling is preserved with reachable actions. Rental pricing, lifecycle and payloads are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.

Completion review (2026-10-13): rental search controls have Arabic accessible names, and skate/duration choices expose pressed state. The full customer-to-review wizard was exercised with synthetic data without starting a rental.


## Approved sub-treasury integration — 2026-10-16

Current finalization locks the acting cashier/session inside its transaction, routes cash to the assigned drawer and electronics to mapped accounts, and stores actual account snapshots. Start/return/extension/unpaid cancellation remain noncollections, with existing shift requirements checked in their transaction. Required financial audit rolls back finalization on failure.

Authority: [ST-01–06](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). Current workflow: [Treasury](TREASURY.md). Executed checks and limits: [verification report](../quality/SUB_TREASURY_VERIFICATION.md). Earlier proposal/pending wording is historical and superseded only within this approved scope.
