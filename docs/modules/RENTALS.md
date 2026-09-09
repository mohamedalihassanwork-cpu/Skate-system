# Module: Rentals

**Status:** PLANNED / NOT IMPLEMENTED  
**Last updated:** 2026-09-09

---

## Purpose

The Rentals module is the core operational module of KOSHK SKATE ERP. It manages the full rental lifecycle from skate selection through payment, active monitoring, return, and late fee handling.

---

## Current Status

| Component | Status |
|---|---|
| Frontend — Rental POS | PLANNED |
| Frontend — Active Rentals view | PLANNED |
| Frontend — Return workflow | PLANNED |
| Backend — Rental service | PLANNED |
| Backend — Late fee calculation | PLANNED |
| Database — rentals table | PLANNED |
| Database — rental_payments table | PLANNED |
| Database — late_fee_records table | PLANNED |
| API routes | PLANNED |
| Tests | PLANNED |

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
