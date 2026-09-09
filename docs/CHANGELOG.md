# Changelog — KOSHK SKATE ERP

**Format:** Meaningful changes only. Not every trivial edit.

---

## [Unreleased]

---

## [0.3.1] — 2026-09-09 (Phase 02 Final Gate Verification & Reconciliation)

### Fixed
- **`apps/api/src/modules/auth/auth.service.ts`** — Added `jti` (UUID) to refresh token JWT payload; prevents `ER_DUP_ENTRY` when same user logs in multiple times within the same second (duplicate token hash collision)
- **`apps/api/src/db/seed.ts`** — Removed non-existent `payments.view` from Cashier `permissionKeys` (that key is not in Phase 02 permission set; it was silently filtered but left misleading); fixed comment from "39 keys" to "40 keys"

### Added
- **`apps/api/src/app.ts`** — App factory module (extracted from `index.ts`): configures Express, middleware, and routes without starting the HTTP listener. Required for test isolation.
- **`apps/api/src/tests/auth.test.ts`** — 14 integration test cases, 18 assertions: login success/failure, GET /me, refresh rotation, logout revocation, 401 (unauth), 403 (permission denied), deactivated user. All 18 PASS.
- **`apps/api/src/tests/setup.ts`** — Test setup file
- **`apps/api/vitest.config.ts`** — Vitest configuration (30s timeout, serial execution, dotenv)
- **`apps/api/src/modules/auth/auth.types.ts`** — Added `jti?` field to `TokenPayload`

### Modified
- **`apps/api/src/index.ts`** — Refactored to import app from `app.ts`; now only handles DB connection test + HTTP listener startup
- **`apps/api/package.json`** — Added `test` and `test:watch` scripts; added `dotenv-cli`, `cross-env`, `supertest`, `vitest` dev dependencies
- **`docs/phases/PHASE_02_AUTHENTICATION_AND_PERMISSIONS.md`** — Completely rewritten from stub to full spec: scope, all 14 API routes, DB schema, 40 permission keys table, full test matrix (14 TCs), DoD checklist, known risks
- **`docs/PROJECT_MAP.md`** — All Phase 02 files and modules updated from PLANNED → VERIFIED
- **`docs/PROJECT_STATE.md`** — Final Gate results: tests, builds, verification timestamp

### Verified (Final Gate)
- `npm test` → **18/18 PASS** (zero failures)
- `npm run build` (api) → **zero TypeScript errors**
- `npm run build` (web) → **zero TypeScript errors**
- Browser: login, protected routes, users page, roles page, logout — **all pass**
- Security: duplicate hash bug fixed, rotation enforced, revocation confirmed

---

## [0.3.0] — 2026-09-09 (Phase 02 — Authentication & Permissions)

### Added — Backend
- **`apps/api/src/db/schema/users.ts`** — Drizzle schema: `users`, `roles`, `permissions`, `user_roles`, `role_permissions` tables
- **`apps/api/src/db/schema/auth.ts`** — Drizzle schema: `refresh_tokens` table (single-use rotation, SHA-256 hash stored — DEC-025)
- **`apps/api/src/db/migrations/0000_*.sql`** — Migration 001: 6 tables created in `koshk_skate` DB
- **`apps/api/src/db/seed.ts`** — Idempotent seed: 40 permission keys, 3 system roles, default admin user (DEC-026)
- **`apps/api/src/modules/auth/auth.types.ts`** — Auth TypeScript types
- **`apps/api/src/modules/auth/auth.service.ts`** — login, refresh (with rotation), logout, verifyAccessToken, loadUserWithPermissions
- **`apps/api/src/modules/auth/auth.routes.ts`** — POST /login, POST /refresh, POST /logout, GET /me with HttpOnly cookie handling (DEC-025)
- **`apps/api/src/modules/users/users.types.ts`** — User/Role/Permission DTO types
- **`apps/api/src/modules/users/users.service.ts`** — User CRUD with bcrypt + soft deactivation
- **`apps/api/src/modules/users/users.routes.ts`** — GET/POST/PATCH/DELETE /users (permission-gated)
- **`apps/api/src/modules/users/roles.service.ts`** — Role CRUD + permission assignment (system roles protected)
- **`apps/api/src/modules/users/roles.routes.ts`** — GET/POST/PATCH/DELETE /roles + PUT /roles/:id/permissions
- **`apps/api/src/middleware/auth.ts`** — `authenticate()` — JWT Bearer token verification, req.user injection
- **`apps/api/src/middleware/permission.ts`** — `requirePermission(key)` — RBAC server-side enforcement, returns 403
- **`apps/api/src/middleware/rateLimiter.ts`** — `loginLimiter` — 10 req/min/IP (DEC-027), in-memory

### Added — Frontend
- **`apps/web/src/modules/auth/`** — auth.types.ts, auth.service.ts (login/refresh/logout/me API calls)
- **`apps/web/src/modules/auth/LoginPage.tsx`** — Arabic RTL login page, KOSHK SKATE design, loading state, Arabic error messages
- **`apps/web/src/modules/users/users.service.ts`** — Users/Roles API client wrappers
- **`apps/web/src/modules/users/UsersPage.tsx`** — User list + create modal + deactivate
- **`apps/web/src/modules/users/RolesPage.tsx`** — Role cards with permissions
- **`apps/web/src/contexts/AuthContext.tsx`** — In-memory token storage, silent refresh on mount, login/logout
- **`apps/web/src/hooks/usePermission.ts`** — `usePermission(key): boolean`
- **`apps/web/src/components/ProtectedRoute.tsx`** — Redirect to /login if not authenticated
- **`apps/web/src/components/PermissionGate.tsx`** — Render children only if user has permission

### Modified
- **`apps/api/src/index.ts`** — Added cookie-parser, mounted auth/users/roles routes, CORS credentials:true
- **`apps/api/src/config/env.ts`** — Added JWT_REFRESH_SECRET, token expiry vars, seed vars, production secret enforcement
- **`apps/api/src/utils/errors.ts`** — Added UnauthorizedError class
- **`apps/api/src/db/schema/index.ts`** — Exports Phase 02 tables
- **`apps/api/drizzle.config.ts`** — Schema array for drizzle-kit compatibility
- **`apps/api/package.json`** — Added db:seed script
- **`apps/api/.env.example`** — Added JWT_REFRESH_SECRET, token expiry, CORS, seed credential vars
- **`apps/web/src/main.tsx`** — Wrapped with BrowserRouter + AuthProvider
- **`apps/web/src/App.tsx`** — Full routing: /login (public) + protected app shell with NavLink sidebar
- **`apps/web/src/services/api.ts`** — Bearer token injection, 401 silent refresh retry, credentials:include

### Decisions Recorded
- DEC-025: Refresh token stored as HttpOnly cookie
- DEC-026: Seed admin credentials via env vars, idempotent
- DEC-027: In-memory rate limiter, 10 req/min/IP
- DEC-028: Separate JWT_SECRET / JWT_REFRESH_SECRET
- DEC-029: Password reset out of scope for Phase 02

### Dependencies Added
- Backend: `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `cookie-parser` + type definitions
- Frontend: `react-router-dom`

---

## [0.2.0] — 2026-09-09 (Phase 01 — Foundation & Project Setup)

### Added
- **Frontend scaffold** (`apps/web/`) — Vite + React + TypeScript initialized and building cleanly
- **`apps/web/index.html`** — Updated to `lang="ar" dir="rtl"`, Cairo font loaded via Google Fonts, proper meta description
- **`apps/web/src/styles/design-system.css`** — Complete KOSHK SKATE CSS token system (colors, typography, spacing, shadows, radii, z-index, transitions, layout variables)
- **`apps/web/src/styles/index.css`** — Global RTL reset, Cairo font applied, branded scrollbar, gold focus ring
- **`apps/web/src/App.tsx`** — Application shell (navy sidebar RTL-anchored + topbar + content area using design system tokens)
- **`apps/web/src/services/api.ts`** — Typed fetch-based API client base
- **`apps/web/.env.example`** — Frontend environment variable template
- **Backend scaffold** (`apps/api/`) — Express + TypeScript with dev/build scripts
- **`apps/api/src/index.ts`** — Express entry, CORS, JSON parsing, Morgan, `GET /api/v1/health`, 404 handler, global error handler
- **`apps/api/src/config/env.ts`** — Centralized environment config (no direct `process.env` access elsewhere)
- **`apps/api/src/middleware/errorHandler.ts`** — Global structured JSON error handler with dev/prod stack trace control
- **`apps/api/src/utils/errors.ts`** — 8 typed error classes (AppError, ValidationError, AuthenticationError, ForbiddenError, NotFoundError, ConflictError, BusinessRuleError, InternalError)
- **`apps/api/src/utils/financial.ts`** — Financial utilities (calculateLateFee, calculateExpectedEndTime, roundCurrency, formatCurrency)
- **`apps/api/src/db/connection.ts`** — Drizzle ORM + mysql2 pool with `testConnection()` (DEC-022)
- **`apps/api/src/db/schema/index.ts`** — Empty Drizzle schema anchor
- **`apps/api/drizzle.config.ts`** — Drizzle Kit config for migrations
- **`apps/api/.env.example`** — Backend environment variable template
- **`.gitignore`** (root) — Comprehensive exclusion rules covering both apps
- **`README.md`** (root) — Arabic README with tech stack, structure, and local setup

### Decisions Made
- **DEC-022** — ORM: Drizzle ORM with mysql2 driver (project owner approved)
- **DEC-023** — Arabic font: Cairo (Google Fonts) (project owner approved)

### Technical
- Frontend builds: ✅ zero TypeScript errors
- Backend: TypeScript strict mode, CommonJS output for Node.js/Hostinger compatibility
- Database: utf8mb4 charset enforced for Arabic text
- All monetary calculations use integer arithmetic (no floating-point)
- RTL enforced at HTML root level (`<html lang="ar" dir="rtl">`)

---

## [0.1.1] — 2026-09-09 (Documentation Reconciliation)

### Changed
- `docs/PROJECT_STATE.md` — Corrected Git remote from NONE to GitHub (`https://github.com/mohamedalihassanwork-cpu/Skate-system`); corrected branch from `main` to `master`; updated technology decisions to reflect approved stack; resolved UNK-001 and UNK-002
- `docs/PROJECT_MAP.md` — Added approved technology reference table; corrected `.js` paths to `.ts`; updated governance file tree
- `docs/decisions/DECISION_LOG.md` — Marked DEC-014 as SUPERSEDED; added DEC-019 (React+Vite+TypeScript), DEC-020 (Node.js+Express+TypeScript), DEC-021 (GitHub)
- `docs/architecture/TECHNICAL_ARCHITECTURE.md` — Updated tech stack from UNKNOWN/candidates to approved decisions; updated summary table
- `docs/architecture/FRONTEND_ARCHITECTURE.md` — Updated framework from candidates to approved React+Vite+TypeScript; updated state management to React options
- `docs/architecture/BACKEND_ARCHITECTURE.md` — Updated framework from candidates to approved Node.js+Express+TypeScript; updated all file paths from `.js` to `.ts`
- `docs/architecture/DEPLOYMENT_ARCHITECTURE.md` — Added GitHub repository URL; corrected branch from `main` to `master`

### Added
- `docs/00-governance/AI_AGENT_WORKFLOW_AR.md` — New: Arabic operating guide for project owner (workflow, templates, governance rules in Arabic)

### Notes
- No application code was added or modified in this release.
- This is a documentation reconciliation only.
- Frontend and backend framework decisions are now APPROVED (DEC-019, DEC-020).
- ORM, authentication mechanism, and notification delivery remain PENDING.

---

## [0.1.0] — 2026-09-09

### Added
- Repository initialized with Git
- Master Business & Product Specification (`Skate_Rental_ERP_Master_Business_Product_Specification.md`)
- Visual Design Reference (`KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`)
- Complete governance documentation:
  - `docs/00-governance/AI_AGENT_RULES.md`
  - `docs/00-governance/SOURCE_OF_TRUTH.md`
  - `docs/00-governance/DEFINITION_OF_DONE.md`
  - `docs/00-governance/CHANGE_REQUEST_PROCESS.md`
  - `docs/00-governance/DOCUMENTATION_RULES.md`
- Complete architecture documentation (target/planned):
  - `docs/architecture/TECHNICAL_ARCHITECTURE.md`
  - `docs/architecture/DATABASE_ARCHITECTURE.md`
  - `docs/architecture/API_ARCHITECTURE.md`
  - `docs/architecture/FRONTEND_ARCHITECTURE.md`
  - `docs/architecture/BACKEND_ARCHITECTURE.md`
  - `docs/architecture/SECURITY_ARCHITECTURE.md`
  - `docs/architecture/DEPLOYMENT_ARCHITECTURE.md`
- Project navigation system:
  - `docs/PROJECT_MAP.md`
  - `docs/PROJECT_STATE.md`
- Decision log with 18 initial decisions (`docs/decisions/DECISION_LOG.md`)
- Module documentation stubs for all 21 modules (`docs/modules/`)
- Quality documentation:
  - `docs/quality/QA_STRATEGY.md`
  - `docs/quality/TEST_MATRIX.md` (62 test cases defined)
  - `docs/quality/VERIFICATION_RULES.md`
  - `docs/quality/REGRESSION_STRATEGY.md`
- Initial project audit (`docs/INITIAL_PROJECT_AUDIT.md`)

### Notes
- This is the documentation and governance initialization only.
- No application code exists.
- Technology stack decisions were recorded as pending at this stage (see DEC-014, now SUPERSEDED by DEC-019/020).

---

*Future entries will appear above as implementation progresses.*
