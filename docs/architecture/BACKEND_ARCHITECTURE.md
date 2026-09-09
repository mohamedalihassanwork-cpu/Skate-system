# Backend Architecture — KOSHK SKATE ERP

**Version:** 1.1  
**Status:** PLANNED — No backend code exists yet.  
**Last updated:** 2026-09-09 (reconciled)

---

## Runtime — APPROVED

**Node.js** (LTS, recommend v20.x) — part of DEC-020

---

## Framework — APPROVED

**Express + TypeScript** (DEC-020)

**Rationale:** Approved by project owner.

**Constraints:**
- Must be deployable on Hostinger (Node.js)
- Must support REST API
- Must support middleware
- Must support background jobs

---

## Application Structure (Target)

```
apps/api/src/
├── app.ts                  — App entry point
├── server.ts               — HTTP server start
├── config/
│   ├── database.ts         — DB connection config
│   ├── auth.ts             — JWT/session config
│   └── app.ts              — General config
├── middleware/
│   ├── auth.ts             — Authentication middleware
│   ├── permission.ts       — Permission check middleware
│   ├── validate.ts         — Input validation middleware
│   ├── audit.ts            — Audit log middleware
│   └── error.ts            — Error handling middleware
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   ├── users/
│   ├── skates/
│   ├── customers/
│   ├── rentals/
│   ├── inspections/
│   ├── damage/
│   ├── maintenance/
│   ├── reservations/
│   ├── sales/
│   ├── payments/
│   ├── treasury/
│   ├── expenses/
│   ├── shifts/
│   ├── reports/
│   ├── notifications/
│   ├── audit-log/
│   └── settings/
├── db/
│   ├── connection.ts       — DB pool/connection
│   ├── migrations/         — Migration files
│   └── seeds/              — Seed data
├── jobs/
│   └── rental-expiry.ts    — Scheduled: check expiring rentals
└── utils/
    ├── errors.ts           — Error classes
    ├── validation.ts       — Validation helpers
    └── financial.js        — Financial calculation utilities
```

---

## Module Structure (Per Module)

Each feature module follows this structure:

```
modules/rentals/
├── rentals.routes.js       — Route definitions
├── rentals.controller.js   — Request/response handling
├── rentals.service.js      — Business logic
├── rentals.repository.js   — Database queries
└── rentals.validation.js   — Input validation schemas
```

**Layer responsibilities:**
- **Routes:** Map HTTP methods/paths to controller functions
- **Controller:** Parse request, call service, format response
- **Service:** Enforce business rules, orchestrate operations, call repository
- **Repository:** All database queries (no business logic here)
- **Validation:** Input validation schemas (executed via middleware)

---

## Controllers

Controllers must:
- Not contain business logic
- Call the appropriate service method
- Return standardized JSON responses
- Catch service errors and translate to appropriate HTTP status codes

---

## Services

Services must:
- Enforce all business rules
- Use database transactions for multi-step financial operations
- Call repository methods (not raw DB directly)
- Create audit log entries for significant operations
- Throw typed errors (not raw strings)

**High-risk service methods** (require special care):
- `RentalService.startRental()` — validates availability, creates rental atomically
- `RentalService.returnRental()` — records return, calculates late fee, updates skate status
- `RentalService.waiveLateFee()` — validates permission, creates audit entry
- `PaymentService.recordPayment()` — updates treasury, creates movement record atomically
- `MaintenanceService.completeMaintenace()` — updates skate status to available

---

## Repositories

Repositories must:
- Contain all database queries
- Not enforce business rules
- Support transactions (accept connection/transaction context)
- Return plain objects (not framework-specific result objects)

---

## Middleware

### Authentication Middleware

```
Request → Parse JWT → Validate token → Attach user to request → Next
```

If token missing or invalid: 401

### Permission Middleware

```
Request (with user) → Check user permissions → Has permission? → Next
```

If lacks permission: 403

### Validation Middleware

```
Request → Run validation schema → Errors? → 400 with details
                                → Valid → Next
```

### Audit Middleware

Applied selectively to sensitive routes. Logs to `audit_log` table:
- User
- Action
- Entity
- Timestamp
- Old/new values

### Error Middleware

Global error handler:
- Catches all unhandled errors
- Logs server-side
- Returns structured JSON error to client
- Never exposes stack traces in production

---

## Authentication

**Status: UNKNOWN — pending decision**

**Target approach (JWT):**
1. `POST /api/v1/auth/login` → validates credentials → returns JWT
2. Client stores JWT (httpOnly cookie or Authorization header — TBD)
3. Every protected request passes JWT → middleware validates → attaches user
4. Token expiry: TBD (recommend 8 hours for cashier shift coverage)
5. Refresh token: TBD

---

## Authorization (RBAC)

- Roles stored in database (`roles` table)
- Permissions stored in database (`permissions` table)
- Role-permission mapping (`role_permissions` table)
- User-role mapping (`user_roles` table)
- Permission keys are strings: e.g., `rentals.create`, `waivers.approve`
- Permission check in middleware: `user.permissions.includes(requiredPermission)`
- Permissions cached per request (or per token) — TBD

---

## Input Validation

**Library:** TBD (Joi, Zod, Yup, express-validator)

**Rules:**
- All POST/PUT/PATCH body validated server-side
- Query parameters validated for type/range
- File upload constraints validated (type, size)
- Validation errors: 400 with Arabic-compatible error keys

---

## Financial Operations

All financial operations must use **database transactions**:

```javascript
// Example pattern
await db.transaction(async (trx) => {
  await rentalRepository.createRental(rentalData, trx);
  await paymentRepository.recordPayment(paymentData, trx);
  await treasuryRepository.createMovement(movementData, trx);
  await auditRepository.createEntry(auditData, trx);
});
```

If any step fails, all steps are rolled back. No partial financial state.

---

## Scheduled Jobs

**Status: UNKNOWN — pending decision on job runner**

**Required job:**
- **Rental Expiry Checker** — runs every minute, finds rentals where `expected_end_at` is within 1 minute and sends notification

**Candidates:**
- `node-cron` (in-process)
- Hostinger-supported external cron hitting an API endpoint

---

## Error Handling

**Custom error classes (target):**

```javascript
class AppError extends Error {
  constructor(message, code, statusCode) { ... }
}

class ValidationError extends AppError { ... }   // 400
class AuthError extends AppError { ... }          // 401
class ForbiddenError extends AppError { ... }     // 403
class NotFoundError extends AppError { ... }      // 404
class ConflictError extends AppError { ... }      // 409
class BusinessRuleError extends AppError { ... }  // 422
```

---

## Logging

**Application logs:**
- Server startup
- Unhandled errors (with stack trace)
- Financial operation errors

**Business audit log:**
- In database (`audit_log` table)
- Created via `AuditService` in relevant service methods

**Log format:** Structured JSON (timestamp, level, message, context)

---

## Security Boundaries

- Passwords: bcrypt (min 12 rounds)
- JWT secrets: environment variable, never hardcoded
- Input validation: all endpoints
- SQL injection: prevented by ORM/parameterized queries (never string concatenation)
- File uploads: type/size validation, stored outside web root
- National ID / sensitive data: access logged

---

## Environment Variables (Target)

```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@host:3306/koshk_erp
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=8h
STORAGE_PATH=/var/app/uploads
```

---

*Last updated: 2026-09-09*
