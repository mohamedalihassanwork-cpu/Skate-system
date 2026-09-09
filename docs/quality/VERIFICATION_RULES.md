# Verification Rules — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** ACTIVE  
**Last updated:** 2026-09-09

---

## Purpose

These rules define what "verified" means for each type of change. Verification is mandatory before marking work complete.

---

## Standard Verification Checklist

For every feature or change, answer these questions:

1. **Does the requested behavior work?** — Test the specific feature
2. **Does the business rule work?** — Test the underlying rule, not just the happy path
3. **Does authorization work?** — Test that unauthorized users are blocked
4. **Does the database remain consistent?** — Check DB state after the operation
5. **Does the UI behave correctly?** — Check layout, Arabic text, RTL
6. **Does RTL remain correct?** — Check layout is not broken
7. **Did unrelated functionality remain intact?** — Basic regression check
8. **Were documentation files updated?** — PROJECT_STATE, module doc, CHANGELOG
9. **Was Git updated?** — Commit created

All nine must be confirmed. If any cannot be confirmed, state explicitly what was not verified.

---

## Financial Operation Verification (STRICT)

For any change touching payments, treasury, late fees, damage charges, or expenses:

1. [ ] The full transaction completes atomically (no partial state)
2. [ ] The treasury account balance is correctly updated
3. [ ] A treasury movement record is created and linked to the source operation
4. [ ] The calculated fee/amount matches the expected calculation
5. [ ] Collected + waived = calculated (for late fees and damage charges)
6. [ ] An audit log entry is created (for waivers, pricing changes)
7. [ ] Historical records are not modified
8. [ ] Split payment: both components recorded, linked to same transaction
9. [ ] The cashier shift balance is unaffected by the change (unless the change is to shift logic)
10. [ ] Test with: zero amount, maximum amount, split payment, waiver

---

## Rental Lifecycle Verification

For any change to rental creation, return, or status transitions:

1. [ ] Cannot create rental for unavailable skate
2. [ ] Cannot create concurrent rental for same skate
3. [ ] Expected end time = started_at + duration_minutes
4. [ ] Late time starts only after expected_end_at (not before)
5. [ ] Correct late fee = late_minutes × configured_rate
6. [ ] Return changes skate status correctly (→ inspection step)
7. [ ] Inspection result determines next skate status (available or maintenance)
8. [ ] Rental record is not deleted when skate changes status

---

## Permission Verification

For any change to permissions or protected operations:

1. [ ] Backend endpoint returns 403 for user without permission
2. [ ] Backend endpoint returns 401 for unauthenticated request
3. [ ] Frontend correctly hides/disables UI for unauthorized users
4. [ ] BUT: frontend-only hiding is not sufficient (backend still tested directly)

---

## UI Verification

For any frontend change:

1. [ ] Arabic text used (no English placeholders)
2. [ ] RTL layout correct (sidebar on right, text right-aligned)
3. [ ] Status badges use correct semantic colors
4. [ ] Mobile layout usable (test at 375px min width)
5. [ ] Loading state present for async operations
6. [ ] Empty state present for empty data
7. [ ] Error messages in Arabic
8. [ ] No unrelated visual changes in adjacent screens

---

## Database Verification

For any database schema change:

1. [ ] Migration runs cleanly (up)
2. [ ] Migration can be reversed (down), or rollback impact documented
3. [ ] Foreign key constraints work as expected
4. [ ] Unique constraints work as expected
5. [ ] Existing data is not corrupted by the migration
6. [ ] Seeds still work after migration

---

## Verification Failure Protocol

If any verification step fails:

1. **Do NOT mark work as complete**
2. **Document the failure** in the task report
3. **Fix the issue** or mark as `BLOCKED` with explanation
4. **Re-verify** after the fix

---

*Last updated: 2026-09-09*
