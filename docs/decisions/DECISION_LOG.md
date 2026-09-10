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
| UNK-003 | ORM / Database driver selection | RESOLVED — see DEC-022 |
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

### DEC-022

**Date:** 2026-09-09 (Phase 01)  
**Category:** Technology — ORM / Database Driver  
**Decision:** The database access layer uses **Drizzle ORM** with the `mysql2` driver.  
**Reason:** Approved by the project owner. Drizzle provides excellent TypeScript type safety, schema-as-code, lightweight query builder syntax, and clean migration management compatible with MySQL/MariaDB on Hostinger.  
**Impact:** All database access, schema definition, migrations. All database code must use Drizzle ORM patterns. No raw query library or alternative ORM will be used unless a future change request supersedes this decision.  
**Affected Modules:** All (backend database layer)  
**Status:** ACTIVE  
**Source:** Project owner approval — Phase 01 planning (2026-09-09)

---

### DEC-023

**Date:** 2026-09-09 (Phase 01)  
**Category:** Design — Arabic Typography  
**Decision:** The primary Arabic font is **Cairo** (Google Fonts). It is loaded via `@import` in the frontend CSS and applied globally as the default `font-family`.  
**Reason:** Approved by the project owner. Cairo is geometric and premium-feeling, matching the navy/gold KOSHK SKATE visual identity.  
**Impact:** All frontend UI. Every screen must render in Cairo. No other Arabic font should be used unless an explicit design decision supersedes this.  
**Affected Modules:** All (frontend)  
**Status:** ACTIVE  
**Source:** Project owner approval — Phase 01 planning (2026-09-09)

---

### DEC-024

**Date:** 2026-09-09 (pre-Phase 02)  
**Category:** Security — Authentication  
**Decision:** Authentication mechanism is **JWT + Refresh Token**.

- **Access token:** Short-lived JWT (recommended: 15 minutes). Sent as `Authorization: Bearer <token>` header.
- **Refresh token:** Long-lived (recommended: 7 days). Stored server-side (DB table `refresh_tokens`) and as an `HttpOnly` cookie or returned in the response body for storage by the client.
- **Rotation:** Refresh tokens are single-use. On each refresh, the old token is invalidated and a new pair is issued.
- **Revocation:** Refresh tokens are stored in the database, allowing forced logout (revoke by deleting the DB record). Access tokens are short-lived and expire naturally; no blacklist is required unless a shorter invalidation window is needed.
- **Logout:** Deletes the refresh token from the database.

**Reason:** Project owner decision. JWT + refresh token balances statelessness (access token) with revocability (refresh token stored in DB), which is required for cashier-shift-aware security (shift close must be able to force logout).

**Impact:**
- Phase 02 will implement: `refresh_tokens` table, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `apps/api/src/middleware/auth.ts`
- All subsequent phases depend on this auth mechanism for protected routes
- Frontend must store the refresh token and implement the silent refresh flow

**Affected Modules:** Auth (Phase 02), all modules with protected routes (Phase 03+)  
**Status:** ACTIVE  
**Source:** Project owner decision — 2026-09-09 (pre-Phase 02)  
**Resolves:** UNK-004

---

### DEC-025

**Date:** 2026-09-09 (Phase 02 planning — owner approval)
**Category:** Security — Refresh Token Storage
**Decision:** The refresh token is stored in an **HttpOnly cookie** (not localStorage, not memory-only).
- Access token: stored in memory, sent via `Authorization: Bearer` header.
- Refresh token: sent as an `HttpOnly`, `SameSite=Strict` (development: `SameSite=None; Secure` in production) cookie AND tracked server-side in the `refresh_tokens` DB table.
- The frontend never accesses the refresh token value directly.
- Cookie settings for production: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth/refresh`.
- CSRF: Not applicable for the access token (header-based). The refresh cookie is scoped to the refresh endpoint only.

**Reason:** Owner-approved. Most secure client-side storage option. Prevents XSS access to the refresh token. CSRF is mitigated by limiting the cookie path to the refresh endpoint.
**Impact:** All auth middleware, login endpoint, refresh endpoint, logout endpoint, frontend API client.
**Affected Modules:** Auth, all protected routes
**Status:** ACTIVE
**Source:** Owner approval — Phase 02 open questions (2026-09-09)
**Resolves:** OQ-01

---

### DEC-026

**Date:** 2026-09-09 (Phase 02 planning — owner approval)
**Category:** Operations — Seed Admin Credentials
**Decision:** The database seed creates a default admin user with:
- Email: read from `SEED_ADMIN_EMAIL` environment variable (default: `admin@koshkskate.com`)
- Password: read from `SEED_ADMIN_PASSWORD` environment variable (default: `Koshk@12345`)
- Only the **bcrypt hash** (min 12 rounds) is stored in the database. The plain password is never stored.
- The seed script is **idempotent**: it checks by email before inserting and does NOT create duplicates on repeated runs.
- Credentials must be changed after first login. This is a stated expectation, not a technical enforcement in Phase 02.

**Reason:** Owner-approved. Credentials must not be hardcoded in source code. Idempotency prevents double-seeding errors.
**Impact:** Seed script, `.env.example`, documentation.
**Affected Modules:** Auth, Users
**Status:** ACTIVE
**Source:** Owner approval — Phase 02 open questions (2026-09-09)
**Resolves:** OQ-02

---

### DEC-027

**Date:** 2026-09-09 (Phase 02 planning — owner approval)
**Category:** Security — Rate Limiting
**Decision:** The login endpoint (`POST /api/v1/auth/login`) is rate-limited to **10 attempts per minute per IP** using an **in-memory rate limiter** (`express-rate-limit` with default MemoryStore).
- Redis is NOT required. The system is a modular monolith on a single Hostinger server.
- If the architecture ever moves to multi-server, this decision should be revisited.

**Reason:** Owner-approved. In-memory is appropriate for the current single-server deployment target.
**Impact:** Login endpoint only.
**Affected Modules:** Auth
**Status:** ACTIVE
**Source:** Owner approval — Phase 02 open questions (2026-09-09)
**Resolves:** OQ-03

---

### DEC-028

**Date:** 2026-09-09 (Phase 02 planning — owner approval)
**Category:** Security — JWT Secrets
**Decision:** The access token and refresh token use **separate signing secrets**:
- `JWT_SECRET` — used to sign access tokens
- `JWT_REFRESH_SECRET` — used to sign refresh tokens
Both secrets must be cryptographically random strings (min 32 bytes), stored in `.env` only, and never committed to Git.

**Reason:** Owner-approved. Compromise of one secret does not compromise the other.
**Impact:** Auth service, env config, `.env.example`.
**Affected Modules:** Auth
**Status:** ACTIVE
**Source:** Owner approval — Phase 02 open questions (2026-09-09)
**Resolves:** OQ-04

---

### DEC-029

**Date:** 2026-09-09 (Phase 02 planning — owner approval)
**Category:** Product — Password Reset
**Decision:** Forgot-password and password-reset functionality is **OUT OF SCOPE for Phase 02**. No implementation will be done in this phase.
- This feature requires an email provider, which is pending (UNK-009).
- It will be introduced in a future phase or Change Request after the email provider decision is made.

**Reason:** Owner-approved. Dependency on UNK-009 (email provider) is unresolved.
**Impact:** None in Phase 02.
**Affected Modules:** Auth (future)
**Status:** ACTIVE
**Source:** Owner approval — Phase 02 open questions (2026-09-09)
**Resolves:** OQ-05

---

### DEC-030

**Date:** 2026-09-10 (Phase 03 planning — owner approval)
**Category:** Business Rule — Skate Code Entry
**Decision:** When creating a skate, the `skate_code` is **optional on input**.

- If the user provides a `skate_code`, it is used as-is (subject to uniqueness validation).
- If the user does not provide a `skate_code`, the system **automatically generates** the next available unique code.
- Generated codes must always be unique. No duplicate `skate_code` may exist.

**Auto-Generation Algorithm — RESOLVED (2026-09-10 IMPL-001):**
- Format: `SK-` prefix followed by a **3-digit zero-padded sequential number**.
- Examples: `SK-001`, `SK-002`, ..., `SK-009`, `SK-010`, ..., `SK-099`, `SK-100`, ...
- The system finds the highest existing numeric suffix across ALL skates (including deactivated ones) and increments by 1.
- **A previously used Skate Code must NEVER be reused, even if the skate is later deactivated.** Deactivated skates still occupy their code permanently.
- Implementation: Query `MAX` of the numeric portion of existing `skate_code` values matching the `SK-NNN` pattern; increment; format with `padStart(3, '0')`.
- If no skates exist yet, the first generated code is `SK-001`.

**Reason:** Owner-approved Phase 03 decision. Resolves conflict in the earlier Phase 03 plan where `createSkate()` assumed both auto-generation and a mandatory 400 response for missing `skate_code`. Algorithm confirmed 2026-09-10 (IMPL-001).

**Impact:**
- `createSkate()` service: `skate_code` is optional; validate uniqueness if provided; auto-generate if absent using `SK-NNN` format.
- TC-SK-02 (previously "missing skate_code → 400") is **updated**: missing `skate_code` → system generates one → 201 (not 400).
- TC-SK-02 now verifies auto-generated code matches `SK-NNN` format.
- `CreateSkateRequest` type: `skate_code` is optional (`skate_code?: string`).
- `is_active = false` does NOT release the code for reuse.

**Affected Modules:** Skates
**Status:** ACTIVE
**Source:** Owner approval — Phase 03 open question OD-01 (2026-09-10); algorithm confirmed IMPL-001 (2026-09-10)

---

### DEC-031

**Date:** 2026-09-10 (Phase 03 planning — owner approval)
**Category:** Business Rule — Skate Status Transitions (Admin API)
**Decision:** Through the admin `PUT /api/v1/skates/:id` endpoint, the following direct status transitions are **permitted**:

| From | To | Permitted by Admin? |
|---|---|---|
| `available` | `maintenance` | ✅ YES |
| `available` | `damaged` | ✅ YES |
| `available` | `lost` | ✅ YES |
| `maintenance` | `available` | ✅ YES |
| `damaged` | `available` | ✅ YES |
| `lost` | `available` | ✅ YES |
| Any | `rented` | ❌ NO — Rental workflow only (Phase 05) |
| Any | `reserved` | ❌ NO — Reservation workflow only (Phase 10) |

The Admin is the operational owner of the asset's condition/status except for `rented` and `reserved`, which are controlled exclusively by their respective business workflows.

No additional transition restrictions beyond those listed above are to be applied unless required by another approved decision.

Note: DEC-007 remains active — a skate requiring maintenance cannot become `available` until the maintenance record is completed. However, in Phase 03, no maintenance records exist yet (Phase 09). This rule will be enforced in the maintenance workflow phase. In Phase 03, the admin can set `maintenance → available` directly without a maintenance record check.

**Reason:** Owner-approved Phase 03 decision. Resolves OD-02.

**Impact:**
- `updateSkate()` service: validate that new status ≠ `rented` and ≠ `reserved`; allow all other direct transitions.
- TC-SK-09 updated: attempt to set `status=rented` via admin API → 422.
- DEC-007 enforcement deferred to Phase 09 (maintenance workflow).

**Affected Modules:** Skates; deferred impact on Rentals (Phase 05), Reservations (Phase 10), Maintenance (Phase 09)
**Status:** ACTIVE
**Source:** Owner approval — Phase 03 open question OD-02 (2026-09-10)

---

### DEC-032

**Date:** 2026-09-10 (Phase 03 planning — owner approval)
**Category:** Business Rule — QR Code & Barcode Generation
**Decision:** QR code and barcode values are **automatically generated** by the system when a skate is created.

- The system must store the generated values in the `qr_code` and `barcode` columns.
- The user is allowed to **edit** the stored QR/barcode values after creation when needed.

**QR Code Payload — RESOLVED (2026-09-10 IMPL-002):**
- `qr_code` value = the skate's `skate_code`.
- Example: `skate_code = SK-025` → `qr_code = "SK-025"`.
- This value is set at creation time and defaults to the generated or user-provided `skate_code`.
- The stored value remains **user-editable** after creation.
- **QR image rendering is NOT part of Phase 03.** Only the string value is stored and displayed.

**Barcode Value — RESOLVED (2026-09-10 IMPL-003):**
- `barcode` value defaults to the skate's `skate_code`.
- Example: `skate_code = SK-025` → `barcode = "SK-025"`.
- This value is set at creation time and defaults to the generated or user-provided `skate_code`.
- The stored value remains **user-editable** after creation.
- **Barcode image rendering is NOT part of Phase 03.** Only the string value is stored and displayed.

**Reason:** Owner-approved Phase 03 decision. Resolves OD-03. Payload formats confirmed 2026-09-10 (IMPL-002, IMPL-003).

**Impact:**
- `skates` schema: `qr_code` VARCHAR(255) NULL; `barcode` VARCHAR(255) NULL.
- `createSkate()` service: set `qr_code = skate_code` and `barcode = skate_code` at creation.
- `updateSkate()` service: allow `qr_code` and `barcode` to be updated independently.
- Frontend: show `qr_code` and `barcode` as editable text inputs (pre-filled with skate_code on create).
- No QR or barcode image rendering library required in Phase 03.

**Affected Modules:** Skates
**Status:** ACTIVE
**Source:** Owner approval — Phase 03 open question OD-03 (2026-09-10); formats confirmed IMPL-002, IMPL-003 (2026-09-10)

---

### DEC-033

**Date:** 2026-09-10 (Phase 03 planning — owner approval; updated 2026-09-10 IMPL-004)
**Category:** Product — Skate Type in Phase 03
**Decision:** In Phase 03, Skate Type is implemented as a **free-text input field**. No hardcoded type list is invented.

- The Settings module will NOT be implemented in Phase 03.
- **Do NOT invent or hard-code a final business list of Skate Types.** No approved documentation defines initial type values.
- Skate Type is implemented as a plain free-text `<input type="text">` field in Phase 03. This avoids locking the system into an invented temporary list.
- The `type` column is `VARCHAR(50)` — free text, forward-compatible with future Settings-driven dropdown migration.
- When the Settings phase is implemented, Skate Type can be migrated from free-text entry to a configurable dropdown without a schema change.
- Phase 03 must not be blocked by the absence of a final Skate Type list.

**Supersedes:** The earlier statement in DEC-033 that Phase 03 would use a "temporary fixed dropdown" is **corrected** by IMPL-004. A fixed dropdown is not appropriate because it would require inventing type values that have no approved source. Free-text input is the correct Phase 03 implementation.

**Reason:** Owner-approved Phase 03 decision. Resolves OD-04. Updated by IMPL-004 (2026-09-10) to replace "fixed dropdown" with "free-text input" — no type values exist in approved documentation.

**Impact:**
- No Settings module work in Phase 03.
- Frontend `SkatesPage`: Skate Type shown as a plain `<input type="text">` (not a `<select>`). No hardcoded options.
- `type` column remains `VARCHAR(50)` — no change to schema.
- TD-003 remains: migration to Settings-configurable dropdown required in a future phase.

**Affected Modules:** Skates; deferred impact on Settings (future phase)
**Status:** ACTIVE
**Source:** Owner approval — Phase 03 open question OD-04 (2026-09-10); updated IMPL-004 (2026-09-10)

---

*Last updated: 2026-09-10 (DEC-030 to DEC-033 updated — IMPL-001 to IMPL-004 resolved — Phase 03 fully specified) by AI Agent*
