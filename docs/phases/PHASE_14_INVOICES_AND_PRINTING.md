# Phase 14 — Invoices and Printing

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.3 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.3)

---

> [!IMPORTANT]
> **Gate 5.3 Note:** The previous document was dated 2026-09-14 with status PLANNED — this
> contradicted the actual state. Implementation exists, backend tests were added in Gate 5.1
> (G5-F-008), and the build passes. Browser verification remains blocked.
> Status is PARTIALLY VERIFIED — not PLANNED and not VERIFIED.

---

## 1. Purpose

Generate on-the-fly printable invoices for Rental and Sales transactions. Implement unified
sequential invoice numbering, print-optimized 80mm thermal receipt layout (RTL/Arabic), optional
auto-print on transaction success, and a configurable print_invoices_enabled setting.

**Evidence source:** `apps/api/src/modules/invoices/`, `apps/web/src/modules/invoices/`,
`apps/web/src/components/printer/InvoicePrintTemplate.tsx`,
`apps/api/src/tests/gate51-invoices.test.ts`, Phase 14 owner decisions,
Gate 5.1 G5-F-008 remediation records.

---

## 2. Scope

### 2.1 Implemented (INFERRED FROM IMPLEMENTATION + TESTED)

- `GET /api/v1/invoices/rental/:id` — backend invoice data aggregation for rental
- `GET /api/v1/invoices/sale/:id` — backend invoice data aggregation for sale
- `sequences` table — unified sequential invoice number generation (LAST_INSERT_ID mechanism)
- `InvoicePrintTemplate.tsx` — 80mm thermal print layout with `@media print` CSS, RTL/Arabic
- `invoices.service.ts` (frontend) — API client calling backend invoice endpoints
- `apps/web/src/modules/invoices/invoices.service.ts` — frontend service stub

### 2.2 Owner Decisions (From Phase 14 Spec)

| Decision | Choice | Status |
|---|---|---|
| Invoice Numbering | Unified across rentals and sales | DECIDED — Decision B |
| Persistence | Generate on-the-fly, no persisted snapshot table | DECIDED — Decision A |
| Printing Architecture | Abstract PrintProvider; initial impl = browser `window.print()` | DECIDED |
| Barcode | NO BARCODE — owner override of Master Spec | DECIDED — Decision: NO BARCODE |
| Auto-print | Auto-print after successful transaction | DECIDED — Decision A |
| Cancellations | No separate Credit Note / cancellation receipt | DECIDED — Decision A |

### 2.3 Out of Scope

- Direct hardware ESC/POS driver integration
- A4/A5 full-page invoice templates
- Automated email/SMS delivery
- Fiscal/Tax Authority integration
- Barcode on invoice (explicitly removed)

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P14-01 | Invoice data aggregated for rental transactions | `invoices.service.ts` getRentalInvoice | IMPLEMENTED — TESTED (G5-F-008) |
| BR-P14-02 | Invoice data aggregated for sales transactions | `invoices.service.ts` getSaleInvoice | IMPLEMENTED — TESTED (G5-F-008) |
| BR-P14-03 | Unified sequential invoice numbering (INV-000001 format) | `sequences` table + sequences.service.ts | IMPLEMENTED — TESTED (gate41-remediation.test.ts F-003) |
| BR-P14-04 | Invoice number does not change on re-fetch (idempotent) | `invoices.service.ts` — reads existing invoice_number | IMPLEMENTED |
| BR-P14-05 | Print layout uses 80mm thermal receipt format | `InvoicePrintTemplate.tsx` @page {margin:0}, width:80mm | IMPLEMENTED — BROWSER NOT VERIFIED |
| BR-P14-06 | Print layout is Arabic/RTL | `InvoicePrintTemplate.tsx` direction:rtl | IMPLEMENTED — BROWSER NOT VERIFIED |
| BR-P14-07 | Invoice view permission tied to rentals.view / sales.view | `invoices.routes.ts` lines 16, 39 | IMPLEMENTED — TESTED (G5-F-008) |
| BR-P14-08 | GET invoice does NOT create treasury movements or payments | `invoices.service.ts` — read-only | IMPLEMENTED — TESTED (G5-F-008) |
| BR-P14-09 | Auto-print after transaction (POS integration) | `apps/web/src/modules/rentals/`, `sales/` | IMPLEMENTATION STATUS UNKNOWN — frontend integration not verified |
| BR-P14-10 | Settings key `print_invoices_enabled` controls print UI | Phase 14 spec §7 | IMPLEMENTATION STATUS UNKNOWN — not directly verified |
| BR-P14-11 | Invoice content: cashier name, customer name, invoice number, line items, payments by method | `invoices.service.ts` backend aggregation | IMPLEMENTED — TESTED via G5-F-008 structure tests |

---

## 4. Functional Behavior

### 4.1 Backend Aggregation

`GET /api/v1/invoices/rental/:id` (requires `rentals.view`):
- Aggregates rental + customer + cashier + rental payments + invoice number from `sequences`
- Returns null/404 if rental not found or has no invoice number

`GET /api/v1/invoices/sale/:id` (requires `sales.view`):
- Aggregates sale + customer + cashier + sale items + sale payments + invoice number
- Returns null/404 if sale not found or has no invoice number

### 4.2 Invoice Numbering

- Uses `sequences` table with key `invoice_number`
- MySQL `INSERT INTO sequences ... ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)`
- Session-safe: each request gets its own `LAST_INSERT_ID()`
- Format: `INV-000001` (6-digit zero-padded)
- Source: `apps/api/src/modules/invoices/sequences.service.ts`

### 4.3 Print Layer

- `InvoicePrintTemplate.tsx` renders as invisible `div` on screen (`display:none @media screen`)
- Becomes visible and full-page on print (`@media print`: `visibility: visible`, `width: 80mm`)
- `@page { margin: 0 }` eliminates browser default margins

### 4.4 Non-Mutating Invoice Fetch (G5-F-008 Finding)

Gate 5.1 G5-F-008 verified that:
- Invoice GET does not create new payments
- Invoice GET does not create new treasury movements
- This was the primary finding that drove adding the `gate51-invoices.test.ts` test file

### 4.5 G5-F-002 Status (From Gate 5.1.1)

G5-F-002: Print infrastructure statically verified.
- `InvoicePrintTemplate.tsx` exists and implements `@media print` layout
- Frontend build passes (zero TS errors)
- Browser interaction verification: BLOCKED — Playwright driver failure

Classification: **IMPLEMENTATION EXISTS — STATICALLY VERIFIED — BROWSER VERIFICATION BLOCKED**

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `sequences` | Unified invoice number counter (LAST_INSERT_ID mechanism) | `db/schema/sequences.ts` |

*No `invoices` table — invoices are generated on-the-fly (owner decision §2.2).*

### 5.2 Settings Key

| Key | Purpose |
|---|---|
| `print_invoices_enabled` | Global toggle for auto-print behavior |

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/invoices/rental/:id` | `rentals.view` | Rental invoice data aggregation |
| GET | `/api/v1/invoices/sale/:id` | `sales.view` | Sale invoice data aggregation |
| GET/PATCH | `/api/v1/settings` | (existing) | `print_invoices_enabled` toggle |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `rentals.view` | View rental invoice | `invoices.routes.ts` line 16 |
| `sales.view` | View sale invoice | `invoices.routes.ts` line 39 |
| `settings.update` | Update print toggle | Phase 14 spec §10 |

---

## 8. Testing

### 8.1 Test Files

| File | Coverage |
|---|---|
| `gate51-invoices.test.ts` (636 lines) | G5-F-008: Auth (401), RBAC (403), valid rental invoice (200), valid sale invoice (200), data correctness (structure assertions), 404 on unknown ID, no financial mutation, invoice number sequence |
| `gate41-remediation.test.ts` | F-003: invoice number sequential and session-safe (LAST_INSERT_ID) |

### 8.2 Test Cases

| ID | Description | Status |
|---|---|---|
| TC-INV-AUTH-RENTAL | Unauthenticated GET /invoices/rental/:id → 401 | TESTED (G5-F-008) |
| TC-INV-RBAC-RENTAL | Wrong-permission user → 403 | TESTED (G5-F-008) |
| TC-INV-RENTAL-200 | Valid rental ID → 200, correct structure | TESTED (G5-F-008) |
| TC-INV-RENTAL-404 | Unknown rental ID → 404 | TESTED (G5-F-008) |
| TC-INV-SALE-200 | Valid sale ID → 200, correct structure | TESTED (G5-F-008) |
| TC-INV-SALE-404 | Unknown sale ID → 404 | TESTED (G5-F-008) |
| TC-INV-NO-MUTATION | GET does not create treasury movements | TESTED (G5-F-008) |
| TC-INV-SEQ | Invoice number is sequential, session-safe | TESTED (gate41-remediation F-003) |

### 8.3 Known Test Gaps

| Gap | Description | Risk |
|---|---|---|
| TC-INV-PRINT | Browser print verification — layout, margins, 80mm | HIGH — browser blocked |
| TC-INV-AUTO-PRINT | Auto-print trigger from POS | MEDIUM — browser blocked |
| TC-INV-SETTINGS | print_invoices_enabled toggle behavior | LOW |

---

## 9. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| Backend rental invoice aggregation | `invoices.service.ts` getRentalInvoice | TC-INV-RENTAL-200 | TESTED | G5-F-008 |
| Backend sale invoice aggregation | `invoices.service.ts` getSaleInvoice | TC-INV-SALE-200 | TESTED | G5-F-008 |
| RBAC enforcement | `invoices.routes.ts` requirePermission | TC-INV-RBAC-RENTAL | TESTED | G5-F-008 |
| No financial mutation on GET | `invoices.service.ts` read-only | TC-INV-NO-MUTATION | TESTED | G5-F-008 |
| Invoice sequence correctness | `sequences.service.ts` LAST_INSERT_ID | TC-INV-SEQ | TESTED | F-003 |
| 80mm print layout | `InvoicePrintTemplate.tsx` @media print | None | STATICALLY VERIFIED — BROWSER BLOCKED | G5-F-002 |
| RTL/Arabic print | `InvoicePrintTemplate.tsx` direction:rtl | None | STATICALLY VERIFIED — BROWSER BLOCKED | G5-F-002 |
| Auto-print integration in POS | Frontend POS components | None | UNKNOWN — not independently verified | Phase 14 spec §9 |
| print_invoices_enabled setting | Settings table key | None | UNKNOWN — not independently verified | Phase 14 spec §7 |

---

## 10. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P14-01 | Browser print verification blocked — cannot confirm 80mm layout, RTL rendering, or print dialog behavior | HIGH |
| G-P14-02 | Auto-print trigger from Rental POS / Sales POS not independently verified | MEDIUM |
| G-P14-03 | print_invoices_enabled setting behavior not independently tested | LOW |
| G-P14-04 | Browser default print dialog cannot be suppressed — adds extra cashier click | LOW — known risk from Phase 14 spec §16 |

---

## 11. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| INV-A | Unified invoice numbering across rentals and sales | DECIDED |
| INV-B | On-the-fly generation, no persisted invoice table | DECIDED |
| INV-C | window.print() as initial PrintProvider; abstract interface for future ESC/POS | DECIDED |
| INV-D | No barcode on invoice | DECIDED (owner override of Master Spec) |
| INV-E | Auto-print after successful transaction | DECIDED |
| INV-F | No credit note / cancellation receipt in Phase 14 | DECIDED |

---

## 12. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 14 Requirements | 2026-09-14 | Phase 14 specification written (owner decisions captured). Status PLANNED. |
| Gate 4.1 — F-003 | 2026-10-02 | Invoice sequence implemented (LAST_INSERT_ID session-safe). Tested in gate41-remediation.test.ts. |
| Gate 5.1 — G5-F-008 | 2026-10-03 | Invoice endpoint tests added (gate51-invoices.test.ts). Backend invoice endpoints verified via 636-line test file. |
| Gate 5.1.1 — G5-F-002 | 2026-10-03 | Print infrastructure statically verified. Browser verification classified as BLOCKED. |
| Gate 5.3 | 2026-10-03 | PLANNED stub replaced with evidence-traceable specification. Status set to PARTIALLY VERIFIED. |

---

## 13. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Backend invoice endpoints: TESTED (gate51-invoices.test.ts — G5-F-008)
- Invoice sequence: TESTED (gate41-remediation.test.ts — F-003)
- RBAC enforcement: TESTED
- No-financial-mutation property: TESTED
- Print layout (80mm, RTL): STATICALLY VERIFIED — BROWSER VERIFICATION BLOCKED
- Auto-print integration: UNKNOWN
- print_invoices_enabled: UNKNOWN
- Previous status of PLANNED was inaccurate — implementation exists with test coverage

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
- **Approved accessibility rules** (DESIGN_SYSTEM.md §11)
- **Approved responsive/mobile rules** (DESIGN_SYSTEM.md §16)
- **Approved semantic color system** (DEC-034, DEC-041)
- **Approved Badge status API** (DEC-043)
- **Approved typography** (Cairo, design-system.css §3)
- **Approved spacing and radius system** (design-system.css §4-5)
- **Approved motion rules** (AN-001 through AN-014; AN-012/AN-013 PERMANENTLY DEFERRED — DEC-044)
- **Approved currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Approved component APIs** from the existing shared component library

---

*Last updated: 2026-10-03 (Gate 5.3 — Documentation Reconciliation. PLANNED stub replaced. Status set to PARTIALLY VERIFIED based on Gate 5.1/5.1.1 evidence. Browser verification remains blocked.)*
