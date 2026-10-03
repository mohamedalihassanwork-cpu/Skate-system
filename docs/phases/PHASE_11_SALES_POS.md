# Phase 11 — Sales POS

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.2 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.2)

---

> [!IMPORTANT]
> **Gate 5.2 Note:** This document replaces a PLANNED stub. The phase was implemented
> and tested, with several audit remediations applied (F-012, F-013 partial, and others).
> This document establishes the evidence-traceable baseline.
> No application code was changed.

---

## 1. Purpose

Implement a Product Inventory POS allowing cashiers to sell physical products (helmets,
accessories, spare parts) to customers. Includes product catalog management, inventory
tracking, sale creation with stock deduction, payment collection via treasury, sale
cancellation with stock restoration and treasury refund, and RBAC enforcement.

**Evidence source:** Master Business Specification §6 (Main Navigation — Sales POS),
CHANGELOG entry "Phase 11 (Sales POS) Completed", `sales.service.ts`, `sales.routes.ts`,
`sales.test.ts`, `gate42-batch3.test.ts`.

---

## 2. Scope

### 2.1 Authoritative Scope

- Product catalog: products organized by categories with price and stock quantity
- Sale workflow: select products, set quantities, record payment, deduct stock
- Sales POS is distinct from Rental POS (Master Spec §10 note: "The Rental POS is not the same as the Sales POS")
- Payment: same split-payment model as rentals; must exactly match computed total
- Stock: inventory managed with `SELECT FOR UPDATE` to prevent overselling
- Sale cancellation: restores stock and creates refund treasury movements
- Sale code: unique identifier for each sale (format: `SAL-{timestamp}{random5}`)
- Invoice number: sequential, session-safe using MySQL `LAST_INSERT_ID()` sequence table

### 2.2 Implementation-Derived Scope (INFERRED FROM IMPLEMENTATION)

- Products have `is_active` flag; inactive products cannot be sold
- Categories have `name` and `nameAr`
- `sale_code` uniqueness protected by DB UNIQUE constraint + application retry (up to 3 attempts)
- `invoice_number` uses `sequences` table with `LAST_INSERT_ID(value+1)` for session isolation
- Sale status: `completed` | `cancelled`
- Active cashier shift required for sale creation
- Active cashier shift required for sale cancellation
- Only users with `sales.cancel` (typically Administrator) can cancel
- Source: `sales.service.ts`

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P11-01 | Products are organized in categories | CHANGELOG Phase 11 | IMPLEMENTED |
| BR-P11-02 | Product has price, stock quantity, active status | impl | IMPLEMENTED |
| BR-P11-03 | Sale requires at least one product item | `sales.service.ts` — CART_EMPTY | IMPLEMENTED |
| BR-P11-04 | Sale requires payment | `sales.service.ts` — NO_PAYMENTS | IMPLEMENTED |
| BR-P11-05 | Payment total must exactly match computed product total | `sales.service.ts` — PAYMENT_MISMATCH | TESTED |
| BR-P11-06 | Stock is deducted atomically with sale creation | `sales.service.ts` FOR UPDATE | TESTED |
| BR-P11-07 | Overselling is prevented | `sales.service.ts` — INSUFFICIENT_STOCK | TESTED |
| BR-P11-08 | Inactive products cannot be sold | `sales.service.ts` — PRODUCT_INACTIVE | IMPLEMENTED |
| BR-P11-09 | Sale creation requires active cashier shift (F-007) | `sales.service.ts` | TESTED |
| BR-P11-10 | Sale cancellation requires active cashier shift | `sales.service.ts` cancelSale | TESTED |
| BR-P11-11 | Cancellation restores stock for all items | `sales.service.ts` cancelSale | TESTED |
| BR-P11-12 | Cancellation creates refund treasury movements | `sales.service.ts` cancelSale | TESTED |
| BR-P11-13 | Cashier cannot cancel a sale (RBAC) | `sales.routes.ts` — sales.cancel permission | TESTED |
| BR-P11-14 | Already-cancelled sale cannot be cancelled again | `sales.service.ts` — ALREADY_CANCELLED | TESTED |
| BR-P11-15 | Sale code is unique (F-012) | `sales.service.ts` — retry + DB UNIQUE | TESTED |
| BR-P11-16 | Invoice number is sequential and session-safe (Phase 14 F-003) | `sales.service.ts` sequences table | TESTED (gate41-remediation.test.ts) |

---

## 4. Functional Behavior

### 4.1 Create Sale

`POST /api/v1/sales`

- Required permission: `sales.create`
- Validates active shift
- Validates cart is not empty
- For each product: locks row (`SELECT FOR UPDATE`), checks stock, validates active status, computes price
- Validates payment total matches computed total
- Creates sale, sale_items, sale_payments, treasury_movements in one transaction
- Deducts stock for each product
- Returns completed sale with all details

### 4.2 Sale Code Generation (F-012)

- Format: `SAL-{Date.now()13digits}{random5digits}`
- Application-level retry: up to 3 attempts on duplicate key
- DB UNIQUE constraint `sales_sale_code_unique` is the authoritative safety net
- Source: `sales.service.ts` generateSaleCode() + retry loop

### 4.3 Invoice Number (Phase 14 F-003 — integrated in Phase 11)

- Stored in `sequences` table with key `invoice_number`
- Uses `LAST_INSERT_ID(value+1)` to make counter session-scoped
- Format: `INV-{000001}` (6-digit zero-padded)
- Source: `sales.service.ts` lines 170-174

### 4.4 Cancel Sale

`POST /api/v1/sales/:id/cancel`

- Required permission: `sales.cancel`
- Validates active shift
- Locks sale row with FOR UPDATE
- Sets status to `cancelled`
- Restores stock for all items
- Creates `out` treasury movements for each payment (refund)
- Returns updated sale
- Source: `sales.service.ts` cancelSale()

---

## 5. Data Model

### 5.1 Tables

| Table | Purpose | Source |
|---|---|---|
| `products` | Product catalog with category, price, stock | `db/schema/products.ts` |
| `product_categories` | Product categories | `db/schema/products.ts` |
| `sales` | Sale header with code, cashier, shift, total, status | `db/schema/sales.ts` |
| `sale_items` | Line items per sale (product, qty, price) | `db/schema/sales.ts` |
| `sale_payments` | Payment records per sale | `db/schema/sales.ts` |
| `sequences` | Sequential counter table for invoice numbers | INFERRED — `sales.service.ts` lines 170-172 |

### 5.2 Key Fields

- `sales.sale_code` — UNIQUE, format SAL-{timestamp}{random}
- `sales.invoice_number` — sequential, format INV-000001
- `sales.status` — `completed` | `cancelled`
- `sales.shift_id` — FK to cashier_shifts (required)
- `sale_items.product_id`, `quantity`, `unit_price`, `total_price`
- `sale_payments.payment_method_id`, `amount`, `treasury_account_id`

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/sales` | `sales.view` | List sales |
| GET | `/api/v1/sales/:id` | `sales.view` | Get sale with items and payments |
| POST | `/api/v1/sales` | `sales.create` | Create sale |
| POST | `/api/v1/sales/:id/cancel` | `sales.cancel` | Cancel sale |
| GET | `/api/v1/products` | `products.view` | List products |
| POST | `/api/v1/products` | `products.create` | Create product |
| GET | `/api/v1/products/categories` | `products.view` | List categories |
| POST | `/api/v1/products/categories` | `products.create` | Create category |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `sales.view` | View sales | impl |
| `sales.create` | Create sale | `sales.routes.ts` |
| `sales.cancel` | Cancel sale | `sales.routes.ts` |
| `products.view` | View products/categories | impl |
| `products.create` | Create products/categories | impl |

---

## 8. Financial Integrity

| Rule | Evidence | Verification |
|---|---|---|
| Payment total must match computed total | `sales.service.ts` PAYMENT_MISMATCH | TESTED |
| Active shift required for sale creation | `sales.service.ts` | TESTED — sales.test.ts (NO_ACTIVE_SHIFT) |
| Active shift required for cancellation | `sales.service.ts` cancelSale | TESTED |
| Treasury movement IN on sale creation | `sales.service.ts` | TESTED |
| Treasury movement OUT on cancellation | `sales.service.ts` | TESTED |
| Treasury balance updated on each movement | `sales.service.ts` | IMPLEMENTED |
| Stock deduction atomic with sale creation | `sales.service.ts` FOR UPDATE | TESTED |
| Stock restoration on cancellation | `sales.service.ts` | TESTED |

---

## 9. Testing

### 9.1 Test Files

| File | Coverage |
|---|---|
| `sales.test.ts` | CRUD, stock deduction, treasury movement, permission enforcement, cancellation, shift enforcement |
| `gate42-batch3.test.ts` | F-012 sale code uniqueness, F-013 shift permission, F-017 settings hardening |

### 9.2 Test Cases

| ID | Description | File | Status |
|---|---|---|---|
| TC-SALE-01 | Creates sale, deducts stock, records treasury movement | sales.test.ts | TESTED |
| TC-SALE-02 | Fails if insufficient stock | sales.test.ts | TESTED |
| TC-SALE-03 | Fails if payment mismatch | sales.test.ts | TESTED |
| TC-SALE-04 | Cashier cannot cancel sale (403) | sales.test.ts | TESTED |
| TC-SALE-05 | Admin can cancel sale; restores stock; refunds treasury | sales.test.ts | TESTED |
| TC-SALE-06 | Cannot cancel already-cancelled sale (409) | sales.test.ts | TESTED |
| TC-SALE-07 | Fails without active shift (422 NO_ACTIVE_SHIFT) | sales.test.ts | TESTED |
| TC-F012 | Sale code uniqueness under concurrency | gate42-batch3.test.ts | TESTED |

---

## 10. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| Sale creation | `sales.service.ts` createSale | TC-SALE-01 | TESTED | CHANGELOG Phase 11 |
| Stock deduction | `sales.service.ts` FOR UPDATE | TC-SALE-01 | TESTED | CHANGELOG |
| Oversell prevention | `sales.service.ts` INSUFFICIENT_STOCK | TC-SALE-02 | TESTED | CHANGELOG |
| Payment mismatch rejection | `sales.service.ts` PAYMENT_MISMATCH | TC-SALE-03 | TESTED | CHANGELOG |
| RBAC: cashier cannot cancel | `sales.routes.ts` | TC-SALE-04 | TESTED | CHANGELOG |
| Cancellation + stock restore + refund | `sales.service.ts` cancelSale | TC-SALE-05 | TESTED | CHANGELOG |
| Double-cancel prevention | `sales.service.ts` | TC-SALE-06 | TESTED | impl |
| Active shift required | `sales.service.ts` | TC-SALE-07 | TESTED | Gate 4.2 |
| Sale code uniqueness (F-012) | `sales.service.ts` retry + UNIQUE | TC-F012 | TESTED | Gate 4.2 Batch 3 |
| Invoice number sequential (F-003) | `sales.service.ts` sequences | gate41-remediation.test.ts | TESTED | Gate 4.1 F-003 |

---

## 11. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P11-01 | Products/categories RBAC not covered in standalone tests | LOW |
| G-P11-02 | `docs/modules/SALES_POS.md` remains a stub | DOCUMENTATION |
| G-P11-03 | Product photo upload not implemented | LOW — deferred (UNK-006) |

---

## 12. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 11 Implementation | 2026-09-25–30 | Sales POS implemented. CHANGELOG entry "Phase 11 (Sales POS) Completed". |
| Gate 4.1 — F-003 | 2026-10-02 | Invoice number sequence implemented (LAST_INSERT_ID session-safe). |
| Gate 4.2 Batch 3 — F-012 | 2026-10-02 | Sale code uniqueness hardened with retry and longer random component. |
| Gate 4.2 Batch 3 — F-013 | 2026-10-02 | Shift permission check added to shift open/close (indirectly related to sales shift requirement). |
| Gate 5.2 | 2026-10-03 | This document created. PLANNED stub replaced with evidence-traceable specification. |

---

## 14. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Core sale flow, stock deduction, payment collection, cancellation, RBAC: TESTED
- F-012 sale code uniqueness: TESTED (Gate 4.2 Batch 3)
- Invoice sequence: TESTED (Gate 4.1)
- Product/category RBAC not isolated-tested
- Browser verification: not performed

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

*Last updated: 2026-10-03 (Gate 5.2 — Documentation Reconciliation. Replaced PLANNED stub with evidence-traceable specification. Remediation history (F-012, F-013, F-003) documented accurately.)*
