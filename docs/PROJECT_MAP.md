# Project Map — KOSHK SKATE ERP

**Version:** 1.5
**Purpose:** Navigation map for future AI agents. Read this BEFORE scanning the repository.
**Last updated:** 2026-09-10 (Phase 03.5 Stage 1 — design system docs registered, component library paths planned)

> [!IMPORTANT]
> **PROJECT STATE: IN IMPLEMENTATION — Phase 03 FINAL GATE PASSED. Phase 03.5 Stage 1 COMPLETE.**
> Phase 03 auth/users/skates files are committed and verified. Phase 03.5 Stage 1 documentation is committed.
> Stage 2 (implementation) requires owner approval before starting.
> Update status from PLANNED → VERIFIED as files are created.

---

## Repository Root

```
d:/Skate system/
├── .gitignore                   — VERIFIED
├── README.md                    — VERIFIED (Phase 02, Arabic, updated)
├── KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md  — VERIFIED (source document)
├── Skate_Rental_ERP_Master_Business_Product_Specification.md  — VERIFIED (source document)
└── docs/                        — All project documentation
    ├── 00-governance/           — AI rules, process, DoD
    │   ├── AI_AGENT_RULES.md      — UPDATED v2.0 (Phase 03.5 — UI rules + DOCUMENTATION_FIRST)
    │   ├── AI_AGENT_WORKFLOW_AR.md — VERIFIED
    │   ├── SOURCE_OF_TRUTH.md     — UPDATED v2.0 (Phase 03.5)
    │   ├── DEFINITION_OF_DONE.md  — UPDATED v2.0 (Phase 03.5 — UI/UX DoD expanded)
    │   ├── CHANGE_REQUEST_PROCESS.md — VERIFIED
    │   └── DOCUMENTATION_RULES.md — VERIFIED
    ├── architecture/            — Technical architecture docs (VERIFIED, updated Phase 02)
    ├── design/                  — Visual design and component library documentation
    │   ├── VISUAL_DESIGN_REFERENCE.md — VERIFIED (copy of root-level VDR)
    │   ├── DESIGN_SYSTEM.md       — CREATED Phase 03.5 Stage 1 — authoritative design system
    │   └── COMPONENT_LIBRARY.md   — CREATED Phase 03.5 Stage 1 — component developer reference
    ├── modules/                 — Per-module documentation
    │   ├── AUTH.md              — VERIFIED (Phase 02)
    │   ├── USERS_PERMISSIONS.md — VERIFIED (Phase 02)
    │   └── SKATES.md            — UPDATED (Phase 03 pre-implementation 2026-09-10 — was stub)
    ├── phases/                  — Phase plans
    │   ├── PHASE_02_AUTHENTICATION_AND_PERMISSIONS.md — VERIFIED (full spec, Phase 02 Final Gate)
    │   ├── PHASE_03_SKATES_MODULE.md — UPDATED (full spec written 2026-09-10)
    │   └── PHASE_035_UI_DESIGN_SYSTEM.md — CREATED Phase 03.5 Stage 1 — full phase spec
    ├── quality/                 — QA strategy and test matrix (VERIFIED)
    ├── decisions/               — Decision log (40 decisions through DEC-040)
    ├── product/                 — Master Business Spec copy (VERIFIED)
    ├── PROJECT_MAP.md           — THIS FILE (v1.5)
    ├── PROJECT_STATE.md         — Current project status (v2.7 — Phase 03.5 Stage 1)
    ├── CHANGELOG.md             — Change history (Phase 03.5 Stage 1 entry added)
    ├── RELEASE_HISTORY.md       — Release history
    └── INITIAL_PROJECT_AUDIT.md — Initial audit report
├── apps/                        — Applications
│   ├── web/                     — Frontend (VERIFIED — Phase 02)
│   │   ├── index.html             — VERIFIED (lang=ar dir=rtl, Cairo font)
│   │   ├── .env.example           — VERIFIED
│   │   ├── package.json           — VERIFIED (react-router-dom added)
│   │   ├── vite.config.ts         — VERIFIED
│   │   ├── tsconfig.json          — VERIFIED
│   │   └── src/
│   │       ├── main.tsx             — VERIFIED (wrapped BrowserRouter + AuthProvider)
│   │       ├── App.tsx              — VERIFIED (full routing: /login + protected shell)
│   │       ├── styles/
│   │       │   ├── design-system.css — VERIFIED (full CSS token system)
│   │       │   └── index.css         — VERIFIED (global RTL reset)
│   │       ├── services/
│   │       │   └── api.ts            — VERIFIED (auth-aware: Bearer injection + 401 retry)
│   │       ├── contexts/
│   │       │   └── AuthContext.tsx   — VERIFIED (Phase 02: in-memory token, silent refresh)
│   │       ├── hooks/
│   │       │   └── usePermission.ts  — VERIFIED (Phase 02)
│   │       ├── components/
│   │       │   ├── ProtectedRoute.tsx — VERIFIED (Phase 02)
│   │       │   └── PermissionGate.tsx — VERIFIED (Phase 02)
│   │       └── modules/
│   │           ├── auth/
│   │           │   ├── auth.types.ts  — VERIFIED (Phase 02)
│   │           │   ├── auth.service.ts — VERIFIED (Phase 02)
│   │           │   └── LoginPage.tsx  — VERIFIED (Phase 02, Arabic RTL)
│   │           └── users/
│   │               ├── users.service.ts — VERIFIED (Phase 02)
│   │               ├── UsersPage.tsx    — VERIFIED (Phase 02)
│   │               └── RolesPage.tsx    — VERIFIED (Phase 02)
│   └── api/                     — Backend (VERIFIED — Phase 02)
│       ├── .env.example           — VERIFIED (updated Phase 02)
│       ├── package.json           — VERIFIED (test, db:seed scripts added)
│       ├── tsconfig.json          — VERIFIED
│       ├── drizzle.config.ts      — VERIFIED (schema array)
│       ├── vitest.config.ts       — VERIFIED (Phase 02 Final Gate)
│       └── src/
│           ├── index.ts             — VERIFIED (server entry — imports app.ts)
│           ├── app.ts               — VERIFIED (Phase 02: app factory, routes, middleware)
│           ├── config/
│           │   └── env.ts           — VERIFIED (JWT_REFRESH_SECRET, expiry, seed vars)
│           ├── middleware/
│           │   ├── errorHandler.ts  — VERIFIED
│           │   ├── auth.ts          — VERIFIED (Phase 02: authenticate middleware)
│           │   ├── permission.ts    — VERIFIED (Phase 02: requirePermission factory)
│           │   └── rateLimiter.ts   — VERIFIED (Phase 02: loginLimiter, skipped in test)
│           ├── db/
│           │   ├── connection.ts    — VERIFIED
│           │   ├── seed.ts          — VERIFIED (Phase 02: 40 perms, 3 roles, 1 admin)
│           │   ├── migrations/
│           │   │   └── 0000_cloudy_the_renegades.sql — VERIFIED (6 tables)
│           │   └── schema/
│           │       ├── index.ts     — VERIFIED (exports all tables)
│           │       ├── users.ts     — VERIFIED (Phase 02: users, roles, perms, join tables)
│           │       └── auth.ts      — VERIFIED (Phase 02: refresh_tokens)
│           ├── tests/
│           │   ├── setup.ts         — VERIFIED (Phase 02 Final Gate)
│           │   └── auth.test.ts     — VERIFIED (Phase 02 Final Gate: 18 tests, 18 PASS)
│           ├── utils/
│           │   ├── errors.ts        — VERIFIED (UnauthorizedError added Phase 02)
│           │   └── financial.ts     — VERIFIED
│           └── modules/
│               ├── auth/
│               │   ├── auth.types.ts  — VERIFIED (Phase 02)
│               │   ├── auth.service.ts — VERIFIED (Phase 02, jti fix in Final Gate)
│               │   └── auth.routes.ts  — VERIFIED (Phase 02)
│               ├── users/
│               │   ├── users.types.ts  — VERIFIED (Phase 02)
│               │   ├── users.service.ts — VERIFIED (Phase 02)
│               │   ├── users.routes.ts  — VERIFIED (Phase 02)
│               │   ├── roles.service.ts — VERIFIED (Phase 02)
│               │   └── roles.routes.ts  — VERIFIED (Phase 02)
│               └── skates/              — [PHASE 03 — PLANNED]
│                   ├── skates.types.ts  — PLANNED
│                   ├── skates.service.ts — PLANNED
│                   └── skates.routes.ts  — PLANNED
├── tests/                       — Integration tests (top-level placeholder)
├── scripts/                     — PLACEHOLDER
├── KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md  — VERIFIED (source document)
└── Skate_Rental_ERP_Master_Business_Product_Specification.md  — VERIFIED (source document)

Planned/verified web modules (Phase 03+):

```
apps/web/src/
├── components/
│   ├── ProtectedRoute.tsx  — VERIFIED (Phase 02)
│   ├── PermissionGate.tsx  — VERIFIED (Phase 02)
│   └── ui/                 — [Phase 03.5 Stage 2 — PLANNED] Shared UI component library
│       ├── Button.tsx        — PLANNED
│       ├── Input.tsx         — PLANNED
│       ├── Select.tsx        — PLANNED
│       ├── Textarea.tsx      — PLANNED
│       ├── Modal.tsx         — PLANNED
│       ├── Badge.tsx         — PLANNED
│       ├── Card.tsx          — PLANNED
│       ├── DataTable.tsx     — PLANNED
│       ├── SearchBar.tsx     — PLANNED
│       ├── EmptyState.tsx    — PLANNED
│       ├── LoadingSpinner.tsx — PLANNED
│       ├── LoadingSkeleton.tsx — PLANNED
│       ├── Toast.tsx         — PLANNED
│       ├── ToastProvider.tsx — PLANNED
│       ├── ConfirmDialog.tsx — PLANNED
│       ├── Alert.tsx         — PLANNED
│       ├── Icon.tsx          — PLANNED
│       ├── Pagination.tsx    — PLANNED
│       └── index.ts          — PLANNED (barrel export)
├── modules/
    ├── auth/               — VERIFIED (Phase 02)
    ├── users/              — VERIFIED (Phase 02)
    ├── skates/             — VERIFIED (Phase 03)
    ├── customers/          — [PHASE 04]
    └── ...
```

Planned API migrations (Phase 03+):
```
apps/api/src/db/migrations/
└── 0001_*.sql                   — [PHASE 03 — PLANNED] skates table
```

---

## Module Navigation Map

For each module: where to find code, documentation, database tables, and API routes.

---

### MODULE: AUTH

| Area | Path | Status |
|---|---|
| Frontend | `apps/web/src/modules/auth/` | VERIFIED (Phase 02) |
| Backend | `apps/api/src/modules/auth/` | VERIFIED (Phase 02) |
| Database tables | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | VERIFIED (Phase 02) |
| API routes | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` | VERIFIED (Phase 02) |
| Documentation | `docs/modules/AUTH.md` | VERIFIED (Phase 02) |
| Tests | `apps/api/src/tests/auth.test.ts` | VERIFIED (Phase 02 Final Gate — 18/18 PASS) |

**Dependencies:** None (foundation module)
**Key risks:** JWT secret must be rotated in production; rate limiter is in-memory (DEC-027)

---

### MODULE: USERS & PERMISSIONS

| Area | Path | Status |
|---|---|
| Frontend | `apps/web/src/modules/users/` | VERIFIED (Phase 02) |
| Backend | `apps/api/src/modules/users/` | VERIFIED (Phase 02) |
| Database tables | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | VERIFIED (Phase 02) |
| API routes | `/api/v1/users`, `/api/v1/roles` | VERIFIED (Phase 02) |
| Documentation | `docs/modules/USERS_PERMISSIONS.md` | VERIFIED (Phase 02) |
| Tests | Covered by `apps/api/src/tests/auth.test.ts` (TC-AUTH-11, -12) | VERIFIED |

**Dependencies:** AUTH
**Key risks:** Permission enforcement MUST remain server-side (backend middleware, not frontend only)

---

### MODULE: SKATES

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/skates/` | PLANNED (Phase 03) |
| Backend | `apps/api/src/modules/skates/` | PLANNED (Phase 03) |
| Database tables | `skates` | PLANNED (Phase 03) |
| API routes | `GET /api/v1/skates`, `POST /api/v1/skates`, `GET /api/v1/skates/available`, `GET /api/v1/skates/:id`, `PUT /api/v1/skates/:id`, `GET /api/v1/skates/:id/history` | PLANNED (Phase 03) |
| Documentation | `docs/modules/SKATES.md` | UPDATED (Phase 03 pre-implementation) |
| Tests | `apps/api/src/tests/skates.test.ts` | PLANNED (Phase 03 — 16 test cases defined) |

**Dependencies:** AUTH, USERS_PERMISSIONS
**Key risks:**
- Status transitions must be atomic; `rented`/`reserved` blocked from admin API (DEC-031)
- `skate_code` uniqueness enforced — concurrent creation could race; DB UNIQUE constraint is the safety net
- `GET /api/v1/skates/available` must be registered before `GET /api/v1/skates/:id` in the router
- DEC-007 enforcement (maintenance→available requires completed record) deferred to Phase 09 (TD-002)
**Approved decisions:** DEC-030, DEC-031, DEC-032, DEC-033
**Unresolved implementation details:** IMPL-001 (skate_code algorithm), IMPL-002 (QR format), IMPL-003 (barcode format), IMPL-004 (skate type values)

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
| Design system CSS | `apps/web/src/styles/design-system.css` | VERIFIED (Phase 01) — PLANNED correction (Phase 03.5 Stage 2) |
| Global CSS / RTL reset | `apps/web/src/styles/index.css` | VERIFIED (Phase 01) |
| Shared UI components | `apps/web/src/components/ui/` | PLANNED (Phase 03.5 Stage 2 — 17 components) |
| Auth middleware | `apps/web/src/components/ProtectedRoute.tsx` | VERIFIED (Phase 02) |
| Permission gate | `apps/web/src/components/PermissionGate.tsx` | VERIFIED (Phase 02) |
| API client | `apps/web/src/services/api.ts` | VERIFIED (Phase 02: auth-aware, 401 retry) |
| Auth middleware (backend) | `apps/api/src/middleware/auth.ts` | VERIFIED (Phase 02) |
| Permission middleware (backend) | `apps/api/src/middleware/permission.ts` | VERIFIED (Phase 02) |
| DB connection | `apps/api/src/db/connection.ts` | VERIFIED (Phase 01) |
| DB schema index | `apps/api/src/db/schema/index.ts` | VERIFIED (Phase 02: all tables exported) |
| Drizzle config | `apps/api/drizzle.config.ts` | VERIFIED (Phase 02: schema array) |
| Audit service | `apps/api/src/modules/audit-log/audit.service.ts` | PLANNED (Phase 16) |
| Financial utilities | `apps/api/src/utils/financial.ts` | VERIFIED (Phase 01) |
| Error classes | `apps/api/src/utils/errors.ts` | VERIFIED (Phase 02: UnauthorizedError added) |
| Error handler middleware | `apps/api/src/middleware/errorHandler.ts` | VERIFIED (Phase 01) |
| Env config | `apps/api/src/config/env.ts` | VERIFIED (Phase 02: JWT secrets, expiry, seed vars) |

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
| Auth | JWT Bearer (access) + HttpOnly cookie (refresh) — DEC-025, DEC-028 (Phase 02) |

---

*Last updated: 2026-09-10 (Phase 03.5 Stage 1 — design system docs registered, component library paths planned)*
