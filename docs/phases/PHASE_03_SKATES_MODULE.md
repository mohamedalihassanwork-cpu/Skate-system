# Phase 03 — Skates / Asset Management Module

**Status:** IMPLEMENTED ✅ — Phase 03 complete. All tests pass.
**Last updated:** 2026-09-10 (Phase 03 implementation complete)

---

## Objective

Implement the complete Skates / Asset Management module:

- Skate CRUD (create, read, update, soft-disable)
- Status management with approved transition rules
- QR code and barcode fields (auto-generated, user-editable)
- Skate timeline endpoint (stub — no dependent modules yet)
- `GET /api/v1/skates/available` endpoint for future Rental module use

---

## Dependencies

- **Phase 02** — Authentication, permissions system, `authenticate` middleware, `requirePermission` middleware, seeded permissions (`skates.view`, `skates.create`, `skates.edit`)

---

## Scope

### IN SCOPE

| Area | Detail |
|---|---|
| Database | `skates` table — Drizzle schema + migration |
| Backend | `skates.types.ts`, `skates.service.ts`, `skates.routes.ts` |
| Frontend | `skates.types.ts`, `skates.service.ts`, `SkatesPage.tsx` |
| Tests | `apps/api/src/tests/skates.test.ts` — integration tests |
| Docs | This file, `docs/modules/SKATES.md`, `docs/PROJECT_STATE.md`, `docs/PROJECT_MAP.md`, `docs/CHANGELOG.md` |

### OUT OF SCOPE

| Item | Reason |
|---|---|
| Rental workflow | Phase 05 |
| Reservation workflow | Phase 10 |
| Inspection workflow | Phase 07 |
| Damage workflow | Phase 08 |
| Maintenance workflow | Phase 09 |
| Settings module (configurable types) | Future phase |
| QR image rendering | Format undefined — see DEC-032 |
| Barcode image rendering | Format undefined — see DEC-032 |

---

## Business Requirements

**Source:** Master Business Specification §8, §9, §25, §48, §49, §54; DEC-009, DEC-030 to DEC-033.

### Skate Attributes

Every skate must have:
- Unique Skate Code (`skate_code`) — optional input; auto-generated as `SK-NNN` (3-digit zero-padded) if omitted (DEC-030)
- QR Code value — auto-generated = `skate_code`, user-editable string; no image rendering in Phase 03 (DEC-032)
- Barcode value — auto-generated = `skate_code`, user-editable string; no image rendering in Phase 03 (DEC-032)
- Size (e.g., "42")
- Type — free-text input in Phase 03; no hardcoded list; Settings-configurable in a future phase (DEC-033)
- Current status (see Status section)
- Condition (`good`, `fair`, `poor`)
- Purchase date
- Purchase cost
- Notes
- `is_active` soft-disable flag

### Skate Statuses

| Status | Arabic | Description |
|---|---|---|
| `available` | متاح | Ready for rental |
| `rented` | مستأجر | Currently in an active rental — set by Rental workflow only |
| `reserved` | محجوز | Reserved — set by Reservation workflow only |
| `maintenance` | صيانة | Under maintenance |
| `damaged` | تالف | Damaged |
| `lost` | مفقود | Lost |

### Status Transition Rules (Admin API) — DEC-031

The admin `PUT /api/v1/skates/:id` endpoint enforces these rules:

| Transition | Permitted? | Rule |
|---|---|---|
| `available → maintenance` | ✅ YES | Admin operational control |
| `available → damaged` | ✅ YES | Admin operational control |
| `available → lost` | ✅ YES | Admin operational control |
| `maintenance → available` | ✅ YES | Admin operational control (DEC-007 enforcement deferred to Phase 09) |
| `damaged → available` | ✅ YES | Admin operational control |
| `lost → available` | ✅ YES | Admin operational control |
| Any → `rented` | ❌ NO | Rental workflow only (Phase 05) |
| Any → `reserved` | ❌ NO | Reservation workflow only (Phase 10) |

**Any attempt to set `status = rented` or `status = reserved` via the admin API must return HTTP 422.**

### Skate Code — DEC-030 (RESOLVED)

- `skate_code` is **optional** on input.
- If provided: used as-is; must be unique (conflict → 409).
- If not provided: system auto-generates using the **`SK-NNN` format**:
  - Prefix: `SK-`
  - Number: 3-digit zero-padded sequential integer (e.g., `SK-001`, `SK-002`, `SK-010`, `SK-100`)
  - The system finds the maximum existing numeric suffix across ALL skates (including `is_active = false`) and increments by 1.
  - First code ever issued: `SK-001`.
  - A code is **never reused** — deactivating a skate does not release its code.

### QR Code & Barcode — DEC-032 (RESOLVED)

- Both `qr_code` and `barcode` are **auto-generated** at creation, set to the value of `skate_code`.
- Example: `skate_code = SK-025` → `qr_code = "SK-025"`, `barcode = "SK-025"`.
- Both values are **user-editable** independently via the update endpoint.
- Both are stored as nullable VARCHAR(255) strings.
- **No QR or barcode image rendering in Phase 03.** Values are stored and displayed as plain text.

### Business Rules from Source of Truth

- Unavailable skate cannot be rented — DEC-002, Business spec §49 Rule 1
- No hard delete — soft-disable via `is_active = false` — DEC-009
- Historical records preserved even when skate is disabled — Business spec §49 Rule 18–19, DEC-009
- Permissions enforced server-side — AI_AGENT_RULES Rule 13

---

## Technical Requirements

### Database

New table: `skates` (Drizzle ORM schema)

See `docs/architecture/DATABASE_ARCHITECTURE.md` §Skates for the full column specification.

Key notes:
- `skate_code` VARCHAR(50) UNIQUE NOT NULL (system provides value if user omits it; format `SK-NNN`)
- `qr_code` VARCHAR(255) NULL — auto-set to `skate_code` on creation; user-editable
- `barcode` VARCHAR(255) NULL — auto-set to `skate_code` on creation; user-editable
- `type` VARCHAR(50) NULL — free-text; no hardcoded values in Phase 03
- `status` ENUM — exactly the 6 approved values
- `condition` ENUM — exactly `good`, `fair`, `poor`
- `is_active` BOOLEAN DEFAULT true — soft disable

New migration: `0001_*.sql` generated by `drizzle-kit generate` and applied via `drizzle-kit migrate`.

### Backend API

All routes protected by `authenticate` middleware + appropriate `requirePermission`.

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/skates` | `skates.view` | List skates with optional filters |
| `POST` | `/api/v1/skates` | `skates.create` | Create skate |
| `GET` | `/api/v1/skates/available` | `rentals.create` | Available skates for rental |
| `GET` | `/api/v1/skates/:id` | `skates.view` | Get skate by ID |
| `PUT` | `/api/v1/skates/:id` | `skates.edit` | Update skate |
| `GET` | `/api/v1/skates/:id/history` | `skates.view` | Skate timeline (stub) |

> **IMPORTANT:** `GET /api/v1/skates/available` must be registered **before** `GET /api/v1/skates/:id` in the Express router to prevent "available" being matched as an `:id` parameter.

**Query parameters for `GET /api/v1/skates`:**
- `status` — filter by status
- `size` — filter by size
- `isActive` — filter by active flag (default: true only)
- `page`, `perPage`, `sortBy`, `sortDir` — pagination

**Response format:** Follows the project API convention:
```json
{ "success": true, "data": [...], "pagination": { ... } }
```

**Status transition enforcement in `PUT /api/v1/skates/:id`:**
- If `status` is `rented` or `reserved` → return HTTP 422 with error code `SKATE_STATUS_NOT_ALLOWED`

**Timeline stub (`GET /api/v1/skates/:id/history`):**
Returns the skate record with empty arrays for `rentals`, `inspections`, `damageReports`, `maintenanceRecords` until those modules are implemented.

### Frontend

**Target:** `apps/web/src/modules/skates/`

Files:
- `skates.types.ts` — TypeScript types matching backend DTOs
- `skates.service.ts` — API call wrappers
- `SkatesPage.tsx` — Full management screen

**SkatesPage features:**
- Page header with title ("إدارة الزلاجات") and "إضافة زلاجة" button (behind `PermissionGate skates.create`)
- Search input (free-text, filters by `skate_code`, `size`)
- Status filter dropdown (all statuses + "الكل")
- Skates grid/table with status badges
- Status badge colors per KOSHK SKATE design reference
- "إضافة زلاجة" modal — all fields
- Edit modal — all editable fields
- Soft-disable action (behind `PermissionGate skates.edit`)
- Loading, empty state, and error state — all in Arabic RTL
- Skate Type shown as **free-text `<input type="text">`** (DEC-033) — no dropdown, no hardcoded values

**App.tsx update:**
- Import `SkatesPage`
- Replace `PlaceholderPage` at `/skates` route with `<SkatesPage />`

---

## UI Requirements

**Source:** Visual Design Reference §31 (Equipment / Skate inventory section), §13 (Status Badges), §17 (Filters & Search), §19 (Modals).

From the Visual Design Reference §31:
> Equipment / Skate inventory: Search + filters, Status chips, Repeating equipment cards, Four-column desktop grid, Strong availability states, Compact equipment metadata, Primary action inside available cards.

Status badge colors per design reference:
| Status | Badge Background | Badge Text |
|---|---|---|
| `available` (متاح) | `success-bg` (#DDF6EA) | `success-text` (#159A69) |
| `rented` (مستأجر) | `danger-bg` (#FCE0E1) | `danger-text` (#D83C40) |
| `reserved` (محجوز) | `warning-bg` (#FFF1C9) | `warning-text` (#C88B00) |
| `maintenance` (صيانة) | `neutral-bg` (#EEF1F5) | `neutral-text` (#657084) |
| `damaged` (تالف) | `warning-bg` (#FFF1C9) | `warning-text` (#C88B00) |
| `lost` (مفقود) | `neutral-bg` (#EEF1F5) | `neutral-text` (#657084) |

---

## Database Impact

**New migration required.** Adds the `skates` table to `koshk_skate` database.

Migration file: `apps/api/src/db/migrations/0001_*.sql` (generated by drizzle-kit).

No changes to existing Phase 02 tables.

---

## Testing Requirements

**File:** `apps/api/src/tests/skates.test.ts`

| TC | Description | Expected |
|---|---|---|
| TC-SK-01 | Create skate with all fields including custom `skate_code` | 201 |
| TC-SK-02 | Create skate **without** `skate_code` → system auto-generates `SK-NNN` | 201; response contains `skate_code` matching `/^SK-\d{3}$/` |
| TC-SK-03 | Create skate with duplicate `skate_code` | 409 |
| TC-SK-04 | Create skate with missing required fields (e.g., no `size`) | 400 |
| TC-SK-05 | List skates → returns array | 200 |
| TC-SK-06 | Get skate by ID → 200 | 200 |
| TC-SK-07 | Get nonexistent skate ID → 404 | 404 |
| TC-SK-08 | Update skate — change size, notes | 200 |
| TC-SK-09 | Update skate — set `status = maintenance` | 200 |
| TC-SK-10 | Update skate — attempt to set `status = rented` → business rule violation | 422 |
| TC-SK-11 | Update skate — attempt to set `status = reserved` → business rule violation | 422 |
| TC-SK-12 | List skates with `status=available` filter → filtered result | 200 |
| TC-SK-13 | Get skate history → 200 with empty stub arrays | 200 |
| TC-SK-14 | Get available skates → 200 | 200 |
| TC-SK-15 | Unauthenticated create (no token) → 401 | 401 |
| TC-SK-16 | Create without `skates.create` permission (Cashier role) → 403 | 403 |

**All 18 existing Phase 02 tests must continue to pass.** No regressions permitted.

---

## Verification Criteria

Per `docs/00-governance/DEFINITION_OF_DONE.md`:

### Functional
- [ ] All 6 statuses work correctly
- [ ] Status transition rules enforced (rented/reserved blocked from admin)
- [ ] `skate_code` optional — auto-generates when omitted, validates uniqueness
- [ ] Soft-disable works — historical data preserved
- [ ] Timeline endpoint returns stub response

### Technical
- [ ] `npm run build` (api) — zero TypeScript errors
- [ ] `npm run build` (web) — zero TypeScript errors
- [ ] All Phase 03 tests pass
- [ ] All Phase 02 tests still pass (18/18)
- [ ] Migration applied — `skates` table exists in DB

### UI / UX
- [ ] RTL layout correct
- [ ] Arabic text throughout — no English placeholders
- [ ] KOSHK SKATE design applied (navy/gold, status badges, Cairo font)
- [ ] Loading, empty, and error states present in Arabic
- [ ] Skate Type shown as free-text input (no hardcoded dropdown)

### Security
- [ ] Authentication enforced on all 6 endpoints
- [ ] Permission checks enforced server-side

### Documentation
- [ ] `docs/modules/SKATES.md` updated to IMPLEMENTED
- [ ] `docs/PROJECT_STATE.md` updated
- [ ] `docs/CHANGELOG.md` updated
- [ ] `docs/PROJECT_MAP.md` updated with new files

---

## Known Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `skate_code` auto-generation: race condition under concurrent creation | LOW | DB UNIQUE constraint is the authoritative safety net; application-level generation is best-effort. |
| `GET /api/v1/skates/available` vs `GET /api/v1/skates/:id` route order | LOW | Register `/available` before `/:id` in Express router. |
| DEC-007 (maintenance→available needs completed record) deferred | MEDIUM | Documented in DEC-031. Will be enforced in Phase 09. Add a comment in code. |

---

## Definition of Done

All items in `docs/00-governance/DEFINITION_OF_DONE.md` must be satisfied.

---

*Last updated: 2026-09-10 (Final reconciliation — IMPL-001 to IMPL-004 resolved — Phase 03 fully specified)*
