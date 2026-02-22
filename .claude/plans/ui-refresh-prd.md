# InZone UI/UX Refresh — Product Requirements Document

**Version:** 1.1
**Date:** 2026-02-22
**Author:** Design System Team
**Status:** Review Complete — Ready for Implementation Planning

> **v1.1 Changelog:** Incorporates findings from Architecture, Testing, UX/Design, and PM/Completeness reviews. Fixes 7 critical issues, 31 major findings. Answers all open questions. Revised phase plan.

---

## 1. Executive Summary

A comprehensive visual and UX refresh of the InZone kanban/todo board application. The goal is to transform InZone from a functional but visually plain app into a modern, distinctive product that feels fresh and premium — without changing any existing functionality.

**Key deliverables:**
- Complete design system overhaul (color, typography, spacing, shadows)
- Light + Dark mode with system auto-detection and animated toggle
- Refreshed UI across all pages (auth, boards, admin, settings)
- New shared components (command palette, breadcrumbs, improved empty states)
- Board UX improvements (collapsible columns, card density toggle, filter toolbar)
- Bento grid layouts for settings and admin pages
- Subtle, purposeful animations throughout

**Brand direction:** Calm & Focused — muted tones, generous whitespace, soft shadows, designed for deep work.

---

## 2. Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Brand personality | Calm & Focused | Productivity app — reduce noise, support deep work |
| Primary color | Teal/Cyan (~#0d9488) | Fresh, modern, differentiated from generic indigo SaaS |
| Display font | Satoshi | Modern geometric sans with personality, trending 2025-2026 |
| Body font | General Sans | Clean, more character than Inter, good for interfaces |
| Border radius | Rounded (12-16px) | Soft, friendly, modern. Consistent with current direction |
| Depth style | Subtle shadows + borders | Layered depth without heaviness, works in both themes |
| Motion philosophy | Subtle & Purposeful | Supports calm brand — smooth but never flashy |
| Default theme | System auto-detect | Respects user OS preference, toggle to override |
| Auth layout | Full-bleed minimal | No card container, form floats on clean background |
| Theme toggle | Animated sun/moon | Delightful micro-interaction, signature UI element |
| Design trend | Bento grid layouts | Settings/admin pages benefit from varied block sizes |

---

## 3. Design System

### 3.1 Color Palette

#### Primary: Teal

Generated from seed `#0d9488` (HSL ~174, 84%, 32%) using systematic HSL shade generation.

| Token | Hex | HSL (approx) | Use Case |
|-------|-----|--------------|----------|
| `primary-50` | `#f0fdfa` | 174, 80%, 97% | Subtle backgrounds, hover tints |
| `primary-100` | `#ccfbf1` | 174, 70%, 94% | Active backgrounds, selected states |
| `primary-200` | `#99f6e4` | 174, 65%, 87% | Borders, dividers in light mode |
| `primary-300` | `#5eead4` | 174, 55%, 75% | Disabled states, decorative |
| `primary-400` | `#2dd4bf` | 174, 50%, 62% | Dark mode primary, placeholder text |
| `primary-500` | `#14b8a6` | 174, 84%, 48% | Brand color reference |
| `primary-600` | `#0d9488` | 174, 84%, 32% | **Primary actions (light mode)** |
| `primary-700` | `#0f766e` | 174, 75%, 26% | Hover on primary |
| `primary-800` | `#115e59` | 174, 65%, 22% | Active/pressed states |
| `primary-900` | `#134e4a` | 174, 60%, 18% | Text on light backgrounds |
| `primary-950` | `#042f2e` | 174, 85%, 10% | Darkest accents |

#### Neutral: Cool Stone (with subtle teal tint)

Grays with a very slight cool/teal tint to feel cohesive with the primary palette. Not pure gray — not warm stone.

| Token | Hex | Use Case |
|-------|-----|----------|
| `neutral-50` | `#f8fafa` | Page background (light) |
| `neutral-100` | `#f1f4f4` | Card background, subtle bg |
| `neutral-200` | `#e2e7e7` | Borders, dividers |
| `neutral-300` | `#c8d1d0` | Strong borders, disabled |
| `neutral-400` | `#94a3a2` | Placeholder text |
| `neutral-500` | `#576861` | Muted text (darkened from #64766e to pass WCAG AA 4.5:1 on white) |
| `neutral-600` | `#4b5c57` | Secondary text |
| `neutral-700` | `#374544` | Primary text (light mode) |
| `neutral-800` | `#1f2e2d` | Heading text |
| `neutral-900` | `#172524` | Strongest text |
| `neutral-950` | `#0d1716` | Page background (dark) |

#### Semantic Colors

| Token | Light Mode | Dark Mode | Use |
|-------|-----------|-----------|-----|
| `success` | `#16a34a` (green-600) | `#4ade80` (green-400) | Positive states |
| `warning` | `#d97706` (amber-600) | `#fbbf24` (amber-400) | Caution states |
| `danger` | `#dc2626` (red-600) | `#f87171` (red-400) | Destructive, errors |
| `info` | `#0d9488` (primary-600) | `#2dd4bf` (primary-400) | Informational |

#### Priority Colors (unchanged functionally)

| Priority | Color | Use |
|----------|-------|-----|
| Low | `#10b981` | Emerald left-bar on cards |
| Medium | `#f59e0b` | Amber left-bar on cards |
| High | `#f97316` | Orange left-bar on cards |
| Urgent | `#ef4444` | Red left-bar on cards |

### 3.2 Semantic Token Mapping

#### Light Mode

```css
:root {
  --background: var(--neutral-50);           /* #f8fafa */
  --foreground: var(--neutral-900);          /* #172524 */
  --card: #ffffff;
  --card-foreground: var(--neutral-800);     /* #1f2e2d */
  --primary: var(--primary-600);             /* #0d9488 */
  --primary-foreground: #ffffff;
  --secondary: var(--neutral-100);           /* #f1f4f4 */
  --secondary-foreground: var(--neutral-700);/* #374544 */
  --muted: var(--neutral-100);               /* #f1f4f4 */
  --muted-foreground: var(--neutral-500);    /* #64766e */
  --border: var(--neutral-200);              /* #e2e7e7 */
  --ring: var(--primary-400);                /* #2dd4bf */
  --input: var(--neutral-200);               /* #e2e7e7 */
  --accent: var(--primary-50);               /* #f0fdfa */
  --accent-foreground: var(--primary-900);   /* #134e4a */
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
}
```

#### Dark Mode

```css
.dark {
  --background: var(--neutral-950);          /* #0d1716 */
  --foreground: var(--neutral-50);           /* #f8fafa */
  --card: var(--neutral-900);                /* #172524 */
  --card-foreground: var(--neutral-50);      /* #f8fafa */
  --primary: var(--primary-400);             /* #2dd4bf */
  --primary-foreground: var(--primary-950);  /* #042f2e */
  --secondary: var(--neutral-800);           /* #1f2e2d */
  --secondary-foreground: var(--neutral-200);/* #e2e7e7 */
  --muted: var(--neutral-800);               /* #1f2e2d */
  --muted-foreground: var(--neutral-400);    /* #94a3a2 */
  --border: var(--neutral-700);              /* #374544 — darkened from neutral-800 for visibility on card/bg */
  --ring: var(--primary-500);                /* #14b8a6 */
  --input: var(--neutral-800);               /* #1f2e2d */
  --accent: var(--neutral-800);              /* #1f2e2d */
  --accent-foreground: var(--primary-300);   /* #5eead4 */
  --destructive: #f87171;
  --destructive-foreground: #0d1716;
}
```

### 3.3 Typography

#### Font Stack

| Role | Font | Fallback | Weight Range |
|------|------|----------|--------------|
| Display (headings) | Satoshi | system-ui, sans-serif | 500-800 |
| Body (UI text) | General Sans | system-ui, sans-serif | 400-600 |
| Monospace (code/data) | JetBrains Mono | Menlo, Monaco, monospace | 400-500 |

Both Satoshi and General Sans are available via [Fontshare](https://www.fontshare.com/) (free for commercial use).

#### Type Scale (Minor Third ratio: 1.200, base 16px)

| Token | Size | Line Height | Letter Spacing | Weight | Use |
|-------|------|-------------|----------------|--------|-----|
| `text-xs` | 11.1px (0.694rem) | 1.6 | +0.01em | 400-500 | Captions, timestamps |
| `text-sm` | 13.3px (0.833rem) | 1.5 | +0.005em | 400-500 | Labels, metadata, helper text |
| `text-base` | 16px (1rem) | 1.5 | 0 | 400 | Body text, form inputs |
| `text-lg` | 19.2px (1.2rem) | 1.4 | -0.005em | 500 | Subheadings, card titles |
| `text-xl` | 23px (1.44rem) | 1.3 | -0.01em | 600 | Section headings |
| `text-2xl` | 27.6px (1.728rem) | 1.25 | -0.015em | 600-700 | Page titles |
| `text-3xl` | 33.2px (2.074rem) | 1.2 | -0.02em | 700 | Hero/feature headings |
| `text-4xl` | 39.8px (2.488rem) | 1.1 | -0.025em | 700-800 | Display headings |
| `text-5xl` | 47.8px (2.986rem) | 1.05 | -0.03em | 800 | Large display text |

#### Font Weight Mapping

| Role | Weight | Tailwind | Font |
|------|--------|----------|------|
| Body text | 400 | `font-normal` | General Sans |
| UI labels | 500 | `font-medium` | General Sans |
| Subheading | 600 | `font-semibold` | Satoshi |
| Heading | 700 | `font-bold` | Satoshi |
| Display | 800 | `font-extrabold` | Satoshi |

### 3.4 Spacing System

Use Tailwind's base-4 scale (unchanged). Key application contexts:

| Context | Spacing | Tailwind |
|---------|---------|----------|
| Icon-label gap | 4-8px | `gap-1` to `gap-2` |
| Button padding | 8px x 16px | `py-2 px-4` |
| Input padding | 10px x 14px | `py-2.5 px-3.5` |
| Card padding | 20-24px | `p-5` to `p-6` |
| Section gap | 24-32px | `gap-6` to `gap-8` |
| Page section margin | 48-64px | `py-12` to `py-16` |

### 3.5 Border Radius System

| Token | Value | Use |
|-------|-------|-----|
| `radius-sm` | 6px | Small badges, chips, tooltips |
| `radius-md` | 10px | Buttons, inputs, small cards |
| `radius-lg` | 14px | Cards, panels, modals |
| `radius-xl` | 20px | Large containers, bottom sheets |
| `radius-full` | 9999px | Avatars, pill buttons, toggles |

### 3.6 Shadow System

Dual-shadow technique: tight crisp shadow + larger ambient shadow.

| Token | Value (Light) | Value (Dark) | Use |
|-------|--------------|-------------|-----|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | `0 1px 2px rgba(0,0,0,0.2)` | Buttons, subtle raise |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | `0 1px 3px rgba(0,0,0,0.3)` | Inputs on focus, small cards |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)` | `0 4px 6px rgba(0,0,0,0.4)` | Cards, raised panels |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)` | `0 10px 15px rgba(0,0,0,0.5)` | Dropdowns, popovers |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.04)` | `0 20px 25px rgba(0,0,0,0.6)` | Modals, dialogs |

### 3.7 Token Migration Mapping (Old → New)

Phase 1 creates **aliases** from old token names to new values. This means the entire app shifts appearance in one step without touching component files. Phases 2-3 then update component files to use new token names directly, removing aliases afterward.

#### CSS Variable Mapping

| Old Token (current `index.css`) | New Token | New Value (Light) |
|---------------------------------|-----------|-------------------|
| `--surface-0` | `--background` | neutral-50 (`#f8fafa`) |
| `--surface-1` | `--card` | `#ffffff` |
| `--surface-2` | `--secondary` / `--muted` | neutral-100 (`#f1f4f4`) |
| `--surface-3` | `--border` | neutral-200 (`#e2e7e7`) |
| `--text-primary` | `--foreground` | neutral-900 (`#172524`) |
| `--text-secondary` | `--muted-foreground` | neutral-500 (`#576861`) |
| `--text-tertiary` | `--muted-foreground` (lighter usage) | neutral-400 (`#94a3a2`) |
| `--accent` | `--primary` | primary-600 (`#0d9488`) |
| `--accent-hover` | `--primary` at hover | primary-700 (`#0f766e`) |
| `--accent-light` | `--accent` | primary-50 (`#f0fdfa`) |
| `--accent-muted` | `--ring` | primary-400 (`#2dd4bf`) |
| `--success` | `--success` | `#16a34a` (unchanged) |
| `--warning` | `--warning` | `#d97706` (unchanged) |
| `--danger` | `--destructive` | `#dc2626` (unchanged) |

> **CRITICAL — `accent` Collision:** Current `bg-accent` = indigo primary buttons (`#6366f1`). The new `--accent` = `primary-50` (very light teal). All current `bg-accent` button usages MUST map to `bg-primary`. The shadcn `accent` token means "subtle highlight for hover states in menus" — a fundamentally different semantic.

#### Hardcoded Tailwind Class Migration

Replace ALL hardcoded stone/gray classes with semantic tokens during Phase 2a. This is the only way dark mode works correctly.

| Old Class | New Class | Notes |
|-----------|-----------|-------|
| `bg-stone-50`, `bg-stone-100` | `bg-secondary` or `bg-muted` | Light backgrounds |
| `bg-stone-200` | `bg-muted` | Subtle backgrounds |
| `border-stone-200`, `border-stone-300` | `border-border` | All borders |
| `text-stone-500`, `text-stone-600` | `text-muted-foreground` | Secondary text |
| `text-stone-700` | `text-secondary-foreground` | Body text |
| `text-stone-900` | `text-foreground` | Primary text |
| `bg-gray-*` | Same as stone mapping | Codebase mixes stone and gray inconsistently |
| `text-gray-*` | Same as stone mapping | |
| `bg-white` | `bg-card` or `bg-background` | Context-dependent |
| `text-indigo-*`, `bg-indigo-*` | `text-primary` / `bg-primary` | Former accent color |

#### shadcn Button Variant Mapping

| Current Variant | shadcn Equivalent | Notes |
|-----------------|-------------------|-------|
| `variant="primary"` | `variant="default"` | shadcn default re-themed to teal |
| `variant="default"` | `variant="secondary"` | Current neutral bg → secondary |
| `variant="ghost"` | `variant="ghost"` | Direct mapping |
| `variant="danger"` | `variant="destructive"` | Direct mapping |
| Size `"md"` | Size `"default"` | shadcn uses `default` instead of `md` |

#### Text Color Usage Table

| Purpose | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Headings | neutral-900 | neutral-50 |
| Body text | neutral-700 | neutral-200 |
| Secondary text | neutral-600 | neutral-300 |
| Muted/captions | neutral-500 | neutral-400 |
| Placeholder | neutral-400 | neutral-500 |
| Links | primary-600 | primary-400 |

---

## 4. Dark Mode Implementation

### 4.1 Architecture

- **Strategy:** CSS class-based (`.dark` on `<html>`)
- **Default:** System auto-detect via `prefers-color-scheme`
- **Override:** User can manually set Light / Dark / System
- **Persistence:** `localStorage` key `inzone-theme` with values `light | dark | system`
- **System listener:** `matchMedia('(prefers-color-scheme: dark)')` change event updates UI when set to `system`

### 4.2 ThemeProvider

Create a React context `ThemeProvider` wrapping the app:

```
ThemeProvider
├── Reads localStorage on mount
├── Falls back to system preference
├── Adds/removes .dark class on <html>
├── Listens for system preference changes
├── Exposes: theme, setTheme, resolvedTheme
└── Prevents FOUC with <script> in index.html
```

### 4.3 Flash of Unstyled Content (FOUC) Prevention

Inject a blocking `<script>` in `index.html` `<head>` before any CSS loads:

```js
// Runs synchronously before render
const theme = localStorage.getItem('inzone-theme') || 'system';
const isDark = theme === 'dark' ||
  (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
if (isDark) document.documentElement.classList.add('dark');
```

### 4.4 Animated Theme Toggle

A signature micro-interaction: animated sun/moon toggle in the header.

**Behavior:**
- Sun icon (light mode) morphs into moon icon (dark mode)
- Sliding track background transitions between light warm and dark cool
- Toggle has 3 states accessible via long-press or context menu: Light, Dark, System
- Quick tap cycles: current → opposite. Long-press shows all 3 options.
- Spring physics animation (stiffness: 500, damping: 30)
- Respects `prefers-reduced-motion` — instant switch, no animation

**Visual:**
```
Light:  [  ☀️ -------]  warm track background
Dark:   [------- 🌙  ]  cool track background
System: auto-detected, toggle shows current resolved state with a small "A" indicator
```

### 4.5 Dark Mode Design Rules

1. **Surfaces:** Don't just invert. Use elevation via lightness shifts (950 → 900 → 800)
2. **Text:** Primary text at neutral-50, secondary at neutral-300, muted at neutral-400
3. **Primary color:** Use primary-400 (lighter teal) for better contrast on dark backgrounds
4. **Borders:** Use neutral-700 (not 800) for borders — neutral-800 on neutral-900 card is ~1.4:1 contrast (invisible). Neutral-700 provides visible separation.
5. **Shadows:** Stronger opacity in dark mode since shadows are less visible
6. **Images/avatars:** Add subtle border (1px neutral-700) to prevent blending into dark bg
7. **Code blocks:** Lighten dark-mode code block background to neutral-800 (`#1f2e2d`) or add 1px border. Current `#1f2937` on card bg `#172524` has almost no contrast distinction.
8. **Semantic colors:** Use lighter variants (400 instead of 600) for text/icons in dark mode
9. **Priority bars:** Use 400-level color variants in dark mode to prevent "glow" effect of saturated colors on dark backgrounds (e.g., `#34d399` instead of `#10b981` for Low priority)
10. **Tiptap highlights:** Yellow mark bg (`#fef08a`) needs a dark variant — use `#854d0e` (amber-800) with `#fef08a` text

---

## 5. Component Architecture

### 5.1 Migration Strategy

**Current:** Custom Tailwind components (Button, Input, Badge, Modal, Toast, etc.)
**Target:** shadcn/ui components with custom theme, keeping custom domain components.

**Why shadcn/ui:**
- Accessible by default (Radix UI primitives)
- Works with CSS variable theming (dark mode built-in)
- Copy-paste ownership (no dependency lock-in)
- Consistent API across components
- Already compatible with Tailwind v4

**Migration plan:**
1. Install shadcn/ui foundation (button, input, label, card)
2. Migrate custom components one-by-one — install shadcn, then immediately update the barrel export in `src/components/ui/index.ts`
3. Keep domain-specific components (TodoCard, BoardColumn, etc.) as custom
4. Style all shadcn components via semantic tokens
5. Update all callsites per the variant mapping table in Section 3.7

**Barrel export strategy:** During incremental migration, update `src/components/ui/index.ts` to re-export from the new shadcn file immediately after installing each component. One component at a time — never have both old and new coexisting.

**Toast migration (sonner):**
- Replace `ToastContext` entirely with sonner
- Create a thin `useToast` compatibility wrapper that calls `toast()` from sonner with the same API signature — minimizes migration across callsites
- `UndoToast` becomes a custom sonner toast with action button (sonner supports this natively)
- Toast position: bottom-right (desktop), bottom-center (mobile)
- Auto-dismiss: 5s for info/success, persistent for errors until dismissed
- Update `src/test/utils.tsx` to replace `ToastProvider` with sonner's `Toaster` component (affects all tests)

**Confirm dialog:**
- Add a `ConfirmDialog` component using shadcn Dialog
- Props: `title`, `message`, `confirmLabel`, `variant` (default | destructive)
- Replace all `window.confirm()` calls (UsersPage user removal, board deletion)
- Board deletion should use this + add undo toast pattern matching existing `UndoToast` for tasks

### 5.2 New Shared Components

**Folder structure:** App-shell feature components (CommandPalette, Breadcrumbs) go in `src/components/app/` — NOT in `src/components/ui/` (they import hooks/context, which would violate layer rules). ThemeToggle also goes in `src/components/app/` since it imports `useTheme`.

#### Command Palette (Cmd+K)

Global command palette for quick navigation and actions (client-side only for v1):
- Search across boards, tasks, settings
- Quick actions: create board, create task, toggle theme
- Keyboard-first: arrow keys, enter to select, esc to close
- Fuzzy search matching
- Recent items section
- Uses shadcn `Command` component (wraps cmdk)

#### Breadcrumbs

Persistent breadcrumb bar below header for navigation context:
```
Home > Board Name > (current view)
```
- Truncates long board names on mobile
- Clickable path segments
- Shows on board view and admin pages only

#### Improved Empty States

Every empty state gets a custom illustration/icon + clear CTA:

| Context | Empty State |
|---------|------------|
| No boards | Illustration + "Create your first board" button |
| Empty column | Subtle dashed border + "Add a task" text |
| No invites | Icon + "No pending invites" message |
| No requests | Icon + "No access requests" message |
| No users matching filter | "No results" with clear filter button |

#### Skeleton Loading States

Replace spinner-only loading with skeleton screens matching final layout:
- Board list: Grid of skeleton cards
- Board view: Skeleton columns with skeleton cards
- Admin tables: Skeleton rows
- Settings: Skeleton section blocks

### 5.3 Board UX Improvements

#### Collapsible Columns (with animation — merged from P2)

- Click column header to collapse/expand
- Collapsed state shows: column name (rotated 90deg), card count badge
- Collapsed width: 44px
- Smooth CSS transition for width change (prefer CSS over Motion `layout` to avoid jank with many cards)
- Content fades out during collapse, fades in during expand
- Collapse state persisted in localStorage: key `inzone-board-{boardId}-collapsed-columns` (array of column IDs)
- Shipping collapse without animation is worse than not shipping it — they are one feature

#### Card Density Toggle

Two modes accessible via toolbar icon:

| Mode | Card Height | Shows |
|------|-------------|-------|
| Comfortable (default) | Full | Title, description preview, labels, due date, priority bar |
| Compact | Reduced | Title, priority bar, due date only |

- Smooth height transition between modes (CSS transition preferred over Motion `layout` for performance with many cards)
- Preference persisted in localStorage: key `inzone-card-density` (value: `comfortable` | `compact`)

#### Board Header Toolbar

Persistent toolbar above the kanban columns:

```
[Board Name (editable)]                    [🔍 Search] [Filter ▼] [Density ⊞] [⋯ More]
```

**Filter chips (when active):**
```
Priority: High ✕ | Label: Bug ✕ | Due: This week ✕ | [Clear all]
```

**Filter dropdown options:**
- Priority (multi-select: Low, Medium, High, Urgent)
- Labels (multi-select from board labels)
- Due date (This week, Overdue, No date, Custom range)
- Assignee (future-proofing, disabled for now)

**Search:**
- Inline search input that expands on click
- Filters cards in real-time as you type
- Searches title and description
- Keyboard shortcut: `/` to focus

---

## 6. Page-by-Page Specifications

### 6.1 Auth Pages (Login, Signup, Reset Password, Request Access)

**Layout:** Full-bleed minimal
- No card container
- Form floats on clean background (light: neutral-50, dark: neutral-950)
- InZone logo/wordmark centered above form
- Subtle background: very light radial gradient from primary-50 center fade, or in dark mode a dark gradient

**Large screen note:** At ultrawide resolutions (2560px+), constrain the background gradient to a centered column (max-width: 800px) to avoid a 380px form floating in empty space. Consider a split layout at `xl` breakpoints with subtle brand illustration on one side.

**Common elements:**
- Max width: 380px for form
- Input height: 44px (touch-friendly)
- Primary button: full-width, teal primary
- Google OAuth button: outlined, neutral border, Google icon
- Links: primary-600 text, underline on hover
- Error messages: inline below field with danger color + icon
- Page transition: fade-in-up (opacity 0, y 12 → opacity 1, y 0)

**Login Page:**
- Logo + "Welcome back" heading (Satoshi, text-2xl, font-bold)
- Subtext in muted-foreground
- Email/username input → Password input → "Forgot password?" right-aligned link
- Sign in button
- Divider: "or continue with"
- Google button
- Bottom: "Don't have an account? Request access" link

**Signup Page:**
- Logo + "Create your account" heading
- Invite token validation state
- Multi-field form with clear section grouping
- Password strength indicator: horizontal bar that fills with color gradient (red → amber → green)
- Security questions in a visually distinct section (subtle background shift)

**Reset Password Page:**
- 3-step wizard with top progress bar
- Step indicators: numbered circles connected by line, active step uses primary fill
- Animated slide transitions between steps (Motion AnimatePresence)
- Smooth, directional (left/right based on step direction)

**Request Access Page:**
- Simple form with name, email, reason
- Success state: large checkmark icon with subtle scale-in animation + confirmation message

### 6.2 Main App Layout (Header + Content)

**Header redesign:**
- Height: 56px (mobile), 60px (desktop)
- Background: card color with bottom border
- In dark mode: neutral-900 with neutral-800 border
- Left: InZone wordmark in Satoshi Bold, teal primary color
- Center: Breadcrumbs (desktop only, hidden on mobile)
- Right: Theme toggle + User menu
- Subtle backdrop blur if content scrolls under (optional enhancement)

**User Menu redesign:**
- Avatar with status ring (online = green, admin = purple ring)
- Dropdown uses shadcn DropdownMenu for accessibility
- Sections: User info → Navigation → Admin links → Sign out
- Each item has an icon (Lucide)
- Smooth open/close animation (scale + opacity)

### 6.3 Board List Page

**Layout:** Responsive grid with bento-style variation

**Featured board logic:** The last-opened board (tracked via localStorage `inzone-last-board-id`) gets the large featured card. If no board has been opened, use the most recently created board. If only 1-2 boards exist, fall back to uniform grid.

```
Desktop (lg+, 3+ boards):
┌──────────────┬──────────┬──────────┐
│  Last-opened │  Board   │  Board   │
│  Board       │  Card 2  │  Card 3  │
│  (featured)  │          │          │
├──────────────┼──────────┴──────────┤
│  Board 4     │    + Create Board   │
│              │    (dashed border)  │
└──────────────┴─────────────────────┘

Desktop (lg+, 1-2 boards): Uniform grid, no featured card
Mobile: Single column, full-width cards
```

**Board cards:**
- Card background with subtle shadow-sm
- Board name in text-lg Satoshi semibold
- Last modified timestamp in text-xs muted
- Card count badge
- Hover: slight shadow-md elevation + border color shift
- Delete action: icon button, hover reveals
- Staggered entrance animation (30ms delay per card)

**Create board card:**
- Dashed border (neutral-300 in light, neutral-700 in dark)
- Plus icon + "Create board" text centered
- Hover: border becomes primary, background shifts to primary-50/dark equivalent

### 6.4 Board View Page

**Layout:**
```
┌─────────────────────────────────────────┐
│ [Board Header Toolbar]                   │
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │Col 1│ │Col 2│ │Col 3│ │+ Add│       │
│ │     │ │     │ │     │ │     │       │
│ │Card │ │Card │ │Card │ │     │       │
│ │Card │ │Card │ │     │ │     │       │
│ │Card │ │     │ │     │ │     │       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────┘
```

**Column styling:**
- Background: neutral-100 (light) / neutral-900 (dark)
- Header: column name + card count + collapse toggle + add button
- Rounded-lg corners
- Subtle border
- Collapse animation: width 280px → 44px with content fade

**Card styling:**
- White (light) / neutral-800 (dark) background
- Border + shadow-xs
- Priority left-bar (3px, colored)
- Hover: shadow-sm elevation, subtle border color shift
- Drag state: shadow-lg, slight scale(1.02), reduced opacity
- Drag placeholder: dashed border area

**Detail panel (side panel for editing):**
- Slides in from right (Motion: x 100% → 0)
- Width: 420px desktop, full-screen mobile (bottom sheet)
- Overlay backdrop on mobile
- Clean section layout with clear hierarchy

### 6.5 Settings Page

**Layout:** Single-column with selective two-column sections (NOT full bento grid — settings is a linear read-edit-save task where bento creates awkward height mismatches)

```
Desktop:
┌────────────────────────────────────────┐
│  Profile                                │
│  ┌──────────────────┬────────────────┐ │
│  │  Name, username   │  Avatar &      │ │
│  │  fields           │  Photo         │ │
│  └──────────────────┴────────────────┘ │
├────────────────────────────────────────┤
│  Security (password, 2FA)               │
├────────────────────────────────────────┤
│  Security Questions                     │
│  (3 question/answer pairs)              │
└────────────────────────────────────────┘

Mobile: Single column stack
```

**Section cards:**
- Each section in a card with subtle shadow
- Section heading: text-lg Satoshi semibold
- Section description: text-sm muted-foreground
- Staggered entrance animation (50ms per section)
- Form inputs with clear labels above
- Save buttons right-aligned within each section

### 6.6 Admin Pages (Invites, Requests, Users)

**Common admin layout:**
- Page heading with description
- Action button top-right (e.g., "Create Invite")
- Bento-style stats bar at top (total count, pending count, etc.)

**Data display:**
- Desktop: Table with sortable columns, hover row highlight
- Mobile: Card list (each row becomes a card)
- Empty state: Custom illustration + message + CTA
- Loading: Skeleton rows/cards

**Invites Page specifics:**
- Create invite form in a dialog (shadcn Dialog)
- Invite cards/rows show: email, role badge, expiry, status
- Actions: Copy link, Revoke

**Users Page specifics:**
- Search/filter bar at top
- User rows: avatar, name, email, role badge, status badge, join date
- Role badges: color-coded (admin = primary, member = neutral)
- Status: active = success, banned = danger
- Actions dropdown per user: promote, demote, ban/unban, remove

### 6.7 Detail Panel (Side Panel)

The detail panel is ~250 lines with forms, rich text, label chips, and column dropdown. It needs its own spec.

**Layout:**
- Slides in from right (Motion: x 100% → 0)
- Width: 420px desktop, full-screen mobile (bottom sheet via BottomSheet component)
- Overlay backdrop on mobile
- Focus trap when open; focus returns to triggering card on close

**Sections (top to bottom):**
1. Header: Task title (editable inline), close button
2. Column selector: Dropdown to move between columns
3. Priority selector: Color-coded priority buttons
4. Labels: Chip list with add/remove
5. Description: Tiptap rich text editor
6. Due date picker
7. Actions bar: Delete button (with ConfirmDialog)

**Dark mode considerations:** All form controls use semantic tokens. Label chips use primary-100/primary-900 in light, primary-900/primary-200 in dark.

### 6.8 Tiptap Editor Theming

The Tiptap editor has 90+ lines of custom CSS in `index.css` that must be updated for the new design system and dark mode.

**Token migrations in Tiptap CSS:**

| Current | New (Light) | New (Dark) |
|---------|------------|-----------|
| `var(--text-tertiary)` | `var(--muted-foreground)` | auto via token |
| `var(--surface-3)` for blockquote border | `var(--border)` | auto via token |
| `var(--surface-2)` for inline code bg | `var(--muted)` | auto via token |
| `var(--text-secondary)` for blockquote text | `var(--muted-foreground)` | auto via token |
| `var(--accent)` for links and checkboxes | `var(--primary)` | auto via token |
| `#1f2937` hardcoded code block bg | `var(--code-block-bg)` | neutral-800 (`#1f2e2d`) in dark |
| `#e5e7eb` hardcoded code block text | `var(--code-block-fg)` | neutral-200 in dark |
| `#fef08a` hardcoded mark/highlight bg | `var(--highlight-bg)` | amber-800 (`#854d0e`) in dark |

**New CSS custom properties to add:**
```css
:root {
  --code-block-bg: #1f2937;
  --code-block-fg: #e5e7eb;
  --highlight-bg: #fef08a;
  --highlight-fg: inherit;
}
.dark {
  --code-block-bg: #1f2e2d; /* neutral-800, distinct from card bg */
  --code-block-fg: #e2e7e7; /* neutral-200 */
  --highlight-bg: #854d0e; /* amber-800 */
  --highlight-fg: #fef08a; /* amber-200 */
}
```

### 6.9 Error Handling Patterns

The new design system must define visual patterns for all error states:

| Error Type | Pattern | Visual |
|-----------|---------|--------|
| Inline field errors | Text below field, `text-destructive`, error icon (AlertCircle) | `aria-describedby` linked |
| Form-level errors | Banner above form, destructive bg + icon + message | Dismissible |
| API failures (toast) | Sonner error toast, persistent until dismissed | Red left accent bar |
| Network offline | Top-of-page banner, warning bg, "You're offline" + retry | Sticky, auto-dismisses on reconnect |
| 404 page | Centered empty state with icon + "Page not found" + back link | Matches empty state pattern |
| Error boundary | Full-page fallback: icon + "Something went wrong" + "Reload" button | Catches component render errors |

**Error boundary component:** Add `ErrorBoundary` wrapping `<AppContent>` in `App.tsx`. Shows a clean error page instead of white screen on unhandled errors.

---

## 7. Animation Specifications

### 7.1 Global Transition Presets

```ts
const transitions = {
  spring: { type: 'spring', stiffness: 300, damping: 24 },
  springSnappy: { type: 'spring', stiffness: 500, damping: 30 },
  smooth: { type: 'tween', duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  instant: { type: 'tween', duration: 0 }, // for reduced motion
};
```

### 7.2 Animation Catalog

| Trigger | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page route change | Fade + slide-y (8px) | 200ms | custom ease |
| Card entrance (staggered) | Fade + slide-y (8px) | 250ms, 30ms stagger | spring |
| Modal open | Fade + scale(0.95→1) + slide-y(20→0) | spring (d:25, s:300) | spring |
| Modal close | Reverse of open | 150ms | ease-out |
| Toast appear | Slide-x (80→0) + scale(0.95→1) | spring (d:20, s:300) | spring |
| Dropdown open | Fade + scale-y(0.95→1) | 150ms | ease-out |
| Column collapse | Width + content fade | 250ms | spring |
| Card density toggle | Height + content fade | 200ms | ease |
| Theme toggle | Sun/moon morph + track slide | spring (d:30, s:500) | spring |
| Hover on card | Shadow elevation + border shift | 150ms | ease |
| Button press | Scale(0.97) | 100ms | ease |
| Skeleton pulse | Opacity 0.4 ↔ 1 | 1.5s loop | ease-in-out |
| Filter chip add/remove | Scale + fade | 200ms | spring |

### 7.3 Reduced Motion

All animations respect `prefers-reduced-motion`:
- Motion library's `useReducedMotion` hook
- When reduced: instant transitions (duration 0), no transforms
- Theme toggle: instant switch, no morphing
- Page transitions: simple opacity fade only

---

## 8. Responsive Design

### 8.1 Breakpoints

| Prefix | Width | Use |
|--------|-------|-----|
| (default) | 0px | Mobile phones (single column) |
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops, small desktops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### 8.2 Mobile-Specific Patterns

- **Navigation:** Header stays. Hamburger menu replaces dropdown for admin links
- **Board view:** Horizontal scroll with snap points for columns. Column width: 85vw
- **Modals → Bottom sheets:** All modals slide up from bottom on mobile, rounded-t-xl
- **Tables → Cards:** Admin data tables convert to stacked cards on mobile
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Safe area:** Bottom padding for notched devices
- **Board toolbar:** Collapses to icon-only buttons, filter dropdown becomes full-screen sheet

### 8.3 Desktop-Specific Patterns

- **Board view:** Fixed-width columns (280px), horizontal scroll if overflow
- **Settings:** Bento grid (2 columns)
- **Admin pages:** Full table layout with sortable columns
- **Command palette:** Centered modal with max-width 640px
- **Detail panel:** Side panel (420px) with backdrop

---

## 9. Accessibility

### 9.1 WCAG 2.2 AA Compliance

All color combinations must pass:
- **Normal text:** >= 4.5:1 contrast ratio
- **Large text (18px+):** >= 3:1
- **UI components (borders, icons):** >= 3:1

### 9.2 Key Requirements

- All interactive elements keyboard-accessible (Tab, Enter, Escape, Arrow keys)
- Visible focus indicators: 2px ring in primary-400 with 2px offset
- ARIA labels on icon-only buttons
- `aria-expanded` on collapsible sections
- `aria-live="polite"` for toast notifications
- Skip navigation link (hidden, visible on focus)
- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<section>`
- Form labels associated via `htmlFor`/`id`
- Error messages linked via `aria-describedby`
- Color is never the sole indicator (always paired with icon/text)

### 9.3 Dark Mode Accessibility

- Re-verify all contrast ratios in dark mode
- Primary-400 on neutral-950 must pass 4.5:1
- Muted text (neutral-400) on neutral-900 must pass 4.5:1
- Focus ring visible against dark backgrounds

---

## 10. Technical Implementation

### 10.1 Dependencies to Add

| Package | Purpose | Runtime Size |
|---------|---------|-------------|
| `@tailwindcss/vite` | Tailwind v4 Vite plugin | Dev only |
| `tw-animate-css` | Animation utilities for shadcn | CSS only |
| shadcn/ui components | Button, Input, Card, Dialog, DropdownMenu, Command, etc. | Tree-shakable |
| `cmdk` | Command palette (via shadcn Command) | ~8KB gzipped |
| `sonner` | Toast notifications (via shadcn Toast) | ~6KB gzipped |
| Satoshi font (WOFF2) | Display typography — **self-hosted**, subset to Latin | ~40-50KB |
| General Sans font (WOFF2) | Body typography — **self-hosted**, subset to Latin | ~40-50KB |

**Font loading strategy:**
- Self-host via WOFF2 files in `public/fonts/` (NOT Fontshare CDN — less reliable than Google Fonts)
- Subset to Latin characters to reduce payload (~40-50KB per font instead of 100KB)
- `font-display: swap` for display font (Satoshi) — visual difference matters
- `font-display: optional` for body font (General Sans) — prevents layout shift, falls back to system-ui gracefully
- Preload critical weights: `<link rel="preload" href="/fonts/satoshi-700.woff2" as="font" type="font/woff2" crossorigin>`
- Remove current Google Fonts preconnect from `index.html`

### 10.2 Dependencies to Remove

| Package | Reason |
|---------|--------|
| `tailwindcss` (devDep) | Replaced by `@tailwindcss/vite` |
| `autoprefixer` (devDep) | Built into Tailwind v4 |
| `postcss` (devDep) | No longer needed (Vite plugin handles it) |

### 10.3 File Changes Overview

| Area | Files Affected | Type |
|------|---------------|------|
| Design tokens | `src/index.css` | Major rewrite |
| Tailwind config | `tailwind.config.js` (**note: `.js` not `.ts`**) | DELETE |
| PostCSS config | `postcss.config.js` | DELETE |
| Vite config | `vite.config.ts` | Add `@tailwindcss/vite` plugin |
| Theme provider | New: `src/contexts/ThemeContext.tsx` | New file |
| Theme toggle | New: `src/components/app/ThemeToggle.tsx` | New file (in `app/`, not `ui/`) |
| FOUC prevention | `index.html` | Add inline script, remove Google Fonts preconnect |
| App shell | `App.tsx` | Wrap with ThemeProvider (outermost, before QueryClientProvider), add breadcrumbs, add ErrorBoundary |
| All page components | `src/pages/*.tsx` | Restyle with new tokens |
| All UI components | `src/components/ui/*.tsx` | Migrate to shadcn or restyle |
| Board components | `src/components/board/*.tsx` | Add toolbar, collapse, density |
| Command palette | New: `src/components/app/CommandPalette.tsx` | New file |
| Breadcrumbs | New: `src/components/app/Breadcrumbs.tsx` | New file |
| Error boundary | New: `src/components/app/ErrorBoundary.tsx` | New file |
| Confirm dialog | New: `src/components/ui/confirm-dialog.tsx` | New file (shadcn convention) |
| Skeleton components | New/extend: `src/components/ui/Skeleton.tsx` | Extend |
| Empty states | Various page files | Add illustrations/messages |
| Test utility | `src/test/utils.tsx` | Add ThemeProvider, replace ToastProvider with sonner |

### 10.4 Tailwind v4 Migration

Current: Tailwind v3 with `@tailwind` directives and `tailwind.config.js` (note: `.js`, not `.ts`).
Target: Tailwind v4 with CSS-first config and `@theme inline`.

Key changes:
1. Replace `@tailwind base/components/utilities` with `@import "tailwindcss"`
2. Move color/spacing tokens into `@theme inline { }` block
3. Define dark mode variant: `@custom-variant dark (&:where(.dark, .dark *))`
4. **DELETE `tailwind.config.js`** — all config moves to CSS
5. **DELETE `postcss.config.js`** — Tailwind v4 Vite plugin replaces PostCSS pipeline
6. **Remove devDependencies:** `tailwindcss`, `autoprefixer`, `postcss` from `package.json`
7. **Add devDependency:** `@tailwindcss/vite`
8. Add `@tailwindcss/vite` plugin to `vite.config.ts`

**Custom animations to port from `tailwind.config.js` to CSS:**
The current config defines custom animations (`slide-in`, `slide-in-right`, `slide-up`, `fade-in`, `countdown`) with corresponding `@keyframes`. These are referenced as `animate-*` classes throughout the codebase. In TW v4, redefine them in the `@theme` block or as `@keyframes` in CSS. Audit all `animate-*` class usage before migration.

**Custom CSS to preserve in `index.css`:**
- Tiptap editor styles (~90 lines) — update token references per Section 6.8
- DnD transition styles for `[data-testid="todo-card"]` and `[data-testid="column"]`
- Keyframe animations: `card-enter`, `checkbox-pop`, `checkmark-draw`, `success-flash`, `error-shake`, `insertion-pulse`
- Priority bar styles
- Mobile snap scroll styles

**`tailwind-merge` compatibility note:**
Verify that `cn('bg-primary-600', 'bg-primary-400')` resolves correctly with new `@theme` tokens. `tailwind-merge` v2.6+ (currently installed) should handle CSS variable-based colors automatically, but test with the new custom theme tokens. Update `extendTailwindMerge` in `src/lib/utils.ts` if custom class names don't merge correctly.

**Token aliasing strategy (Phase 1):**
Create aliases from old CSS variable names to new values so the app shifts appearance in one step:
```css
/* Phase 1: Aliases for backward compatibility */
:root {
  /* New tokens */
  --background: #f8fafa;
  --primary: #0d9488;
  /* ... */

  /* Aliases (remove after Phase 2a migration) */
  --surface-0: var(--background);
  --surface-1: var(--card);
  --surface-2: var(--secondary);
  --surface-3: var(--border);
  --text-primary: var(--foreground);
  --text-secondary: var(--muted-foreground);
  --text-tertiary: var(--muted-foreground);
  --accent: var(--primary); /* CRITICAL: old accent = new primary */
  --accent-hover: var(--primary-700);
  --accent-light: var(--accent);
  --accent-muted: var(--ring);
}
```

### 10.5 Implementation Phases (Revised)

Each phase ships as a separate PR (or small set of PRs) for reviewability and rollback capability.

**Phase 1: Foundation (no visible changes yet)**
- Tailwind v4 migration (PostCSS removal, config porting, animation porting)
- Install fonts (self-hosted WOFF2, Latin subset)
- Create ThemeProvider (outermost in provider tree) + FOUC prevention script
- Install shadcn/ui foundation (`components.json`, Button, Input, Card)
- Token aliasing (old CSS variable names → new values)
- Architecture test updates (naming exception for `src/components/ui/`, ThemeToggle in `app/`)
- Verify `tailwind-merge` compatibility with new tokens
- **Gate:** All existing tests pass. No visual changes visible yet.

**Phase 2a: Design System — Light Mode**
- Apply new tokens to all pages (find-and-replace pass per Section 3.7)
- Replace all hardcoded stone/gray Tailwind classes with semantic tokens
- Update typography (font families, sizes, weights)
- Update spacing, border radius, shadows
- Tiptap editor theme update (per Section 6.8)
- `data-testid` preservation check (all existing test IDs must remain)
- **Gate:** All pages render correctly in light mode. Tests pass.

**Phase 2b: Design System — Dark Mode**
- Dark mode token values in CSS
- Dark mode testing for all pages
- Code block contrast fix (Section 4.5 rule #7)
- Priority color dark variants (Section 4.5 rule #9)
- Border visibility fix (neutral-700 borders)
- Tiptap highlight dark variant
- **Gate:** All pages render correctly in both modes. Tests pass.

**Phase 3: Component Migration**
- shadcn Button, Input, Card, Dialog, DropdownMenu migration (with variant mapping per Section 3.7)
- Toast → sonner migration (with `useToast` compatibility wrapper)
- ConfirmDialog component (replace all `window.confirm()` calls)
- Update barrel exports incrementally (one component at a time)
- Test updates for each migrated component
- Update `src/test/utils.tsx` (replace ToastProvider with sonner)
- **Gate:** All shadcn components working. Tests pass.

**Phase 4a: Board UX**
- Extract `BoardToolbar`, `BoardHeader` from BoardView (mandatory — 637/700 line limit)
- Extract `useBoardFilters`, `useColumnCollapse`, `useCardDensity` hooks
- Board header toolbar (search + filters)
- Collapsible columns with animation
- Card density toggle
- **Gate:** Board functionality fully working. BoardView.tsx under 700 lines.

**Phase 4b: App-wide UX**
- Theme toggle (animated sun/moon) in `src/components/app/ThemeToggle.tsx`
- Breadcrumbs in `src/components/app/Breadcrumbs.tsx`
- Skeleton loading states
- Improved empty states (use Lucide icons, not custom illustrations)
- Error boundary component
- **Gate:** All new UX features working.

**Phase 5: Polish + P2**
- Command palette (Cmd+K) — client-side only, searches loaded nav data
- Animation refinement
- Accessibility audit (contrast, keyboard nav, focus management, DnD announcements)
- Cross-browser/device testing
- Performance audit (CLS, LCP, bundle size)
- Remove token aliases from Phase 1 (cleanup)
- **Gate:** Full test suite green. Accessibility audit passed.

### 10.6 Rollback Plan

| Level | Strategy |
|-------|----------|
| Phase-level | Each phase is a separate PR. Revert the PR to roll back that phase. |
| Token aliasing | Phase 1 aliases mean old token names still work. If Phase 2 breaks, revert Phase 2 PR and the app looks like before (just with new colors via aliases). |
| Feature flags | Not needed for v1. Phases are structured so each is independently revertable. |
| Full rollback | If everything breaks: revert all PRs in reverse order. Token aliases ensure each revert step produces a working state. |
| Post-ship | Monitor for 48h after each phase merge. Keep phase branches for quick revert. |

---

## 11. Acceptance Criteria

### Must Have (P0)
- [ ] Complete color palette swap (indigo → teal) across all pages
- [ ] All hardcoded stone/gray Tailwind classes replaced with semantic tokens
- [ ] Satoshi + General Sans typography applied (self-hosted WOFF2)
- [ ] Dark mode working with system auto-detection
- [ ] Theme toggle in header with animation
- [ ] Theme persisted in localStorage
- [ ] No FOUC on page load
- [ ] All existing `data-testid` attributes preserved
- [ ] WCAG AA contrast compliance in both themes (verified per Section 9)
- [ ] Responsive: mobile, tablet, desktop all functional
- [ ] All tests passing (>=80% lines/functions/statements, >=75% branches)
- [ ] Error boundary component wrapping app content
- [ ] Tiptap editor themed for both light and dark mode
- [ ] **Smoke test checklist** (replaces "zero regressions"):
  - [ ] Can create a board
  - [ ] Can create/edit/delete tasks
  - [ ] Can drag tasks between columns
  - [ ] Can login/logout
  - [ ] Can access admin pages (as admin)
  - [ ] Can update settings
  - [ ] All auth flows work (signup, reset password, request access)

### Should Have (P1)
- [ ] shadcn/ui component migration (Button, Input, Card, Dialog, Dropdown)
- [ ] Board header toolbar with search and filters
- [ ] Collapsible columns with animation and persisted state (merged with animation — shipping collapse without animation is worse)
- [ ] Card density toggle (comfortable/compact)
- [ ] Skeleton loading states for all pages
- [ ] Improved empty states with Lucide icons + clear CTAs
- [ ] Breadcrumbs navigation
- [ ] ConfirmDialog component replacing all `window.confirm()` calls
- [ ] Toast → sonner migration with `useToast` compatibility wrapper

### Nice to Have (P2)
- [ ] Command palette (Cmd+K) — client-side search only
- [ ] Header backdrop blur on scroll
- [ ] Animated page transitions with directional awareness
- [ ] Swipe-to-reveal card actions on mobile
- [ ] Board list bento grid with featured board

---

## 12. Testing Strategy

The UI refresh will require updates across all three testing layers: unit tests, BDD/E2E tests, and architecture tests. The 80% coverage threshold must be maintained (never lowered).

### 12.1 Unit Test Impact

Every visual component change requires corresponding test updates. Key areas:

#### New Components (need new test files)

| Component | Test File | Key Test Cases |
|-----------|-----------|----------------|
| `ThemeProvider` | `ThemeContext.test.tsx` | System detection, localStorage persistence, class toggle, theme switching, FOUC prevention |
| `ThemeToggle` | `ThemeToggle.test.tsx` | Renders sun/moon, click cycles theme, long-press shows 3 options, respects reduced motion, aria-label updates |
| `CommandPalette` | `CommandPalette.test.tsx` | Opens on Cmd+K, search filters results, keyboard navigation, Esc closes, navigates on Enter |
| `Breadcrumbs` | `Breadcrumbs.test.tsx` | Renders path segments, truncates on mobile, links are clickable, hides on board list |
| `BoardToolbar` | `BoardToolbar.test.tsx` | Search input filters cards, filter dropdown opens, filter chips appear/remove, density toggle switches mode |
| `CollapsibleColumn` | Tests within `BoardColumn.test.tsx` | Collapse toggle works, collapsed shows card count, expand restores cards, state persists |
| Skeleton variants | `Skeleton.test.tsx` | Renders correct structure per variant (board, card, table, settings) |

#### Existing Tests Requiring Updates

| Test File | Changes Needed |
|-----------|---------------|
| `LoginPage.test.tsx` | Update selectors if markup changes (shadcn Button vs custom). Verify dark mode rendering. |
| `SignUpPage.test.tsx` | Same selector updates. Password strength indicator may change structure. |
| `ResetPasswordPage.test.tsx` | **PRD v1.0 missed this.** 3-step wizard with animated transitions = significant markup change. |
| `RequestAccessPage.test.tsx` | **PRD v1.0 missed this.** New success state with checkmark animation. |
| `SettingsPage.test.tsx` | Layout changes markup structure. Update section selectors. |
| `UsersPage.test.tsx` | Table→card responsive change may need separate mobile/desktop test paths. |
| `InvitesPage.test.tsx` | Dialog migration (custom Modal → shadcn Dialog) changes open/close selectors. |
| `RequestsPage.test.tsx` | Similar dialog migration updates. |
| `BoardList.test.tsx` | Grid changes card layout. Board creation card markup may change. |
| `BoardView.test.tsx` | New toolbar, collapsible columns, density toggle all add test surface. |
| `BoardColumn.test.tsx` | Add collapse/expand tests. Card density rendering tests. |
| `TodoCard.test.tsx` | Compact mode hides description/labels. Test both density modes. |
| `DetailPanel.test.tsx` | **PRD v1.0 missed this.** Side panel restyling, form controls, Tiptap area. |
| `Button.test.tsx` | shadcn Button migration — update variant assertions. |
| `Input.test.tsx` | shadcn Input migration. |
| `Modal.test.tsx` | Migration to shadcn Dialog. Update or replace test file. |
| `Toast.test.tsx` | Migration to sonner. Update toast trigger/assertion patterns. |
| `UndoToast.test.tsx` | **PRD v1.0 missed this.** Becomes custom sonner toast — significant change. |
| `BottomSheet.test.tsx` | **PRD v1.0 missed this.** If modals → bottom sheets on mobile, this component changes. |
| `ContextMenu.test.tsx` | **PRD v1.0 missed this.** May be deprecated if user menu → shadcn DropdownMenu. |
| `Badge.test.tsx` | **PRD v1.0 missed this.** Badges used extensively (role, status, card count). |
| `ProgressBar.test.tsx` | **PRD v1.0 missed this.** Password strength indicator may change. |
| `RichTextEditor.test.tsx` | **PRD v1.0 missed this.** Tiptap styling changes affect rendering. |
| `LabelManager.test.tsx` | **PRD v1.0 missed this.** Label chips restyled for dark mode. |
| `AuthContext.test.tsx` | ThemeProvider added to test wrapper affects all renders — verify no interference. |
| `ToastContext.test.tsx` | **Replaced entirely** when migrating to sonner. Delete and verify sonner works via test util. |

> **Blast radius note:** Adding `ThemeProvider` to `src/test/utils.tsx` `customRender` wrapper means every single test in the codebase runs through it. And replacing `ToastProvider` with sonner's `Toaster` also affects every test file using `render` from test utils.

#### Test Utility Updates

| File | Changes |
|------|---------|
| `src/test/utils.tsx` | Add `ThemeProvider` to `customRender` wrapper. Add helper: `renderWithDarkMode()` that wraps in `.dark` class. |
| `src/test/mocks/handlers.ts` | No changes (no new API endpoints). |

#### Dark Mode Testing Pattern

Every component with visual styling should be tested in both themes. Recommended approach:

```tsx
// Helper in test utils
function renderDark(ui: ReactElement) {
  document.documentElement.classList.add('dark');
  const result = customRender(ui);
  return {
    ...result,
    cleanup: () => {
      result.unmount();
      document.documentElement.classList.remove('dark');
    },
  };
}
```

Key dark mode assertions:
- Components render without errors in dark mode
- Correct CSS variable references (no hardcoded colors)
- Theme toggle updates `document.documentElement.classList`
- `localStorage` is read/written correctly

### 12.2 BDD/E2E Test Impact

BDD tests run against the real UI in a browser — they'll detect any visual regressions or broken interactions.

#### New Feature Files Needed

| Feature File | Scenarios |
|-------------|-----------|
| `dark-mode.feature` | Toggle between light/dark/system, preference persists across page reload, system preference respected, no FOUC on load |
| `command-palette.feature` | Open with Cmd+K, search boards, navigate to result, Esc closes, recent items shown |
| `board-toolbar.feature` | Search filters cards in real-time, apply priority filter, apply label filter, clear filters, card density toggle |
| `collapsible-columns.feature` | Collapse column, see card count badge, expand column, state persists on page reload |

#### Existing Feature Files Requiring Updates

| Feature File | Changes |
|-------------|---------|
| `login.feature` | Update selectors if markup changes. Verify login works in dark mode scenario. |
| `signup.feature` | Same — selector stability. Security question section layout change. |
| `view-boards.feature` | Board list layout changes. Verify board cards are still findable. |
| `create-board.feature` | Create board card markup may change. |
| `delete-board.feature` | **PRD v1.0 missed.** Board deletion now uses ConfirmDialog. |
| `request-access.feature` | **PRD v1.0 missed.** Request access page restyled. |
| `invites-management.feature` | Dialog component change may affect open/close selectors. |
| `add-column.feature`, `delete-column.feature`, `reorder-columns.feature` | **PRD v1.0 missed.** Column markup restructured. |
| `create-todo.feature`, `delete-todo.feature`, `edit-todo.feature`, `move-todo.feature` | **PRD v1.0 missed.** Card styling changes, detail panel changes. |
| `manage-labels.feature` | **PRD v1.0 missed.** Label chips restyled. |
| `search-todos.feature` | **PRD v1.0 missed.** Search moves to board toolbar. |
| `task-count-update.feature` | **PRD v1.0 missed.** Card count display may change with collapse. |

#### Component-Level BDD Tests (PRD v1.0 missed entirely)

These vitest-based BDD-style tests also need updating:
- `tests/bdd/component-tests/board/BoardList.bdd.test.tsx`
- `tests/bdd/component-tests/column/BoardColumn.bdd.test.tsx`
- `tests/bdd/component-tests/ui/KeyboardShortcutsHelp.bdd.test.tsx`

#### Page Object Updates

| Page Object | Changes |
|------------|---------|
| `login.page.ts` | Update selectors — use `data-testid` or `role` selectors that survive component migration. **Fix hardcoded CSS selectors** (`.animate-spin`, `.bg-red-50`). |
| `signup.page.ts` | Same approach. |
| `board-list.page.ts` | **Fix:** Line 41 uses `.animate-spin` selector — replace with `data-testid`. Line 50 uses `.bg-red-50` — replace with `data-testid` or role. |
| `board-view.page.ts` | **Fix:** Line 47 uses `.animate-spin` — replace. Add methods: `searchTasks()`, `toggleFilter()`, `toggleDensity()`, `collapseColumn()`, `expandColumn()`. |
| `todo-modal.page.ts` | **PRD v1.0 missed.** Major rework if detail panel replaces modal. Line 51 uses `.bg-red-50` fallback. |
| New: `settings.page.ts` | **PRD v1.0 missed.** Needed for dark mode toggle BDD tests. |
| New: `admin.page.ts` | **PRD v1.0 missed.** For invites/users/requests admin pages. |
| New: `request-access.page.ts` | **PRD v1.0 missed.** For request access flow. |
| New: `reset-password.page.ts` | **PRD v1.0 missed.** For 3-step wizard flow. |
| New: `command-palette.page.ts` | Methods: `open()`, `search()`, `selectResult()`, `close()`. |
| Barrel: `pages/index.ts` | Add all new page objects to the barrel export. |

> **P0 Rule:** All existing `data-testid` attributes MUST be preserved. All new interactive elements MUST have `data-testid` attributes. All page object selectors should prefer `data-testid` or ARIA roles over CSS class selectors.

#### BDD Step Definition Updates

New step definitions needed:
```gherkin
# Dark mode steps
Given the user prefers dark mode
When I toggle the theme to "dark"
Then the page should be in dark mode
And the theme preference should be saved

# Board toolbar steps
When I search for "{query}" in the board toolbar
Then only cards matching "{query}" should be visible
When I filter by priority "{priority}"
When I clear all filters
When I switch to compact card view

# Column collapse steps
When I collapse the column "{name}"
Then the column "{name}" should show a card count of {n}
When I expand the column "{name}"
```

### 12.3 Architecture Test Impact

The architecture tests enforce layer boundaries, naming conventions, cycle-freedom, and file size limits. The UI refresh will need updates in several areas.

#### Layer Tests (`layers.arch.test.ts`)

| Current Rule | Impact | Action |
|-------------|--------|--------|
| UI components should NOT import hooks | **No change** — shadcn components are pure UI | No update needed |
| UI components should NOT import API client | **No change** | No update needed |
| Hooks should NOT import components | **No change** | No update needed |
| Auth pages should NOT import admin pages | **No change** | No update needed |
| ThemeContext imports | ThemeContext is in `src/contexts/` — **already allowed** by current layer rules (no rule blocks UI → contexts). But `useTheme` MUST be exported from context, not from `src/hooks/`, to avoid UI → hooks violation. | No rule change needed IF `useTheme` stays in `ThemeContext.tsx` |
| ThemeToggle placement | ThemeToggle imports `useTheme` hook — if in `src/components/ui/`, violates hooks rule. | **Place in `src/components/app/ThemeToggle.tsx`** (not `ui/`) |
| CommandPalette | Feature component — imports hooks, router, board data | **Place in `src/components/app/CommandPalette.tsx`** (not `ui/`) |
| Breadcrumbs | Reads router context — not a pure UI component | **Place in `src/components/app/Breadcrumbs.tsx`** |

#### Naming Tests (`naming.arch.test.ts`)

| Rule | Impact |
|------|--------|
| React components must be PascalCase `.tsx` | New files in `src/components/app/` (ThemeToggle, CommandPalette, Breadcrumbs) must follow PascalCase |
| Hooks must start with `use` | New hooks (`useTheme`, `useBoardFilters`, `useColumnCollapse`, `useCardDensity`) must follow pattern |
| shadcn components in `src/components/ui/` | **DECISION: Add exception for lowercase + hyphens** |

**DECIDED (not an open question):** Update the naming arch test regex to allow shadcn's lowercase convention for `src/components/ui/`:

Current regex (line 9):
```ts
/^[A-Z][a-zA-Z]+(\.(test|spec))?\.tsx$|^index\.ts$/
```

Updated regex:
```ts
/^[A-Z][a-zA-Z]+(\.(test|spec))?\.tsx$|^[a-z][a-z-]+\.tsx$|^index\.ts$/
```

This allows both PascalCase (existing custom components) and lowercase-with-hyphens (shadcn files like `button.tsx`, `dropdown-menu.tsx`).

#### Cycle Tests (`cycles.arch.test.ts`)

| Area | Risk |
|------|------|
| ThemeContext ↔ components | ThemeToggle imports `useTheme` from ThemeContext; ThemeContext provides context. This is NOT a cycle (one-directional). **No issue.** |
| CommandPalette → hooks → API | Standard unidirectional flow. **No issue.** |
| Board toolbar → filter state → board view | Ensure filter state lives in a hook or context, not circular between components. |

**Action:** No changes to cycle tests expected, but run them after implementation to verify.

#### Metrics Tests (`metrics.arch.test.ts`)

| Rule | Current Limit | Impact |
|------|--------------|--------|
| UI components | <150 lines | ThemeToggle (animated) may approach limit. Keep animation logic in a separate hook if needed. |
| Hooks | <200 lines | `useTheme` should be well under limit. `useBoardFilters` (new) should stay under. |
| Feature components | <700 lines | CommandPalette should stay under. BoardView with toolbar additions — monitor closely, may need extraction. |

**Risk:** `BoardView.tsx` already handles DnD, columns, detail panel. Adding toolbar + filters + collapse could push it over 700 lines. **Mitigation:** Extract `BoardToolbar` as a separate component, `useBoardFilters` as a hook, and `useColumnCollapse` as a hook.

### 12.4 Test Execution Plan Per Phase

| Phase | Tests to Run | Expected Outcome |
|-------|-------------|-----------------|
| Phase 1 (Foundation) | All existing unit tests + arch tests | All should pass — no visual changes yet |
| Phase 2 (Design System) | All unit tests | Some may fail due to selector/class changes — fix as you go |
| Phase 3 (Component Migration) | All unit tests, focus on migrated components | Tests for migrated components need updating first |
| Phase 4 (New Features) | New tests + all existing | Write tests for each new feature before/during implementation |
| Phase 5 (Polish) | Full suite: unit + BDD + arch | Everything green before merge |

### 12.5 Coverage Impact Estimate

Actual thresholds from `vitest.config.ts`:

| Metric | Threshold | Notes |
|--------|-----------|-------|
| Lines | 80% | Must maintain |
| Functions | 80% | Must maintain |
| Statements | 80% | Must maintain |
| **Branches** | **75%** (not 80%) | PRD v1.0 overstated this. Actual config is 75%. |

**Coverage exclusions to be aware of:**
- `src/App.tsx` is excluded from coverage — ThemeProvider/ErrorBoundary changes there won't affect metrics
- `src/lib/auth-client.ts` is excluded
- `src/hooks/useBoardDnD.ts` is excluded
- New files will NOT be automatically excluded — every new `.tsx` file counts

**Key rules:**
- Every new file added must have a corresponding test file
- Every new component must have tests covering both light and dark mode rendering
- NEVER lower coverage thresholds — add more tests instead

---

## 13. Out of Scope

- New features beyond UI/UX (no new API endpoints, no new data models)
- User onboarding flow / tooltips
- Notifications system
- Real-time collaboration
- Mobile native app
- Internationalization (i18n)
- Analytics dashboard
- Drag-and-drop between boards

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Font loading delay (FOUT) | Visible font swap on load | Self-host WOFF2, `font-display: optional` for body, preload critical weights |
| Dark mode contrast failures | Accessibility violations | Verify every semantic token pair. neutral-500 darkened. Borders use neutral-700. |
| `accent` token collision | All buttons become invisible | Token aliasing in Phase 1 maps old `accent` → new `primary`. See Section 3.7. |
| shadcn migration breaks tests | Test failures, regression | Migrate one component at a time, update barrel export immediately, run tests after each |
| Tailwind v3→v4 migration | Build breaks | Complete in Phase 1 before visual changes. PostCSS removal, config porting all in one PR. |
| BoardView.tsx exceeds 700 lines | Arch test failure | Mandatory extraction of BoardToolbar + hooks before Phase 4a |
| ToastProvider replacement blast radius | All tests affected | Update `src/test/utils.tsx` in dedicated commit. Verify test suite passes before continuing. |
| Performance regression from animations | Slower on low-end devices | Prefer CSS transitions over Motion `layout` for simple changes. Test on low-end device profile. |
| Scope creep | Delays delivery | Strict P0/P1/P2 prioritization. Grain texture removed. Command palette deferred to Phase 5. |
| Mid-implementation breakage | App unusable | Phase-level PR strategy. Token aliases allow independent revert. See Section 10.6. |

---

## 15. Resolved Questions (from v1.0 Review)

All open questions from v1.0 have been resolved:

| # | Question | Decision |
|---|----------|----------|
| Q1 | Self-host fonts or CDN? | **Self-host.** WOFF2, Latin subset, `font-display: optional` for body. See Section 10.1. |
| Q2 | Command palette — local or backend search? | **Client-side only for v1.** Searches loaded nav data. Backend search is a future enhancement. |
| Q3 | Filter state in URL query params? | **No.** Use `useBoardFilters` hook with local state. URL params noted as future enhancement. |
| Q4 | Collapsed column state — server or local? | **Device-local.** localStorage key `inzone-board-{boardId}-collapsed-columns`. |
| Q5 | shadcn file naming convention? | **Add exception.** Updated regex allows lowercase + hyphens for `src/components/ui/`. See Section 12.3. |
| Q6 | BoardView extraction pre-planning? | **Mandatory before Phase 4a.** Extract BoardToolbar, BoardHeader, + 3 hooks. See Section 10.5. |
| Q7 | What happens to existing ToastContext? | **Replace with sonner.** Thin `useToast` wrapper for API compatibility. See Section 5.1. |
| Q8 | How are existing CSS animations handled? | **Keep in `index.css`.** Update token references only. Don't migrate to Motion. See Section 10.4. |
| Q9 | Token migration strategy? | **Phase 1 aliasing.** Old names → new values. Phases 2-3 update files, then remove aliases. See Section 10.4. |
| Q10 | Hardcoded Tailwind color strategy? | **Replace ALL stone/gray classes** with semantic tokens in Phase 2a. See Section 3.7. |

---

*End of PRD v1.1*
