# Decision Log — KOSHK SKATE ERP

**Version:** 1.1  
**Purpose:** Record all significant business and technical decisions.

Every decision recorded here is part of the project's institutional memory. Future AI agents must read this log before making changes in related areas.

---

## How to Use This Log

**When to add an entry:**
- A business rule is confirmed or clarified
- A technology is chosen
- An architecture decision is made
- A business rule conflict is identified
- A change request is approved or rejected

**When NOT to add an entry:**
- Trivial implementation details with no business impact
- Cosmetic code choices

**Status values:**
- `ACTIVE` — decision stands
- `SUPERSEDED` — replaced by a newer decision (reference the newer entry)
- `PENDING` — awaiting project owner confirmation
- `CONFLICT REQUIRES DECISION` — two sources disagree, needs resolution

---

## Decisions

---

### DEC-001

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** The system is Arabic-first and RTL-first. All user-facing UI must be in Arabic. RTL is a first-class design constraint, not an afterthought.  
**Reason:** Approved product requirement per Master Business Specification §3 and Visual Design Reference §5.  
**Impact:** Every UI screen, form, notification, error message, invoice, and report must be in Arabic RTL.  
**Affected Modules:** All  
**Status:** ACTIVE  
**Source:** Master Business Specification §3; Visual Design Reference §5

---

### DEC-002

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** An unavailable skate (status: Rented, Maintenance, Reserved, Damaged, Lost) cannot be selected for a new rental. This check must be enforced server-side.  
**Reason:** Core business rule — prevents double rental and invalid states.  
**Impact:** Rental creation endpoint must validate skate availability atomically.  
**Affected Modules:** Rentals, Skates  
**Status:** ACTIVE  
**Source:** Master Business Specification §49, Rules 1–3, 15

---

### DEC-003

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** Rental pricing must come from configuration, never hardcoded. When pricing is changed, historical rentals retain their historical amounts.  
**Reason:** Business flexibility requirement. Historical data integrity.  
**Impact:** Rental records must store the price at the time of rental, not reference the current pricing config.  
**Affected Modules:** Rentals, Settings  
**Status:** ACTIVE  
**Source:** Master Business Specification §11

---

### DEC-004

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** Late time starts only after the expected end time. The late fee is calculated as: configured fee per minute × number of late minutes. The system distinguishes: calculated fee, collected fee, and waived fee.  
**Reason:** Core business rule for fair fee calculation and accurate reporting.  
**Impact:** Late fee calculation logic, return workflow, reports.  
**Affected Modules:** Rentals, Payments, Reports  
**Status:** ACTIVE  
**Source:** Master Business Specification §17, §18

---

### DEC-005

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** Late fee waiver requires explicit permission. Every waiver must be recorded in the audit log with: user, amount waived, timestamp, reason.  
**Reason:** Accountability and fraud prevention.  
**Impact:** Audit log, permissions system, return workflow.  
**Affected Modules:** Rentals, Payments, Audit Log, Users/Permissions  
**Status:** ACTIVE  
**Source:** Master Business Specification §18, §49 Rule 8–9

---

### DEC-006

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** Customer damage charge and maintenance cost are separate financial events. Damage charge is customer income. Maintenance cost is a business expense. They must not be merged.  
**Reason:** Operational financial accuracy.  
**Impact:** Damage records, financial reports, treasury movements.  
**Affected Modules:** Damage, Maintenance, Treasury, Reports  
**Status:** ACTIVE  
**Source:** Master Business Specification §22, §53

---

### DEC-007

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** A skate requiring maintenance cannot become Available until the required maintenance record is marked Completed.  
**Reason:** Safety and asset lifecycle integrity.  
**Impact:** Skate status transitions, maintenance workflow.  
**Affected Modules:** Maintenance, Skates, Rentals  
**Status:** ACTIVE  
**Source:** Master Business Specification §23, §49 Rule 12

---

### DEC-008

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** The system must support split payments (multiple payment methods for one transaction). Each payment component must be individually identifiable but linked to the same business transaction.  
**Reason:** Real-world cashier requirement.  
**Impact:** Payment recording, treasury movements, receipts.  
**Affected Modules:** Payments, Treasury, Rentals, Sales POS  
**Status:** ACTIVE  
**Source:** Master Business Specification §14

---

### DEC-009

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** Historical rental, inspection, damage, and maintenance records must be retained permanently. Disabling or decommissioning a skate must not delete its history.  
**Reason:** Audit, legal, and operational reporting integrity.  
**Impact:** No hard-delete of historical records. Soft-delete or status-change only.  
**Affected Modules:** Skates, Rentals, Damage, Maintenance, Audit Log  
**Status:** ACTIVE  
**Source:** Master Business Specification §25, §49 Rules 18–19

---

### DEC-010

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** The authoritative rental state (active, late, expired) must be server-side. Browser-only timers must not be the authoritative source of rental state.  
**Reason:** Prevents manipulation and inconsistency between sessions/devices.  
**Impact:** Backend must calculate rental status based on actual timestamps.  
**Affected Modules:** Rentals, Notifications  
**Status:** ACTIVE  
**Source:** Master Business Specification §16, §49 Rule 20

---

### DEC-011

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** The Rental POS and Sales POS are separate workflows. Rental is individual asset lifecycle management. Sales is product/spare-part sales. They must not be merged.  
**Reason:** Distinct business workflows with different financial, inventory, and operational implications.  
**Impact:** Separate UI flows, separate API routes, separate reports.  
**Affected Modules:** Rentals, Sales POS  
**Status:** ACTIVE  
**Source:** Master Business Specification §27, §53

---

### DEC-012

**Date:** 2026-09-09  
**Category:** Product  
**Decision:** The product is a single cloud application accessed via browser. It must be responsive for desktop, tablet, and mobile. There must NOT be separate desktop and mobile applications.  
**Reason:** Approved product requirement.  
**Impact:** Frontend must be responsive. Mobile is an adapted experience, not a separate product.  
**Affected Modules:** All  
**Status:** ACTIVE  
**Source:** Master Business Specification §4

---

### DEC-013

**Date:** 2026-09-09  
**Category:** Design  
**Decision:** The visual system is the KOSHK SKATE design language: navy (#192744) primary, gold (#F3B735) accent, white cards, light cool-gray background, Cairo/Tajawal Arabic font. Exact token values are screenshot-derived and approximate; they should be confirmed once the frontend design system is established.  
**Reason:** Approved visual design reference.  
**Impact:** Every new screen must match the KOSHK SKATE visual DNA.  
**Affected Modules:** All  
**Status:** ACTIVE  
**Source:** Visual Design Reference §27, §36

---

### DEC-014

**Date:** 2026-09-09  
**Category:** Technology  
**Decision:** SUPERSEDED — Replaced by DEC-019 and DEC-020. The original entry recorded that no technology had been selected.  
**Reason:** Technology decisions have since been made by the project owner.  
**Impact:** All architecture.  
**Affected Modules:** All  
**Status:** SUPERSEDED (see DEC-019, DEC-020)  
**Source:** Repository inspection 2026-09-09

---

### DEC-015

**Date:** 2026-09-09  
**Category:** Deployment  
**Decision:** The target hosting environment is Hostinger (Web/Cloud). Technology choices must remain compatible with: Node.js application hosting, MySQL/MariaDB, HTTPS, environment variables, GitHub-based deployment. Kubernetes, microservices, RabbitMQ, Kafka, or complex distributed systems are not required unless a verified requirement justifies them. Prefer a maintainable modular monolith.  
**Reason:** Stated project constraint from governance prompt.  
**Impact:** Technology selection must respect Hostinger constraints.  
**Affected Modules:** All (deployment)  
**Status:** ACTIVE  
**Source:** Governance initialization prompt §24–25

---

### DEC-016

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** Roles must be configurable by the Administrator. The system must support dynamic role/permission management. The initial roles (Administrator, Cashier, Maintenance Staff) are examples, not hard limits.  
**Reason:** Business flexibility requirement.  
**Impact:** Permissions system must be data-driven, not code-driven.  
**Affected Modules:** Users, Permissions, Settings  
**Status:** ACTIVE  
**Source:** Master Business Specification §5

---

### DEC-017

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** The operating result report distinguishes Revenue vs Expenses vs Result. It must NOT be labeled "Net Profit" unless a complete formal accounting system is implemented.  
**Reason:** Prevents misrepresentation of financial data.  
**Impact:** Reports module naming and presentation.  
**Affected Modules:** Reports  
**Status:** ACTIVE  
**Source:** Master Business Specification §44

---

### DEC-018

**Date:** 2026-09-09  
**Category:** Business Rule  
**Decision:** Notifications for rental expiration must alert the cashier exactly one minute before the expected rental end time. Notification delivery strategy (WebSocket, polling, push) is UNKNOWN and pending technical decision.  
**Reason:** Operational requirement to alert cashiers proactively.  
**Impact:** Notification architecture.  
**Affected Modules:** Notifications, Rentals  
**Status:** ACTIVE (business rule) | PENDING (technical implementation)  
**Source:** Master Business Specification §16

---

## Conflicts Requiring Human Decision

| ID | Description | Status |
|---|---|---|
| DEC-018 (partial) | Notification delivery mechanism (SSE/WebSocket/polling?) | PENDING |
| UNK-003 | ORM / Database driver selection | PENDING |
| UNK-004 | Authentication mechanism (JWT stateless / JWT+refresh / Session) | PENDING |

---

### DEC-019

**Date:** 2026-09-09 (reconciled)  
**Category:** Technology — Frontend Stack  
**Decision:** The frontend is implemented with **React + Vite + TypeScript**.  
**Reason:** Approved by the project owner as the frontend technology direction.  
**Impact:** All frontend implementation, component structure, build system, state management library selection.  
**Affected Modules:** All (frontend)  
**Status:** ACTIVE  
**Source:** Project owner decision (reconciliation task 2026-09-09)

---

### DEC-020

**Date:** 2026-09-09 (reconciled)  
**Category:** Technology — Backend Stack  
**Decision:** The backend is implemented with **Node.js + Express + TypeScript**.  
**Reason:** Approved by the project owner as the backend technology direction.  
**Impact:** All backend implementation, middleware, route structure, service layers, error handling.  
**Affected Modules:** All (backend)  
**Status:** ACTIVE  
**Source:** Project owner decision (reconciliation task 2026-09-09)

---

### DEC-021

**Date:** 2026-09-09 (reconciled)  
**Category:** Technology — Source Control  
**Decision:** The project uses **GitHub** for source control. Repository: `https://github.com/mohamedalihassanwork-cpu/Skate-system`. Default branch: `master`.  
**Reason:** Project owner created and configured the repository.  
**Impact:** All deployment workflows, collaboration, CI/CD (when configured).  
**Affected Modules:** All (infrastructure)  
**Status:** ACTIVE  
**Source:** Verified from local git configuration 2026-09-09

---

*Last updated: 2026-09-09 (reconciled) by AI Governance Agent*
