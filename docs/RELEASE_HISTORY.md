# Release History — KOSHK SKATE ERP

**Purpose:** Track all releases with version, phase, changes, and deployment status.

---

## v0.2.0 — 2026-09-09

**Phase:** Phase 01 — Foundation & Project Setup  
**Status:** UNRELEASED (internal baseline — no deployment)  
**Git Commits:** `f7d2810`, `35cc75a`  
**Deployment:** NOT DEPLOYED — Hostinger not yet configured  
**Final Gate:** APPROVED WITH DOCUMENTED LIMITATIONS (2026-09-09)

### Major Changes
- Frontend scaffold: Vite + React + TypeScript, Cairo font, RTL, KOSHK SKATE design system
- Backend scaffold: Express + TypeScript, health check, global error handler, structured JSON errors
- Database: Drizzle ORM + mysql2 configured; local `koshk_skate` database created
- Custom error class hierarchy (8 classes), financial utilities (pure functions)
- `.gitignore`, `README.md`, `.env.example` files

### Verification
- Frontend build: ✅ zero TypeScript errors
- Backend build: ✅ zero TypeScript errors
- `GET /api/v1/health → 200 { status: "ok" }`: ✅ live verified
- DB connection: ✅ `localhost:3306/koshk_skate` confirmed
- RTL + Cairo + CSS tokens: ✅ all verified
- 404 handler: ✅ `{ success: false, error: { code: "NOT_FOUND" } }`
- CORS: ✅ `Access-Control-Allow-Origin: http://localhost:5173`
- No secrets committed: ✅

### Notes
- No user-facing business features in this release. Infrastructure only.
- Decisions DEC-022 (Drizzle ORM) and DEC-023 (Cairo) recorded.

---

## Release Template

```
## v<version> — <date>

**Phase:** Phase XX — <Phase Name>
**Status:** <UNRELEASED | DEPLOYED>
**Git Commit:** <hash>
**Deployment:** <NOT DEPLOYED | Hostinger — <date>>

### Major Changes
- ...

### Verification
- ...

### Notes
- ...
```

---

## Future Release Milestones (Target)

| Version | Phase | Description | Target |
|---|---|---|---|
| 0.1.0 | Phase 00 | Governance & Documentation | DONE (no code) |
| 0.2.0 | Phase 01 | Foundation & Project Setup | TBD |
| 0.3.0 | Phase 02 | Auth & Permissions | TBD |
| 0.4.0 | Phase 03–04 | Skates & Customers | TBD |
| 0.5.0 | Phase 05–06 | Rental POS & Payments | TBD |
| 0.6.0 | Phase 07–09 | Returns, Damage, Maintenance | TBD |
| 0.7.0 | Phase 10–11 | Reservations & Sales POS | TBD |
| 0.8.0 | Phase 12–13 | Expenses, Shifts, Reports | TBD |
| 0.9.0 | Phase 14–17 | Invoices, Notifications, Audit, Dashboard | TBD |
| 1.0.0 | Phase 18 | Production Readiness | TBD |

---

*Last updated: 2026-09-09*
