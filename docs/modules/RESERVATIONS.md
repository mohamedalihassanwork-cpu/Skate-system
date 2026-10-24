# Module: Reservations

**Status:** IMPLEMENTED — repaired workflow; current verification linked below
**Last updated:** 2026-10-24

## Current reservation execution review

The CRUD implementation exists in `apps/web/src/modules/reservations/` and `apps/api/src/modules/reservations/`. The planned sections below are historical stubs. [Phase 10](../phases/PHASE_10_RESERVATIONS.md) describes the intended fulfillment/conflict rules, but its old passing-test claims do not verify the current multi-skate rental API.

The [approved repair](../decisions/RESERVATION_RENTAL_WORKFLOW_CR.md) restores backend fulfillment/conflict checks, adds a persistent link and eliminates repeated duration entry. The owner selected full booked duration on 2026-10-24. See [actual verification](../quality/RESERVATION_RENTAL_VERIFICATION.md); historical results below are not evidence for the current implementation.

## Current execution contract — 2026-10-24

1. The cashier selects `تنفيذ الإيجار`; the existing Rental POS opens directly at review with the booking's customer/skate, reserved start/end, full duration and server price estimate. Loading, invalid/stale booking and price errors block activation and offer retry/back.
2. `POST /api/v1/rentals` accepts `reservationId`, matching `customerId` and `skateIds`. `durationMinutes` may be omitted; any supplied duration cannot override the persisted booking interval. Every selected skate is checked; the reserved skate must be included. The current UI executes the reserved skate, while the existing multi-item API remains supported.
3. The backend derives `(reserved_until - reserved_from) / 60000` under the reservation lock. The existing positive-integer rental duration rule applies; malformed, zero or fractional-minute windows require correcting the reservation rather than rounding.
4. `reserved_from`/`reserved_until` remain unchanged. Actual item/rental start is server activation time at DATETIME second precision. Expected item return = actual start + full booked duration. For 16:00–17:00 executed at 16:15, expected return is 17:15.
5. Pending/confirmed, unexpired reservations may execute early or after their reserved start. No arrival grace period is introduced. Cancelled, fulfilled and expired bookings are rejected. Lazy expiry uses `reserved_until <= UTC_TIMESTAMP()` because stored windows are UTC; the driver timezone option does not set MySQL's session clock.
6. Skate/customer/reservation checks, rental/items, the persistent link, fulfillment, rented status and start audit commit atomically. Concurrent execution cannot consume the same booking twice. Reservation edits re-read status and times under locks, and cannot edit a booking after fulfillment.

## Occupancy and financial boundaries

- Active reservation windows are half-open: an interval ending exactly at another's start does not overlap. Shifted execution must fit around every other pending/confirmed booking on every selected skate.
- Ordinary rental creation and item extension enforce reservation conflicts. Reservation creation/edit rejects overlap with active rental-item expected occupancy. Sorted skate locks serialize these operations; item return/finalization behavior is unchanged.
- Start and return do not collect money. Each item captures its own actual return/duration/charge. Final payment follows all item returns, with existing late-fee, waiver, shift, split-payment and treasury rules.
- `rentals.reservation_id` is a nullable unique FK; rental reads expose `reservationId`, reservation list/detail expose derived `rentalId`. Walk-ins and historical records remain null. Fulfilled historical bookings without an established link are not guessed or backfilled. Rental cancellation does not reopen a consumed reservation.

## Current implementation map

| Layer | Files |
|---|---|
| Frontend | `apps/web/src/modules/reservations/ReservationsPage.tsx`, `reservations.service.ts`; `apps/web/src/modules/rentals/RentalPOSPage.tsx`, `rentals.service.ts` |
| Backend | `apps/api/src/modules/reservations/reservations.service.ts`, `reservations.types.ts`; `apps/api/src/modules/rentals/rentals.service.ts`, `rentals.types.ts`, `rentals.routes.ts` |
| Schema | `apps/api/src/db/schema/rentals.ts`, migration `0022_reservation_rental_link.sql` and metadata |
| Tests | `apps/api/src/tests/reservations.test.ts`, `tests/reservation_rental_ui.py` |

Permissions remain `reservations.view/create/edit/cancel` and `rentals.create`; no new endpoint, permission, ledger or lifecycle was introduced.

## Historical module stub and presentation records

---

## Purpose

Allows pre-booking of skates for future use. Prevents conflicting reservations.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Conflicting reservations are prohibited
- Reserved skate is not treated as normally available during reservation period
- Reservation linked to customer and optionally to specific skate or size

---

## Frontend

**Target location:** `apps/web/src/modules/` (path TBD during implementation)

---

## Backend

**Target location:** `apps/api/src/modules/` (path TBD during implementation)

---

## Database

See `docs/architecture/DATABASE_ARCHITECTURE.md` for relevant tables.

---

## APIs

See `docs/architecture/API_ARCHITECTURE.md` for relevant routes.

---

## Permissions

To be defined during implementation phase.

---

## Related Modules

To be documented during implementation.

---

## Tests

**Target location:** `tests/` (TBD during implementation)

See `docs/quality/TEST_MATRIX.md` for relevant test cases.

---

## Known Issues

*None — not yet implemented.*

---

## Known Technical Debt

*None — not yet implemented.*

---

## Future Work

To be defined during or after implementation.

---

## Verification Requirements

To be defined during implementation phase. Reference `docs/00-governance/DEFINITION_OF_DONE.md`.

---

*Last updated: 2026-09-09*

---

## Desktop UI/UX audit — 2026-10-11

**Status:** IMPLEMENTED — desktop presentation changes; verification evidence is maintained in the [central desktop audit report](../quality/DESKTOP_UI_UX_AUDIT.md).

- **Source coverage:** Reservation status list and actions, create/edit reservation dialog and cancellation confirmation.
- **Changes:** The reservation form now separates shared fields/groups by the approved 16px desktop gap and permits its date-time field wrappers to shrink. Existing customer-ID entry, reservation fulfillment and cancellation behavior are unchanged.
- **Boundary:** All new visual rules use `@media screen and (min-width: 1024px)`. Presentation below 1024px, API requests, permissions, validation, financial calculations and workflows are preserved.
- **Verification:** See the central report for the actual build, lint, synthetic-browser and below-desktop regression results. This audit does not claim new live financial or database verification.

The original planned-only sections above are historical stubs. Implemented frontend coverage is listed here and in the central audit; implementation and backend verification status are governed by the current project state and phase records.


## Phone/tablet presentation — 2026-10-12

Reservation fields have consistent spacing and a responsive datetime pair; dialog actions wrap. Phone/tablet cancellation uses the shared ConfirmDialog with the existing confirmed cancellation operation. Desktop confirmation behavior and reservation rules are preserved.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.
