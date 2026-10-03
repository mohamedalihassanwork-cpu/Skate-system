# Phase 08 — Damage Management

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.2 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.2)

---

> [!IMPORTANT]
> **Gate 5.2 Note:** This document replaces a PLANNED stub with no implementation details.
> The phase was substantially implemented and tested but undocumented.
> This reconciliation establishes the evidence-traceable baseline.
> No application code was changed.

---

## 1. Purpose

Implement damage report creation, linking damage to inspections and rental events,
customer damage charge collection, damage charge waiver, automatic maintenance record
creation when maintenance is required, and integration with treasury for financial
traceability.

**Evidence source:** Master Business Specification §20 (Damage), CHANGELOG 2026-09-22
Phase 07 integration note, `damage.service.ts`, `damage.routes.ts`,
`gate42-batch1.test.ts`, and Gate 4.2 Batch 1 F-007 finding.

---

## 2. Scope

### 2.1 Authoritative Scope (Master Business Specification §20 + CHANGELOG)

- Damage report creation associated with a skate, optionally linked to rental/inspection
- Customer damage charge: assessed separately from maintenance cost (SOURCE_OF_TRUTH rule 10)
- Payment collection from customer for damage charge
- Damage charge waiver with `waivers.approve` permission
- Partial payment: supported (charge status: pending, partially_paid, paid, waived)
- Automatic skate status transition to `maintenance` when `maintenanceRequired = true`
- Automatic maintenance record creation when `maintenanceRequired = true`

### 2.2 Implementation-Derived Behavior (INFERRED FROM IMPLEMENTATION)

- `damage_reports` table tracks `customer_charge`, `charge_collected`, `charge_waived`, `status`
- Status values: `pending`, `partially_paid`, `paid`, `waived` (derived from `computeStatus()` in `damage.service.ts`)
- Photo upload: NOT implemented (pending UNK-006 file storage decision)
- Active cashier shift required for charge collection (F-007 fix applied in Gate 4.2 Batch 1)
- Overpayment rejected: `OVERPAYMENT_NOT_ALLOWED`
- Over-waiver rejected: `OVERWAIVE_NOT_ALLOWED`
- Audit log entries created for CREATE_DAMAGE_REPORT, COLLECT_DAMAGE_CHARGE, WAIVE_DAMAGE_CHARGE
- Source: `damage.service.ts`, `damage.routes.ts`

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P08-01 | Damage report can be created for any skate | `damage.service.ts` createDamageReport | IMPLEMENTED |
| BR-P08-02 | Damage report can be linked to a rental and/or inspection | `damage.service.ts` lines 66-67 | IMPLEMENTED |
| BR-P08-03 | Customer damage charge is separate from maintenance cost | Master Spec (Source of Truth rule 10) | IMPLEMENTED — separate fields |
| BR-P08-04 | When maintenanceRequired = true, skate status transitions to maintenance | `damage.service.ts` lines 73-75 | IMPLEMENTED |
| BR-P08-05 | When maintenanceRequired = true, maintenance record is auto-created or linked | `damage.service.ts` lines 79-103 | IMPLEMENTED |
| BR-P08-06 | Damage charge collection requires active cashier shift (F-007) | `damage.service.ts` lines 262-278 | VERIFIED — Gate 4.2 Batch 1 |
| BR-P08-07 | Damage charge collection creates treasury movement | `damage.service.ts` lines 299-307 | IMPLEMENTED |
| BR-P08-08 | Waiver of damage charge requires `waivers.approve` permission | `damage.routes.ts` line 71 | IMPLEMENTED |
| BR-P08-09 | Partial payment is supported | `computeStatus()` in `damage.service.ts` | IMPLEMENTED |
| BR-P08-10 | Overpayment is rejected | `damage.service.ts` line 257 | IMPLEMENTED |
| BR-P08-11 | Damage reports are retained for historical reference | `damage.service.ts` — INSERT only | IMPLEMENTED |
| BR-P08-12 | Photo upload for damage evidence | NOT IMPLEMENTED — pending UNK-006 (file storage decision) | PLANNED |

---

## 4. Functional Behavior

### 4.1 Create Damage Report

`POST /api/v1/damage`

- Required permission: `damage.create`
- Creates a damage report record
- If `maintenanceRequired = true`:
  - Updates skate status to `maintenance`
  - If linked to an existing inspection: links existing maintenance record or creates new one
  - If no inspection: creates new maintenance record
- Records audit log: `CREATE_DAMAGE_REPORT`
- Entire operation is atomic (DB transaction)
- Source: `damage.service.ts` createDamageReport

### 4.2 List / Get Damage Reports

- `GET /api/v1/damage` — paginated list with filters (status, skateId, customerId); requires `damage.view`
- `GET /api/v1/damage/:id` — single report with joined skate/customer/reporter; requires `damage.view`

### 4.3 Collect Damage Charge

`POST /api/v1/damage/:id/pay`

- Required permission: `damage.collect_charge`
- Requires active cashier shift (F-007)
- Validates payment does not exceed remaining balance
- Creates `rental_payments` record with `payment_type = 'damage_charge'`
- Creates `treasury_movements` record with `reference_type = 'damage_charge_payment'`
- Updates `charge_collected` and `status` on damage report
- Records audit log: `COLLECT_DAMAGE_CHARGE`

### 4.4 Waive Damage Charge

`POST /api/v1/damage/:id/waive`

- Required permission: `waivers.approve`
- Validates waiver does not exceed remaining balance
- Updates `charge_waived`, `waived_by`, `waiver_reason`, and `status`
- Records audit log: `WAIVE_DAMAGE_CHARGE`
- No treasury movement created for waiver (waiver is not a cash event)

### 4.5 Damage Report Status Logic (INFERRED FROM IMPLEMENTATION)

```
computeStatus(charge, collected, waived):
  if collected + waived >= charge:
    if collected == 0 and waived >= charge: return 'waived'
    return 'paid'
  if collected + waived > 0: return 'partially_paid'
  return 'pending'
```

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `damage_reports` | Damage report records with charge tracking | `db/schema/damages.ts` |

### 5.2 Key Fields (INFERRED FROM IMPLEMENTATION)

- `damage_reports.skate_id` — FK to skates (required)
- `damage_reports.rental_id` — FK to rentals (nullable)
- `damage_reports.inspection_id` — FK to inspections (nullable)
- `damage_reports.customer_id` — FK to customers (nullable)
- `damage_reports.reported_by` — FK to users
- `damage_reports.damage_type` — type of damage
- `damage_reports.severity` — severity level
- `damage_reports.customer_charge` — assessed charge amount
- `damage_reports.charge_collected` — amount collected so far
- `damage_reports.charge_waived` — amount waived
- `damage_reports.status` — `pending` | `partially_paid` | `paid` | `waived`
- `damage_reports.maintenance_required` — boolean
- `damage_reports.waived_by` — FK to users (nullable)
- `damage_reports.waiver_reason` — text (nullable)

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/damage` | `damage.view` | List damage reports (paginated, filterable) |
| GET | `/api/v1/damage/:id` | `damage.view` | Get single damage report |
| POST | `/api/v1/damage` | `damage.create` | Create damage report |
| POST | `/api/v1/damage/:id/pay` | `damage.collect_charge` | Collect customer damage charge |
| POST | `/api/v1/damage/:id/waive` | `waivers.approve` | Waive damage charge |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `damage.view` | View damage reports | `damage.routes.ts` lines 17, 31 |
| `damage.create` | Create damage report | `damage.routes.ts` line 44 |
| `damage.collect_charge` | Collect customer damage charge | `damage.routes.ts` line 57 |
| `waivers.approve` | Waive damage or late-fee charges | `damage.routes.ts` line 71 |

---

## 8. Financial Integrity

| Rule | Evidence | Verification |
|---|---|---|
| Charge collection requires active shift (F-007) | `damage.service.ts` lines 262-278 | VERIFIED — Gate 4.2 Batch 1 |
| Collection atomic: rental_payments + treasury_movements + balance update in transaction | `damage.service.ts` beginTransaction/commit | IMPLEMENTED |
| Overpayment rejected | `damage.service.ts` OVERPAYMENT_NOT_ALLOWED | IMPLEMENTED — test coverage UNKNOWN |
| No treasury movement for zero-amount waiver | `damage.service.ts` — waive only updates table | IMPLEMENTED |
| Audit log for all financial actions | `damage.service.ts` auditService.logRaw calls | IMPLEMENTED |

### F-006 Historical Context

F-006 was originally documented as a maintenance double-record risk in `createDamageReport()`.
The fix applied in Gate 5.1 (idempotency guard) and Gate 5.1.1 (concurrency-safe FOR UPDATE)
addressed this. F-006 was NOT part of the original Phase 08 requirements — it was identified
as an audit remediation in Gate 4.2 Batch 4 / Gate 5.1 / Gate 5.1.1.

---

## 9. Testing

### 9.1 Related Test Files

| File | Relevant Coverage |
|---|---|
| `gate42-batch1.test.ts` | F-007: damage charge collection requires active shift |
| `returns.test.ts` | Integration: inspection → damage report linkage from return workflow |
| `gate51-f006.test.ts` | F-006: duplicate maintenance record prevention in damage creation |
| `gate511-f006-concurrency.test.ts` | F-006: concurrent duplicate maintenance record prevention |

> [!WARNING]
> No dedicated `damage.test.ts` test file was found in the repository.
> Damage module coverage exists indirectly through returns, gate42-batch1, and F-006 tests.
> Direct damage report CRUD test coverage (list, get, create, pay, waive) via HTTP is MISSING
> as a standalone test suite.

### 9.2 Known Test Gaps

| Gap | Description | Risk |
|---|---|---|
| TC-DMG-CRUD | No standalone damage report create/list/get test | MEDIUM |
| TC-DMG-PAY | No standalone damage charge collection HTTP test | MEDIUM |
| TC-DMG-WAIVE | No standalone damage charge waiver HTTP test | MEDIUM |
| TC-DMG-OVERCHARGE | Overpayment rejection not directly tested | LOW |

---

## 10. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| Damage report creation | `damage.service.ts` | gate51-f006.test.ts (indirect) | PARTIALLY VERIFIED | CHANGELOG + impl |
| maintenanceRequired triggers skate → maintenance | `damage.service.ts` | gate51-f006.test.ts | PARTIALLY VERIFIED | impl |
| Auto-creates maintenance record | `damage.service.ts` lines 79-103 | gate51-f006.test.ts | PARTIALLY VERIFIED | impl |
| Charge collection requires active shift | `damage.service.ts` | gate42-batch1.test.ts | VERIFIED | Gate 4.2 Batch 1 |
| Charge collection creates treasury movement | `damage.service.ts` | None standalone | IMPLEMENTED — NOT TESTED standalone | impl |
| Waiver permission enforcement | `damage.routes.ts` | None standalone | IMPLEMENTED — NOT TESTED standalone | impl |
| F-006 idempotency guard | `maintenance.service.ts` | gate51-f006.test.ts | TESTED | Gate 5.1 |
| F-006 concurrency safety | `maintenance.service.ts` FOR UPDATE | gate511-f006-concurrency.test.ts | TESTED | Gate 5.1.1 |
| Photo upload | NOT IMPLEMENTED | N/A | PLANNED — blocked on UNK-006 | UNK-006 |

---

## 11. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P08-01 | No standalone damage.test.ts — damage HTTP endpoints not directly tested | MEDIUM |
| G-P08-02 | Photo upload not implemented (UNK-006 file storage decision pending) | LOW — deferred |
| G-P08-03 | F-006 was NOT an original Phase 08 requirement — it was a retrospective audit finding | DOCUMENTATION |
| G-P08-04 | `docs/modules/DAMAGE.md` remains a stub and contradicts actual state | DOCUMENTATION |

---

## 12. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| UNK-006 | File storage strategy for damage photos (local filesystem vs cloud) | PENDING — Phase 08 deferred |

---

## 13. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 08 Implementation | 2026-09-22 | Damage management implemented alongside Phase 07. See CHANGELOG. |
| Gate 4.2 Batch 1 | 2026-10-02 | F-007 resolved: damage charge collection now requires active shift. |
| Gate 5.1 | 2026-10-03 | F-006 idempotency guard added: damage creation no longer creates duplicate maintenance records. |
| Gate 5.1.1 | 2026-10-03 | F-006 concurrency-safe guard: FOR UPDATE added to duplicate-check SELECT. |
| Gate 5.2 | 2026-10-03 | This document created. PLANNED stub replaced with evidence-traceable specification. |

---

## 14. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Core damage creation, maintenance linking, and F-007 enforcement: VERIFIED (Gate 4.2 Batch 1)
- F-006 duplicate prevention: VERIFIED (Gate 5.1 / Gate 5.1.1)
- Direct HTTP test coverage for damage CRUD, charge collection, and waiver: MISSING
- Photo upload: PLANNED — pending UNK-006 decision

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

*Last updated: 2026-10-03 (Gate 5.2 — Documentation Reconciliation. Replaced PLANNED stub with evidence-traceable specification. F-006 remediation history documented as retrospective audit finding, not original requirement.)*
