# KOSHK SKATE — Visual Design Reference & UI DNA
## Screenshot-derived Design System Reference

**Purpose:** This document captures the visual language extracted from the provided KOSHK SKATE ERP screenshots. It is intended to be reused as a visual reference whenever a new screen, tab, component, modal, dashboard, report, or responsive layout is created.

> **Core rule:** New screens must look like they belong to the same product. Reuse this visual language instead of inventing a new one.

---

# 1. DESIGN IDENTITY

### Overall visual character

- Modern Arabic-first ERP interface.
- Professional, operational, clean, calm, and trustworthy.
- Premium without being luxurious or decorative.
- High information density, but with generous whitespace.
- Strong dark navy brand anchor.
- White surfaces over a very light cool-gray application background.
- Yellow/gold used as the brand accent and active/navigation emphasis.
- Green/red/yellow status colors used semantically.
- Soft rounded cards with subtle elevation.
- Thin, quiet borders.
- Minimal visual noise.
- Strong typographic hierarchy.
- RTL is native to the composition, not a mirrored afterthought.

### Visual keywords

`Arabic RTL` · `Modern ERP` · `Clean` · `Operational` · `Navy` · `Gold` · `Soft Cards` · `Subtle Shadows` · `High Readability` · `Data Dense` · `Calm` · `Professional`

---

# 2. COLOR SYSTEM

> Values below are **estimated from screenshots**, not extracted from original source files. Use them as the visual baseline and tune only when a real design token/source becomes available.

## 2.1 Core colors

| Token | Approx. HEX | RGB | Usage |
|---|---|---|---|
| `navy-900` | `#192744` | 25,39,68 | Main sidebar, primary buttons, hero panels, strong headings |
| `navy-800` | `#1F2E4F` | 31,46,79 | Secondary dark surfaces |
| `navy-700` | `#2D3E67` | 45,62,103 | Active navigation background / secondary dark controls |
| `navy-600` | `#35476F` | 53,71,111 | Hover/secondary navy surfaces |
| `navy-text` | `#1F293D` | ~31,41,61 | Primary text |
| `gold-500` | `#F3B735` | 243,183,53 | Brand accent, active state, highlights |
| `gold-400` | `#F5C64A` | ~245,198,74 | Lighter accent |
| `white` | `#FFFFFF` | 255,255,255 | Cards, inputs, modal surfaces |
| `page-bg` | `#F5F6F9` | ~245,246,249 | Main application background |
| `soft-bg` | `#F2F4F7` | ~242,244,247 | Secondary surfaces |
| `border` | `#E3E7EB` | ~227,231,235 | Card/input/table borders |
| `muted-text` | `#7D8798` | ~125,135,152 | Secondary labels |
| `subtle-text` | `#9AA2B0` | ~154,162,176 | Placeholder / tertiary information |

## 2.2 Semantic colors

### Success / Available
Approximate family:
- `success-500`: `#58C89A`
- `success-bg`: `#DDF6EA`
- `success-text`: `#159A69`

Use for:
- متاح
- عادي
- إيراد
- completed/healthy states
- positive movement

### Warning / Attention
Approximate family:
- `warning-500`: `#F3B735`
- `warning-bg`: `#FFF1C9`
- `warning-text`: `#C88B00`

Use for:
- تالف
- ينتهي قريبًا
- يحتاج متابعة
- attention states

### Danger / Error
Approximate family:
- `danger-500`: `#ED4547`
- `danger-bg`: `#FCE0E1`
- `danger-text`: `#D83C40`

Use for:
- متأخر
- محجوز/critical states when applicable
- repair/failure
- destructive actions
- negative financial movement

### Neutral
Approximate family:
- `neutral-bg`: `#EEF1F5`
- `neutral-text`: `#657084`

Use for:
- مفقود
- غير متاح
- inactive/neutral states

---

# 3. COLOR USAGE RULES

1. **Navy is the structural color.**
   - Sidebar
   - Primary CTA
   - Strong dark panels
   - Major headings where appropriate

2. **Gold is the brand accent, not the default action color.**
   - Active navigation indicator
   - Active tab/filter
   - Brand highlights
   - Small emphasis
   - Important accent details

3. **Green/red/yellow communicate meaning.**
   Do not use semantic colors only for decoration.

4. **Most of the page remains neutral.**
   White + light gray should dominate the canvas.

5. Avoid adding many accent colors.

6. Never replace navy/gold with generic SaaS purple/blue.

---

# 4. TYPOGRAPHY

## 4.1 Observed character

The screenshots use a modern Arabic sans-serif style with:
- strong, highly legible Arabic forms
- bold headings
- compact labels
- clear numerals
- high contrast between heading and body
- comfortable line spacing
- no decorative typography

### Closest font direction

The screenshots visually resemble a modern Arabic UI sans such as:
- **Cairo**
- **Tajawal**

The exact original font cannot be proven from screenshots alone.

**Recommended starting point:** Cairo or Tajawal, with the final choice treated as a design-token decision.

---

## 4.2 Type scale

Approximate visual scale:

| Role | Size | Weight | Usage |
|---|---:|---:|---|
| Display | 30–36px | 700 | Login hero / major marketing-like title |
| Page title | 28–32px | 700 | Main screen title |
| Section title | 20–24px | 700 | Card/section headings |
| Card title | 17–20px | 700 | KPI/report/card headings |
| Body | 14–16px | 400–500 | Main content |
| Label | 12–14px | 500–600 | Form labels / metadata |
| Caption | 11–12px | 400–500 | Secondary metadata |
| KPI number | 28–36px | 700 | Dashboard metrics |
| Table data | 13–15px | 400–600 | Operational tables |
| Button | 13–15px | 600–700 | CTA text |

### Weight hierarchy

- `400`: normal body
- `500`: metadata / medium emphasis
- `600`: buttons, labels, navigation
- `700`: page/section headings and KPI values

Avoid excessive 800/900 weight.

---

# 5. RTL & ARABIC RULES

RTL is a **first-class design constraint**.

### Required behavior

- Sidebar anchored on the right on desktop.
- Main content flows naturally from right to left.
- Page title aligned right.
- Form labels aligned right.
- Text inputs use right-aligned Arabic text.
- Navigation labels and icons maintain consistent RTL relationship.
- Tables follow a deliberate RTL column hierarchy.
- Primary action placement follows the RTL composition rather than simply mirroring an LTR template.
- Numbers remain visually readable and must not be unnecessarily reversed.
- Dates and times should remain understandable.
- Mixed Arabic/English technical values must remain legible.
- Icons should preserve their semantic direction; directional icons may need RTL-specific variants.

### Arabic copy

Use realistic Egyptian/Arabic business terminology. Do not fill interfaces with lorem ipsum when demonstrating the product.

---

# 6. APPLICATION LAYOUT

## Desktop structure

The dominant layout is:

```text
┌──────────────────────────────────────────────────────────────┐
│ Main content area                              │ RTL Sidebar │
│                                                │             │
│ Header / user / notifications                  │ Brand       │
│                                                │ Navigation  │
│ Page title                                     │             │
│ Filters / controls                             │             │
│ Cards / tables / charts                        │             │
│                                                │             │
└──────────────────────────────────────────────────────────────┴
```

### Sidebar

- Fixed right-side navigation.
- Dark navy background.
- Full-height.
- Brand/logo at top.
- Navigation vertically stacked.
- Icons paired with Arabic labels.
- Active item uses a lighter navy rounded background.
- Gold/yellow accent indicates active state.
- Active indicator is visually narrow and vertical near the outer edge.
- Footer area can contain current shift/system information.

### Main content

- Light cool-gray background.
- Large horizontal content area.
- Comfortable page padding.
- Cards sit on the neutral background.
- Content is organized in clear vertical sections.

---

# 7. SPACING SYSTEM

The interface uses a disciplined, generous spacing rhythm.

Recommended base unit:

`4px`

### Suggested tokens

| Token | Value |
|---|---:|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |

Typical usage:
- Icon/text gap: 6–10px
- Input internal padding: 12–16px
- Card padding: 20–24px
- Section gap: 20–32px
- Page section separation: 24–32px

Avoid cramped layouts.

---

# 8. BORDER RADIUS

The visual language is clearly rounded, but not excessively pill-shaped.

Recommended:

| Element | Radius |
|---|---:|
| Small controls | 6–8px |
| Inputs | 8–10px |
| Buttons | 8–10px |
| Cards | 14–18px |
| Modal | 18–22px |
| Pills/badges | 999px |

### Principle

- Cards: noticeably rounded.
- Inputs: moderately rounded.
- Buttons: moderately rounded.
- Status badges: pill.
- Do not make every element a pill.

---

# 9. SHADOWS & ELEVATION

The screenshots use **soft, low-contrast shadows**.

Recommended direction:

```text
box-shadow:
0 4px 18px rgba(25, 39, 68, 0.06)
```

For elevated modals:

```text
box-shadow:
0 18px 45px rgba(25, 39, 68, 0.14)
```

### Rules

- Cards should feel separated, not floating dramatically.
- Avoid strong black shadows.
- Use borders + subtle shadows together sparingly.
- Modal elevation is stronger than card elevation.

---

# 10. CARDS

Card language is one of the strongest recurring patterns.

### Card characteristics

- White background
- Rounded corners
- Subtle border or shadow
- Internal padding around 20–24px
- Clear heading
- Strong hierarchy
- Optional icon container
- Optional status badge
- Plenty of whitespace

### KPI cards

Typical composition:

```text
[small icon/status]                    Label

                                      LARGE VALUE

                                      trend/status
```

Characteristics:
- Large number is visually dominant.
- Label is smaller and muted.
- Supporting trend/status uses semantic color.
- Icon sits in a small soft-colored rounded container.

---

# 11. BUTTONS

## Primary

- Navy background
- White text
- Medium/semibold weight
- Rounded 8–10px
- Strong full-width button used in modal/login contexts

Example visual role:
`تسجيل الدخول`
`حفظ التقرير وتسجيل التلف`

## Accent / brand

- Gold background only when a strong brand/action accent is appropriate.
- Dark text where contrast permits.

## Secondary

- White/light background
- Navy text
- Thin border
- Used beside primary actions.

## Destructive

- Red background
- White text
- Reserved for destructive/irreversible actions.

### Button rules

- Do not use multiple competing primary buttons in one area.
- Action hierarchy must be obvious.
- Keep button heights visually consistent.

Recommended height:
- compact: 32–36px
- standard: 40–44px
- large/primary: 44–48px

---

# 12. INPUTS & FORM CONTROLS

### Input style

- White background
- Thin neutral border
- Rounded 8–10px
- Comfortable height around 40–46px
- Right-aligned Arabic text
- Labels above fields
- Placeholder in muted gray

### Focus

Use a subtle navy/gold focus treatment without heavy glowing outlines.

### Select

- Same visual language as input.
- Chevron icon.
- Consistent height.

### Radio choices

The repair modal shows a horizontal choice group:
- each option in its own rounded bordered container
- selected state gets gold emphasis
- selected radio is clearly visible

### File upload

Use a soft neutral upload zone with:
- icon
- clear Arabic action
- dashed/soft boundary where useful

---

# 13. STATUS BADGES

Status badges are compact, rounded, and lightly colored.

Examples from the reference:

| Status type | Background | Text |
|---|---|---|
| Normal / Available | pale green | green |
| Warning / Near expiry | pale yellow | dark gold |
| Delayed / Error | pale red | red |
| Missing / Neutral | pale gray-blue | gray |
| Maintenance | pale blue/neutral | navy/blue |

### Rules

- Never use saturated backgrounds for routine statuses.
- Use dark text on pale backgrounds.
- Keep badge height compact.
- Status text should be short.

---

# 14. NAVIGATION

### Desktop sidebar

Order is vertical and operational.

Observed pattern:

- Logo / brand
- Dashboard
- Equipment / Skate inventory
- Rentals
- Customers
- Maintenance
- Expenses
- Treasury
- Shifts
- Reservations
- Reports
- Settings

The exact modules are product-specific. For a new screen, preserve the same sidebar visual treatment.

### Active navigation

- Rounded dark-blue active container.
- Gold label/icon.
- Narrow gold active marker near the outer edge.
- Strong but not oversized contrast.

---

# 15. HEADER

Typical header:

- User identity on the left side of the content area.
- Avatar.
- User name and role.
- Notification button.
- Page title on the right.
- Minimal visual clutter.

### Notification

Circular/light button container with a bell icon and optional red notification indicator.

### User profile

- Small circular avatar.
- Name.
- Role in smaller muted text.
- Dropdown indicator.

---

# 16. TABLES

Tables are used heavily for operational data.

### Table characteristics

- White card container.
- Header row with muted/medium text.
- Thin horizontal separators.
- No heavy vertical grid lines.
- Comfortable row height.
- Stronger text for key identifiers/names.
- Semantic status badges.
- Numbers aligned consistently.
- Compact but readable density.

### Table header

- 12–14px
- medium/semibold
- muted navy/gray

### Table row

- 13–15px
- around 48–56px row height depending on density

### Hover

Use a very subtle neutral background.

---

# 17. FILTERS & SEARCH

The reference repeatedly uses compact controls above data.

Pattern:

```text
[Search] [Filter] [Category/Status] [Date]
```

### Search

- Rounded white field
- Search icon
- Placeholder in muted gray
- Compact height

### Filters

- Small outlined/light controls
- Chevron
- Short labels
- Avoid oversized filter bars

### Active filters

Use navy/gold emphasis while retaining the clean pill/button language.

---

# 18. DASHBOARD VISUAL LANGUAGE

Dashboard composition:

1. Page title
2. Period selectors
3. KPI row
4. Main analytical cards
5. Operational table/list

### KPI row

The screenshots show four cards in a row:
- each card independent
- large metric
- small icon
- small trend/status

### Charts

#### Bar chart
- Navy bars
- generous spacing
- minimal axes
- subtle labels
- no unnecessary grid decoration

#### Donut
- thick ring
- semantic status colors
- large central total
- compact legend

### Dashboard rule

Every visualization should answer an operational question.

Do not add charts simply to make the dashboard look sophisticated.

---

# 19. MODALS

The repair modal is a strong reference for the system's dialog language.

### Modal structure

- Centered white container
- Large rounded corners
- Strong but soft shadow
- Darkened/blurred-looking page backdrop
- Header with title + identifier/status
- Divider
- Vertical form sections
- Bottom decision/action block
- Full-width primary save button

### Approximate modal width

Desktop:
`560–620px` for a form modal of this complexity.

### Modal spacing

- Outer padding: ~24–28px
- Field gaps: ~16–20px
- Section gaps: ~20–28px

### Modal actions

Primary action is visually dominant.

---

# 20. DARK PANELS

Some screens use a dark navy hero/header panel.

Characteristics:
- Navy background
- White text
- Gold accent
- Slightly rounded corners
- KPI mini-cards nested inside
- Strong contrast

Use this pattern for:
- current shift summary
- important summary blocks
- login branding
- high-level contextual panels

Do not turn the entire application into dark mode.

---

# 21. LOGIN / AUTH VISUAL LANGUAGE

Reference style:

- Split-screen desktop layout.
- Dark navy branding panel.
- White login form panel.
- Large Arabic headline.
- Logo centered/visible.
- Strong navy CTA.
- Minimal fields.
- Small legal/footer text.

### Brand panel

- Navy background.
- Large bold Arabic statement.
- Supporting text in lighter white/gray.
- Version/footer information small and quiet.

### Login form

- White background.
- Logo near top.
- Large title.
- Supporting subtitle.
- Label + input pairs.
- Full-width navy CTA.

---

# 22. ICONOGRAPHY

Observed style:
- Simple modern line icons.
- Compact.
- Usually dark navy/gray.
- Icons sit inside soft light backgrounds for cards.
- Semantic actions may use green/red/gold.

### Recommended sizing

- Sidebar: 16–18px
- Inline: 16px
- Card icon: 18–22px
- Large action: 18–20px

### Rule

Use one coherent icon family across the product.

Do not mix:
- outlined icons
- filled icons
- cartoon icons
- highly decorative icons

unless the system explicitly defines the exception.

---

# 23. DATA / NUMBER PRESENTATION

Numbers are visually important.

### KPI numbers

- Large
- Bold
- Dark navy
- High contrast
- Currency/unit kept visually understandable

### Positive financial movement

- Green

### Negative financial movement

- Red

### Currency

Use Arabic/Egyptian currency conventions consistently with the product's actual data rules.

Do not visually distort numbers simply to force RTL.

---

# 24. RESPONSIVE DESIGN

Mobile is **not** a shrunken desktop.

## Mobile principles

- Reduce visual density.
- Stack cards vertically.
- Convert large tables into cards or horizontally scrollable data regions only when necessary.
- Keep critical actions reachable.
- Preserve Arabic RTL.
- Use compact headers.
- Use bottom navigation or a mobile drawer if the product architecture calls for it.
- Filters may collapse into a filter sheet/drawer.
- Modals may become full-height/full-width sheets.
- Charts must remain readable.

### Mobile priority

1. Page title/context
2. Primary KPI or key status
3. Primary action
4. Search/filter
5. Main data
6. Secondary information

### Mobile spacing

Use approximately:
- 16px page padding
- 12–16px card gaps
- 16px card padding

---

# 25. RESPONSIVE BREAKPOINT DIRECTION

Suggested starting points:

| Token | Width |
|---|---:|
| Mobile | `< 640px` |
| Tablet | `640–1023px` |
| Desktop | `1024–1279px` |
| Large desktop | `1280px+` |

These are implementation starting points, not screenshot-proven values.

---

# 26. VISUAL DENSITY

The reference balances:
- high operational information
- large whitespace
- readable typography
- compact controls

### Target feeling

**"I can scan this screen quickly without feeling overwhelmed."**

Avoid:
- excessive cards
- excessive charts
- oversized empty spaces
- giant typography everywhere
- dense spreadsheet-like grids
- decorative illustrations

---

# 27. DESIGN TOKENS — REUSABLE BASELINE

```text
COLOR
primary          = #192744
primary-soft     = #2D3E67
accent           = #F3B735
background       = #F5F6F9
surface          = #FFFFFF
border           = #E3E7EB
text-primary     = #1F293D
text-secondary   = #7D8798
text-muted       = #9AA2B0

success          = #58C89A
success-bg       = #DDF6EA

warning          = #F3B735
warning-bg       = #FFF1C9

danger           = #ED4547
danger-bg        = #FCE0E1

neutral-bg       = #EEF1F5
neutral-text     = #657084

TYPOGRAPHY
font-family-ar   = Cairo / Tajawal (final choice pending)
body             = 14–16px
label            = 12–14px
caption          = 11–12px
page-title       = 28–32px / 700
section-title    = 20–24px / 700
card-title       = 17–20px / 700
kpi              = 28–36px / 700
button           = 13–15px / 600–700

RADIUS
control          = 8–10px
card             = 14–18px
modal            = 18–22px
pill             = 999px

SPACING
base             = 4px
page-padding     = 24–32px desktop
page-padding     = 16px mobile
card-padding     = 20–24px
section-gap      = 24–32px

ELEVATION
card             = subtle
modal            = medium/high
```

---

# 28. COMPONENT REUSE RULES

When creating a new tab/screen:

### Reuse first

1. Existing page shell
2. Existing sidebar
3. Existing header
4. Existing typography
5. Existing card
6. Existing KPI card
7. Existing table
8. Existing filter
9. Existing search
10. Existing status badge
11. Existing button
12. Existing modal
13. Existing input/select
14. Existing chart language

### Do not invent

Do not introduce a new:
- radius system
- shadow style
- font family
- primary color
- button shape
- sidebar style
- card style
- icon family
- spacing rhythm

unless the design system is deliberately updated.

---

# 29. NEW SCREEN CREATION RULE

For every new screen:

### Step 1 — Identify the closest existing screen
Find the reference screen with the closest information architecture.

### Step 2 — Reuse the visual structure
Keep:
- page shell
- title hierarchy
- card language
- control language
- spacing
- colors
- typography

### Step 3 — Add only necessary components
If a new component is genuinely required, design it using existing tokens.

### Step 4 — Check RTL
Review the complete composition as Arabic RTL.

### Step 5 — Check responsive behavior
Design desktop and mobile intentionally.

### Step 6 — Check visual consistency
Ask:

> Could a user reasonably believe this screen was designed at the same time as the reference screens?

If not, revise it.

---

# 30. WHAT NOT TO DO

Avoid:

- Generic Bootstrap-looking ERP screens.
- Generic purple SaaS palettes.
- Pure black instead of navy.
- Excessive gradients.
- Glassmorphism.
- Huge shadows.
- Excessive rounded pills.
- Excessive colorful cards.
- Decorative illustrations inside operational screens.
- Unnecessary animations.
- Overly dense tables.
- Tiny unreadable Arabic text.
- LTR-first layouts mirrored afterward.
- Random icon styles.
- Different fonts between screens.
- Different button shapes between modules.
- Introducing a new visual language for every tab.

---

# 31. REFERENCE SCREEN CHARACTERISTICS

## Dashboard
- Light gray page background
- Right-side navy sidebar
- Large right-aligned title
- Period pills
- Four KPI cards
- Bar chart card
- Donut status card
- Large active-rentals table
- Strong whitespace

## Equipment / Skate inventory
- Search + filters
- Status chips
- Repeating equipment cards
- Four-column desktop grid
- Strong availability states
- Compact equipment metadata
- Primary action inside available cards

## Maintenance modal
- Centered white modal
- Dark overlay
- Strong Arabic heading
- Equipment identifier badge
- Vertical form
- Radio-style severity selection
- Upload control
- Amount field
- Notes
- Decision block
- Full-width save CTA

## Treasury
- Four summary cards
- Filter pills
- Large transaction table
- Green/red financial movement
- Navy title hierarchy

## Shifts
- Dark navy current-shift summary panel
- Gold active indicator
- Summary KPI mini-cards
- Historical shift table

## Reports
- Dark navy introductory panel
- Gold heading
- Grid of report cards
- Each card has icon, status label, title, description, and CTA
- Minimal and operational

## Login
- Navy branding half
- White form half
- Large Arabic headline
- Centered logo
- Large navy CTA
- Minimal form

---

# 32. BRAND APPLICATION

The official KOSHK SKATE logo should be treated as the brand anchor.

### Logo rules

- Preserve original proportions.
- Do not redraw.
- Do not replace with a generic skate icon.
- Do not distort.
- Do not recolor unless an approved logo variant exists.
- Keep adequate clear space.
- Use the logo consistently across sidebar/login/brand areas.

### Important distinction

The dark navy seen throughout the UI is strongly consistent with the visual system. The yellow/gold is also strongly recurring. However, exact official brand tokens should be considered **reference-derived**, not legally/brand-official, until confirmed from the source logo/brand file.

---

# 33. ACCESSIBILITY BASELINE

- Text must remain readable on all surfaces.
- Semantic colors must not be the only indicator of state.
- Buttons need clear labels.
- Focus states must be visible.
- Touch targets should be comfortably tappable.
- Avoid low-contrast gray-on-gray combinations.
- Arabic typography must remain legible at mobile sizes.
- Tables must remain understandable when responsive.

---

# 34. QUALITY CHECKLIST FOR EVERY NEW SCREEN

Before considering a new screen complete:

### Brand
- [ ] Correct KOSHK SKATE logo treatment
- [ ] Navy/gold visual relationship preserved

### Typography
- [ ] Same Arabic font family
- [ ] Same heading hierarchy
- [ ] Same number treatment

### Color
- [ ] Uses established palette
- [ ] Semantic colors remain semantic
- [ ] No unrelated accent color

### Components
- [ ] Existing cards reused
- [ ] Existing buttons reused
- [ ] Existing inputs reused
- [ ] Existing badges reused
- [ ] Existing tables reused where appropriate

### Layout
- [ ] Same page shell
- [ ] Same sidebar language
- [ ] Same header language
- [ ] Same spacing rhythm
- [ ] Same card radius/elevation

### RTL
- [ ] Native RTL
- [ ] Correct alignment
- [ ] Correct directional icons
- [ ] Correct mixed Arabic/number handling

### Responsive
- [ ] Desktop designed
- [ ] Mobile intentionally designed
- [ ] Tables remain usable
- [ ] Actions remain reachable

### Overall
- [ ] Looks like the same product
- [ ] No accidental new visual language
- [ ] Operational clarity remains the priority

---

# 35. AI INSTRUCTION — HOW TO USE THIS FILE

When this reference is attached to a future design task, follow this hierarchy:

```text
1. Product/business requirements
2. Existing approved product UX/UI decisions
3. This Visual Design Reference
4. Existing reusable components/tokens
5. New component design only when necessary
```

### Mandatory instruction

> **Do not design the requested screen as an independent visual concept. Design it as a new member of the existing KOSHK SKATE design system.**

### If the requested feature is new

- Preserve the established visual DNA.
- Reuse existing patterns.
- Extend the system minimally.
- Do not create a second design language.

---

# 36. SOURCE / CONFIDENCE NOTE

This document was created from the provided screenshots.

### High-confidence visual observations
- Dark navy structural color
- Yellow/gold accent
- White cards
- Very light cool-gray page background
- Arabic RTL
- Rounded cards
- Soft shadows
- Semantic green/yellow/red status colors
- Strong Arabic heading hierarchy
- Right-side desktop sidebar
- Operational tables/cards
- Navy primary buttons
- Responsive/mobile intent

### Approximate / requires source confirmation
- Exact HEX values
- Exact font family
- Exact font sizes
- Exact spacing values
- Exact breakpoint values
- Exact shadow opacity
- Exact border-radius values
- Exact icon library

**Do not treat approximate values as immutable source-of-truth tokens until they are confirmed from the actual design file/code/design system.**

---

# 37. VERSION

**Reference:** KOSHK SKATE Visual Design Reference  
**Version:** 1.0  
**Basis:** Provided UI screenshots  
**Purpose:** Reusable visual reference for future tabs/screens  
**Status:** Screenshot-derived baseline / approximate tokens
