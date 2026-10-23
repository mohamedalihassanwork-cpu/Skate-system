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


## Phone/tablet presentation — 2026-10-12

Damage tabs, details, summaries and actions wrap below desktop; payment controls are touch-sized and labelled. Charge, waiver and settlement handlers are unchanged.

Scope, source coverage, verification results and live-testing limits are recorded in the [Mobile/tablet UI audit](../quality/MOBILE_TABLET_UI_UX_AUDIT.md) (DEC-082). This presentation pass does not close earlier module or backend verification gaps.

Completion review (2026-10-13): details/collection/waiver controls expose selected state; mobile summary foregrounds use approved readable tokens. All three tabs were exercised without payment or waiver submissions.


## Approved sub-treasury integration — 2026-10-16

Managed cash collection uses the acting cashier’s active drawer, while electronic collection retains its configured account. Partial payments/waivers retain their existing semantics. Each collection uses a persisted operation key, common session lock and required atomic audit; no estimate or waived amount creates funds.

Authority: [ST-01–06](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). Current workflow: [Treasury](TREASURY.md). Executed checks and limits: [verification report](../quality/SUB_TREASURY_VERIFICATION.md). Earlier proposal/pending wording is historical and superseded only within this approved scope.
