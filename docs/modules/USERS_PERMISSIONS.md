# Module: Users & Permissions — KOSHK SKATE ERP

**Phase:** 02 — Authentication & Permissions
**Status:** IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Manages staff user accounts, configurable roles, and the RBAC permission system. The Administrator can create users, assign roles, create new roles, and assign any combination of permissions to those roles.

---

## RBAC Design (DEC-016)

Roles are **data-driven** — stored in the database, configurable at runtime by the Administrator. No role is hardcoded in application logic.

```
users ──< user_roles >── roles ──< role_permissions >── permissions
```

- A user can have multiple roles
- A role can have multiple permissions
- A permission is an atomic key string (e.g., `rentals.create`, `waivers.approve`)
- If a user has a permission through any of their roles, they have it

---

## Default Roles (Seeded — DEC-016)

| Role (EN) | Role (AR) | System Role | Description |
|---|---|---|---|
| Administrator | مدير النظام | Yes | All permissions. Cannot be deleted. |
| Cashier | كاشير | Yes | POS-focused: rentals, customers, payments, shifts. Cannot be deleted. |
| MaintenanceStaff | موظف الصيانة | Yes | Maintenance + damage + skates view. Cannot be deleted. |

System roles (`is_system = true`) cannot be deleted via the API.

---

## Permission Keys (40 total, seeded at startup)

| Module | Keys |
|---|---|
| `rentals` | `rentals.view`, `rentals.create`, `rentals.return`, `waivers.approve` |
| `damage` | `damage.view`, `damage.create`, `damage.waive` |
| `maintenance` | `maintenance.view`, `maintenance.create`, `maintenance.edit`, `maintenance.complete` |
| `customers` | `customers.view`, `customers.create`, `customers.edit` |
| `skates` | `skates.view`, `skates.create`, `skates.edit` |
| `expenses` | `expenses.view`, `expenses.create` |
| `treasury` | `treasury.view`, `treasury.manage` |
| `reports` | `reports.view` |
| `users` | `users.view`, `users.create`, `users.edit`, `users.delete` |
| `roles` | `roles.view`, `roles.create`, `roles.edit` |
| `shifts` | `shifts.view`, `shifts.manage` |
| `audit` | `audit.view` |
| `settings` | `settings.view`, `settings.manage` |
| `reservations` | `reservations.view`, `reservations.create`, `reservations.edit`, `reservations.cancel` |
| `sales` | `sales.view`, `sales.create` |

---

## API Endpoints

### Users

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/users` | `users.view` | List all users |
| POST | `/api/v1/users` | `users.create` | Create new user |
| GET | `/api/v1/users/:id` | `users.view` | Get user by ID |
| PATCH | `/api/v1/users/:id` | `users.edit` | Update user |
| DELETE | `/api/v1/users/:id` | `users.delete` | Soft-deactivate user (`is_active = false`) |

**Note:** No hard delete. Historical record integrity must be preserved.

### Roles

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/roles` | `roles.view` | List all roles with permissions |
| POST | `/api/v1/roles` | `roles.create` | Create new role |
| GET | `/api/v1/roles/:id` | `roles.view` | Get role by ID |
| PATCH | `/api/v1/roles/:id` | `roles.edit` | Update role name |
| DELETE | `/api/v1/roles/:id` | `roles.edit` | Delete non-system role |
| PUT | `/api/v1/roles/:id/permissions` | `roles.edit` | Replace all permissions for a role |

---

## Backend File Structure

```
apps/api/src/modules/users/
├── users.types.ts   — UserDTO, CreateUserRequest, RoleDTO, PermissionDTO, etc.
├── users.service.ts — listUsers, getUser, createUser, updateUser, deactivateUser
├── users.routes.ts  — GET/POST /users, GET/PATCH/DELETE /users/:id
├── roles.service.ts — listRoles, getRole, createRole, updateRole, deleteRole, setRolePermissions
└── roles.routes.ts  — GET/POST /roles, CRUD + PUT /roles/:id/permissions
```

---

## Frontend File Structure

```
apps/web/src/modules/users/
├── users.service.ts — usersService.list/get/create/update/deactivate, rolesService.list/etc.
├── UsersPage.tsx    — User list table + create modal + deactivate action
└── RolesPage.tsx    — Role cards with permissions listed
```

---

## Seed Script

`apps/api/src/db/seed.ts` — Run with `npm run db:seed`.

- **Idempotent:** Safe to run multiple times.
- Seeds all 40 permission keys, 3 default system roles, default admin user.
- Stores only bcrypt hash of admin password.
- Credentials from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars.

---

## Database Schema

```
users              — id, name, email, password_hash, is_active, created_at, updated_at
roles              — id, name, name_ar, is_system, created_at
permissions        — id, key, label_ar, module
user_roles         — user_id FK, role_id FK [PK: (user_id, role_id)]
role_permissions   — role_id FK, permission_id FK [PK: (role_id, permission_id)]
refresh_tokens     — id, user_id FK, token_hash, expires_at, created_at
```

---

## Related Decisions

| Decision | Summary |
|---|---|
| DEC-016 | Roles are data-driven, configurable by Administrator |
| DEC-024 | JWT auth mechanism |
| DEC-025 | Refresh token HttpOnly cookie |
| DEC-026 | Seed admin via env vars, idempotent |
