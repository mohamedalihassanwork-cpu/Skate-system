# Project Map — KOSHK SKATE ERP

**Version:** 2.0
**Purpose:** Navigation map for future AI agents. Read this BEFORE scanning the repository.
**Last updated:** 2026-09-26 (Governance and Migration Hardening)

> [!IMPORTANT]
> **PROJECT STATE: Phase 12 (Expenses) CLOSED ✅. Phase 13 (Reports) is IN PROGRESS ⏳.**
> All Phase 01–12 files are committed and verified.
> Phase 13 Backend is verified. Phase 13 Frontend is pending.

> [!WARNING]
> **Gate 5.3 — STALE NOTICE (2026-10-03):** This PROJECT_MAP was last updated at Phase 05
> closure (2026-09-21). The Module Navigation Map section below still shows modules
> P06–P17 as PLANNED. This is inaccurate. All modules through Phase 17 are implemented.
> The PROJECT_MAP requires a dedicated update pass to reflect the actual verified state
> of: Payments, Treasury, Returns/Inspections, Damage, Maintenance, Reservations, Sales,
> Products, Expenses, Cashier Shifts, Reports, Invoices, Notifications, Audit Log, Dashboard.
> Do NOT use this map's module section to determine implementation status for P06–P17.
> Use PROJECT_STATE.md and the individual phase documents instead.

---

## Repository Root

```
d:/Skate system/
├── .gitignore                   — VERIFIED
├── README.md                    — VERIFIED (Phase 02, Arabic, updated)
├── KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md  — VERIFIED (source document — VDR authority)
├── Skate_Rental_ERP_Master_Business_Product_Specification.md  — VERIFIED (source document)
└── docs/                        — All project documentation
    ├── 00-governance/           — AI rules, process, DoD
    │   ├── AI_AGENT_RULES.md      — UPDATED v3.0 (Governance Remediation 2026-09-14 — Rules 18–22 + UI-011)
    │   ├── AI_AGENT_WORKFLOW_AR.md — VERIFIED
    │   ├── SOURCE_OF_TRUTH.md     — UPDATED v2.1 (Governance Remediation — UI/UX Pro Max positioned, register updated)
    │   ├── DEFINITION_OF_DONE.md  — UPDATED v2.0 (Phase 03.5 — UI/UX DoD expanded)
    │   ├── CHANGE_REQUEST_PROCESS.md — VERIFIED
    │   └── DOCUMENTATION_RULES.md — VERIFIED
    ├── architecture/            — Technical architecture docs (VERIFIED, updated Phase 02; FRONTEND_ARCHITECTURE updated Governance Remediation)
    ├── design/                  — Visual design and component library documentation
    │   ├── VISUAL_DESIGN_REFERENCE.md — VERIFIED (copy of root-level VDR)
    │   ├── DESIGN_SYSTEM.md       — VERIFIED Phase 03.5 — authoritative design system (warning-text updated DEC-041)
    │   └── COMPONENT_LIBRARY.md   — UPDATED Governance Remediation — file structure corrected to actual implementation
    ├── modules/                 — Per-module documentation
    │   ├── AUTH.md              — VERIFIED (Phase 02)
    │   ├── USERS_PERMISSIONS.md — VERIFIED (Phase 02)
    │   ├── SKATES.md            — VERIFIED (Phase 03 — updated pre-implementation 2026-09-10)
    │   └── sales.md             — PLANNED (Phase 11)
    ├── phases/                  — Phase plans
    │   ├── PHASE_02_AUTHENTICATION_AND_PERMISSIONS.md — VERIFIED (full spec, Phase 02 Final Gate)
    │   ├── PHASE_03_SKATES_MODULE.md — VERIFIED (full spec written 2026-09-10)
    │   ├── PHASE_035_UI_DESIGN_SYSTEM.md — COMPLETE ✅ (updated Governance Remediation 2026-09-14)
    │   └── PHASE_04_CUSTOMERS_MODULE.md — COMPLETE ✅ (full spec + DoD reconciled 2026-09-15)
    ├── quality/                 — QA strategy and test matrix (VERIFIED)
    ├── decisions/               — Decision log (70 decisions through DEC-070)
    ├── product/                 — Master Business Spec copy (VERIFIED)
    ├── PROJECT_MAP.md           — THIS FILE (v2.0)
    ├── PROJECT_STATE.md         — Current project status (v5.0 — Phase 13 IN PROGRESS)
    ├── CHANGELOG.md             — Change history (updated through Phase 04)
    ├── RELEASE_HISTORY.md       — Release history
    └── INITIAL_PROJECT_AUDIT.md — Initial audit report
├── apps/                        — Applications
│   ├── web/                     — Frontend (VERIFIED — Phase 04 COMPLETE)
│   │   ├── index.html             — VERIFIED (lang=ar dir=rtl, Cairo font)
│   │   ├── .env.example           — VERIFIED
│   │   ├── package.json           — VERIFIED (react-router-dom, lucide-react added)
│   │   ├── vite.config.ts         — VERIFIED
│   │   ├── tsconfig.json          — VERIFIED
│   │   └── src/
│   │       ├── main.tsx             — VERIFIED (Phase 03.5: StrictMode → ErrorBoundary → BrowserRouter → AuthProvider → ToastProvider → App)
│   │       ├── App.tsx              — VERIFIED (Phase 03.5: full RTL app shell with Sidebar + Topbar; Sidebar=right-anchored; collapse+mobile drawer; Lucide icons; all routes)
│   │       ├── styles/
│   │       │   ├── design-system.css — VERIFIED (Phase 03.5: full token system; warning-text updated DEC-041)
│   │       │   └── index.css         — VERIFIED (global RTL reset; gray token aliases fixed SYS-001)
│   │       ├── services/
│   │       │   └── api.ts            — VERIFIED (auth-aware: Bearer injection + 401 retry)
│   │       ├── contexts/
│   │       │   └── AuthContext.tsx   — VERIFIED (Phase 02: in-memory token, silent refresh)
│   │       ├── hooks/
│   │       │   └── usePermission.ts  — VERIFIED (Phase 02)
│   │       ├── utils/
│   │       │   └── currency.ts       — VERIFIED (Phase 03.5: formatCurrency() — EGP / ج.م standard, DEC-042)
│   │       ├── components/
│   │       │   ├── ProtectedRoute.tsx — VERIFIED (Phase 02)
│   │       │   ├── PermissionGate.tsx — VERIFIED (Phase 02)
│   │       │   └── ui/                — VERIFIED (Phase 03.5 — 16 shared components)
│   │       │       ├── Button.tsx        — VERIFIED
│   │       │       ├── FormFields.tsx    — VERIFIED (Input, Select, Textarea, CheckboxField)
│   │       │       ├── Modal.tsx         — VERIFIED (with exit animation AN-005)
│   │       │       ├── Badge.tsx         — VERIFIED (DEC-043 semantic status API; active/inactive added DEC-058)
│   │       │       ├── Card.tsx          — VERIFIED
│   │       │       ├── DataTable.tsx     — VERIFIED
│   │       │       ├── SearchBar.tsx     — VERIFIED
│   │       │       ├── EmptyState.tsx    — VERIFIED
│   │       │       ├── Loading.tsx       — VERIFIED (LoadingSpinner, LoadingSkeleton, PageLoader)
│   │       │       ├── Toast.tsx         — VERIFIED (ToastProvider + useToast hook)
│   │       │       ├── ConfirmDialog.tsx — VERIFIED
│   │       │       ├── Alert.tsx         — VERIFIED (dismiss touch target 44px SYS-017)
│   │       │       ├── Icon.tsx          — VERIFIED
│   │       │       ├── Pagination.tsx    — VERIFIED
│   │       │       ├── IconButton.tsx    — VERIFIED (Phase 04 SYS-002 — icon-only action button)
│   │       │       ├── ErrorBoundary.tsx — VERIFIED (SYS-003)
│   │       │       └── index.ts          — VERIFIED (barrel export — 17 components)
│   │       └── modules/
│   │           ├── auth/
│   │           │   ├── auth.types.ts  — VERIFIED (Phase 02)
│   │           │   ├── auth.service.ts — VERIFIED (Phase 02)
│   │           │   └── LoginPage.tsx  — VERIFIED (Phase 03.5: split-screen desktop + shared components)
│   │           ├── users/
│   │           │   ├── users.service.ts — VERIFIED (Users Remediation: activate, changePassword added DEC-048/DEC-049)
│   │           │   ├── UsersPage.tsx    — VERIFIED (Users Remediation: Activate button + Change Password modal added)
│   │           │   └── RolesPage.tsx    — VERIFIED (Phase 03.5: migrated to design system)
│   │           ├── skates/
│   │           │   ├── skates.service.ts — VERIFIED (Phase 03)
│   │           │   └── SkatesPage.tsx    — VERIFIED (Phase 03.5: migrated to Card + design system + CheckboxField)
│   │           ├── customers/
│   │           │   ├── customers.service.ts — VERIFIED (Phase 04)
│   │           │   ├── CustomersPage.tsx    — VERIFIED (Phase 04 — list, search, filter, create/edit modals, deactivate)
│   │           │   └── CustomerProfilePage.tsx — VERIFIED (Phase 04 — profile, full NID, edit/deactivate/activate)
│   │           ├── rentals/              — [PHASE 05 — VERIFIED ✅]
│   │           │   ├── rentals.service.ts   — VERIFIED (Phase 05 — API layer: list, getActive, getById, create, calculatePrice, getConfig, getCustomerRentals)
│   │           │   ├── RentalPOSPage.tsx    — VERIFIED (Phase 05 — multi-step POS; config from server; no hardcoded fallback; error/retry state)
│   │           │   └── ActiveRentalsPage.tsx — VERIFIED (Phase 05 — active rentals with operational status badges)
│   │           ├── products/             — [PHASE 11]
│   │           │   └── ProductsPage.tsx  — PLANNED (Phase 11)
│   │           └── sales/                — [PHASE 11]
│   │               ├── SalesPOSPage.tsx  — PLANNED (Phase 11)
│   │               └── SalesHistoryPage.tsx — PLANNED (Phase 11)
│   └── api/                     — Backend (VERIFIED — Phase 03 COMPLETE)
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
│           │   ├── seed.ts          — VERIFIED (Phase 04: 42 permissions including customers.deactivate; idempotent)
│           │   ├── migrations/
│           │   │   ├── 0000_cloudy_the_renegades.sql — VERIFIED (6 tables: users/roles/perms/user_roles/role_perms/refresh_tokens)
│           │   │   ├── 0001_*.sql                   — VERIFIED (Phase 03: skates table)
│           │   │   ├── 0002_customers.sql           — VERIFIED (Phase 04: customers table)
│           │   │   ├── 0003_settings.sql            — VERIFIED (Phase 05: settings table — rental_hourly_rate 120 EGP + rental_duration_options [15,30,45,60,90])
│           │   │   └── 0004_rentals.sql             — VERIFIED (Phase 05: rentals table — all columns, FK constraints, UNIQUE rental_code, 6 performance indexes)
│           │   └── schema/
│           │       ├── index.ts     — VERIFIED (exports all tables incl. customers)
│           │       ├── users.ts     — VERIFIED (Phase 02: users, roles, perms, join tables)
│           │       ├── auth.ts      — VERIFIED (Phase 02: refresh_tokens)
│           │       └── customers.ts — VERIFIED (Phase 04: customers table schema)
│           ├── tests/
│           │   ├── setup.ts         — VERIFIED (Phase 02 Final Gate)
│           │   ├── auth.test.ts     — VERIFIED (Phase 04: permission count updated to 42)
│           │   ├── roles.test.ts    — VERIFIED (Phase 02 RBAC Remediation: 15 tests, 15 PASS)
│           │   ├── users.test.ts    — VERIFIED (Users Remediation: 19 tests — activation + password + RBAC)
│           │   ├── customers.test.ts — VERIFIED (Phase 04: 28 tests — CRUD + validation + RBAC)
│           │   └── rentals.test.ts  — VERIFIED (Phase 05: 74 tests — TC-RENT-01..31 + 13a/b/c + RBAC + VAL + CFG + unit — 170/170 system PASS)
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
│               │   ├── users.service.ts — VERIFIED (Users Remediation: activateUser(), changeUserPassword() DEC-048/DEC-049)
│               │   ├── users.routes.ts  — VERIFIED (Users Remediation: POST /:id/activate + POST /:id/change-password)
│               │   ├── roles.service.ts — VERIFIED (Phase 02)
│               │   └── roles.routes.ts  — VERIFIED (Phase 02)
│               ├── skates/              — [PHASE 03 — VERIFIED ✅]
│               │   ├── skates.types.ts  — VERIFIED (Phase 03)
│               │   ├── skates.service.ts — VERIFIED (Phase 03)
│               │   └── skates.routes.ts  — VERIFIED (Phase 03)
│               ├── customers/       — [PHASE 04 — VERIFIED ✅]
│               │   ├── customers.types.ts  — VERIFIED (Phase 04)
│               │   ├── customers.service.ts — VERIFIED (Phase 04)
│               │   └── customers.routes.ts  — VERIFIED (Phase 04)
│               ├── rentals/         — [PHASE 05 — VERIFIED ✅]
│               │   ├── rentals.types.ts  — VERIFIED (Phase 05)
│               │   ├── rentals.service.ts — VERIFIED (Phase 05: 7 functions incl. startRental, getRentalConfig, computeOperationalStatus)
│               │   └── rentals.routes.ts  — VERIFIED (Phase 05: 7 endpoints)
│               ├── products/        — [PHASE 11]
│               │   ├── products.types.ts — PLANNED (Phase 11)
│               │   ├── products.service.ts — PLANNED (Phase 11)
│               │   └── products.routes.ts  — PLANNED (Phase 11)
│               └── sales/           — [PHASE 11]
│                   ├── sales.types.ts — PLANNED (Phase 11)
│                   ├── sales.service.ts — PLANNED (Phase 11)
│                   └── sales.routes.ts  — PLANNED (Phase 11)
├── tests/                       — Integration tests (top-level placeholder; actual tests in apps/api/src/tests/)
├── scripts/                     — PLACEHOLDER
├── KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md  — VERIFIED (source document)
└── Skate_Rental_ERP_Master_Business_Product_Specification.md  — VERIFIED (source document)

> [!NOTE]
> The App Shell (Sidebar and Topbar) is implemented as internal functions within `App.tsx`.
> There is NO `components/layout/` directory. See `function Sidebar()` (~line 97) and
> `function Topbar()` (~line 701) inside `apps/web/src/App.tsx`.

Verified web modules (Phase 03.5 COMPLETE):

```
apps/web/src/
├── components/
│   ├── ProtectedRoute.tsx  — VERIFIED (Phase 02)
│   ├── PermissionGate.tsx  — VERIFIED (Phase 02)
│   └── ui/                 — VERIFIED (Phase 03.5 — all 16 components implemented)
│       ├── Button.tsx        — VERIFIED
│       ├── FormFields.tsx    — VERIFIED (Input, Select, Textarea, CheckboxField)
│       ├── Modal.tsx         — VERIFIED
│       ├── Badge.tsx         — VERIFIED (DEC-043: semantic status API)
│       ├── Card.tsx          — VERIFIED
│       ├── DataTable.tsx     — VERIFIED
│       ├── SearchBar.tsx     — VERIFIED
│       ├── EmptyState.tsx    — VERIFIED
│       ├── Loading.tsx       — VERIFIED (LoadingSpinner + LoadingSkeleton + PageLoader)
│       ├── Toast.tsx         — VERIFIED (ToastProvider + useToast — single file)
│       ├── ConfirmDialog.tsx — VERIFIED
│       ├── Alert.tsx         — VERIFIED
│       ├── Icon.tsx          — VERIFIED
│       ├── Pagination.tsx    — VERIFIED
│       ├── ErrorBoundary.tsx — VERIFIED (SYS-003)
│       └── index.ts          — VERIFIED (barrel export)
├── utils/
│   └── currency.ts         — VERIFIED (formatCurrency() — EGP/ج.م standard, DEC-042)
└── modules/
    ├── auth/               — VERIFIED (Phase 02 + 03.5 redesign)
    ├── users/              — VERIFIED (Phase 02 + 03.5 migration)
    ├── skates/             — VERIFIED (Phase 03 + 03.5 migration)
    ├── customers/          — VERIFIED (Phase 04 — COMPLETE ✅)
    ├── rentals/            — VERIFIED (Phase 05 — COMPLETE ✅)
    ├── products/           — PLANNED (Phase 11)
    └── sales/              — PLANNED (Phase 11)
```

Verified API migrations:
```
apps/api/src/db/migrations/
├── 0000_cloudy_the_renegades.sql — VERIFIED (Phase 02: 6 tables — users, roles, permissions, user_roles, role_permissions, refresh_tokens)
├── 0001_*.sql                   — VERIFIED (Phase 03: skates table)
├── 0002_customers.sql           — VERIFIED (Phase 04: customers table + national_id UNIQUE index)
├── 0003_settings.sql            — VERIFIED (Phase 05: settings table — rental_hourly_rate 120 EGP + rental_duration_options [15,30,45,60,90])
└── 0004_rentals.sql             — VERIFIED (Phase 05: rentals table — all columns, FK constraints, UNIQUE rental_code, 6 performance indexes)
```

---

## Module Navigation Map

For each module: where to find code, documentation, database tables, and API routes.

---

### MODULE: AUTH

| Area | Path | Status |
|---|---|---|
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
|---|---|---|
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
| Frontend | `apps/web/src/modules/skates/` | VERIFIED (Phase 03 + 03.5 migration) |
| Backend | `apps/api/src/modules/skates/` | VERIFIED (Phase 03) |
| Database tables | `skates` | VERIFIED (Phase 03) |
| API routes | `GET /api/v1/skates`, `POST /api/v1/skates`, `GET /api/v1/skates/available`, `GET /api/v1/skates/:id`, `PUT /api/v1/skates/:id`, `GET /api/v1/skates/:id/history` | VERIFIED (Phase 03) |
| Documentation | `docs/modules/SKATES.md` | VERIFIED (Phase 03) |
| Tests | `apps/api/src/tests/skates.test.ts` | VERIFIED (Phase 03 — 16/16 PASS) |

**Dependencies:** AUTH, USERS_PERMISSIONS
**Key risks:**
- Status transitions must be atomic; `rented`/`reserved` blocked from admin API (DEC-031)
- `skate_code` uniqueness enforced — concurrent creation could race; DB UNIQUE constraint is the safety net
- `GET /api/v1/skates/available` must be registered before `GET /api/v1/skates/:id` in the router
- DEC-007 enforcement (maintenance→available requires completed record) deferred to Phase 09 (TD-002)
**Approved decisions:** DEC-030, DEC-031, DEC-032, DEC-033
**Resolved implementation details:** IMPL-001 (skate_code SK-NNN, DEC-030), IMPL-002 (QR = skate_code, DEC-032), IMPL-003 (barcode = skate_code, DEC-032), IMPL-004 (free-text type, DEC-033)

---

### MODULE: CUSTOMERS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/customers/` | VERIFIED (Phase 04) |
| Backend | `apps/api/src/modules/customers/` | VERIFIED (Phase 04) |
| Database tables | `customers` | VERIFIED (Phase 04 — migration `0002_customers.sql`) |
| API routes | `GET /api/v1/customers`, `POST /api/v1/customers`, `GET /api/v1/customers/:id`, `PUT /api/v1/customers/:id`, `POST /api/v1/customers/:id/deactivate`, `POST /api/v1/customers/:id/activate` | VERIFIED (Phase 04) |
| Documentation | `docs/modules/CUSTOMERS.md` | VERIFIED (Phase 04) |
| Tests | `apps/api/src/tests/customers.test.ts` | VERIFIED (Phase 04 — 28/28 PASS) |

**Dependencies:** AUTH, USERS_PERMISSIONS
**Key risks:** National ID is PII — access logging deferred to Phase 16 (Audit Log)
**Approved decisions:** DEC-051 through DEC-059

---

### MODULE: RENTALS

| Area | Path | Status |
|---|---|---|
| Frontend | `apps/web/src/modules/rentals/` | VERIFIED ✅ (Phase 05 — FINAL GATE PASSED) |
| Backend | `apps/api/src/modules/rentals/` | VERIFIED ✅ (Phase 05 — FINAL GATE PASSED) |
| Database tables | `rentals` (Phase 05), `settings` (Phase 05 pricing/duration config) | VERIFIED ✅ |
| API routes | `GET /api/v1/rentals/active`, `GET /api/v1/rentals/config`, `GET /api/v1/rentals/calculate-price`, `GET /api/v1/rentals`, `POST /api/v1/rentals`, `GET /api/v1/rentals/:id`, `GET /api/v1/customers/:id/rentals` | VERIFIED ✅ (Phase 05) |
| Documentation | `docs/modules/RENTALS.md` | VERIFIED ✅ (Phase 05 — FINAL GATE PASSED) |
| Tests | `apps/api/src/tests/rentals.test.ts` | VERIFIED ✅ (Phase 05 — 170/170 PASS, 74 rental tests) |

**Dependencies:** AUTH, SKATES, CUSTOMERS  
**Phase 05 scope (implemented):** Rental POS (create), Active Rental monitoring (operational status), Rental history/detail, settings-backed pricing, settings-backed duration config, config error handling, DEC-070 insertId Rental Code generation, FOR UPDATE concurrency protection  
**Phase 06+ scope (deferred):** payment recording (Phase 06), return workflow (Phase 07), late fee calculation (Phase 07)  
**Key risks:**
- Concurrent rental of same skate: handled by `SELECT ... FOR UPDATE` inside atomic transaction (DEC-070)
- Rental price stored historically (snapshot at creation — DEC-065, DEC-067)
- Duration options come from settings table — no hardcoded fallback (DEC-069, DEC-070)
**Approved decisions:** DEC-060 through DEC-070

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
| Frontend | `apps/web/src/modules/reservations/` | PLANNED (Phase 10) |
| Backend | `apps/api/src/modules/reservations/` | PLANNED (Phase 10) |
| Database tables | `reservations` | PLANNED (Phase 10) |
| API routes | `POST /api/v1/reservations`, `GET /api/v1/reservations` | PLANNED (Phase 10) |
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

*Last updated: 2026-09-21 (Phase 05 Closure Gate — FINAL GATE PASSED ✅. Rentals module VERIFIED. Rentals files added to file tree. Migrations 0003_settings.sql and 0004_rentals.sql added. Decisions count updated to 70 (DEC-060 through DEC-070). IMPORTANT alert updated: Phase 06 is next.)*
