# Definition of Done — KOSHK SKATE ERP

**Version:** 2.0  
**Status:** ACTIVE  
**Applies to:** Every feature, fix, or meaningful change  
**Last updated:** 2026-09-10 (Phase 03.5 Stage 1 — UI/UX DoD expanded)

---

## A feature/change is DONE only when ALL applicable criteria are met.

Not most. **All applicable criteria.**

---

## 1. FUNCTIONAL

- [ ] Requirements from the Master Business Specification are implemented
- [ ] All relevant business rules are enforced (see `docs/00-governance/SOURCE_OF_TRUTH.md`)
- [ ] Edge cases are handled (empty state, zero amounts, concurrent access, permissions)
- [ ] Error states are handled gracefully (user-facing error messages in Arabic)
- [ ] The feature does not allow invalid business states

---

## 2. TECHNICAL

- [ ] Code compiles/builds without errors
- [ ] No unhandled runtime errors in critical paths
- [ ] Database operations are atomic where required (no partial financial state)
- [ ] API behavior matches the specification
- [ ] Input validation exists on the backend (not frontend-only)
- [ ] No unintended regressions in related functionality

---

## 3. UI / UX

- [ ] RTL layout is correct (not mirrored LTR)
- [ ] Arabic text is used throughout (no English placeholders in user-facing areas)
- [ ] Correct KOSHK SKATE visual design applied (navy/gold, correct fonts, cards, badges)
- [ ] Responsive behavior is intentionally designed for desktop AND mobile
- [ ] Loading states are present for async operations (LoadingSpinner or LoadingSkeleton)
- [ ] Empty states are present and informative (EmptyState component)
- [ ] No unrelated visual changes introduced
- [ ] New screen looks like it belongs to the same product

### Design System Compliance (Phase 03.5+ — Required for all new and migrated UI)

- [ ] All icons are Lucide SVG — no emoji anywhere (UI-003)
- [ ] All colors use approved design tokens from `design-system.css` — no hardcoded hex values (UI-001)
- [ ] Shared Button component used for all interactive buttons (UI-002)
- [ ] Shared Input / Select / Textarea used for all form fields (UI-002)
- [ ] Shared Modal component used for all dialogs — no native `<dialog>` without full accessibility (UI-002)
- [ ] Shared Badge component used for all status display (UI-002)
- [ ] Shared DataTable component used for all tabular data (UI-002)
- [ ] Shared EmptyState component used for all empty list / table / search results (UI-002)
- [ ] Shared Toast system used for all success/error feedback (UI-005)
- [ ] Shared ConfirmDialog used for all destructive action confirmations (UI-005)
- [ ] No `confirm()`, `alert()`, or `prompt()` calls anywhere in the module (UI-005)
- [ ] No inline `style={{}}` objects for structural/design properties (UI-007)
- [ ] No `text-transform: uppercase` on Arabic text
- [ ] Touch targets ≥ 44×44px for all interactive elements
- [ ] Focus rings visible on keyboard navigation

---

## 4. SECURITY

- [ ] Authentication enforced where relevant
- [ ] Authorization/permission check exists on the backend for sensitive operations
- [ ] Input validation protects against injection
- [ ] Sensitive customer data (National ID, phone) is handled appropriately
- [ ] Audit log is updated for auditable actions (waivers, pricing changes, etc.)

---

## 5. DOCUMENTATION

- [ ] Module documentation updated (`docs/modules/<MODULE>.md`)
- [ ] `docs/PROJECT_STATE.md` updated (status, last verified, current work)
- [ ] `docs/CHANGELOG.md` updated (meaningful entry, not trivial)
- [ ] If architecture changed: `docs/architecture/` file updated
- [ ] If a decision was made: `docs/decisions/DECISION_LOG.md` updated
- [ ] `docs/PROJECT_MAP.md` updated if new files/routes/tables were added

---

## 6. TESTING

- [ ] Critical business flows have at least one test (unit or integration)
- [ ] Financial logic has unit tests
- [ ] Relevant existing tests still pass
- [ ] Manual verification performed for the specific feature

---

## 7. GIT

- [ ] Working tree reviewed (`git diff`, `git status`)
- [ ] ONE logical commit created (not dozens of micro-commits)
- [ ] Commit message is meaningful and follows the format in `AI_AGENT_RULES.md`
- [ ] Push status reported explicitly (pushed / local only / blocked)

---

## Status Labels

Use these labels when reporting work. Never use vague language.

| Label | Meaning |
|---|---|
| `COMPLETED` | All DoD criteria met, pushed |
| `VERIFIED` | Behavior confirmed correct, not yet committed |
| `TESTED` | Automated tests pass |
| `DOCUMENTED` | Documentation updated |
| `COMMITTED` | In Git locally |
| `DEPLOYED` | Live in production |
| `PARTIAL` | Explicitly partial — state what remains |
| `BLOCKED` | Cannot proceed — state the blocker |
| `PLANNED` | Not started |
| `IN PROGRESS` | Work in progress |

---

## Special Rules for Financial Operations

Financial operations have a stricter DoD. They must additionally satisfy:

- [ ] Transaction is atomic (no half-recorded payment)
- [ ] Treasury balance is correctly affected
- [ ] Audit log entry created
- [ ] Calculated vs collected/waived amounts are tracked separately
- [ ] Split payments each recorded individually but linked to same transaction
- [ ] No double-recording possible
- [ ] Historical records are not mutated

---

## Special Rules for Rental Lifecycle Operations

Rental lifecycle operations (start, return, damage, maintenance) must additionally satisfy:

- [ ] Skate status transitions are correct
- [ ] Cannot transition to invalid state (e.g., Available → Maintenance without a damage/inspection record)
- [ ] Concurrent access is prevented (same skate cannot be double-rented)
- [ ] Business history is preserved (rental, inspection, damage, maintenance records retained)

---

*Last updated: 2026-09-10 (Phase 03.5 Stage 1 — UI/UX DoD expanded with design system compliance requirements)*
