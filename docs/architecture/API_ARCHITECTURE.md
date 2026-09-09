# API Architecture — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** PLANNED — No API exists yet.  
**Last updated:** 2026-09-09

---

## API Style

**Target:** REST API  
**Format:** JSON request/response  
**Base path:** `/api/v1`  
**Status:** PLANNED

---

## Authentication

**Status:** UNKNOWN — pending decision (see DEC-014)

**Target approach:** JWT Bearer token
- Login endpoint returns access token
- All protected routes require `Authorization: Bearer <token>` header
- Token contains: `user_id`, `role_ids`, `permissions` (or permissions fetched per request)

---

## Authorization

Every endpoint must independently validate:
1. Is the user authenticated?
2. Does the user have the required permission for this operation?

Frontend hiding of UI elements is NOT sufficient. Backend must enforce.

---

## Response Format (Target Convention)

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Success (list)
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "SKATE_NOT_AVAILABLE",
    "message": "الزلاجة غير متاحة للاستئجار",
    "details": {}
  }
}
```

---

## HTTP Status Codes (Target Convention)

| Code | Usage |
|---|---|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Bad request (validation error) |
| 401 | Unauthenticated |
| 403 | Unauthorized (authenticated but lacks permission) |
| 404 | Not found |
| 409 | Conflict (e.g., skate already rented, duplicate reservation) |
| 422 | Unprocessable entity (business rule violation) |
| 500 | Server error |

---

## Module-to-API Map (Target)

### Authentication

| Method | Path | Description | Permission |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Login | Public |
| POST | `/api/v1/auth/logout` | Logout | Authenticated |
| GET | `/api/v1/auth/me` | Current user info | Authenticated |
| POST | `/api/v1/auth/refresh` | Refresh token | Authenticated |

---

### Users

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/users` | List users | `users.view` |
| POST | `/api/v1/users` | Create user | `users.create` |
| GET | `/api/v1/users/:id` | Get user | `users.view` |
| PUT | `/api/v1/users/:id` | Update user | `users.edit` |
| DELETE | `/api/v1/users/:id` | Disable user | `users.delete` |
| GET | `/api/v1/roles` | List roles | `roles.view` |
| POST | `/api/v1/roles` | Create role | `roles.create` |
| PUT | `/api/v1/roles/:id` | Update role | `roles.edit` |
| GET | `/api/v1/permissions` | List permissions | `roles.view` |

---

### Skates

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/skates` | List skates (with filters) | `skates.view` |
| POST | `/api/v1/skates` | Add skate | `skates.create` |
| GET | `/api/v1/skates/:id` | Get skate detail | `skates.view` |
| PUT | `/api/v1/skates/:id` | Update skate | `skates.edit` |
| GET | `/api/v1/skates/:id/history` | Full timeline | `skates.view` |
| GET | `/api/v1/skates/available` | Available skates for rental | `rentals.create` |

---

### Customers

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/customers` | List/search customers | `customers.view` |
| POST | `/api/v1/customers` | Create customer | `customers.create` |
| GET | `/api/v1/customers/:id` | Customer profile | `customers.view` |
| PUT | `/api/v1/customers/:id` | Update customer | `customers.edit` |
| GET | `/api/v1/customers/:id/rentals` | Customer rental history | `customers.view` |

---

### Rentals

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/rentals` | List rentals (filters) | `rentals.view` |
| POST | `/api/v1/rentals` | Start rental | `rentals.create` |
| GET | `/api/v1/rentals/active` | Active rentals | `rentals.view` |
| GET | `/api/v1/rentals/:id` | Rental detail | `rentals.view` |
| POST | `/api/v1/rentals/:id/return` | Return skate | `rentals.return` |
| POST | `/api/v1/rentals/:id/waive-late-fee` | Waive late fee | `waivers.approve` |
| GET | `/api/v1/rentals/calculate-price` | Calculate price preview | `rentals.create` |

---

### Inspections

| Method | Path | Description | Permission |
|---|---|---|---|
| POST | `/api/v1/inspections` | Record inspection | `rentals.return` |
| GET | `/api/v1/inspections/:id` | Inspection detail | `rentals.view` |
| GET | `/api/v1/skates/:id/inspections` | Skate inspection history | `skates.view` |

---

### Damage

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/damage-reports` | List damage reports | `damage.view` |
| POST | `/api/v1/damage-reports` | Create damage report | `damage.create` |
| GET | `/api/v1/damage-reports/:id` | Damage report detail | `damage.view` |
| POST | `/api/v1/damage-reports/:id/upload-photo` | Upload damage photo | `damage.create` |
| POST | `/api/v1/damage-reports/:id/waive-charge` | Waive damage charge | `waivers.approve` |

---

### Maintenance

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/maintenance` | List maintenance records | `maintenance.view` |
| POST | `/api/v1/maintenance` | Create maintenance record | `maintenance.create` |
| GET | `/api/v1/maintenance/:id` | Maintenance detail | `maintenance.view` |
| PUT | `/api/v1/maintenance/:id` | Update maintenance | `maintenance.edit` |
| POST | `/api/v1/maintenance/:id/complete` | Complete maintenance | `maintenance.complete` |

---

### Reservations

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/reservations` | List reservations | `reservations.view` |
| POST | `/api/v1/reservations` | Create reservation | `reservations.create` |
| GET | `/api/v1/reservations/:id` | Reservation detail | `reservations.view` |
| PUT | `/api/v1/reservations/:id` | Update reservation | `reservations.edit` |
| POST | `/api/v1/reservations/:id/cancel` | Cancel reservation | `reservations.cancel` |

---

### Sales POS

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/products` | List products | `sales.view` |
| POST | `/api/v1/sales` | Create sale | `sales.create` |
| GET | `/api/v1/sales/:id` | Sale detail | `sales.view` |
| GET | `/api/v1/sales` | Sales history | `sales.view` |

---

### Payments

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/payment-methods` | List payment methods | Authenticated |
| POST | `/api/v1/rentals/:id/payments` | Record rental payment | `rentals.create` |
| POST | `/api/v1/sales/:id/payments` | Record sale payment | `sales.create` |

---

### Treasury

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/treasury/accounts` | List accounts | `treasury.view` |
| GET | `/api/v1/treasury/movements` | Transaction history | `treasury.view` |
| POST | `/api/v1/treasury/accounts` | Create account | `treasury.manage` |

---

### Expenses

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/expenses` | List expenses | `expenses.view` |
| POST | `/api/v1/expenses` | Record expense | `expenses.create` |
| GET | `/api/v1/expenses/:id` | Expense detail | `expenses.view` |
| GET | `/api/v1/expense-categories` | List categories | `expenses.view` |
| POST | `/api/v1/expense-categories` | Create category | `settings.manage` |

---

### Cashier Shifts

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/shifts` | List shifts | `shifts.view` |
| POST | `/api/v1/shifts/open` | Open shift | `shifts.manage` |
| POST | `/api/v1/shifts/:id/close` | Close shift | `shifts.manage` |
| GET | `/api/v1/shifts/:id` | Shift detail | `shifts.view` |
| GET | `/api/v1/shifts/current` | Current open shift | Authenticated |

---

### Reports

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/reports/overview` | Overview report | `reports.view` |
| GET | `/api/v1/reports/revenue` | Revenue report | `reports.view` |
| GET | `/api/v1/reports/rentals` | Rental report | `reports.view` |
| GET | `/api/v1/reports/skate-performance` | Skate performance | `reports.view` |
| GET | `/api/v1/reports/late-returns` | Late returns | `reports.view` |
| GET | `/api/v1/reports/damage` | Damage report | `reports.view` |
| GET | `/api/v1/reports/maintenance` | Maintenance report | `reports.view` |
| GET | `/api/v1/reports/expenses` | Expense report | `reports.view` |
| GET | `/api/v1/reports/customers` | Customer report | `reports.view` |
| GET | `/api/v1/reports/cashiers` | Cashier report | `reports.view` |
| GET | `/api/v1/reports/operating-result` | Operating financial result | `reports.view` |

---

### Notifications

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/notifications` | List user notifications | Authenticated |
| POST | `/api/v1/notifications/:id/read` | Mark as read | Authenticated |
| POST | `/api/v1/notifications/read-all` | Mark all read | Authenticated |

---

### Audit Log

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/audit-log` | List audit entries | `audit.view` |
| GET | `/api/v1/audit-log/:id` | Audit entry detail | `audit.view` |

---

### Settings

| Method | Path | Description | Permission |
|---|---|---|---|
| GET | `/api/v1/settings` | Get settings | `settings.view` |
| PUT | `/api/v1/settings` | Update settings | `settings.manage` |

---

## Pagination

All list endpoints should support:
- `page` (default: 1)
- `perPage` (default: 20, max: 100)
- `sortBy` (field name)
- `sortDir` (`asc` | `desc`)

---

## Filtering

Endpoints should support relevant filters via query parameters. Examples:
- `GET /api/v1/rentals?status=active&skateId=5&from=2026-01-01&to=2026-01-31`
- `GET /api/v1/skates?status=available&size=42`

---

## File Uploads

- `POST /api/v1/damage-reports/:id/upload-photo`
- Content-Type: `multipart/form-data`
- Size limit: TBD (recommend 5MB max)
- Accepted formats: JPEG, PNG, WebP

---

## Idempotency

Financial operations (payment recording, rental start) should be protected against duplicate submissions. Implementation approach: TBD (idempotency key header or unique constraint).

---

*Last updated: 2026-09-09*
