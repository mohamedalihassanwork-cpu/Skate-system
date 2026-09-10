# Source of Truth — KOSHK SKATE ERP

**Version:** 2.0  
**Status:** ACTIVE  
**Last updated:** 2026-09-10 (Phase 03.5 Stage 1 — design documents registered, document statuses updated)

---

## Priority Hierarchy

When information conflicts, resolve using this priority order. Higher number = lower authority.

| Priority | Source | Location | Notes |
|---|---|---|---|
| 1 | Explicit user-approved business decision | Verbal/written approval from project owner | Highest authority |
| 2 | Approved Change Request | `docs/decisions/DECISION_LOG.md` | Supersedes earlier specifications |
| 3 | Master Business/Product Specification | `Skate_Rental_ERP_Master_Business_Product_Specification.md` | Business logic, workflows, rules |
| 4 | Approved Technical Architecture | `docs/architecture/TECHNICAL_ARCHITECTURE.md` | Technical implementation decisions |
| 5 | Approved Visual Design Reference | `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md` | Visual language, UI DNA |
| 5.1 | Approved Design System | `docs/design/DESIGN_SYSTEM.md` | Authoritative token + component + pattern reference (Phase 03.5+) |
| 6 | Approved Phase Specification | `docs/phases/PHASE_XX_*.md` | Phase-specific scope |
| 7 | Existing verified implementation | Source code + tests | What actually exists and works |
| 8 | AI assumption | (none) | Lowest authority — must never override higher sources |

---

## Conflict Resolution Protocol

If two sources at the same priority level conflict:

1. **Do NOT silently choose one.**
2. **Record the conflict** in `docs/decisions/DECISION_LOG.md` with status `CONFLICT REQUIRES DECISION`.
3. **Stop implementation** of the conflicting area.
4. **Ask the project owner** for clarification.
5. **Document the resolution** in the Decision Log once received.

---

## Document Register

### Primary Business Documents

| Document | Location | Version | Status |
|---|---|---|---|
| Master Business & Product Specification | `Skate_Rental_ERP_Master_Business_Product_Specification.md` | 1.0 | ACTIVE |
| Visual Design Reference | `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md` | 1.0 | ACTIVE |

### Governance Documents

| Document | Location | Status |
|---|---|---|
| AI Agent Rules | `docs/00-governance/AI_AGENT_RULES.md` | ACTIVE (v2.0 — UI rules added Phase 03.5) |
| Source of Truth | `docs/00-governance/SOURCE_OF_TRUTH.md` | ACTIVE (v2.0 — this file) |
| Definition of Done | `docs/00-governance/DEFINITION_OF_DONE.md` | ACTIVE (v2.0 — UI/UX DoD expanded Phase 03.5) |
| Change Request Process | `docs/00-governance/CHANGE_REQUEST_PROCESS.md` | ACTIVE |
| Documentation Rules | `docs/00-governance/DOCUMENTATION_RULES.md` | ACTIVE |

### Design Documents (Phase 03.5+)

| Document | Location | Status |
|---|---|---|
| Visual Design Reference (source) | `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md` | ACTIVE — primary visual reference |
| Visual Design Reference (docs copy) | `docs/design/VISUAL_DESIGN_REFERENCE.md` | ACTIVE — same content |
| Design System | `docs/design/DESIGN_SYSTEM.md` | ACTIVE (v1.0 — created Phase 03.5 Stage 1) |
| Component Library | `docs/design/COMPONENT_LIBRARY.md` | ACTIVE (v1.0 — created Phase 03.5 Stage 1) |

### Architecture Documents

| Document | Location | Status |
|---|---|---|
| Technical Architecture | `docs/architecture/TECHNICAL_ARCHITECTURE.md` | ACTIVE |
| Database Architecture | `docs/architecture/DATABASE_ARCHITECTURE.md` | ACTIVE |
| API Architecture | `docs/architecture/API_ARCHITECTURE.md` | ACTIVE |
| Frontend Architecture | `docs/architecture/FRONTEND_ARCHITECTURE.md` | ACTIVE (partially implemented — Phase 03.5 will expand) |
| Backend Architecture | `docs/architecture/BACKEND_ARCHITECTURE.md` | ACTIVE |
| Security Architecture | `docs/architecture/SECURITY_ARCHITECTURE.md` | ACTIVE |
| Deployment Architecture | `docs/architecture/DEPLOYMENT_ARCHITECTURE.md` | ACTIVE |

### Operational Documents

| Document | Location | Status |
|---|---|---|
| Project Map | `docs/PROJECT_MAP.md` | ACTIVE (v1.5 — Phase 03.5) |
| Project State | `docs/PROJECT_STATE.md` | ACTIVE (v2.7 — Phase 03.5) |
| Decision Log | `docs/decisions/DECISION_LOG.md` | ACTIVE (DEC-034 through DEC-040 added Phase 03.5) |
| Changelog | `docs/CHANGELOG.md` | ACTIVE |
| Release History | `docs/RELEASE_HISTORY.md` | ACTIVE |

---

## Documentation-First Development

All AI agents must read and understand the most relevant documentation before making changes.

**This is Rule 16 in `AI_AGENT_RULES.md`.** It is reproduced here for emphasis:

Before implementation, the AI agent MUST:
1. Read the minimum relevant governance, product, architecture, design, and module documentation
2. Identify and reconcile documentation conflicts
3. Record required owner decisions
4. Update documentation before writing implementation code
5. Obtain owner approval where required

Documentation is NOT merely a post-implementation activity.

---

## Business Rules That Are Inviolable

The following business rules from the Master Specification are inviolable. They cannot be overridden by technical convenience:

1. An unavailable skate cannot be rented.
2. One skate cannot be rented to two customers simultaneously.
3. A skate in Maintenance cannot be rented.
4. Rental price comes from configured business rules (never hardcoded).
5. Expected end time derives from actual start time + duration.
6. Late time starts only after expected end time.
7. Late fee is calculated automatically by the system.
8. Late-fee waiver requires permission.
9. Every waiver must be audited.
10. Customer damage charge is separate from maintenance cost.
11. A skate requiring maintenance cannot become Available until maintenance is completed.
12. Important financial operations must be atomic.
13. Concurrent rental of the same skate must be prevented.
14. Conflicting reservations are prohibited.
15. Historical rental/inspection/damage/maintenance records must be retained.
16. Rental state must not depend only on a browser timer.
17. Permissions must be enforced server-side.

---

*Last updated: 2026-09-10 (Phase 03.5 Stage 1 — design documents registered, statuses corrected, DOCUMENTATION_FIRST principle added)*
