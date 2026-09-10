# KOSHK SKATE ERP — Design System

**Version:** 1.0  
**Status:** ACTIVE — Approved for Phase 03.5 implementation  
**Authority:** Owner-approved (OD-001 through OD-005, Phase 03.5)  
**Last updated:** 2026-09-10  

> This document is the authoritative implementation reference for the KOSHK SKATE ERP UI/UX design system.
> All UI implementation — current and future — must comply with this document.
> Conflicts with this document must be recorded in `docs/decisions/DECISION_LOG.md` before any deviation is made.

---

## TABLE OF CONTENTS

1. Design Identity
2. Color System
3. Typography
4. Spacing System
5. Border Radius
6. Shadows
7. Z-Index
8. Transitions & Motion
9. Icon System
10. RTL Rules (Non-Negotiable)
11. Accessibility Requirements
12. Page Anatomy
13. Component Standards
14. Sidebar Behavior
15. Login Page Layout
16. Responsive Breakpoints
17. Visual Density
18. UI Governance Rules
19. Anti-Patterns (Prohibited)
20. New Screen Checklist

---

## 1. DESIGN IDENTITY

The KOSHK SKATE ERP visual identity is:

- Modern Arabic-first ERP interface
- Professional, operational, clean, calm, and trustworthy
- Premium without being luxurious or decorative
- High information density with generous whitespace
- Strong dark navy brand anchor
- White surfaces over a very light cool-gray application background
- Yellow/gold as brand accent and active-state emphasis
- Semantic green/yellow/red status colors
- Soft rounded cards with subtle elevation
- Thin, quiet borders
- Strong typographic hierarchy
- RTL is native — not a mirrored LTR afterthought

**Visual keywords:** Arabic RTL, Modern ERP, Clean, Operational, Navy, Gold, Soft Cards, Subtle Shadows, High Readability, Calm, Professional

---

## 2. COLOR SYSTEM

### 2.A — Brand Colors (FIXED — do not change without owner approval)

| CSS Token | Hex | Usage |
|---|---|---|
| `--color-navy-900` | `#0e1929` | Deep navy — darkest surface |
| `--color-navy-800` | `#192744` | PRIMARY — sidebar, primary buttons, hero panels, strong headings |
| `--color-navy-700` | `#2D3E67` | Active nav background, secondary dark controls |
| `--color-navy-600` | `#35476F` | Hover states on navy surfaces |
| `--color-navy-500` | `#4d6a99` | Mid-weight navy elements |
| `--color-navy-50` | `#eef2f8` | Ultra-light navy tint (active nav background) |
| `--color-gold-500` | `#F3B735` | PRIMARY ACCENT — active state, highlights, key indicators |
| `--color-gold-400` | `#f5c64a` | Lighter accent variant |
| `--color-gold-200` | `#fae099` | Very light gold (selection highlight) |
| `--color-gold-100` | `#fdf0cc` | Gold tint background |

### 2.B — Semantic Colors (APPROVED — OD-001)

#### Success (متاح / Available / Healthy)

| Token | Hex | Usage |
|---|---|---|
| `--color-success-500` | `#58C89A` | Success icon, success badge background |
| `--color-success-bg` | `#DDF6EA` | Success badge / chip background |
| `--color-success-text` | `#159A69` | Success badge text |

#### Warning (تنبيه / Near expiry / Attention)

| Token | Hex | Usage |
|---|---|---|
| `--color-warning-500` | `#F3B735` | Warning icon, warning indicator (same as gold per VDR §2.2) |
| `--color-warning-bg` | `#FFF1C9` | Warning badge background |
| `--color-warning-text` | `#C88B00` | Warning badge text |

#### Danger (خطأ / Error / Destructive / متأخر)

| Token | Hex | Usage |
|---|---|---|
| `--color-danger-500` | `#ED4547` | Danger icon, destructive action, error border |
| `--color-danger-bg` | `#FCE0E1` | Danger badge background |
| `--color-danger-text` | `#D83C40` | Danger badge text |

#### Neutral (مفقود / Inactive / Cancelled)

| Token | Hex | Usage |
|---|---|---|
| `--color-neutral-bg` | `#EEF1F5` | Neutral badge / inactive state background |
| `--color-neutral-text` | `#657084` | Neutral badge text |

#### Info (معلومات / Reserved / Maintenance)

| Token | Hex | Usage |
|---|---|---|
| `--color-info-500` | `#4a90d9` | Info icon, reserved/info badge |
| `--color-info-bg` | `#e3f2fd` | Info badge background |
| `--color-info-text` | `#1565c0` | Info badge text |

### 2.C — Surface & Text Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-white` | `#FFFFFF` | Card surfaces, modal surfaces, inputs |
| `--color-page-bg` | `#F5F6F9` | Application page background |
| `--color-border` | `#E3E7EB` | Default border color |
| `--color-border-focus` | `#4d6a99` | Focus ring border (navy-500) |
| `--color-text-primary` | `#1F293D` | Main body text |
| `--color-text-secondary` | `#4e5869` | Secondary text |
| `--color-text-muted` | `#7D8798` | Muted / placeholder / label text |
| `--color-text-inverse` | `#FFFFFF` | Text on dark/navy backgrounds |
| `--color-text-gold` | `#F3B735` | Active nav item text, gold emphasis |

---

## 3. TYPOGRAPHY

### Font Family (FIXED — DEC-023)

```
--font-family-base: 'Cairo', 'Segoe UI', system-ui, sans-serif;
```

Cairo is loaded from Google Fonts. No other font family may be introduced without owner approval.

### Font Scale

| Token | Size | Usage |
|---|---|---|
| `--font-size-xs` | `0.75rem` (12px) | Captions, section labels, tiny badges |
| `--font-size-sm` | `0.875rem` (14px) | Body secondary, table cells, form labels |
| `--font-size-base` | `1rem` (16px) | Body text, inputs |
| `--font-size-lg` | `1.125rem` (18px) | Card titles, sub-headings |
| `--font-size-xl` | `1.25rem` (20px) | Section headings |
| `--font-size-2xl` | `1.5rem` (24px) | Page sub-titles |
| `--font-size-3xl` | `1.875rem` (30px) | Page title (h1) |
| `--font-size-4xl` | `2.25rem` (36px) | Dashboard KPI numbers |

### Font Weights

| Token | Value | Usage |
|---|---|---|
| `--font-weight-regular` | `400` | Body text |
| `--font-weight-medium` | `500` | Labels, secondary emphasis |
| `--font-weight-semibold` | `600` | Buttons, badge text |
| `--font-weight-bold` | `700` | Headings, KPI numbers, strong emphasis |

### Typography Rules

- Arabic text minimum body size: 14px (never below 12px)
- Headings must use font-weight 700 (bold) — Arabic bold reads better at scale
- **Never use `text-transform: uppercase` on Arabic text** — it is meaningless and looks wrong
- Numbers in the UI use Western Arabic digits (0–9) per product convention
- Do not declare `font-family` inline in components — inherit from the global cascade

---

## 4. SPACING SYSTEM

Based on a 4px grid:

| Token | Value | Common usage |
|---|---|---|
| `--space-1` | `4px` | Minimal gap, icon spacing |
| `--space-2` | `8px` | Compact gap, badge padding |
| `--space-3` | `12px` | Input padding (vertical) |
| `--space-4` | `16px` | Standard gap, card inner gap |
| `--space-5` | `20px` | Card padding (compact) |
| `--space-6` | `24px` | Card padding (standard), section gap |
| `--space-8` | `32px` | Page padding (desktop), large section gap |
| `--space-12` | `48px` | Large vertical gaps |

### Layout Constants

| Token | Value | Usage |
|---|---|---|
| `--sidebar-width` | `240px` | Fixed sidebar width (expanded) |
| `--sidebar-collapsed-width` | `64px` | Collapsed sidebar width |
| `--header-height` | `64px` | Topbar height |
| `--content-max-width` | `1280px` | Maximum page content width |

---

## 5. BORDER RADIUS

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Small chips, tight corners |
| `--radius-base` | `8px` | Inputs, buttons, controls |
| `--radius-md` | `10px` | Secondary card elements |
| `--radius-lg` | `16px` | Cards — the primary card radius |
| `--radius-xl` | `20px` | Modals |
| `--radius-full` | `9999px` | Pills and badges (status chips) |

---

## 6. SHADOWS

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(25,39,68,0.05)` | Very subtle lift |
| `--shadow-sm` | `0 1px 3px rgba(25,39,68,0.08)` | Input focus, small elements |
| `--shadow-card` | `0 4px 18px rgba(25,39,68,0.06)` | Standard card shadow |
| `--shadow-md` | `0 4px 6px rgba(25,39,68,0.08)` | Dropdown menus |
| `--shadow-lg` | `0 10px 20px rgba(25,39,68,0.10)` | Elevated elements |
| `--shadow-modal` | `0 18px 45px rgba(25,39,68,0.14)` | Modal dialogs |

All shadows use navy-tinted rgba — never use black-based shadows.

---

## 7. Z-INDEX

| Token | Value | Usage |
|---|---|---|
| `--z-base` | `0` | Normal document flow |
| `--z-raised` | `10` | Slightly elevated |
| `--z-dropdown` | `100` | Dropdown menus |
| `--z-sticky` | `200` | Sticky header/topbar |
| `--z-sidebar` | `300` | Sidebar |
| `--z-overlay` | `400` | Modal backdrop |
| `--z-modal` | `500` | Modal dialog |
| `--z-toast` | `600` | Toast notifications (always on top) |

---

## 8. TRANSITIONS & MOTION

**Principle:** Motion conveys meaning. It is not decorative.

| Token | Value | Usage |
|---|---|---|
| `--transition-fast` | `150ms ease` | Button hover, badge state |
| `--transition-base` | `200ms ease-out` | Dropdown open, input focus |
| `--transition-slow` | `300ms ease-out` | Modal appear, sidebar slide |

### Motion Rules by Context

| Context | Duration | Easing |
|---|---|---|
| Button hover | 150ms | ease |
| Input focus ring | 150ms | ease |
| Dropdown / menu open | 200ms | ease-out |
| Modal appear | 300ms | ease-out (fade + slight scale) |
| Sidebar slide (mobile) | 300ms | ease-in-out |
| Toast appear | 250ms | ease-out (slide up + fade) |
| Page enter | 300ms | ease-out (fade + 4px translateY) |
| Loading skeleton pulse | 1.5s | ease-in-out infinite |

### Reduced Motion (Mandatory)

All animations MUST respect:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. ICON SYSTEM

### Approved Library: Lucide React (OD-003)

- Package: `lucide-react`
- License: MIT
- Style: Stroke-based, geometric, consistent weight
- Tree-shakeable: only imported icons are bundled
- RTL-compatible: geometric icons are direction-neutral

### Icon Size Rules

| Context | Size |
|---|---|
| Sidebar navigation | 18px |
| Topbar / header actions | 20px |
| Button leading icon | 16px |
| Inline in body text | 14–16px |
| Card icon container | 20–24px inside 40x40px container |
| Empty state icon | 48px |
| Toast icon | 18px |

### Approved Emoji to Lucide Replacement Map

| Replaced emoji | Module | Lucide component |
|---|---|---|
| 🏠 | Dashboard | `LayoutDashboard` |
| ⛸️ | Skates | `Package` |
| 👥 | Customers | `Users` |
| 🎫 | Rentals | `Ticket` |
| 💰 | Treasury | `Landmark` |
| 🔧 | Maintenance | `Wrench` |
| 📊 | Reports | `BarChart2` |
| 👤 | Users (admin) | `UserCog` |
| 🔑 | Roles | `KeyRound` |
| ⚙️ | Settings | `Settings` |
| 🚪 | Logout | `LogOut` |
| 🔍 | Search | `Search` |
| 🔄 | Refresh | `RefreshCw` |
| ⏳ | Loading indicator | `Loader2` (with spin animation) |
| 🚧 | Placeholder | `Construction` |
| ⚠ | Warning / error | `AlertTriangle` |
| + | Add / create action | `Plus` |

### Icon Governance

- No emoji in the UI — permanently prohibited (UI-003)
- Never mix outline and filled icons in the same context
- Never introduce a second icon library without owner approval (UI-006)
- Directional icons (arrows, chevrons) must use RTL-correct direction — apply `transform: scaleX(-1)` where the icon must flip

---

## 10. RTL RULES (NON-NEGOTIABLE)

The application is Arabic-first. RTL is a first-class constraint.

| Rule | Requirement |
|---|---|
| HTML root | `<html lang="ar" dir="rtl">` |
| Sidebar position | RIGHT side of the screen |
| Active nav indicator | LEFT edge of nav items (RTL inline-start) |
| Page title | Right-aligned |
| Table primary column | Right (first in reading order) |
| Form labels | Right-aligned |
| Form primary CTA | Right side (RTL start) |
| Icon + label pairs | Icon on right of label in RTL |
| Directional icons | Must point correct direction for RTL context |
| Arabic text alignment | Never use `text-align: left` for Arabic prose |
| `text-transform` | Never `uppercase` on Arabic text |
| Toast position | Bottom-left (reading-start side in RTL) |
| Numbers | Western Arabic digits (0–9) |
| CSS properties | Prefer logical properties (`margin-inline-start`, `padding-inline-end`) |

---

## 11. ACCESSIBILITY REQUIREMENTS

| Requirement | Standard |
|---|---|
| Color contrast — body text | Minimum 4.5:1 (WCAG AA) |
| Color contrast — large text / UI components | Minimum 3:1 |
| Focus rings | `focus-visible` with 2px outline using `--color-border-focus` |
| Keyboard navigation | Full keyboard access; Tab order follows RTL reading direction |
| Touch targets | Minimum 44x44px for all interactive elements |
| Aria-labels | All icon-only buttons must have `aria-label` in Arabic |
| Semantic HTML | Use `<button>` for actions, `<a>` for navigation |
| Status conveyance | Never use color alone — always pair with label or icon |
| Reduced motion | All animations wrapped in `prefers-reduced-motion` |
| Error association | Form errors must link to their field via `aria-describedby` |

---

## 12. PAGE ANATOMY

### Standard Page Layout (Desktop)

```
[Page Header]
  h1 title (right-aligned, bold) + [Primary Action Button (top-right in RTL)]
  subtitle (muted, 14px)

[KPI Row — only on pages that require it]
  4 columns desktop / 2 tablet / 1 mobile

[Controls Row]
  [Search] [Status Filter] [Date Filter] [Refresh]

[Main Content]
  Table | Card Grid | Form | Detail

[Pagination]
```

### Page Type to Layout Map

| Module type | Content layout | Examples |
|---|---|---|
| List / Management | Card Grid or Table | Skates, Customers, Users, Roles |
| Operational POS | Split panel | Rentals, Sales POS |
| Financial | Table + KPI header | Treasury, Payments |
| Reporting | Chart + Table | Reports, Dashboard |
| Settings | Form groups | Settings |
| Admin | Card list with expand | Roles detail |

---

## 13. COMPONENT STANDARDS

All shared components live in: `apps/web/src/components/ui/`

See `docs/design/COMPONENT_LIBRARY.md` for full per-component specifications including props, variants, usage examples, and RTL notes.

### Summary of Required Components

| Component | Key spec |
|---|---|
| `Button` | primary / secondary / ghost / danger; sm(32px) / base(40px) / lg(44px) |
| `Input` | 40px height, 8px radius, focus ring, error state, label above |
| `Select` | Same as Input + RTL dropdown |
| `Textarea` | Multiline input, shared styles |
| `Modal` | 560px default, 20px radius, header + divider + body + footer |
| `Badge` | Pill, 12px 700, semantic status colors |
| `Card` | White, 16px radius, shadow-card, 20–24px padding |
| `DataTable` | 52–56px rows, muted headers, hover, row actions |
| `SearchBar` | Search input with Lucide Search icon |
| `EmptyState` | Icon + title + description + optional CTA |
| `LoadingSpinner` | Lucide Loader2, aria-label |
| `LoadingSkeleton` | Shimmer pulse animation |
| `Toast` + `ToastProvider` | success(3s) / warning(4s) / error(persistent) / info(4s) |
| `ConfirmDialog` | Replaces confirm() — danger variant for destructive |
| `Alert` | Inline alert banner |
| `Icon` | Wrapper for Lucide icons |
| `Pagination` | RTL-aware page navigation |

---

## 14. SIDEBAR BEHAVIOR

### Expanded State (240px — default)

- Fixed on the RIGHT side of screen (RTL)
- Navy-800 background
- 18px Lucide SVG icons
- Active item: gold tint background + gold text + gold indicator bar on LEFT edge

### Collapsed State (64px — OD-005)

- Icons remain visible, centered
- Text labels hidden
- Active state: icon in gold, indicator bar remains visible
- Tooltips appear on hover with Arabic module name
- State persisted in `localStorage` key: `koshk_sidebar_collapsed`
- Transition: `--transition-slow` (300ms)

### Mobile Sidebar (Drawer — < 768px)

- Trigger: hamburger icon in topbar (RIGHT in RTL)
- Slides in from RIGHT, full height
- Width: 80% of screen, max 320px
- Backdrop: rgba(14,25,41,0.4) — tap to dismiss
- Animation: 300ms ease-in-out
- Mobile drawer does NOT reuse collapsed desktop state

---

## 15. LOGIN PAGE LAYOUT

### Desktop: Split-screen (OD-002 APPROVED)

```
Left panel (50%):  Navy-800 brand panel
  - KOSHK SKATE logo / brand mark
  - Arabic headline (large, white, bold)
  - Brand tagline or visual

Right panel (50%): White form panel
  - Login heading (Arabic, navy, bold)
  - Email/username field
  - Password field
  - Primary CTA button (full-width, navy)
  - Error message area
```

### Mobile: Centered single-column (OD-002 APPROVED)

- Single centered card on light background
- Logo at top
- Form below
- Brand panel hidden

### Preserved across both layouts

- Arabic-first language
- RTL text direction
- Cairo typography
- Navy/Gold visual identity

---

## 16. RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | < 640px | Single-column, full-width elements |
| Tablet | 640px – 1023px | Reduced columns, sidebar becomes drawer |
| Desktop | 1024px – 1279px | Full layout with sidebar |
| Large desktop | >= 1280px | Max content width applied |

| Breakpoint | Sidebar |
|---|---|
| >= 768px | Fixed expanded (240px) or collapsed (64px) |
| < 768px | Hidden by default; drawer on demand |

---

## 17. VISUAL DENSITY

**Target:** Scan quickly without feeling overwhelmed.

| Element | Desktop | Mobile |
|---|---|---|
| Page padding | 32px | 16px |
| Card padding | 20–24px | 16px |
| Table row height | 52–56px | 48px |
| Form field gap | 16–20px | 14–16px |
| Section gap | 24–32px | 16–24px |
| Sidebar item height | 40–44px | 44px (drawer) |
| KPI grid | 4 col | 2 col (tablet) / 1 col (mobile) |

---

## 18. UI GOVERNANCE RULES

These rules are mandatory for all UI work in this project (OD-004 APPROVED).

**UI-001 — Design System First**  
All new ERP interfaces must use approved KOSHK SKATE design tokens. No custom color values, font sizes, or shadows may be introduced outside of `design-system.css`.

**UI-002 — Shared Components Mandatory**  
All new pages must use shared components from `apps/web/src/components/ui/`. Duplicate implementations of Modal, Button, Input, Badge, DataTable, etc. are prohibited. Create missing components in the shared library first, then use them.

**UI-003 — No Emoji in UI**  
Emoji are permanently prohibited. All icons must be Lucide SVG. Violations are blocking — a phase cannot be COMPLETED with emoji in the UI.

**UI-004 — Arabic-RTL Verification Mandatory**  
Every new interface must be visually verified in Arabic RTL before being marked VERIFIED. RTL errors are blocking issues.

**UI-005 — No Native Browser Dialogs**  
`confirm()`, `alert()`, and `prompt()` are permanently prohibited. Use `ConfirmDialog` and Toast.

**UI-006 — New Patterns Require Approval**  
New visual patterns not in the design system must be proposed and approved before implementation. AI agents must not invent patterns silently.

**UI-007 — No Inline Style Objects for Structure**  
Structural styles must not be hardcoded as inline `style={{}}` objects. Use `className` with CSS custom properties. Inline styles permitted only for genuinely dynamic values.

**UI-008 — Phase Completion Requires UI/UX DoD**  
A phase cannot be COMPLETED without satisfying all UI/UX items in the Definition of Done.

**UI-009 — Mobile Must Be Intentionally Designed**  
Desktop and mobile layouts must be explicitly designed and verified. "It auto-wraps" is not acceptable.

**UI-010 — AI Agents Must Reuse Before Creating**  
AI agents must check the existing shared component library before creating any new UI component. Duplicating an existing shared component is a violation.

---

## 19. ANTI-PATTERNS (PROHIBITED)

| Anti-Pattern | Prohibition |
|---|---|
| Emoji as icons | Use Lucide SVG icons |
| `confirm()` / `alert()` / `prompt()` | Use ConfirmDialog / Toast |
| Hardcoded hex colors in components | Use CSS custom properties |
| `style={{color: '#xxx'}}` for design tokens | Use className |
| `text-transform: uppercase` on Arabic text | Remove — invalid for Arabic |
| Different font family per screen | Always Cairo |
| New card/button/badge style per page | Use shared components |
| Pure black backgrounds or text | Use navy-900 or navy-800 |
| Decorative illustrations in operational screens | Not part of this design language |
| Inventing new visual patterns per module | Use design system patterns |
| LTR-first layouts mirrored for RTL | Design RTL natively |
| Mixing Lucide with other icon libraries | One icon library only |

---

## 20. NEW SCREEN CHECKLIST

Before marking any new page or screen as complete:

- [ ] Cairo font used throughout
- [ ] Only design token colors used (no hardcoded hex)
- [ ] All icons are Lucide SVG (no emoji)
- [ ] Shared Button component used
- [ ] Shared Input component used
- [ ] Shared Modal component used (not native confirm/alert)
- [ ] Shared Badge for all status display
- [ ] Shared EmptyState for all empty conditions
- [ ] Shared LoadingSpinner or LoadingSkeleton for loading
- [ ] Same page shell (sidebar + topbar)
- [ ] 32px page padding (desktop), 16px (mobile)
- [ ] Sidebar on the RIGHT
- [ ] Title right-aligned
- [ ] No `text-transform: uppercase` on Arabic
- [ ] Directional icons correct for RTL
- [ ] Desktop layout intentionally designed
- [ ] Mobile layout intentionally designed
- [ ] Table horizontally scrollable on mobile
- [ ] Touch targets >= 44x44px
- [ ] Contrast >= 4.5:1 for body text
- [ ] Focus rings visible on keyboard navigation
- [ ] Screen looks like it belongs to the same product

---

*Last updated: 2026-09-10 — Phase 03.5 Stage 1 establishment*  
*Authority: Owner-approved (OD-001 through OD-005)*  
*Reference: `KOSHK_SKATE_VISUAL_DESIGN_REFERENCE.md`, `docs/decisions/DECISION_LOG.md`*
