# Project Map — KOSHK SKATE ERP

**Version:** 1.0  
**Purpose:** Navigation map for future AI agents. Read this BEFORE scanning the repository.  
**Last updated:** 2026-09-09

> [!IMPORTANT]
> **PROJECT STATE: PRE-IMPLEMENTATION (GREENFIELD)**
> No source code exists. All paths below are TARGET locations — where code WILL be placed.
> When implementation begins, update this file to mark paths as VERIFIED as they are created.

---

## Repository Root

```
d:/Skate system/
├── docs/                        — All project documentation
│   ├── 00-governance/           — AI rules, process, DoD
│   ├── architecture/            — Technical architecture docs
│   ├── modules/                 — Per-module documentation
│   ├── phases/                  — Phase plans
│   ├── quality/                 — QA strategy and test matrix
│   ├── decisions/               — Decision log
│   ├── product/                 — (placeholder for spec copy)
│   ├── design/                  — (placeholder for design doc copy)
│   ├── PROJECT_MAP.md           — THIS FILE
│   ├── PROJECT_STATE.md         — Current project status
│   ├── CHANGELOG.md             — Change history
│   ├── RELEASE_HISTORY.md       — Release history
│   └── INITIAL_PROJECT_AUDIT.md — Initial audit report
├── apps/                        — Applications (TARGET — not yet created)
│   ├── web/                     — Frontend
│   └── api/                     — Backend
├── tests/                       — Test suites (TARGET)
├── scripts/                     — Utility scripts (TARGET)
├── KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md  — VERIFIED (source document)
└── Skate_Rental_ERP_Master_Business_Product_Specification.md  — VERIFIED (source document)
```

---

## Module Navigation Map

For each module: where to find code, documentation, database tables, and API routes.

---

### MODULE: AUTH

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/auth/` | PLANNED |
| Backend | `apps/api/src/modules/auth/` | PLANNED |
| Database tables | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | PLANNED |
| API routes | `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` | PLANNED |
| Documentation | `docs/modules/AUTH.md` | PLANNED |
| Tests | `tests/auth/` | PLANNED |

**Dependencies:** None (foundation module)  
**Key risks:** JWT secret management, session coverage for cashier shifts

---

### MODULE: USERS & PERMISSIONS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/users/` | PLANNED |
| Backend | `apps/api/src/modules/users/` | PLANNED |
| Database tables | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | PLANNED |
| API routes | `/api/v1/users`, `/api/v1/roles`, `/api/v1/permissions` | PLANNED |
| Documentation | `docs/modules/USERS_PERMISSIONS.md` | PLANNED |
| Tests | `tests/users/` | PLANNED |

**Dependencies:** AUTH  
**Key risks:** Permission enforcement must be server-side

---

### MODULE: SKATES

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/skates/` | PLANNED |
| Backend | `apps/api/src/modules/skates/` | PLANNED |
| Database tables | `skates` | PLANNED |
| API routes | `/api/v1/skates`, `/api/v1/skates/:id`, `/api/v1/skates/:id/history` | PLANNED |
| Documentation | `docs/modules/SKATES.md` | PLANNED |
| Tests | `tests/skates/` | PLANNED |

**Dependencies:** AUTH, USERS_PERMISSIONS  
**Key risks:** Status transitions must be atomic; concurrent rental must be prevented

---

### MODULE: CUSTOMERS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/customers/` | PLANNED |
| Backend | `apps/api/src/modules/customers/` | PLANNED |
| Database tables | `customers` | PLANNED |
| API routes | `/api/v1/customers`, `/api/v1/customers/:id` | PLANNED |
| Documentation | `docs/modules/CUSTOMERS.md` | PLANNED |
| Tests | `tests/customers/` | PLANNED |

**Dependencies:** AUTH  
**Key risks:** National ID is sensitive — access logging required

---

### MODULE: RENTALS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/rentals/` | PLANNED |
| Backend | `apps/api/src/modules/rentals/` | PLANNED |
| Database tables | `rentals`, `rental_payments`, `late_fee_records` | PLANNED |
| API routes | `/api/v1/rentals`, `POST /api/v1/rentals`, `/api/v1/rentals/active`, `/api/v1/rentals/:id/return`, `/api/v1/rentals/:id/waive-late-fee` | PLANNED |
| Documentation | `docs/modules/RENTALS.md` | PLANNED |
| Tests | `tests/rentals/` | PLANNED |

**Dependencies:** AUTH, SKATES, CUSTOMERS, PAYMENTS, TREASURY  
**Key risks:**
- Concurrent rental of same skate (requires DB transaction + lock)
- Late fee calculation correctness
- Waiver permission + audit
- Rental price stored historically (not referenced from current config)

---

### MODULE: PAYMENTS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/payments/` (or integrated in Rentals/Sales) | PLANNED |
| Backend | `apps/api/src/modules/payments/` | PLANNED |
| Database tables | `rental_payments`, `sale_payments`, `payment_methods` | PLANNED |
| API routes | `/api/v1/payment-methods`, `/api/v1/rentals/:id/payments`, `/api/v1/sales/:id/payments` | PLANNED |
| Documentation | `docs/modules/PAYMENTS.md` | PLANNED |
| Tests | `tests/payments/` | PLANNED |

**Dependencies:** AUTH, RENTALS, TREASURY  
**Key risks:** Split payments must be atomic; each component individually identifiable

---

### MODULE: TREASURY

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/treasury/` | PLANNED |
| Backend | `apps/api/src/modules/treasury/` | PLANNED |
| Database tables | `treasury_accounts`, `treasury_movements` | PLANNED |
| API routes | `/api/v1/treasury/accounts`, `/api/v1/treasury/movements` | PLANNED |
| Documentation | `docs/modules/TREASURY.md` | PLANNED |
| Tests | `tests/treasury/` | PLANNED |

**Dependencies:** AUTH, PAYMENTS  
**Key risks:** Balance must remain accurate; movements must be immutable and traceable

---

### MODULE: INSPECTIONS

| Area | Path | Status |
|---|---|---|
| Frontend | Integrated in return workflow (rentals module) | PLANNED |
| Backend | `apps/api/src/modules/inspections/` | PLANNED |
| Database tables | `inspections` | PLANNED |
| API routes | `POST /api/v1/inspections`, `GET /api/v1/skates/:id/inspections` | PLANNED |
| Documentation | `docs/modules/RETURNS_INSPECTION.md` | PLANNED |
| Tests | `tests/inspections/` | PLANNED |

**Dependencies:** RENTALS, SKATES  
**Key risks:** Inspection triggers skate status decision (available vs maintenance)

---

### MODULE: DAMAGE

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/damage/` | PLANNED |
| Backend | `apps/api/src/modules/damage/` | PLANNED |
| Database tables | `damage_reports` | PLANNED |
| API routes | `/api/v1/damage-reports`, `/api/v1/damage-reports/:id` | PLANNED |
| Documentation | `docs/modules/DAMAGE.md` | PLANNED |
| Tests | `tests/damage/` | PLANNED |

**Dependencies:** SKATES, CUSTOMERS, INSPECTIONS, PAYMENTS  
**Key risks:** Damage charge vs maintenance cost must remain separate; photo upload security

---

### MODULE: MAINTENANCE

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/maintenance/` | PLANNED |
| Backend | `apps/api/src/modules/maintenance/` | PLANNED |
| Database tables | `maintenance_records`, `maintenance_parts` | PLANNED |
| API routes | `/api/v1/maintenance`, `/api/v1/maintenance/:id`, `/api/v1/maintenance/:id/complete` | PLANNED |
| Documentation | `docs/modules/MAINTENANCE.md` | PLANNED |
| Tests | `tests/maintenance/` | PLANNED |

**Dependencies:** SKATES, DAMAGE  
**Key risks:** Completion must atomically change skate status to available

---

### MODULE: RESERVATIONS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/reservations/` | PLANNED |
| Backend | `apps/api/src/modules/reservations/` | PLANNED |
| Database tables | `reservations` | PLANNED |
| API routes | `/api/v1/reservations` | PLANNED |
| Documentation | `docs/modules/RESERVATIONS.md` | PLANNED |
| Tests | `tests/reservations/` | PLANNED |

**Dependencies:** SKATES, CUSTOMERS  
**Key risks:** Conflict detection for overlapping reservations

---

### MODULE: SALES POS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/sales/` | PLANNED |
| Backend | `apps/api/src/modules/sales/` | PLANNED |
| Database tables | `sales`, `sale_items`, `sale_payments` | PLANNED |
| API routes | `/api/v1/sales`, `/api/v1/products` | PLANNED |
| Documentation | `docs/modules/SALES_POS.md` | PLANNED |
| Tests | `tests/sales/` | PLANNED |

**Dependencies:** AUTH, PRODUCTS, PAYMENTS, TREASURY  
**Key risks:** Must remain separate from Rental POS workflow

---

### MODULE: PRODUCTS

| Area | Path | Status |
|---|---|---|
| Frontend | Integrated in Sales POS | PLANNED |
| Backend | `apps/api/src/modules/products/` | PLANNED |
| Database tables | `products`, `product_categories` | PLANNED |
| API routes | `/api/v1/products` | PLANNED |
| Documentation | `docs/modules/PRODUCTS.md` | PLANNED |
| Tests | `tests/products/` | PLANNED |

**Dependencies:** AUTH  

---

### MODULE: EXPENSES

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/expenses/` | PLANNED |
| Backend | `apps/api/src/modules/expenses/` | PLANNED |
| Database tables | `expenses`, `expense_categories` | PLANNED |
| API routes | `/api/v1/expenses`, `/api/v1/expense-categories` | PLANNED |
| Documentation | `docs/modules/EXPENSES.md` | PLANNED |
| Tests | `tests/expenses/` | PLANNED |

**Dependencies:** AUTH, TREASURY  
**Key risks:** Expense must update treasury balance atomically

---

### MODULE: CASHIER SHIFTS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/shifts/` | PLANNED |
| Backend | `apps/api/src/modules/shifts/` | PLANNED |
| Database tables | `cashier_shifts` | PLANNED |
| API routes | `/api/v1/shifts`, `/api/v1/shifts/open`, `/api/v1/shifts/:id/close`, `/api/v1/shifts/current` | PLANNED |
| Documentation | `docs/modules/CASHIER_SHIFTS.md` | PLANNED |
| Tests | `tests/shifts/` | PLANNED |

**Dependencies:** AUTH, TREASURY, EXPENSES  
**Key risks:** Shift opening/closing balance calculation accuracy

---

### MODULE: REPORTS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/reports/` | PLANNED |
| Backend | `apps/api/src/modules/reports/` | PLANNED |
| Database tables | (reads from all tables) | PLANNED |
| API routes | `/api/v1/reports/*` | PLANNED |
| Documentation | `docs/modules/REPORTS.md` | PLANNED |
| Tests | `tests/reports/` | PLANNED |

**Dependencies:** All data modules  
**Key risks:** Report queries must be read-only; complex joins require care for performance

---

### MODULE: INVOICES & PRINTING

| Area | Path | Status |
|---|---|---|
| Frontend | Integrated in Rentals + Sales modules | PLANNED |
| Backend | `apps/api/src/modules/invoices/` | PLANNED |
| Database tables | (references rentals + sales) | PLANNED |
| API routes | `/api/v1/rentals/:id/invoice`, `/api/v1/sales/:id/invoice` | PLANNED |
| Documentation | `docs/modules/INVOICES_PRINTING.md` | PLANNED |
| Tests | `tests/invoices/` | PLANNED |

**Dependencies:** RENTALS, SALES  
**Key risks:** Barcode generation, printer configuration

---

### MODULE: NOTIFICATIONS

| Area | Path | Status |
|---|---|---|
| Frontend | Notification panel in header | PLANNED |
| Backend | `apps/api/src/modules/notifications/` + background job | PLANNED |
| Database tables | `notifications` | PLANNED |
| API routes | `/api/v1/notifications` | PLANNED |
| Documentation | `docs/modules/NOTIFICATIONS.md` | PLANNED |
| Tests | `tests/notifications/` | PLANNED |

**Dependencies:** RENTALS  
**Key risks:** Delivery mechanism (SSE/WebSocket/polling) pending decision; must not be browser-timer-only

---

### MODULE: AUDIT LOG

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/audit-log/` | PLANNED |
| Backend | `apps/api/src/modules/audit-log/` (+ service used by all modules) | PLANNED |
| Database tables | `audit_log` | PLANNED |
| API routes | `/api/v1/audit-log` | PLANNED |
| Documentation | `docs/modules/AUDIT_LOG.md` | PLANNED |
| Tests | `tests/audit/` | PLANNED |

**Dependencies:** AUTH, all modules that generate audit entries  
**Key risks:** Must capture old and new values; must not be optional for waivers/financial actions

---

### MODULE: SETTINGS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/settings/` | PLANNED |
| Backend | `apps/api/src/modules/settings/` | PLANNED |
| Database tables | `settings`, `payment_methods`, `expense_categories` | PLANNED |
| API routes | `/api/v1/settings` | PLANNED |
| Documentation | `docs/modules/SETTINGS.md` | PLANNED |
| Tests | `tests/settings/` | PLANNED |

**Dependencies:** AUTH  
**Key risks:** Pricing changes must not retroactively affect historical rentals

---

### MODULE: DASHBOARD

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/dashboard/` | PLANNED |
| Backend | `apps/api/src/modules/dashboard/` (or reports module) | PLANNED |
| Database tables | (reads from all tables) | PLANNED |
| API routes | `/api/v1/dashboard` (or report endpoints) | PLANNED |
| Documentation | `docs/modules/DASHBOARD.md` | PLANNED |
| Tests | `tests/dashboard/` | PLANNED |

**Dependencies:** All data modules, SHIFTS  

---

## Shared Infrastructure

| Component | Target Location | Status |
|---|---|---|
| Design system CSS | `apps/web/src/styles/` | PLANNED |
| Shared UI components | `apps/web/src/components/` | PLANNED |
| API client | `apps/web/src/services/api.js` | PLANNED |
| Auth middleware | `apps/api/src/middleware/auth.js` | PLANNED |
| Permission middleware | `apps/api/src/middleware/permission.js` | PLANNED |
| DB connection | `apps/api/src/db/connection.js` | PLANNED |
| Audit service | `apps/api/src/modules/audit-log/audit.service.js` | PLANNED |
| Financial utilities | `apps/api/src/utils/financial.js` | PLANNED |
| Error classes | `apps/api/src/utils/errors.js` | PLANNED |

---

## How to Use This Map

1. Receive a task (e.g., "add late fee waiver")
2. Identify the module(s) involved (RENTALS, PAYMENTS, AUDIT)
3. Find the relevant code paths from this map
4. Read only those paths (not the whole repo)
5. Update this map when you add new files, tables, or routes

---

*Last updated: 2026-09-09*
