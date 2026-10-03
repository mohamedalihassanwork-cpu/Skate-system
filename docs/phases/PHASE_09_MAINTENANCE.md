# Phase 09 — Maintenance

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.2 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.2)

---

> [!IMPORTANT]
> **Gate 5.2 Note:** This document replaces a PLANNED stub with no implementation details.
> The phase was substantially implemented and subsequently hardened by Gate 5.1 / Gate 5.1.1
> audit remediations. This document accurately represents the phase chronology,
> distinguishing original implementation from later remediation.
> No application code was changed.

---

## 1. Purpose

Implement maintenance record management for skates: creation of maintenance records
(manual or auto-created from damage reports/inspections), parts and labor tracking,
status workflow (pending, in_progress, completed), payment for maintenance costs
(system treasury or external), skate return to available after completion, and
prevention of duplicate maintenance records.

**Evidence source:** Master Business Specification §21 (Maintenance), TD-002 (technical debt),
DEC-007 (skate → available after maintenance), `maintenance.service.ts`, `maintenance.routes.ts`,
`maintenance.test.ts`, `maintenance-payments.test.ts`, Gate 5.1 / Gate 5.1.1 remediation records.

---

## 2. Scope

### 2.1 Authoritative Scope

| Item | Evidence Source |
|---|---|
| Maintenance records with problem and repair descriptions | Master Spec §21 |
| Parts tracking (name, quantity, unit cost) | Master Spec §21 |
| Labor cost tracking | Master Spec §21 |
| Status workflow: pending → in_progress → completed | Master Spec §21 + DEC-007 |
| Completion returns skate to available (DEC-007) | DEC-007 (approved decision) |
| Payment for maintenance costs | Master Spec §21 |
| Skate requiring maintenance cannot become Available until maintenance is completed | SOURCE_OF_TRUTH inviolable rule 11 |

### 2.2 Implementation-Derived Scope (INFERRED FROM IMPLEMENTATION)

- Maintenance records can be created manually (`POST /api/v1/maintenance`) or auto-created
  from damage reports (when `maintenanceRequired = true` in Phase 08)
- Payment statuses: `unpaid`, `paid`, `paid_external`, `no_cost`
- Payment mode: system payment (treasury deduction) or external payment (recorded only)
- Adding a part auto-transitions pending → in_progress
- Completion requires `repairDescription` — rejected without it
- F-006 idempotency guard: duplicate prevention for same `damageReportId` or `inspectionId`
  (added Gate 5.1, hardened Gate 5.1.1)
- Source: `maintenance.service.ts`

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P09-01 | Maintenance records track problem and repair descriptions | Master Spec §21 | IMPLEMENTED |
| BR-P09-02 | Spare parts can be added with name, quantity, unit cost | Master Spec §21 | IMPLEMENTED |
| BR-P09-03 | Labor cost is tracked separately from parts cost | Master Spec §21 | IMPLEMENTED |
| BR-P09-04 | Total cost = parts cost + labor cost | Master Spec §21 + impl | IMPLEMENTED |
| BR-P09-05 | Skate status → maintenance when maintenance record created | impl | IMPLEMENTED |
| BR-P09-06 | Skate status → available when maintenance completed (DEC-007) | DEC-007 | IMPLEMENTED — TESTED |
| BR-P09-07 | Completion requires repairDescription | impl | IMPLEMENTED — TESTED |
| BR-P09-08 | Completed maintenance records cannot be further edited | impl | IMPLEMENTED |
| BR-P09-09 | Maintenance cost can be paid from system treasury (treasury movement recorded) | impl | IMPLEMENTED |
| BR-P09-10 | Maintenance cost can be marked as paid externally (no treasury movement) | impl | IMPLEMENTED |
| BR-P09-11 | Payment requires an active cashier shift | `maintenance.service.ts` lines 456-462 | IMPLEMENTED — TESTED |
| BR-P09-12 | Duplicate maintenance records for same damage/inspection are prevented | Gate 5.1 remediation | TESTED (Gate 5.1 + 5.1.1) |

---

## 4. Functional Behavior

### 4.1 Maintenance Status Workflow

```
PENDING → IN_PROGRESS → COMPLETED
  |            |
  └── auto on part add
```

- Status `pending`: record created, no parts added yet
- Status `in_progress`: first part added OR status manually set; `startedAt` timestamp set
- Status `completed`: `completeRecord()` called; requires `repairDescription`; skate → available; `completedAt` set

### 4.2 Payment After Completion

- Payment only allowed when status = `completed` AND paymentStatus = `unpaid`
- System payment (`POST /:id/pay`): creates `treasury_movements` with `type=out`, `reference_type=maintenance_payment`; requires active shift
- External payment (`POST /:id/pay-external`): sets `paymentStatus = paid_external`; no treasury movement
- Zero-cost records: `paymentStatus = no_cost` set at completion; cannot pay

### 4.3 F-006 Idempotency Guard (Gate 5.1 / Gate 5.1.1 Remediation)

**Original risk (pre-Gate 5.1):** `damage.service.createDamageReport()` auto-creates a
maintenance record when `maintenanceRequired=true`. If a cashier also manually calls
`POST /maintenance` for the same damage/inspection, a duplicate row was created.

**Fix applied (Gate 5.1):** `createRecord()` queries for an existing record by
`damageReportId` OR `inspectionId` before inserting, throwing `DUPLICATE_MAINTENANCE_RECORD`.

**Concurrency hardening (Gate 5.1.1):** The duplicate-check SELECT uses `.for('update')`
to acquire a next-key lock, preventing two concurrent transactions from both passing
the guard and both inserting.

**Classification:** F-006 was NOT part of the original Phase 09 requirements.
It was identified as an audit finding in Gate 4.2 (Batch 4) and remediated in Gate 5.1 / 5.1.1.

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `maintenance_records` | Maintenance records with cost, status, payment tracking | `db/schema/maintenance.ts` |
| `maintenance_parts` | Spare parts per maintenance record | `db/schema/maintenance.ts` |

### 5.2 Key Fields (INFERRED FROM IMPLEMENTATION)

- `maintenance_records.skate_id` — FK to skates
- `maintenance_records.damage_report_id` — FK to damage_reports (nullable)
- `maintenance_records.inspection_id` — FK to inspections (nullable)
- `maintenance_records.problem_description` — text
- `maintenance_records.repair_description` — text (required for completion)
- `maintenance_records.status` — `pending` | `in_progress` | `completed`
- `maintenance_records.labor_cost`, `parts_cost`, `total_cost` — DECIMAL fields
- `maintenance_records.payment_status` — `unpaid` | `paid` | `paid_external` | `no_cost`
- `maintenance_records.payment_method_id` — FK to payment_methods (nullable)
- `maintenance_records.paid_at`, `paid_by`, `completed_by`, `created_by`
- `maintenance_parts.maintenance_id`, `part_name`, `quantity`, `unit_cost`, `total_cost`

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/maintenance` | `maintenance.view` | List maintenance records (paginated, filterable) |
| GET | `/api/v1/maintenance/:id` | `maintenance.view` | Get record with parts |
| POST | `/api/v1/maintenance` | `maintenance.create` | Create maintenance record manually |
| PATCH | `/api/v1/maintenance/:id` | `maintenance.edit` | Update descriptions / labor cost / status |
| POST | `/api/v1/maintenance/:id/parts` | `maintenance.edit` | Add spare part |
| DELETE | `/api/v1/maintenance/:id/parts/:partId` | `maintenance.edit` | Remove spare part |
| POST | `/api/v1/maintenance/:id/complete` | `maintenance.complete` | Complete maintenance; skate → available |
| POST | `/api/v1/maintenance/:id/pay` | `maintenance.pay` | Pay from system treasury |
| POST | `/api/v1/maintenance/:id/pay-external` | `maintenance.pay` | Mark as paid externally |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `maintenance.view` | View maintenance records | `maintenance.routes.ts` lines 17, 27 |
| `maintenance.create` | Create maintenance records | `maintenance.routes.ts` line 37 |
| `maintenance.edit` | Edit records, add/remove parts | `maintenance.routes.ts` lines 49, 63, 75 |
| `maintenance.complete` | Complete maintenance | `maintenance.routes.ts` line 86 |
| `maintenance.pay` | Pay maintenance costs | `maintenance.routes.ts` lines 98, 113 |

---

## 8. Financial Integrity

| Rule | Evidence | Verification |
|---|---|---|
| System payment creates treasury movement (out) | `maintenance.service.ts` lines 466-480 | TESTED — maintenance-payments.test.ts |
| System payment requires active shift | `maintenance.service.ts` lines 456-462 | TESTED — maintenance-payments.test.ts |
| External payment does NOT create treasury movement | `maintenance.service.ts` payRecordExternal | TESTED — maintenance-payments.test.ts |
| Treasury balance decremented on system payment | `maintenance.service.ts` line 478-480 | TESTED — maintenance-payments.test.ts |
| Zero-cost record cannot be paid | `maintenance.service.ts` lines 441-443 | TESTED — maintenance-payments.test.ts |

---

## 9. Testing

### 9.1 Test Files

| File | Test Count | Coverage |
|---|---|---|
| `maintenance.test.ts` | 5 | Create record, add part → in_progress, update labor, complete → skate available, reject completion without description |
| `maintenance-payments.test.ts` | ~10 | System payment, external payment, treasury movement, shift enforcement, zero-cost rejection |
| `gate51-f006.test.ts` | ~8 | F-006 idempotency guard: duplicate by damageReportId, by inspectionId |
| `gate511-f006-concurrency.test.ts` | ~4 | Concurrent duplicate prevention with FOR UPDATE |

### 9.2 Test Cases

| ID | Description | File | Status |
|---|---|---|---|
| TC-MAINT-01 | Create record; skate → maintenance | maintenance.test.ts | TESTED |
| TC-MAINT-02 | Add part; auto-transition → in_progress | maintenance.test.ts | TESTED |
| TC-MAINT-03 | Update labor cost | maintenance.test.ts | TESTED |
| TC-MAINT-04 | Complete maintenance; skate → available | maintenance.test.ts | TESTED |
| TC-MAINT-05 | Completion rejected without repairDescription | maintenance.test.ts | TESTED |
| TC-MAINT-PAY | System payment creates treasury movement | maintenance-payments.test.ts | TESTED |
| TC-MAINT-EXT | External payment; no treasury movement | maintenance-payments.test.ts | TESTED |
| TC-MAINT-SHIFT | Payment rejected without active shift | maintenance-payments.test.ts | TESTED |
| TC-F006-DUP | Duplicate prevention by damageReportId | gate51-f006.test.ts | TESTED |
| TC-F006-CONC | Concurrent duplicate prevention | gate511-f006-concurrency.test.ts | TESTED |

---

## 10. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| Create maintenance record | `maintenance.service.ts` createRecord | TC-MAINT-01 | TESTED | impl |
| Part tracking | `maintenance.service.ts` addPart | TC-MAINT-02 | TESTED | Master Spec §21 |
| Labor cost | `maintenance.service.ts` updateRecord | TC-MAINT-03 | TESTED | Master Spec §21 |
| Completion → skate available (DEC-007) | `maintenance.service.ts` completeRecord | TC-MAINT-04 | TESTED | DEC-007 |
| Repair description required for completion | `maintenance.service.ts` | TC-MAINT-05 | TESTED | impl |
| System payment treasury movement | `maintenance.service.ts` payRecord | TC-MAINT-PAY | TESTED | impl |
| External payment no treasury movement | `maintenance.service.ts` payRecordExternal | TC-MAINT-EXT | TESTED | impl |
| Active shift for payment | `maintenance.service.ts` | TC-MAINT-SHIFT | TESTED | impl |
| F-006 idempotency guard | `maintenance.service.ts` createRecord | TC-F006-DUP | TESTED | Gate 5.1 |
| F-006 concurrency safety | `maintenance.service.ts` FOR UPDATE | TC-F006-CONC | TESTED | Gate 5.1.1 |
| TD-002 (admin bypass deferred from Phase 03) | Phase 09 now enforces DEC-007 | TC-MAINT-04 | TESTED | TD-002 resolved |

---

## 11. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P09-01 | No HTTP-level RBAC tests for maintenance endpoints (e.g., 401/403) | LOW |
| G-P09-02 | `docs/modules/MAINTENANCE.md` remains a stub | DOCUMENTATION |
| G-P09-03 | F-006 was not an original Phase 09 requirement — it was a retrospective audit finding. Documentation now accurately reflects this chronology. | DOCUMENTATION (resolved by this document) |

---

## 12. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-007 | Skate transitions to available when maintenance completed — approved | DECIDED |
| TD-002 | Admin bypass of DEC-007 deferred from Phase 03 to Phase 09 | RESOLVED — Phase 09 enforces DEC-007 |

---

## 13. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 09 Implementation | 2026-09-22–25 | Maintenance module implemented. See CHANGELOG. |
| TD-002 Resolved | 2026-09-22 | DEC-007 now enforced: skate must have completed maintenance record to become available. |
| F-019 Resolved | 2026-10-02 | Gate 4.2 Batch 3: maintenance createRecord now returns ValidationError (400) not generic 500. |
| Gate 5.1 | 2026-10-03 | F-006 idempotency guard added to createRecord() — prevents duplicate maintenance records. |
| Gate 5.1.1 | 2026-10-03 | F-006 concurrency-safe guard: FOR UPDATE added to both duplicate-check SELECTs. |
| Gate 5.2 | 2026-10-03 | This document created. PLANNED stub replaced with evidence-traceable specification. Remediation chronology accurately recorded. |

---

## 14. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Core maintenance workflow (create, parts, update, complete, pay): TESTED
- F-006 idempotency and concurrency guards: TESTED (Gate 5.1 + 5.1.1)
- HTTP-level RBAC tests: not isolated for maintenance module
- Browser verification: not performed (out of scope)

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

*Last updated: 2026-10-03 (Gate 5.2 — Documentation Reconciliation. Replaced PLANNED stub with evidence-traceable specification. F-006 remediation accurately represented as retrospective audit finding, not original requirement.)*
