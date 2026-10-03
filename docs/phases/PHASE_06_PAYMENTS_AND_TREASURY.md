# Phase 06 — Payments and Treasury

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.2 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.2)

---

> [!IMPORTANT]
> **Gate 5.2 Note:** This document replaces a minimal 48-line closure stub that lacked
> requirements traceability, a verification matrix, and accurate finding statuses.
> The prior stub declared status `COMPLETE` without a systematic evidence baseline.
> This reconciliation does NOT change the underlying implementation or test results.

---

## 1. Purpose

Implement payment recording for rental transactions, support split payments across
multiple configured payment methods, manage treasury accounts, record immutable
treasury movements, and support automated refund movements on rental cancellation.

**Evidence source:** Master Business Specification §14 (Payments and Split Payments),
§5 (Roles — Cashier), and implementation verified via Phase 06 closure commit `cab5a19`.

---

## 2. Scope

### 2.1 Authoritative Scope (Master Business Specification §14)

- Payment methods: Cash, Card, InstaPay, Vodafone Cash, and admin-configured others
- Split payments: multiple payment methods per single transaction
- Each payment component individually identifiable but linked to same transaction
- Treasury/account association for each payment component
- Support for additional charge types at return (late fees, damage charges)

### 2.2 Implementation-Derived Scope (INFERRED FROM IMPLEMENTATION)

The following were implemented as part of Phase 06 but their exact original business
specification form is not separately documented beyond the master spec §14:

- `treasury_accounts` table — tracks named accounts with balances
- `payment_methods` table — configurable mapping of method types to treasury accounts
- `rental_payments` join table — links rentals to payment records
- `treasury_movements` immutable ledger — inflow/outflow records with reference linkage
- Seeded accounts: Main Cash, Bank, Card, InstaPay, Other (pre-seeded for Phase 06)
- Exact-match payment rule: `payments` total must equal `rentalAmount` or rental is rejected
- Automated inverse `treasury_movements` for cancellation refunds

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P06-01 | System must support multiple payment methods in one transaction (split payment) | Master Spec §14 | IMPLEMENTED |
| BR-P06-02 | Each payment component must be individually identifiable but linked to same transaction | Master Spec §14 | IMPLEMENTED |
| BR-P06-03 | Payments must be associated with the appropriate treasury/account | Master Spec §14 | IMPLEMENTED |
| BR-P06-04 | Return workflow must support additional charges (late fees, damage) | Master Spec §14 | IMPLEMENTED — Late fee in Phase 07; damage in Phase 08 |
| BR-P06-05 | Payment methods are configurable by Administrator | Master Spec §14 | IMPLEMENTED — via `payment_methods` table |
| BR-P06-06 | Treasury records must be immutable after creation | Master Spec (inferred from audit principle) | INFERRED FROM IMPLEMENTATION — `treasury_movements` records are INSERT-only; no UPDATE path observed |
| BR-P06-07 | Rental cancellation must refund upfront payments | Phase 06 implementation | IMPLEMENTED — inverse `treasury_movements` with `type=out` |
| BR-P06-08 | Exact payment total required to start rental | Phase 06 implementation | IMPLEMENTED — 422 on mismatch (INVALID_PAYMENT_TOTAL) |

---

## 4. Functional Behavior

### 4.1 Payment Methods

- `GET /api/v1/payments/methods` — returns active payment methods; requires `rentals.create` permission
- `GET /api/v1/payments/treasury-accounts` — returns treasury accounts with balances; requires `treasury.view` permission
- Source: `apps/api/src/modules/payments/payments.routes.ts`, `payments.service.ts`

### 4.2 Rental Payment Recording

Payment recording is embedded within `startRental()` in `rentals.service.ts`, not
in the payments module directly.

- `payments` array is required in `POST /api/v1/rentals` body
- Backend sums payment amounts and compares against computed `rentalAmount`
- On mismatch: HTTP 422 with `INVALID_PAYMENT_TOTAL` error code
- On match: atomically inserts into `rental_payments` and `treasury_movements` within same DB transaction
- Source: `rentals.service.ts`, `payments.service.ts`

### 4.3 Cancellation Refund

- `POST /api/v1/rentals/:id/cancel` triggers inverse treasury movements
- Original `rental_payments` records are NOT deleted
- New `treasury_movements` records with `type=out` are created referencing the rental ID
- Source: `rentals.service.ts` (cancelRental function)

### 4.4 Treasury Movement Reference Types (INFERRED FROM IMPLEMENTATION)

| reference_type | Direction | Trigger |
|---|---|---|
| rental_payment | in | Rental started |
| rental_refund | out | Rental cancelled |
| late_fee_payment | in | Late fee collected at return |
| damage_charge_payment | in | Damage charge collected |
| maintenance_payment | out | Maintenance cost paid from treasury |
| sale_payment | in | Sales POS transaction |
| sale_refund | out | Sale cancelled |
| expense | out | Expense recorded |

*Source: INFERRED FROM IMPLEMENTATION — consolidated from multiple module service files.*

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `payment_methods` | Named payment methods mapped to treasury accounts | `db/schema/payments.ts` |
| `treasury_accounts` | Named treasury/cash accounts with current balance | `db/schema/payments.ts` |
| `rental_payments` | Per-rental payment records (can be multiple for split) | `db/schema/payments.ts` |
| `treasury_movements` | Immutable ledger of all inflows and outflows | `db/schema/payments.ts` |

### 5.2 Key Fields

- `rental_payments.payment_type` — ENUM: `rental`, `late_fee`, `damage_charge` (added Phase 07)
- `treasury_movements.reference_type` — identifies the originating business event
- `treasury_movements.reference_id` — foreign reference ID (rental, sale, etc.) — NULLABLE (see F-002)
- `treasury_movements.shift_id` — cashier shift at time of movement (required for financial traceability per F-007)

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/payments/methods` | `rentals.create` | List active payment methods |
| GET | `/api/v1/payments/treasury-accounts` | `treasury.view` | List treasury accounts with balances |

**Note:** Payment recording (create) is not exposed as a standalone endpoint.
It is embedded within rental creation, return, damage collection, sale creation,
and maintenance payment endpoints in their respective modules.

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `rentals.create` | Required to view payment methods | `payments.routes.ts` line 18 |
| `treasury.view` | Required to view treasury accounts | `payments.routes.ts` line 33 |
| `damage.collect_charge` | Required to collect damage payments | `damage.routes.ts` line 57 |
| `waivers.approve` | Required to waive damage/late-fee charges | `damage.routes.ts` line 71 |
| `maintenance.pay` | Required to pay maintenance costs | `maintenance.routes.ts` lines 98, 113 |

---

## 8. Financial Integrity

| Rule | Evidence | Verification |
|---|---|---|
| Rental payment recording is atomic | `rentals.service.ts` — single DB transaction | TESTED — TC-PAY-03 |
| Exact payment total required | `rentals.service.ts` — INVALID_PAYMENT_TOTAL | TESTED — TC-PAY-02 |
| Cancellation refund creates inverse movement | `rentals.service.ts` — cancelRental | TESTED — TC-PAY-04 |
| Damage charge collection requires active shift (F-007) | `damage.service.ts` lines 262-278 | VERIFIED — Gate 4.2 Batch 1 |
| Maintenance payment requires active shift | `maintenance.service.ts` lines 456-462 | TESTED — maintenance-payments.test.ts |

### F-002 Status

**F-002 — BLOCKED: PRODUCTION EVIDENCE UNAVAILABLE**

Finding: `treasury_movements.reference_id` is nullable. Whether all financial
operations consistently populate this field in production cannot be verified without
a live production environment. No deployment exists.

This finding remains open per Gate 4.1 decision: deferred to first production
deployment. Do NOT reclassify as VERIFIED without production evidence.

---

## 9. Testing

### 9.1 Primary Test File

| File | Test Count | Coverage |
|---|---|---|
| `payments.test.ts` | 6 | Payment methods endpoint, treasury accounts endpoint, payment rejection, exact total rejection, payment + treasury movement creation, cancellation refund |

### 9.2 Test Cases

| ID | Description | Status |
|---|---|---|
| TC-PAY-GET-METHODS | GET /payments/methods returns active methods | TESTED |
| TC-PAY-GET-ACCOUNTS | GET /payments/treasury-accounts requires treasury.view | TESTED |
| TC-PAY-01 | startRental rejects missing/empty payments array | TESTED |
| TC-PAY-02 | startRental rejects incorrect payment total | TESTED |
| TC-PAY-03 | startRental creates rental + payment + treasury movement | TESTED |
| TC-PAY-04 | cancelRental creates refund treasury movement | TESTED |

### 9.3 Related Tests in Other Files

- `rentals.test.ts` — regressions include payment payloads in rental creation
- `gate42-batch1.test.ts` — F-007 damage charge active-shift enforcement
- `maintenance-payments.test.ts` — maintenance payment treasury movement
- `sales.test.ts` — sale payment treasury movement

---

## 10. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| Split payment support | `rentals.service.ts` | TC-PAY-03 (single method only) | TESTED — multi-method path untested in isolation | Master Spec §14 + Phase 06 closure |
| Exact total enforcement | `rentals.service.ts` | TC-PAY-02 | TESTED | Phase 06 closure doc |
| Treasury movement on payment | `rentals.service.ts` | TC-PAY-03 | TESTED | Phase 06 closure doc |
| Refund on cancellation | `rentals.service.ts` cancelRental | TC-PAY-04 | TESTED | Phase 06 closure doc |
| Active shift for damage collection | `damage.service.ts` F-007 fix | `gate42-batch1.test.ts` | VERIFIED | Gate 4.2 Batch 1 |
| Treasury accounts list endpoint | `payments.service.ts` | TC-PAY-GET-ACCOUNTS | TESTED | Phase 06 impl |
| F-002 reference_id consistency | `treasury_movements` schema | None (production-dependent) | BLOCKED | Gate 4.1 decision |

---

## 11. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P06-01 | F-002: reference_id nullable — production consistency unverifiable without deployment | MEDIUM — deferred |
| G-P06-02 | Multi-method split payment path is untested by automated tests (TC-PAY-03 uses single method only) | LOW |
| G-P06-03 | `docs/modules/PAYMENTS.md` remains a stub dated 2026-09-09 with status "PLANNED / NOT IMPLEMENTED" — contradicts actual state | DOCUMENTATION INCONSISTENCY |

---

## 12. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| OWNER-001 | Payment consolidation strategy (Option A/B/C) — see PROJECT_STATE.md | PENDING OWNER DECISION — F-005 blocked on this |
| F-002 deferred | Defer production reference_id verification to first production deployment | DECIDED — deferred per Gate 4.1 |

---

## 13. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 06 Implementation | 2026-09-21 | Initial implementation. Commit `cab5a19`. |
| Gate 4.1 | 2026-10-02 | F-002 identified (treasury reference_id nullable). Deferred to production. |
| Gate 4.2 Batch 1 | 2026-10-02 | F-007 resolved: damage charge collection now requires active shift. |
| Gate 5 | 2026-10-03 | P06 documentation state identified as CONFLICTING (CLOSED in PROJECT_STATE, minimal stub in phase doc). |
| Gate 5.2 | 2026-10-03 | This document created. Phase stub replaced with evidence-traceable specification. |

---

## 14. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Core payment recording, exact-total enforcement, cancellation refunds: TESTED (6 automated tests)
- Active-shift enforcement for damage collection: VERIFIED (Gate 4.2 Batch 1)
- F-002: BLOCKED — production evidence unavailable; no deployment exists
- Split-payment multi-method automated test path: not covered
- OWNER-001: unresolved

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

---

*Last updated: 2026-10-03 (Gate 5.2 — Documentation Reconciliation. Replaced 48-line closure stub with full evidence-traceable specification.)*
