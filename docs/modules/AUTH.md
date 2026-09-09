# Module: Authentication

**Phase:** 02 — Authentication & Permissions
**Status:** IMPLEMENTED
**Last updated:** 2026-09-09

---

## Purpose

Manages user login, session/token management, current user identity, and silent token refresh.

---

## API Endpoints

| Method | Route | Auth Required | Rate Limited | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | No | Yes (10/min/IP) | Authenticate with email + password |
| POST | `/api/v1/auth/refresh` | No (cookie) | No | Rotate refresh token, issue new access token |
| POST | `/api/v1/auth/logout` | Yes | No | Delete refresh token, clear cookie |
| GET | `/api/v1/auth/me` | Yes | No | Return current user with roles + permissions |

---

## Token Design (DEC-024, DEC-025, DEC-028)

### Access Token
- **Format:** JWT, signed with `JWT_SECRET`
- **Expiry:** 15 minutes (`JWT_ACCESS_EXPIRES_IN`)
- **Payload:** `{ sub: userId, email }`
- **Transport:** `Authorization: Bearer <token>` header
- **Client storage:** In memory only — never in `localStorage`

### Refresh Token
- **Format:** JWT, signed with `JWT_REFRESH_SECRET` (separate — DEC-028)
- **Expiry:** 7 days
- **Client transport:** `HttpOnly` cookie `koshk_refresh_token` scoped to `Path=/api/v1/auth` (DEC-025)
- **Server tracking:** SHA-256 hash stored in `refresh_tokens` table (raw value never persisted)
- **Single-use rotation:** Old token deleted, new pair issued on each `/auth/refresh` call

### Cookie Settings (DEC-025)

| Setting | Development | Production |
|---|---|---|
| `HttpOnly` | true | true |
| `Secure` | false | true |
| `SameSite` | Lax | Strict |
| `Path` | /api/v1/auth | /api/v1/auth |
| `MaxAge` | 7 days | 7 days |

---

## Backend File Structure

```
apps/api/src/modules/auth/
├── auth.types.ts      — LoginRequest, TokenPayload, AuthUser, etc.
├── auth.service.ts    — login, refresh, logout, verifyAccessToken, loadUserWithPermissions
└── auth.routes.ts     — /login, /refresh, /logout, /me

apps/api/src/middleware/
├── auth.ts            — authenticate() — validates Bearer token, attaches req.user
├── permission.ts      — requirePermission(key) — RBAC check, 403 if denied
└── rateLimiter.ts     — loginLimiter — 10 req/min/IP
```

---

## Frontend File Structure

```
apps/web/src/
├── modules/auth/
│   ├── auth.types.ts    — Frontend type definitions
│   ├── auth.service.ts  — loginApi(), refreshApi(), logoutApi(), meApi()
│   └── LoginPage.tsx    — Arabic RTL login page, KOSHK SKATE design
├── contexts/
│   └── AuthContext.tsx  — Auth state: token (memory), user, permissions
├── hooks/
│   └── usePermission.ts — usePermission(key): boolean
└── components/
    ├── ProtectedRoute.tsx — Redirects unauthenticated to /login
    └── PermissionGate.tsx — Renders children only if user has permission
```

---

## Security Notes

- Passwords are hashed with bcrypt (12 rounds). Never stored or logged plain.
- JWT secrets: must be cryptographically random, min 32 bytes. Production startup fails if defaults detected.
- Raw refresh token not stored in DB — only SHA-256 hash.
- Permission enforcement is **always server-side** (Rule 13). Frontend gating is cosmetic only.
- Rate limit on login: 10 req/min/IP to prevent brute-force attacks (DEC-027).
- CSRF: Not required. Access token in `Authorization` header; refresh cookie scoped to `/api/v1/auth`.

---

## Error Responses (Arabic)

| Scenario | HTTP | Message |
|---|---|---|
| Wrong email/password | 401 | البريد الإلكتروني أو كلمة المرور غير صحيحة |
| Deactivated account | 401 | الحساب معطّل. تواصل مع المدير |
| Missing/invalid access token | 401 | رمز الوصول غير صالح أو منتهي الصلاحية |
| Missing refresh cookie | 401 | رمز التحديث غير موجود |
| Rate limit exceeded | 429 | محاولات تسجيل دخول كثيرة. حاول مرة أخرى بعد دقيقة. |

---

## Related Decisions

| Decision | Summary |
|---|---|
| DEC-024 | JWT + Refresh Token strategy |
| DEC-025 | Refresh token as HttpOnly cookie |
| DEC-026 | Seed admin credentials via env vars |
| DEC-027 | In-memory rate limiter, 10 req/min/IP |
| DEC-028 | Separate JWT_SECRET / JWT_REFRESH_SECRET |
| DEC-029 | Password reset out of scope for Phase 02 |
