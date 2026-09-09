# Project Map — KOSHK SKATE ERP

**Version:** 1.2  
**Purpose:** Navigation map for future AI agents. Read this BEFORE scanning the repository.  
**Last updated:** 2026-09-09 (Phase 01 execution)

> [!IMPORTANT]
> **PROJECT STATE: IN IMPLEMENTATION — Phase 01 COMPLETED. Phase 02 not yet started.**
> Phase 01 scaffold files are committed and pushed. Paths marked VERIFIED exist on disk and have been tested.
> Update this file as new files are created in Phase 02+.

---

## Repository Root

```
d:/Skate system/
├── .gitignore                   — VERIFIED (Phase 01)
├── README.md                    — VERIFIED (Phase 01, Arabic)
├── docs/                        — All project documentation
│   ├── 00-governance/           — AI rules, process, DoD
│   │   ├── AI_AGENT_RULES.md      — VERIFIED
│   │   ├── AI_AGENT_WORKFLOW_AR.md — VERIFIED
│   │   ├── SOURCE_OF_TRUTH.md     — VERIFIED
│   │   ├── DEFINITION_OF_DONE.md  — VERIFIED
│   │   ├── CHANGE_REQUEST_PROCESS.md — VERIFIED
│   │   └── DOCUMENTATION_RULES.md — VERIFIED
│   ├── architecture/            — Technical architecture docs (VERIFIED)
│   ├── modules/                 — Per-module documentation (STUBS)
│   ├── phases/                  — Phase plans (PHASE_01 expanded)
│   ├── quality/                 — QA strategy and test matrix (VERIFIED)
│   ├── decisions/               — Decision log (23 decisions)
│   ├── product/                 — Master Business Spec copy (VERIFIED)
│   ├── design/                  — Visual Design Reference copy (VERIFIED)
│   ├── PROJECT_MAP.md           — THIS FILE
│   ├── PROJECT_STATE.md         — Current project status
│   ├── CHANGELOG.md             — Change history
│   ├── RELEASE_HISTORY.md       — Release history
│   └── INITIAL_PROJECT_AUDIT.md — Initial audit report
├── apps/                        — Applications
│   ├── web/                     — Frontend (VERIFIED — Phase 01)
│   │   ├── index.html             — VERIFIED (lang=ar dir=rtl, Cairo font)
│   │   ├── .env.example           — VERIFIED
│   │   ├── package.json           — VERIFIED
│   │   ├── vite.config.ts         — VERIFIED
│   │   ├── tsconfig.json          — VERIFIED
│   │   └── src/
│   │       ├── main.tsx             — VERIFIED
│   │       ├── App.tsx              — VERIFIED (shell: sidebar + topbar + content)
│   │       ├── styles/
│   │       │   ├── design-system.css — VERIFIED (full CSS token system)
│   │       │   └── index.css         — VERIFIED (global RTL reset)
│   │       └── services/
│   │           └── api.ts            — VERIFIED (typed fetch API client)
│   └── api/                     — Backend (VERIFIED — Phase 01)
│       ├── .env.example           — VERIFIED
│       ├── package.json           — VERIFIED
│       ├── tsconfig.json          — VERIFIED
│       ├── drizzle.config.ts      — VERIFIED (Drizzle Kit config)
│       └── src/
│           ├── index.ts             — VERIFIED (Express entry, health check)
│           ├── config/
│           │   └── env.ts           — VERIFIED (centralized env config)
│           ├── middleware/
│           │   └── errorHandler.ts  — VERIFIED (global JSON error handler)
│           ├── db/
│           │   ├── connection.ts    — VERIFIED (Drizzle + mysql2 pool)
│           │   └── schema/
│           │       └── index.ts     — VERIFIED (empty schema anchor)
│           ├── utils/
│           │   ├── errors.ts        — VERIFIED (8 custom error classes)
│           │   └── financial.ts     — VERIFIED (late fee, currency utils)
│           └── modules/             — PLANNED (Phase 02+)
├── tests/                       — PLACEHOLDER (Phase 02+)
├── scripts/                     — PLACEHOLDER
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
| Design system CSS | `apps/web/src/styles/design-system.css` | VERIFIED (Phase 01) |
| Global CSS / RTL reset | `apps/web/src/styles/index.css` | VERIFIED (Phase 01) |
| Shared UI components | `apps/web/src/components/` | PLANNED (Phase 02+) |
| API client | `apps/web/src/services/api.ts` | VERIFIED (Phase 01) |
| Auth middleware | `apps/api/src/middleware/auth.ts` | PLANNED (Phase 02) |
| Permission middleware | `apps/api/src/middleware/permission.ts` | PLANNED (Phase 02) |
| DB connection | `apps/api/src/db/connection.ts` | VERIFIED (Phase 01) |
| DB schema index | `apps/api/src/db/schema/index.ts` | VERIFIED (Phase 01) |
| Drizzle config | `apps/api/drizzle.config.ts` | VERIFIED (Phase 01) |
| Audit service | `apps/api/src/modules/audit-log/audit.service.ts` | PLANNED (Phase 16) |
| Financial utilities | `apps/api/src/utils/financial.ts` | VERIFIED (Phase 01) |
| Error classes | `apps/api/src/utils/errors.ts` | VERIFIED (Phase 01) |
| Error handler middleware | `apps/api/src/middleware/errorHandler.ts` | VERIFIED (Phase 01) |
| Env config | `apps/api/src/config/env.ts` | VERIFIED (Phase 01) |

---

## How to Use This Map

1. Receive a task (e.g., "add late fee waiver")
2. Identify the module(s) involved (RENTALS, PAYMENTS, AUDIT)
3. Find the relevant code paths from this map
4. Read only those paths (not the whole repo)
5. Update this map when you add new files, tables, or routes

---

## Approved Technology (reference)

| Layer | Approved Technology |
|---|---|
| Frontend | React + Vite + TypeScript (DEC-019) |
| Backend | Node.js + Express + TypeScript (DEC-020) |
| Database | MySQL / MariaDB InnoDB utf8mb4 (DEC-015) |
| ORM / DB Driver | Drizzle ORM + mysql2 (DEC-022) |
| Arabic Font | Cairo — Google Fonts (DEC-023) |
| Source control | GitHub (`mohamedalihassanwork-cpu/Skate-system`, branch: `master`) (DEC-021) |
| Auth | PENDING decision (Phase 02) |

---

*Last updated: 2026-09-09 (Phase 01 final gate)*
