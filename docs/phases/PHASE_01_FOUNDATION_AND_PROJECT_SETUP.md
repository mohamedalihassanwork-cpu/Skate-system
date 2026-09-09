# Phase 01 — Foundation & Project Setup

**Status:** IN PROGRESS  
**Started:** 2026-09-09  
**Last updated:** 2026-09-09

---

## Objective

Initialize the full project scaffold: repository structure, frontend boilerplate with KOSHK SKATE design system (Cairo font, navy/gold tokens, RTL), backend boilerplate (Express + TypeScript), Drizzle ORM database connection, and all supporting utilities.

This phase produces no user-facing business features — it is purely infrastructure.

---

## Dependencies Resolved

| Decision | Resolution | Reference |
|---|---|---|
| ORM / DB Driver | Drizzle ORM + mysql2 | DEC-022 |
| Arabic Font | Cairo (Google Fonts) | DEC-023 |
| Frontend stack | React + Vite + TypeScript | DEC-019 |
| Backend stack | Node.js + Express + TypeScript | DEC-020 |
| Database | MySQL / MariaDB InnoDB utf8mb4 | DEC-015 |

---

## Scope

### 1A — Repository Structure
- `apps/web/` — Frontend (Vite + React + TypeScript)
- `apps/api/` — Backend (Express + TypeScript)
- `tests/` — Test suites placeholder
- `scripts/` — Utility scripts placeholder
- Root `.gitignore`, `README.md`

### 1B — Frontend Boilerplate
- Vite + React + TypeScript scaffold
- `index.html` — `lang="ar" dir="rtl"`, Cairo loaded via Google Fonts
- `src/styles/design-system.css` — All CSS tokens (colors, typography, spacing, shadows, radii, layout, z-index, transitions)
- `src/styles/index.css` — Global reset, RTL body styles, branded scrollbar, gold focus ring
- `src/App.tsx` — Application shell (sidebar + topbar + content area, design tokens only)
- `src/services/api.ts` — Typed fetch-based API client base
- `.env.example` — `VITE_API_BASE_URL`

### 1C — Backend Boilerplate
- Express + TypeScript with dev (tsx watch) + build scripts
- `src/index.ts` — Express app, CORS, JSON parsing, Morgan, health check, 404 handler, error handler
- `src/config/env.ts` — Centralized environment config
- `src/middleware/errorHandler.ts` — Global structured JSON error handler
- `src/utils/errors.ts` — Custom error classes (AppError, ValidationError, AuthenticationError, ForbiddenError, NotFoundError, ConflictError, BusinessRuleError, InternalError)
- `src/utils/financial.ts` — Financial utilities (calculateLateFee, calculateExpectedEndTime, roundCurrency, formatCurrency)
- `.env.example` — All required variables

### 1D — Drizzle ORM
- `src/db/connection.ts` — mysql2 pool + Drizzle instance + `testConnection()`
- `src/db/schema/index.ts` — Empty schema anchor (Phase 02+ will add tables)
- `drizzle.config.ts` — Migration config pointing to `src/db/migrations/`

### 1E — Documentation
- `docs/phases/PHASE_01_FOUNDATION_AND_PROJECT_SETUP.md` — This file (expanded)
- `docs/PROJECT_STATE.md` — Phase status updated
- `docs/PROJECT_MAP.md` — Verified paths added
- `docs/CHANGELOG.md` — Entry added
- `docs/decisions/DECISION_LOG.md` — DEC-022, DEC-023 added
- `docs/architecture/TECHNICAL_ARCHITECTURE.md` — ORM and font updated

---

## OUT OF SCOPE

| Not in Phase 01 | Phase |
|---|---|
| Login / Auth / JWT | Phase 02 |
| Users, Roles, Permissions | Phase 02 |
| All business modules | Phase 03+ |
| Real database tables | Phase 02+ |
| Payments, Treasury | Phase 06 |
| Notifications | Phase 15 |
| Deployment | Phase 18 |

---

## Business Requirements

No business requirements for this phase. This is infrastructure only.

Reference: `Skate_Rental_ERP_Master_Business_Product_Specification.md`

---

## Technical Requirements

- Frontend must build without TypeScript errors
- Backend must compile and start without errors
- Database connection must succeed on startup
- Health check must return `200 { status: "ok" }`
- `<html lang="ar" dir="rtl">` enforced
- Cairo font loaded and visible in browser
- All secrets via `.env` (no hardcoded values)
- CSS design tokens defined in `:root`

---

## UI Requirements

- KOSHK SKATE design system: navy `#192744`, gold `#F3B735`, white, cool-gray
- Cairo font (DEC-023)
- RTL layout throughout

Reference: `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`

---

## Database Impact

- No tables created in Phase 01
- Connection pool verified
- Migration system configured and ready
- `src/db/schema/index.ts` anchor file created

---

## API Impact

- `GET /api/v1/health` → `{ success: true, status: "ok", ... }`
- `GET /api/v1/` → phase info
- All other routes → 404 JSON

---

## Testing Requirements

Phase 01 has no automated tests. Manual verification only.

Reference: `docs/quality/TEST_MATRIX.md`

---

## Verification Criteria

- [ ] `npm run build` in `apps/web/` passes (zero errors)
- [ ] `npm run build` in `apps/api/` passes (zero errors)
- [ ] `GET /api/v1/health` returns `200 { status: "ok" }`
- [ ] Browser opens frontend — RTL layout visible
- [ ] Cairo font renders (inspect network tab)
- [ ] `<html lang="ar" dir="rtl">` in DevTools
- [ ] CSS `:root` contains `--color-navy-800`, `--color-gold-400`
- [ ] No `.env` file committed (only `.env.example`)
- [ ] Documentation updated
- [ ] One logical Git commit, pushed

---

## Known Risks

- DB connection will fail locally if MySQL is not running — this is expected; the app will log the error and exit. Use `.env` with valid credentials.
- Drizzle Kit requires a database to be reachable for `db:migrate`. Phase 01 only verifies the config is correct; actual migrations start in Phase 02.

---

## Definition of Done

All items in `docs/00-governance/DEFINITION_OF_DONE.md` applicable to infrastructure (Functional, Technical, UI/UX, Documentation, Git) must be satisfied.

Financial and security DoD items are not applicable (no financial code in Phase 01).

---

*Last updated: 2026-09-09 (Phase 01 execution)*

