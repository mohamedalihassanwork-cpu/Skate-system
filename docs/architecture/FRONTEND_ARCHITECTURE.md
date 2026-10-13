# Frontend Architecture — KOSHK SKATE ERP

**Version:** 1.2  
**Status:** PARTIALLY IMPLEMENTED — Frontend exists through Phase 03.5; target architecture sections remain for future phases.  
**Last updated:** 2026-09-14 (Governance Remediation — status corrected from PLANNED to PARTIALLY IMPLEMENTED)

> [!NOTE]
> Verified implementation exists for: React + Vite + TypeScript scaffold (Phase 01), React Router with
> ProtectedRoute (Phase 02), AuthContext + JWT auth (Phase 02), Sidebar + Topbar App Shell with RTL
> layout (Phase 03.5), full shared UI component library — 16 components (Phase 03.5), LoginPage
> split-screen (Phase 03.5), UsersPage, RolesPage, SkatesPage (all migrated to design system Phase 03.5).
>
> Target architecture sections (routing map, state management strategy, API communication,
> forms/validation strategy) describe the full intended system and are partially implemented.
> They should NOT be treated as unimplemented placeholder text — they describe the approved
> architecture that future phases must implement into.


---

## Framework — APPROVED

**React + Vite + TypeScript** (DEC-019)

**Rationale:** Approved by project owner.

**Constraints:**
- Must support Arabic/RTL (native via CSS `dir="rtl"`)
- Must be responsive
- Must be compatible with the KOSHK SKATE design system (navy/gold/white, Cairo/Tajawal font)

---

## Core Requirements

### Language
- Arabic (`lang="ar"`, `dir="rtl"` on `<html>`)
- All user-facing text: Arabic
- All labels, buttons, notifications, error messages: Arabic
- Numbers: standard Arabic-readable (left-to-right digit order retained)
- Dates: localized for Arabic reading

### RTL
- CSS layout uses `dir="rtl"` at the root level
- No LTR-first layouts that are simply mirrored
- Flexbox and Grid respect RTL automatically when `dir="rtl"` is set
- Directional icons (arrows, chevrons) use RTL-specific variants where needed
- Sidebar anchored to the right on desktop

---

## Build System — APPROVED

**Vite** (part of DEC-019)

Node.js-compatible build output. Development server with HMR.

---

## Routing

**Status: PLANNED**

Client-side routing with protected routes.

### Route Structure (Target)

```
/                    → Redirect to /dashboard or /login
/login               → Login page
/dashboard           → Dashboard
/skates              → Skate inventory
/skates/:id          → Skate detail / timeline
/rentals             → Active rentals
/rentals/new         → Rental POS (start rental)
/rentals/:id         → Rental detail
/rentals/:id/return  → Return workflow
/customers           → Customer list
/customers/:id       → Customer profile
/reservations        → Reservations
/maintenance         → Maintenance list
/maintenance/:id     → Maintenance detail
/sales               → Sales POS
/expenses            → Expenses
/treasury            → Treasury
/reports             → Reports hub
/reports/:type       → Specific report
/users               → User management
/settings            → Settings
/audit-log           → Audit log
```

---

## Application Layout

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────┐
│                          Content Area          │  Sidebar │
│                                                │  (Navy)  │
│  [Header: user info, notifications]            │  Logo    │
│                                                │  Nav     │
│  [Page title]                                  │  items   │
│  [Filters/controls]                            │          │
│  [Cards / Tables / Charts]                     │          │
│                                                │          │
└──────────────────────────────────────────────────────────┘
```

### Mobile (<640px)

- Sidebar collapses to a drawer (bottom or overlay)
- Content goes full-width
- Tables become scrollable or card-based
- Modals become full-height sheets

---

## Design System

Based on: `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`

### CSS Custom Properties (Target Tokens)

```css
/* Colors */
--color-primary: #192744;
--color-primary-soft: #2D3E67;
--color-accent: #F3B735;
--color-bg: #F5F6F9;
--color-surface: #FFFFFF;
--color-border: #E3E7EB;
--color-text-primary: #1F293D;
--color-text-secondary: #7D8798;
--color-text-muted: #9AA2B0;

--color-success: #58C89A;
--color-success-bg: #DDF6EA;
--color-warning: #F3B735;
--color-warning-bg: #FFF1C9;
--color-danger: #ED4547;
--color-danger-bg: #FCE0E1;
--color-neutral-bg: #EEF1F5;
--color-neutral-text: #657084;

/* Typography */
--font-family-ar: 'Cairo', 'Tajawal', sans-serif;

/* Radius */
--radius-control: 9px;
--radius-card: 16px;
--radius-modal: 20px;
--radius-pill: 999px;

/* Spacing */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;

/* Shadows */
--shadow-card: 0 4px 18px rgba(25, 39, 68, 0.06);
--shadow-modal: 0 18px 45px rgba(25, 39, 68, 0.14);
```

**Note:** Token values are screenshot-derived approximations. Confirm from final design system before treating as canonical. (See Visual Design Reference §36)

---

## Components

### Shared Components (Target)

| Component | Description |
|---|---|
| `Sidebar` | Fixed right-side nav, navy, with active state |
| `Header` | User info, notifications, page title |
| `PageShell` | Wraps all authenticated pages |
| `KPICard` | Dashboard metric card |
| `DataTable` | Operational table with sort, filter |
| `StatusBadge` | Semantic color pill badge |
| `Modal` | Centered dialog with overlay |
| `Button` | Primary, secondary, destructive variants |
| `Input` | Text input, Arabic-aligned |
| `Select` | Dropdown select |
| `SearchBar` | Search input with icon |
| `FilterBar` | Compact filter controls |
| `SkateCard` | Equipment grid card |
| `LoadingSpinner` | Loading state |
| `EmptyState` | No-data state |
| `Notification` | Toast/alert notification |
| `ConfirmDialog` | Destructive action confirmation |

---

## State Management

**Status: PENDING — decision required once Phase 01 begins**

**Recommended options for React:**
- Zustand (lightweight, minimal boilerplate)
- Redux Toolkit (structured, scalable)
- React Context + useReducer (no extra dependency, suitable for simpler state)

**Key state domains:**
- `auth` — current user, token, permissions
- `ui` — sidebar state, notifications, loading
- `rental` — active rental creation flow
- `shift` — current open shift state

---

## API Communication

**Status: PLANNED**

- HTTP client: `fetch` API or `axios`
- Base URL from environment variable
- JWT token attached via `Authorization: Bearer` header
- Error handling: centralized interceptor
- Loading states: per-request

---

## Forms and Validation

**Status: PLANNED**

- Validation: client-side pre-check + server-side authoritative
- Error messages: Arabic
- Required field indicators
- Form library: TBD (react-hook-form, VeeValidate, etc.)

---

## Table Features

All operational tables should support:
- Sorting by column
- Pagination
- Search/filter
- Responsive behavior (horizontal scroll or card conversion on mobile)
- Status badges in relevant columns
- Row actions

---

## Modals

Modals follow the KOSHK SKATE modal language:
- Centered white container
- `border-radius: var(--radius-modal)`
- `box-shadow: var(--shadow-modal)`
- Dark semi-transparent backdrop
- Arabic title + identifier
- Vertical form sections
- Full-width primary CTA at bottom

On mobile: becomes full-height sheet from bottom.

---

## Notifications

**Status: UNKNOWN — pending decision on delivery mechanism**

Types:
- In-app notification panel (bell icon in header)
- Toast notifications (transient)
- Rental expiration alert (urgent, audio optional)

---

## Loading States

Every async operation must show a loading indicator. No silent waiting.

---

## Empty States

Every list/table must have an empty state (Arabic text, contextual icon).

---

## RTL Rules

- `<html dir="rtl" lang="ar">` at root
- Sidebar on the RIGHT
- Page title aligned RIGHT
- Form labels aligned RIGHT
- Table primary column on the RIGHT
- Primary actions on the RIGHT in forms (or full-width)
- Chevrons/arrows flipped for RTL

---

## Responsive Breakpoints (Target)

| Token | Width |
|---|---|
| Mobile | < 640px |
| Tablet | 640–1023px |
| Desktop | 1024–1279px |
| Large desktop | ≥ 1280px |

---

## Fonts

**Target:** Cairo (primary) or Tajawal — loaded from Google Fonts  
**Fallback:** `sans-serif`  
**Final choice:** PENDING — treat as design token decision

---

*Last updated: 2026-09-09*

## Desktop presentation layer — 2026-10-11

The desktop audit adds `apps/web/src/styles/desktop.css`, imported after `App.tsx` in `main.tsx`. It contains only screen media rules at or above 1024px. Component/page hooks preserve existing DOM below that breakpoint, and desktop-only interaction changes are guarded with `matchMedia`. Legacy semantic aliases live in `design-system.css` with the same screen/width guard. Existing API clients, routing, permissions and business state remain unchanged.

`tests/desktop_ui_audit.py` provides isolated browser presentation coverage using synthetic intercepted API responses; it does not validate backend authorization, persistence or financial correctness. See [desktop audit evidence](../quality/DESKTOP_UI_UX_AUDIT.md).


## Phone/tablet presentation layer — 2026-10-12

`main.tsx` loads `mobile-shared.css`, `mobile-modules.css` and `mobile-pages.css` after the existing desktop sheet. Every new visual rule is screen-only and limited below 1024px. Shared components are reused; no dependencies, routes, API contracts, business state or backend enforcement changed. The existing sidebar switch remains 768px. `useMobilePresentation` observes the 1024px boundary for existing shared sale/detail/cancellation and report-feedback presentation; desktop paths are preserved.

`tests/mobile_tablet_ui_audit.py` reuses isolated synthetic fixtures from the desktop harness for route/viewport, dialog/navigation, state, large-text and desktop preservation checks. This is frontend verification, not live database/financial verification. See [scope and results](../quality/MOBILE_TABLET_UI_UX_AUDIT.md).
