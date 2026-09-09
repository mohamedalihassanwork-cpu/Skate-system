# QA Strategy — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** PLANNED  
**Last updated:** 2026-09-09

---

## Testing Philosophy

Every meaningful business flow must have appropriate verification. Not every minor UI change requires a complete end-to-end suite.

**Priority order for testing effort:**
1. Financial operations (payments, treasury, late fees, damage charges)
2. Rental lifecycle (start, return, status transitions)
3. Permission enforcement
4. Concurrency-sensitive operations (rental creation, reservation conflicts)
5. Authentication
6. Data integrity (history retention, soft-delete)

---

## Testing Levels

```
Unit Tests
    ↓
Integration Tests
    ↓
API Tests
    ↓
Database Tests
    ↓
UI Tests (Manual or Automated)
    ↓
End-to-End Tests
    ↓
Regression Tests
```

---

## Unit Tests

**Scope:** Individual functions and services with no external dependencies

**Priority targets:**
- Late fee calculation (`calculateLateFee(startTime, endTime, ratePerMinute)`)
- Rental price calculation (`calculateRentalPrice(duration, rate)`)
- Shift balance calculation (`calculateShiftBalance(opening, revenue, expenses)`)
- Status transition validation (`canTransitionSkateStatus(from, to)`)
- Permission check logic

**Tool:** TBD (Jest recommended for Node.js)

**Target:** Cover all financial calculation functions with unit tests.

---

## Integration Tests

**Scope:** Multiple components working together, with real database

**Priority targets:**
- Rental creation (skate availability check + rental record + payment + treasury movement)
- Return workflow (return record + late fee + inspection + skate status change)
- Waiver (permission check + waiver record + audit entry)
- Damage + maintenance (damage record + maintenance creation + skate status)
- Expense recording (expense record + treasury deduction)

**Tool:** TBD (Supertest + database test instance)

---

## API Tests

**Scope:** HTTP-level testing of REST endpoints

**Priority targets:**
- All authentication endpoints
- Rental creation endpoint
- Return endpoint
- Payment recording endpoints
- Permission enforcement on protected endpoints

**Tool:** TBD (Supertest, Postman/Newman)

---

## Database Tests

**Scope:** Schema validity, constraint enforcement, migration correctness

**Targets:**
- Migration idempotency (can run up and down)
- Foreign key constraints work
- Unique constraints work (rental codes, skate codes)
- Concurrent rental prevention (transaction isolation)

---

## UI Tests (Manual)

**Scope:** Verifying RTL layout, Arabic text, form behavior, responsive design

**Manual checklist for each new screen:**
- [ ] Sidebar renders correctly (right side, nav items)
- [ ] Page title is right-aligned
- [ ] Form labels are right-aligned
- [ ] Inputs accept and display Arabic text
- [ ] Status badges use correct colors
- [ ] Tables are readable
- [ ] Mobile view is usable
- [ ] Loading states present
- [ ] Empty states present
- [ ] Error states show Arabic messages

---

## End-to-End Tests

**Scope:** Critical full workflows from browser to database

**Priority flows:**
1. Login → Open Shift → Start Rental → Return (on-time) → Inspect (no damage) → Skate available
2. Login → Start Rental → Return (late) → Calculate late fee → Collect fee → Inspect → Available
3. Login → Start Rental → Return (late) → Waive fee (with permission) → Audit entry created
4. Login → Start Rental → Return → Inspect → Record Damage → Charge customer → Maintenance → Complete → Available
5. Login → Record Expense → Treasury balance affected
6. Login → Close Shift → Verify balance calculation

**Tool:** TBD (Playwright or Cypress)

---

## Regression Strategy

See `docs/quality/REGRESSION_STRATEGY.md`.

---

## Test Environment

**Status: UNKNOWN — depends on technology decisions**

**Target:**
- Separate test database (not production)
- Test database seeded with known data before each test suite
- Tests isolated from each other (transactions rolled back or separate seeding)
- No dependency on running browser for backend tests

---

## Coverage Goals

| Area | Target Coverage |
|---|---|
| Financial calculation functions | 100% unit test coverage |
| Rental lifecycle services | High — integration tests |
| Permission enforcement | Every permission key tested |
| API endpoints | All critical endpoints (auth, rental, payment, waiver) |
| UI flows | Manual checklist for every new screen |

---

*Last updated: 2026-09-09*
