# Phase 02 — AUTHENTICATION AND PERMISSIONS

**Status:** COMPLETED — FINAL GATE PASSED
**Last updated:** 2026-09-09 (Phase 02 Final Gate Verification)

---

## Objective

Implement login, JWT/session management, RBAC system, and permission enforcement middleware. Provide the default seed data (users, roles, permissions) and the Login UI.

## Dependencies

Phase 01 (Foundation & Project Setup) — must be fully completed.

## Scope

### In Scope
- User authentication: login, logout, access token (JWT Bearer), refresh token (HttpOnly cookie)
- JWT refresh token rotation with single-use enforcement (token hash stored in DB, deleted on use)
- RBAC: roles, permissions, user-role assignment, role-permission assignment
- Server-side permission enforcement middleware (`requirePermission(key)`)
- Rate limiting on login endpoint (in-memory, 10 req/min/IP)
- Seed data: 40 permission keys, 3 system roles, default admin user
- Frontend: login page (Arabic RTL, KOSHK SKATE design), AuthContext, ProtectedRoute, PermissionGate, usePermission
- User management UI (list, create, deactivate)
- Roles & permissions management UI

### Out of Scope (Phase 02)
- Password reset / forgot password (DEC-029)
- Email notifications
- Multi-factor authentication
- Redis-backed rate limiting
- Audit log entries (Phase 16)

## Business Requirements

Reference: `Skate_Rental_ERP_Master_Business_Product_Specification.md`

Key requirements implemented:
- Cashier and Maintenance Staff roles have restricted permission sets
- Administrator has all permissions
- Users can be deactivated (soft delete — DEC-009); deactivated users cannot log in
- System roles (Administrator, Cashier, MaintenanceStaff) cannot be deleted

## Technical Requirements

### Backend
- **Auth:** `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- **Users:** `GET/POST /api/v1/users`, `GET/PATCH/DELETE /api/v1/users/:id`
- **Roles:** `GET/POST /api/v1/roles`, `GET/PATCH/DELETE /api/v1/roles/:id`, `PUT /api/v1/roles/:id/permissions`
- **JWT:** separate `JWT_SECRET` and `JWT_REFRESH_SECRET` (DEC-028)
- **Refresh token:** SHA-256 hash stored in `refresh_tokens` table, with unique `jti` per token (prevents duplicate hash if same user logs in within same second)
- **bcrypt:** 12 rounds minimum

### Database
- 6 tables: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `refresh_tokens`
- Migration: `apps/api/src/db/migrations/0000_cloudy_the_renegades.sql`

### Frontend
- React Router with `/login` (public) and `/*` (protected via `ProtectedRoute`)
- `AuthContext`: in-memory access token, silent refresh on mount
- `setTokenProvider` wired from `AuthContext` to `api.ts` for automatic Bearer injection

## UI Requirements

Reference: `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`

- Arabic RTL login page (navy #192744, gold accent, Cairo font)
- Loading state on login form
- Arabic error messages on login failure

## Database Impact

6 tables added in Migration 001:

| Table | Purpose |
|---|---|
| `users` | System users with bcrypt password hash |
| `roles` | Named roles (system-protected flag) |
| `permissions` | Permission keys (e.g., `rentals.view`) |
| `user_roles` | M:N join — user to roles |
| `role_permissions` | M:N join — role to permissions |
| `refresh_tokens` | Single-use refresh token hashes (SHA-256) |

## API Impact

| Method | Route | Permission Required |
|---|---|---|
| POST | /api/v1/auth/login | None (public) |
| POST | /api/v1/auth/refresh | None (cookie) |
| POST | /api/v1/auth/logout | None (cookie) |
| GET | /api/v1/auth/me | `authenticate` |
| GET | /api/v1/users | `users.view` |
| POST | /api/v1/users | `users.create` |
| PATCH | /api/v1/users/:id | `users.edit` |
| DELETE | /api/v1/users/:id | `users.delete` |
| GET | /api/v1/roles | `roles.view` |
| POST | /api/v1/roles | `roles.create` |
| PATCH | /api/v1/roles/:id | `roles.edit` |
| DELETE | /api/v1/roles/:id | `roles.edit` |
| PUT | /api/v1/roles/:id/permissions | `roles.edit` |

## Testing Requirements

Integration tests: `apps/api/src/tests/auth.test.ts`

| TC | Test Case | Status |
|---|---|---|
| TC-AUTH-01 | Login success — 200, accessToken, 40 permissions, HttpOnly cookie | ✅ PASS |
| TC-AUTH-02 | Login failure — wrong password → 401, generic Arabic message | ✅ PASS |
| TC-AUTH-03 | Login failure — nonexistent email → 401, same message (no info leak) | ✅ PASS |
| TC-AUTH-04 | Login failure — missing fields → 401 (3 sub-cases) | ✅ PASS |
| TC-AUTH-05 | GET /me with valid token → 200, user object | ✅ PASS |
| TC-AUTH-06 | GET /me without token → 401 | ✅ PASS |
| TC-AUTH-07 | GET /me with malformed token → 401 (2 sub-cases) | ✅ PASS |
| TC-AUTH-08 | Refresh rotation — new token issued, old token rejected | ✅ PASS |
| TC-AUTH-09 | Logout — refresh token revoked in DB | ✅ PASS |
| TC-AUTH-10 | Refresh with no cookie → 401 | ✅ PASS |
| TC-AUTH-11 | Permission enforcement — admin accesses users + roles → 200 | ✅ PASS |
| TC-AUTH-12 | Permission enforcement — user with no roles → 403 | ✅ PASS |
| TC-AUTH-13 | Rate limiter — skipped in test mode (structural verification) | ✅ PASS |
| TC-AUTH-14 | Deactivated user login → 401 with Arabic deactivation message | ✅ PASS |

**Total: 18 assertions — 18 PASS, 0 FAIL**

Run: `npm test` in `apps/api`

## Permission Keys (40 total)

| Module | Keys |
|---|---|
| rentals | rentals.view, rentals.create, rentals.return |
| waivers | waivers.approve |
| damage | damage.view, damage.create, damage.waive |
| maintenance | maintenance.view, maintenance.create, maintenance.edit, maintenance.complete |
| customers | customers.view, customers.create, customers.edit |
| skates | skates.view, skates.create, skates.edit |
| expenses | expenses.view, expenses.create |
| treasury | treasury.view, treasury.manage |
| reports | reports.view |
| users | users.view, users.create, users.edit, users.delete |
| roles | roles.view, roles.create, roles.edit |
| shifts | shifts.view, shifts.manage |
| audit | audit.view |
| settings | settings.view, settings.manage |
| reservations | reservations.view, reservations.create, reservations.edit, reservations.cancel |
| sales | sales.view, sales.create |

> **Note:** `payments.view` is **NOT** in the Phase 02 permission set. The Payments module permission keys will be seeded in Phase 06 (Payments & Treasury).

## Verification Criteria

### Definition of Done — Phase 02 Final Gate (2026-09-09)

| Criterion | Status | Notes |
|---|---|---|
| Login success/failure works | ✅ | TC-AUTH-01–04 |
| Refresh rotation enforced (single-use) | ✅ | TC-AUTH-08 |
| Logout revokes token | ✅ | TC-AUTH-09 |
| Unauthenticated → 401 | ✅ | TC-AUTH-06, -10 |
| Unauthorized (wrong perm) → 403 | ✅ | TC-AUTH-12 |
| Deactivated user blocked | ✅ | TC-AUTH-14 |
| No info leak (email vs password) | ✅ | TC-AUTH-02, -03 |
| HttpOnly cookie set correctly | ✅ | TC-AUTH-01 |
| 40 permissions seeded | ✅ | Verified by count |
| Frontend builds zero TS errors | ✅ | 2026-09-09 |
| Backend builds zero TS errors | ✅ | 2026-09-09 |
| Login page RTL + Arabic | ✅ | Browser verified |
| Protected routes work | ✅ | Browser verified |
| Users page loads | ✅ | Browser verified |
| Roles page loads | ✅ | Browser verified |
| Logout redirects to /login | ✅ | Browser verified |
| Documentation updated | ✅ | AUTH.md, USERS_PERMISSIONS.md, PROJECT_STATE.md, CHANGELOG.md, SECURITY_ARCHITECTURE.md, DECISION_LOG.md, PROJECT_MAP.md |
| Tests committed | ✅ | auth.test.ts |
| Code committed + pushed | ✅ | Commits b27bf55 + verification commit |

## Known Risks

- **No Redis rate limiting:** The in-memory store resets on server restart and does not scale to multiple instances. Acceptable for Phase 02 single-server Hostinger deployment (DEC-027). Must be revisited if multi-server architecture is adopted.
- **No password reset:** Out of scope (DEC-029). Admin must manually reset passwords until this is built.
- **Audit log:** Auth events (login, logout, failed attempts) are not yet written to an audit log. Audit module planned for Phase 16.

## Definition of Done

All items in `docs/00-governance/DEFINITION_OF_DONE.md` satisfied. ✅

---

*Last updated: 2026-09-09 (Phase 02 Final Gate PASSED)*
