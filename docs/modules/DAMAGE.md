# Module: Damage Management

**Status:** IMPLEMENTED ? PARTIALLY VERIFIED (see phase specification)
**Last updated:** 2026-10-11 (desktop UI audit)

---

## Purpose

Manages damage reports when skate damage is found during inspection. Handles customer damage charges, photo uploads, and damage waiver.

---

## Current Status

All components PLANNED — No implementation exists.

---

## Business Rules

- Damage charge (customer income) is separate from maintenance cost (business expense)
- Damage charge waiver requires permission and is audited
- Damage photo can be attached
- Damage report links to inspection and customer
- Maintenance may be required after damage

---

## Frontend

**Implemented page:** `apps/web/src/modules/damage/DamagesPage.tsx`

---

## Backend

**Target location:** `apps/api/src/modules/` (path TBD during implementation)

---

## Database

See `docs/architecture/DATABASE_ARCHITECTURE.md` for relevant tables.

---

## APIs

See `docs/architecture/API_ARCHITECTURE.md` for relevant routes.

---

## Permissions

To be defined during implementation phase.

---

## Related Modules

To be documented during implementation.

---

## Tests

**Target location:** `tests/` (TBD during implementation)

See `docs/quality/TEST_MATRIX.md` for relevant test cases.

---

## Known Issues

*None — not yet implemented.*

---

## Known Technical Debt

*None — not yet implemented.*

---

## Future Work

To be defined during or after implementation.

---

## Verification Requirements

To be defined during implementation phase. Reference `docs/00-governance/DEFINITION_OF_DONE.md`.

---

*Last updated: 2026-09-09*

## Desktop UI audit ? 2026-10-11

Reviewed the list and detail, collection and waiver dialog tabs. Shared desktop table/focus/wrapping improvements and token aliases restore selected-tab and financial-summary emphasis. Charge calculations, collection, waiver, permissions and API calls are unchanged.

Presentation changes apply only to screen widths of at least 1024px. Existing mobile/tablet presentation and print output are preserved. See [Desktop UI/UX Audit](../quality/DESKTOP_UI_UX_AUDIT.md) for consolidated coverage, evidence and verification results.
