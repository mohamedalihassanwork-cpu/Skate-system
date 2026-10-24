# API Architecture — KOSHK SKATE ERP

## Reservation execution contract — 2026-10-24

The existing `POST /api/v1/rentals` retains `rentals.create` authorization. Walk-ins send `customerId`, `skateIds`, and required positive integer `durationMinutes`. Reservation execution sends `reservationId`, matching `customerId` and `skateIds` containing its skate; duration may be omitted and cannot override the persisted full booking interval. Notes remain optional. Success retains the rental response envelope and adds nullable `data.reservationId`; reservation list/detail keep their existing response shapes and add nullable `rentalId` derived from the unique relationship. No endpoint or permission was added.

The server revalidates booking eligibility and all occupancy inside the rental start transaction. Errors include `RESERVATION_MISMATCH`, `RESERVATION_NOT_ACTIVE`, `RESERVATION_EXPIRED`, `RESERVATION_DURATION_INVALID` and `SKATE_RESERVED`. Reservation edits can return `RESERVATION_CHANGED` (reload/retry after concurrent skate move); create/edit can return `RESERVATION_RENTAL_CONFLICT` for active rental-item occupancy. These errors never create a partial rental/payment. See [approved decision](../decisions/RESERVATION_RENTAL_WORKFLOW_CR.md) and [verification](../quality/RESERVATION_RENTAL_VERIFICATION.md).

**Version:** 1.1
**Status:** APIs are implemented. The original endpoint catalog is a historical target; current Treasury/Shift contracts are reconciled in the 2026-10-16 addendum.
**Last updated:** 2026-10-16 (approved sub-treasury API)

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
    "message": "الاسكيت غير متاحة للاستئجار",
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


## Treasury recorded available balance — 2026-10-15

**Status: IMPLEMENTED / TESTED (2026-10-15).** See [Treasury change record](../quality/TREASURY_AVAILABLE_BALANCE.md), CR-TREASURY-AVAILABLE-2026-10-15.

`GET /api/v1/payments/treasury-summary` uses authentication and the existing `treasury.view` permission. It returns `{ success: true, data: { asOf, currency: 'EGP', totalBalance, cashBalance, nonCashBalance, hasDiscrepancies, accounts } }`. Amounts are exact two-decimal strings. Each account includes `id`, `name`, `nameAr`, `isActive`, `isCashDrawer`, `balance` (signed movement sum), `storedBalance`, `difference` (stored minus movements), and `movementCount`.

One SQL statement reads accounts and aggregated committed movements consistently; server-side integer piastres sum the breakdown. All accounts remain visible, including inactive accounts. No invoice totals, shift opening counts, unpaid charges, or payment-method joins contribute money. A stored-balance discrepancy is diagnostic and never triggers a write or an inferred opening balance. `asOf` indicates generation of this read result, not physical reconciliation or electronic settlement. Responses are not cacheable.

This 2026-10-15 read API introduced no transfer, funding or reconciliation workflow. The independent approved sub-treasury implementation below now defines those actions; the payments summary retains its own contract.

## Implemented sub-treasury API — 2026-10-16

This section supersedes the historical target Treasury/Shift routes, generic response/pagination targets and idempotency TBD above for the approved [sub-treasury CR](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). Implemented router: `apps/api/src/modules/treasury/treasury.routes.ts`; all paths below start with `/api/v1/treasury`.

The router requires authentication, reloads the active user and current permissions, and sends `Cache-Control: no-store`. Services enforce permissions and ownership on the server; Administrator is not a special bypass. The new router returns direct JSON DTOs, without the generic `{ success, data }` envelope. Handover/movement lists return `{ data, meta: { total, page, limit, totalPages } }`; `page` defaults to 1 and `limit` to 50, capped at 100.

| Method/path | Server permission and scope |
|---|---|
| GET `/config` | Authenticated active user; enabled state and designated main account. |
| GET `/summary` | `treasury.handovers.view`: all; `treasury.view_own` or `shifts.manage`: own. |
| GET `/me` | `treasury.view_own` or `shifts.manage`; own assignment, ledger balance, count/ledger expectation, shift, pending funding and recent handovers. |
| GET `/setup-options` | `treasury.assign` or `treasury.fund`. |
| GET `/accounts` | `treasury.view`; independent account balances/status. |
| POST `/accounts` | `treasury.assign`; create a zero-balance account. |
| GET `/accounts/:id/movements` | `treasury.view`: all; otherwise `treasury.view_own` or `shifts.manage` and ownership of assigned account. |
| POST `/assignments`, POST `/activate` | `treasury.assign`; explicit assignment/cutover validation. |
| GET `/funding`, POST `/funding` | `treasury.fund`; list (optional status, maximum 100) or authorize. |
| POST `/funding/:id/accept` | `shifts.manage` or `treasury.view_own`; target cashier only, distinct from author. |
| POST `/funding/:id/cancel` | `treasury.fund`; pending only, reason required. |
| GET `/handovers`, GET `/handovers/:id` | `treasury.handovers.view`: all; `treasury.view_own` or `shifts.manage`: own. List supports status. Detail includes closing, all attempts, movements and settlement. |
| POST `/handovers/:id/confirm` | `treasury.handovers.confirm`, non-self. Nonzero ledger variance also requires `treasury.reconcile`, explicit `approveVariance: true` and reason. |
| POST `/handovers/:id/reject` | `treasury.handovers.confirm`, non-self; required reason. |
| POST `/handovers/:id/replace` | `shifts.manage`; own latest rejected attempt; append-only declaration/reason. |

Mutations carry `operationKey` (8–100 letters/digits/colon/underscore/hyphen). Keys are persisted by actor and operation scope with a canonical payload hash/result. Same key and payload returns the first outcome; changed payload conflicts. State and unique constraints additionally prevent settling the same handover twice with different keys. New sales/expenses are deduplicated per supplied logical-operation key; different keys cannot be distinguished from legitimate separate operations.

Money is accepted as validated two-decimal values; clients should send decimal strings. New treasury DTOs return exact decimal strings. Existing shift DTO numeric fields remain compatible and add separate ledger/count snapshots and managed declaration. Managed operations cannot bypass operation keys or handover declarations through old clients.

Close uses existing `POST /api/v1/shifts/:id/close`: full counted cash/declaration are recorded with expected count and ledger due, reason for discrepancy and actor/time. It creates a pending handover atomically and posts no movement. Confirmation requires `receivedAmount` to equal the latest declaration. A different recount requires rejection and a linked replacement; original closing counts are retained. Funding acceptance and confirmed nonzero handover each post both transfer legs in one transaction. Zero receipt produces `zero_acknowledged` with no transfer; an approved adjustment can still be required. Responses attest recorded user actions, not independently verified physical receipt.

`GET /summary` uses only the latest attempt per shift and returns `pendingCount`, `pendingDeclaredAmount`, `rejectedCount`, `rejectedDeclaredAmount`, `completedCount`, `zeroAcknowledgedCount`, `receivedAmount`, and `adjustmentAmount`. Pending/rejected declarations are separate from settled receipts. Exact aggregate amounts remain decimal strings. Account/history reads use consistent snapshots where multiple queries compose a result.

Existing shift history is own-scoped under `shifts.view`, or all under `shifts.view_all`; expense history similarly uses `expenses.view`/`expenses.view_all`. Existing manage/create rights remain required for their actions. Rental/sale/expense/payment producers route eligible managed cash through the acting cashier's assigned active drawer; electronic accounts remain independent. Cash refunds use the acting funded drawer, while electronic refunds retain the recorded original account.

`GET /api/v1/payments/treasury-summary` remains a distinct global ledger summary under `treasury.view`, with its existing success envelope. Transfer pairs affect independent account balances once each and net to zero in an all-account total; they are not revenue. Pending handovers produce no received balance. See [Treasury](../modules/TREASURY.md), [Cashier shifts](../modules/CASHIER_SHIFTS.md), and [migration/cutover](../quality/SUB_TREASURY_MIGRATION.md).
