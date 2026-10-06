# Phase 05 — Rental POS Core

**Status:** FINAL GATE PASSED ✅ — Phase 05 implementation COMPLETE. Closure Gate passed 2026-09-21.  
**Version:** 1.2  
**Last updated:** 2026-09-21 (Closure Gate — FINAL GATE PASSED. Final Verification Gate: 170/170 tests, 0 TS errors, build clean, schema clean. DEC-060 through DEC-070 all documented. Operational status boundary: strict `>` for overdue per DEC-066. Rental Code: insertId-based per DEC-070. Duration config: no runtime fallback per DEC-070. All VG1/VG2 findings resolved.)

---

## Objective

Implement the core rental domain for KOSHK SKATE ERP:

- **Rental creation** (Rental POS flow)
- **Active rental monitoring** (server-authoritative statuses)
- **Rental history** (list, detail, customer rental history per DEC-055)
- **Settings infrastructure** for rental pricing configuration (DEC-061)

This phase establishes the rental domain foundation. Later phases extend it: Phase 06 adds payment recording, Phase 07 adds returns and late fees.

---

## Dependencies

| Dependency | Status | Evidence |
|---|---|---|
| Phase 02 — Auth/RBAC | FINAL GATE PASSED | JWT middleware, `requirePermission`, all rental permissions seeded in `seed.ts` |
| Phase 03 — Skates | FINAL GATE PASSED | `skates` table, availability filter, skate status management |
| Phase 04 — Customers | FINAL GATE PASSED | `customers` table, search, `is_active` filter, inline creation |
| Rental permissions (`rentals.view`, `rentals.create`, `rentals.return`, `waivers.approve`) | SEEDED | `seed.ts` lines 30-34; Cashier assigned `rentals.view/create/return` |
| Design System | VERIFIED | `design-system.css`, `COMPONENT_LIBRARY.md`, UI-001 through UI-011 rules |

---

## DESIGN SYSTEM INHERITANCE

> [!IMPORTANT]
> This section is mandatory per UI-011 (AI_AGENT_RULES.md).
> This phase inherits the current approved KOSHK design system.
> It MUST NOT introduce a separate visual language.

This phase inherits:

- **KOSHK Visual Design Reference** — brand identity
- **DESIGN_SYSTEM.md** — approved design tokens and UI standards
- **COMPONENT_LIBRARY.md** — approved reusable components
- **Approved UI Governance** (UI-001 through UI-011 — AI_AGENT_RULES.md)
- **Approved RTL behavior** (DEC-001)
- **Approved accessibility rules** (DESIGN_SYSTEM.md §11)
- **Approved responsive/mobile rules** (DESIGN_SYSTEM.md §16)
- **Approved semantic color system** (DEC-034, DEC-041)
- **Approved Badge status API** (DEC-043; extended in Phase 05 per DEC-064)
- **Approved typography** (Cairo, design-system.css §3)
- **Approved spacing and radius system** (design-system.css §4-5)
- **Approved motion rules** (AN-001 through AN-014; AN-012/AN-013 PERMANENTLY DEFERRED — DEC-044)
- **Approved currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Approved component APIs** from the existing shared component library

### Reuse Before Creating

Before creating any new UI component:

1. Check `COMPONENT_LIBRARY.md`.
2. Check the existing implementation in `apps/web/src/components/ui/`.
3. Reuse an existing component when possible.
4. Extend an existing component when appropriate.
5. Create a new component only when the existing library cannot reasonably satisfy the requirement.
6. New components must follow the existing KOSHK Design System.
7. Genuinely reusable new components must be added to `COMPONENT_LIBRARY.md`.

### Design Authority

The authority order for UI decisions in this phase is:

1. Owner-approved KOSHK decisions
2. KOSHK Visual Design Reference
3. DESIGN_SYSTEM.md
4. COMPONENT_LIBRARY.md
5. Approved UI Governance (AI_AGENT_RULES.md)
6. Existing verified implementation
7. UI/UX Pro Max recommendations *(advisory only — cannot override higher authorities)*
8. AI assumptions *(lowest priority — must be escalated if significant)*

No deviation from a higher-level authority is permitted without explicit owner approval and a DECISION_LOG.md entry.

---

## Scope

### In Scope — Phase 05

#### Database
- `rentals` table (full schema per Section: Database Contract)
- `settings` table (shared infrastructure — rental configuration only, per DEC-061)
- Drizzle migrations for both tables
- Seed: `rental_hourly_rate = 120` EGP/hr (DEC-068), `rental_duration_options = [15, 30, 45, 60, 90]`

#### Backend
- `apps/api/src/db/schema/rentals.ts` — Drizzle schema
- `apps/api/src/db/schema/settings.ts` — Drizzle schema (minimal, rental config only)
- `apps/api/src/modules/rentals/rentals.types.ts`
- `apps/api/src/modules/rentals/rentals.service.ts`
- `apps/api/src/modules/rentals/rentals.routes.ts`
- Registration in `apps/api/src/app.ts`
- `GET /api/v1/customers/:id/rentals` — customer rental history endpoint (DEC-055)

#### Frontend
- `apps/web/src/modules/rentals/` — module directory
- Rental POS multi-step flow
- Active Rentals page
- Rental Detail (read-only)
- Customer rental history section in `CustomerProfilePage.tsx` (DEC-055)
- Route registration in `App.tsx`
- Sidebar navigation update (Rentals nav item, Lucide `Ticket` icon)

#### Component Extensions
- `Badge.tsx` — add `'completed'`, `'overdue'`, `'cancelled'` to `BadgeStatus` union (DEC-064)
- `Select` in `FormFields.tsx` — evaluate SYS-011 during implementation
- `RadioGroup` — evaluate SYS-012 during implementation; if created, it becomes a shared component

#### Quality
- Integration tests for all rental business rules
- RBAC/permission tests
- Concurrency tests
- RTL and mobile verification
- Full regression suite (all 96 existing tests must remain passing)

#### Documentation
- `RENTALS.md` updated to IMPLEMENTED after implementation
- `PROJECT_STATE.md`, `PROJECT_MAP.md`, `CHANGELOG.md` updated after implementation
- `DECISION_LOG.md` — DEC-060 through DEC-069 recorded (DEC-060 to DEC-065 in specification step; DEC-066 to DEC-069 in closure step)

### Out of Scope — Phase 05

| Feature | Belongs To |
|---|---|
| Payment recording of any kind | Phase 06 |
| `payment_methods` table | Phase 06 |
| `rental_payments` table | Phase 06 |
| `treasury_accounts` table | Phase 06 |
| Treasury movements | Phase 06 |
| Split payments | Phase 06 |
| Payment collection UI | Phase 06 |
| `POST /api/v1/rentals/:id/return` | Phase 07 |
| Return workflow | Phase 07 |
| Late fee calculation and collection | Phase 07 |
| `late_fee_records` table | Phase 07 |
| Late fee waiver | Phase 07 |
| `POST /api/v1/rentals/:id/waive-late-fee` | Phase 07 |
| Skate inspection | Phase 07 |
| Damage reports linked to rentals | Phase 08 |
| Maintenance workflow | Phase 09 |
| Reservation conflict checking at rental start | Phase 10 |
| Sales POS | Phase 11 |
| Cashier shifts / `cashier_shifts` table | Phase 12 |
| Rental expiry notification subsystem | Phase 15 |
| One-minute-before alert logic | Phase 15 |
| Invoice and printing | Phase 14 |
| Settings administration UI | Future Settings phase |
| `GET /api/v1/settings` or `PUT /api/v1/settings` endpoints | Future Settings phase |
| Reports | Phase 13 |

> [!IMPORTANT]
> Phase 06 will extend `startRental()` to add payment recording. The Phase 05 `startRental()` creates the rental record and transitions skate to `rented` but does NOT create any payment record. This is the approved phase boundary per DEC-060.

---

## Business Rules

### Inviolable Rules (SOURCE_OF_TRUTH.md)

| Rule ID | Rule |
|---|---|
| BR-01 | An unavailable skate cannot be rented. Skate must be status `available`. |
| BR-02 | One skate cannot be rented to two customers simultaneously. |
| BR-03 | A skate in Maintenance status cannot be rented. |
| BR-04 | Rental price comes from configured business rules — never hardcoded. |
| BR-05 | Expected end time derives from actual start time + duration. |
| BR-10 | Concurrent rental of same skate must be prevented at DB level. |
| BR-11 | Historical rental amounts are immutable after creation. |
| BR-12 | Rental records must be retained — no hard delete. |
| BR-13 | Rental state must not depend only on a browser timer. |
| BR-14 | Permissions must be enforced server-side. |

### Approved Phase 05 Rules

| Rule ID | Rule | Source |
|---|---|---|
| BR-15 | `raw_amount = hourly_rate x duration_minutes / 60`; `rental_amount = round(raw_amount to nearest whole EGP, .5 rounds up)` | DEC-065, DEC-067 |
| BR-16 | `price_per_hour` stored at creation as historical snapshot | DEC-065 |
| BR-17 | `rental_amount` stored at creation and immutable (whole EGP) | DEC-065, DEC-067 |
| BR-18 | Skate transitions `available` to `rented` on rental creation | Spec §13, DEC-031 |
| BR-19 | `started_at` is server-generated — not user-supplied | Spec §13 |
| BR-20 | `expected_end_at = started_at + duration_minutes` — stored in DB | Spec §49 Rule 5, DEC-010 |
| BR-21 | Rental code format is `RN-NNNNN`, sequential, never reused | DEC-062 |
| BR-22 | Persisted lifecycle statuses: `active`, `returned`, `cancelled` only | DEC-064 |
| BR-23 | Display statuses computed server-side from timestamps — never stored | DEC-064, DEC-066 |
| BR-24 | Deactivated customers (`is_active = false`) cannot start a new rental | DEC-052 |
| BR-25 | Standard durations: 15, 30, 45, 60, 90 minutes and custom | Spec §11, DEC-069 |
| BR-26 | Duration options come from configuration — not hardcoded | Spec §48, DEC-065 |
| BR-27 | Custom duration uses the same proportional pricing formula; must be > 0; no maximum | DEC-065, DEC-069 |
| BR-28 | `shift_id` is nullable in Phase 05 — NULL until Phase 12 | DEC-063 |
| BR-29 | No payment record is created in Phase 05 | DEC-060 |
| BR-30 | Rental POS shows calculated amount to cashier before activation | Spec §13, DEC-060 |
| BR-31 | Ending Soon threshold: remaining_time <= 5 minutes AND > 0 | DEC-066 |
| BR-32 | Initial configured hourly rate: 120 EGP (read from settings — not hardcoded) | DEC-068 |

---

## Database Contract

### Table: `rentals`

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | INT | PK AUTO_INCREMENT | |
| `rental_code` | VARCHAR(50) | UNIQUE NOT NULL | Format: `RN-NNNNN` — DEC-062 |
| `skate_id` | INT | FK skates(id) NOT NULL | |
| `customer_id` | INT | FK customers(id) NOT NULL | |
| `cashier_id` | INT | FK users(id) NOT NULL | Authenticated user at rental creation |
| `shift_id` | INT | NULL | Nullable — DEC-063. FK to cashier_shifts(id) deferred to Phase 12 |
| `duration_minutes` | INT | NOT NULL | Planned rental duration in minutes |
| `price_per_hour` | DECIMAL(10,2) | NOT NULL | Historical snapshot — immutable after creation |
| `rental_amount` | DECIMAL(10,2) | NOT NULL | Historical snapshot — immutable after creation |
| `started_at` | DATETIME | NOT NULL | System-generated at activation |
| `expected_end_at` | DATETIME | NOT NULL | Stored: started_at + duration_minutes |
| `returned_at` | DATETIME | NULL | Phase 07 sets this |
| `status` | ENUM | NOT NULL DEFAULT 'active' | Values: 'active', 'returned', 'cancelled' — DEC-064 |
| `notes` | TEXT | NULL | |
| `created_at` | DATETIME | NOT NULL | |
| `updated_at` | DATETIME | NOT NULL | |

**FK note for `shift_id`:** The `cashier_shifts` table does not exist in Phase 05. The Drizzle schema must define `shift_id` as an integer nullable column without a FK reference to `cashier_shifts` in Phase 05. The FK constraint will be added in Phase 12 migration. Document this as TD-RENT-01.

**Indexes:**
- UNIQUE on `rental_code`
- INDEX on `skate_id`
- INDEX on `customer_id`
- INDEX on `cashier_id`
- INDEX on `status`
- INDEX on `expected_end_at`
- INDEX on `started_at`

**Immutability:** `price_per_hour` and `rental_amount` are never updated after creation. No service method may modify these fields.

---

### Table: `settings`

Created in Phase 05 as shared infrastructure per DEC-061. Follows DATABASE_ARCHITECTURE.md target schema.

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | INT | PK AUTO_INCREMENT | |
| `key` | VARCHAR(100) | UNIQUE NOT NULL | Configuration key |
| `value` | TEXT | NOT NULL | String-encoded value |
| `label_ar` | VARCHAR(255) | NOT NULL | Arabic human-readable label |
| `updated_at` | DATETIME | NOT NULL | |
| `updated_by` | INT | FK users(id) NULL | NULL for system-seeded values |

**Phase 05 seeded keys:**

| Key | label_ar | Initial value | Source |
|---|---|---|---|
| `rental_hourly_rate` | سعر الإيجار بالساعة | `"120"` (120 EGP/hr) | DEC-068 — approved initial value |
| `rental_duration_options` | خيارات مدة الإيجار بالدقائق | `"[15, 30, 45, 60, 90]"` | DEC-069 — standard durations |

> [!NOTE]
> `rental_hourly_rate = 120` is the approved initial configured business value (DEC-068). It must be read from the `settings` table at runtime — it must NOT be hardcoded in application source.

**How `RentalService` reads the hourly rate:**
```typescript
const rateSetting = await db.select().from(settings)
  .where(eq(settings.key, 'rental_hourly_rate')).limit(1)
if (!rateSetting.length) throw new Error('PRICING_CONFIG_MISSING')
const hourlyRate = parseFloat(rateSetting[0].value)
```

---

## Rental Code Generation

Per DEC-062 as amended by DEC-070: Format `RN-NNNNN`, derived from the inserted Rental row's auto-increment `insertId`.

**Algorithm (DEC-070):**
1. Inside `startRental()`, INSERT the rental row with a temporary unique placeholder `rental_code` (e.g., `TEMP-<timestamp>-<random>`) to obtain the auto-increment ID
2. Read `insertResult.insertId` — the auto-increment PK of the newly inserted row
3. Derive the final Rental Code: `'RN-' + String(insertId).padStart(5, '0')`
4. UPDATE the rental row within the same transaction: `SET rental_code = finalCode WHERE id = insertId`
5. COMMIT

**Why not MAX+1:**
The original DEC-062 algorithm used `SELECT MAX(CAST(SUBSTRING(rental_code, 4) AS UNSIGNED)) + 1`. This creates a race condition when two concurrent transactions for **different skates** both read the same MAX before either commits, causing a UNIQUE constraint collision even when no business conflict exists. The Owner approved the insertId strategy via DEC-070.

**Gaps are explicitly allowed (DEC-070):**
If a transaction is rolled back after an INSERT, the auto-increment ID is consumed by InnoDB and not returned. This creates gaps in Rental Code numbering. Example: `RN-00025`, `RN-00026`, `RN-00028` — `RN-00027` missing because it was allocated to a rolled-back transaction. Gaps must NOT be backfilled.

**Format:** `RN-NNNNN` — prefix `RN-`, minimum 5-digit zero-padding. Values above 99999 extend naturally (e.g., `RN-100000`).

---

## Pricing Model

Per DEC-065.

**Formula (DEC-065, DEC-067):**
```
raw_amount = hourly_rate × duration_minutes / 60
rental_amount = Math.round(raw_amount)   // nearest whole EGP; .5 rounds up
```

**Rounding rule (DEC-067):** Round to the nearest whole EGP. Values exactly at `.5` round up. Examples:
- `83.33` → `83` EGP
- `83.49` → `83` EGP
- `83.50` → `84` EGP
- `83.67` → `84` EGP
- `60.00` → `60` EGP (30 min at 120 EGP/hr — exact, no rounding needed)

**Initial hourly rate (DEC-068):** `120 EGP/hr` — seeded in `settings` table. Read at runtime. Never hardcoded.

**Server authority:** Server calculates the authoritative `rental_amount`. The client requests a preview via `/calculate-price` and displays it; the final amount is always server-calculated.

**At rental creation:**
1. Read `rental_hourly_rate` from `settings` table (DEC-068: initially 120 EGP)
2. `raw_amount = hourlyRate × durationMinutes / 60`
3. `rental_amount = Math.round(raw_amount)` — whole EGP, .5 rounds up (DEC-067)
4. Store `price_per_hour = hourlyRate` (snapshot)
5. Store `rental_amount` (snapshot)
6. Both are immutable

---

## Concurrency Strategy

### Same-Skate Double-Rental Prevention

The availability check and `available -> rented` transition are atomic inside one DB transaction:

```
BEGIN TRANSACTION
  SELECT id, status FROM skates WHERE id = :skateId FOR UPDATE
  IF status != 'available' THEN RAISE 422 SKATE_NOT_AVAILABLE
  INSERT INTO rentals (...)
  UPDATE skates SET status = 'rented', updated_at = NOW() WHERE id = :skateId
COMMIT
```

The `FOR UPDATE` row lock prevents two concurrent cashiers from renting the same skate simultaneously.

### Rental Code Concurrency

The `rental_code` is derived from the auto-increment `insertId` (DEC-070). The `insertId` is assigned atomically by InnoDB — no two concurrent INSERTs ever share an `insertId`. This guarantees unique rental codes without requiring a read-then-write MAX+1 operation inside the transaction.

The UNIQUE constraint on `rental_code` remains as the final database-level safety net.

### Application Pre-Check

`startRental()` may perform an application-layer status check before the transaction for better error messaging. This pre-check alone is never sufficient — the authoritative check is always inside the transaction with `FOR UPDATE`.

---

## API Contract

### Route Registration Order (critical)

Register in `rentals.routes.ts` in this order to prevent path conflicts:

1. `GET  /rentals/active`
2. `GET  /rentals/calculate-price`
3. `GET  /rentals`
4. `POST /rentals`
5. `GET  /rentals/:id`

---

### POST /api/v1/rentals — Start Rental

**Permission:** `rentals.create`

**Request Body:**
```json
{
  "skateId": 5,
  "customerId": 12,
  "durationMinutes": 30,
  "notes": "ملاحظة اختيارية"
}
```

**Validation:**
- `skateId` — required integer > 0
- `customerId` — required integer > 0
- `durationMinutes` — required integer > 0
- `notes` — optional string, max 1000 characters

**Business Logic:**
1. Validate fields
2. Verify skate exists (404 if not)
3. Verify customer exists (404 if not)
4. Verify customer `is_active = true` (422 if not)
5. BEGIN TRANSACTION with `SELECT ... FOR UPDATE` on skate
6. Verify skate `status = 'available'` (422 if not)
7. Read `rental_hourly_rate` from settings (422 if missing)
8. `raw = hourlyRate × durationMinutes / 60`; `rental_amount = Math.round(raw)` — whole EGP, .5 rounds up (DEC-067)
9. Derive `rental_code` from `insertId` using `'RN-' + String(insertId).padStart(5, '0')` (DEC-070)
10. `started_at = NOW()`
11. `expected_end_at = started_at + INTERVAL durationMinutes MINUTE`
12. INSERT into `rentals`
13. UPDATE skate `status = 'rented'`
14. COMMIT
15. Return full rental object

**Success:** HTTP 201
```json
{
  "success": true,
  "data": {
    "id": 1,
    "rentalCode": "RN-00001",
    "skate": { "id": 5, "skateCode": "SK-005", "size": "42", "type": "inline" },
    "customer": { "id": 12, "name": "...", "phone": "...", "nationalIdMasked": "****1234" },
    "cashier": { "id": 3, "name": "كاشير النظام" },
    "durationMinutes": 30,
    "pricePerHour": 120.00,
    "rentalAmount": 60.00,
    "startedAt": "2026-09-21T15:00:00.000Z",
    "expectedEndAt": "2026-09-21T15:30:00.000Z",
    "returnedAt": null,
    "status": "active",
    "notes": null,
    "createdAt": "2026-09-21T15:00:00.000Z"
  }
}
```

**Business Errors:**

| HTTP | Code | Arabic Message |
|---|---|---|
| 404 | `SKATE_NOT_FOUND` | الاسكيت غير موجودة |
| 404 | `CUSTOMER_NOT_FOUND` | العميل غير موجود |
| 422 | `SKATE_NOT_AVAILABLE` | الاسكيت غير متاحة للاستئجار |
| 422 | `CUSTOMER_INACTIVE` | لا يمكن إنشاء إيجار لعميل معطل |
| 422 | `INVALID_DURATION` | مدة الإيجار غير صالحة |
| 422 | `PRICING_CONFIG_MISSING` | إعدادات التسعير غير متوفرة |

---

### GET /api/v1/rentals/active — Active Rentals

**Permission:** `rentals.view`  
**Note:** Must be registered BEFORE `GET /api/v1/rentals/:id`

**Business Logic:**
1. Query `rentals WHERE status = 'active'`
2. Compute `operationalStatus` server-side from `NOW()` vs `expected_end_at` (DEC-064, DEC-066):
   - `NOW() > expected_end_at` → `'overdue'` (strictly greater-than; at exact equality the rental is NOT overdue)
   - `remainingMinutes <= 5 AND remainingMinutes > 0` → `'ending_soon'` (5-minute threshold — DEC-066)
   - `remainingMinutes = 0` at exact equality → `'ending_soon'` (not yet overdue)
   - Otherwise → `'normal'`
3. Compute `remainingMinutes = GREATEST(0, TIMESTAMPDIFF(MINUTE, NOW(), expected_end_at))`

**Success:** HTTP 200
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rentalCode": "RN-00001",
      "skate": { "id": 5, "skateCode": "SK-005", "size": "42" },
      "customer": { "id": 12, "name": "..." },
      "cashier": { "id": 3, "name": "..." },
      "durationMinutes": 30,
      "pricePerHour": 120.00,
      "rentalAmount": 60.00,
      "startedAt": "2026-09-21T15:00:00.000Z",
      "expectedEndAt": "2026-09-21T15:30:00.000Z",
      "status": "active",
      "operationalStatus": "normal",
      "remainingMinutes": 15
    }
  ]
}
```

---

### GET /api/v1/rentals/calculate-price — Price Preview

**Permission:** `rentals.create`  
**Note:** Must be registered BEFORE `GET /api/v1/rentals/:id`

**Query:** `?durationMinutes=30`

**Business Logic:** Read hourly rate from settings, calculate amount. No rental created.

**Success:** HTTP 200
```json
{
  "success": true,
  "data": {
    "durationMinutes": 30,
    "pricePerHour": 120.00,
    "rentalAmount": 60.00
  }
}
```

---

### GET /api/v1/rentals — List Rentals

**Permission:** `rentals.view`

**Query Parameters:**
- `page` (default: 1), `perPage` (default: 20, max: 100)
- `status` — `active`, `returned`, `cancelled`
- `skateId`, `customerId`, `cashierId`
- `from`, `to` — ISO date strings for `started_at` range filter

**Success:** HTTP 200 — paginated list (same item shape as active rentals, without `operationalStatus`)

---

### GET /api/v1/rentals/:id — Rental Detail

**Permission:** `rentals.view`

**Success:** HTTP 200 — full rental object  
**Error:** 404 if not found

---

### GET /api/v1/customers/:id/rentals — Customer Rental History (DEC-055)

**Permission:** `customers.view`

**Query:** `page`, `perPage`

**Business Logic:** Paginated rental history for the customer, ordered by `started_at DESC`.

**Success:** HTTP 200
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rentalCode": "RN-00001",
      "skate": { "id": 5, "skateCode": "SK-005", "size": "42" },
      "durationMinutes": 30,
      "rentalAmount": 60.00,
      "startedAt": "2026-09-21T15:00:00.000Z",
      "expectedEndAt": "2026-09-21T15:30:00.000Z",
      "returnedAt": null,
      "status": "active"
    }
  ],
  "pagination": { "page": 1, "perPage": 20, "total": 5, "totalPages": 1 }
}
```

**Error:** 404 if customer not found

---

### Phase 07 Endpoints — DO NOT IMPLEMENT IN PHASE 05

- `POST /api/v1/rentals/:id/return`
- `POST /api/v1/rentals/:id/waive-late-fee`

---

## Rental POS UI Flow

### Approved Flow

```
Select Skate -> Select Duration -> Automatic Price Preview -> Select/Create Customer -> Review -> Start Rental
```

> [!IMPORTANT]
> The Payment step (Spec §10) is excluded from Phase 05 per DEC-060. Payment recording is Phase 06. The Phase 05 POS ends at Start Rental after the review step. A note in the UI may indicate that payment will be extended in a future update.

### Step 1 — Select Skate

- Display available skate inventory
- Each skate shows: Skate ID, Size, Type, Status badge, Condition
- Only `status = 'available'` skates are selectable
- Search by size or skate code
- Source: `GET /api/v1/skates/available` (requires `rentals.create`)

### Step 2 — Select Duration

- Show standard options: 15, 30, 45, 60, 90 minutes
- Show "Custom Duration" input
- **SYS-012:** Evaluate `RadioGroup` vs `Select` — apply reuse-before-create rules
- **SYS-011:** Evaluate if `Select` needs disabled options support
- On selection, call `GET /api/v1/rentals/calculate-price?durationMinutes=N`
- Show price preview immediately using `formatCurrency()` — DEC-042

### Step 3 — Automatic Price Preview

- Display rental amount prominently (Arabic: `المبلغ: 60 ج.م`)
- Display hourly rate for context (Arabic: `السعر: 120 ج.م / ساعة`)
- Price fetched from server — not calculated in browser
- Updates when duration changes

### Step 4 — Select or Create Customer

- Search field using `GET /api/v1/customers?q={query}&isActive=1`
- Show matching customer cards with: Name, Phone, masked National ID (DEC-056)
- Inline customer creation if not found (`POST /api/v1/customers`, requires `customers.create`)
- Only active customers shown in search

### Step 5 — Review Rental

Display complete summary per Spec §13:

| Field | Arabic Label |
|---|---|
| Customer name | العميل |
| Customer phone | الهاتف |
| Customer national ID (masked) | الرقم القومي |
| Skate code + size | الاسكيت |
| Duration | المدة |
| Hourly rate | السعر بالساعة |
| Rental amount | مبلغ الإيجار |
| Start time (system time) | وقت البداية |
| Expected end time | نهاية متوقعة |

"Start Rental" primary action button. Loading state while request in flight. On success: success `Toast` with rental code, navigate to Active Rentals.

---

## Active Rentals View

### Columns

| Column | Arabic | Source |
|---|---|---|
| Rental ID | رقم الإيجار | `rentalCode` |
| Customer | العميل | `customer.name` |
| Skate | الاسكيت | `skate.skateCode + size` |
| Start Time | وقت البداية | `startedAt` |
| Expected End | نهاية متوقعة | `expectedEndAt` |
| Remaining | الوقت المتبقي | `remainingMinutes` min |
| Status | الحالة | `operationalStatus` Badge |
| Cashier | الكاشير | `cashier.name` |

### Operational Status Badges

| `operationalStatus` | Arabic | Badge variant |
|---|---|---|
| `normal` | عادي | success |
| `ending_soon` | ينتهي قريباً | warning |
| `overdue` | متأخر | danger |

> [!NOTE]
> **Ending Soon threshold: 5 minutes** — approved per DEC-066. Implement all three operational statuses: `normal`, `ending_soon`, `overdue`.

### Empty State

`EmptyState` component with Arabic: `لا توجد إيجارات نشطة حالياً`

---

## Rental Detail View

Read-only view showing all rental record fields. Fields: Rental Code, Status, Start Time, Expected End, Duration, Hourly Rate, Rental Amount, Customer info, Skate info, Cashier, Notes. `returned_at` displays as `—` if null.

---

## Customer Rental History Integration (DEC-055)

Phase 05 adds to `CustomerProfilePage.tsx`:

- **Rental count summary** (total rentals)
- **Rental history table** using `DataTable`: Rental Code, Date, Duration, Amount, Status
- Paginated via `GET /api/v1/customers/:id/rentals`
- `EmptyState` when no rentals yet
- `Pagination` component for navigation

---

## Component Reuse Plan

| Requirement | Component | Action |
|---|---|---|
| Action buttons | `Button.tsx` | Reuse |
| Form inputs | `Input` from FormFields | Reuse |
| Duration select (if not RadioGroup) | `Select` from FormFields | Reuse + SYS-011 eval |
| Duration radio selection | `RadioGroup` (SYS-012) | Evaluate — create if needed |
| Dialogs | `Modal.tsx` | Reuse |
| Status badges | `Badge.tsx` | Extend (DEC-064 values) |
| Content containers | `Card.tsx` | Reuse |
| Tables | `DataTable.tsx` | Reuse |
| Search | `SearchBar.tsx` | Reuse |
| Empty states | `EmptyState.tsx` | Reuse |
| Loading | `Loading.tsx` | Reuse |
| Feedback | `Toast.tsx` + `useToast` | Reuse |
| Confirmations | `ConfirmDialog.tsx` | Reuse |
| Row actions | `IconButton.tsx` | Reuse |
| Pagination | `Pagination.tsx` | Reuse |
| Inline errors | `Alert.tsx` | Reuse |
| Currency | `formatCurrency()` | Reuse |

---

## Testing Matrix

### Integration Tests

| ID | Description |
|---|---|
| TC-RENT-01 | Create rental for available skate — 201, skate status becomes `rented` |
| TC-RENT-02 | Cannot rent skate with status `rented` — 422 |
| TC-RENT-03 | Cannot rent skate with status `maintenance` — 422 |
| TC-RENT-04 | Cannot rent skate with status `damaged` — 422 |
| TC-RENT-05 | Cannot rent skate with status `lost` — 422 |
| TC-RENT-06 | Cannot rent skate with status `reserved` — 422 |
| TC-RENT-07 | `rental_amount` = `round(hourly_rate x duration / 60)` — whole EGP — correct |
| TC-RENT-08 | 15-minute at 120 EGP/hr = 30 EGP (exact — no rounding) |
| TC-RENT-09 | 30-minute at 120 EGP/hr = 60 EGP (exact — no rounding) |
| TC-RENT-10 | 45-minute at 120 EGP/hr = 90 EGP (exact — no rounding) |
| TC-RENT-11 | 60-minute at 120 EGP/hr = 120 EGP (exact — hourly rate) |
| TC-RENT-12 | 90-minute at 120 EGP/hr = 180 EGP (exact — no rounding) |
| TC-RENT-13 | Custom duration uses same proportional formula with whole-EGP rounding |
| TC-RENT-13a | Rounding: raw 83.33 → stored as 83 EGP (DEC-067) |
| TC-RENT-13b | Rounding: raw 83.50 → stored as 84 EGP — .5 rounds up (DEC-067) |
| TC-RENT-13c | Rounding: raw 83.67 → stored as 84 EGP (DEC-067) |
| TC-RENT-14 | `expected_end_at = started_at + duration_minutes` — stored correctly |
| TC-RENT-15 | Changing `rental_hourly_rate` setting does not affect existing rental record |
| TC-RENT-16 | `price_per_hour` and `rental_amount` are immutable after creation |
| TC-RENT-17 | First `rental_code` = `RN-00001` |
| TC-RENT-18 | Second `rental_code` = `RN-00002` |
| TC-RENT-19 | `rental_code` UNIQUE constraint enforced |
| TC-RENT-20 | Concurrent same-skate rental — only one request succeeds (race condition) |
| TC-RENT-21 | Concurrent rental code generation — no duplicates |
| TC-RENT-22 | Non-existent skate — 404 |
| TC-RENT-23 | Non-existent customer — 404 |
| TC-RENT-24 | Deactivated customer — 422 `CUSTOMER_INACTIVE` |
| TC-RENT-25 | Active rentals endpoint returns only `status = active` |
| TC-RENT-26 | Active rentals includes `operationalStatus` and `remainingMinutes` |
| TC-RENT-27 | Rental detail returns correct data |
| TC-RENT-28 | Calculate-price returns correct amount without creating rental |
| TC-RENT-29 | Customer rental history — paginated correctly |
| TC-RENT-30 | Customer rental history — 404 for non-existent customer |
| TC-RENT-31 | `GET /api/v1/skates/available` — regression, still works correctly |

### RBAC Tests

| ID | Description |
|---|---|
| TC-RENT-RBAC-01 | POST /rentals without auth — 401 |
| TC-RENT-RBAC-02 | POST /rentals without `rentals.create` — 403 |
| TC-RENT-RBAC-03 | GET /rentals without `rentals.view` — 403 |
| TC-RENT-RBAC-04 | GET /rentals/active without `rentals.view` — 403 |
| TC-RENT-RBAC-05 | GET /rentals/:id without `rentals.view` — 403 |
| TC-RENT-RBAC-06 | Cashier can create rental |
| TC-RENT-RBAC-07 | MaintenanceStaff cannot create rental |

### Validation Tests

| ID | Description |
|---|---|
| TC-RENT-VAL-01 | Missing `skateId` — 400 |
| TC-RENT-VAL-02 | Missing `customerId` — 400 |
| TC-RENT-VAL-03 | Missing `durationMinutes` — 400 |
| TC-RENT-VAL-04 | `durationMinutes = 0` — 400 |
| TC-RENT-VAL-05 | `durationMinutes` negative — 400 |

### Regression Suite

All 96 pre-existing tests must pass: Auth (18), RBAC Roles (15), Skates (16), Users (19), Customers (28).

---

## Definition of Done

### Functional
- [ ] Rental creation succeeds for available skate
- [ ] All unavailable skate statuses correctly rejected
- [ ] Concurrent double-rental prevented at DB transaction level
- [ ] Skate status transitions to `rented` on creation
- [ ] `rental_amount` calculated using approved formula from settings
- [ ] `price_per_hour` and `rental_amount` stored as immutable snapshots
- [ ] `expected_end_at` calculated and stored correctly
- [ ] `started_at` is server-generated
- [ ] `rental_code` in `RN-NNNNN` format, unique, never reused
- [ ] Deactivated customers rejected (422)
- [ ] Active rentals returns `operationalStatus` and `remainingMinutes`
- [ ] Customer rental history paginated correctly
- [ ] Rental confirmation review shows all Spec §13 fields

### Database
- [ ] `rentals` table migration applied
- [ ] `settings` table migration applied
- [ ] `rental_hourly_rate` and `rental_duration_options` seeded
- [ ] All indexes present
- [ ] UNIQUE on `rental_code`
- [ ] `shift_id` nullable (no FK constraint to cashier_shifts in Phase 05)

### Backend
- [ ] `tsc -b` 0 errors
- [ ] `startRental()` uses DB transaction with `SELECT ... FOR UPDATE`
- [ ] `/active` and `/calculate-price` registered before `/:id`
- [ ] Settings read correctly by `RentalService`
- [ ] No payment tables, records, or logic in Phase 05

### Pricing
- [ ] Formula `hourly_rate x duration_minutes / 60` implemented
- [ ] Hourly rate read from `settings` — no hardcoded value
- [ ] Historical amounts immutable

### Security
- [ ] `rentals.create` enforced server-side
- [ ] `rentals.view` enforced server-side
- [ ] `customers.view` enforced on customer rental history endpoint
- [ ] 401 unauthenticated, 403 unauthorized
- [ ] `rental_amount` never accepted from client

### Concurrency
- [ ] TC-RENT-20 passes (same-skate race condition)
- [ ] TC-RENT-21 passes (rental code concurrency)

### UI / UX
- [ ] RTL layout correct on all Phase 05 screens
- [ ] Arabic text throughout
- [ ] All icons from lucide-react
- [ ] Shared components used throughout (Button, FormFields, Modal, Badge, DataTable, EmptyState, Toast, ConfirmDialog)
- [ ] No `confirm()`, `alert()`, `prompt()`
- [ ] No `style={{}}` for structural properties
- [ ] Touch targets >= 44x44px
- [ ] Mobile layout verified
- [ ] `formatCurrency()` for all monetary values
- [ ] Phase 05 screens look like KOSHK product

### Testing
- [ ] TC-RENT-01 through TC-RENT-31 passing
- [ ] TC-RENT-RBAC-01 through TC-RENT-RBAC-07 passing
- [ ] TC-RENT-VAL-01 through TC-RENT-VAL-05 passing
- [ ] All 96 existing tests passing
- [ ] Total test count reported

### Documentation
- [ ] `RENTALS.md` updated to IMPLEMENTED
- [ ] `PROJECT_STATE.md` updated
- [ ] `PROJECT_MAP.md` updated
- [ ] `CHANGELOG.md` updated
- [ ] `DECISION_LOG.md` includes DEC-060 through DEC-069

### Git
- [ ] Working tree reviewed
- [ ] ONE commit: `feat(rentals): implement rental POS core — schema, API, frontend, N tests`
- [ ] `git push origin master` confirmed

### Rental Lifecycle DoD
- [ ] Skate status transitions correct
- [ ] Cannot transition to invalid state
- [ ] Concurrent access prevented
- [ ] Business history preserved (no hard delete)

---

## All Decisions Resolved — No Blocking Items

All four previously unresolved items are now approved and recorded in the Decision Log.

| Previously Unresolved | Resolution | DEC |
|---|---|---|
| RD-05-001 — Ending Soon threshold | `remaining_time <= 5 minutes AND > 0` → `ending_soon` | DEC-066 |
| RD-05-002 — Rounding behavior | Round to nearest whole EGP; `.5` rounds up | DEC-067 |
| RD-05-003 — Initial hourly rate | `120 EGP/hr` — seeded in `settings` table | DEC-068 |
| RD-05-004 — Custom duration max | No maximum defined; validation: `duration_minutes > 0` only | DEC-069 |

**PHASE 05 ENTRY GATE: PASSED.** Implementation may begin.

---

## Known Technical Debt

| ID | Description | Phase |
|---|---|---|
| TD-RENT-01 | `shift_id` nullable — FK to `cashier_shifts` deferred to Phase 12. Phase 05 rentals will have `shift_id = NULL`. | Phase 12 |
| TD-RENT-02 | Payment recording missing from `startRental()`. Business flow gap (Payment step in Spec §10) acknowledged and deferred to Phase 06. | Phase 06 |
| TD-RENT-03 | `settings` table has no admin UI. Values can only be changed directly in DB until the Settings module phase is implemented. | Future Settings phase |

---

*Last updated: 2026-09-21 (Closure Gate — Phase 05 FINAL GATE PASSED ✅. Verification Gate confirmed 170/170 tests passing. Rental Code: insertId-based DEC-070. Operational status boundary: DEC-066 strict `>` at exact equality = ending_soon NOT overdue. Duration config: no runtime fallback — RENTAL_DURATION_CONFIG_INVALID thrown on any invalid config. GOVERNANCE-01 documented. All VG1/VG2 findings closed.)*
