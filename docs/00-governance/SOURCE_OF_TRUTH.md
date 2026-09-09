# Source of Truth — KOSHK SKATE ERP

**Version:** 1.0  
**Status:** ACTIVE

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
| AI Agent Rules | `docs/00-governance/AI_AGENT_RULES.md` | ACTIVE |
| Source of Truth | `docs/00-governance/SOURCE_OF_TRUTH.md` | ACTIVE |
| Definition of Done | `docs/00-governance/DEFINITION_OF_DONE.md` | ACTIVE |
| Change Request Process | `docs/00-governance/CHANGE_REQUEST_PROCESS.md` | ACTIVE |
| Documentation Rules | `docs/00-governance/DOCUMENTATION_RULES.md` | ACTIVE |

### Architecture Documents

| Document | Location | Status |
|---|---|---|
| Technical Architecture | `docs/architecture/TECHNICAL_ARCHITECTURE.md` | INITIAL — no code exists |
| Database Architecture | `docs/architecture/DATABASE_ARCHITECTURE.md` | PLANNED |
| API Architecture | `docs/architecture/API_ARCHITECTURE.md` | PLANNED |
| Frontend Architecture | `docs/architecture/FRONTEND_ARCHITECTURE.md` | PLANNED |
| Backend Architecture | `docs/architecture/BACKEND_ARCHITECTURE.md` | PLANNED |
| Security Architecture | `docs/architecture/SECURITY_ARCHITECTURE.md` | PLANNED |
| Deployment Architecture | `docs/architecture/DEPLOYMENT_ARCHITECTURE.md` | PLANNED |

### Operational Documents

| Document | Location | Status |
|---|---|---|
| Project Map | `docs/PROJECT_MAP.md` | INITIAL |
| Project State | `docs/PROJECT_STATE.md` | INITIAL |
| Decision Log | `docs/decisions/DECISION_LOG.md` | INITIAL |
| Changelog | `docs/CHANGELOG.md` | INITIAL |
| Release History | `docs/RELEASE_HISTORY.md` | INITIAL |

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

*Last updated: 2026-09-09*
