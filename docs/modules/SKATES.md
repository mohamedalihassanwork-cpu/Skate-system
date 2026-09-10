# Module: Skates / Asset Management

**Status:** IMPLEMENTED ✅ — Phase 03 complete. 34/34 tests pass.
**Last updated:** 2026-09-10 (Phase 03 implementation complete)

---

## Purpose

Manages individual skate assets including their identity, status, condition, and full lifecycle history (rentals, inspections, damages, maintenance). Every skate is an independent physical asset with a unique identifier, not interchangeable inventory.

---

## Current Status

IMPLEMENTED ✅. Phase 03 complete. Drizzle migration applied. Backend service, routes, and types implemented. Frontend SkatesPage, service, and types implemented. 16 integration tests pass. 34/34 total tests pass. API and Web builds pass with zero TypeScript errors.

---

## Business Rules

| Rule | Source |
|---|---|
| Every skate is an individual asset with a unique `skate_code` | Business spec §8 |
| `skate_code` is optional on input — auto-generated if omitted (DEC-030) | DEC-030 |
| Generated `skate_code` must always be unique | DEC-030 |
| Statuses: `available`, `rented`, `reserved`, `maintenance`, `damaged`, `lost` | Business spec §8 |
| An unavailable skate cannot be selected for rental | Business spec §8, §49 Rule 1, DEC-002 |
| Admin may directly set: `available ↔ maintenance`, `available ↔ damaged`, `available ↔ lost` | DEC-031 |
| Admin may NOT directly set `rented` or `reserved` — controlled by workflows | DEC-031 |
| `rented` is set exclusively by the Rental workflow (Phase 05) | DEC-031, Business spec §51 |
| `reserved` is set exclusively by the Reservation workflow (Phase 10) | DEC-031, Business spec §26 |
| A skate requiring maintenance cannot become `available` until maintenance is completed | DEC-007, Business spec §24, §49 Rule 12 — enforcement deferred to Phase 09 |
| No hard delete — soft disable via `is_active = false` | DEC-009, Business spec §49 Rule 18 |
| Historical records preserved when skate is disabled | DEC-009, Business spec §49 Rules 18–19 |
| `skate_code` is optional on input — auto-generated as `SK-NNN` (3-digit zero-padded sequential) if omitted (DEC-030) | DEC-030 |
| Generated `skate_code` is unique and never reused, even after deactivation | DEC-030 |
| `qr_code` is auto-generated = `skate_code`; user-editable string; no image rendering in Phase 03 | DEC-032 |
| `barcode` is auto-generated = `skate_code`; user-editable string; no image rendering in Phase 03 | DEC-032 |
| Skate Type is a free-text input in Phase 03 — no hardcoded list; Settings-configurable in future (DEC-033) | DEC-033 |

---

## Approved Status Transitions (Admin API)

| From | To | Permitted? |
|---|---|---|
| `available` | `maintenance` | ✅ YES |
| `available` | `damaged` | ✅ YES |
| `available` | `lost` | ✅ YES |
| `maintenance` | `available` | ✅ YES |
| `damaged` | `available` | ✅ YES |
| `lost` | `available` | ✅ YES |
| Any | `rented` | ❌ NO |
| Any | `reserved` | ❌ NO |

---

## Frontend

**Target location:** `apps/web/src/modules/skates/`

| File | Purpose |
|---|---|
| `skates.types.ts` | TypeScript DTOs |
| `skates.service.ts` | API call wrappers |
| `SkatesPage.tsx` | Full CRUD management screen (Arabic RTL, KOSHK SKATE design) |

**SkatesPage features:** search, status filter, skate grid with status badges, add/edit modals, soft-disable, loading/empty/error states.

---

## Backend

**Target location:** `apps/api/src/modules/skates/`

| File | Purpose |
|---|---|
| `skates.types.ts` | TypeScript service types and DTOs |
| `skates.service.ts` | Business logic: CRUD, status validation, code generation |
| `skates.routes.ts` | Express routes with auth + permission middleware |

---

## Database

**Table:** `skates`

See `docs/architecture/DATABASE_ARCHITECTURE.md` §Skates for the full column specification.

Key constraints:
- `skate_code` UNIQUE NOT NULL — user-provided or auto-generated as `SK-NNN` (3-digit zero-padded, never reused)
- `qr_code` VARCHAR(255) NULL — auto-set to `skate_code` at creation; user-editable
- `barcode` VARCHAR(255) NULL — auto-set to `skate_code` at creation; user-editable
- `type` VARCHAR(50) NULL — free-text in Phase 03; forward-compatible with future Settings
- `status` ENUM: `available`, `rented`, `reserved`, `maintenance`, `damaged`, `lost`
- `condition` ENUM: `good`, `fair`, `poor`

**Migration:** `apps/api/src/db/migrations/0001_*.sql` — new in Phase 03.

---

## APIs

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/skates` | `skates.view` | List with filters |
| `POST` | `/api/v1/skates` | `skates.create` | Create skate |
| `GET` | `/api/v1/skates/available` | `rentals.create` | Available skates for Rental module |
| `GET` | `/api/v1/skates/:id` | `skates.view` | Get skate |
| `PUT` | `/api/v1/skates/:id` | `skates.edit` | Update skate |
| `GET` | `/api/v1/skates/:id/history` | `skates.view` | Timeline (stub in Phase 03) |

---

## Permissions

These permission keys were seeded in Phase 02 and are available:

| Key | Label | Module |
|---|---|---|
| `skates.view` | عرض الزلاجات | skates |
| `skates.create` | إضافة زلاجة | skates |
| `skates.edit` | تعديل بيانات الزلاجة | skates |

---

## Related Modules

| Module | Relationship |
|---|---|
| Rentals (Phase 05) | Sets skate status to `rented`; uses `GET /api/v1/skates/available` |
| Reservations (Phase 10) | Sets skate status to `reserved` |
| Inspections (Phase 07) | Linked to skate history |
| Damage (Phase 08) | Linked to skate; may trigger `damaged` status |
| Maintenance (Phase 09) | Linked to skate; sets `maintenance` status; enforces DEC-007 at completion |

---

## Tests

**Target location:** `apps/api/src/tests/skates.test.ts`

16 integration test cases defined in `docs/phases/PHASE_03_SKATES_MODULE.md` §Testing Requirements.

---

## Unresolved Items

*None — all IMPL-001 through IMPL-004 resolved (2026-09-10).*

---

## Known Issues

*None — not yet implemented.*

---

## Known Technical Debt

| ID | Description | Risk | Status |
|---|---|---|---|
| TD-002 | DEC-007 (maintenance→available requires completed maintenance record) deferred to Phase 09. Admin can currently bypass this check via the admin API. | MEDIUM — administrative trust issue | OPEN — enforce in Phase 09 |
| TD-003 | Skate Type uses hardcoded fixed dropdown in Phase 03. Migration to Settings-configurable values required in future Settings phase. | LOW | OPEN |

---

## Future Work

- QR/barcode image rendering (Phase TBD — after format confirmed)
- Skate Type migration to configurable Settings (Settings phase)
- DEC-007 enforcement in Maintenance workflow (Phase 09)
- Full timeline data population (all dependent modules complete)

---

## Verification Requirements

Per `docs/00-governance/DEFINITION_OF_DONE.md` and `docs/phases/PHASE_03_SKATES_MODULE.md` §Verification Criteria.

---

*Last updated: 2026-09-10 (Final reconciliation — IMPL-001 to IMPL-004 resolved — Phase 03 fully specified)*
