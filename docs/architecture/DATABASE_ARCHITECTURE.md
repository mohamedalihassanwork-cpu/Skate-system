# Database Architecture — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** PLANNED — No database or schema exists yet.  
**Last updated:** 2026-09-09

> [!IMPORTANT]
> No database implementation exists. This document describes the intended target schema derived from the Master Business Specification. All tables and columns are PLANNED.

---

## Database Engine

**Target:** MySQL 8.x or MariaDB 10.x (InnoDB engine)  
**Status:** PLANNED — pending technology decision (DEC-014)

**Required features:**
- InnoDB storage engine (transactions, foreign keys)
- UTF-8 charset (`utf8mb4`) for Arabic text support
- Transaction support for financial operations
- Foreign key constraints

---

## Connection Architecture

**Target:**
- Connection pool managed by ORM/driver
- Separate read replica: NOT required at this stage
- Connection string via environment variable (`DATABASE_URL`)

**Status:** PLANNED

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
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(255) | |
| `national_id` | VARCHAR(50) | Sensitive — indexed |
| `phone` | VARCHAR(20) | |
| `registration_date` | DATE | |
| `notes` | TEXT | |
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
| `shift_id` | INT FK → cashier_shifts | |
| `duration_minutes` | INT | Planned duration |
| `price_per_hour` | DECIMAL(10,2) | Price at time of rental |
| `rental_amount` | DECIMAL(10,2) | Calculated at rental start |
| `started_at` | DATETIME | Actual start time |
| `expected_end_at` | DATETIME | Calculated from started_at + duration |
| `returned_at` | DATETIME NULL | Actual return time |
| `status` | ENUM | `active`, `returned`, `late`, `cancelled` |
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

**Status:** PLANNED  
**Tool:** TBD (Prisma Migrate / Knex migrations / TypeORM migrations)

All schema changes must be managed via migrations. No manual schema editing in production.

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

*Last updated: 2026-09-09*
