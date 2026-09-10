# KOSHK SKATE ERP — Component Library

**Version:** 1.0  
**Status:** ACTIVE — Documentation reference for Phase 03.5 implementation  
**Authority:** Owner-approved (OD-001 through OD-005, Phase 03.5)  
**Last updated:** 2026-09-10  

> This document is the developer reference for the KOSHK SKATE ERP shared React component library.
> All components described here must be implemented in `apps/web/src/components/ui/` during Phase 03.5 Stage 2.
> This is documentation only — no implementation code is written here.
>
> For visual specifications (colors, spacing, sizing, tokens), see `docs/design/DESIGN_SYSTEM.md`.

---

## TABLE OF CONTENTS

1. Architecture Principles
2. File Structure
3. Component Index
4. Component Specifications
   - Button
   - Input
   - Select
   - Textarea
   - Modal
   - Badge
   - Card
   - DataTable
   - SearchBar
   - EmptyState
   - LoadingSpinner
   - LoadingSkeleton
   - Toast + ToastProvider
   - ConfirmDialog
   - Alert
   - Icon
   - Pagination
5. Reuse Rules
6. Extension Rules

---

## 1. ARCHITECTURE PRINCIPLES

### Single Source of UI Truth

Every visual pattern that appears more than once in the ERP must be a shared component.  
No module may define its own version of Button, Modal, Input, Badge, or Table.

### Component Rules

1. All components use CSS custom properties from `design-system.css` — no hardcoded values
2. All components are written in TypeScript with full prop types
3. All components are Arabic-RTL compatible by default
4. All components meet the accessibility requirements in `docs/design/DESIGN_SYSTEM.md §11`
5. All components respect `prefers-reduced-motion`
6. All components are in `apps/web/src/components/ui/`

### What Belongs in the Shared Library

A component belongs in the shared library if:
- It is or will be used in more than one page
- It is a foundational UI element (form control, data display, feedback)
- It enforces a design system rule (Badge enforces status colors; Button enforces button sizing)

### What Does NOT Belong in the Shared Library

- Business-logic-specific UI (e.g., a skate status transition panel) — belongs in the module
- Layout shells (sidebar, topbar, page structure) — belongs in `components/layout/`
- Page-level containers — belong in `modules/`

---

## 2. FILE STRUCTURE

```
apps/web/src/components/
  ui/
    Button.tsx
    Input.tsx
    Select.tsx
    Textarea.tsx
    Modal.tsx
    Badge.tsx
    Card.tsx
    DataTable.tsx
    SearchBar.tsx
    EmptyState.tsx
    LoadingSpinner.tsx
    LoadingSkeleton.tsx
    Toast.tsx
    ToastProvider.tsx
    ConfirmDialog.tsx
    Alert.tsx
    Icon.tsx
    Pagination.tsx
    index.ts          ← barrel export for all ui components
  layout/
    Sidebar.tsx       ← App sidebar (manages expanded/collapsed state)
    Topbar.tsx        ← App topbar
    AppShell.tsx      ← Combines Sidebar + Topbar + content area
```

All UI components must be exported from `components/ui/index.ts` for clean imports:

```ts
// Usage in any module:
import { Button, Modal, Badge, DataTable } from '@/components/ui';
```

---

## 3. COMPONENT INDEX

| Component | File | Purpose | Phase |
|---|---|---|---|
| `Button` | `Button.tsx` | All interactive buttons | 03.5 |
| `Input` | `Input.tsx` | Text inputs with label + error | 03.5 |
| `Select` | `Select.tsx` | Dropdown select with RTL support | 03.5 |
| `Textarea` | `Textarea.tsx` | Multi-line text input | 03.5 |
| `Modal` | `Modal.tsx` | Reusable modal dialog shell | 03.5 |
| `Badge` | `Badge.tsx` | Status/label pills | 03.5 |
| `Card` | `Card.tsx` | Surface container | 03.5 |
| `DataTable` | `DataTable.tsx` | Standard ERP data table | 03.5 |
| `SearchBar` | `SearchBar.tsx` | Search input with icon | 03.5 |
| `EmptyState` | `EmptyState.tsx` | Empty list / no results | 03.5 |
| `LoadingSpinner` | `LoadingSpinner.tsx` | Async loading indicator | 03.5 |
| `LoadingSkeleton` | `LoadingSkeleton.tsx` | Content placeholder skeleton | 03.5 |
| `Toast` + `ToastProvider` | `Toast.tsx` + `ToastProvider.tsx` | Non-blocking feedback | 03.5 |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Destructive action confirmation | 03.5 |
| `Alert` | `Alert.tsx` | Inline contextual banner | 03.5 |
| `Icon` | `Icon.tsx` | Lucide icon wrapper | 03.5 |
| `Pagination` | `Pagination.tsx` | RTL-aware page navigation | 03.5 |

---

## 4. COMPONENT SPECIFICATIONS

---

### 4.01 — Button

**File:** `apps/web/src/components/ui/Button.tsx`

**Purpose:** The single, authoritative interactive button for the entire ERP. Replaces all inline-styled `<button>` elements.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | Yes | — | Button label or content |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | No | `'primary'` | Visual variant |
| `size` | `'sm' \| 'base' \| 'lg'` | No | `'base'` | Size variant |
| `type` | `'button' \| 'submit' \| 'reset'` | No | `'button'` | HTML button type |
| `disabled` | `boolean` | No | `false` | Disabled state |
| `loading` | `boolean` | No | `false` | Loading state — shows spinner, disables interaction |
| `onClick` | `() => void` | No | — | Click handler |
| `className` | `string` | No | `''` | Additional CSS classes |
| `aria-label` | `string` | No | — | Required when button is icon-only |
| `fullWidth` | `boolean` | No | `false` | Stretches button to full container width |

**Important states:**
- `default` — normal appearance
- `hover` — darken 8% (via CSS class)
- `active` — darken 12% (via CSS class)
- `disabled` — opacity 0.5, cursor: not-allowed
- `loading` — shows Lucide `Loader2` spinner left of label, pointer-events: none
- `icon-only` — no label, square aspect, requires `aria-label`

**RTL considerations:**
- Leading icon (left in LTR) must be trailing in RTL — use `margin-inline-end` for spacing
- Lucide spinner uses standard spin animation, no RTL adjustment needed

**Accessibility:**
- Renders as a `<button>` element always
- When `loading` is true: `aria-busy="true"` must be applied
- When `disabled`: `disabled` attribute on the element
- Icon-only buttons must receive `aria-label` as a required prop

**Reuse rules:**
- Every interactive button in the ERP uses this component
- No module may define `<button style={{...}}>` for a button that matches an existing variant
- If a new variant is needed: add it to this component — do not create a one-off styled button

---

### 4.02 — Input

**File:** `apps/web/src/components/ui/Input.tsx`

**Purpose:** Standard text input with integrated label, error message, and RTL support.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | Unique HTML id; links label to input |
| `label` | `string` | Yes | — | Arabic label shown above the field |
| `value` | `string` | Yes | — | Controlled value |
| `onChange` | `(e) => void` | Yes | — | Change handler |
| `type` | `string` | No | `'text'` | HTML input type |
| `placeholder` | `string` | No | `''` | Arabic placeholder text |
| `error` | `string` | No | `''` | Error message (shown below field) |
| `required` | `boolean` | No | `false` | Marks field as required (shows * indicator) |
| `disabled` | `boolean` | No | `false` | Disabled state |
| `helperText` | `string` | No | `''` | Helper text below field (hidden when error is shown) |
| `className` | `string` | No | `''` | Additional CSS classes |

**Important states:**
- `default` — standard border
- `focus` — navy-500 border + shadow ring
- `error` — danger-500 border + error message below
- `disabled` — neutral-bg background, opacity 0.7

**RTL considerations:**
- Label is right-aligned (inherits from `dir="rtl"`)
- Input text is right-aligned
- Error message is right-aligned
- `padding-inline-start` / `padding-inline-end` for text padding (not `left`/`right`)
- Required indicator `*` appears after the label text in RTL: `الاسم *`

**Accessibility:**
- `<label htmlFor={id}>` links label to input
- Error state: `aria-invalid="true"` + `aria-describedby` pointing to error element
- Helper/error element has a unique `id` derived from `${id}-error`

**Reuse rules:**
- All form text inputs use this component
- Password inputs use `type="password"` prop
- Number inputs use `type="number"` prop

---

### 4.03 — Select

**File:** `apps/web/src/components/ui/Select.tsx`

**Purpose:** Standard dropdown select with the same visual system as Input. RTL-aware.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | Unique HTML id |
| `label` | `string` | Yes | — | Arabic label |
| `value` | `string` | Yes | — | Controlled value |
| `onChange` | `(e) => void` | Yes | — | Change handler |
| `options` | `Array<{value: string, label: string}>` | Yes | — | Option list |
| `placeholder` | `string` | No | `''` | Empty / default option text |
| `error` | `string` | No | `''` | Error message |
| `required` | `boolean` | No | `false` | Required indicator |
| `disabled` | `boolean` | No | `false` | Disabled state |

**RTL considerations:**
- Dropdown chevron icon appears on the LEFT in RTL (inline-start)
- Selected text is right-aligned
- `direction: rtl` on the `<select>` element

**Accessibility:**
- Same label + error association pattern as Input
- Native `<select>` element for maximum browser/screen reader compatibility

---

### 4.04 — Textarea

**File:** `apps/web/src/components/ui/Textarea.tsx`

**Purpose:** Multi-line text input with the same visual system as Input.

**Expected props:** Same as Input, plus:

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `rows` | `number` | No | `3` | Visible rows |
| `resize` | `'none' \| 'vertical' \| 'both'` | No | `'vertical'` | Resize handle behavior |

**RTL considerations:**
- Text direction inherits `rtl` from parent
- No additional RTL adjustment needed beyond Input

---

### 4.05 — Modal

**File:** `apps/web/src/components/ui/Modal.tsx`

**Purpose:** The reusable dialog shell. All dialogs in the ERP use this component. It handles backdrop, focus trap, keyboard dismiss, and RTL layout.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `isOpen` | `boolean` | Yes | — | Controls visibility |
| `onClose` | `() => void` | Yes | — | Called on close (backdrop, X button, Escape) |
| `title` | `string` | Yes | — | Modal heading (Arabic) |
| `children` | `ReactNode` | Yes | — | Modal body content |
| `footer` | `ReactNode` | No | — | Modal footer (action buttons) |
| `size` | `'sm' \| 'base' \| 'lg'` | No | `'base'` | Width: 480px / 560px / 640px |
| `hideCloseButton` | `boolean` | No | `false` | Hides the X close button |
| `closeOnBackdrop` | `boolean` | No | `true` | Click backdrop to close |

**Important states:**
- Closed — not rendered (or hidden via CSS)
- Open — rendered with animated entrance
- Loading — consumer passes `Button loading={true}` in footer

**RTL considerations:**
- Title is right-aligned
- Close button (X) is on the LEFT in RTL (inline-start of the header)
- Footer: primary CTA on RIGHT, secondary to its left
- Backdrop covers full viewport regardless of RTL

**Accessibility:**
- `role="dialog"` on the modal element
- `aria-modal="true"`
- `aria-labelledby` pointing to the title element
- Keyboard focus trapped inside modal while open
- First focusable element receives focus on open
- Escape key calls `onClose`
- Focus returns to trigger element on close

**Reuse rules:**
- All dialogs (create, edit, delete confirmation, detail view) use this component
- `ConfirmDialog` is built on top of Modal — not a separate implementation
- Never use native `<dialog>` in production code

---

### 4.06 — Badge

**File:** `apps/web/src/components/ui/Badge.tsx`

**Purpose:** Status and label chips / pills. Enforces the approved semantic color mapping from the design system.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | `BadgeStatus` (see below) | No | — | Applies semantic color variant |
| `variant` | `'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | No | — | Manual variant (when status is not a key) |
| `children` | `ReactNode` | Yes | — | Badge label (Arabic text) |
| `size` | `'sm' \| 'base'` | No | `'base'` | Size |
| `className` | `string` | No | `''` | Additional CSS classes |

**BadgeStatus type:**
```
'available' | 'rented' | 'reserved' | 'maintenance' | 'damaged' | 'lost' | 'active' | 'inactive'
```

**Status to variant mapping** (from DESIGN_SYSTEM.md §13.D):

| Status | Variant |
|---|---|
| `available`, `active` | `success` |
| `rented` | `info` |
| `reserved`, `maintenance` | `warning` |
| `damaged` | `danger` |
| `lost`, `inactive` | `neutral` |

**RTL considerations:**
- Badge text inherits RTL
- No directional adjustments needed (pills are symmetric)

**Accessibility:**
- Badge is informational — no interactive behavior
- When used inside a table row, the row itself handles keyboard interaction
- Color is supplemented by text (Arabic status label) — not color-only

**Reuse rules:**
- All status indicators across the ERP use this component
- Status colors are defined in this component only — no module may define its own status color
- If a new status type is needed: add it to the `BadgeStatus` type union and the mapping

---

### 4.07 — Card

**File:** `apps/web/src/components/ui/Card.tsx`

**Purpose:** The standard white surface container for content sections.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | Yes | — | Card content |
| `padding` | `'compact' \| 'standard'` | No | `'standard'` | 20px vs 24px inner padding |
| `hover` | `boolean` | No | `false` | Enable hover elevation effect |
| `onClick` | `() => void` | No | — | Makes the card clickable |
| `className` | `string` | No | `''` | Additional CSS classes |
| `as` | `'div' \| 'article' \| 'section'` | No | `'div'` | Semantic HTML element |

**RTL considerations:**
- Inherits RTL from document root
- No specific directional adjustments

**Accessibility:**
- When `onClick` is provided: adds `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space
- Clickable cards must have a visible focus ring

---

### 4.08 — DataTable

**File:** `apps/web/src/components/ui/DataTable.tsx`

**Purpose:** The standard ERP data table. Enforces correct row height, header styling, no uppercase on Arabic, hover behavior, and RTL column order.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `columns` | `TableColumn[]` | Yes | — | Column definitions |
| `data` | `T[]` | Yes | — | Row data |
| `loading` | `boolean` | No | `false` | Shows skeleton rows |
| `emptyMessage` | `string` | No | `'لا توجد بيانات'` | Arabic empty state message |
| `emptyIcon` | `LucideIcon` | No | `Package` | Lucide icon for empty state |
| `onRowClick` | `(row: T) => void` | No | — | Optional row click handler |
| `className` | `string` | No | `''` | Additional CSS classes |

**TableColumn type:**
```
{
  key: string;
  header: string;         // Arabic column header
  render?: (value, row) => ReactNode;  // Custom cell renderer
  width?: string;         // Optional column width
  align?: 'right' | 'left' | 'center';  // default: 'right' (RTL)
}
```

**Important states:**
- Loading: renders `LoadingSkeleton` rows instead of data
- Empty: renders `EmptyState` component centered in table body
- Populated: renders data rows with hover effect

**RTL considerations:**
- Default column alignment: `text-align: right` (reading start)
- Actions column (last in data array): appears on LEFT in the rendered table (RTL visual end)
- Table scrolls horizontally on mobile — do not break layout

**Accessibility:**
- `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` semantic elements
- `<th scope="col">` on all header cells
- If rows are clickable: `role="button"` + keyboard support

**Reuse rules:**
- All list / management pages use this component for tabular data
- No module may define its own `<table>` layout
- Custom cell renderers are passed via `columns[].render`

---

### 4.09 — SearchBar

**File:** `apps/web/src/components/ui/SearchBar.tsx`

**Purpose:** Search input with Lucide Search icon. Used in page controls rows.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | Yes | — | Controlled value |
| `onChange` | `(value: string) => void` | Yes | — | Change handler (passes string, not event) |
| `placeholder` | `string` | No | `'بحث...'` | Arabic placeholder |
| `onClear` | `() => void` | No | — | Optional clear button callback |
| `className` | `string` | No | `''` | Additional CSS classes |

**RTL considerations:**
- Search icon appears on the RIGHT (reading start) in RTL
- Input text is right-aligned
- Clear button (X) appears on the LEFT (reading end) in RTL

**Accessibility:**
- `aria-label="بحث"` on the input
- Clear button: `aria-label="مسح البحث"`

---

### 4.10 — EmptyState

**File:** `apps/web/src/components/ui/EmptyState.tsx`

**Purpose:** Consistent empty state presentation for lists, tables, and search results.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | `LucideIcon` | No | `Package` | Lucide icon component |
| `title` | `string` | Yes | — | Arabic title |
| `description` | `string` | No | `''` | Arabic description / hint |
| `action` | `ReactNode` | No | — | Optional action button |
| `className` | `string` | No | `''` | Additional CSS classes |

**RTL considerations:**
- All text is right-aligned (inherits RTL)
- Icon is centered above text

**Accessibility:**
- Not interactive (unless `action` is provided)
- `action` button follows Button component accessibility rules

**Reuse rules:**
- Every list, table, and search result must have an EmptyState
- Empty state text must be in Arabic
- No emoji icons — use Lucide SVG only

---

### 4.11 — LoadingSpinner

**File:** `apps/web/src/components/ui/LoadingSpinner.tsx`

**Purpose:** Animated loading indicator for async operations.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `size` | `'sm' \| 'base' \| 'lg' \| 'page'` | No | `'base'` | 16px / 24px / 40px / 64px |
| `label` | `string` | No | `'جارٍ التحميل'` | Arabic label for screen readers |
| `className` | `string` | No | `''` | Additional CSS classes |

**Implementation:** Uses Lucide `Loader2` icon with CSS `animation: spin 1s linear infinite`.

**RTL considerations:**
- Spinner rotation is visually neutral — no RTL adjustment needed

**Accessibility:**
- `role="status"` on container
- `aria-label={label}` for screen reader announcement
- Visible spinner is `aria-hidden="true"` (the role+label container provides the announcement)

---

### 4.12 — LoadingSkeleton

**File:** `apps/web/src/components/ui/LoadingSkeleton.tsx`

**Purpose:** Placeholder shimmer for async content with known shape (cards, table rows).

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `width` | `string` | No | `'100%'` | Width of the skeleton block |
| `height` | `string` | No | `'1rem'` | Height of the skeleton block |
| `radius` | `string` | No | `'--radius-base'` | Border radius |
| `count` | `number` | No | `1` | Number of skeleton lines to render |
| `gap` | `string` | No | `'8px'` | Gap between skeleton lines |
| `className` | `string` | No | `''` | Additional CSS classes |

**Animation:** Horizontal shimmer moving from right to left in RTL direction.  
Colors: `--color-neutral-bg` animated through `--color-border`.

**RTL considerations:**
- Shimmer gradient direction must match RTL reading direction (right to left)

**Accessibility:**
- Container has `role="status"` and `aria-busy="true"` while loading
- `aria-label="جارٍ التحميل"` on container

---

### 4.13 — Toast + ToastProvider

**File:** `apps/web/src/components/ui/Toast.tsx` + `apps/web/src/components/ui/ToastProvider.tsx`

**Purpose:** Non-blocking feedback system. Replaces all `alert()` usage. Provided at app root via `ToastProvider`.

**ToastProvider:**

- Wraps the application (added to `apps/web/src/main.tsx`)
- Exposes a `useToast()` hook
- Manages the toast queue (max 3 visible at once)
- Positions toasts: bottom-LEFT of viewport in RTL

**useToast() hook API:**

```ts
const { showToast } = useToast();

showToast({
  type: 'success' | 'warning' | 'error' | 'info',
  title: string,         // Arabic
  message?: string,      // Arabic (optional detail)
  duration?: number,     // ms, 0 = persist until dismissed
});
```

**Toast component props (internal):**

| Prop | Type | Description |
|---|---|---|
| `id` | `string` | Unique ID for dismiss tracking |
| `type` | `'success' \| 'warning' \| 'error' \| 'info'` | Visual variant |
| `title` | `string` | Arabic title |
| `message` | `string` | Optional Arabic detail |
| `duration` | `number` | Auto-dismiss ms (0 = no auto-dismiss) |
| `onDismiss` | `() => void` | Called when toast closes |

**Auto-dismiss durations (from DESIGN_SYSTEM.md §13.I):**

| Type | Duration |
|---|---|
| `success` | 3000ms |
| `warning` | 4000ms |
| `info` | 4000ms |
| `error` | 0 (persistent — must be manually dismissed) |

**RTL considerations:**
- Toast container: `bottom: 24px; left: 24px` (bottom-left = RTL reading-start edge)
- Toast text: right-aligned (inherits RTL)
- Dismiss X button: on the left side of the toast card (reading end in RTL)

**Accessibility:**
- Toast container: `role="region"` + `aria-live="polite"` (or `"assertive"` for errors)
- `aria-label="الإشعارات"` on container
- Dismiss button: `aria-label="إغلاق الإشعار"`

**Reuse rules:**
- All API success/failure feedback uses `useToast()`
- `alert()` is permanently prohibited — every existing `alert()` must be replaced in Phase 03.5
- Error toast persists so the user can read the error — do not auto-dismiss errors

---

### 4.14 — ConfirmDialog

**File:** `apps/web/src/components/ui/ConfirmDialog.tsx`

**Purpose:** Replaces all native `confirm()` usage. Uses the shared `Modal` component internally.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `isOpen` | `boolean` | Yes | — | Controls visibility |
| `onConfirm` | `() => void` | Yes | — | Called when user confirms |
| `onCancel` | `() => void` | Yes | — | Called when user cancels or closes |
| `title` | `string` | Yes | — | Arabic dialog title |
| `description` | `string` | Yes | — | Arabic explanation of consequence |
| `confirmLabel` | `string` | No | `'تأكيد'` | Arabic confirm button label |
| `cancelLabel` | `string` | No | `'إلغاء'` | Arabic cancel button label |
| `variant` | `'default' \| 'danger'` | No | `'danger'` | `danger` shows red confirm button |
| `loading` | `boolean` | No | `false` | Loading state on confirm button |

**Important states:**
- Default: standard primary CTA confirm button
- Danger: red danger confirm button + optional `AlertTriangle` Lucide icon in title area
- Loading: confirm button shows spinner (consumer passes `loading={true}` while async operation runs)

**RTL considerations:**
- Title and description: right-aligned
- Footer buttons: Cancel on right, Confirm to its left (RTL layout — primary action at reading start)
  - **Wait:** In RTL, the primary action is at the reading START which is the RIGHT side.
  - Footer: [Confirm (danger)] [Cancel] — Confirm is on the RIGHT in RTL layout

**Accessibility:**
- Built on `Modal` — inherits all modal accessibility behavior
- `aria-describedby` on the modal pointing to the description element

**Reuse rules:**
- Every destructive action (delete, deactivate, irreversible update) uses `ConfirmDialog`
- `confirm()` is permanently prohibited — every existing `confirm()` call must be replaced in Phase 03.5

---

### 4.15 — Alert

**File:** `apps/web/src/components/ui/Alert.tsx`

**Purpose:** Inline contextual banner for non-blocking messages within a page.  
Use when the message is persistent and relevant to the page content (not a transient notification).  
Use `Toast` for transient feedback.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `variant` | `'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | Yes | — | Semantic variant |
| `title` | `string` | No | `''` | Optional bold title |
| `children` | `ReactNode` | Yes | — | Alert content |
| `dismissible` | `boolean` | No | `false` | Show X dismiss button |
| `onDismiss` | `() => void` | No | — | Called when dismissed |
| `className` | `string` | No | `''` | Additional CSS classes |

**RTL considerations:**
- Icon appears on the RIGHT (reading start) in RTL
- Text is right-aligned
- Dismiss button (X) on the LEFT (reading end) in RTL

**Accessibility:**
- `role="alert"` for dynamic alerts
- `role="status"` for non-urgent informational alerts
- Dismiss button: `aria-label="إغلاق التنبيه"`

---

### 4.16 — Icon

**File:** `apps/web/src/components/ui/Icon.tsx`

**Purpose:** Thin wrapper over Lucide React icons that enforces size standards, color inheritance, and RTL directionality.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | `LucideIcon` | Yes | — | Lucide icon component |
| `size` | `number` | No | `16` | Icon pixel size |
| `className` | `string` | No | `''` | Additional CSS classes |
| `rtlFlip` | `boolean` | No | `false` | Applies `scaleX(-1)` for directional icons in RTL |
| `aria-label` | `string` | No | — | For standalone icons that convey meaning |
| `aria-hidden` | `boolean` | No | `true` | Hide from screen readers (default — most icons are decorative) |

**RTL considerations:**
- `rtlFlip={true}`: applies `transform: scaleX(-1)` for directional icons that must point the opposite direction in RTL (e.g., ChevronRight in back-navigation context)
- Geometric icons (Settings, Package, Users, etc.): no flip needed
- Navigation icons (ChevronLeft, ChevronRight, ArrowRight, etc.): use `rtlFlip={true}` where the icon would visually mean the wrong direction in RTL

**Accessibility:**
- Decorative icons: `aria-hidden="true"` (default)
- Standalone meaningful icons (no adjacent label): `aria-label` required, `aria-hidden="false"`

---

### 4.17 — Pagination

**File:** `apps/web/src/components/ui/Pagination.tsx`

**Purpose:** RTL-aware page navigation for tables and lists.

**Expected props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `currentPage` | `number` | Yes | — | 1-indexed current page |
| `totalPages` | `number` | Yes | — | Total number of pages |
| `onPageChange` | `(page: number) => void` | Yes | — | Called with new page number |
| `className` | `string` | No | `''` | Additional CSS classes |

**RTL considerations:**
- In RTL: "next page" direction visually appears on the LEFT (Lucide ChevronLeft)
- In RTL: "previous page" direction visually appears on the RIGHT (Lucide ChevronRight)
- Page numbers are in Western Arabic digits (0–9)
- Active page: navy-800 background, white text

**Accessibility:**
- `nav` element with `aria-label="التنقل بين الصفحات"`
- Current page button: `aria-current="page"`
- Previous/Next buttons: `aria-label="الصفحة السابقة"` / `"الصفحة التالية"`
- Disabled previous on page 1: `disabled` attribute
- Disabled next on last page: `disabled` attribute

---

## 5. REUSE RULES

These rules are mandatory for all new development (UI-002):

1. **Before creating any UI element**, check `components/ui/` for an existing component
2. **If an existing component covers the case**: use it with the appropriate props
3. **If an existing component partially covers the case**: extend it via props — do not fork it
4. **If no existing component covers the case**: create a new shared component in `components/ui/` first, document it here, then use it in the module
5. **Never**: create a one-off styled button, badge, or table in a module file

---

## 6. EXTENSION RULES

When extending an existing component:

1. **Propose the extension** — state what new prop/variant/state is needed and why
2. **Maintain backward compatibility** — new props must be optional with sensible defaults
3. **Do not break existing usage** — all existing call sites must continue to work
4. **Document the change** — update this file with the new prop/variant
5. **Do not add business logic** to shared components — shared components are purely presentational

---

*Last updated: 2026-09-10 — Phase 03.5 Stage 1 establishment*  
*Authority: Owner-approved (OD-001 through OD-005)*  
*Reference: `docs/design/DESIGN_SYSTEM.md`*
