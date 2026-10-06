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

### DEC-034

**Date:** 2026-09-10 (Phase 03.5 OD-001 — owner approval)  
**Category:** Design — Semantic Color System  
**Decision:** The following semantic color tokens are APPROVED for implementation in `design-system.css`:

Success (متاح / Available / Healthy):
- `--color-success-500: #58C89A`
- `--color-success-bg: #DDF6EA`
- `--color-success-text: #159A69`

Warning (تنبيه / Attention — same family as gold accent per VDR §2.2):
- `--color-warning-500: #F3B735`
- `--color-warning-bg: #FFF1C9`
- `--color-warning-text: #C88B00`

Danger (خطأ / Error / Destructive / متأخر):
- `--color-danger-500: #ED4547`
- `--color-danger-bg: #FCE0E1`
- `--color-danger-text: #D83C40`

Neutral (مفقود / Inactive — NEW, previously absent):
- `--color-neutral-bg: #EEF1F5`
- `--color-neutral-text: #657084`

**Reason:** Existing semantic tokens in `design-system.css` diverged from the approved Visual Design Reference §2.2. Owner-approved correction and addition of missing neutral tokens.

**Impact:**
- `apps/web/src/styles/design-system.css` — update semantic color tokens (Phase 03.5 Stage 2)
- All status badges using old hardcoded colors must migrate to these tokens
- Badge component (`Badge.tsx`) will use these tokens exclusively

**Affected Modules:** UI Shell, All modules with status badges  
**Status:** ACTIVE  
**Source:** Owner approval — Phase 03.5 OD-001 (2026-09-10)

---

### DEC-035

**Date:** 2026-09-10 (Phase 03.5 OD-002 — owner approval)  
**Category:** Design — Login Page Layout  
**Decision:** The Login Page must use a split-screen layout on desktop and a centered single-column layout on mobile.

Desktop:
- Left panel (50%): Navy-800 branding panel with KOSHK SKATE logo and Arabic headline
- Right panel (50%): White form panel with email, password, and primary CTA button

Mobile (< 640px):
- Centered single-column card layout (branding panel hidden)

Preserved across both layouts:
- Arabic-first language
- RTL text direction
- Cairo typography
- KOSHK Navy/Gold visual identity

**Reason:** The Visual Design Reference describes a split-screen login experience. The current implementation is a centered single-column card. This decision formally aligns the specification with the VDR and approves the desktop upgrade while defining the mobile fallback.

**Impact:**
- `apps/web/src/modules/auth/LoginPage.tsx` — rebuild with split-screen desktop layout (Phase 03.5 Stage 2)
- No API, backend, or auth logic changes required

**Affected Modules:** Auth (LoginPage)  
**Status:** ACTIVE  
**Source:** Owner approval — Phase 03.5 OD-002 (2026-09-10)

---

### DEC-036

**Date:** 2026-09-10 (Phase 03.5 OD-003 — owner approval)  
**Category:** Technical — Icon Library  
**Decision:** Lucide React is the approved SVG icon library for the KOSHK SKATE ERP.

Rules:
- Package: `lucide-react` (MIT license)
- Only Lucide icons may be used — no emoji, no other icon libraries
- One coherent icon style throughout: stroke-based geometric Lucide icons
- Icons are tree-shakeable — only imported icons are included in the bundle

Emoji-to-Lucide replacement map is documented in `docs/design/DESIGN_SYSTEM.md §9`.

**Reason:** The current implementation uses emoji characters as navigation and action icons. This is unprofessional and inaccessible. Lucide React was selected for its MIT license, consistent geometric style, React-native integration, and full tree-shakeability.

**Impact:**
- `apps/api`: no change
- `apps/web/package.json`: add `lucide-react` dependency (Phase 03.5 Stage 2)
- All emoji in `App.tsx` (sidebar), `Topbar`, and all pages must be replaced
- See emoji mapping in `docs/design/DESIGN_SYSTEM.md §9`

**Affected Modules:** App Shell (Sidebar, Topbar), all existing pages  
**Status:** ACTIVE  
**Source:** Owner approval — Phase 03.5 OD-003 (2026-09-10)

---

### DEC-037

**Date:** 2026-09-10 (Phase 03.5 OD-004 — owner approval)  
**Category:** Governance — UI Rules  
**Decision:** All 10 UI governance rules (UI-001 through UI-010) are APPROVED and mandatory for all future ERP development.

UI-001: Design System First  
UI-002: Shared Components Mandatory  
UI-003: No Emoji in UI  
UI-004: Arabic-RTL Verification Mandatory  
UI-005: No Native Browser Dialogs  
UI-006: New Patterns Require Approval  
UI-007: No Inline Style Objects for Structure  
UI-008: Phase Completion Requires UI/UX DoD  
UI-009: Mobile Must Be Intentionally Designed  
UI-010: AI Agents Must Reuse Before Creating  

Full rule text documented in `docs/00-governance/AI_AGENT_RULES.md` (UI Governance Rules section).

**Reason:** Formalizes the UI quality standards discovered during Phase 03.5 discovery. Prevents regression in future phases.

**Impact:**
- `docs/00-governance/AI_AGENT_RULES.md` — rules added (Phase 03.5 Stage 1 COMPLETE)
- `docs/00-governance/DEFINITION_OF_DONE.md` — UI/UX DoD updated (Phase 03.5 Stage 1 COMPLETE)
- All Phase 04+ modules must comply with these rules

**Affected Modules:** All future modules  
**Status:** ACTIVE  
**Source:** Owner approval — Phase 03.5 OD-004 (2026-09-10)

---

### DEC-038

**Date:** 2026-09-10 (Phase 03.5 OD-005 — owner approval)  
**Category:** Design — Sidebar Behavior  
**Decision:** The desktop sidebar must support both an expanded state (240px) and a collapsed state (64px icon-only).

Expanded state (default):
- 240px width
- Icons + text labels visible
- Active state: gold tint background + gold text + gold indicator bar

Collapsed state:
- 64px width
- Icons visible and centered (text labels hidden)
- Active state remains visually obvious (icon in gold, indicator bar visible)
- Tooltips appear on hover with Arabic module name
- Correct RTL behavior maintained

Toggle:
- Toggle button visible in sidebar or topbar
- State persisted in `localStorage` key: `koshk_sidebar_collapsed`
- Transition: 300ms ease-in-out

Mobile behavior:
- Mobile sidebar is always a full-height drawer (NOT the collapsed desktop state)
- Triggered by hamburger icon in topbar
- Slides in from right, 80% width, max 320px, with backdrop

**Reason:** Operators who manage dense information screens benefit from more horizontal workspace. The collapsed sidebar provides this without breaking the mobile experience.

**Impact:**
- `apps/web/src/App.tsx` or Sidebar component — collapse state management (Phase 03.5 Stage 2)
- `--sidebar-collapsed-width: 64px` token added to `design-system.css`
- Mobile drawer is a separate responsive implementation

**Affected Modules:** App Shell (Sidebar)  
**Status:** ACTIVE  
**Source:** Owner approval — Phase 03.5 OD-005 (2026-09-10)

---

### DEC-039

**Date:** 2026-09-10 (Phase 03.5 — governance)  
**Category:** Governance — Documentation-First Development  
**Decision:** All project phases (Phase 03.5 onwards) and all meaningful feature requests must follow the Documentation-First Development lifecycle.

Required lifecycle:
1. Review existing documentation
2. Reconcile conflicts per SOURCE_OF_TRUTH.md
3. Update documentation
4. Record and resolve owner decisions
5. Produce approved phase/feature specification
6. Implement
7. Test
8. Verify
9. Update documentation post-implementation
10. Git commit and push
11. Report completion

This rule is formally documented as Rule 16 in `docs/00-governance/AI_AGENT_RULES.md`.

**Reason:** Documentation-after-implementation leads to documentation drift, AI agents making incorrect assumptions, and regressions. Documentation-first ensures the project remains governable at scale.

**Impact:**
- `docs/00-governance/AI_AGENT_RULES.md` — Rule 16 added (Phase 03.5 Stage 1 COMPLETE)
- Applies to Phase 03.5, Phase 04, and all future phases

**Affected Modules:** Governance (all phases)  
**Status:** ACTIVE  
**Source:** Owner-directed — Phase 03.5 governance requirement (2026-09-10)

---

### DEC-040

**Date:** 2026-09-10 (Phase 03.5 — future phase inheritance)  
**Category:** Governance — Phase Inheritance  
**Decision:** Every future phase automatically inherits, without needing to redefine:

- Project governance (`docs/00-governance/`)
- Source-of-truth hierarchy (`SOURCE_OF_TRUTH.md`)
- Documentation-first development (DEC-039, AI_AGENT_RULES.md Rule 16)
- Approved design system (`docs/design/DESIGN_SYSTEM.md`)
- UI governance rules UI-001 through UI-010 (DEC-037)
- RTL requirements (DEC-001)
- Accessibility requirements (DESIGN_SYSTEM.md §11)
- Responsive requirements (DESIGN_SYSTEM.md §16)
- Shared component reuse (UI-002, UI-010)
- Git and verification requirements (AI_AGENT_RULES.md Rules 8 and 9)

Future phases must NOT redefine these unless the owner explicitly approves a change.

**Reason:** Prevents each new phase from accidentally overriding or forgetting established project governance. Establishes a clear floor of quality and process.

**Impact:**
- `docs/00-governance/AI_AGENT_RULES.md` — Rule 17 added (Phase 03.5 Stage 1 COMPLETE)
- All phase specifications from Phase 04 onwards inherit these rules by reference

**Affected Modules:** All future phases  
**Status:** ACTIVE  
**Source:** Owner-directed — Phase 03.5 governance requirement (2026-09-10)

---

### DEC-041

**Date:** 2026-09-14 (Phase 03.5 close-out — SYS-018 WCAG AA correction)
**Category:** Design — Semantic Color System
**Decision:** The approved `--color-warning-text` token value is updated from `#C88B00` to `#7A5500`.

The original value `#C88B00` was recorded in DEC-034 (Phase 03.5 OD-001). During the System-wide UI Consistency Audit (SYS-018), a WCAG AA contrast failure was discovered: `#C88B00` on `#FFF1C9` (warning-bg) achieves approximately 3.27:1 contrast ratio, below the WCAG AA minimum of 4.5:1 for small text.

Owner approved Option A: darken warning text to `#7A5500`, which achieves approximately 5.9:1 contrast on the `#FFF1C9` warning background. This correction was implemented in `apps/web/src/styles/design-system.css` in commit `b907372`.

**Supersedes:** The `--color-warning-text` value stated in DEC-034. All other DEC-034 semantic color values remain unchanged and active.

**Implementation:**
- `apps/web/src/styles/design-system.css` — `--color-warning-text: #7A5500` (IMPLEMENTED, commit b907372)
- `docs/design/DESIGN_SYSTEM.md` §2.B — corrected to reflect `#7A5500` (this remediation)

**Impact:** All warning-state badges (status: reserved, maintenance, system) now display with accessible contrast. No visible behavior change other than slightly darker text.

**Affected Modules:** All modules using warning Badge variant
**Status:** ACTIVE
**Source:** Owner approval — SYS-018 Option A (2026-09-14)

---

### DEC-042

**Date:** 2026-09-14 (Phase 03.5 — Desktop UI Audit D-009, currency standard formalized)
**Category:** Design — Currency Display Standard
**Decision:** The approved ERP-wide currency display standard is:

- **Currency:** EGP — Egyptian Pound
- **Arabic symbol:** ج.م (abbreviation for جنيه مصري)
- **Numerals:** Western Arabic (0–9) using `en-US` locale formatting internally
- **Thousands separator:** comma
- **Decimal separator:** period
- **Format:** `1,250 ج.م` (whole amounts) / `1,250.50 ج.م` (fractional amounts)
- **Zero amount:** `0 ج.م`
- **Null/undefined:** `— ج.م`

**Implementation:** The shared `formatCurrency()` utility at `apps/web/src/utils/currency.ts` implements this standard. All future phases MUST use this utility for all financial amount display. A separate formatter must NOT be created.

**Reason:** Ensures consistent currency display across all ERP modules. Western numerals are used for operational readability while the Arabic EGP symbol maintains the Arabic-first identity.

**Affected Modules:** All modules displaying financial amounts (Rentals, Payments, Treasury, Expenses, Sales, Reports, Dashboard, Invoices)
**Status:** ACTIVE
**Source:** Owner approval — Phase 03.5 Desktop UI Audit D-009 (2026-09-14)

---

### DEC-043

**Date:** 2026-09-14 (Phase 03.5 close-out — Badge API formalized)
**Category:** Design — Badge Component API
**Decision:** The approved `BadgeStatus` type for the shared `<Badge>` component is:

```typescript
type BadgeStatus =
  | 'available'    // Success variant: متاح
  | 'rented'       // Info variant: مستأجر
  | 'reserved'     // Warning variant: محجوز
  | 'maintenance'  // Warning variant: صيانة
  | 'damaged'      // Danger variant: تالف
  | 'lost'         // Neutral variant: مفقود
  | 'active'       // Success variant: نشط
  | 'inactive'     // Neutral variant: غير نشط
  | 'role'         // Role variant: navy-50 bg / navy-700 text (user role pills)
  | 'system'       // Warning variant: نظامي (system-defined resource marker)
```

All future modules MUST use these status values with the shared `<Badge status={...}>` prop. New status values for new modules (e.g., customer status, rental lifecycle, payment status) MUST be added to this union type in `Badge.tsx` and documented here before use. The variant mapping (`STATUS_VARIANT_MAP`) determines which semantic color each status uses.

**Rationale:** Centralizing status semantics in the Badge component ensures consistent color-meaning mapping across all ERP modules. A new module must not invent its own status-to-color mapping.

**Extension rule:** To add a new status value (e.g., `'overdue'`, `'completed'`, `'partial'`):
1. Add the value to `BadgeStatus` in `Badge.tsx`
2. Add the variant mapping to `STATUS_VARIANT_MAP`
3. Record the new status values in an update to this decision
4. Obtain owner approval if the new status introduces a new semantic meaning not covered by existing variants

**Affected Modules:** All modules with status display (Skates, Users, Customers, Rentals, Payments, Damage, Maintenance, Reservations, Sales)
**Status:** ACTIVE
**Source:** Owner approval — Phase 03.5 Desktop UI Audit D-002/D-005/D-006 (2026-09-14)

---

### DEC-044

**Date:** 2026-09-14 (Phase 03.5 Motion Audit — permanently deferred items)
**Category:** Design — Motion / Animation — Permanent Deferral
**Decision:** The following Motion & Animation audit findings are PERMANENTLY DEFERRED by explicit owner decision. Future AI agents MUST NOT rediscover, re-open, or implement these items.

**AN-012 — EmptyState entrance animation:**
The `<EmptyState>` component shall NOT have a CSS entrance animation. The component displays content directly without animating in. This was considered and explicitly declined by the owner. Rationale: the EmptyState is a negative-result signal and animating it would feel incongruous. The existing instant display is the approved behavior.

**AN-013 — Alert entrance animation:**
The `<Alert>` component shall NOT have a CSS entrance animation. Alerts appear immediately. This was considered and explicitly declined by the owner. Rationale: alerts convey time-sensitive information and delay-via-animation is counterproductive.

**These items must NOT be included in future audits as open findings. They are CLOSED — PERMANENTLY DEFERRED, not forgotten.**

**Status:** PERMANENTLY DEFERRED — OWNER DECISION
**Source:** Owner decision — Phase 03.5 Motion Audit final review (2026-09-14)


---

### DEC-045

**Date:** 2026-09-14 (Phase 02 RBAC Remediation — OD-RBAC-001)
**Category:** Product — Roles Management UI
**Decision:** Role Management is a Phase 02 remediation item. The Roles page must support full CRUD operations: Add Role, Edit Role, Delete Role, and Manage Permissions. This was missing from the original Phase 02 implementation.  
**Reason:** The original `RolesPage.tsx` was read-only. The gap was identified in `docs/quality/ROLES_PERMISSIONS_GAP_REPORT.md` and approved by owner.  
**Impact:** `RolesPage.tsx` fully replaced. `roles.service.ts` extended. New frontend `users.service.ts` methods added. New test suite `roles.test.ts` created.  
**Affected Modules:** Users/Permissions  
**Status:** ACTIVE  
**Source:** Owner decision OD-RBAC-001 (2026-09-14)

---

### DEC-046

**Date:** 2026-09-14 (Phase 02 RBAC Remediation — OD-RBAC-002)
**Category:** Business Rule — System Roles Protection
**Decision:** System roles (Administrator, Cashier, MaintenanceStaff) have the following immutable rules:
1. **Cannot be deleted** — `deleteRole()` throws `ForbiddenError` for any role where `is_system = true`.
2. **Cannot be renamed** — `updateRole()` throws `ForbiddenError` if a name change is attempted on a system role.
3. **Permissions ARE editable** — `setRolePermissions()` works on system roles without restriction.

UI enforces this: system role cards show name as read-only text, Edit button is hidden, Delete button is hidden.  
**Reason:** System roles define the fundamental access tiers of the product. Renaming or deleting them would break the authorization model.  
**Impact:** `roles.service.ts` updated. `RolesPage.tsx` shows immutability indicators.  
**Affected Modules:** Users/Permissions  
**Status:** ACTIVE  
**Source:** Owner decision OD-RBAC-002 (2026-09-14)

---

### DEC-047

**Date:** 2026-09-14 (Phase 02 RBAC Remediation — OD-RBAC-003)
**Category:** Business Rule — Role Deletion Guard
**Decision:** A role cannot be deleted if it is currently assigned to one or more active users. Attempting to delete such a role must:
1. Return HTTP 422 with code `ROLE_HAS_ACTIVE_USERS`.
2. Return an Arabic error message explaining why the deletion was blocked.
3. NOT silently cascade or remove assignments.
4. The administrator must first reassign or deactivate the affected users.

The frontend shows this error inline in the Delete modal as an `Alert variant="danger"` — the dialog does NOT close automatically on a blocked delete.  
**Reason:** Deleting a role that is in active use would silently strip permissions from live users, creating a security and operational risk.  
**Impact:** `roles.service.ts` `deleteRole()` updated. `RolesPage.tsx` delete dialog handles 422 inline.  
**Affected Modules:** Users/Permissions  
**Status:** ACTIVE  
**Source:** Owner decision OD-RBAC-003 (2026-09-14)

---

*Last updated: 2026-09-14 (DEC-045/DEC-046/DEC-047 added — Phase 02 RBAC Remediation OD-RBAC-001/002/003) by AI Agent*

---

### DEC-048

**Date:** 2026-09-15 (Users Remediation — pre-Phase 04)
**Category:** Product — User Account Management
**Decision:** Deactivated users can be reactivated via a dedicated POST `/api/v1/users/:id/activate` endpoint. Activation:
1. Restores `isActive = true` only.
2. Preserves all roles, history, and identity (name, email, passwordHash) unchanged.
3. Is idempotent — activating an already-active user succeeds silently (200 OK).
4. Requires `users.delete` permission (same permission as deactivate — both are user-lifecycle operations).
5. The UI shows "تفعيل" (green) for inactive users and "تعطيل" (red) for active users, both gated by `PermissionGate permission="users.delete"`.

**Reason:** Users may be deactivated by mistake or may return after a leave of absence. Full deletion is not permitted (DEC-009). Activation is the symmetric counterpart to deactivation.  
**Impact:** `users.service.ts` got `activateUser()`. `users.routes.ts` got new route. `UsersPage.tsx` updated. `users.test.ts` added TC-USR-ACT-01 through TC-USR-ACT-06.  
**Affected Modules:** Users/Permissions  
**Status:** ACTIVE  
**Source:** Users Remediation — approved 2026-09-15

---

### DEC-049

**Date:** 2026-09-15 (Users Remediation — pre-Phase 04)
**Category:** Product — User Account Management + RBAC
**Decision:** Administrators (and users with a new dedicated `users.change_password` permission) can change another user's password without knowing the old password.
1. A new permission `users.change_password` is added to the permissions catalog (41st permission).
2. The Administrator role receives this permission automatically via the seed.
3. Cashier and MaintenanceStaff do NOT receive this permission.
4. The API endpoint: POST `/api/v1/users/:id/change-password` with body `{ newPassword, confirmPassword }`.
5. Password is bcrypt-hashed (same 12-round mechanism as `createUser`/`updateUser`).
6. Password policy: minimum 6 characters (same as existing policy).
7. Both `newPassword` and `confirmPassword` must match — validated server-side.
8. Password is NEVER returned in any API response.
9. No old/current password required — this is an administrative action.
10. Change My Password / self-service password change is explicitly NOT implemented.

**Reason:** System administrators must be able to reset passwords for employees who forget them. Without this, the only resolution is deleting and recreating the user.  
**Impact:** New permission in `seed.ts`. `users.service.ts` got `changeUserPassword()`. `users.routes.ts` got new route. `UsersPage.tsx` got Change Password modal. `users.test.ts` added TC-USR-PWD-01 through TC-USR-PWD-09 + TC-USR-RBAC-01 through TC-USR-RBAC-04.  
**Affected Modules:** Users/Permissions  
**Status:** ACTIVE  
**Source:** Users Remediation — approved 2026-09-15

---

### DEC-050

**Date:** 2026-09-15 (Users Remediation — pre-Phase 04)
**Category:** Security — Session Management
**Decision:** Changing a user's password via POST `/api/v1/users/:id/change-password` does NOT invalidate existing sessions or refresh tokens. Existing access tokens remain valid until natural expiry.

**Reason:** This is an administrative action (the user whose password is changed is typically not present). Forced logout would require the user to re-authenticate immediately, which is only appropriate for self-service password changes where the current session owner initiated the change. In the admin-change flow, the user is simply given a new credential they can use at their next login.  
**Impact:** `users.service.ts` `changeUserPassword()` updates only `passwordHash`. `refreshTokens` table is not touched.  
**Affected Modules:** Users/Permissions, Auth  
**Status:** ACTIVE  
**Source:** Users Remediation — approved 2026-09-15

---

*Last updated: 2026-09-15 (DEC-048/DEC-049/DEC-050 added — Users Remediation pre-Phase 04) by AI Agent*

---

### DEC-051

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-001)
**Category:** Product — Customer Data Model
**Decision:** Customer required and optional fields are:
- **Required:** `name` (VARCHAR 255, NOT NULL), `phone` (VARCHAR 20, NOT NULL)
- **Optional:** `national_id` (VARCHAR 50, nullable), `notes` (TEXT, nullable)
- **System-generated:** `registration_date` (DATE, set at creation = today), `created_at`, `updated_at`

No additional mandatory fields beyond name and phone. Cashiers frequently create customers quickly during a rental; forcing National ID blocks fast checkout. National ID may be filled in later.

**Reason:** Operational flexibility for cashiers. Phone is the minimal identifier for contact purposes. National ID is the unique identifier when available.
**Impact:** `customers` table schema: `name` and `phone` NOT NULL; `national_id` nullable. Backend validation: 400 if name or phone missing. Frontend form: name and phone marked required (*).
**Affected Modules:** Customers (Phase 04), Rental POS (Phase 05)
**Status:** ACTIVE
**Source:** Owner decision OD-04-001 (2026-09-15)

---

### DEC-052

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-002)
**Category:** Product — Customer Lifecycle
**Decision:** Customers have an `is_active` boolean status (soft-deactivation):
1. `is_active = true` — normal customer (default at creation)
2. `is_active = false` — deactivated customer (still stored; excluded from Rental POS search by default)
3. Customers are **reactivatable** — a deactivated customer can be restored to active.
4. **Hard-delete is permanently prohibited** for any customer who has ever had a rental, damage report, reservation, or any business record.
5. Even customers with no history must not be hard-deleted via the API; soft-deactivation is the only removal action.
6. A new permission `customers.deactivate` gates the deactivate and reactivate actions.

Schema delta from DATABASE_ARCHITECTURE.md: `is_active` column added (not in original planned schema). This is an approved deviation documented here.

**Reason:** Aligns with the Users and Skates soft-delete pattern (DEC-009). Preserves referential integrity for future FK relationships (rentals, damages, reservations).
**Impact:** `customers` table gets `is_active BOOLEAN NOT NULL DEFAULT TRUE`. `customers.deactivate` permission added to seed. Customers API gets `POST /api/v1/customers/:id/deactivate` and `POST /api/v1/customers/:id/activate`. List API defaults to `isActive=1` filter; can be overridden to show inactive.
**Affected Modules:** Customers (Phase 04), Rental POS (Phase 05), Reports (Phase 13)
**Status:** ACTIVE
**Source:** Owner decision OD-04-002 (2026-09-15)

---

### DEC-053

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-003)
**Category:** Business Rule — Customer Identity
**Decision:** `national_id` is UNIQUE when provided:
1. Database UNIQUE constraint on `national_id` (nullable — `NULL` values are not subject to uniqueness in MySQL with standard null handling).
2. Application layer: if `national_id` is provided, check for existing customer with the same value and return 409 with Arabic error message `"الرقم القومي مستخدم لعميل آخر"`.
3. Two customers may both have `national_id = NULL` — this is not a uniqueness conflict.
4. Searching by National ID is supported via the `q` query parameter.

**Reason:** A National ID is a unique government-issued identifier; two customers must not share the same National ID. Prevents duplicate customer records. Uniqueness at DB level is the authoritative enforcement.
**Impact:** `customers.national_id` column: `UNIQUE INDEX` in Drizzle schema. Service layer `createCustomer` and `updateCustomer` must catch MySQL duplicate error (ER_DUP_ENTRY, errno 1062) and map to 409.
**Affected Modules:** Customers (Phase 04)
**Status:** ACTIVE
**Source:** Owner decision OD-04-003 (2026-09-15)

---

### DEC-054

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-004)
**Category:** Business Rule — Customer Contact
**Decision:** `phone` is NOT UNIQUE. Multiple customers may share the same phone number.
1. No UNIQUE constraint on `phone`.
2. Phone is searchable (indexed for performance but not unique).
3. Phone is a contact field, not a unique identifier — families commonly share phones.
4. National ID (DEC-053) is the true unique identifier.

**Reason:** Egyptian families frequently share a single phone number. A uniqueness constraint would block legitimate customer creation and force cashiers to work around the system.
**Impact:** `customers.phone` column: indexed but NOT UNIQUE. No 409 conflict for duplicate phone numbers.
**Affected Modules:** Customers (Phase 04)
**Status:** ACTIVE
**Source:** Owner decision OD-04-004 (2026-09-15)

---

### DEC-055

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-005)
**Category:** Product — Phase Scope
**Decision:** Customer rental history, statistics, and related analytics are FULLY DEFERRED from Phase 04. Specifically, Phase 04 MUST NOT implement:
- Rental count
- Rental history list
- Total paid
- Late returns history
- Damage history
- Reservation history
- Any placeholder or stub statistics on the customer profile
- `GET /api/v1/customers/:id/rentals` endpoint

**Ownership of deferred capabilities:**
- Rental count + rental history → Phase 05 (Rental POS)
- Total paid + payment analytics → Phase 06 (Payments)
- Late returns + damage history → Phase 08 (Damage) / appropriate return phase
- Reservation history → Phase 10 (Reservations)

**Reason:** Avoids misleading UI (showing zeroes or stubs). Clean phase boundary. The Rentals module must own and implement rental-related customer data.
**Impact:** `CustomerProfilePage.tsx` in Phase 04 shows only: name, phone, national_id, registration_date, status (active/inactive), notes. No stats section. Future phases add their own customer-profile data contributions.
**Affected Modules:** Customers (Phase 04), Rental POS (Phase 05), Payments (Phase 06), Damage (Phase 08), Reservations (Phase 10)
**Status:** ACTIVE
**Source:** Owner decision OD-04-005 (2026-09-15)

---

### DEC-056

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-006)
**Category:** Security — Customer Data Privacy
**Decision:** National ID display rules:
1. **Customer LIST page:** National ID is masked — display only the last 4 digits, with asterisks for the rest (e.g., `****1234`). If National ID is null/empty, display `—`.
2. **Customer PROFILE page:** National ID is displayed in full to authorized users (any user with `customers.view` permission).
3. Full National ID is NEVER included in the list API response. The list DTO either omits `national_id` entirely or includes only the masked version — server-side masking is preferred.
4. National ID is treated as sensitive PII. It must not be logged unnecessarily in application logs.
5. Audit logging for National ID access is deferred to Phase 16 (Audit Log).

**Reason:** Balances operational utility with privacy. The list is a scan-view context; the profile page is a deliberate navigation. Protecting National ID in the list reduces casual exposure.
**Impact:** `listCustomers()` service returns masked `national_id_masked` (last 4 chars + asterisks) rather than full value. `getCustomer()` returns full `national_id`. Frontend `CustomersPage` shows masked value; `CustomerProfilePage` shows full value.
**Affected Modules:** Customers (Phase 04)
**Status:** ACTIVE
**Source:** Owner decision OD-04-006 (2026-09-15)

---

### DEC-057

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-007)
**Category:** Design — Shared Component
**Decision:** The shared `<IconButton>` component (SYS-002) is created in Phase 04 as the first real use case (customer row actions). Approved API:

```tsx
<IconButton
  icon={Pencil}               // Lucide React icon component (required)
  label="تعديل العميل"         // aria-label string (required — accessibility)
  variant="ghost" | "danger"  // default: 'ghost'
  size="sm" | "base"          // default: 'sm' for table rows
  onClick={() => void}
  disabled?: boolean
  loading?: boolean
/>
```

Rules:
- Uses Lucide React icons (same as `Button` and `Icon` components)
- `label` is applied as `aria-label` on the `<button>` element (accessible naming)
- Renders as a `<button>` always
- `disabled` + `loading` follow the same pattern as `Button`
- `ghost` variant: transparent background; hover shows `--color-neutral-bg`
- `danger` variant: transparent background; hover shows `--color-danger-bg`
- No new visual variants without owner approval
- Must be exported from `components/ui/index.ts`
- Must be used in ALL future modules for icon-only row actions — no page-specific icon button implementations

**Reason:** Row actions (edit, view, deactivate) are icon-only buttons. The existing `Button` component with `aria-label` works but a dedicated `IconButton` provides a cleaner, more focused API for this specific use case.
**Impact:** New file `apps/web/src/components/ui/IconButton.tsx`. Export from `index.ts`. Documented in `COMPONENT_LIBRARY.md`.
**Affected Modules:** Customers (Phase 04); all future modules with row actions
**Status:** ACTIVE
**Source:** Owner decision OD-04-007 (2026-09-15)

---

### DEC-058

**Date:** 2026-09-15 (Phase 04 — Customers Module — OD-04-008)
**Category:** Security — RBAC — Customer Permissions
**Decision:** The `customers.*` permission catalog for Phase 04 is:

| Permission Key | Arabic Label | Administrator | Cashier | Maintenance Staff |
|---|---|---|---|---|
| `customers.view` | عرض العملاء | ✅ | ✅ | ❌ |
| `customers.create` | إضافة عميل | ✅ | ✅ | ❌ |
| `customers.edit` | تعديل بيانات العميل | ✅ | ✅ | ❌ |
| `customers.deactivate` | تعطيل / تفعيل العميل | ✅ | ❌ | ❌ |

Note: `customers.view`, `customers.create`, and `customers.edit` are already seeded from Phase 02 RBAC (seed.ts lines 44–47). `customers.deactivate` is NEW — added in Phase 04 seed update.

Server-side enforcement is mandatory for all four permissions. Frontend `PermissionGate` is advisory only (DEC-013).

**Reason:** Cashiers need view/create/edit to operate the Rental POS workflow. Deactivating a customer is an administrative action that must not be available to cashiers.
**Impact:** `seed.ts` updated: `customers.deactivate` added as 42nd permission; Administrator role assignment for `customers.deactivate` added; Cashier role assigned `customers.view/create/edit` (already seeded but Cashier assignment verified).
**Affected Modules:** Customers (Phase 04), Rental POS (Phase 05)
**Status:** ACTIVE
**Source:** Owner decision OD-04-008 (2026-09-15)

---

*Last updated: 2026-09-15 (DEC-051 through DEC-058 added — Phase 04 Customers Module Owner Decisions OD-04-001 through OD-04-008) by AI Agent*

---

## DEC-059: Application-Level Length Validation for Customer Fields

**Phase:** 04 — Customers Module (finalization)
**Date:** 2026-09-15
**Decided by:** AI Agent (Phase 04 final fixes)

**Decision:** Enforce application-level maximum length limits on customer fields at the service boundary, in addition to the existing database column constraints:

| Field | Max Length | DB Column |
|---|---|---|
| `name` | 255 characters | `varchar(255)` |
| `phone` | 20 characters | `varchar(20)` |
| `nationalId` | 50 characters | `varchar(50)` |

These limits mirror the DB column definitions and are enforced in `customers.service.ts` for both `createCustomer()` and `updateCustomer()`. Violations return HTTP 400 with an Arabic error message consistent with existing validation error conventions.

No regex patterns or format rules are applied — only length. No new business rules are introduced.

**Reason:** Database constraints alone do not provide application-level error messages at the API boundary. This is the established pattern in other modules (e.g., users, skates). Required by the Phase 04 review.
**Impact:** `customers.service.ts` — 3 length checks added to `createCustomer`, 3 to `updateCustomer`. 3 new test cases (TC-CUST-VAL-01/02/03) added.
**Affected Modules:** Customers (Phase 04)
**Status:** ACTIVE
**Source:** Phase 04 final review (2026-09-15)

---

*Last updated: 2026-09-15 (DEC-059 added — Phase 04 final review: application-level length validation) by AI Agent*

---

### DEC-060

**Date:** 2026-09-21 (Phase 05 Entry Gate — OD-05-001)  
**Category:** Product — Phase Boundary — Payment Recording  
**Decision:** Phase 05 (Rental POS Core) must NOT implement payment recording. The following are fully owned by Phase 06 (Payments and Treasury) and must not be introduced in Phase 05:

- `payment_methods` table
- `rental_payments` table
- `treasury_accounts` table
- Treasury movements
- Split payments
- Payment collection logic
- Payment management UI

Phase 05 is responsible only for calculating and storing the authoritative rental amount (`price_per_hour` and `rental_amount`) in the `rentals` table. The Rental POS may display the calculated amount as part of the review step but must not create any payment record.

No temporary payment columns, fake payment states, placeholder payment records, or schema deviations may be introduced in Phase 05 to simulate payment. Phase 06 will close the Payment → Start Rental business-flow gap described in Spec §10 and §51.

**Reason:** Phase 06 owns `payment_methods`, `treasury_accounts`, and `rental_payments` (which requires NOT NULL FKs to both). No valid partial implementation of `rental_payments` exists without Phase 06 tables. Clean phase boundaries preserve architectural integrity.  
**Impact:**
- `PHASE_05_RENTAL_POS_CORE.md` — payment recording explicitly excluded from scope
- `RENTALS.md` — `startRental()` Phase 05 implementation excludes payment recording step
- Phase 06 spec will document the extension of `startRental()` to include payment recording

**Affected Modules:** Rentals (Phase 05), Payments (Phase 06), Treasury (Phase 06)  
**Status:** APPROVED — Owner decision OD-05-001  
**Source:** Owner decision — Phase 05 Entry Gate (2026-09-21)

---

### DEC-061

**Date:** 2026-09-21 (Phase 05 Entry Gate — OD-05-002)  
**Category:** Architecture — Settings Infrastructure  
**Decision:** Phase 05 may introduce the approved target `settings` table as shared infrastructure required for rental pricing configuration. Phase 05 scope for Settings is strictly limited to:

1. `settings` database schema (Drizzle schema file)
2. Drizzle migration for `settings` table
3. Required initial rental configuration seed values
4. Backend read access in `RentalService` (read-only)

Phase 05 must NOT implement:
- Settings administration UI
- General Settings screens or management pages
- `GET /api/v1/settings` or `PUT /api/v1/settings` endpoints
- Unrelated configuration management features

The future Settings module will build full administration functionality on top of this infrastructure. Rental pricing must never be hardcoded in application source code.

**Reason:** Inviolable Rule 4 (SOURCE_OF_TRUTH.md) prohibits hardcoded rental prices. The `settings` table is the approved target architecture. Creating it as shared infrastructure in Phase 05 satisfies the rule while deferring the admin UI to the appropriate future phase.  
**Impact:**
- `apps/api/src/db/schema/settings.ts` — new schema file (Phase 05)
- New Drizzle migration for `settings` table (Phase 05)
- `apps/api/src/db/seed.ts` — seed rental configuration keys (Phase 05)
- `RentalService` reads `price_per_hour` from `settings` table at rental creation time
- Future Settings module phase will add `settings.service.ts`, routes, and UI

**Affected Modules:** Rentals (Phase 05), Settings (future phase)  
**Status:** APPROVED — Owner decision OD-05-002  
**Source:** Owner decision — Phase 05 Entry Gate (2026-09-21)

---

### DEC-062

**Date:** 2026-09-21 (Phase 05 Entry Gate — OD-05-003)  
**Category:** Product — Rental Code Generation  
**Decision:** Rental codes use the format `RN-NNNNN` (prefix `RN-` followed by a five-digit zero-padded sequential integer).

Examples: `RN-00001`, `RN-00002`, `RN-00003`

Rules:
1. Prefix is always `RN-`
2. Five-digit zero padding (e.g., `00001` through `99999`; padded to at least 5 digits for values above 99999)
3. Sequential MAX + 1 generation: read the maximum existing numeric suffix from the `rentals` table and add 1
4. Never reuse a code — returned or cancelled rentals do not free their code
5. `rental_code` column is UNIQUE (database constraint)
6. Generation must be concurrency-safe: the `rental_code` generation must occur inside the same database transaction used for rental creation (the UNIQUE constraint provides a final safety net against race conditions)

This decision mirrors the established `SK-NNN` convention (DEC-030) for consistency.

**Reason:** A human-readable rental identifier is required by Spec §13 ("A unique Rental ID is created"). The `RN-NNNNN` format is consistent with `SK-NNN` (DEC-030), easy for cashiers to reference verbally, and never ambiguous.  
**Impact:**
- `rentals.service.ts` — `generateRentalCode()` helper implements MAX+1 within the rental creation transaction
- `rentals` table schema — `rental_code VARCHAR(50) UNIQUE NOT NULL`

**Affected Modules:** Rentals (Phase 05)  
**Status:** APPROVED — Owner decision OD-05-003  
**Source:** Owner decision — Phase 05 Entry Gate (2026-09-21)

---

### DEC-063

**Date:** 2026-09-21 (Phase 05 Entry Gate — OD-05-004)  
**Category:** Architecture — Schema — `shift_id` Nullability  
**Decision:** `rentals.shift_id` is nullable in the Phase 05 migration. Phase 05 must NOT implement the Cashier Shifts module.

Until Phase 12 (Expenses and Cashier Shifts) is implemented:
1. New rentals may be created with `shift_id = NULL`
2. No placeholder shift records may be created
3. No artificial shift dependency may be introduced
4. The `cashier_shifts` table is NOT created in Phase 05

Phase 12 will integrate real Cashier Shift behavior. At that time, the shift context will be set based on the currently open shift, and retroactive NULL values remain as-is (representing rentals created before the shifts feature existed).

This is consistent with `sales.shift_id` being explicitly nullable in `DATABASE_ARCHITECTURE.md` (line 333).

**Reason:** The `cashier_shifts` table belongs to Phase 12. Making `shift_id` nullable allows Phase 05 to proceed without an out-of-scope dependency. The pattern is consistent with the `sales` table schema.  
**Impact:**
- `rentals` Drizzle schema — `shiftId: integer('shift_id').references(() => cashierShifts.id)` — column nullable

**Affected Modules:** Rentals (Phase 05), Cashier Shifts (Phase 12)  
**Status:** APPROVED — Owner decision OD-05-004  
**Source:** Owner decision — Phase 05 Entry Gate (2026-09-21)

---

### DEC-064

**Date:** 2026-09-21 (Phase 05 Entry Gate — OD-05-005)  
**Category:** Product — Rental Status Model  
**Decision:** The canonical rental status model for Phase 05 is:

**Persisted lifecycle statuses** (stored in `rentals.status` ENUM):
- `active` — rental is ongoing
- `returned` — rental has been returned (Phase 07 sets this)
- `cancelled` — rental was cancelled before or without a return

The following are NOT persisted as lifecycle statuses:
- `late`, `overdue`, `normal`, `ending_soon`, `expired` — these are computed display states derived from timestamps

**Computed operational statuses** (derived server-side from timestamps for active rentals only):
- `Normal` — `current_time < expected_end_at` and not within "Ending Soon" window
- `Ending Soon` — `current_time` is within the configured threshold before `expected_end_at` (threshold is a remaining owner decision — see RD-05-001)
- `Overdue / Late` — `current_time > expected_end_at`

A returned rental uses persisted status `returned` which maps visually to "Returned / Completed". A cancelled rental uses persisted status `cancelled`.

**Badge status values to add** (per DEC-043 extension rule, during Phase 05 implementation):
- `'completed'` — maps to the `returned` persisted status in display contexts (success variant)
- `'overdue'` — computed display state for past-due active rentals (danger variant)
- `'cancelled'` — maps to `cancelled` persisted status (neutral variant)

No scheduled job or background process may update `rentals.status` from `active` to any other value in Phase 05. The Phase 15 notification subsystem owns the one-minute-before alert. The `returned` status transition is Phase 07.

**Reason:** Avoids scheduled-job complexity in Phase 05. Keeps DB ENUM minimal and correct. Computed states are always authoritative from server-side timestamps. Aligns with DEC-010 (server-side state authority).  
**Impact:**
- `rentals` Drizzle schema — `status ENUM('active', 'returned', 'cancelled') NOT NULL DEFAULT 'active'`
- `RentalService.getActiveRentals()` — computes `operationalStatus` field from timestamps
- `Badge.tsx` — `'completed'`, `'overdue'`, `'cancelled'` added to `BadgeStatus` union type

**Affected Modules:** Rentals (Phase 05), Returns (Phase 07), Notifications (Phase 15)  
**Status:** APPROVED — Owner decision OD-05-005  
**Source:** Owner decision — Phase 05 Entry Gate (2026-09-21)

---

### DEC-065

**Date:** 2026-09-21 (Phase 05 Entry Gate — OD-05-006)  
**Category:** Product — Rental Pricing Formula  
**Decision:** The shop uses a single configurable hourly rental rate. Rental price is calculated proportionally from that rate.

**Approved pricing formula:**
```
rental_amount = hourly_rate × duration_minutes / 60
```

Rules:
1. `hourly_rate` comes from the `settings` table — never hardcoded in application source (DEC-061)
2. The server is authoritative for price calculation — the client never supplies the authoritative amount
3. `price_per_hour` must be stored in the `rentals` record as a historical snapshot at the time of rental creation
4. `rental_amount` must also be stored in the `rentals` record at creation time
5. Both `price_per_hour` and `rental_amount` are immutable after creation (DEC-003)
6. Future changes to the configured hourly rate do not affect historical rental amounts
7. The same proportional formula applies to all durations including custom duration
8. Do not create separate configured prices for each duration option — all durations derive from the single hourly rate

**Custom duration:** Uses the same `hourly_rate × duration_minutes / 60` formula.

**Rounding behavior:** Not yet defined in approved project documentation. Implementation cannot safely proceed without a defined rounding strategy. This is flagged as remaining owner input (RD-05-002).

**Initial numeric hourly rate value:** Not defined in this decision. The seed data for `settings` must include a `rental_hourly_rate` key but the numeric value must come from owner input (RD-05-003). Implementation must not invent a numeric value.

**Reason:** Establishes the single-rate proportional model as the authoritative pricing approach. Prevents per-duration hardcoding. Ensures historical pricing integrity.  
**Impact:**
- `settings` seed data — `rental_hourly_rate` key required (numeric value pending RD-05-003)
- `RentalService.calculatePrice()` — uses formula above
- `RentalService.startRental()` — reads `rental_hourly_rate` from settings, calculates `rental_amount`, stores both in `rentals` record
- `price_per_hour` and `rental_amount` stored at creation and never updated

**Affected Modules:** Rentals (Phase 05), Settings (future phase)  
**Status:** APPROVED — Owner decision OD-05-006  
**Source:** Owner decision — Phase 05 Entry Gate (2026-09-21)

---

*Last updated: 2026-09-21 (DEC-060 through DEC-065 added — Phase 05 Entry Gate Owner Decisions OD-05-001 through OD-05-006) by AI Agent*

---

### DEC-066

**Date:** 2026-09-21 (Phase 05 Entry Gate Closure — RD-05-001)  
**Category:** Product — Rental Operational Display Status — Ending Soon Threshold  
**Decision:** An active rental enters the `ending_soon` operational display state when:

```
remaining_time <= 5 minutes AND remaining_time > 0
```

The three server-computed operational statuses for active rentals are:

| State | Condition |
|---|---|
| `normal` | `remaining_time > 5 minutes` |
| `ending_soon` | `remaining_time <= 5 minutes AND remaining_time > 0` |
| `overdue` | `current_server_time > expected_end_at` (remaining_time = 0) |

Rules:
1. These are server-computed display states only — never persisted as lifecycle status values
2. `RentalService.getActiveRentals()` computes `operationalStatus` from `NOW()` vs `expected_end_at`
3. `remainingMinutes = GREATEST(0, TIMESTAMPDIFF(MINUTE, NOW(), expected_end_at))`
4. The Phase 15 notification of exactly one minute before expiry is separate and must NOT be implemented in Phase 05

**Reason:** A 5-minute threshold gives the cashier adequate operational warning before a rental expires, without generating premature alerts. It is operationally meaningful and clearly distinct from the Phase 15 one-minute notification.  
**Impact:**
- `RentalService.getActiveRentals()` — implements three-state computation using 5-minute threshold
- `PHASE_05_RENTAL_POS_CORE.md` — BR-31 and Active Rentals section updated
- `Badge.tsx` — `ending_soon` maps to warning variant in Active Rentals view

**Affected Modules:** Rentals (Phase 05)  
**Status:** APPROVED — Resolution of RD-05-001  
**Source:** Owner decision — Phase 05 Entry Gate Closure (2026-09-21)

---

### DEC-067

**Date:** 2026-09-21 (Phase 05 Entry Gate Closure — RD-05-002)  
**Category:** Product — Rental Amount Rounding  
**Decision:** The authoritative `rental_amount` is calculated and stored as a whole-EGP integer value using the following rule:

```
raw_amount = hourly_rate × duration_minutes / 60
rental_amount = Math.round(raw_amount)  // nearest whole EGP; .5 rounds up
```

Rounding examples:
- `83.33` → `83` EGP
- `83.49` → `83` EGP
- `83.50` → `84` EGP (`.5` rounds up)
- `83.67` → `84` EGP
- `60.00` → `60` EGP (exact — no rounding needed)

Rules:
1. The server is the authoritative source of the final `rental_amount`
2. The client must not supply the final rental amount — it must be server-calculated
3. The rounded whole-EGP result is stored as `rental_amount` in the `rentals` record (DECIMAL(10,2) stores as e.g. `83.00`)
4. `price_per_hour` is stored as the exact configured hourly rate (e.g. `120.00`) — this is the snapshot, not rounded
5. Both `price_per_hour` and `rental_amount` are immutable after creation (DEC-003, DEC-065)
6. This rounding rule applies to all durations including custom duration

**Implementation:** JavaScript `Math.round()` follows this rule natively (rounds `.5` up for positive numbers).

**Reason:** Whole-EGP pricing is operationally simpler for cashiers, avoids fractional-amount confusion, and is consistent with the store's operational practice.  
**Impact:**
- `RentalService.calculatePrice()` — applies `Math.round()` after formula
- `RentalService.startRental()` — stores `Math.round(raw_amount)` as `rental_amount`
- Test cases TC-RENT-13a, TC-RENT-13b, TC-RENT-13c added to verify rounding behavior
- `PHASE_05_RENTAL_POS_CORE.md` — BR-15, BR-17, Pricing Model section updated

**Affected Modules:** Rentals (Phase 05), Settings (future phase)  
**Status:** APPROVED — Resolution of RD-05-002  
**Source:** Owner decision — Phase 05 Entry Gate Closure (2026-09-21)

---

### DEC-068

**Date:** 2026-09-21 (Phase 05 Entry Gate Closure — RD-05-003)  
**Category:** Product — Initial Rental Hourly Rate Configuration Value  
**Decision:** The initial `rental_hourly_rate` value seeded into the `settings` table is:

```
rental_hourly_rate = "120"   (120 EGP per hour)
```

Rules:
1. This is the initial configured business value — it is NOT a hardcoded application constant
2. The application must read the hourly rate from the `settings` table at runtime via `RentalService`
3. The value is stored as a string in the `settings.value` column and parsed as a float at read time
4. Future changes to this value via the Settings module (future phase) must not affect historical `rental_amount` or `price_per_hour` values in the `rentals` table (DEC-003, DEC-065)
5. The string `"120"` in the seed represents EGP per hour — this is the initial rate for the store

**Verification examples at 120 EGP/hr:**
- 15 min: `120 × 15 / 60 = 30` EGP (exact)
- 30 min: `120 × 30 / 60 = 60` EGP (exact)
- 45 min: `120 × 45 / 60 = 90` EGP (exact)
- 60 min: `120 × 60 / 60 = 120` EGP (exact)
- 90 min: `120 × 90 / 60 = 180` EGP (exact)

All standard durations at this rate produce exact whole-EGP amounts requiring no rounding.

**Reason:** The store's current operational hourly rental rate has been confirmed as 120 EGP/hr by the owner. The spec §11 used 120 EGP as an example — this decision confirms it as the approved initial seed value.  
**Impact:**
- `apps/api/src/db/seed.ts` — add `{ key: 'rental_hourly_rate', value: '120', label_ar: 'سعر الإيجار بالساعة' }` seed entry
- `PHASE_05_RENTAL_POS_CORE.md` — settings seed table updated to show `"120"` as confirmed value
- No further seed placeholder or owner-input comment required

**Affected Modules:** Rentals (Phase 05), Settings (future phase)  
**Status:** APPROVED — Resolution of RD-05-003  
**Source:** Owner decision — Phase 05 Entry Gate Closure (2026-09-21)

---

### DEC-069

**Date:** 2026-09-21 (Phase 05 Entry Gate Closure — RD-05-004)  
**Category:** Product — Custom Rental Duration Validation  
**Decision:** No maximum custom rental duration is defined for Phase 05. The validation rule for `durationMinutes` is:

```
durationMinutes > 0   (positive integer, no upper limit)
```

Standard configured durations remain: 15, 30, 45, 60, 90 minutes (from `rental_duration_options` settings key).

Custom duration rules:
1. Must be a positive integer (> 0)
2. No approved upper limit in Phase 05
3. Uses the same proportional formula: `raw_amount = hourly_rate × duration_minutes / 60`
4. Subject to the same whole-EGP rounding rule (DEC-067)
5. No minimum other than > 0 is defined

**Reason:** No operational maximum has been identified. Enforcing an arbitrary maximum not approved by the owner would be an AI-invented constraint. If abuse of very long durations becomes an operational concern, the owner may add a maximum via a future decision.  
**Impact:**
- `rentals.routes.ts` / `rentals.service.ts` — validation: `durationMinutes` is integer > 0, no upper bound check
- `PHASE_05_RENTAL_POS_CORE.md` — BR-27 updated, Duration section updated

**Affected Modules:** Rentals (Phase 05)  
**Status:** APPROVED — Resolution of RD-05-004  
**Source:** Owner decision — Phase 05 Entry Gate Closure (2026-09-21)

---

### DEC-070

**Date:** 2026-09-21 (Phase 05 Final Remediation — Owner decision)  
**Category:** Product — Rental Code Generation — Amendment to DEC-062  
**Decision:** The Rental Code generation algorithm is amended. DEC-062 originally approved a `MAX + 1` strategy. Real concurrency verification revealed a race condition: two concurrent rentals for **different skates** both read the same `MAX` before either transaction commits, causing a `UNIQUE` constraint collision on `rental_code` even when no business conflict exists. The Owner approves replacing `MAX + 1` with an `insertId`-based strategy.

**New Algorithm (supersedes DEC-062 generation algorithm only):**

1. INSERT the rental row with a temporary unique placeholder `rental_code` (e.g., `TEMP-<timestamp>-<random>`)
2. After the INSERT, read the auto-increment `insertId` of the newly created row
3. Derive the final Rental Code: `'RN-' + String(insertId).padStart(5, '0')`
4. UPDATE the rental row in the same transaction: `SET rental_code = finalCode WHERE id = insertId`
5. COMMIT

**Format remains unchanged:** `RN-NNNNN` (five-digit minimum zero-padding)

Examples: `RN-00001`, `RN-00025`, `RN-00127`

**Gaps are explicitly allowed:**

If a transaction is rolled back after obtaining an auto-increment ID (e.g., rollback due to skate unavailability, customer inactive, or any other error), the ID is consumed by InnoDB and will not be recycled. This creates gaps in Rental Code numbering.

Example acceptable sequence: `RN-00025`, `RN-00026`, `RN-00028` — `RN-00027` missing due to a rolled-back transaction.

**Rules (all DEC-062 rules remain in force except rule 3 which is superseded):**

1. Prefix is always `RN-`
2. Five-digit zero padding (e.g., `00001` through `99999`; values above 99999 are padded to at least 5 digits — e.g., `RN-100000`)
3. ~~Sequential MAX + 1~~ → **Derived from the auto-increment PK `insertId` of the inserted Rental row** ← *Supersedes DEC-062 rule 3*
4. Never reuse a code — returned or cancelled rentals do not free their code
5. `rental_code` column is UNIQUE (database constraint)
6. Generation must be concurrency-safe — the `insertId` is globally unique even across concurrent transactions; no two INSERTs ever share an `insertId`
7. Gaps caused by auto-increment consumption during rollback are **allowed and must never be backfilled**
8. Continuous gap-free numbering is NOT required

**Priority order:** uniqueness > concurrency safety > never reuse > stable human-readable format.

**Continuous gap-free numbering is not a business requirement.**

**Affected DEC-062 content:** The algorithm description (DEC-062 rule 3, the SQL pseudocode, and the `generateRentalCode(MAX+1)` helper reference) is superseded by this decision. All other DEC-062 content (format, prefix, padding, UNIQUE constraint, never-reuse rule) remains authoritative.

**Reason:** The `insertId` strategy eliminates the concurrency race condition identified during Phase 05 verification. InnoDB auto-increment values are assigned atomically and never shared between concurrent transactions, guaranteeing uniqueness without requiring a read-then-write MAX operation.  

**Impact:**
- `rentals.service.ts` — `startRental()` uses INSERT with placeholder + UPDATE to final code within the same transaction
- `docs/phases/PHASE_05_RENTAL_POS_CORE.md` — Rental Code Generation section updated
- `apps/api/src/db/schema/rentals.ts` — comment updated
- Unit tests for Rental Code updated to reflect insertId behavior

**Affected Modules:** Rentals (Phase 05)  
**Status:** APPROVED — Owner decision (Phase 05 Final Remediation, 2026-09-21)  
**Source:** Owner decision — Phase 05 Final Remediation (GOVERNANCE-01 process note: prior remediation agent committed/pushed `3783c61` without explicit authority; this amendment is the formal owner approval that retroactively legitimizes the implementation change)

---

*Last updated: 2026-09-21 (DEC-070 added — Phase 05 Final Remediation: insertId-based Rental Code strategy approved, superseding DEC-062 generation algorithm; GOVERNANCE-01 noted; DEC-066 operational status boundary at exact equality clarified as NOT overdue per strict `>` rule) by AI Agent*

---

### DEC-071

**Date:** 2026-09-25 (Phase 12 Entry Gate)  
**Category:** Business — Cashier Shift Cardinality & Ownership  
**Decision:** Each cashier/user may have only ONE active cashier shift at a time.
- A cashier cannot open a second active shift while another one is open.
- Cashier operational transactions (Rentals, Sales, etc.) require an active shift.
- Admin operations do not require an active shift unless specifically doing cashier work.
- The server must strictly enforce the active-shift requirement for cashier operations.

**Affected Modules:** Cashier Shifts, Rentals, Sales  
**Status:** APPROVED  
**Source:** Owner decision — Phase 12 Entry Gate (2026-09-25)

---

### DEC-072

**Date:** 2026-09-25 (Phase 12 Entry Gate)  
**Category:** Finance — Payment Methods inside Shifts  
**Decision:** The cashier shift reconciles PHYSICAL CASH as the primary counted balance.
- Opening Balance = physical cash at shift opening.
- Actual/Counted Balance = physical cash counted at shift closing.
- Expected Cash and Difference are calculated from CASH movements only.
- Electronic payment methods (Card/Visa, InstaPay) do not affect the physical cash drawer. They are visible in history but excluded from the variance calculation.
- The existing payment-method and treasury-account mappings are reused.

**Affected Modules:** Cashier Shifts, Treasury  
**Status:** APPROVED  
**Source:** Owner decision — Phase 12 Entry Gate (2026-09-25)

---

### DEC-073

**Date:** 2026-09-25 (Phase 12 Entry Gate)  
**Category:** Business — Shift Closing Approval  
**Decision:** A cashier can close their own shift without requiring an immediate Admin override, even if there is a shortage or overage.
- The system must record: opening balance, expected cash, actual balance, difference, opened_by, closed_by, opened_at, closed_at.
- The recorded difference must be auditable and immutable (append-only ledger).
- Admins review closed shifts via a separate permission-controlled UI.

**Affected Modules:** Cashier Shifts  
**Status:** APPROVED  
**Source:** Owner decision — Phase 12 Entry Gate (2026-09-25)

---

### DEC-074

**Date:** 2026-09-25 (Phase 12 Entry Gate)  
**Category:** Finance — Refunds Treatment in Shifts  
**Decision:** No new refund workflow is invented. Existing refund behaviors (`rental_refund`, etc.) participate in cashier-shift accounting.
- When a refund is performed during an active shift, its treasury movement is associated with that shift.
- Cash refunds reduce the expected physical cash for that shift.
- Electronic refunds are visible but do not affect the physical cash count.
- Preserve the existing append-only financial ledger behavior.

**Affected Modules:** Cashier Shifts, Treasury, Rentals, Sales  
**Status:** APPROVED  
**Source:** Owner decision — Phase 12 Entry Gate (2026-09-25)

---

*Last updated: 2026-09-25 (DEC-071 through DEC-074 added — Phase 12 Entry Gate Owner Decisions) by AI Agent*

---

### DEC-075

**Date:** 2026-10-03 (Phase 05.5 — Settings Administration)
**Category:** Phase Governance
**Decision (SETT-001):** The Settings Administration feature is formally documented as Phase 05.5 (sub-phase of Phase 05 shared infrastructure, following the 03.5 precedent). Owner approval of the Implementation Execution Prompt constitutes approval for Phase 05.5. No separate approval gate is required.
**Affected Modules:** Settings
**Status:** ACTIVE
**Source:** Implementation Execution Prompt — owner-approved 2026-10-03

---

### DEC-076

**Date:** 2026-10-03 (Phase 05.5 — Settings Administration)
**Category:** Security — Permission Model
**Decision (SETT-002):** The `/settings` route is protected by `<PermissionGate permission="settings.view">` with a `NoAccessPage` fallback. The backend `PATCH /api/v1/settings` endpoint enforces `settings.manage` via `requirePermission`. The Save button is additionally gated client-side by `<PermissionGate permission="settings.manage">`. The `GET /api/v1/settings` endpoint intentionally does NOT require `settings.view` — all authenticated users can read settings because other modules (rentals config, notifications, invoices) programmatically consume this endpoint.
**Affected Modules:** Settings, Rentals, Notifications, Invoices
**Status:** ACTIVE
**Source:** Implementation Execution Prompt — owner-approved 2026-10-03

---

### DEC-077

**Date:** 2026-10-03 (Phase 05.5 — Settings Administration)
**Category:** Business Rule — Validation
**Decision (SETT-003):** `rental_duration_options` must satisfy all of: non-empty array, all elements are positive integers (> 0 and `Number.isInteger`), no duplicate values, values in ascending order. Violations produce HTTP 400 VALIDATION_ERROR (Arabic message). These rules are enforced server-side (routes.ts) and visually on the frontend via TagInput per-tag validation.
**Affected Modules:** Settings, Rentals
**Status:** ACTIVE
**Source:** Implementation Execution Prompt — owner-approved 2026-10-03

---

### DEC-078

**Date:** 2026-10-03 (Phase 05.5 — Settings Administration)
**Category:** Business Rule — Validation
**Decision (SETT-004):** `late_fee_per_minute` must be >= 0. Zero is valid and means no late fee is charged. Negative values are rejected (HTTP 400). `rental_hourly_rate` must be > 0 (zero or negative would make all future rentals free — financial risk RISK-001). Both enforced server-side.
**Affected Modules:** Settings, Returns (Phase 07)
**Status:** ACTIVE
**Source:** Implementation Execution Prompt — owner-approved 2026-10-03

---

### DEC-079

**Date:** 2026-10-03 (Phase 05.5 — Settings Administration)
**Category:** UI — New Component
**Decision (SETT-005):** A new shared `TagInput` component is created at `apps/web/src/components/ui/TagInput.tsx` (Option B from planning). This is justified because no existing shared component provides array-of-number editing with chip display. The component is added to the shared library (`index.ts`) per UI-010. It follows the FormFields.tsx style injection pattern, is RTL-aware, and provides WCAG 2.5.5 compliant touch targets on remove buttons.
**Affected Modules:** Settings (initial use); available for future phases
**Status:** ACTIVE
**Source:** Implementation Execution Prompt — owner-approved 2026-10-03

---

### DEC-080

**Date:** 2026-10-03 (Phase 05.5 — Settings Administration)
**Category:** UX — Save Behavior
**Decision (SETT-006):** SettingsPage saves only changed settings (Option 2 — changed-only PATCH). The frontend computes a diff between `initialSettings` (snapshot from last server load/save) and `form` (current edit state). Only changed keys are sent in the PATCH body. If no keys changed, the PATCH is not issued and a toast "no changes to save" is shown. On successful save, `initialSettings` is updated from the server response, which is the new baseline for future diffs.
**Affected Modules:** Settings
**Status:** ACTIVE
**Source:** Implementation Execution Prompt — owner-approved 2026-10-03

---

*Last updated: 2026-10-03 (DEC-075 through DEC-080 added — Phase 05.5 Settings Administration) by AI Agent*
