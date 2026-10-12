# Module: Customers

**Status:** COMPLETE ✅
**Last updated:** 2026-09-15 (Phase 04 documentation reconciliation)

---

## Purpose

Manages customer profiles for the KOSHK SKATE ERP.
Provides customer search, creation, editing, and deactivation.
Required by Phase 05 (Rental POS) for `rental.customer_id` foreign key.

---

## Current Status

Phase 04 is COMPLETE. See `docs/phases/PHASE_04_CUSTOMERS_MODULE.md` for full spec and Definition of Done.

---

## Business Rules

1. **Name** and **Phone** are required. National ID and Notes are optional.
2. **National ID** is UNIQUE when provided (nullable — NULL does not violate uniqueness). Duplicate National IDs rejected with 409. (DEC-053)
3. **Phone** is NOT UNIQUE — families may share phone numbers. (DEC-054)
4. **Registration date** is system-generated at creation. Cashier does not input it.
5. **Soft-deactivation only** — customers are never hard-deleted. `is_active = false` hides a customer from the Rental POS search. Customers are reactivatable. (DEC-052)
6. **National ID is PII** — masked in the customer list API response; full value only returned by the profile endpoint. (DEC-056)
7. **Rental history, statistics, and analytics are deferred** — not in Phase 04 scope. See DEC-055 for phase ownership.
8. **Search** — by name, phone, and National ID via a unified `q` query parameter.

---

## Database

**Table:** `customers`
**File:** `apps/api/src/db/schema/customers.ts`

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(255) | NOT NULL | Required |
| `phone` | VARCHAR(20) | NOT NULL, INDEX | Required; NOT UNIQUE (DEC-054) |
| `national_id` | VARCHAR(50) | UNIQUE (nullable) | Optional; UNIQUE per DEC-053 |
| `registration_date` | DATE | NOT NULL | System-generated = today |
| `notes` | TEXT | nullable | Optional |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft-deactivation (DEC-052) |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW | |
| `updated_at` | DATETIME | NOT NULL, DEFAULT NOW ON UPDATE | |

**Note:** `is_active` is a schema delta from the original DATABASE_ARCHITECTURE.md planned schema — approved via DEC-052.

---

## API

**Base path:** `GET /api/v1/customers`

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/customers` | `customers.view` | List (paginated, searchable, masked national_id) |
| POST | `/api/v1/customers` | `customers.create` | Create customer |
| GET | `/api/v1/customers/:id` | `customers.view` | Profile (full national_id) |
| PUT | `/api/v1/customers/:id` | `customers.edit` | Update customer |
| POST | `/api/v1/customers/:id/deactivate` | `customers.deactivate` | Soft-deactivate |
| POST | `/api/v1/customers/:id/activate` | `customers.deactivate` | Reactivate |

**List `?q=` query searches:** name, phone, national_id.
**List `?isActive=` filter:** `1` (default), `0`, `all`.

---

## Permissions

| Permission Key | Arabic Label | Administrator | Cashier | Maintenance Staff |
|---|---|---|---|---|
| `customers.view` | عرض العملاء | ✅ | ✅ | ❌ |
| `customers.create` | إضافة عميل | ✅ | ✅ | ❌ |
| `customers.edit` | تعديل بيانات العميل | ✅ | ✅ | ❌ |
| `customers.deactivate` | تعطيل / تفعيل العميل | ✅ | ❌ | ❌ |

---

## Frontend

| Component | Path |
|---|---|
| Customer list page | `apps/web/src/modules/customers/CustomersPage.tsx` |
| Customer profile page | `apps/web/src/modules/customers/CustomerProfilePage.tsx` |
| API service | `apps/web/src/modules/customers/customers.service.ts` |

**Routes:**
- `/customers` → `CustomersPage`
- `/customers/:id` → `CustomerProfilePage`

**Shared components used:** `Button`, `IconButton`, `Input`, `Textarea`, `Modal`, `Badge`, `DataTable`, `SearchBar`, `Pagination`, `ConfirmDialog`, `Alert`, `useToast`, `EmptyState`, `PageLoader`, `PermissionGate`.

---

## Related Modules

| Module | Relationship |
|---|---|
| Phase 05 — Rental POS | `rentals.customer_id` FK — requires this module |
| Phase 06 — Payments | Customer payment stats |
| Phase 08 — Damage | `damage_reports.customer_id` FK |
| Phase 10 — Reservations | `reservations.customer_id` FK |
| Phase 13 — Reports | Customer report |
| Phase 16 — Audit Log | National ID access logging |

---

## Tests

**File:** `apps/api/src/tests/customers.test.ts`

Test IDs: TC-CUST-01 through TC-CUST-17, TC-CUST-VAL-01 through TC-CUST-VAL-03, TC-CUST-RBAC-01 through TC-CUST-RBAC-08 (28 tests total).
See `docs/phases/PHASE_04_CUSTOMERS_MODULE.md` for full test matrix.

---

## Key Decisions

| Decision | Summary |
|---|---|
| DEC-051 | Name + Phone required; National ID optional |
| DEC-052 | Soft-deactivate via `is_active`; reactivatable; hard-delete prohibited |
| DEC-053 | National ID is UNIQUE (nullable) |
| DEC-054 | Phone is NOT UNIQUE |
| DEC-055 | Rental history DEFERRED to Phase 05+ |
| DEC-056 | National ID masked in list; full in profile |
| DEC-057 | `IconButton` component API approved (SYS-002) |
| DEC-058 | Role-permission defaults confirmed |
| DEC-059 | Application-level length validation: name max 255, phone max 20, nationalId max 50 |

---

## Known Technical Debt

- **National ID audit logging** — access to full National ID is not logged in Phase 04. Deferred to Phase 16 (Audit Log). Accepted risk documented in DEC-056.
- **Customer profile stats** — rental count, total paid, late returns, damages shown as "not yet available" in profile until Phase 05+. See DEC-055 for ownership.

---

## Future Work

| Item | Phase |
|---|---|
| Rental count + history on profile | Phase 05 |
| Total paid + payment analytics | Phase 06 |
| Damage history on profile | Phase 08 |
| Reservation history on profile | Phase 10 |
| Customer report (analytics) | Phase 13 |
| National ID access audit logging | Phase 16 |

---

*Last updated: 2026-09-15 (Phase 04 — documentation reconciliation)*

---

## Desktop UI/UX audit — 2026-10-11

**Status:** IMPLEMENTED — desktop presentation changes; verification evidence is maintained in the [central desktop audit report](../quality/DESKTOP_UI_UX_AUDIT.md).

- **Source coverage:** Customers list and profile, create/edit dialogs, and activation/deactivation confirmations.
- **Changes:** The profile history table now follows desktop row spacing and header emphasis. Long profile values can shrink and wrap. The list continues to use the shared DataTable, SearchBar, IconButton, Modal and ConfirmDialog.
- **Boundary:** All new visual rules use `@media screen and (min-width: 1024px)`. Presentation below 1024px, API requests, permissions, validation, financial calculations and workflows are preserved.
- **Verification:** See the central report for the actual build, lint, synthetic-browser and below-desktop regression results. This audit does not claim new live financial or database verification.
