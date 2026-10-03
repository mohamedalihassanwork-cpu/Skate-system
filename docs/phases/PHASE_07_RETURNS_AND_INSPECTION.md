# Phase 07 — Returns and Inspection

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.2 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.2)

---

> [!IMPORTANT]
> **Gate 5.2 Note:** This document replaces a PLANNED stub that had no requirements,
> no verification evidence, and no implementation details. The phase was substantially
> implemented and tested but undocumented. This reconciliation establishes the
> evidence-traceable baseline. No application code was changed.

---

## 1. Purpose

Implement the skate return workflow including: late fee calculation and collection,
inspection recording (condition per component), waiver of late fees with permission
control, and handoff to damage reporting when maintenance is required.

**Evidence source:** Master Business Specification §15–§19, §14, CHANGELOG 2026-09-22
Phase 07 entries, `returns.test.ts`, `rentals.service.ts`, and RBAC seed data.

---

## 2. Scope

### 2.1 Authoritative Scope (Master Business Specification §15–§19 + CHANGELOG)

- Return workflow: cashier processes a skate return via `POST /api/v1/rentals/:id/return`
- Late fee calculation: automatic, based on configurable `late_fee_per_minute` setting
- Late fee collection: payment recorded in `rental_payments` and `treasury_movements`
- Late fee waiver: waiver requires `waivers.approve` permission (Administrator only by default)
- Inspection recording: condition fields per skate component
- Maintenance flag: inspection can flag `maintenanceRequired`
- Rental state transition: `active` → `returned`
- Skate state transition: `rented` → `available` OR `rented` → `maintenance`

### 2.2 Implementation-Derived Behavior (INFERRED FROM IMPLEMENTATION)

- Inspection stores per-component condition: `wheelsCondition`, `brakeCondition`,
  `strapCondition`, `bearingsCondition`, `bodyCondition`
- Condition values: `good`, `minor_damage`, `major_damage` (INFERRED from test evidence)
- `late_fee_records` table: records `calculated_fee`, `collected_fee`, `waived_fee`
- `rental_payments.payment_type = 'late_fee'` distinguishes late fees from initial rental payment
- If `waivedFee > 0` and user lacks `waivers.approve` → HTTP 403
- Late fee treasury movement only created when `collectedFee > 0` (waived-only returns do not create movement)
- Source: `returns.test.ts`, `rentals.service.ts`

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P07-01 | Cashier can initiate skate return | Master Spec §15, CHANGELOG 2026-09-22 | IMPLEMENTED |
| BR-P07-02 | System calculates late fee automatically based on configurable rate per minute | Master Spec §16, CHANGELOG | IMPLEMENTED |
| BR-P07-03 | Late fee payment is collected at return time | Master Spec §14 | IMPLEMENTED |
| BR-P07-04 | Late fee waiver requires `waivers.approve` permission | CHANGELOG Phase 07, `returns.test.ts` | TESTED |
| BR-P07-05 | Inspection records skate component conditions | CHANGELOG Phase 07 | IMPLEMENTED |
| BR-P07-06 | Inspection can flag `maintenanceRequired` | CHANGELOG Phase 07 | IMPLEMENTED |
| BR-P07-07 | Rental status transitions to `returned` on return | CHANGELOG Phase 07 | TESTED |
| BR-P07-08 | Skate status transitions to `available` or `maintenance` depending on inspection | CHANGELOG Phase 07 | TESTED |
| BR-P07-09 | Late fee records are retained for historical reference | Master Spec (audit principle) | IMPLEMENTED — `late_fee_records` table |
| BR-P07-10 | Late fee payment creates corresponding treasury movement | CHANGELOG Phase 07 | TESTED |
| BR-P07-11 | Waived-only returns do NOT create a treasury movement for 0-amount | `returns.test.ts` | TESTED |

---

## 4. Functional Behavior

### 4.1 Return Endpoint

`POST /api/v1/rentals/:id/return`

Required permission: `rentals.return`

Payload:
- `waivedFee` — amount of late fee to waive (0 if not waiving)
- `waiverReason` — required when `waivedFee > 0`
- `payments` — array of payment objects for late fee collection (empty if no late fee or full waiver)
- `inspection` — inspection object with per-component condition fields

### 4.2 Late Fee Calculation

- Late fee is calculated server-side from `expected_end_at` vs current time
- Rate from settings key `late_fee_per_minute` (INFERRED FROM IMPLEMENTATION — exact key name from `returns.test.ts` context)
- Formula: `Math.ceil(lateMinutes) * ratePerMinute` (INFERRED FROM IMPLEMENTATION from test calculations: 10 min late = 20 EGP implies 2 EGP/min rate)
- On-time returns: no late fee collected; `payments` array can be empty

### 4.3 Inspection Recording

Inspection fields (all required, INFERRED FROM TEST EVIDENCE):
- `wheelsCondition`
- `brakeCondition`
- `strapCondition`
- `bearingsCondition`
- `bodyCondition`
- `maintenanceRequired` (boolean)

When `maintenanceRequired = true`:
- Skate status → `maintenance`
- Maintenance record may be auto-created (see Phase 08/09 integration)

### 4.4 State Transitions

| Scenario | Rental Status | Skate Status |
|---|---|---|
| On-time return, no damage | returned | available |
| Late return, fee paid | returned | available |
| Late return, fee waived | returned | available |
| Return with maintenance flag | returned | maintenance |

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `inspections` | Per-return inspection records with component conditions | `db/schema/inspections.ts` |
| `late_fee_records` | Late fee calculation and collection record per rental | `db/schema/rentals.ts` or similar |
| `rental_payments` | Extended with `payment_type = 'late_fee'` | `db/schema/payments.ts` |
| `treasury_movements` | Extended with `reference_type = 'late_fee_payment'` | `db/schema/payments.ts` |

### 5.2 Key Fields (INFERRED FROM IMPLEMENTATION)

- `inspections.rental_id` — FK to rentals (NOT NULL — verified from test cleanup SQL)
- `inspections.wheels_condition`, `brake_condition`, `strap_condition`, `bearings_condition`, `body_condition`
- `inspections.maintenance_required` — boolean
- `late_fee_records.calculated_fee`, `collected_fee`, `waived_fee`
- `rental_payments.payment_type` — `rental` | `late_fee` | `damage_charge`

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/v1/rentals/:id/return` | `rentals.return` | Process skate return with inspection and fee handling |

**Note:** The return endpoint is registered in `rentals.routes.ts`, not a separate returns module.

---

## 7. Permissions

| Permission | Role | Evidence |
|---|---|---|
| `rentals.return` | Cashier, Administrator | `returns.test.ts` — cashierToken accepted |
| `waivers.approve` | Administrator only | `returns.test.ts` — cashierToken rejected 403 on waiver attempt |

---

## 8. Financial Integrity

| Rule | Evidence | Verification |
|---|---|---|
| Late fee payment amount must match calculated fee | `returns.test.ts` — underpayment rejected 422 | TESTED |
| Late fee collection creates `rental_payments` with `payment_type = late_fee` | `returns.test.ts` lines 304-306 | TESTED |
| Late fee collection creates treasury movement with `reference_type = late_fee_payment` | `returns.test.ts` lines 308-310 | TESTED |
| Waiver recorded in `late_fee_records.waived_fee` | `returns.test.ts` lines 356-358 | TESTED |
| Zero-collection waiver does NOT create treasury movement | `returns.test.ts` lines 361-363 | TESTED |
| Active shift dependency at return | Test setup inserts active shift for cashier | INFERRED — shift inserted in test setup; production behavior UNKNOWN without shift enforcement code inspection |

---

## 9. Testing

### 9.1 Primary Test File

| File | Test Count | Coverage |
|---|---|---|
| `returns.test.ts` | ~8 tests | Return auth, permission, on-time return, underpayment rejection, waiver permission rejection, late return with fee, late return with full waiver, skate status transitions |

### 9.2 Test Cases

| ID | Description | Status |
|---|---|---|
| TC-RET-AUTH | Returns 401 without token | TESTED |
| TC-RET-PERM | Returns 403 without rentals.return permission | TESTED |
| TC-RET-01 | On-time return succeeds; no fees; skate → available | TESTED |
| TC-RET-02 | Late return with underpayment rejected 422 | TESTED |
| TC-RET-03 | Waiver attempt by user without waivers.approve rejected 403 | TESTED |
| TC-RET-04 | Late return with full fee payment; skate → maintenance (maintenanceRequired=true) | TESTED |
| TC-RET-05 | Late return with full waiver; waiver recorded; no treasury movement | TESTED |

### 9.3 Known Test Environment Issue

The `reservations.test.ts` file uses timing-sensitive fixtures. During one Gate 5.1.1
test suite run, a pre-existing flake was observed (unrelated to returns).
Returns tests themselves do not exhibit this issue but the project-level test suite
cannot be declared fully deterministic for all environment conditions.

---

## 10. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| Return endpoint accessible | `rentals.routes.ts` | TC-RET-AUTH, TC-RET-PERM | TESTED | CHANGELOG 2026-09-22 |
| Late fee calculation (server-side) | `rentals.service.ts` | TC-RET-04 | TESTED | CHANGELOG + impl |
| Late fee payment recording | `rentals.service.ts` | TC-RET-04 | TESTED | CHANGELOG + impl |
| Waiver permission enforcement | `rentals.service.ts` | TC-RET-03 | TESTED | CHANGELOG + impl |
| Inspection recording | `rentals.service.ts` + `inspections` table | TC-RET-04 | TESTED | CHANGELOG |
| Skate → maintenance on flag | `rentals.service.ts` | TC-RET-04 | TESTED | CHANGELOG |
| Skate → available on clean return | `rentals.service.ts` | TC-RET-01 | TESTED | CHANGELOG |
| Treasury movement for late fee | `rentals.service.ts` | TC-RET-04 | TESTED | CHANGELOG |
| No treasury movement on waiver | `rentals.service.ts` | TC-RET-05 | TESTED | impl |
| Active shift requirement at return | Not independently tested | UNKNOWN — test setups insert shift but enforcement not isolated-tested | UNKNOWN | |

---

## 11. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P07-01 | No formal pre-Gate-5.2 phase specification existed — all requirements derived from CHANGELOG, tests, and implementation | DOCUMENTATION |
| G-P07-02 | Active shift enforcement at return time: test setup inserts active shifts for users, but whether the return endpoint itself enforces shift presence has not been isolated-tested | MEDIUM |
| G-P07-03 | Exact condition value enum (`good`, `minor_damage`, `major_damage`) — inferred from test payloads, not from a formal business decision record | INFERRED |
| G-P07-04 | `docs/modules/RETURNS_INSPECTION.md` module doc remains a stub and contradicts actual implemented state | DOCUMENTATION INCONSISTENCY |

---

## 12. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| Active-Shift at return | Whether return requires an active shift (OWNER-001 related) | PENDING OWNER DECISION — see PROJECT_STATE.md OWNER-001 |

---

## 13. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 07 Implementation | 2026-09-22 | Return workflow, late fees, inspection, waivers implemented. See CHANGELOG 2026-09-22. |
| Gate 5 | 2026-10-03 | P07 identified as PLANNED stub while implementation was present. Documentation/source drift. |
| Gate 5.2 | 2026-10-03 | This document created from CHANGELOG, test, and implementation evidence. |

---

## 14. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Return workflow, late fee calculation, collection, waiver, inspection: TESTED (~8 tests)
- Rental/skate state transitions: TESTED
- Active-shift enforcement at return: UNKNOWN — not isolated-tested
- No formal pre-implementation specification existed; all requirements are CHANGELOG/implementation-derived
- No browser verification performed (Playwright blocked per Phase 06 note)

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

*Last updated: 2026-10-03 (Gate 5.2 — Documentation Reconciliation. Replaced PLANNED stub with evidence-traceable specification derived from CHANGELOG, test files, and implementation.)*
