# Security Architecture — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** PLANNED — No implementation exists.  
**Last updated:** 2026-09-09

---

## Security Controls

| Control | Status | Notes |
|---|---|---|
| HTTPS | PLANNED | Required for production (Hostinger SSL) |
| Password hashing | PLANNED | bcrypt, min 12 rounds |
| JWT authentication | APPROVED (DEC-024) | JWT + Refresh Token. Access token: 15 min. Refresh token: 7 days, stored in DB, single-use rotation. |
| RBAC authorization | PLANNED | Server-side enforcement |
| Input validation | PLANNED | All endpoints |
| SQL injection prevention | PLANNED | ORM/parameterized queries |
| XSS prevention | PLANNED | Output encoding, CSP header |
| CSRF protection | NOT REQUIRED | Using Authorization header (not cookies) for access token — CSRF not applicable for JWT in header |
| Rate limiting | PLANNED | Login endpoint at minimum |
| File upload security | PLANNED | Type/size limits, safe storage |
| Audit logging | PLANNED | Sensitive operations |
| Sensitive data handling | PLANNED | National ID, phone numbers |
| Environment secrets | PLANNED | `.env`, never committed |
| HTTPS-only cookies | PLANNED | If session/cookie auth used |

---

## Authentication

**Decision:** JWT + Refresh Token (DEC-024)  
**Status:** APPROVED — implementation in Phase 02

**Design:**
- **Access token:** Short-lived JWT (15 min). Sent as `Authorization: Bearer <token>` header.
- **Refresh token:** Long-lived (7 days). Stored in `refresh_tokens` DB table. Single-use with rotation (old token invalidated on each refresh).
- **Revocation:** Delete refresh token row. Required for cashier shift close / forced logout.
- **Logout:** Server deletes the refresh token; client discards the access token.
- **`JWT_SECRET`:** Cryptographically random string, min 32 bytes, loaded from `.env` only.

**Requirements:**
- Passwords hashed with bcrypt (min 12 rounds — never stored plain)
- Login endpoint must be rate-limited
- No hardcoded credentials in code
- Access tokens expire in 15 minutes (covers brief network gaps; refresh token handles longer sessions)

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
