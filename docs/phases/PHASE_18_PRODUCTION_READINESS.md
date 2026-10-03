# Phase 18 — Production Readiness

**Status:** PLANNED
**Last updated:** 2026-10-03 (Gate 5.3 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.3)

---

> [!IMPORTANT]
> **Gate 5.3 Status Determination:** No production deployment exists. No Docker, CI/CD,
> or hosting configuration was found in the repository. No Hostinger account or domain is
> confirmed. The project is currently in active development. Phase 18 remains PLANNED —
> this is accurate. No implementation evidence warrants reclassification.

---

## 1. Purpose

Prepare the KOSHK SKATE ERP system for production deployment. This includes security
hardening, performance optimization, infrastructure configuration, deployment to Hostinger,
and production verification.

**Evidence source:** Git repository root (searched for Dockerfile, docker-compose, nginx.conf,
ecosystem.config, .sh scripts — none found). PROJECT_STATE.md "Last Deployment: NONE".

---

## 2. Scope

### 2.1 What Does NOT Exist Yet (Evidence: git search returned zero deployment files)

| Component | Status |
|---|---|
| Docker / docker-compose | NOT FOUND |
| CI/CD pipeline (GitHub Actions, etc.) | NOT FOUND |
| nginx.conf or reverse proxy config | NOT FOUND |
| PM2 / ecosystem.config | NOT FOUND |
| Deployment scripts | NOT FOUND |
| Production environment variables | NOT FOUND (only .env.example exists) |
| Hostinger account / plan | NOT CONFIRMED (pending purchase — PROJECT_STATE.md) |
| Production database | NOT DEPLOYED |
| Production domain | NOT DECIDED |

### 2.2 What Is Planned

| Component | Reference |
|---|---|
| Hostinger hosting | PROJECT_STATE.md — "NONE — no deployment exists; Hostinger plan not yet purchased" |
| Production domain | PROJECT_STATE.md — "TBD" |
| Backup strategy | PROJECT_STATE.md — "TBD" |
| Cron support confirmation | PROJECT_STATE.md — "Confirm cron support, Node.js version" |
| JWT secret rotation | PROJECT_MAP.md — Key risk noted |
| Rate limiter (currently in-memory) | PROJECT_MAP.md DEC-027 — must be addressed for multi-instance |

---

## 3. Business Requirements

> [!NOTE]
> No authoritative pre-implementation specification exists for Phase 18. The following
> requirements are derived from pending decisions in PROJECT_STATE.md, PROJECT_MAP.md,
> and general KOSHK ERP project context. They are labelled INFERRED or PENDING.

| ID | Requirement | Source | Status |
|---|---|---|---|
| BR-P18-01 | Application deployed and accessible on production domain | PROJECT_STATE.md | PLANNED |
| BR-P18-02 | MySQL / MariaDB production database provisioned and migrated | Architecture | PLANNED |
| BR-P18-03 | Production JWT_SECRET and JWT_REFRESH_SECRET rotated from defaults | PROJECT_MAP.md key risk | PLANNED |
| BR-P18-04 | Rate limiter replaced with Redis-backed or persistent solution (currently in-memory) | DEC-027 | PLANNED |
| BR-P18-05 | HTTPS/TLS configured | INFERRED | PLANNED |
| BR-P18-06 | Environment variables secured (not committed to repo) | .env.example pattern | PLANNED |
| BR-P18-07 | Hostinger plan purchased with Node.js + MySQL support confirmed | PROJECT_STATE.md | PLANNED |
| BR-P18-08 | Cron job support verified (for future scheduled notifications, reports) | PROJECT_STATE.md | PLANNED |
| BR-P18-09 | Production backup strategy defined and implemented | PROJECT_STATE.md | PLANNED |
| BR-P18-10 | Full regression test run against production-equivalent environment | INFERRED | PLANNED |
| BR-P18-11 | Performance testing under expected concurrent user load | INFERRED | PLANNED |

---

## 4. Dependencies

All prior phases must reach a decision-ready state before Phase 18:
- P13 Reports: PARTIALLY VERIFIED
- P14 Invoices & Printing: PARTIALLY VERIFIED
- P15 Notifications: PARTIALLY VERIFIED (delivery mechanism decision pending)
- P16 Audit Log: PARTIALLY VERIFIED (OWNER-002 pending)
- P17 Dashboard: PARTIALLY VERIFIED

Additionally, all OWNER decisions must be resolved before production deployment:
- OWNER-001 (active-shift enforcement governance)
- OWNER-002 (audit failure blocking)
- UNK-005 (notification delivery mechanism)
- F-002 (treasury_movements.reference_id nullability)
- Browser verification of UI (P13–P17)

---

## 5. Pending Owner Decisions (Pre-Production)

| ID | Decision | Status |
|---|---|---|
| DEC-P18-01 | Hostinger plan selection (Node.js version, MySQL version, cron support) | PENDING |
| DEC-P18-02 | Production domain | PENDING |
| DEC-P18-03 | Backup strategy and schedule | PENDING |
| DEC-P18-04 | Rate limiter replacement strategy (Redis vs alternative) | PENDING |
| OWNER-001 | Active-shift enforcement governance | PENDING — affects all cashier operations |
| OWNER-002 | Audit failure blocking behavior | PENDING — affects all financial operations |
| UNK-005 | Notification delivery (polling vs SSE/WebSocket) | PENDING — affects server load |

---

## 6. Known Risks

| ID | Risk | Risk Level |
|---|---|---|
| R-P18-01 | In-memory rate limiter will not work across multiple Node.js processes | HIGH |
| R-P18-02 | JWT secrets at default values pose critical security risk | CRITICAL |
| R-P18-03 | Hostinger Node.js version may not match development version | MEDIUM |
| R-P18-04 | MySQL version compatibility with Drizzle ORM migrations | LOW |
| R-P18-05 | Browser print dialog cannot be suppressed — extra cashier click for invoices | LOW |

---

## 7. Current Status

**PLANNED**

Rationale: No deployment artifacts, hosting configuration, production environment, or
infrastructure code exists in the repository. The project is in active development.
PLANNED is the accurate, honest status. No reclassification is warranted.

---

## DESIGN SYSTEM INHERITANCE

> [!IMPORTANT]
> This section is mandatory per UI-011 (AI_AGENT_RULES.md).
> This phase inherits the current approved KOSHK design system.
> It MUST NOT introduce a separate visual language.

This phase inherits the full approved design system — any production configuration UI
must follow established design tokens, RTL behavior, and component library.

---

*Last updated: 2026-10-03 (Gate 5.3 — Documentation Reconciliation. PLANNED stub verified as
accurate. No deployment infrastructure found. Pending decisions documented. Status: PLANNED confirmed.)*
