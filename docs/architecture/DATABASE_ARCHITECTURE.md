# Database Architecture — KOSHK SKATE ERP

**Version:** 1.3
**Status:** Current Treasury/Shift schema documented in the 2026-10-16 implementation addendum; the original target catalog below is historical.
**Last updated:** 2026-10-16 (approved sub-treasury schema and guarded migration verification)

> [!IMPORTANT]
> The engine/ORM are approved (DEC-015, DEC-022), and business tables exist. The original phase target definitions are retained as historical context. Use the current implementation addendum below, PROJECT_STATE and actual schema for Treasury/Shift behavior.

---

## Database Engine

**Target:** MySQL 8.x or MariaDB 10.x (InnoDB engine)  
**Status:** APPROVED — DEC-015 (engine), DEC-022 (Drizzle ORM + mysql2 driver)  
**Phase 01 verified:** local `koshk_skate` database created (utf8mb4, InnoDB), connection confirmed via `testConnection()`

**Required features:**
- InnoDB storage engine (transactions, foreign keys)
- UTF-8 charset (`utf8mb4`) for Arabic text support
- Transaction support for financial operations
- Foreign key constraints

---

## Connection Architecture

**Target:**
- Connection pool managed by Drizzle ORM + mysql2 (DEC-022)
- Separate read replica: NOT required at this stage
- Configuration via individual env vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Pool configured: `connectionLimit: 10`, `charset: utf8mb4`, `timezone: +00:00`

**Status:** IMPLEMENTED (Phase 01) — `apps/api/src/db/connection.ts`

---

## Design Principles

1. **No hard deletes of historical records** — use soft-delete (status field or `deleted_at` column)
2. **Financial atomicity** — all financial operations use database transactions
3. **Audit trail** — significant operations create audit log entries
4. **Historical preservation** — rental amounts stored at time of rental (not referenced from current pricing)
5. **Arabic text** — all text columns use `utf8mb4` collation
6. **Timestamps** — all tables have `created_at` and `updated_at`

---

## Entity Relationship Overview

```
users ──────────────────────────────────────────────┐
  │                                                  │
  ├── roles (via user_roles)                         │
  │     └── permissions (via role_permissions)       │
  │                                                  │
  ├── cashier_shifts ─────────────────────────────── │
  │     └── shift_treasury_snapshots                 │
  │                                                  │
skates ──────────────────────────────────────────────┤
  │                                                  │
  ├── rentals ──── customers ─────────────────────── │
  │     ├── rental_payments                          │
  │     ├── inspections                              │
  │     └── late_fee_records                         │
  │                                                  │
  ├── damage_reports ─── customers                   │
  │     └── damage_payments                          │
  │                                                  │
  └── maintenance_records                            │
        └── maintenance_parts                        │
                                                     │
customers ──────────────────────────────────────────┤
                                                     │
reservations ─── customers ─── skates               │
                                                     │
sales ─── customers ─────────────────────────────── │
  ├── sale_items ─── products                        │
  └── sale_payments                                  │
                                                     │
treasury_accounts ──────────────────────────────────┤
  └── treasury_movements                             │
                                                     │
expenses ─── treasury_accounts                       │
                                                     │
products ─── product_categories                      │
                                                     │
audit_log ──────────────────────────────────────────┘
settings
```

---

## Tables (Target)

> **Current rental model (2026-10-24):** The single-skate `rentals` description below is historical. Migration 0020 introduced independent `rental_items` holding skate, actual start/return, expected duration/end, snapshotted rate and actual charge. `rentals` is the commercial container finalized after item returns. Migration 0022 adds only `rentals.reservation_id INT NULL`, UNIQUE and FK to `reservations.id` (`NO ACTION`). Existing/historical rows remain null; the reverse reservation DTO link is a join, not a second stored FK. See [current rental contract](../modules/RENTALS.md).

Reserved windows stay in `reservations`; actual and expected operational timestamps stay on the rental/items. Both use UTC DATETIME values. Driver conversion does not change the MySQL session clock, so reservation expiry explicitly uses `UTC_TIMESTAMP()`. Rental activation uses whole-second precision for both persisted timestamps and overlap checks. The additive link migration requires no data backfill. App rollback may leave the nullable column in place; dropping it after linked data exists would lose relationship history and is not an automatic rollback step.

### Core System

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(255) | |
| `email` | VARCHAR(255) UNIQUE | Login identifier |
| `password_hash` | VARCHAR(255) | Bcrypt |
| `is_active` | BOOLEAN | Soft disable |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

#### `roles`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(100) UNIQUE | e.g., "Administrator", "Cashier" |
| `name_ar` | VARCHAR(100) | Arabic label |
| `is_system` | BOOLEAN | System roles cannot be deleted |
| `created_at` | DATETIME | |

#### `user_roles`
| Column | Type | Notes |
|---|---|---|
| `user_id` | INT FK → users | |
| `role_id` | INT FK → roles | |

#### `permissions`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `key` | VARCHAR(100) UNIQUE | e.g., `rentals.create`, `waivers.approve` |
| `label_ar` | VARCHAR(255) | Arabic label |
| `module` | VARCHAR(50) | e.g., `rentals` |

#### `role_permissions`
| Column | Type | Notes |
|---|---|---|
| `role_id` | INT FK → roles | |
| `permission_id` | INT FK → permissions | |

---

### Skates

#### `skates`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `skate_code` | VARCHAR(50) UNIQUE | e.g., "SK-023" |
| `qr_code` | VARCHAR(255) | QR payload |
| `barcode` | VARCHAR(255) | Barcode value |
| `size` | VARCHAR(20) | e.g., "42" |
| `type` | VARCHAR(50) | From config |
| `status` | ENUM | `available`, `rented`, `reserved`, `maintenance`, `damaged`, `lost` |
| `condition` | ENUM | `good`, `fair`, `poor` |
| `purchase_date` | DATE | |
| `purchase_cost` | DECIMAL(10,2) | |
| `is_active` | BOOLEAN | Soft disable |
| `notes` | TEXT | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

---

### Customers

#### `customers`

> [!NOTE]
> **IMPLEMENTED** — Phase 04. `is_active` column added per DEC-052 (approved deviation from original target schema).

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(255) | |
| `national_id` | VARCHAR(50) | Sensitive — indexed |
| `phone` | VARCHAR(20) | |
| `registration_date` | DATE | |
| `notes` | TEXT | |
| `is_active` | BOOLEAN NOT NULL DEFAULT TRUE | Phase 04 addition — DEC-052. `false` = deactivated customer. Deactivated customers excluded from search and cannot start new rentals (DEC-052). |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

---

### Rentals

#### `rentals`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `rental_code` | VARCHAR(50) UNIQUE | Human-readable ID |
| `skate_id` | INT FK → skates | |
| `customer_id` | INT FK → customers | |
| `cashier_id` | INT FK → users | |
| `shift_id` | INT FK → cashier_shifts NULL | Nullable until Phase 12 — DEC-063. FK enforcement deferred to Phase 12 migration. |
| `duration_minutes` | INT | Planned duration |
| `price_per_hour` | DECIMAL(10,2) | Historical snapshot — immutable after creation (DEC-065) |
| `rental_amount` | DECIMAL(10,2) | Historical snapshot — immutable after creation (DEC-065). Formula: `hourly_rate x duration_minutes / 60` |
| `started_at` | DATETIME | Server-generated at activation — not user-supplied |
| `expected_end_at` | DATETIME | Stored: `started_at + duration_minutes` (DEC-010) |
| `returned_at` | DATETIME NULL | Phase 07 sets this on return |
| `status` | ENUM | `active`, `returned`, `cancelled` — DEC-064. `late`/`overdue` are computed display states, NOT persisted. |
| `notes` | TEXT | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

#### `rental_payments`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `rental_id` | INT FK → rentals | |
| `payment_method_id` | INT FK → payment_methods | |
| `amount` | DECIMAL(10,2) | |
| `treasury_account_id` | INT FK → treasury_accounts | |
| `payment_type` | ENUM | `rental`, `late_fee`, `damage_charge` |
| `created_at` | DATETIME | |

#### `late_fee_records`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `rental_id` | INT FK → rentals | |
| `late_minutes` | INT | |
| `calculated_fee` | DECIMAL(10,2) | |
| `collected_fee` | DECIMAL(10,2) | |
| `waived_fee` | DECIMAL(10,2) | |
| `waived_by` | INT FK → users NULL | |
| `waiver_reason` | TEXT | |
| `waived_at` | DATETIME NULL | |
| `created_at` | DATETIME | |

---

### Inspections

#### `inspections`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `rental_id` | INT FK → rentals NULL | Linked to return |
| `skate_id` | INT FK → skates | |
| `inspected_by` | INT FK → users | |
| `wheels_condition` | ENUM | `good`, `minor_damage`, `damaged`, `broken` |
| `brake_condition` | ENUM | Same values |
| `strap_condition` | ENUM | Same values |
| `bearings_condition` | ENUM | Same values |
| `body_condition` | ENUM | Same values |
| `other_notes` | TEXT | |
| `maintenance_required` | BOOLEAN | |
| `created_at` | DATETIME | |

---

### Damage

#### `damage_reports`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `skate_id` | INT FK → skates | |
| `inspection_id` | INT FK → inspections NULL | |
| `customer_id` | INT FK → customers NULL | |
| `reported_by` | INT FK → users | |
| `damage_type` | VARCHAR(50) | From config |
| `severity` | ENUM | `minor`, `moderate`, `severe` |
| `description` | TEXT | |
| `photo_path` | VARCHAR(500) NULL | |
| `customer_charge` | DECIMAL(10,2) | 0 if no charge |
| `charge_collected` | DECIMAL(10,2) | |
| `charge_waived` | DECIMAL(10,2) | |
| `waived_by` | INT FK → users NULL | |
| `waiver_reason` | TEXT | |
| `maintenance_required` | BOOLEAN | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

---

### Maintenance

#### `maintenance_records`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `skate_id` | INT FK → skates | |
| `damage_report_id` | INT FK → damage_reports NULL | |
| `created_by` | INT FK → users | |
| `completed_by` | INT FK → users NULL | |
| `problem_description` | TEXT | |
| `repair_description` | TEXT | |
| `labor_cost` | DECIMAL(10,2) | |
| `parts_cost` | DECIMAL(10,2) | |
| `total_cost` | DECIMAL(10,2) | Computed or stored |
| `status` | ENUM | `pending`, `in_progress`, `completed` |
| `started_at` | DATETIME NULL | |
| `completed_at` | DATETIME NULL | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

#### `maintenance_parts`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `maintenance_id` | INT FK → maintenance_records | |
| `part_name` | VARCHAR(255) | |
| `quantity` | INT | |
| `unit_cost` | DECIMAL(10,2) | |
| `total_cost` | DECIMAL(10,2) | |

---

### Reservations

#### `reservations`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `customer_id` | INT FK → customers | |
| `skate_id` | INT FK → skates NULL | Specific skate or general |
| `skate_size` | VARCHAR(20) NULL | If not specific skate |
| `reserved_from` | DATETIME | |
| `reserved_until` | DATETIME | |
| `status` | ENUM | `pending`, `confirmed`, `cancelled`, `fulfilled` |
| `created_by` | INT FK → users | |
| `notes` | TEXT | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

---

### Sales POS

#### `sales`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `sale_code` | VARCHAR(50) UNIQUE | |
| `customer_id` | INT FK → customers NULL | Optional |
| `cashier_id` | INT FK → users | |
| `shift_id` | INT FK → cashier_shifts NULL | |
| `total_amount` | DECIMAL(10,2) | |
| `status` | ENUM | `completed`, `cancelled` |
| `notes` | TEXT | |
| `created_at` | DATETIME | |

#### `sale_items`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `sale_id` | INT FK → sales | |
| `product_id` | INT FK → products | |
| `quantity` | INT | |
| `unit_price` | DECIMAL(10,2) | At time of sale |
| `total_price` | DECIMAL(10,2) | |

#### `sale_payments`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `sale_id` | INT FK → sales | |
| `payment_method_id` | INT FK → payment_methods | |
| `amount` | DECIMAL(10,2) | |
| `treasury_account_id` | INT FK → treasury_accounts | |
| `created_at` | DATETIME | |

---

### Products

#### `product_categories`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(100) | |
| `name_ar` | VARCHAR(100) | |

#### `products`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(255) | |
| `name_ar` | VARCHAR(255) | |
| `category_id` | INT FK → product_categories | |
| `barcode` | VARCHAR(255) NULL | |
| `price` | DECIMAL(10,2) | |
| `stock_quantity` | INT | |
| `is_active` | BOOLEAN | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

---

### Treasury

#### `treasury_accounts`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(100) | e.g., "Cash", "Bank" |
| `name_ar` | VARCHAR(100) | |
| `type` | ENUM | `cash`, `bank`, `card`, `digital` |
| `current_balance` | DECIMAL(12,2) | Maintained via movements |
| `is_active` | BOOLEAN | |
| `created_at` | DATETIME | |

#### `treasury_movements`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `account_id` | INT FK → treasury_accounts | |
| `direction` | ENUM | `in`, `out` |
| `amount` | DECIMAL(10,2) | |
| `movement_type` | ENUM | `rental_payment`, `sale_payment`, `late_fee`, `damage_charge`, `expense`, `refund`, `adjustment` |
| `reference_type` | VARCHAR(50) | `rental`, `sale`, `expense`, etc. |
| `reference_id` | INT | FK to the referenced entity |
| `description` | TEXT | |
| `created_by` | INT FK → users | |
| `created_at` | DATETIME | |

---

### Expenses

#### `expense_categories`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(100) | |
| `name_ar` | VARCHAR(100) | |
| `is_active` | BOOLEAN | |

#### `expenses`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `category_id` | INT FK → expense_categories | |
| `amount` | DECIMAL(10,2) | |
| `description` | TEXT | |
| `payment_account_id` | INT FK → treasury_accounts | |
| `receipt_path` | VARCHAR(500) NULL | |
| `expense_date` | DATE | |
| `created_by` | INT FK → users | |
| `shift_id` | INT FK → cashier_shifts NULL | |
| `created_at` | DATETIME | |

---

### Cashier Shifts

#### `cashier_shifts`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `cashier_id` | INT FK → users | |
| `opened_at` | DATETIME | |
| `closed_at` | DATETIME NULL | |
| `opening_cash` | DECIMAL(10,2) | |
| `expected_cash` | DECIMAL(10,2) NULL | Calculated at close |
| `actual_cash` | DECIMAL(10,2) NULL | Entered at close |
| `cash_difference` | DECIMAL(10,2) NULL | actual - expected |
| `status` | ENUM | `open`, `closed` |
| `notes` | TEXT | |

---

### Settings / Configuration

#### `settings`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `key` | VARCHAR(100) UNIQUE | |
| `value` | TEXT | |
| `label_ar` | VARCHAR(255) | Human label |
| `updated_at` | DATETIME | |
| `updated_by` | INT FK → users | |

#### `payment_methods`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(50) | e.g., "Cash" |
| `name_ar` | VARCHAR(100) | |
| `treasury_account_id` | INT FK → treasury_accounts | |
| `is_active` | BOOLEAN | |

---

### Audit Log

#### `audit_log`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `user_id` | INT FK → users NULL | NULL for system actions |
| `action` | VARCHAR(100) | e.g., `waive_late_fee`, `start_rental` |
| `entity_type` | VARCHAR(50) | e.g., `rental`, `skate` |
| `entity_id` | INT NULL | |
| `old_value` | JSON NULL | Before state |
| `new_value` | JSON NULL | After state |
| `ip_address` | VARCHAR(50) NULL | |
| `notes` | TEXT | |
| `created_at` | DATETIME | |

---

### Notifications

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `user_id` | INT FK → users NULL | NULL = broadcast |
| `type` | VARCHAR(50) | e.g., `rental_expiring` |
| `title_ar` | VARCHAR(255) | |
| `body_ar` | TEXT | |
| `reference_type` | VARCHAR(50) NULL | |
| `reference_id` | INT NULL | |
| `is_read` | BOOLEAN | |
| `created_at` | DATETIME | |

---

## Key Business Invariants

These are database-level constraints that must be enforced:

1. A rental cannot reference a skate with status not `available` (application-level + transaction lock)
2. `rentals.rental_amount` stores the amount at time of rental (immutable after creation)
3. `late_fee_records.calculated_fee = collected_fee + waived_fee`
4. `cashier_shifts` can only have one `open` shift per cashier at a time
5. `reservations` for the same skate cannot overlap (application-level + unique constraint candidate)

---

## Migrations

**Status:** CONFIGURED (Phase 01) — ready for first business migration in Phase 02  
**Tool:** Drizzle Kit (DEC-022)  
**Config file:** `apps/api/drizzle.config.ts`  
**Schema entry point:** `apps/api/src/db/schema/index.ts`  
**Output directory:** `apps/api/src/db/migrations/`

All schema changes must be managed via Drizzle Kit migrations. No manual schema editing in production.

> [!NOTE]
> Phase 01 creates no tables. The first migration (users, roles, permissions) runs in Phase 02.

---

## Seed Data

**Status:** PLANNED

Initial seed data should include:
- Default roles (Administrator, Cashier, Maintenance Staff)
- Default permissions
- Default expense categories
- Default payment methods (Cash, Card, InstaPay, Vodafone Cash)
- Default treasury accounts (Cash, Card, InstaPay, Vodafone Cash)
- Default settings (rental price, late fee per minute)

---

*Last updated: 2026-09-09 (Phase 01 final gate)*

## Current Treasury read model — 2026-10-15

The implemented `schema/payments.ts` uses `treasury_accounts.balance DECIMAL(12,2)` (stored balance), `is_cash_drawer`, payment-method account mappings and signed `treasury_movements`. The new summary computes movement net per account in one consistent SQL read and compares it with the stored value; it neither reconstructs opening money nor rewrites history. Totals are aggregated as integer piastres and returned as decimal strings. No development/production schema change was needed.

Historical 2026-10-15 result: the isolated test database required schema-only alignment to existing multi-skate source, and the 0020 mismatch was then unresolved. The 2026-10-16 section below records the approved repair and its limits. Earlier evidence remains in [Treasury available balance verification](../quality/TREASURY_AVAILABLE_BALANCE.md).

## Implemented sub-treasury schema and historical reconciliation — 2026-10-16

Owner-approved ST-01–06 in [CR-SUB-TREASURY-2026-10-15](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md) are implemented. This section supersedes the historical Treasury/Shift target tables above where they differ. `shift_treasury_snapshots` remains unimplemented.

Every cash/electronic account has an independent `treasury_accounts.balance DECIMAL(12,2)` and signed movement ledger. The designated main cash account is a transfer endpoint, not a parent balance that includes drawers. Cashier assignments reuse the existing account model; electronic payment methods retain their independent configured accounts.

| Schema location | Current implementation |
|---|---|
| `schema/payments.ts` | Existing accounts/methods/movements plus `account_role`; movement amount widened to DECIMAL(12,2), nullable `transfer_id`/`transfer_leg`, cash-classification snapshot and transfer/variance reference types. Unique transfer/leg prevents duplicate ledger legs. |
| `schema/treasury.ts` | Existing shifts/expenses; managed shifts add nullable account/assignment, immutable Cairo opening business date, entered opening count, separate ledger opening/closing expectation, declaration and closing actor. Generated `active_cashier_id` uniquely guards managed active sessions only. |
| `schema/payments.ts` (rental payments) | Nullable actual posting-account FK; historical nulls are retained. |
| `schema/subtreasury.ts` | `treasury_configuration`, `treasury_assignments`, `treasury_funding`, `treasury_handovers`, `treasury_transfers`, `treasury_settlements`, `financial_operations`. |

Assignments uniquely bind one persistent account and cashier. Funding is `pending` → `accepted` or `cancelled`; only acceptance posts paired transfer legs. Handover attempts are `pending` → `rejected`, `confirmed` or `zero_acknowledged`. Replacement appends a linked attempt and retains original closing counts. Transfers exist only when completed atomically; zero acknowledgment has a settlement without a fictitious zero transfer.

Database uniqueness protects one attempt number per shift, one settlement per shift/handover, one transfer per funding/handover, each transfer leg, and each actor/scope/operation key. Transactions serialize the configuration gate, actor/session/source records and account balances; account locks use ascending IDs. Financial mutations and their mandatory audit records commit together. Persisted request hash/results make identical logical retries return the original outcome and changed-payload key reuse conflict.

Opening count creates no ledger entry. Expected counted cash uses the opening count plus subsequent cash movements; ledger due uses the opening ledger snapshot plus those movements. Closing freezes the drawer and records a pending declaration, changing no treasury balance. Explicit permitted manager receipt posts any approved signed variance plus the paired handover transfer atomically. Recorded confirmation is a user attestation, not independent physical verification.

Migration 0020 is now registered and schema-only, without inferred historical rental items or duplicate `started_at`. Migration 0021 adds the model and approved permissions with configuration disabled by default; no main account, assignments, funding, historical handovers or custody redistribution is inferred. Historical values and nullable links remain unchanged. Legacy active sessions must close before explicit activation; new accounts start at zero.

Guarded fresh/legacy/partial/aligned migration and activation checks passed on dedicated test/disposable databases. MySQL DDL is non-atomic; reviewed partial recovery validates actual definitions and original rows before journaling. See [migration implementation, results and limits](../quality/SUB_TREASURY_MIGRATION.md), including the initial overlength FK failure and shared-test forward recovery. Development/production databases were not migrated.
