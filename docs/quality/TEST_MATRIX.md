# Test Matrix — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** PLANNED — No tests exist yet.  
**Last updated:** 2026-09-09

> Update "Status" and "Last Verified" columns as tests are implemented and run.

---

## Critical Flow Test Matrix

| # | Module | Critical Flow | Test Type | Status | Last Verified |
|---|---|---|---|---|---|
| 1 | Auth | Login with valid credentials | API | PLANNED | — |
| 2 | Auth | Login with invalid credentials (should fail) | API | PLANNED | — |
| 3 | Auth | Access protected route without token (should fail 401) | API | PLANNED | — |
| 4 | Auth | Access route with insufficient permission (should fail 403) | API | PLANNED | — |
| 5 | Skates | Create skate | API | PLANNED | — |
| 6 | Skates | Get available skates | API | PLANNED | — |
| 7 | Skates | Unavailable skate not returned in available list | Integration | PLANNED | — |
| 8 | Customers | Create customer | API | PLANNED | — |
| 9 | Customers | Search customer by phone | API | PLANNED | — |
| 10 | Rentals | Start rental — happy path | Integration | PLANNED | — |
| 11 | Rentals | Cannot start rental for unavailable skate | Integration | PLANNED | — |
| 12 | Rentals | Cannot start rental for skate in maintenance | Integration | PLANNED | — |
| 13 | Rentals | Rental price calculated correctly from config | Unit | PLANNED | — |
| 14 | Rentals | Rental amount stored historically (not from current config) | Integration | PLANNED | — |
| 15 | Rentals | Concurrent rental of same skate prevented | Integration | PLANNED | — |
| 16 | Rentals | Expected end time = started_at + duration | Unit | PLANNED | — |
| 17 | Rentals | Active rentals list shows correct entries | API | PLANNED | — |
| 18 | Rentals | Return rental — on time | Integration | PLANNED | — |
| 19 | Rentals | Return rental — late (late fee calculated correctly) | Integration | PLANNED | — |
| 20 | Rentals | Late fee: 0 minutes late = 0 fee | Unit | PLANNED | — |
| 21 | Rentals | Late fee: X minutes late = X × rate | Unit | PLANNED | — |
| 22 | Rentals | Waive late fee — user with permission | Integration | PLANNED | — |
| 23 | Rentals | Waive late fee — user without permission (should fail 403) | Integration | PLANNED | — |
| 24 | Rentals | Waiver creates audit log entry | Integration | PLANNED | — |
| 25 | Rentals | Waived + collected fee = calculated fee | Unit | PLANNED | — |
| 26 | Payments | Record single payment method | Integration | PLANNED | — |
| 27 | Payments | Record split payment (two methods) | Integration | PLANNED | — |
| 28 | Payments | Treasury balance updated after payment | Integration | PLANNED | — |
| 29 | Payments | Payment creates treasury movement | Integration | PLANNED | — |
| 30 | Inspections | Record inspection after return | Integration | PLANNED | — |
| 31 | Inspections | Inspection — no maintenance required → skate Available | Integration | PLANNED | — |
| 32 | Inspections | Inspection — maintenance required → skate Maintenance | Integration | PLANNED | — |
| 33 | Damage | Create damage report | Integration | PLANNED | — |
| 34 | Damage | Damage charge ≠ maintenance cost (separate records) | Integration | PLANNED | — |
| 35 | Damage | Waive damage charge — with permission | Integration | PLANNED | — |
| 36 | Damage | Waive damage charge — without permission (fail 403) | Integration | PLANNED | — |
| 37 | Maintenance | Create maintenance record | Integration | PLANNED | — |
| 38 | Maintenance | Skate in maintenance cannot be rented | Integration | PLANNED | — |
| 39 | Maintenance | Complete maintenance → skate Available | Integration | PLANNED | — |
| 40 | Maintenance | Maintenance cost recorded as expense | Integration | PLANNED | — |
| 41 | Reservations | Create reservation | Integration | PLANNED | — |
| 42 | Reservations | Conflicting reservation rejected | Integration | PLANNED | — |
| 43 | Treasury | Account balance updated by income | Integration | PLANNED | — |
| 44 | Treasury | Account balance updated by expense | Integration | PLANNED | — |
| 45 | Treasury | Movements are traceable to source operation | Integration | PLANNED | — |
| 46 | Expenses | Record expense | Integration | PLANNED | — |
| 47 | Expenses | Expense deducts from treasury account atomically | Integration | PLANNED | — |
| 48 | Shifts | Open shift | Integration | PLANNED | — |
| 49 | Shifts | Cannot open second shift while one is open | Integration | PLANNED | — |
| 50 | Shifts | Close shift with correct balance calculation | Integration | PLANNED | — |
| 51 | Settings | Change rental price | API | PLANNED | — |
| 52 | Settings | Price change does not affect historical rental amounts | Integration | PLANNED | — |
| 53 | Permissions | Permission check enforced server-side | Integration | PLANNED | — |
| 54 | Permissions | Role assignment works | Integration | PLANNED | — |
| 55 | Audit | Audit entry created for waiver | Integration | PLANNED | — |
| 56 | Audit | Audit entry created for pricing change | Integration | PLANNED | — |
| 57 | UI | Login screen renders in Arabic RTL | Manual | PLANNED | — |
| 58 | UI | Dashboard renders KPIs correctly | Manual | PLANNED | — |
| 59 | UI | Skate grid shows availability states | Manual | PLANNED | — |
| 60 | UI | Rental POS flow — 3 clicks or fewer to start rental | Manual | PLANNED | — |
| 61 | UI | Return flow shows late fee | Manual | PLANNED | — |
| 62 | UI | Mobile layout usable on 375px width | Manual | PLANNED | — |

---

## Status Legend

| Status | Meaning |
|---|---|
| PLANNED | Test not yet written |
| WRITTEN | Test code exists, not yet passing |
| PASSING | Test passes |
| FAILING | Test exists and fails (known issue) |
| SKIPPED | Intentionally skipped (document reason) |

---

*Last updated: 2026-09-09*
