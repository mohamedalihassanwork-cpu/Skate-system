# Security Architecture — KOSHK SKATE ERP

**Version:** 2.0
**Status:** PARTIALLY IMPLEMENTED — Phase 02 auth/RBAC complete.
**Last updated:** 2026-09-09

---

## Security Controls

| Control | Status | Notes |
|---|---|---|
| HTTPS | PLANNED | Required for production (Hostinger SSL) |
| Password hashing | **IMPLEMENTED** | bcrypt, 12 rounds — `apps/api/src/modules/users/users.service.ts` |
| JWT authentication | **IMPLEMENTED** | JWT + Refresh Token (DEC-024). Access: 15 min, memory. Refresh: 7 days, HttpOnly cookie + DB (DEC-025). |
| RBAC authorization | **IMPLEMENTED** | Server-side middleware — `apps/api/src/middleware/permission.ts` |
| Input validation | PLANNED | All endpoints |
| SQL injection prevention | **IMPLEMENTED** | Drizzle ORM parameterized queries |
| XSS prevention | PLANNED | Output encoding, CSP header |
| CSRF protection | NOT REQUIRED | Access token in `Authorization` header. Refresh cookie scoped to `/api/v1/auth` path only. |
| Rate limiting | **IMPLEMENTED** | 10 req/min/IP on login — `express-rate-limit`, in-memory (DEC-027) |
| File upload security | PLANNED | Phase 08 |
| Audit logging | PARTIAL | Login/logout events. Full module in Phase 16. |
| Sensitive data handling | PLANNED | National ID, phone numbers |
| Environment secrets | **IMPLEMENTED** | `.env` excluded from Git. JWT_SECRET + JWT_REFRESH_SECRET required. |
| HTTPS-only cookies | PLANNED (prod) | `secure: true` for refresh cookie in production — DEC-025 |

---

## Authentication

**Decision:** JWT + Refresh Token (DEC-024)
**Refresh token storage:** HttpOnly cookie (DEC-025)
**Status:** IMPLEMENTED — Phase 02

**Design:**
- **Access token:** Short-lived JWT (15 min). Sent as `Authorization: Bearer <token>` header. Stored in memory only on the frontend — never in localStorage.
- **Refresh token:** Long-lived (7 days). Signed with `JWT_REFRESH_SECRET` (separate from access token — DEC-028). Sent as an `HttpOnly` cookie scoped to `Path=/api/v1/auth`. Also tracked in the `refresh_tokens` DB table with a SHA-256 hash (raw value never stored in DB).
- **Single-use rotation:** On each `/auth/refresh` call, the old token DB record is deleted and a new token pair is issued.
- **Revocation:** Delete refresh token row from DB. Used for forced logout on cashier shift close.
- **Logout:** Server deletes the refresh token; cookie is cleared; client discards the access token from memory.
- **`JWT_SECRET`:** Signs access tokens. Must be cryptographically random, min 32 bytes, from `.env` only. Startup fails in production if default value is detected.
- **`JWT_REFRESH_SECRET`:** Signs refresh tokens. Different from `JWT_SECRET` — separate compromise domains.

**Cookie settings for refresh token (DEC-025):**
```
HttpOnly: true
Secure: true (production) / false (development)
SameSite: Strict (production) / Lax (development)
Path: /api/v1/auth
MaxAge: 7 days
```

**Requirements:**
- Passwords hashed with bcrypt (12 rounds — never stored plain)
- Login endpoint rate-limited: 10 req/min/IP (DEC-027)
- No hardcoded credentials in code
- Access tokens expire in 15 minutes; refresh token handles session continuity

---

## Authorization (RBAC)

- Roles are configurable by Administrator
- Permissions enforced on the backend for every operation
- Frontend may hide UI but must never be the sole enforcement
- Sensitive actions require specific permission keys (e.g., `waivers.approve`)

### Permission Keys (Target)

```
rentals.view
rentals.create
rentals.return
waivers.approve
damage.view
damage.create
damage.waive
maintenance.view
maintenance.create
maintenance.edit
maintenance.complete
customers.view
customers.create
customers.edit
skates.view
skates.create
skates.edit
expenses.view
expenses.create
treasury.view
treasury.manage
reports.view
users.view
users.create
users.edit
users.delete
roles.view
roles.create
roles.edit
shifts.view
shifts.manage
audit.view
settings.view
settings.manage
reservations.view
reservations.create
reservations.edit
reservations.cancel
sales.view
sales.create
```

---

## Input Validation

All API inputs must be validated server-side:
- String lengths
- Required fields
- Enum values (skate status, payment method, etc.)
- Numeric ranges (amounts > 0)
- Date validity
- Foreign key existence where practical

**Never trust client-provided values** for amounts, status transitions, or permission bypass.

---

## SQL Injection Prevention

- Use ORM or parameterized queries exclusively
- No string concatenation in SQL queries
- Raw queries (if used) must use bound parameters

---

## XSS Prevention

- All user-generated content output must be HTML-escaped
- Content Security Policy header to be implemented
- Rich text input (if any) must be sanitized server-side before storage

---

## CSRF

- If JWT in Authorization header: CSRF not applicable
- If JWT in cookie: CSRF protection required (SameSite=Strict or CSRF token)
- Decision pending on auth mechanism

---

## Rate Limiting

**Minimum requirements:**
- Login endpoint: rate-limited (e.g., 10 attempts per minute per IP)
- Recommended: general API rate limit (e.g., 200 requests/minute per user)

---

## File Upload Security

- Validate MIME type server-side (not just extension)
- Validate file size (recommend 5MB max for damage photos)
- Store uploads outside the web root (not in a publicly accessible path)
- Never execute uploaded files
- Generate safe file names (UUID-based, not user-provided)

---

## Sensitive Data

### National ID
- Stored in database
- Access should be logged in audit trail
- Should not be exposed in API list responses (only detail view)
- Should not be logged in application logs

### Passwords
- Never logged
- Never returned in API responses
- bcrypt only

### Financial Records
- Immutable after creation (no update/delete of payment records)
- Accessible only with appropriate permission

---

## Environment Secrets

- `.env` file never committed to Git
- `.env.example` committed with placeholder values
- Production secrets managed via Hostinger environment variables or config panel
- `JWT_SECRET` must be a cryptographically random string (min 32 bytes)
- Database credentials via environment variable, never hardcoded

---

## HTTPS

- Required for production
- Hostinger provides SSL certificates (Let's Encrypt)
- HTTP requests should redirect to HTTPS in production

---

## Audit Log for Security Events

The following must be audited:

| Event | Audit Required |
|---|---|
| Successful login | YES |
| Failed login (too many attempts) | YES |
| Waive late fee | YES |
| Waive damage charge | YES |
| Change pricing/settings | YES |
| Create/edit/delete user | YES |
| Create/edit role or permissions | YES |
| Complete maintenance (changes skate status) | YES |
| Start rental | YES |
| Record damage | YES |
| Access National ID (if query-level auditing implemented) | OPTIONAL — future |

---

## Database Credentials

- Database user should have minimum required permissions (SELECT, INSERT, UPDATE on app tables; no DROP, no system tables)
- Separate read-only user for reporting queries where feasible

---

## Backup and Recovery

**Status: UNKNOWN — pending infrastructure decision**

Requirements:
- Daily automated backup
- Backup includes database and uploaded files
- Backup retention: minimum 30 days
- Recovery procedure documented

---

*Last updated: 2026-09-09*
