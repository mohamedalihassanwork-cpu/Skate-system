# Documentation Rules — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** ACTIVE

---

## Core Principle

Documentation must help future development. It is not bureaucracy.

Every document must have a practical purpose. Do not create documentation that is not referenced or actionable.

---

## What to Document

### Always document:
- Business decisions (in `DECISION_LOG.md`)
- Architecture decisions
- Business rules as they are implemented
- API contracts as they are built
- Database schema as it is designed
- Module status (implemented vs planned)
- Known issues and technical debt
- Git commit history (meaningful entries only)

### Do not document:
- Obvious code behavior (code should document itself via naming)
- Implementation details that change frequently
- Invented requirements not approved by the project owner
- Speculation presented as fact

---

## Document Structure Rules

### Accuracy Labels

Use these labels consistently:

| Label | Meaning |
|---|---|
| `VERIFIED` | Confirmed from actual source code or direct testing |
| `PARTIALLY VERIFIED` | Some aspects confirmed, others inferred |
| `INFERRED` | Reasonable inference from available evidence |
| `UNKNOWN` | Cannot be confirmed from available sources |
| `MISSING` | Should exist but does not |
| `CONFLICTING` | Two sources disagree — requires resolution |
| `PLANNED` | Intended but not yet implemented |

### Status Labels for Modules/Features

| Label | Meaning |
|---|---|
| `PLANNED` | Not started |
| `IN PROGRESS` | Actively being implemented |
| `IMPLEMENTED` | Code exists, not fully tested |
| `TESTED` | Tests exist and pass |
| `VERIFIED` | Behavior confirmed correct |
| `DOCUMENTED` | Documentation complete |
| `COMMITTED` | In Git |
| `COMPLETED` | All DoD criteria met |
| `BLOCKED` | Cannot proceed |

---

## Formatting Standards

### Use:
- Markdown tables for structured data
- Code blocks for code, SQL, commands, paths
- Bullet points for lists (not paragraphs)
- Numbered lists for ordered steps
- Headers for clear section navigation
- Accuracy labels when documenting status

### Avoid:
- Long prose paragraphs when a table or list is clearer
- Repeating the same information in multiple documents (link instead)
- Documenting the same thing twice with different wording (creates contradictions)

---

## Update Requirements

### After any meaningful code change:

1. Update `docs/PROJECT_STATE.md` — current status
2. Update `docs/CHANGELOG.md` — what changed
3. Update `docs/modules/<MODULE>.md` — module status and behavior
4. Update `docs/PROJECT_MAP.md` — if files/routes/tables were added

### After a significant architecture decision:

1. Update `docs/decisions/DECISION_LOG.md`
2. Update relevant `docs/architecture/` file

### After a phase completes:

1. Update `docs/phases/PHASE_XX_*.md` — phase status
2. Update `docs/PROJECT_STATE.md` — phase status
3. Update `docs/RELEASE_HISTORY.md`

---

## Document Ownership

Each document has a de facto owner by area:

| Area | Document | Responsibility |
|---|---|---|
| Business rules | `Skate_Rental_ERP_Master_Business_Product_Specification.md` | Project owner only |
| Visual design | `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md` | Project owner only |
| Governance rules | `docs/00-governance/` | Project owner / governance agent |
| Architecture | `docs/architecture/` | Technical architect |
| Module docs | `docs/modules/` | Implementing agent per module |
| Project state | `docs/PROJECT_STATE.md` | Agent completing each phase |
| Project map | `docs/PROJECT_MAP.md` | Agent adding new code |
| Decision log | `docs/decisions/DECISION_LOG.md` | Agent + project owner for approval |

---

## Prohibited Documentation Behaviors

- Presenting planned/future architecture as current implementation
- Marking a module `COMPLETED` without verification
- Removing `UNKNOWN` labels by inventing an answer
- Creating separate contradictory documentation for the same system
- Deleting decisions from the decision log (use `SUPERSEDED` status instead)
- Writing documentation in a language other than English (documentation language)
- Using English for user-facing UI content (UI must be Arabic)

---

*Last updated: 2026-09-09*
