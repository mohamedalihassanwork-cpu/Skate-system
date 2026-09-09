# Deployment Architecture — KOSHK SKATE ERP

**Version:** 1.1  
**Status:** PLANNED — No deployment exists. No production environment exists.  
**Last updated:** 2026-09-09 (reconciled)

> [!CAUTION]
> No deployment exists. This document describes the target deployment architecture only.
> Do NOT treat this as a live environment description.

---

## Current Deployment Status

**NONE** — The project has no deployed environment. Only specification documents exist.

---

## Target Hosting Platform

**Platform:** Hostinger Web/Cloud hosting  
**Rationale:** Stated project constraint  
**Status:** PLANNED — No account/plan confirmed

### Hostinger Compatibility Requirements

| Requirement | Status |
|---|---|
| Node.js application hosting | Must confirm plan supports Node.js |
| MySQL/MariaDB database | Standard on most Hostinger plans |
| HTTPS / SSL certificate | Standard (Let's Encrypt) |
| Environment variables | Must confirm access method |
| File storage | Local filesystem within hosting plan |
| Cron jobs | Must confirm Hostinger cron support |
| GitHub deployment | Must confirm Git-based deploy workflow |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Hostinger Server                      │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │  Frontend (SPA)  │    │  Backend (Node.js API)   │  │
│  │  Static files    │    │  Express/Fastify/Nest    │  │
│  │  served by Node  │    │  REST API on port 3000   │  │
│  └──────────────────┘    └──────────────────────────┘  │
│           │                          │                  │
│           └──────────────────────────┘                  │
│                          │                              │
│                 ┌─────────────────┐                     │
│                 │  MySQL/MariaDB  │                     │
│                 └─────────────────┘                     │
│                          │                              │
│                 ┌─────────────────┐                     │
│                 │  File Storage   │                     │
│                 │  (uploads/)     │                     │
│                 └─────────────────┘                     │
└─────────────────────────────────────────────────────────┘
          ↑
    HTTPS (Let's Encrypt)
          ↑
       Browser
```

---

## Deployment Method (Target)

**Target:** GitHub-based deployment  
**Status:** PLANNED

GitHub repository: `https://github.com/mohamedalihassanwork-cpu/Skate-system`  
Default branch: `master`

Target workflow:
1. Code pushed to GitHub `master` branch
2. Hostinger pulls from GitHub (manual or webhook — mechanism TBD)
3. `npm install` runs
4. Database migrations run (`npm run migrate`)
5. Application starts (or restarts via PM2 or Hostinger process manager)

---

## Process Management

**Status: UNKNOWN — depends on Hostinger plan**

**Options:**
- PM2 (if VPS or Cloud)
- Hostinger's built-in Node.js process management (if Shared/Cloud)

**Requirements:**
- Application must restart automatically after crashes
- Must survive server reboots

---

## Environment Configuration

All secrets via environment variables.

**Required production variables:**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/koshk_erp
JWT_SECRET=<cryptographically-random-string>
JWT_EXPIRES_IN=8h
STORAGE_PATH=/path/to/uploads
```

**Never stored in Git. Set via Hostinger admin panel or `.env` file on server.**

---

## Database Setup

1. Create MySQL database via Hostinger control panel
2. Create database user with appropriate permissions
3. Run migrations: `npm run migrate`
4. Run seeds: `npm run seed` (for initial config data)

---

## Domain and SSL

**Status: UNKNOWN — domain not confirmed**

Target:
- Production domain: TBD
- SSL: Let's Encrypt via Hostinger (standard)
- HTTPS enforced (HTTP redirects to HTTPS)

---

## Backup Strategy

**Status: UNKNOWN — pending infrastructure decision**

Requirements (target):
- Daily automated MySQL backup via Hostinger backup feature
- Regular backup of `uploads/` directory
- Backup retention: minimum 30 days
- Procedure for restore to be documented when hosting is provisioned

---

## Constraints

The following infrastructure choices are explicitly excluded:

| Excluded | Reason |
|---|---|
| Kubernetes | Not required; Hostinger not K8s |
| Microservices | Not required; single-store operation |
| RabbitMQ / Kafka | Not required; no distributed messaging needed |
| Redis | Not required unless specific caching need arises |
| Separate CDN | Not required at launch |
| Docker (unless Hostinger VPS) | UNKNOWN — depends on plan |

---

## What NOT To Do (Deployment)

- Do NOT deploy to production during documentation or development phases
- Do NOT modify production database structure without a tested migration
- Do NOT commit `.env` files with real credentials to Git
- Do NOT purchase hosting or configure DNS during development
- Do NOT alter live customer data

---

## Recommended Next Steps (After Code Is Ready)

1. Provision Hostinger plan (confirm Node.js + MySQL support)
2. Create production database
3. Configure environment variables on server
4. Set up GitHub repository and deploy access
5. Configure SSL
6. Run migrations
7. Run seed data
8. Verify application health
9. Document production credentials location (securely, not in Git)

---

*Last updated: 2026-09-09*
