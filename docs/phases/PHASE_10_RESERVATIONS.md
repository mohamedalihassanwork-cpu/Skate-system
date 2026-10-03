# Phase 10 — Reservations

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.2 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.2)

---

> [!IMPORTANT]
> **Gate 5.2 Note:** This document replaces a PLANNED stub with no implementation details.
> The phase was fully implemented and tested. This document establishes the evidence-traceable
> baseline. No application code was changed.

---

## 1. Purpose

Implement skate reservation management: creating future reservations for customers,
preventing rental conflicts during reservation windows, lazy-expiration of past reservations,
fulfillment when a rental is started against a reservation, and cancellation.

**Evidence source:** Master Business Specification §8 (Skate statuses — Reserved),
`reservations.service.ts`, `reservations.routes.ts`, `reservations.test.ts`.

---

## 2. Scope

### 2.1 Authoritative Scope (Master Business Specification §8 + impl)

- Reservation links a customer to a specific skate for a future time window
- Reservation prevents other customers from renting that skate during the window
- Cancellation removes the block
- Fulfillment: when rental is started for a reserved skate with matching reservationId,
  reservation status → `fulfilled`
- Lazy expiration: past reservations auto-cancelled when list is fetched

### 2.2 Implementation-Derived Scope (INFERRED FROM IMPLEMENTATION)

- Status values: `confirmed`, `cancelled`, `fulfilled`
- `reservations.service.ts` exports: `createReservation`, `listReservations`, `getReservation`,
  `updateReservation`, `cancelReservation`, `lazyExpireReservations`
- Customer national ID is masked in list view (privacy — consistent with customers module)
- `reservedFrom` and `reservedUntil` define the reservation window
- Overlap detection: rejects if same skate has a confirmed reservation overlapping the requested window
- Reservation can be created without a shift requirement (unlike financial operations)
- Rental start checks for active reservation: if skate has a confirmed reservation and no
  `reservationId` is provided in the rental request, rental is rejected
- Source: `reservations.service.ts`, `reservations.test.ts`

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P10-01 | Create reservation for a customer/skate/time window | impl | IMPLEMENTED |
| BR-P10-02 | Overlap detection: reject if same skate has confirmed reservation overlapping window | `reservations.test.ts` | TESTED |
| BR-P10-03 | Cancelled reservation allows new reservation for same window | `reservations.test.ts` | TESTED |
| BR-P10-04 | Lazy expiration: past confirmed reservations auto-cancelled on list fetch | `reservations.test.ts` | TESTED |
| BR-P10-05 | Rental against reserved skate without reservationId is rejected | `reservations.test.ts` | TESTED |
| BR-P10-06 | Rental against reserved skate with correct reservationId fulfills reservation | `reservations.test.ts` | TESTED |
| BR-P10-07 | Reservation cancellation removes the block | `reservations.test.ts` | TESTED |
| BR-P10-08 | Customer national ID is masked in list view | `reservations.service.ts` maskNationalId | IMPLEMENTED — INFERRED consistent with customers module |

---

## 4. Functional Behavior

### 4.1 Create Reservation

`POST /api/v1/reservations`

- Required permission: `reservations.create`
- Validates `reservedFrom` < `reservedUntil`
- Checks for overlapping confirmed reservations for same skate
- Returns new reservation with status `confirmed`

### 4.2 Lazy Expiration

`lazyExpireReservations()` is called within `listReservations()`:
- Scans for confirmed reservations where `reservedUntil < NOW()`
- Updates their status to `cancelled`
- No background job — expiration happens lazily on list fetch

### 4.3 Rental Fulfillment Integration

Within `startRental()` in `rentals.service.ts`:
- If skate has active confirmed reservation AND no `reservationId` provided → HTTP 422
  with error `SKATE_IS_RESERVED` (INFERRED from test message: "الزلاجة محجوزة حاليا ولا يمكن استئجارها")
- If `reservationId` provided and matches the reservation → reservation → `fulfilled`

### 4.4 Update Reservation

`PUT /api/v1/reservations/:id`

- Allows updating notes, times (within business rules)
- Source: `reservations.routes.ts` line 49

### 4.5 Cancel Reservation

`POST /api/v1/reservations/:id/cancel`

- Required permission: `reservations.cancel`
- Sets status → `cancelled`

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `reservations` | Reservation records with customer, skate, time window, status | `db/schema/reservations.ts` |

### 5.2 Key Fields (INFERRED FROM IMPLEMENTATION)

- `reservations.id` — PK
- `reservations.customer_id` — FK to customers
- `reservations.skate_id` — FK to skates
- `reservations.skate_size` — denormalized size (INFERRED from DTO field)
- `reservations.reserved_from`, `reserved_until` — DateTime
- `reservations.status` — `confirmed` | `cancelled` | `fulfilled`
- `reservations.created_by` — FK to users
- `reservations.notes` — text nullable
- `reservations.created_at`, `updated_at`

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/v1/reservations` | `reservations.create` | Create reservation |
| GET | `/api/v1/reservations` | `reservations.view` | List reservations (triggers lazy expiration) |
| GET | `/api/v1/reservations/:id` | `reservations.view` | Get single reservation |
| PUT | `/api/v1/reservations/:id` | `reservations.edit` | Update reservation |
| POST | `/api/v1/reservations/:id/cancel` | `reservations.cancel` | Cancel reservation |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `reservations.create` | Create reservation | `reservations.routes.ts` line 18 |
| `reservations.view` | View reservations | `reservations.routes.ts` lines 27, 36 |
| `reservations.edit` | Update reservation | `reservations.routes.ts` line 49 |
| `reservations.cancel` | Cancel reservation | `reservations.routes.ts` line 62 |

---

## 8. Testing

### 8.1 Primary Test File

| File | Test Count | Coverage |
|---|---|---|
| `reservations.test.ts` | 6 | Create, overlap rejection, cancel allows re-create, lazy expiration, fulfillment via rental, reserved-skate rental rejection |

### 8.2 Test Cases

| ID | Description | Status |
|---|---|---|
| TC-RES-01 | Creates reservation successfully; status = confirmed | TESTED |
| TC-RES-02 | Prevents overlapping reservations for same skate | TESTED |
| TC-RES-03 | Allows new reservation after previous is cancelled | TESTED |
| TC-RES-04 | Lazy-expires past confirmed reservations on list fetch | TESTED |
| TC-RES-05 | Rental with reservationId fulfills reservation | TESTED |
| TC-RES-06 | Rental without reservationId rejected when skate is reserved | TESTED |

---

## 9. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| Create reservation | `reservations.service.ts` createReservation | TC-RES-01 | TESTED | impl |
| Overlap detection | `reservations.service.ts` | TC-RES-02 | TESTED | impl |
| Cancel allows re-create | `reservations.service.ts` | TC-RES-03 | TESTED | impl |
| Lazy expiration | `reservations.service.ts` lazyExpireReservations | TC-RES-04 | TESTED | impl |
| Rental fulfillment | `rentals.service.ts` startRental + reservations | TC-RES-05 | TESTED | impl |
| Reserved-skate rental rejection | `rentals.service.ts` startRental | TC-RES-06 | TESTED | impl |
| National ID masking | `reservations.service.ts` maskNationalId | None standalone | IMPLEMENTED — NOT TESTED in isolation | impl |

---

## 10. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P10-01 | Lazy expiration is not a background job — expiration only happens on list fetch. If list is never called, reservations remain confirmed past their window. | MEDIUM — known design decision; no background job framework exists |
| G-P10-02 | No RBAC HTTP tests for reservations (401/403 isolation) | LOW |
| G-P10-03 | `docs/modules/RESERVATIONS.md` remains a stub | DOCUMENTATION |
| G-P10-04 | UPDATE endpoint behavior not covered by automated tests | LOW |

---

## 11. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-LAZY-EXP | Lazy expiration (on list fetch) chosen over background job | DECIDED — INFERRED from implementation; no formal decision record found |

---

## 12. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 10 Implementation | 2026-09-22–25 | Reservations module implemented. CHANGELOG entry: "Phase 10 Maintenance and Reservations". |
| Gate 5.2 | 2026-10-03 | This document created. PLANNED stub replaced with evidence-traceable specification. |

---

## 13. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Core CRUD, overlap detection, lazy expiration, fulfillment integration: TESTED (6 automated tests)
- RBAC enforcement and update endpoint: not covered by automated tests
- No pre-implementation specification existed; requirements derived from implementation and tests

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
- **Approved semantic color system** (DEC-034, DEC-041)
- **Approved Badge status API** (DEC-043)
- **Approved typography** (Cairo, design-system.css §3)
- **Approved spacing and radius system** (design-system.css §4-5)
- **Approved motion rules** (AN-001 through AN-014; AN-012/AN-013 PERMANENTLY DEFERRED — DEC-044)
- **Approved currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Approved component APIs** from the existing shared component library

---

*Last updated: 2026-10-03 (Gate 5.2 — Documentation Reconciliation. Replaced PLANNED stub with evidence-traceable specification.)*
