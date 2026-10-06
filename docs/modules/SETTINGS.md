# Module: Settings

**Status:** IMPLEMENTED — PARTIALLY VERIFIED (browser verification blocked)
**Phase:** Phase 05.5 — Settings Administration
**Last updated:** 2026-10-03

---

## Purpose

Allows Administrator to view and update the five business-critical system settings that control rental pricing, duration options, late fees, invoice printing, and notification sounds.

---

## Current Status

| Dimension | Status |
|---|---|
| Database table | VERIFIED ✅ — `settings` table, Phase 05 migration `0003_settings.sql` |
| Database seed | VERIFIED ✅ — 5 keys seeded: `rental_hourly_rate`, `rental_duration_options`, `late_fee_per_minute`, `print_invoices_enabled`, `notification_sound_enabled` |
| Backend — GET | VERIFIED ✅ — returns all 5 settings, tested |
| Backend — PATCH | VERIFIED ✅ — validation hardened, authorization enforced, audit corrected |
| Frontend | IMPLEMENTED — all 5 settings, design system compliant, browser verification BLOCKED |
| Tests | VERIFIED ✅ — 29 settings tests (settings.test.ts) + 3 F-017 tests in gate42-batch3.test.ts = 32 total |
| Git | COMMITTED (Phase 05.5 commit) |

---

## Supported Settings Keys

| Key | Type | Default | Business Rule |
|---|---|---|---|
| `rental_hourly_rate` | number | 120 (EGP/hr) | Must be > 0. Does not retroactively affect historical rentals. |
| `rental_duration_options` | number[] | [15,30,45,60,90] | Non-empty, positive integers, no duplicates, ascending order. |
| `late_fee_per_minute` | number | 0 | Must be >= 0. Zero means no late fee is charged. |
| `print_invoices_enabled` | boolean | true | Auto-prints invoice at rental/sale completion. |
| `notification_sound_enabled` | boolean | true | Plays sound when rental ending soon or expired. |

---

## Business Rules

- Rental price changes apply to **new rentals only** — historical rental amounts are snapshots (DEC-065, DEC-067).
- Only users with `settings.manage` permission can update settings.
- Any authenticated user may read settings (other modules consume this programmatically).
- Every actual value change produces an audit log entry (`UPDATE_SETTINGS`).
- Unchanged values (semantically identical) do NOT produce audit entries.

---

## Permissions

| Permission | Controls |
|---|---|
| `settings.view` | Frontend: sidebar visibility + route PermissionGate |
| `settings.manage` | Backend: PATCH endpoint enforcement (server-side); Frontend: Save button visibility (PermissionGate) |

**Administrator role:** has both `settings.view` and `settings.manage`.
**Cashier role:** has neither — cannot see Settings in sidebar, cannot modify.

---

## Frontend

**Location:** `apps/web/src/modules/settings/SettingsPage.tsx`  
**API client:** `apps/web/src/modules/settings/settings.api.ts`  
**Route:** `/settings`  

Components used: `Card`, `Input`, `CheckboxField`, `Button`, `PageLoader`, `Alert`, `useToast`, `PermissionGate`, `TagInput`

**Save behavior (SETT-006):** Only changed settings are sent in PATCH. No request issued if nothing changed.

---

## Backend

**Routes:** `apps/api/src/modules/settings/settings.routes.ts`  
**Service:** `apps/api/src/modules/settings/settings.service.ts`

| Endpoint | Auth | Permission | Notes |
|---|---|---|---|
| `GET /api/v1/settings` | Required | None (intentional) | Returns object of all 5 settings |
| `PATCH /api/v1/settings` | Required | `settings.manage` | Validates + updates + audits + returns all settings |

---

## Database

**Table:** `settings`  
**Schema file:** `apps/api/src/db/schema/settings.ts`  
**Migration:** `apps/api/src/db/migrations/0003_settings.sql` (Phase 05)  
**Seed:** `apps/api/src/db/seed.ts` (5 keys seeded)

No new migration was required for Phase 05.5.

---

## Related Modules

- **Rentals** — reads `rental_hourly_rate` and `rental_duration_options` via `GET /api/v1/rentals/config`
- **Returns** — reads `late_fee_per_minute` at return time (Phase 07)
- **Invoices** — reads `print_invoices_enabled` to decide whether to auto-print (Phase 14)
- **Notifications** — reads `notification_sound_enabled` (Phase 15)

---

## Tests

**File:** `apps/api/src/tests/settings.test.ts`  
**Coverage:** 29 test cases across: GET auth, GET keys, PATCH auth (401/403/200), input validation, business-rule validation, update behavior, and audit behavior.  
**Additional coverage:** `apps/api/src/tests/gate42-batch3.test.ts` F-017 (3 cases)

---

## Known Technical Debt

| ID | Description | Phase |
|---|---|---|
| TD-003 | Skate type free-text → Settings-managed type system (DEC-033, IMPL-004) | Future Settings expansion |

---

## Future Work

The following MBS §48 items are acknowledged but out of scope for Phase 05.5:

- Skate sizes and types management UI
- Expense categories management UI
- Damage types management UI
- Payment methods management UI
- Store information, currency, tax settings
- Invoice printing and printer selection
- Roles and permissions admin (already on dedicated pages)

Owner decision required to scope any of these into a future phase.

---

## Verification Requirements

Per `docs/00-governance/DEFINITION_OF_DONE.md`:

- [x] Backend implemented and build clean
- [x] Frontend implemented and build clean
- [x] Tests written and passing (32 settings test cases)
- [x] Database schema verified (no new migration, Phase 05 schema reused)
- [x] Documentation updated (SETTINGS.md, PROJECT_STATE.md, PHASE_055)
- [x] Git committed
- [ ] Browser visual verification — BLOCKED (Playwright 404)
- [ ] RTL visual verification — BLOCKED (same cause)
- [ ] Mobile layout visual verification — BLOCKED (same cause)

---

*Last updated: 2026-10-03 (Phase 05.5 — Settings Administration implementation)*
