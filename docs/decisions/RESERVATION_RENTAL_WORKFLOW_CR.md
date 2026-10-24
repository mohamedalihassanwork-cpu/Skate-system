# Reservation to rental workflow repair

**Date:** 2026-10-24
**Status:** IMPLEMENTED / TESTED — owner selected full booked duration on 2026-10-24.
**Record:** CR-RESERVATION-RENTAL-2026-10-24 in [Decision Log](DECISION_LOG.md).

## Evidence and root cause before repair

- `RentalPOSPage.tsx` fetches a reservation but only copies customer/skate and calls `setStep(3)`. Neither booked timestamp supplies a duration; the cashier must choose one.
- The multi-skate `startRental()` accepts `reservationId` in its request type but never reads it. It does not validate the booking, fulfill it, or check other reserved windows. The preceding single-skate implementation had these checks.
- `reservations.test.ts` still calls the obsolete `skateId`/start-payment API. Its two integration cases cannot exercise the current multi-skate behavior. Historical passing counts do not verify the current workflow.
- Neither `rentals` nor `reservations` contains a durable relationship to the other. A fulfilled status alone cannot identify the rental that consumed a reservation.
- Reservation edits read their current values before acquiring a lock, do not recheck the active status under the lock, and do not always lock the skate. This directly compromises atomic fulfillment and overlap checks during concurrent editing.
- **Verification finding (2026-10-24):** the first repaired suite passed 24/26; two cases exposed premature lazy expiration of future UTC bookings. The driver timezone option converts dates but does not set MySQL's session timezone, while lazy expiry compares stored UTC values to local `NOW()`. Repair only reservation expiry comparisons to `UTC_TIMESTAMP()` under the already documented UTC storage convention; do not change financial/timezone infrastructure. Retain near-future bookings in regressions so this cannot be hidden by distant test dates.

## Authority and reconciliation

- The owner's current request explicitly preserves actual-duration final billing, partial returns, item-level lifecycle and financial integrity. This takes precedence over historical Phase 05 planned-amount and Phase 06 payment-at-start descriptions.
- Master specification §§13, 16, 26 and Source of Truth rule 5 keep actual activation separate from the reserved window and require conflict prevention. Current rental items hold actual start/return and expected duration/end; reservations hold the original booked window.
- Phase 10 documents fulfillment and rental conflict prevention. Their absence in the current backend is a regression, not an approved removal.
- The reservation module's planned-only sections and the database architecture's single-skate rental description are historical, not the current source model.
- **RESOLVED 2026-10-24:** no earlier approved source defined duration transfer when execution is early/late. The owner now selected the full booked interval. The formula `expected_end = actual_start + duration` alone did not resolve that choice.
- **UNKNOWN provenance:** source comments refer to an owner-approved multi-skate redesign, but its corresponding business specification has not yet been located. The current request explicitly authorizes preserving this behavior; it does not authorize reverting it to Phase 05.

## Owner timing decision — approved 2026-10-24

The owner selected: **"Full booked duration: 60 minutes, expected return 17:15 (recommended)."** Choice A below governs implementation. Choice B is retained only as decision history.

For a booking from 16:00 to 17:00 executed at 16:15:

| Choice | Expected duration/end | Effect |
|---|---|---|
| A — full booked duration (recommended) | 60 minutes; expected return 17:15 | Retains the booked duration; shifted occupancy must not overlap another reservation. |
| B — fixed booked end | 45 minutes; expected return 17:00 | Preserves the booked end; early/late arrival changes the expected duration and late-fee threshold. Additional precision rules would need documenting. |

Both choices keep actual start at execution, actual return at each item's return, and final billing based on actual use. Neither backdates actual start or charges the reserved window as actual use.

## Approved repair scope and implementation plan

1. Reservation execution opens the existing rental review directly, with customer, reserved skate, booked start/end, derived duration and server price estimate. Use existing Arabic/RTL components, loading/error/retry states. Failed or stale reservation loading must not silently become a walk-in rental.
2. Derive the full duration from persisted `reserved_until - reserved_from` on the server. Apply the existing positive-integer-minutes rental validation (DEC-069); reject a non-whole-minute or nonpositive booked duration with a clear error requiring correction of booking times. Do not silently round or invent a duration. Client duration is optional for reservation execution and cannot override this authoritative value.
3. Preserve existing early-execution eligibility while a reservation is pending/confirmed and unexpired; do not add a new arrival grace period. Reject expired/cancelled/fulfilled reservations authoritatively at execution. Check the shifted actual start-to-expected-end interval against all other active reservations.
4. Validate matching customer and reserved skate. Preserve the existing multi-skate rental model; check every selected skate and do not replace per-item timestamps or return/finalization logic.
5. In one transaction: lock affected skates in consistent order and the reservation, validate current state/window, create rental/items, persist the link, mark reservation fulfilled, set skates rented and write the existing start audit with reservation context. Failure must roll back all effects.
6. Add only a nullable unique `rentals.reservation_id` foreign key to `reservations.id`, with a normal additive migration. Walk-ins and historical rows remain null; do not guess historical associations. Expose the link in rental reads. No new service, lifecycle, ledger or background worker.
7. Restore documented reservation conflict checks for walk-ins. Repair concurrent reservation editing sufficiently to share skate locking and revalidate reservation state. Review create/update and item extension overlaps so the same reservation protection cannot be bypassed through a directly related path.
8. Keep configured pricing, actual-duration billing, independent item returns, late fees/waivers, shift requirements, final invoice/payment and treasury atomicity unchanged.

## Verification plan

- Confirm the database safety guard and run tests only against `koshk_skate_test`; never reset or migrate the development database as part of test setup.
- Capture current reservation-suite and code-check baselines before changes.
- Test duration derivation and timestamp separation, stale/invalid/mismatched/reused reservations, exact overlap boundaries, concurrent execution/edit/cancel/conflicting bookings and rollback with no payment/treasury side effects.
- Exercise non-reservation multi-skate creation, partial returns, actual-duration totals, finalization, payment/treasury integrity and unavailable-skate rejection with current APIs.
- Run API build, web build/lint and relevant automated suites. Check Arabic/RTL review at desktop/mobile widths if browser tooling is available; report any gap precisely.
- Update module/phase documentation, affected schema/API documentation, project state/map and changelog with actual results. Review the diff; follow the repository Git completion rules only after the implemented scope is verified.

## Current verification

Implementation and isolated test migration are applied. Actual executed checks, failures corrected during verification and remaining limits are maintained in the [verification report](../quality/RESERVATION_RENTAL_VERIFICATION.md). No development migration or production deployment has been performed.
