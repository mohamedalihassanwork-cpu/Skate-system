# Phase 12 — Expenses and Cashier Shifts

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.2 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.2)

---

> [!IMPORTANT]
> **Gate 5.2 Note:** This document replaces a PLANNED stub. Both expenses and cashier
> shifts were fully implemented (shifts were implicit in Phase 05+ via shift enforcement
> requirements). This document establishes the evidence-traceable baseline.
> No application code was changed.

---

## 1. Purpose

### Cashier Shifts

Manage cashier shift lifecycle: open a shift (with opening balance), close a shift
(with actual balance and auto-calculated expected balance), enforce one-active-shift-per-cashier
rule, and calculate cash discrepancy (actual vs expected).

### Expenses

Allow cashiers to record operational expenses during a shift. Each expense deducts from
the cash drawer treasury account and is linked to the active shift for financial traceability.

**Evidence source:** Master Business Specification §6 (Navigation — Expenses), `shifts.service.ts`,
`shifts.routes.ts`, `expenses.service.ts`, `gate42-batch3.test.ts` (F-013 shift permission),
CHANGELOG entry "Phase 10 Maintenance and Reservations" (shifts added to support Phase 05+).

---

## 2. Scope

### 2.1 Cashier Shifts — Authoritative Scope

- Open shift: requires `shifts.manage` permission; sets opening balance; one active shift per cashier
- Close shift: requires `shifts.manage` permission; cashier can only close own shift
- Expected balance calculated: `opening_balance + net_cash_movements_during_shift`
- Cash movements identified via `treasury_accounts.is_cash_drawer = true`
- Discrepancy: `difference = actual_balance - expected_balance`
- Shift statuses: `active` | `closed`

### 2.2 Expenses — Authoritative Scope

- Record operational expense during active shift
- Expense requires active cashier shift (NO_ACTIVE_SHIFT enforced)
- Expense deducts from cash drawer treasury account (identified by `is_cash_drawer = true`)
- Expense creates treasury movement with `type=out`, `reference_type=expense`
- Expense linked to active shift for financial traceability
- Expense categories are optional (nullable)

### 2.3 Implementation-Derived Details (INFERRED FROM IMPLEMENTATION)

- `calculateExpectedCashBalance()` sums all IN and OUT movements for the shift's cash drawer account
- Shift ownership: `cashier_id != caller's cashier_id` → ForbiddenError
- Shift already closed → ConflictError on close attempt
- Double-open → ConflictError on open attempt (one active shift per cashier)
- Expenses use the first treasury account with `is_cash_drawer = true` as target
- If no cash drawer is configured: NO_CASH_DRAWER error on expense recording
- Source: `shifts.service.ts`, `expenses.service.ts`

---

## 3. Business Requirements

### 3.1 Cashier Shifts

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P12-S01 | Only one active shift per cashier | `shifts.service.ts` — ConflictError | IMPLEMENTED |
| BR-P12-S02 | Open shift requires `shifts.manage` permission | `shifts.routes.ts` line 24 | TESTED (Gate 4.2 Batch 3 F-013) |
| BR-P12-S03 | Close shift requires `shifts.manage` permission | `shifts.routes.ts` line 38 | TESTED (Gate 4.2 Batch 3 F-013) |
| BR-P12-S04 | Cashier can only close own shift | `shifts.service.ts` — ForbiddenError | IMPLEMENTED |
| BR-P12-S05 | Expected balance calculated from opening balance + cash movements | `shifts.service.ts` calculateExpectedCashBalance | IMPLEMENTED |
| BR-P12-S06 | Actual vs expected discrepancy is recorded | `shifts.service.ts` closeShift | IMPLEMENTED |
| BR-P12-S07 | Shift close time must not be before shift open time | `shifts.service.ts` — INVALID_CLOSE_TIME | IMPLEMENTED |
| BR-P12-S08 | List all shifts (admin view) | `shifts.routes.ts` line 56 | IMPLEMENTED |
| BR-P12-S09 | Get active shift for current cashier | `shifts.routes.ts` line 14 | IMPLEMENTED |
| BR-P12-S10 | All financial operations require an active shift (OWNER-001 pattern) | Multiple service files | IMPLEMENTED across rentals, sales, damage, maintenance, expenses |

### 3.2 Expenses

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P12-E01 | Record expense with amount and description | `expenses.service.ts` | IMPLEMENTED |
| BR-P12-E02 | Expense requires active cashier shift | `expenses.service.ts` lines 13-19 | IMPLEMENTED |
| BR-P12-E03 | Expense creates treasury movement (cash out) | `expenses.service.ts` lines 43-52 | IMPLEMENTED |
| BR-P12-E04 | Expense linked to shift for financial traceability | `expenses.shiftId` | IMPLEMENTED |
| BR-P12-E05 | Expense decrements cash drawer treasury balance | `expenses.service.ts` lines 55-57 | IMPLEMENTED |
| BR-P12-E06 | Expense categories are optional | `expenses.categoryId` nullable | IMPLEMENTED |
| BR-P12-E07 | List all expenses | `expenses.service.ts` listExpenses | IMPLEMENTED |

---

## 4. Functional Behavior

### 4.1 Open Shift

`POST /api/v1/shifts/open`

- Required permission: `shifts.manage` (F-013 fix applied Gate 4.2 Batch 3)
- Validates opening balance >= 0
- Checks for existing active shift for same cashier
- Inserts new shift with status `active`
- Returns new shift DTO

### 4.2 Close Shift

`POST /api/v1/shifts/:id/close`

- Required permission: `shifts.manage`
- Validates shift belongs to calling cashier
- Validates close time (if provided) is after open time
- Calculates expected balance from opening balance + net cash movements
- Records `actual_balance`, `expected_balance`, `difference`, `closed_at`
- Sets status to `closed`

### 4.3 Expected Balance Calculation (INFERRED FROM IMPLEMENTATION)

```
expected = opening_balance + sum(IN movements for cash drawer accounts during shift)
                           - sum(OUT movements for cash drawer accounts during shift)
```

Cash drawer accounts identified by `treasury_accounts.is_cash_drawer = true`.

### 4.4 Record Expense

`POST /api/v1/expenses`

- Required: active shift
- Inserts expense record
- Finds cash drawer account (first `is_cash_drawer = true`)
- Creates `treasury_movements` record with `type=out`, `reference_type=expense`
- Decrements treasury account balance
- Returns expense DTO

### 4.5 OWNER-001 Pattern (Active-Shift Enforcement)

The active shift requirement is consistently enforced across all financial operations
in the following modules:
- `rentals.service.ts` — startRental, returnRental, cancelRental
- `sales.service.ts` — createSale, cancelSale
- `damage.service.ts` — collectCharge (F-007)
- `maintenance.service.ts` — payRecord
- `expenses.service.ts` — recordExpense

**OWNER-001 remains unresolved:** The owner has not formally decided the consolidation
strategy (enforce single payment service vs. distributed per-module enforcement).
Current implementation uses distributed enforcement (Option B by default).

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `cashier_shifts` | Shift records with open/close times, balances, status | `db/schema/treasury.ts` |
| `expenses` | Expense records linked to shifts | `db/schema/treasury.ts` |
| `expense_categories` | Optional expense categorization | `db/schema/treasury.ts` (INFERRED) |

### 5.2 Key Fields (INFERRED FROM IMPLEMENTATION)

**cashier_shifts:**
- `cashier_id` — FK to users
- `opened_at`, `closed_at` — timestamps
- `opening_balance` — DECIMAL
- `expected_balance`, `actual_balance`, `difference` — DECIMAL (nullable until close)
- `status` — `active` | `closed`

**expenses:**
- `amount` — DECIMAL
- `description` — text
- `category_id` — FK to expense_categories (nullable)
- `cashier_id` — FK to users
- `shift_id` — FK to cashier_shifts

---

## 6. API / Integration Surface

### Shifts

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/shifts/current` | (authenticated only) | Get active shift for current user |
| POST | `/api/v1/shifts/open` | `shifts.manage` | Open a new shift |
| POST | `/api/v1/shifts/:id/close` | `shifts.manage` | Close a shift |
| GET | `/api/v1/shifts` | `shifts.view` | List all shifts (admin) |

### Expenses

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/expenses` | `expenses.view` | List all expenses |
| POST | `/api/v1/expenses` | `expenses.create` | Record an expense |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `shifts.manage` | Open and close shifts | `shifts.routes.ts` lines 24, 38 |
| `shifts.view` | View all shifts (admin) | `shifts.routes.ts` line 56 |
| `expenses.view` | View expenses | `expenses.routes.ts` (inferred) |
| `expenses.create` | Record expense | `expenses.routes.ts` (inferred) |

---

## 8. Testing

### 8.1 Test Coverage

| File | Relevant Coverage |
|---|---|
| `gate42-batch3.test.ts` | F-013: shifts.manage permission check on open/close |
| Other tests (indirect) | All rentals/sales/damage/maintenance tests set up active shifts in beforeAll — shift infrastructure implicitly tested |

> [!WARNING]
> No dedicated `shifts.test.ts` or `expenses.test.ts` test file was found.
> Direct automated tests for: shift open/close business logic, single-shift constraint,
> expected balance calculation, and expense recording are MISSING as standalone test files.

### 8.2 Known Test Gaps

| Gap | Description | Risk |
|---|---|---|
| TC-SHIFT-01 | No standalone shift lifecycle test (open, close, discrepancy) | MEDIUM |
| TC-SHIFT-02 | Single-shift constraint not directly isolated-tested | MEDIUM |
| TC-EXP-01 | No standalone expense recording test | MEDIUM |
| TC-EXP-02 | NO_CASH_DRAWER scenario not tested | LOW |

---

## 9. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| shifts.manage permission on open/close (F-013) | `shifts.routes.ts` lines 24, 38 | gate42-batch3.test.ts F-013 | TESTED | Gate 4.2 Batch 3 |
| One active shift per cashier | `shifts.service.ts` — ConflictError | None standalone | IMPLEMENTED — NOT TESTED standalone | impl |
| Expected balance calculation | `shifts.service.ts` calculateExpectedCashBalance | None standalone | IMPLEMENTED — NOT TESTED standalone | impl |
| Expense requires active shift | `expenses.service.ts` | None standalone | IMPLEMENTED — NOT TESTED standalone | impl |
| Expense creates treasury movement | `expenses.service.ts` | None standalone | IMPLEMENTED — NOT TESTED standalone | impl |
| Active shift infrastructure (used by all other modules) | `cashier_shifts` table + per-module enforcement | Implicitly via rentals/sales/damage/maintenance tests | INDIRECTLY TESTED | All phase tests |

---

## 10. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P12-01 | No standalone shift lifecycle tests | MEDIUM |
| G-P12-02 | No standalone expense recording tests | MEDIUM |
| G-P12-03 | Expected balance calculation correctness untested in isolation | MEDIUM |
| G-P12-04 | OWNER-001 unresolved: active-shift enforcement distributed across modules; no single governance point | MEDIUM — architectural debt |
| G-P12-05 | `docs/modules/CASHIER_SHIFTS.md` and `EXPENSES.md` remain stubs | DOCUMENTATION |

---

## 11. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| OWNER-001 | Active-shift enforcement strategy: distributed per-module (current) vs. centralized middleware | PENDING OWNER DECISION |
| F-013 | shifts.manage permission added to open/close — Gate 4.2 Batch 3 fix | DECIDED |

---

## 12. Remediation History

| Event | Date | Description |
|---|---|---|
| Shifts Infrastructure | 2026-09-21+ | Cashier shift table created implicitly as part of Phase 05+ shift_id FK. Active shift enforcement added gradually. |
| Phase 12 Implementation | 2026-09-25–30 | Expenses and formal shift management endpoints implemented. |
| Gate 4.2 Batch 3 — F-013 | 2026-10-02 | shifts.manage permission added to shift open/close. Previously unprotected. |
| Gate 5.2 | 2026-10-03 | This document created. PLANNED stub replaced with evidence-traceable specification. |

---

## 13. Current Status

**PARTIALLY VERIFIED**

Rationale:
- shifts.manage permission enforcement (F-013): TESTED (Gate 4.2 Batch 3)
- Active shift infrastructure: INDIRECTLY TESTED across all other module tests
- Shift lifecycle (open, close, expected balance): IMPLEMENTED — NOT standalone-tested
- Expense recording: IMPLEMENTED — NOT standalone-tested
- Active-shift enforcement pattern (OWNER-001): consistent across all modules but no formal decision on governance structure

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

*Last updated: 2026-10-03 (Gate 5.2 — Documentation Reconciliation. Replaced PLANNED stub with evidence-traceable specification. OWNER-001 status accurately reflected as pending.)*
