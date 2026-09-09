# Module: Authentication

**Status:** PLANNED / NOT IMPLEMENTED  
**Last updated:** 2026-09-09

---

## Purpose

Manages user login, session/token management, and current user identity.

---

## Current Status — All PLANNED

---

## Business Rules

1. Users log in with email + password
2. Passwords stored as bcrypt hashes (never plain)
3. Session must cover a full cashier shift (minimum 8 hours recommended)
4. Failed logins should be rate-limited
5. Only active users can log in

---

## Frontend

**Target:** `apps/web/src/modules/auth/`

Screens:
- Login page (split: navy branding panel + white form, per design reference)

---

## Backend

**Target:** `apps/api/src/modules/auth/`

Services:
- `AuthService.login()` — validate credentials, return token
- `AuthService.logout()` — invalidate session/token
- `AuthService.getCurrentUser()` — return user + permissions

---

## Database

Tables: `users`  
(Roles/permissions managed by USERS_PERMISSIONS module)

---

## APIs

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Current user |

---

## Permissions

Login is public. All other routes require authentication.

---

## Verification Requirements

- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails (401)
- [ ] Protected route without token returns 401
- [ ] Token covers full shift duration
- [ ] Inactive user cannot log in

---

*Last updated: 2026-09-09*
