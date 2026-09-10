# AI Agent Rules — KOSHK SKATE ERP

**Version:** 2.0  
**Status:** ACTIVE  
**Authority:** These rules are mandatory for all AI agents working on this project.  
**Last updated:** 2026-09-10 (Phase 03.5 Stage 1 — DOCUMENTATION_FIRST rule + UI governance rules added)

---

## MANDATORY NAVIGATION ORDER

Before touching any code, an AI agent MUST read in this order:

```
docs/PROJECT_STATE.md
      ↓
docs/PROJECT_MAP.md
      ↓
docs/modules/<RELEVANT_MODULE>.md
      ↓
docs/architecture/<RELEVANT_ARCHITECTURE>.md
      ↓
Relevant source code files
      ↓
Relevant test files
```

Do NOT scan the entire repository for a localized change.

---

## RULE 1 — INSPECT BEFORE MODIFY

Never modify code before reading and understanding the existing relevant implementation.

**Required minimum reading before any change:**
- `PROJECT_STATE.md` — current project status
- `PROJECT_MAP.md` — locate relevant files
- Module documentation for the affected module
- Actual source files for the affected area

If you cannot locate the relevant code from `PROJECT_MAP.md`, expand your search. Do not assume.

---

## RULE 2 — READ MINIMUM RELEVANT CONTEXT

Do not read the entire repository for a localized change.

**Correct escalation path:**
1. Check `PROJECT_MAP.md` first
2. Read only the relevant module documentation
3. Read only the relevant source files
4. Expand scope only when dependencies require it

**Prohibited:**
- Reading all source files before starting
- Reading unrelated module files
- Scanning the entire backend for a frontend change (unless the change touches an API boundary)

---

## RULE 3 — NO UNREQUESTED REFACTORING

Do not refactor, rename, or restructure code that is not part of the requested change.

**Even if you consider existing code suboptimal:**
- Leave it as-is unless it directly blocks the required change
- Document it in `PROJECT_STATE.md` under Technical Debt
- Do NOT silently improve it

**Exception:** If existing code contains an active bug that directly affects the requested change, document the bug and its fix in the change record before fixing it.

---

## RULE 4 — NO SILENT BUSINESS RULE CHANGES

Never change the business behavior of the system without explicit user approval.

**Prohibited actions without approval:**
- Changing how late fees are calculated
- Changing how damage charges are recorded
- Changing rental status transitions
- Changing payment flows
- Changing treasury movement logic
- Changing permission enforcement
- Changing audit log requirements

If you believe a business rule is wrong: **document the conflict** in `docs/decisions/DECISION_LOG.md` and ask for clarification.

---

## RULE 5 — NO INVENTED REQUIREMENTS

If a requirement is ambiguous or missing:
- Mark it `UNKNOWN` in your documentation
- Ask for clarification from the project owner
- Do NOT invent a requirement and implement it silently

**Permitted:** Implementing a clearly necessary technical detail that has no business impact (e.g., choosing an index name).

**Not permitted:** Inventing a business rule to fill a gap.

---

## RULE 6 — PRESERVE EXISTING WORKING BEHAVIOR

A feature change must not break unrelated working functionality.

**Before completing any change:**
- Identify what was working before
- Verify it still works after your change
- If you cannot verify, explicitly state this in your report

---

## RULE 7 — DOCUMENTATION IS PART OF THE CHANGE

If behavior changes, update the documentation. No exceptions.

**Minimum documentation requirements for any meaningful change:**
- Update the relevant module documentation (`docs/modules/`)
- Update `docs/PROJECT_STATE.md` (current status, last verified)
- Update `docs/CHANGELOG.md` (meaningful entry)
- If architecture changes: update relevant `docs/architecture/` file
- If a new decision was made: update `docs/decisions/DECISION_LOG.md`

---

## RULE 8 — VERIFICATION IS MANDATORY

Do not mark work complete without verification.

**Minimum verification for every change:**
1. Does the requested behavior work?
2. Do existing related features still work?
3. Is the database consistent?
4. Is the UI correct in RTL/Arabic?

**For financial operations:** verification must be stricter. See `docs/quality/VERIFICATION_RULES.md`.

---

## RULE 9 — GIT IS PART OF COMPLETION

Meaningful completed changes must be committed.

**Git requirements:**
- Review changes with `git diff` or `git status` before committing
- Create ONE logical commit per feature/fix (not dozens of micro-commits)
- Use meaningful commit messages (see format below)
- Report push status explicitly

**Commit message format:**
```
<type>(<scope>): <description>

[optional body]
[optional: DECISION_LOG reference]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:
- `feat(rentals): implement return workflow with late fee calculation`
- `fix(payments): correct split payment treasury recording`
- `docs(governance): establish AI agent rules and project map`

---

## RULE 10 — NO FALSE COMPLETION

Never report a feature as complete if it is only partially implemented.

**Use these explicit status labels:**
- `COMPLETED` — fully implemented, tested, verified, documented, committed
- `IMPLEMENTED` — code written, not yet tested/verified
- `TESTED` — automated tests exist and pass
- `VERIFIED` — manual verification confirmed behavior
- `DOCUMENTED` — documentation updated
- `COMMITTED` — in Git, local
- `DEPLOYED` — live in production environment
- `PARTIAL` — explicitly partial, clearly state what remains
- `BLOCKED` — cannot proceed, clearly state why

---

## RULE 11 — FINANCIAL OPERATIONS ARE HIGH RISK

Treat all financial operations with extra care:
- Treasury movements
- Payment recording
- Late fee calculation
- Damage charges
- Expense recording
- Shift balances

**Requirements for financial changes:**
- Review the entire transaction flow before changing any part of it
- Ensure atomic consistency (no partial financial state)
- Verify audit log is updated
- Test edge cases (zero amount, split payment, waiver)

---

## RULE 12 — ARABIC/RTL IS NOT OPTIONAL

The application is Arabic-first and RTL-first. This is not cosmetic.

**For every UI change:**
- Verify RTL layout is correct
- Verify Arabic text is used (not English placeholders)
- Verify directional icons are correct
- Verify number alignment is consistent with Arabic conventions

---

## RULE 13 — PERMISSIONS ARE ENFORCED SERVER-SIDE

Never rely on frontend-only permission enforcement.

**For every new operation:**
- Confirm the backend enforces the permission check
- Frontend can hide/disable UI, but the backend must independently validate

---

## RULE 14 — CONCURRENCY AWARENESS

Operations that could fail under concurrent requests must be identified and protected:
- Rental creation (same skate)
- Reservation conflicts
- Inventory quantity decrements

Use database-level constraints or transactions. Do not rely on application-layer checks alone.

---

## RULE 15 — RESPECT SOURCE OF TRUTH HIERARCHY

When information conflicts, use this priority order:

1. Explicit user-approved business decision
2. Approved Change Request
3. Master Business/Product Specification (`Skate_Rental_ERP_Master_Business_Product_Specification.md`)
4. Approved Technical Architecture (`docs/architecture/TECHNICAL_ARCHITECTURE.md`)
5. Approved Visual Design Reference (`KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`)
6. Approved Phase Specification (`docs/phases/`)
7. Existing verified implementation
8. AI assumption

AI assumptions must NEVER override explicit approved decisions.

If two authoritative sources conflict: record in `docs/decisions/DECISION_LOG.md` as `CONFLICT REQUIRES DECISION`. Do NOT silently choose one.

---

## RULE 16 — DOCUMENTATION-FIRST DEVELOPMENT (Phase 03.5+)

Every project phase and every meaningful feature must begin with documentation review and alignment BEFORE implementation.

**Required lifecycle:**

```
Existing Documentation
        ↓
Review & Reconcile
        ↓
Update Documentation
        ↓
Owner Decisions / Approval
        ↓
Approved Phase Specification
        ↓
Implementation
        ↓
Testing
        ↓
Verification
        ↓
Documentation Update
        ↓
Git Commit
        ↓
Git Push
        ↓
Phase Complete
```

**Before implementation, the AI agent MUST:**

1. Read the minimum relevant governance, product, architecture, design, and module documentation
2. Identify all affected documentation files
3. Identify outdated or conflicting documentation
4. Reconcile documentation conflicts according to `SOURCE_OF_TRUTH.md`
5. Record required owner decisions
6. Update relevant documentation
7. Produce an implementation plan based on updated documentation
8. Obtain owner approval where a decision is required
9. Only then begin implementation

**This rule applies to:**
- Phase 03.5
- Phase 04
- All future phases
- All meaningful feature or change requests

Documentation is NOT merely a post-implementation activity.

---

## RULE 17 — FUTURE PHASE INHERITANCE

Every future phase automatically inherits the following without needing to redefine them:

- Project governance (`docs/00-governance/`)
- Source-of-truth hierarchy (`SOURCE_OF_TRUTH.md`)
- Documentation-first development (Rule 16)
- Approved design system (`docs/design/DESIGN_SYSTEM.md`)
- Approved UI governance rules UI-001 through UI-010
- RTL requirements (DEC-001)
- Accessibility requirements (DESIGN_SYSTEM.md §11)
- Responsive requirements (DESIGN_SYSTEM.md §16)
- Shared component reuse requirements (UI-002, UI-010)
- Git and verification requirements (Rules 8 and 9)

Future phases must NOT redefine these from scratch unless the owner explicitly approves a change.

---

## UI GOVERNANCE RULES (Phase 03.5+ — OD-004 APPROVED)

These UI rules are mandatory for all new and migrated interfaces.

### UI-001 — Design System First
All new ERP interfaces MUST use approved KOSHK SKATE design system tokens from `design-system.css`.
No module may introduce custom color values, font sizes, border radii, or shadows outside of the approved token file.

### UI-002 — Shared Components Mandatory
All new pages MUST use shared components from `apps/web/src/components/ui/`.
Duplicate implementations of Modal, Button, Input, Badge, DataTable, or any other shared component are prohibited.
If a needed component does not exist, add it to the shared library first, then use it.

### UI-003 — No Emoji in UI
Emoji are permanently prohibited in all ERP interfaces.
All icons must use the approved Lucide React SVG library (OD-003).
Violations are blocking — a phase cannot be marked COMPLETED with emoji anywhere in the UI.

### UI-004 — Arabic-RTL Verification Mandatory
Every new interface must be visually verified in Arabic RTL before being marked VERIFIED.
RTL layout errors are blocking issues.

### UI-005 — No Native Browser Dialogs
`confirm()`, `alert()`, and `prompt()` are permanently prohibited in this codebase.
All confirmations must use the shared `ConfirmDialog` component.
All error/success messages must use the shared Toast system.

### UI-006 — New Patterns Require Approval
If a feature genuinely requires a new UI pattern not present in the design system, that pattern must be proposed and approved before implementation.
AI agents must NOT invent new visual patterns silently.

### UI-007 — No Inline Style Objects for Structure
Structural layout styles (colors, sizing, shadows, radii) must NOT be hardcoded as inline JavaScript `style={{}}` objects.
Use `className` with CSS custom properties.
Inline styles are permitted ONLY for genuinely dynamic values (e.g., dynamically calculated widths, animated progress percentages).

### UI-008 — Phase Completion Requires UI/UX DoD
A phase cannot be marked COMPLETED without satisfying all UI/UX items in the Definition of Done.
The UI/UX DoD includes items specific to the design system.

### UI-009 — Mobile Must Be Intentionally Designed
New pages must include intentional mobile layout decisions.
"It auto-wraps" is not an acceptable mobile design.
Desktop and mobile layouts must be explicitly designed and verified for every new page.

### UI-010 — AI Agents Must Reuse Before Creating
AI agents must check the existing shared component library before creating any new UI component.
Creating a duplicate of an existing shared component is a violation equivalent to code duplication.

---

## PROHIBITED ACTIONS (ALWAYS)

- Deploying to production without explicit instruction
- Running destructive database operations (`DROP TABLE`, `TRUNCATE`, data deletion) without explicit approval
- Changing environment variables in production
- Purchasing or provisioning hosting resources
- Changing DNS records
- Resetting or force-pushing Git history
- Deleting uncommitted user work
- Silently changing business rules
- Marking incomplete work as complete

---

*Last updated: 2026-09-10 (Phase 03.5 Stage 1 — Rules 16–17 added, UI-001 through UI-010 added) | Authority: Project Owner*
