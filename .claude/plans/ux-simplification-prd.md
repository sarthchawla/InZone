# PRD: InZone UX Simplification & Visual Refresh

**Date**: 2026-02-21
**Status**: Draft
**Goal**: Reduce friction in every user flow, eliminate unnecessary modals, modernize the visual design, and make InZone feel like a polished professional tool.

---

## Problem Statement

The current app works but feels like a prototype:
- **Modal fatigue**: 9 out of 16 common actions require a modal popup. Editing a todo (the most frequent action) always forces a full-screen modal.
- **Too many clicks**: Setting a priority on a card takes 4 clicks (click card → modal opens → click priority → click save). Setting a due date is the same. Creating a label is 5+ clicks across two different modals.
- **Generic visual design**: Default Tailwind gray/blue palette with no personality. Looks like every other tutorial project.
- **Hidden affordances**: Drag handles only appear on hover. Delete buttons are hidden. Column menu requires 3-dot discovery. Users don't know what's interactive.
- **Disconnected flows**: Labels are managed in a separate modal, then assigned in another modal. Board description editing requires a modal for a single text field.

---

## Design Principles

1. **Inline over modal**: If an action touches 1-2 fields, do it inline. Reserve modals only for destructive confirmations and complex multi-field forms.
2. **One-click where possible**: Common actions (set priority, set due date, archive) should be achievable in a single click or right-click.
3. **Always visible affordances**: Don't hide interactive elements behind hover states. If it's draggable, show the handle. If it's editable, show a subtle cue.
4. **Professional color palette**: Move from generic gray/blue to a refined, muted palette with a distinct accent color.
5. **Progressive disclosure**: Show the essentials up front, reveal details on demand without navigation away from context.

---

## 1. Visual Design Refresh

### 1.1 New Color Palette

Replace the default Tailwind blue/gray with a refined palette:

```
Background tiers:
  --surface-0: #fafaf9    (page background - warm off-white)
  --surface-1: #ffffff    (cards, columns)
  --surface-2: #f5f5f4    (column backgrounds, input backgrounds)
  --surface-3: #e7e5e4    (borders, dividers)

Text hierarchy:
  --text-primary:   #1c1917  (headings, titles)
  --text-secondary: #57534e  (body text, descriptions)
  --text-tertiary:  #a8a29e  (placeholders, metadata)

Accent (indigo instead of blue - more professional, distinct):
  --accent:       #6366f1   (primary actions, links, focus rings)
  --accent-hover: #4f46e5   (hover state)
  --accent-light: #eef2ff   (accent backgrounds, selection highlights)
  --accent-muted: #c7d2fe   (subtle accent borders)

Semantic:
  --success: #16a34a
  --warning: #d97706
  --danger:  #dc2626
  --info:    #6366f1  (same as accent)

Priority colors (softer, less saturated):
  LOW:    bg-emerald-50   text-emerald-700   border-emerald-200
  MEDIUM: bg-amber-50     text-amber-700     border-amber-200
  HIGH:   bg-orange-50    text-orange-700    border-orange-200
  URGENT: bg-red-50       text-red-700       border-red-200
```

### 1.2 Typography

Switch to Inter (or system-ui with Inter as first choice) for a cleaner, more professional feel:

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

Tighten the type scale:
```
Board title:     text-lg font-semibold tracking-tight
Column title:    text-sm font-semibold uppercase tracking-wide text-secondary
Card title:      text-sm font-medium text-primary
Metadata:        text-xs font-normal text-tertiary
```

### 1.3 Spacing & Radius

Move to slightly larger border radii for a softer feel:
```
Cards:    rounded-xl  (12px)
Columns:  rounded-xl  (12px)
Buttons:  rounded-lg  (8px)
Badges:   rounded-md  (6px)
Inputs:   rounded-lg  (8px)
```

### 1.4 Shadows & Depth

Replace flat gray borders with subtle layered shadows:
```
Card resting:   shadow-sm border border-stone-200/60
Card hover:     shadow-md border-stone-300/80 -translate-y-0.5
Column:         shadow-none (flat, background differentiation only)
Modal:          shadow-2xl
Drag overlay:   shadow-2xl ring-2 ring-accent/20
```

### 1.5 Page Background

Replace flat `bg-gray-50` with a subtle gradient:
```css
.board-page {
  background: linear-gradient(135deg, #fafaf9 0%, #f0f0ee 100%);
}
```

---

## 2. Flow Redesigns

### 2.1 Todo Card: Inline Quick Actions (Biggest Impact)

**Current flow** (set priority on a card):
```
Click card → Modal opens → Find priority section → Click priority → Click Save → Modal closes
(4 clicks, context switch to modal)
```

**New flow**:
```
Right-click card (or click ⋯ icon) → Context menu appears → Hover "Priority" → Click "High"
(2 clicks, no context switch)
```

#### Implementation: Card Context Menu

Replace the current "click to open modal" pattern with a **right-click context menu** on todo cards. The card click still opens the detail panel (see 2.2), but the context menu provides quick actions:

```
┌─────────────────────────┐
│ ▸ Priority    → [submenu with LOW / MED / HIGH / URGENT]
│ ▸ Due Date    → [submenu with Today / Tomorrow / Next Week / Pick date...]
│ ▸ Move to     → [submenu listing column names]
│ ───────────────────────  │
│   Edit Details    ⌘E     │
│   Duplicate       ⌘D     │
│ ───────────────────────  │
│   Archive                │
│   Delete         ⌫       │
└─────────────────────────┘
```

Also add a small `⋯` icon on the card (always visible, not hover-only) for users who don't know about right-click.

**Before:**
```
┌──────────────────────────────┐
│ Fix login bug                │  ← click anywhere opens modal
│ MEDIUM  📅 Mar 15            │
└──────────────────────────────┘
```

**After:**
```
┌──────────────────────────────┐
│ Fix login bug            ⋯  │  ← click ⋯ or right-click for actions
│ 🟡 Medium  · Mar 15  · 2🏷  │  ← click card body opens side panel
└──────────────────────────────┘
```

### 2.2 Todo Detail: Side Panel Instead of Modal

**Current flow** (edit a todo):
```
Click card → Full modal covers screen → Edit fields → Click Save → Modal closes
(Loses context of the board. Can't see other cards. Can't drag while editing.)
```

**New flow**:
```
Click card → Side panel slides in from right (400px wide) → Edit inline → Changes auto-save on blur
(Board stays visible. Can still see columns. Can click another card to switch.)
```

#### Side Panel Design

```
┌─ Board View ──────────────────────────────┬─ Detail Panel (400px) ─────┐
│                                           │                            │
│  [Backlog]    [In Progress]    [Done]     │  Fix login bug         ✕  │
│  ┌────────┐   ┌────────┐   ┌────────┐    │                            │
│  │ Card 1 │   │ Card 3 │   │ Card 5 │    │  Priority: [🟡 Medium ▾]  │
│  │ Card 2 │   │■Card 4■│   │ Card 6 │    │  Due: [Mar 15 ▾]          │
│  └────────┘   └────────┘   └────────┘    │  Labels: [bug] [+]        │
│                                           │                            │
│                                           │  ── Description ────────── │
│                                           │  The login form crashes    │
│                                           │  when password is empty... │
│                                           │                            │
│                                           │  ── Activity ───────────── │
│                                           │  Created 2 days ago        │
│                                           │                            │
│                                           │  [Archive]  [Delete]       │
└───────────────────────────────────────────┴────────────────────────────┘
```

Key behaviors:
- **Auto-save**: Every field saves on blur/change. No "Save" button needed. Show a subtle checkmark animation when saved.
- **Click another card**: Panel content swaps (no close/reopen).
- **Escape or click ✕**: Panel slides away.
- **The selected card** gets a highlight ring on the board so you know which card you're editing.
- **Responsive**: On mobile (< 768px), the panel becomes a bottom sheet (slides up from bottom, 60% height).

### 2.3 Board Creation: Simplify to Inline

**Current flow**:
```
Click "New Board" → Modal opens → Type name → Select template → Click Create → Modal closes
(3 clicks + modal context switch)
```

**New flow**:
```
Click "+" card in the board grid → Card transforms into an input field → Type name → Press Enter
(2 interactions, no modal, stays in context)
```

#### Inline Board Creation Design

The board list grid always shows a "ghost" card at the end:

```
┌──────────┐  ┌──────────┐  ┌╌╌╌╌╌╌╌╌╌╌┐
│ Sprint   │  │ Backlog  │  ╎  + New    ╎  ← dashed border, muted
│ Board    │  │ Board    │  ╎  Board    ╎
│ 12 tasks │  │ 5 tasks  │  ╎          ╎
└──────────┘  └──────────┘  └╌╌╌╌╌╌╌╌╌╌┘
```

Click the ghost card:
```
┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Sprint   │  │ Backlog  │  │ Board name:  │
│ Board    │  │ Board    │  │ [_________ ] │
│ 12 tasks │  │ 5 tasks  │  │              │
└──────────┘  └──────────┘  │ Template: ▾  │
                             │ [Enter] [Esc]│
                             └──────────────┘
```

- Press **Enter** → Board created with default template (or selected one), navigates to it.
- Press **Escape** → Reverts to ghost card.
- Template selector is a simple dropdown below the name input (not a separate section).
- No description field at creation time (add it later on the board page).

### 2.4 Column Header: Always-Visible Actions

**Current flow** (rename a column):
```
Double-click column title → Inline edit appears → Type → Press Enter
(Not discoverable. Most users don't try double-clicking.)
```

**Alternative current flow:**
```
Click ⋯ menu → Click "Edit" → Modal opens with Name + Description → Edit → Click Save
(4 clicks + modal for renaming)
```

**New flow**:
```
Click column title → Title becomes editable inline → Type → Press Enter or click away
(1 click, immediate, obvious)
```

#### Column Header Redesign

```
BEFORE:
┌───────────────────────────────────────┐
│ ⠿  Backlog              3  ℹ  ⋯     │
└───────────────────────────────────────┘
  ^grip  ^name          ^count ^info ^menu
  (hidden on no-hover)

AFTER:
┌───────────────────────────────────────┐
│ BACKLOG                    3  ▾      │
│ Ungroomed items from product         │  ← description shown inline (1 line, truncated)
└───────────────────────────────────────┘
         ^click to rename   ^count ^dropdown
```

Changes:
- **Column title**: Single-click to edit (not double-click). Uppercase + tracking-wide for visual distinction.
- **Description**: Shown inline below title (truncated to 1 line). No hover tooltip, no separate modal. Click to expand/edit.
- **Grip handle**: Remove the visible grip icon. Instead, the entire column header is the drag handle (cursor changes to `grab` on hover). This is how Trello/Linear work.
- **Replace ⋯ menu** with a simple **▾ dropdown** next to the count badge. The dropdown contains: Edit Description, Set WIP Limit, Delete Column.

### 2.5 Labels: Inline Chip Creation

**Current flow** (add a label to a card):
```
Click card → Modal opens → Scroll to labels section → Click label dropdown →
Select existing label OR click "Create" → Fill name + pick color → Click create → Close dropdown → Click Save
(5-7 clicks across multiple nested UI elements)
```

**New flow (via context menu)**:
```
Right-click card → Labels → [existing labels with checkmarks] + [+ New label] at bottom
(2 clicks to toggle an existing label)
```

**New flow (via side panel)**:
```
Click card → Side panel shows labels as chips → Click [+] → Type label name →
Pick color from 6 swatches → Press Enter
(All inline, no separate modal, 3 interactions for new label)
```

#### Label Chip Design in Side Panel

```
Labels:
  [bug ×] [frontend ×]  [+ Add]

Click [+ Add]:
  [bug ×] [frontend ×]  [________▾]  ← input + color dot
                          │ design    │  ← autocomplete existing labels
                          │ backend   │
                          │ ── New ── │
                          │ 🔴🟠🟡🟢🔵🟣│  ← color picker row
                          └───────────┘
```

### 2.6 Board Deletion: Swipe/Quick Action

**Current flow**:
```
Hover board card → Click trash icon (hidden by default) → Confirmation modal → Click Confirm
(3 clicks, hidden affordance)
```

**New flow**:
```
Click ⋯ on board card (always visible) → Click "Delete" → Inline undo toast (no modal)
(2 clicks, no modal confirmation)
```

#### Undo Pattern Instead of Confirmation Modal

Instead of a blocking confirmation modal, use an **undo toast**:

```
┌───────────────────────────────────────────┐
│  "Sprint Board" deleted.  [Undo]   5s ■■░ │
└───────────────────────────────────────────┘
```

- Board is **soft-deleted immediately** (removed from UI).
- Toast shows for 5 seconds with a countdown bar.
- Click **Undo** → Board restored instantly.
- After 5 seconds → Permanent deletion API call.
- This is faster (no confirmation interruption) and safer (undo is always available).

Apply the same pattern for: **column deletion**, **card deletion**, **card archival**.

### 2.7 Board Card Redesign

**Current card**:
```
┌──────────────────────────────┐
│  📋                          │
│  Sprint Board                │
│  Current sprint tasks        │
│                              │
│  3 columns · 12 tasks        │
└──────────────────────────────┘
```

**New card** (more info at a glance, action affordance visible):
```
┌──────────────────────────────┐
│  Sprint Board            ⋯  │  ← name + always-visible menu
│  Current sprint tasks        │
│                              │
│  ██████████░░░  8/12 done    │  ← progress bar
│  3 columns · Updated 2h ago  │
└──────────────────────────────┘
```

Changes:
- **⋯ button always visible** (top-right) — contains: Rename, Edit Description, Delete.
- **Progress bar** showing completion ratio (todos in last column / total todos).
- **"Updated X ago"** replaces raw task count — more useful information.
- Remove the large icon — it wastes vertical space.

### 2.8 Todo Card Visual Redesign

**Current card**:
```
┌──────────────────────────────┐
│ Fix login bug                │
│ MEDIUM  📅 Mar 15            │
└──────────────────────────────┘
```

**New card** (richer info, consistent layout):
```
┌──────────────────────────────┐
│  Fix login bug           ⋯  │
│  🟡 Medium · Mar 15 · 2🏷    │
│  [bug] [frontend]            │  ← label chips shown on card
└──────────────────────────────┘
```

Or for a minimal card (no metadata):
```
┌──────────────────────────────┐
│  Set up CI pipeline      ⋯  │
└──────────────────────────────┘
```

Key changes:
- **⋯ always visible** (not hover-only) for quick actions.
- **Labels shown as small chips** on the card face (max 3, then "+N more").
- **Priority as a colored dot** + text, not a full badge (saves horizontal space).
- **Metadata on one line**: priority · due date · label count — separated by `·`.
- **Left color bar** (2px) matching priority color for at-a-glance scanning:
  ```
  ┌──────────────────────────────┐
  ┃ Fix login bug            ⋯  │  ← orange left border = HIGH priority
  ┃ 🟠 High · Mar 15             │
  └──────────────────────────────┘
  ```

### 2.9 Empty States: More Helpful

**Current empty board list**:
```
  [icon]
  No boards yet
  Boards help you organize tasks into columns...
  [Create Board]
```

**New empty board list** (actionable, warmer):
```
  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
  ╎                                           ╎
  ╎   Start by creating your first board.     ╎
  ╎   Type a name and press Enter.            ╎
  ╎                                           ╎
  ╎   Board name: [____________________]      ╎
  ╎                                           ╎
  ╎   Or try a template:                      ╎
  ╎   [Kanban]  [Development]  [Simple]       ╎
  ╎                                           ╎
  └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

The empty state IS the creation form. No separate button or modal needed. The template options are clickable cards that pre-fill and create in one step.

---

## 3. Interaction Pattern Changes

### 3.1 Auto-Save Everywhere

Remove all "Save" buttons from editing flows. Every field auto-saves on blur or after a short debounce (500ms for text fields, immediately for selects/toggles).

**Visual feedback for auto-save:**
```
[Field editing]  →  [Saving... ○]  →  [Saved ✓]  (checkmark fades after 1.5s)
```

This eliminates the "forgot to click save" problem and removes one click from every edit.

### 3.2 Keyboard-First Design

Expand keyboard shortcuts to cover all common actions:

| Key | Action | Context |
|-----|--------|---------|
| `N` | New card (focus first column input) | Board view |
| `B` | New board (focus creation input) | Board list |
| `/` | Focus search | Anywhere |
| `?` | Show shortcuts | Anywhere |
| `E` | Edit selected card (open side panel) | Board view |
| `P` | Cycle priority (none → low → med → high → urgent) | Card selected |
| `L` | Open label picker | Card selected |
| `D` | Set due date | Card selected |
| `Delete` | Delete selected card (with undo) | Card selected |
| `Escape` | Close panel / Deselect | Anywhere |
| `↑↓` | Navigate cards within column | Board view |
| `←→` | Navigate between columns | Board view |
| `Enter` | Open selected card detail | Card selected |

### 3.3 Toast Redesign

Current toasts are standard Bootstrap-style notifications. Redesign to be minimal and unobtrusive:

```
Current:
┌────────────────────────────────────┐
│ ✅  Board created successfully  ✕  │
└────────────────────────────────────┘

New (for success — minimal, no close button needed):
┌─────────────────────┐
│  Board created  ✓   │  ← smaller, auto-dismiss 2s, slides up from bottom-center
└─────────────────────┘

New (for undo actions):
┌──────────────────────────────────────────┐
│  Card deleted  ·  [Undo]  ■■■░ 4s       │  ← bottom-center, countdown, 5s
└──────────────────────────────────────────┘

New (for errors — persistent until dismissed):
┌────────────────────────────────────────┐
│  Failed to save. Check connection.  ✕  │  ← bottom-center, red accent, stays
└────────────────────────────────────────┘
```

Position: **bottom-center** (not bottom-right). Centered toasts are easier to notice and feel more app-like.

---

## 4. Responsive / Mobile Improvements

### 4.1 Mobile Column Swipe

On mobile (< 768px), show **one column at a time** with swipe navigation between columns:

```
┌──────────────────────────┐
│ ← BACKLOG (1/3)       → │  ← column name + position indicator
│                          │
│  ┌────────────────────┐  │
│  │ Fix login bug      │  │
│  │ 🟡 Med · Mar 15    │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Add dark mode      │  │
│  └────────────────────┘  │
│                          │
│  [+ Add card]            │
└──────────────────────────┘
   ○ ● ○                     ← dot indicators for columns
```

### 4.2 Mobile Card Detail

On mobile, the side panel becomes a **bottom sheet** (slides up, 70% height, swipe down to dismiss):

```
┌──────────────────────────┐
│ ← BACKLOG             → │
│  ┌────────────────────┐  │
│  │ Fix login bug      │  │
├──┤────────────────────├──┤  ← bottom sheet
│  Fix login bug       ✕  │
│                          │
│  Priority: [🟡 Medium ▾] │
│  Due: [Mar 15 ▾]        │
│  Labels: [bug] [+]      │
│                          │
│  Description:            │
│  The login form...       │
└──────────────────────────┘
```

---

## 5. Summary: Click Count Comparison

| Action | Current Clicks | New Clicks | How |
|--------|---------------|------------|-----|
| Create board | 3 (button → modal → create) | 2 (click ghost card → type + enter) | Inline creation |
| Create card | 3 | 2 | Same inline, unchanged |
| Set priority | 4 (click → modal → priority → save) | 2 (right-click → priority) | Context menu |
| Set due date | 4 | 2 | Context menu |
| Add existing label | 5 | 2 | Context menu |
| Create new label | 7 | 3 | Inline in side panel |
| Edit card title | 3 (click → modal → edit → save) | 1 (click title in side panel, auto-save) | Side panel + auto-save |
| Edit card description | 3 | 1 | Side panel + auto-save |
| Edit column name | 2-4 | 1 (single-click title) | Single-click inline |
| Edit board description | 3 (button → modal → save) | 1 (click inline description, auto-save) | Inline + auto-save |
| Delete board | 3 (hover → trash → confirm modal) | 2 (⋯ → delete, undo toast) | Undo pattern |
| Delete card | 3 (click → modal → delete) | 2 (right-click → delete, undo toast) | Context menu + undo |
| Delete column | 3 | 2 (dropdown → delete, undo toast) | Undo pattern |
| Move card to column | drag or 4 clicks | drag or 2 (right-click → move to → column) | Context menu |

**Average reduction: ~40% fewer clicks across all flows.**

---

## 6. Implementation Phases

### Phase 1: Visual Refresh (Foundation)
1. Update color palette (CSS custom properties + Tailwind config)
2. Update typography (Inter font, tighter scale)
3. Update border-radius, shadows, spacing tokens
4. Redesign todo card visual (priority bar, inline labels, ⋯ button)
5. Redesign board card (progress bar, always-visible menu)
6. Update page backgrounds (warm gradient)

### Phase 2: Side Panel + Auto-Save (Biggest UX Win)
1. Build `DetailPanel` component (slide-in from right, 400px)
2. Migrate all TodoEditModal fields to DetailPanel
3. Implement auto-save with debounce on all fields
4. Add save status indicator (saving → saved ✓)
5. Add mobile bottom sheet variant
6. Remove TodoEditModal

### Phase 3: Context Menu + Quick Actions
1. Build reusable `ContextMenu` component
2. Add context menu to todo cards (priority, due date, labels, move, delete)
3. Add ⋯ button trigger on cards
4. Implement undo-toast pattern for deletions (replace confirmation modals)
5. Add context menu to board cards

### Phase 4: Inline Flows
1. Inline board creation (ghost card in grid)
2. Single-click column rename
3. Inline label creation in side panel
4. Column header redesign (entire header as drag handle, dropdown menu)
5. Inline board description editing

### Phase 5: Keyboard & Mobile
1. Expand keyboard shortcuts (arrow navigation, P/L/D quick actions)
2. Mobile single-column swipe view
3. Mobile bottom sheet for card detail
4. Touch-optimized context menu (long-press)

---

## 7. Components to Create

| Component | Purpose |
|-----------|---------|
| `DetailPanel` | Right-side sliding panel for card editing |
| `ContextMenu` | Right-click / ⋯ menu for quick actions |
| `UndoToast` | Toast with countdown bar and undo button |
| `AutoSaveField` | Wrapper that auto-saves on blur/debounce |
| `InlineBoardCreator` | Ghost card that transforms into creation form |
| `ColorDot` | Small priority indicator dot |
| `ProgressBar` | Thin completion bar for board cards |
| `BottomSheet` | Mobile slide-up panel |
| `ColumnSwiper` | Mobile single-column view with swipe |

## 8. Components to Remove

| Component | Replaced By |
|-----------|------------|
| `TodoEditModal` | `DetailPanel` (side panel) |
| Board creation `Modal` | `InlineBoardCreator` |
| Board description `Modal` | Inline editing on board page |
| Delete confirmation `Modal` (all 3) | `UndoToast` |
| Column edit `Modal` | Inline editing + dropdown menu |
| `LabelManager` modal | Inline label management in `DetailPanel` |

**Net modal reduction: 7 modals removed. Only the Keyboard Shortcuts Help modal remains.**

---

## 9. Files to Modify

### Core changes:
- `apps/web/src/index.css` — New CSS custom properties, updated global styles
- `apps/web/tailwind.config.*` — Extended palette, font family
- `apps/web/src/components/board/BoardView.tsx` — Integrate DetailPanel, remove modal
- `apps/web/src/components/board/BoardList.tsx` — Inline creation, card redesign
- `apps/web/src/components/column/BoardColumn.tsx` — Header redesign, single-click edit
- `apps/web/src/components/todo/TodoCard.tsx` — Visual redesign, context menu, priority bar
- `apps/web/src/components/todo/TodoEditModal.tsx` — Replace with DetailPanel
- `apps/web/src/components/ui/Toast.tsx` — Undo toast variant, bottom-center positioning
- `apps/web/src/components/ui/Modal.tsx` — Simplify (fewer use cases)

### New files:
- `apps/web/src/components/ui/DetailPanel.tsx`
- `apps/web/src/components/ui/ContextMenu.tsx`
- `apps/web/src/components/ui/UndoToast.tsx`
- `apps/web/src/components/ui/AutoSaveField.tsx`
- `apps/web/src/components/ui/ProgressBar.tsx`
- `apps/web/src/components/ui/BottomSheet.tsx`
- `apps/web/src/components/board/InlineBoardCreator.tsx`

---

## 10. Mobile Experience Overhaul

The current mobile experience is essentially broken. 45 issues were identified across the codebase. This section addresses every category.

### 10.1 Root Causes

| Cause | Impact |
|-------|--------|
| Fixed `w-72 min-w-72` (288px) on all columns | Columns can't fit on phones; forced horizontal scroll even for 1 column |
| Hover-dependent affordances (`group-hover:opacity-100`) | Drag handles, delete buttons, tooltips invisible on touch |
| `mouseEnter`/`mouseLeave` tooltips | Column descriptions inaccessible on mobile |
| Touch targets below 44x44px | Checkboxes (18px), toolbar buttons (24px), close buttons (20px) |
| Modals assume desktop widths | `max-w-2xl` (672px) description modal wider than any phone |
| No mobile-specific layout | Same multi-column horizontal scroll on all viewport sizes |
| DnD sensor tuning | 200ms touch delay feels laggy; 8px pointer distance conflicts with scroll |

### 10.2 Column Layout: Single-Column Swipe on Mobile

**Current**: All columns render side-by-side at 288px each. On a 375px phone with 24px padding on each side, the user sees `375 - 48 = 327px`, so one column barely fits and there's no hint that more columns exist. Scrolling horizontally is awkward on touch.

**Fix**: On viewports < 768px, switch to a **single-column view** with horizontal swipe/pagination.

```
Mobile (< 768px):
┌────────────────────────────────┐
│  ← BACKLOG (1/3)          →   │  ← swipe or tap arrows
│                                │
│  ┌──────────────────────────┐  │
│  │ Fix login bug         ⋯  │  │  ← card fills available width
│  │ 🟡 Med · Mar 15          │  │
│  │ [bug] [frontend]         │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ Add dark mode         ⋯  │  │
│  └──────────────────────────┘  │
│                                │
│  [+ Add card]                  │
│                                │
│  ○ ● ○                        │  ← dot indicators
└────────────────────────────────┘
```

Implementation:
- Wrap columns in a `snap-x snap-mandatory` scroll container
- Each column becomes `w-full snap-center` on mobile, `w-72` on desktop
- Add dot pagination indicators at the bottom
- Add tap-to-navigate arrows (< >) on the column header
- Column header shows position: "BACKLOG (1/3)"
- Use CSS `scroll-snap-type: x mandatory` for native-feeling snap

```tsx
// BoardView.tsx — responsive column container
<div className={cn(
  // Desktop: horizontal scroll with fixed-width columns
  'md:flex md:gap-4 md:overflow-x-auto',
  // Mobile: full-width snap scroll
  'flex gap-0 overflow-x-auto snap-x snap-mandatory md:snap-none'
)}>
  {sortedColumns.map((column) => (
    <div className={cn(
      'md:w-72 md:min-w-72 md:flex-shrink-0',
      'w-full min-w-full snap-center flex-shrink-0 px-3 md:px-0'
    )}>
      <BoardColumn column={column} ... />
    </div>
  ))}
</div>
```

### 10.3 Touch Targets: Meet 44x44px Minimum

Every interactive element must have a minimum 44x44px touch target area (Apple HIG / WCAG 2.5.8).

| Element | Current Size | Fix |
|---------|-------------|-----|
| Todo checkbox | 18x18px | Increase to `h-5 w-5` with `p-2.5` wrapper (44px total) |
| RichTextEditor toolbar buttons | ~24x24px | Increase to `p-2.5` (44px) on mobile, keep `p-1.5` on desktop |
| Modal close (X) button | ~20x20px | Change to `p-3` with `h-5 w-5` icon (44px total) |
| Column ⋯ menu button | ~28x28px | Change to `p-2.5` (44px) |
| Description toggle (FileText icon) | ~24x24px | Change to `p-2.5` (44px) |
| Card ⋯ action button | ~24x24px | Change to `p-2.5` (44px) |
| Add card / Add column buttons | 32px (h-8 sm) | Change to `min-h-[44px]` on mobile |

Implementation pattern:
```tsx
// Use responsive padding: bigger on touch, smaller on desktop
<button className="p-2.5 md:p-1.5 touch-manipulation">
  <Icon className="h-5 w-5 md:h-4 md:w-4" />
</button>
```

Add `touch-manipulation` to all interactive elements to remove 300ms tap delay.

### 10.4 Drag & Drop on Mobile

**Current issues:**
- Drag handles use `opacity-0 group-hover:opacity-100` — invisible on touch
- 200ms touch delay feels sluggish
- 8px pointer distance can conflict with scroll gestures
- No visual cue that items are draggable

**Fixes:**

1. **Always show drag affordance on mobile**:
```tsx
// TodoCard.tsx — drag handle visibility
<div className={cn(
  'md:opacity-0 md:group-hover:opacity-100',  // hide on desktop until hover
  'opacity-100'                                 // always visible on mobile
)}>
  <GripVertical className="h-4 w-4" />
</div>
```

2. **Tune touch sensor for better feel**:
```tsx
useSensor(TouchSensor, {
  activationConstraint: {
    delay: 150,       // was 200ms — slightly faster
    tolerance: 5,     // was 8px — less tolerance = easier to trigger
  },
})
```

3. **Long-press visual feedback**: When the user long-presses a card (150ms), show a subtle scale animation + haptic-like visual pulse before drag activates:
```tsx
// On touch start (before drag activates)
<motion.div
  whileTap={{ scale: 1.02, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
  transition={{ delay: 0.1 }}
>
```

4. **Card move via context menu as alternative**: On mobile, long-press opens context menu with "Move to → [column]" option. This avoids drag entirely for cross-column moves.

### 10.5 Tooltips: Replace with Tap-to-Toggle on Mobile

**Current**: Column descriptions use `onMouseEnter`/`onMouseLeave` — completely non-functional on touch.

**Fix**: On mobile, tooltips become tap-to-toggle popovers:
```tsx
// Instead of hover events:
const isMobile = useMediaQuery('(max-width: 767px)');

<button
  onClick={isMobile ? () => setShowTooltip(!showTooltip) : undefined}
  onMouseEnter={isMobile ? undefined : () => setShowTooltip(true)}
  onMouseLeave={isMobile ? undefined : () => setShowTooltip(false)}
>
```

Or better: with the column header redesign (Section 2.4), descriptions are shown inline — no tooltip needed at all.

### 10.6 Modals on Mobile: Full-Screen Sheets

Any modals that remain (keyboard shortcuts help) should become full-screen bottom sheets on mobile:

```tsx
// Modal.tsx — responsive behavior
<motion.div className={cn(
  // Desktop: centered dialog
  'md:max-w-md md:rounded-xl md:mx-auto md:my-auto',
  // Mobile: full-width bottom sheet
  'fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] overflow-y-auto',
  'md:relative md:inset-auto md:max-h-[90vh]'
)}>
```

Add a **swipe-down-to-dismiss** gesture on mobile:
```tsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (info.offset.y > 100) onClose();
  }}
>
```

### 10.7 Mobile Header Optimization

**Current**: Button labels hidden on mobile (`hidden sm:inline`), leaving only cryptic icons.

**Fix**: On mobile, replace the header toolbar with a single `⋯` overflow menu:

```
Desktop header:
  ← Board Name    [Edit Description] [Labels]

Mobile header:
  ← Board Name                    ⋯
                                  │ Edit Description │
                                  │ Labels           │
                                  │ Keyboard Help    │
                                  └──────────────────┘
```

### 10.8 Mobile Board List

**Current**: Grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — single column on mobile is fine, but cards are full-width with lots of wasted vertical space.

**Fix**: Make board cards more compact on mobile:
```tsx
// BoardCard — responsive layout
<div className={cn(
  'md:min-h-[160px]',          // desktop: taller cards with description
  'min-h-[80px] flex flex-row items-center gap-3 p-3',  // mobile: compact horizontal
  'md:flex-col md:items-start md:p-5'
)}>
```

Mobile board card (compact horizontal):
```
┌──────────────────────────────────────────┐
│  Sprint Board  ·  3 cols · 12 tasks  ⋯  │
│  ████████░░  8/12                        │
└──────────────────────────────────────────┘
```

### 10.9 Rich Text Editor on Mobile

**Current**: Toolbar wraps to multiple rows, each button is 24px, min-height 120px — takes half the mobile viewport.

**Fix**:
1. **Collapse toolbar on mobile**: Show only Bold, Italic, List, Link (4 buttons). Put rest in a `⋯` overflow.
2. **Increase button sizes to 44px** on mobile.
3. **Reduce min-height** to 80px on mobile.
4. **Position toolbar at bottom** on mobile (above keyboard, like iOS Notes).

```tsx
// RichTextEditor toolbar — responsive
<div className={cn(
  'flex flex-wrap gap-1 p-1.5',
  'md:sticky md:top-0',
  // Mobile: fixed to bottom, above keyboard
  'fixed bottom-0 left-0 right-0 z-50 bg-white border-t md:relative md:border-t-0'
)}>
  {/* Show all on desktop, minimal on mobile */}
  <ToolbarButton icon={Bold} /> {/* Always visible */}
  <ToolbarButton icon={Italic} /> {/* Always visible */}
  <ToolbarButton icon={List} /> {/* Always visible */}
  <ToolbarButton icon={Link} /> {/* Always visible */}
  <div className="hidden md:contents">
    {/* Desktop-only: Heading, Code, Quote, etc. */}
  </div>
  <ToolbarOverflowMenu className="md:hidden" />
</div>
```

### 10.10 Mobile-Specific Additions

#### Add to viewport meta:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```
- `viewport-fit=cover` handles iPhone notch/safe-area correctly.

#### Safe area padding:
```css
.bottom-bar, .bottom-sheet {
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### Prevent accidental zoom on double-tap:
```css
* { touch-action: manipulation; }
```

#### `useMediaQuery` hook (needed throughout):
```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// Usage:
const isMobile = useMediaQuery('(max-width: 767px)');
```

### 10.11 Mobile Issue Summary

| Category | Issues | Fix |
|----------|--------|-----|
| Column layout (CRITICAL) | Fixed 288px width, can't use board | Single-column swipe view on mobile |
| Touch targets (HIGH) | 8 elements below 44px | Responsive padding, larger icons |
| Drag & drop (HIGH) | Invisible handles, laggy, conflicts with scroll | Always-visible handles, tuned sensor, context menu fallback |
| Modals (HIGH) | Too wide, no keyboard awareness | Bottom sheets with swipe-dismiss |
| Tooltips (MEDIUM) | Mouse-only, descriptions inaccessible | Tap-to-toggle or inline display |
| Header (MEDIUM) | Icon-only buttons, no labels | Overflow menu |
| Rich text editor (MEDIUM) | Toolbar too large, buttons too small | Collapsed toolbar, bottom-positioned |
| Viewport (LOW) | No safe-area handling, zoom issues | viewport-fit, touch-action |

---

## 11. Optimistic UI Updates

The deployed API is slow. Every mutation currently waits for the server response before updating the UI, making the app feel laggy. The fix: **optimistic updates** on every mutation using TanStack Query's `onMutate` → `onError` rollback pattern.

### 11.1 The Problem

Current mutation pattern (all 12 hooks):
```tsx
useMutation({
  mutationFn: async (data) => { /* API call */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [...] });  // Refetch = another wait
  },
});
```

The user clicks "Add card" → waits 1-3s for API → sees the card appear → invalidation triggers another fetch → UI potentially flickers. On a slow connection this feels broken.

### 11.2 The Pattern

Every mutation gets three handlers:

```tsx
useMutation({
  mutationFn: async (data) => { /* API call */ },

  onMutate: async (variables) => {
    // 1. Cancel in-flight queries (prevent overwriting our optimistic data)
    await queryClient.cancelQueries({ queryKey: [...] });

    // 2. Snapshot current data (for rollback)
    const previous = queryClient.getQueryData([...]);

    // 3. Optimistically update the cache
    queryClient.setQueryData([...], (old) => /* merge new data */);

    // 4. Return context for rollback
    return { previous };
  },

  onError: (_err, _variables, context) => {
    // Rollback to snapshot
    queryClient.setQueryData([...], context?.previous);
    // Show error toast
  },

  onSettled: () => {
    // Always refetch to ensure server truth
    queryClient.invalidateQueries({ queryKey: [...] });
  },
});
```

### 11.3 Hook-by-Hook Implementation

#### `useCreateBoard` — Optimistic board appears in list instantly

```tsx
export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (board: { name: string; description?: string; templateId?: string }) => {
      const { data } = await apiClient.post<Board>('/boards', board);
      return data;
    },
    onMutate: async (newBoard) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.all });
      const previous = queryClient.getQueryData<Board[]>(boardKeys.all);

      const optimisticBoard: Board = {
        id: `temp-${Date.now()}`,  // Temporary ID, replaced on server response
        name: newBoard.name,
        description: newBoard.description || '',
        position: (previous?.length ?? 0),
        userId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columns: [],
        todoCount: 0,
      };

      queryClient.setQueryData<Board[]>(boardKeys.all, (old) =>
        [...(old ?? []), optimisticBoard]
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
```

#### `useDeleteBoard` — Board vanishes instantly, undo via toast

```tsx
export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/boards/${id}`);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.all });
      const previous = queryClient.getQueryData<Board[]>(boardKeys.all);

      queryClient.setQueryData<Board[]>(boardKeys.all, (old) =>
        (old ?? []).filter((b) => b.id !== deletedId)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
```

#### `useUpdateBoard` — Name/description changes reflect instantly

```tsx
export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string }) => {
      const { data } = await apiClient.put<Board>(`/boards/${id}`, updates);
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: boardKeys.all });

      const previousDetail = queryClient.getQueryData<Board>(boardKeys.detail(id));
      const previousAll = queryClient.getQueryData<Board[]>(boardKeys.all);

      // Update detail cache
      if (previousDetail) {
        queryClient.setQueryData<Board>(boardKeys.detail(id), {
          ...previousDetail,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      // Update list cache
      queryClient.setQueryData<Board[]>(boardKeys.all, (old) =>
        (old ?? []).map((b) => b.id === id ? { ...b, ...updates } : b)
      );

      return { previousDetail, previousAll };
    },
    onError: (_err, vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(boardKeys.detail(vars.id), context.previousDetail);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(boardKeys.all, context.previousAll);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.id) });
    },
  });
}
```

#### `useCreateTodo` — Card appears in column instantly

```tsx
export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, boardId, title, ...rest }) => {
      const { data } = await apiClient.post<Todo>('/todos', { columnId, title, ...rest });
      return { ...data, boardId };
    },
    onMutate: async ({ columnId, boardId, title, priority, dueDate }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,
        title,
        priority: priority ?? 'MEDIUM',
        dueDate,
        position: 9999,  // Will be corrected by server
        archived: false,
        columnId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        labels: [],
      };

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          todoCount: (old.todoCount ?? 0) + 1,
          columns: old.columns.map((col) =>
            col.id === columnId
              ? { ...col, todos: [...(col.todos ?? []), optimisticTodo] }
              : col
          ),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
```

#### `useDeleteTodo` — Card vanishes instantly

```tsx
export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      await apiClient.delete(`/todos/${id}`);
      return { id, boardId };
    },
    onMutate: async ({ id, boardId }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          todoCount: Math.max(0, (old.todoCount ?? 0) - 1),
          columns: old.columns.map((col) => ({
            ...col,
            todos: (col.todos ?? []).filter((t) => t.id !== id),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
```

#### `useUpdateTodo` — Priority, due date, labels, title update instantly

```tsx
export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, ...updates }) => {
      const { data } = await apiClient.put<Todo>(`/todos/${id}`, updates);
      return { ...data, boardId, hadLabelUpdate: 'labelIds' in updates };
    },
    onMutate: async ({ id, boardId, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map((col) => ({
            ...col,
            todos: (col.todos ?? []).map((todo) =>
              todo.id === id
                ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
                : todo
            ),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      if ('labelIds' in vars) {
        queryClient.invalidateQueries({ queryKey: labelKeys.all });
      }
    },
  });
}
```

#### `useMoveTodo` — Card moves to target column instantly

```tsx
export function useMoveTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, columnId, position }) => {
      const { data } = await apiClient.patch<Todo>(`/todos/${id}/move`, { columnId, position });
      return { ...data, boardId };
    },
    onMutate: async ({ id, boardId, columnId, position }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;

        // Find the todo being moved
        let movedTodo: Todo | undefined;
        const columnsWithRemoved = old.columns.map((col) => {
          const found = (col.todos ?? []).find((t) => t.id === id);
          if (found) movedTodo = { ...found, columnId, position };
          return {
            ...col,
            todos: (col.todos ?? []).filter((t) => t.id !== id),
          };
        });

        if (!movedTodo) return old;

        // Insert into target column at position
        const columnsWithAdded = columnsWithRemoved.map((col) => {
          if (col.id !== columnId) return col;
          const newTodos = [...(col.todos ?? [])];
          newTodos.splice(position, 0, movedTodo!);
          // Reindex positions
          return {
            ...col,
            todos: newTodos.map((t, i) => ({ ...t, position: i })),
          };
        });

        return { ...old, columns: columnsWithAdded };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
    },
  });
}
```

#### `useReorderTodos` — Reorder reflects instantly (drag-and-drop)

```tsx
export function useReorderTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, columnId, todoIds }) => {
      const todos = todoIds.map((id, index) => ({ id, position: index }));
      await apiClient.patch('/todos/reorder', { columnId, todos });
      return boardId;
    },
    onMutate: async ({ boardId, columnId, todoIds }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map((col) => {
            if (col.id !== columnId) return col;
            // Reorder todos according to the new ID order
            const todoMap = new Map((col.todos ?? []).map((t) => [t.id, t]));
            const reordered = todoIds
              .map((id, index) => {
                const todo = todoMap.get(id);
                return todo ? { ...todo, position: index } : null;
              })
              .filter(Boolean) as Todo[];
            return { ...col, todos: reordered };
          }),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (boardId) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId!) });
    },
  });
}
```

#### `useReorderColumns` — Column order updates instantly (drag-and-drop)

```tsx
export function useReorderColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, columnIds }) => {
      const columns = columnIds.map((id, index) => ({ id, position: index }));
      await apiClient.patch('/columns/reorder', { boardId, columns });
      return boardId;
    },
    onMutate: async ({ boardId, columnIds }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        const colMap = new Map(old.columns.map((c) => [c.id, c]));
        const reordered = columnIds
          .map((id, index) => {
            const col = colMap.get(id);
            return col ? { ...col, position: index } : null;
          })
          .filter(Boolean) as Column[];
        return { ...old, columns: reordered };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (boardId) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId!) });
    },
  });
}
```

#### `useCreateColumn` — Column appears instantly

```tsx
export function useCreateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, name, wipLimit }) => {
      const { data } = await apiClient.post<Column>(`/boards/${boardId}/columns`, { name, wipLimit });
      return data;
    },
    onMutate: async ({ boardId, name, wipLimit }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      const optimisticColumn: Column = {
        id: `temp-${Date.now()}`,
        name,
        wipLimit,
        position: previousBoard?.columns.length ?? 0,
        boardId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        todos: [],
      };

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return { ...old, columns: [...old.columns, optimisticColumn] };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
```

#### `useDeleteColumn` — Column vanishes instantly

```tsx
export function useDeleteColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, moveToColumnId }) => {
      await apiClient.delete(`/columns/${id}`, { data: { moveToColumnId } });
      return { id, boardId };
    },
    onMutate: async ({ id, boardId }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.filter((c) => c.id !== id),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
```

#### `useCreateLabel` / `useUpdateLabel` / `useDeleteLabel` — Same pattern

Apply the identical cancel → snapshot → optimistic update → rollback pattern to all three label mutations against the `labelKeys.all` query key.

### 11.4 Optimistic UI Visual Feedback

When a mutation is in-flight (optimistic data shown, waiting for server confirmation):

1. **Temporary items get a subtle pulse**: Cards/columns with `temp-` IDs get a gentle opacity pulse (0.7 → 1.0, 1s loop) to indicate they're not yet confirmed.

```tsx
<div className={cn(
  todo.id.startsWith('temp-') && 'animate-pulse opacity-80'
)}>
```

2. **On error rollback, flash red briefly**: If the server rejects the mutation and we rollback, show a 300ms red flash on the affected area + error toast.

3. **No spinners or "Creating..." text for inline actions**: The optimistic update IS the feedback. Only show error if it fails.

### 11.5 Summary of All Mutations to Update

| Hook | Query Keys Affected | Optimistic Behavior |
|------|-------------------|---------------------|
| `useCreateBoard` | `boardKeys.all` | New board appears in list |
| `useUpdateBoard` | `boardKeys.all`, `boardKeys.detail(id)` | Name/description updates in-place |
| `useDeleteBoard` | `boardKeys.all` | Board removed from list |
| `useCreateColumn` | `boardKeys.detail(boardId)`, `boardKeys.all` | Column appears in board |
| `useUpdateColumn` | `boardKeys.detail(boardId)` | Column name/description updates |
| `useDeleteColumn` | `boardKeys.detail(boardId)`, `boardKeys.all` | Column removed from board |
| `useReorderColumns` | `boardKeys.detail(boardId)` | Columns reorder instantly |
| `useCreateTodo` | `boardKeys.detail(boardId)`, `boardKeys.all` | Card appears in column |
| `useUpdateTodo` | `boardKeys.detail(boardId)` | Card fields update in-place |
| `useDeleteTodo` | `boardKeys.detail(boardId)`, `boardKeys.all` | Card removed from column |
| `useMoveTodo` | `boardKeys.detail(boardId)` | Card moves to target column |
| `useReorderTodos` | `boardKeys.detail(boardId)` | Cards reorder within column |
| `useArchiveTodo` | `boardKeys.detail(boardId)`, `boardKeys.all` | Card disappears (archived) |
| `useCreateLabel` | `labelKeys.all` | Label appears in list |
| `useUpdateLabel` | `labelKeys.all`, `labelKeys.detail(id)` | Label updates in-place |
| `useDeleteLabel` | `labelKeys.all` | Label removed from list |

**Total: 16 mutations, all optimistic.**

---

## 12. Updated Implementation Phases

### Phase 1: Optimistic UI (Immediate perceived speed improvement)
1. Add optimistic updates to all 16 mutation hooks
2. Add rollback error handling with error toasts
3. Add subtle pulse animation for temporary items
4. Test rollback behavior on network failures

### Phase 2: Visual Refresh (Foundation)
1. Update color palette (CSS custom properties + Tailwind config)
2. Update typography (Inter font, tighter scale)
3. Update border-radius, shadows, spacing tokens
4. Redesign todo card visual (priority bar, inline labels, ⋯ button)
5. Redesign board card (progress bar, always-visible menu)
6. Update page backgrounds (warm gradient)

### Phase 3: Mobile Layout (Fix the broken experience)
1. Single-column swipe view for < 768px
2. Touch target sizes (44px minimum everywhere)
3. Always-visible drag handles on mobile
4. Bottom sheet modals (swipe-dismiss)
5. Responsive header with overflow menu
6. Safe area handling, `touch-action: manipulation`

### Phase 4: Side Panel + Auto-Save (Biggest UX Win)
1. Build `DetailPanel` component (slide-in from right, 400px)
2. Migrate all TodoEditModal fields to DetailPanel
3. Implement auto-save with debounce on all fields
4. Add save status indicator (saving → saved checkmark)
5. Mobile bottom sheet variant of DetailPanel
6. Remove TodoEditModal

### Phase 5: Context Menu + Quick Actions
1. Build reusable `ContextMenu` component
2. Add context menu to todo cards (priority, due date, labels, move, delete)
3. Add ⋯ button trigger on cards
4. Implement undo-toast pattern for deletions (replace confirmation modals)
5. Add context menu to board cards
6. Mobile: long-press triggers context menu

### Phase 6: Inline Flows
1. Inline board creation (ghost card in grid)
2. Single-click column rename
3. Inline label creation in side panel
4. Column header redesign (entire header as drag handle, dropdown menu)
5. Inline board description editing

### Phase 7: Keyboard & Polish
1. Expand keyboard shortcuts (arrow navigation, P/L/D quick actions)
2. Rich text editor mobile toolbar
3. Mobile-compact board cards
4. Final touch target audit

---

## 13. Success Metrics

- Average clicks to complete top-5 actions reduced by 40%+
- Zero confirmation modals for non-destructive actions
- All edits auto-save (no "Save" buttons in editing flows)
- Every interactive element has a visible affordance (no hover-to-reveal)
- Mobile users can complete all flows using single-column swipe view
- All mutations feel instant (< 50ms perceived latency via optimistic updates)
- All touch targets meet 44x44px minimum
- Zero mouse-only interactions (everything works on touch)
