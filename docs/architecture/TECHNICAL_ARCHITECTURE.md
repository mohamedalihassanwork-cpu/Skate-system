# Technical Architecture — KOSHK SKATE ERP

**Version:** 1.2  
**Status:** INITIAL — Phase 01 executing. Scaffold exists; business features start Phase 02.  
**Last updated:** 2026-09-09 (Phase 01 execution)

> [!IMPORTANT]
> **This document describes TARGET architecture. No implementation exists yet.**
> All sections below are PLANNED unless explicitly marked VERIFIED.
> As implementation progresses, update this document to clearly separate CURRENT from TARGET.

---

## System Overview

KOSHK SKATE ERP is a cloud-based, Arabic-first, RTL-first commercial ERP and POS system for a skate rental business.

**Core characteristics:**
- Single web application (not separate mobile app)
- Responsive for desktop, tablet, mobile
- Arabic UI, RTL layout
- Role-based access control
- Individual asset lifecycle management (per-skate)
- Real-time operational state (active rentals, expiration alerts)
- Financial traceability (treasury, shifts, audit)

---

## 1. Architecture Style

**Target:** Modular monolith

**Rationale:** Compatible with Hostinger hosting constraints. Modular structure allows future extraction if needed. No distributed systems, no microservices, no message queues required at this stage.

**Status:** PLANNED

---

## 2. Technology Stack

> [!NOTE]
> Approved choices are marked **APPROVED**. Items still requiring a decision are marked **PENDING**.

### Frontend — APPROVED

| Choice | Value |
|---|---|
| Framework | React |
| Build tool | Vite |
| Language | TypeScript |
| Decision reference | DEC-019 |

**Constraints:**
- Must support Arabic/RTL (native via CSS `dir="rtl"`)
- Must be responsive (desktop, tablet, mobile)
- Must implement the KOSHK SKATE design system (navy/gold/white, Cairo/Tajawal font)
- SPA (Single Page Application) with client-side routing

### Backend — APPROVED

| Choice | Value |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript |
| API style | REST |
| Decision reference | DEC-020 |

**Constraints:**
- Must be hostable on Hostinger (Node.js)
- Must support REST API with JWT or session authentication
- Must support background jobs (rental expiration notifications)

### Database — APPROVED

| Choice | Value |
|---|---|
| Engine | MySQL 8.x or MariaDB 10.x (Hostinger-provided) |
| Storage engine | InnoDB (transactions + foreign keys) |
| Charset | utf8mb4 (Arabic text support) |
| Decision reference | DEC-015 |

### Source Control — APPROVED

| Choice | Value |
|---|---|
| Platform | GitHub |
| Repository | `https://github.com/mohamedalihassanwork-cpu/Skate-system` |
| Default branch | `master` |
| Decision reference | DEC-021 |

### ORM / Query Builder — APPROVED (DEC-022)

**Choice:** Drizzle ORM with `mysql2` driver  
**Reason:** Excellent TypeScript type safety, schema-as-code, clean migration management, MySQL/MariaDB compatible, Hostinger-deployable.  
**Status:** APPROVED — project owner decision, Phase 01 planning

### Authentication Mechanism — APPROVED (DEC-024)

**Choice:** JWT + Refresh Token  
**Access token:** Short-lived JWT (15 min) — `Authorization: Bearer <token>` header  
**Refresh token:** Long-lived (7 days) — stored in `refresh_tokens` DB table; single-use with rotation  
**Revocation:** Forced logout via DB deletion of refresh token (required for cashier shift close)  
**Status:** APPROVED — project owner decision, 2026-09-09 (pre-Phase 02)  
**Implementation:** Phase 02

### Notification Delivery — PENDING

Options: Server-Sent Events / WebSocket / Client-side polling  
Status: **PENDING — requires decision before Phase 15 begins**

---

## 3. Application Structure (Target)

```
/                          — Repository root
├── apps/
│   ├── web/               — Frontend application
│   │   ├── src/
│   │   │   ├── modules/   — Feature modules
│   │   │   ├── components/ — Shared UI components
│   │   │   ├── layouts/   — Page layouts
│   │   │   ├── styles/    — Design system / CSS
│   │   │   ├── services/  — API client services
│   │   │   ├── stores/    — State management
│   │   │   └── utils/     — Utilities
│   │   └── public/
│   └── api/               — Backend application
│       └── src/
│           ├── modules/   — Feature modules
│           ├── middleware/ — Express/framework middleware
│           ├── config/    — Configuration
│           ├── db/        — Database connection, migrations, seeds
│           └── utils/     — Utilities
├── docs/                  — Project documentation
├── tests/                 — Test suites
└── scripts/               — Utility scripts
```

**Status:** PLANNED — structure not yet created

---

## 4. Frontend Architecture

**Status: PLANNED**

See `docs/architecture/FRONTEND_ARCHITECTURE.md` for detailed documentation.

### Key design requirements:
- Arabic-first, RTL-first (`dir="rtl"`, `lang="ar"` on `<html>`)
- KOSHK SKATE design system (CSS tokens)
- Cairo or Tajawal font from Google Fonts
- Responsive: mobile, tablet, desktop
- Component-based architecture
- Client-side routing

---

## 5. Backend Architecture

**Status: PLANNED**

See `docs/architecture/BACKEND_ARCHITECTURE.md` for detailed documentation.

### Key requirements:
- REST API
- JWT-based authentication (UNKNOWN — pending decision)
- Role-based authorization middleware
- Input validation (server-side)
- Transaction support for financial operations
- Audit log middleware/service
- Background job for rental expiration notifications

---

## 6. Database Architecture

**Status: PLANNED**

See `docs/architecture/DATABASE_ARCHITECTURE.md` for detailed documentation.

### Key requirements:
- MySQL/MariaDB InnoDB
- Foreign key constraints
- Transaction support
- Migrations managed by the ORM/migration tool
- No hard-delete of historical records (soft-delete pattern)

---

## 7. API Architecture

**Status: PLANNED**

See `docs/architecture/API_ARCHITECTURE.md` for detailed documentation.

### Key conventions (target):
- RESTful routes grouped by module
- JSON request/response
- Standard HTTP status codes
- Consistent error response format
- JWT Bearer token authentication
- Permission check per endpoint

---

## 8. Authentication

**Status: UNKNOWN — pending decision**

**Options:**
- JWT (stateless)
- Session-based (with server-side store)
- JWT + refresh token rotation

**Constraints:**
- Must support role-based authorization
- Must be compatible with Hostinger environment

---

## 9. Authorization

**Status: PLANNED**

- Role-based access control (RBAC)
- Roles are configurable by Administrator
- Permissions are data-driven (stored in database)
- Backend enforces all permission checks independently
- Frontend may hide/disable UI but must never be the sole enforcement layer

---

## 10. File Storage

**Status: UNKNOWN — pending decision**

**Use case:** Damage photos attached to damage reports.

**Options:**
- Local filesystem on server (simple, Hostinger-compatible)
- Cloud storage (S3, Cloudinary, etc.)

**Constraints:** Must be compatible with Hostinger hosting plan.

---

## 11. Notifications

**Status: UNKNOWN — pending decision**

**Use case:** Alert cashier 1 minute before rental expiration.

**Options:**
- Server-Sent Events (SSE)
- WebSocket
- Client-side polling

**Constraints:** Must work within Hostinger environment.

---

## 12. Scheduled Jobs

**Status: UNKNOWN — pending decision**

**Use case:** Check for expiring rentals and send notifications.

**Options:**
- Node.js `node-cron` or `agenda`
- Hostinger-supported cron jobs

---

## 13. Reporting

**Status: PLANNED**

- Server-side report generation
- PDF export (library TBD: puppeteer, pdfmake, jsPDF)
- Excel/CSV export
- Print support via browser `window.print()`

---

## 14. Invoice / Barcode

**Status: PLANNED**

- Invoice generation for rentals and sales
- Barcode on invoice (format TBD: Code128, QR)
- Print support
- Administrator can enable/disable printing

---

## 15. Error Handling

**Status: PLANNED**

- Backend: structured JSON error responses
- Frontend: user-friendly Arabic error messages
- Unhandled errors: logged server-side, generic message to client
- Financial errors: log and alert, never silently swallow

---

## 16. Logging

**Status: PLANNED**

- Business audit log: stored in database (see Audit Log module)
- Application error log: server-side (file or service)
- Format: structured JSON preferred

---

## 17. Security

See `docs/architecture/SECURITY_ARCHITECTURE.md` for detailed documentation.

**Status: PLANNED**

---

## 18. Environment Configuration

**Status: PLANNED**

- All secrets via environment variables (`.env` file, never committed)
- `.env.example` committed with placeholder values
- Required variables (target):
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `PORT`
  - `NODE_ENV`
  - `STORAGE_PATH` (if local file storage)

---

## 19. Deployment

See `docs/architecture/DEPLOYMENT_ARCHITECTURE.md` for detailed documentation.

**Target:** Hostinger Web/Cloud  
**Status: PLANNED — no deployment exists**

---

## 20. Scalability

**Immediate target:** Single-store operation. Not a multi-tenant SaaS.

**No premature optimization** for scale that doesn't exist. The modular monolith structure allows future scale if needed.

---

## Current vs Target Summary

| Area | Current State | Target / Approved |
|---|---|---|
| Frontend | SCAFFOLD — `apps/web/` builds cleanly (Phase 01) | React + Vite + TypeScript (APPROVED — DEC-019) |
| Backend | SCAFFOLD — `apps/api/` written (Phase 01) | Node.js + Express + TypeScript (APPROVED — DEC-020) |
| Database | NONE — Drizzle configured, no tables yet | MySQL / MariaDB InnoDB (APPROVED — DEC-015) |
| ORM | CONFIGURED — `drizzle-orm` + `mysql2` installed (Phase 01) | Drizzle ORM + mysql2 (APPROVED — DEC-022) |
| Arabic Font | LOADED — Cairo via Google Fonts in `index.html` (Phase 01) | Cairo (APPROVED — DEC-023) |
| Auth | NONE | PENDING decision (JWT stateless / JWT+refresh / Session) |
| File storage | NONE | PENDING decision |
| Notifications | NONE | PENDING decision (SSE / WebSocket / Polling) |
| Deployment | NONE | Hostinger (plan not yet purchased) |
| Git | VERIFIED | `https://github.com/mohamedalihassanwork-cpu/Skate-system` |

---

*Last updated: 2026-09-09 (Phase 01 execution)*
