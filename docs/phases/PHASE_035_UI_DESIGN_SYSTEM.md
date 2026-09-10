# Phase 03.5 — ERP Design System & Interface Standardization

**Phase:** 03.5  
**Name:** ERP Design System & Interface Standardization  
**Status:** STAGE 1 COMPLETE — Awaiting owner review before Stage 2  
**Last updated:** 2026-09-10  

---

## Objective

Transform the KOSHK SKATE ERP from a working prototype interface into a cohesive, professional, scalable product by:

1. Formalizing the approved design system (tokens, components, patterns)
2. Migrating all Phase 01–03 interfaces to the design system
3. Creating the shared UI foundation that all Phase 04+ modules must use

**The output must be:** *The same ERP, working identically, but looking and feeling like a professional product.*

---

## Owner Decisions (All APPROVED)

| ID | Decision | Approved Value |
|---|---|---|
| OD-001 | Semantic color corrections | Approved — see DESIGN_SYSTEM.md §2.B |
| OD-002 | Login layout | Split-screen desktop / centered mobile |
| OD-003 | Icon library | Lucide React (MIT, SVG stroke) |
| OD-004 | UI Governance Rules | All 10 rules approved (UI-001 through UI-010) |
| OD-005 | Sidebar collapsed state | Desktop: expanded + collapsible; Mobile: drawer only |

---

## Scope

### IN SCOPE

**Design System:**
- Correct and finalize all CSS design tokens in `design-system.css`
- Install Lucide React icon library

**Component Library (15+ components in `apps/web/src/components/ui/`):**
- Button, Input, Select, Textarea
- Modal, ConfirmDialog, Alert
- Badge, Card
- DataTable
- SearchBar, EmptyState
- LoadingSpinner, LoadingSkeleton
- Toast + ToastProvider
- Icon, Pagination

**Sidebar & Topbar (App Shell):**
- Replace all emoji icons with Lucide SVG
- Remove prototype "المرحلة 03 ✓" badge from Topbar
- Add active nav indicator bar
- Add avatar + role to sidebar user block
- Add notification bell placeholder to Topbar
- Implement sidebar collapsed state (desktop)
- Implement mobile sidebar drawer (hamburger + overlay)

**Interface Migration (existing pages):**
- LoginPage → split-screen desktop layout + shared components
- SkatesPage → shared components + corrected badge colors
- UsersPage → shared components + replace `confirm()` + replace `alert()`
- RolesPage → shared components
- PlaceholderPage → shared EmptyState component

**Governance & Documentation:**
- Create `docs/design/DESIGN_SYSTEM.md`
- Create `docs/design/COMPONENT_LIBRARY.md`
- Create `docs/phases/PHASE_035_UI_DESIGN_SYSTEM.md` (this file)
- Update `docs/00-governance/AI_AGENT_RULES.md`
- Update `docs/00-governance/DEFINITION_OF_DONE.md`
- Update `docs/00-governance/SOURCE_OF_TRUTH.md`
- Update `docs/PROJECT_STATE.md`
- Update `docs/PROJECT_MAP.md`
- Update `docs/CHANGELOG.md`
- Update `docs/decisions/DECISION_LOG.md`

### OUT OF SCOPE

- Any new ERP module or business feature
- Backend API changes of any kind
- Database schema changes or migrations
- Business logic changes
- Dark mode (not in KOSHK design language)
- Dashboard implementation (Phase 17)
- Audit log implementation (Phase 16)
- Mobile app (not planned)
- Any feature beyond visual/UX standardization

---

## Phase Lifecycle — Critical Rule

**STAGE 1 MUST NOT MODIFY APPLICATION IMPLEMENTATION.**

Stage 1 is exclusively documentation and governance work. No React component files, CSS files, or application code files may be changed in Stage 1.

---

## Stage Structure

---

### STAGE 1 — Documentation & Governance Alignment

**Status: COMPLETE (2026-09-10)**

**Purpose:**  
Establish the documentation foundation that will govern Phase 03.5 implementation. All implementation decisions must be documented before code is written.

**Stage 1 Rules:**
- NO application code changes
- NO React component creation or modification
- NO CSS file changes
- NO API or backend changes
- Documentation and governance files only

**Stage 1 Deliverables:**

| # | Deliverable | Status |
|---|---|---|
| S1-D1 | `docs/design/DESIGN_SYSTEM.md` — authoritative design reference | COMPLETE |
| S1-D2 | `docs/design/COMPONENT_LIBRARY.md` — component developer reference | COMPLETE |
| S1-D3 | `docs/phases/PHASE_035_UI_DESIGN_SYSTEM.md` — this spec | COMPLETE |
| S1-D4 | `docs/00-governance/AI_AGENT_RULES.md` — updated with UI rules + DOCUMENTATION_FIRST | COMPLETE |
| S1-D5 | `docs/00-governance/DEFINITION_OF_DONE.md` — updated with UI/UX DoD | COMPLETE |
| S1-D6 | `docs/00-governance/SOURCE_OF_TRUTH.md` — updated with new docs + hierarchy | COMPLETE |
| S1-D7 | `docs/PROJECT_STATE.md` — Phase 03.5 added | COMPLETE |
| S1-D8 | `docs/PROJECT_MAP.md` — new paths registered | COMPLETE |
| S1-D9 | `docs/CHANGELOG.md` — Stage 1 entry | COMPLETE |
| S1-D10 | `docs/decisions/DECISION_LOG.md` — OD-001 through OD-005 + governance decisions | COMPLETE |

**Stage 1 Definition of Done:**
- [ ] All Stage 1 deliverables above exist and are complete
- [ ] No application code files were modified
- [ ] Documentation consistency check performed (no conflicts)
- [ ] Git commit created with Stage 1 changes only
- [ ] Git commit pushed to remote
- [ ] Owner review obtained before Stage 2 begins

---

### STAGE 2 — Implementation

**Status: PLANNED — Awaiting owner approval to begin**

**Purpose:**  
Implement the approved design system in the application codebase.

**Prerequisites:**
- Stage 1 complete and owner-approved
- Owner confirms no changes to OD-001 through OD-005
- All stage 1 documentation committed and pushed

**Stage 2 Implementation Order:**

**Phase A — Foundation (no regression risk)**
1. Install `lucide-react` dependency
2. Update `design-system.css` — correct semantic color tokens per OD-001
3. Create shared component library (`components/ui/`) — all 17 components

**Phase B — App Shell (visible immediately)**
4. Rebuild Sidebar: SVG icons, active indicator bar, avatar/role block, collapse toggle, mobile drawer
5. Rebuild Topbar: remove prototype badge, add notification bell placeholder

**Phase C — Interface Migration (page by page)**
6. Migrate LoginPage (split-screen desktop layout)
7. Migrate SkatesPage (shared components + corrected badge colors)
8. Migrate UsersPage (shared components + ConfirmDialog + Toast)
9. Migrate RolesPage (shared components)
10. Migrate PlaceholderPage (EmptyState component)

**Stage 2 deliverables:**

| # | Deliverable |
|---|---|
| S2-D1 | `lucide-react` installed in `apps/web/package.json` |
| S2-D2 | `apps/web/src/styles/design-system.css` — corrected complete token file |
| S2-D3 | `apps/web/src/components/ui/` — 17 shared components |
| S2-D4 | Migrated Sidebar (SVG icons, active bar, avatar/role block, collapse, mobile drawer) |
| S2-D5 | Migrated Topbar (prototype badge removed, notification bell added) |
| S2-D6 | Migrated LoginPage (split-screen desktop, centered mobile) |
| S2-D7 | Migrated SkatesPage (shared components, corrected badge colors) |
| S2-D8 | Migrated UsersPage (shared components, ConfirmDialog, Toast — no confirm/alert) |
| S2-D9 | Migrated RolesPage (shared components) |
| S2-D10 | Migrated PlaceholderPage (EmptyState) |

---

### STAGE 3 — Testing & Verification

**Status: PLANNED**

**Purpose:**  
Verify that the implementation matches the design system and that no regressions occurred.

**Stage 3 Requirements:**

**Build Verification:**
- `npm run build` in `apps/api` → 0 TypeScript errors
- `npm run build` in `apps/web` → 0 TypeScript errors, bundle size acceptable

**Test Regression:**
- `npm test` in `apps/api` → 34/34 tests PASS (zero regressions)
- All existing functionality works (no business logic changed)

**UI Verification (manual):**
- Login page: split-screen desktop, centered mobile
- Sidebar: expanded state, collapsed state, mobile drawer
- Topbar: no prototype badge, notification bell visible
- SkatesPage: shared components, correct badge colors, no emoji
- UsersPage: shared components, ConfirmDialog for delete, Toast for feedback
- RolesPage: shared components
- All pages: RTL layout correct
- All pages: no emoji anywhere
- All pages: no native `confirm()` or `alert()` calls

**Accessibility Verification:**
- Focus rings visible on keyboard navigation
- All icon buttons have Arabic aria-labels
- Touch targets >= 44x44px on key elements

---

### STAGE 4 — Documentation Finalization + Git

**Status: PLANNED**

**Purpose:**  
Update all documentation to reflect the completed Phase 03.5, create a clean final commit, and push.

**Stage 4 Requirements:**
- `docs/PROJECT_STATE.md` — Phase 03.5 marked FINAL GATE PASSED
- `docs/PROJECT_MAP.md` — all new files updated to VERIFIED
- `docs/CHANGELOG.md` — Phase 03.5 complete entry
- `docs/decisions/DECISION_LOG.md` — implementation commit references added
- `docs/design/DESIGN_SYSTEM.md` — version updated if any adjustments were made during implementation
- `docs/design/COMPONENT_LIBRARY.md` — updated if any props changed during implementation
- Git commit: `docs(phase-03.5): finalize design system implementation documentation`
- Push to remote

---

## Affected Modules

| Module | Change type | Scope |
|---|---|---|
| App Shell (Sidebar + Topbar) | Visual/UX refactor | No business logic change |
| Auth (LoginPage) | Visual/UX refactor | No business logic change |
| Users/Permissions (UsersPage, RolesPage) | Visual/UX refactor | No business logic change |
| Skates (SkatesPage) | Visual/UX refactor | No business logic change |
| Shared UI library | NEW — created | Foundation for all future modules |
| Design system CSS | Correction | Token values only — no behavior change |

---

## Definition of Done

Phase 03.5 is COMPLETE when ALL of the following are true:

### Design System
- [ ] `design-system.css` tokens match the approved Visual Design Reference
- [ ] All semantic tokens added (success-text, warning-text, neutral-bg, neutral-text, info-*)
- [ ] Corrected colors match OD-001 approved values

### Component Library
- [ ] 17 shared components exist in `apps/web/src/components/ui/`
- [ ] All components use design tokens only — no hardcoded values
- [ ] All components have TypeScript prop interfaces
- [ ] All components are Arabic-RTL compatible
- [ ] Barrel export `index.ts` exports all components
- [ ] Component library documentation (`COMPONENT_LIBRARY.md`) reflects final implementation

### Icon System
- [ ] `lucide-react` installed (`apps/web/package.json`)
- [ ] All emoji icons replaced across all pages and the app shell
- [ ] Icon replacement mapping documented in `DESIGN_SYSTEM.md`
- [ ] No second icon library introduced

### Interface Migration
- [ ] Sidebar: Lucide SVG icons, active indicator bar, avatar+role user block, collapse toggle
- [ ] Sidebar: mobile drawer (hamburger + slide-in + backdrop + dismiss)
- [ ] Topbar: "المرحلة 03 ✓" prototype badge removed
- [ ] Topbar: notification bell placeholder added
- [ ] LoginPage: split-screen desktop + centered mobile + shared components
- [ ] SkatesPage: shared components + corrected badge colors
- [ ] UsersPage: shared components + ConfirmDialog + Toast (no confirm/alert)
- [ ] RolesPage: shared components
- [ ] PlaceholderPage: EmptyState component
- [ ] Zero emoji anywhere in the UI
- [ ] Zero native `confirm()` / `alert()` calls anywhere

### Build & Tests
- [ ] `npm run build` (apps/api) → 0 TypeScript errors
- [ ] `npm run build` (apps/web) → 0 TypeScript errors
- [ ] `npm test` (apps/api) → 34/34 PASS — zero regressions

### Functional Verification
- [ ] Login works (credential entry, error states, redirect)
- [ ] Users management works (list, create, deactivate)
- [ ] Roles management works (list, view permissions)
- [ ] Skates management works (list, search, filter, create, edit, status)
- [ ] Protected routes work (redirect to /login when unauthenticated)
- [ ] Permission gates work (buttons hidden/shown by role)

### RTL Verification
- [ ] All pages verified in Arabic RTL layout
- [ ] Sidebar on RIGHT side
- [ ] Titles and labels right-aligned
- [ ] No `text-transform: uppercase` on Arabic text
- [ ] Directional icons correct for RTL context
- [ ] Toast positioned bottom-LEFT

### Mobile Verification (< 768px)
- [ ] Sidebar hidden, hamburger visible in topbar
- [ ] Mobile sidebar drawer opens and closes correctly
- [ ] Login page uses centered layout on mobile
- [ ] Tables horizontally scrollable
- [ ] Key touch targets >= 44x44px

### Documentation
- [ ] `docs/design/DESIGN_SYSTEM.md` — final version
- [ ] `docs/design/COMPONENT_LIBRARY.md` — reflects final implementation
- [ ] `docs/phases/PHASE_035_UI_DESIGN_SYSTEM.md` — this file — status updated
- [ ] `docs/00-governance/AI_AGENT_RULES.md` — UI rules + DOCUMENTATION_FIRST added
- [ ] `docs/00-governance/DEFINITION_OF_DONE.md` — UI/UX DoD updated
- [ ] `docs/00-governance/SOURCE_OF_TRUTH.md` — hierarchy and register updated
- [ ] `docs/PROJECT_STATE.md` — Phase 03.5 FINAL GATE PASSED
- [ ] `docs/PROJECT_MAP.md` — all Phase 03.5 file paths VERIFIED
- [ ] `docs/CHANGELOG.md` — complete entry
- [ ] `docs/decisions/DECISION_LOG.md` — all decisions recorded

### Git
- [ ] Stage 1 commit: `docs(phase-03.5): establish design system and governance foundation`
- [ ] Stage 2 commit: `feat(phase-03.5): implement design system and migrate ERP interfaces`
- [ ] Stage 4 commit: `docs(phase-03.5): finalize design system implementation documentation`
- [ ] All commits pushed to `origin/master`

---

## Dependencies

| Dependency | Status | Notes |
|---|---|---|
| Phase 03 COMPLETE | SATISFIED | Commit `f12c5b7` |
| Owner approval for OD-001 through OD-005 | SATISFIED | All approved before Stage 1 |
| Stage 1 owner review before Stage 2 | PENDING | Required before Stage 2 begins |

---

## Risk Matrix

| Risk | Severity | Mitigation |
|---|---|---|
| Shared component migration breaks existing test IDs | HIGH | Preserve all HTML `id` attributes — API tests depend on them |
| Color token correction changes visible badge appearance | MEDIUM | Screenshot-compare before/after; document changes in CHANGELOG |
| CSS media queries conflict with current inline styles | MEDIUM | Convert structural inline styles to CSS classes before adding breakpoints |
| Icon library bundle size increase | LOW | Tree-shaking ensures only imported icons are bundled |
| Over-engineering component library | MEDIUM | Build exactly what is needed now — no premature generalization |
| Mobile sidebar breaks on certain viewport sizes | MEDIUM | Test on multiple viewport sizes: 375px, 414px, 540px, 768px |

---

## Known Technical Debt from Previous Phases (Affecting This Phase)

| TD-ID | Description | Impact on Phase 03.5 |
|---|---|---|
| TD-002 | DEC-007 enforcement deferred to Phase 09 (maintenance→available check) | Not in scope for 03.5 — no change needed |
| TD-003 | Skate Type hardcoded free-text; future Settings migration needed | Not in scope for 03.5 — no change needed |

---

*Created: 2026-09-10 — Phase 03.5 Stage 1*  
*Authority: Owner-approved per OD-001 through OD-005*
