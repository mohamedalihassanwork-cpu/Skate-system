# Regression Strategy — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** ACTIVE  
**Last updated:** 2026-09-09

---

## Purpose

After any meaningful change, these areas must be checked to prevent regressions.

---

## After Frontend Changes

| Changed Area | What to Recheck |
|---|---|
| Sidebar / navigation | All nav items link correctly; active state works; RTL layout intact |
| Any form | Other forms still submit correctly; validation still works |
| Any table | Other tables still load data; pagination works |
| Any modal | Other modals still open/close correctly |
| CSS/design tokens | Verify no visual regression on adjacent pages |
| RTL changes | Full RTL check on all affected pages |
| State management | Other modules still receive correct data |

**Minimum regression check for frontend changes:**
1. Open Dashboard — loads correctly
2. Open Skate inventory — shows cards correctly
3. Open Active Rentals — shows table correctly
4. Open one modal (rental or maintenance)
5. Check mobile view at 375px

---

## After Backend Changes

| Changed Area | What to Recheck |
|---|---|
| Auth middleware | Protected routes still require authentication |
| Permission middleware | Unauthorized routes still return 403 |
| Rental service | Rental creation, return, status still work |
| Payment service | Payments record correctly, treasury updates |
| Financial calculations | Late fee, damage charge, shift balance |
| Database queries | No unintended data change or missing joins |
| Error handling | Errors still return structured JSON |

**Minimum regression check for backend changes:**
1. Login endpoint works
2. `/api/v1/rentals/active` returns correct data
3. Create a test rental via API
4. Check treasury balance unchanged if not financial change

---

## After Database Changes

| Changed Area | What to Recheck |
|---|---|
| Migration | Migration runs clean on clean database |
| Table added | Existing queries still work |
| Column added | Existing INSERT/UPDATE still work (nullable or default) |
| Column renamed | All references to old column name updated |
| Foreign key added | Existing data satisfies constraint |
| Index added | Existing queries unaffected |

**Minimum regression check for database changes:**
1. Run full migration from scratch on clean DB
2. Run seed data
3. Run all existing passing tests

---

## After Financial Changes

| Changed Area | What to Recheck |
|---|---|
| Late fee calculation | Previously passing late fee tests |
| Payment recording | Treasury movement created; balance updated |
| Expense recording | Treasury deducted; expense linked |
| Shift balance | Shift calculation correct after expense/income |
| Waiver | Waiver audit entry created; collected + waived = calculated |
| Historical rentals | Old rental amounts unchanged |

**Financial regression is HIGH RISK. Check all financial test cases.**

---

## After Permission Changes

| Changed Area | What to Recheck |
|---|---|
| New permission added | Old permissions unaffected |
| Permission renamed | All checks using old key updated |
| Role-permission assignment changed | Affected users cannot access removed permissions |
| Permission enforcement middleware changed | All previously-protected routes still protected |

**Permission regression check:**
1. Test 3 critical restricted routes with unauthorized user → must return 403
2. Test login → access all permitted routes → must succeed
3. Test waiver with user who lacks permission → must fail

---

## After Rental Lifecycle Changes

| Changed Area | What to Recheck |
|---|---|
| Rental creation | Cannot create for unavailable skate |
| Rental return | Late fee still calculated correctly |
| Inspection | Status transition still correct |
| Damage report | Still linked to inspection and skate |
| Maintenance | Still blocks skate rental |
| Maintenance completion | Skate returns to Available |

---

## Regression Test Frequency

| Event | Regression Level |
|---|---|
| Minor text/styling change | Spot check (visual only) |
| New UI component | Adjacent page check |
| Backend route change | Affected module API tests |
| Financial logic change | Full financial test suite |
| Permission system change | Full permission test suite |
| Database migration | Full migration + existing tests |
| Major refactoring | Full test suite |
| Pre-release / production deploy | Full test suite + manual E2E |

---

*Last updated: 2026-09-09*
