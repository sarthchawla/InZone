# PRD: InZone Frontend UX Overhaul

## Overview

Comprehensive UX improvement pass for the InZone kanban board application. The goal is to fix the three biggest pain points — drag & drop feel, markdown editing quality, and overall UI polish — using the installed agent skills as guidance.

## Skills to Use

Before starting each section, invoke the corresponding skill to get expert guidance:

1. **`implementing-drag-drop`** — For drag & drop improvements
2. **`tiptap-editor`** — For markdown/rich text editor replacement
3. **`interaction-design`** — For overall UX patterns and micro-interactions
4. **`ui-animation`** — For animation system and motion design
5. **`framer-motion-animator`** — For Framer Motion implementation
6. **`web-design-guidelines`** — For accessibility and design audit (already installed)
7. **`vercel-react-best-practices`** — For React performance (already installed)
8. **`frontend-design`** — For design quality (already installed)

## Current State

- **Stack**: React + TypeScript + Tailwind CSS + React Router + TanStack Query
- **Drag & Drop**: `@dnd-kit/core` + `@dnd-kit/sortable` (v6.3.1/v10.0.0)
- **Markdown**: Raw textarea with no preview or rich editing
- **Animations**: Basic `transition-colors`, `transition-opacity`, `animate-spin` only
- **No**: Page transitions, skeleton loaders, spring animations, micro-interactions

## Phase 1: Fix Drag & Drop (Priority: HIGH)

**Skill**: Invoke `implementing-drag-drop` skill first for best practices.

### Problems
- Drag feels janky and unresponsive
- No smooth drop animations
- Visual feedback during drag is minimal (just opacity + rotation)
- Cross-column movement feels awkward
- No placeholder/ghost element at drop target

### Requirements
1. **Smooth drag initiation**: Add spring-based pickup animation (scale up slightly, add shadow)
2. **Better drag overlay**: Use `DragOverlay` from dnd-kit with a styled clone of the card (not just opacity change)
3. **Drop placeholder**: Show a visible placeholder where the item will land
4. **Spring animations**: Add spring physics for item reflow when dragging between positions
5. **Touch support**: Ensure mobile drag works with proper touch delay
6. **Keyboard DnD**: Support keyboard-based reordering for accessibility
7. **Column drag**: Improve column reordering with horizontal snap feel

### Files to Modify
- `apps/web/src/components/board/BoardView.tsx` — Main DnD container
- `apps/web/src/components/column/BoardColumn.tsx` — Column DnD + todo sorting
- `apps/web/src/components/todo/TodoCard.tsx` — Draggable card styling

## Phase 2: Replace Markdown Editor (Priority: HIGH)

**Skill**: Invoke `tiptap-editor` skill first for integration guidance.

### Problems
- Plain textarea for todo descriptions — no formatting preview
- No toolbar for markdown shortcuts
- Users have to know markdown syntax
- No image or link support
- Board description editing is also a raw textarea

### Requirements
1. **Install Tiptap**: Replace textarea with Tiptap rich text editor
2. **Extensions**: Enable these Tiptap extensions:
   - StarterKit (bold, italic, headings, lists, code blocks, blockquotes)
   - Placeholder
   - Link (with paste detection)
   - TaskList + TaskItem (checkboxes)
   - Highlight
   - Typography (smart quotes, etc.)
3. **Toolbar**: Floating bubble menu for selection formatting + fixed toolbar for block-level formatting
4. **Markdown import/export**: Store as markdown in DB, render as rich text in editor
5. **Apply to**: Todo description in `TodoEditModal.tsx` AND board description editing
6. **Styling**: Match the existing Tailwind design system (gray borders, blue focus rings)

### Files to Modify
- `apps/web/src/components/todo/TodoEditModal.tsx` — Main editor integration
- `apps/web/src/components/board/BoardView.tsx` — Board description editor
- New: `apps/web/src/components/ui/RichTextEditor.tsx` — Reusable editor component

### Dependencies to Add
```
@tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-highlight @tiptap/extension-typography
```

## Phase 3: Animation System (Priority: MEDIUM)

**Skills**: Invoke `ui-animation` and `framer-motion-animator` skills first.

### Problems
- App feels static and lifeless
- No entrance/exit animations on components
- No page transitions
- Loading states are just spinners (no skeletons)
- No micro-interactions on user actions

### Requirements
1. **Install Framer Motion**: Add `framer-motion` as animation library
2. **Page transitions**: Animate route changes (fade + subtle slide)
3. **List animations**: Stagger-animate board cards when loading
4. **Modal animations**: Scale + fade for modal open/close
5. **Toast animations**: Replace CSS `slide-in` with Framer Motion spring
6. **Skeleton loaders**: Replace spinners with skeleton loading states for:
   - Board list (skeleton cards)
   - Board view (skeleton columns)
   - Todo cards (skeleton cards)
7. **Micro-interactions**:
   - Button press feedback (scale down on click)
   - Card hover lift (translateY + shadow)
   - Checkbox check animation
   - Success/error state animations
8. **Drag animations**: Use Framer Motion layout animations alongside dnd-kit for smoother reflows

### Files to Modify
- `apps/web/src/App.tsx` — Page transition wrapper
- `apps/web/src/components/board/BoardList.tsx` — Stagger animation + skeletons
- `apps/web/src/components/board/BoardView.tsx` — Column loading skeletons
- `apps/web/src/components/column/BoardColumn.tsx` — Todo list animations
- `apps/web/src/components/todo/TodoCard.tsx` — Hover + press interactions
- `apps/web/src/components/ui/Modal.tsx` — Animated modal
- `apps/web/src/components/ui/Toast.tsx` — Spring toast animation
- New: `apps/web/src/components/ui/Skeleton.tsx` — Skeleton loader component

### Dependencies to Add
```
framer-motion
```

## Phase 4: Overall UX Polish (Priority: MEDIUM)

**Skills**: Invoke `interaction-design` and `web-design-guidelines` skills.

### Problems
- Empty states are plain text, not inviting
- No visual hierarchy — everything looks the same weight
- Color usage is inconsistent
- No feedback on async operations beyond loading spinners
- Board cards could be more informative

### Requirements
1. **Empty states**: Design illustrated/iconographic empty states for:
   - No boards yet
   - Empty column
   - No labels
2. **Visual hierarchy**:
   - Use font weight and size to create clear hierarchy
   - Add subtle section dividers
   - Improve card information density
3. **Color system**:
   - Define a consistent color palette beyond default Tailwind grays
   - Priority colors should be more distinct and accessible
   - Column WIP limit warnings should be more visible
4. **Async feedback**:
   - Optimistic UI updates (instant feedback, rollback on error)
   - Inline loading states on buttons (spinner inside button)
   - Success micro-animations after create/update/delete
5. **Board cards**: Add visual previews — show column count, progress bars, last updated
6. **Tooltips**: Add descriptive tooltips on icon-only buttons
7. **Keyboard shortcuts**:
   - `N` to create new todo in focused column
   - `E` to edit selected card
   - `Delete`/`Backspace` to delete with confirmation
   - `?` to show shortcuts help

### Files to Modify
- Multiple component files across `components/board/`, `components/column/`, `components/todo/`, `components/ui/`

## Phase 5: Update Tests (Priority: HIGH)

After each phase, update the corresponding tests.

### Requirements
1. **Unit tests**: Update component tests to account for:
   - New Tiptap editor in TodoEditModal
   - Framer Motion animated components (mock `framer-motion`)
   - New skeleton components
   - Updated DnD behavior
2. **Integration tests**: Ensure drag & drop still works end-to-end
3. **Accessibility tests**: Add tests for keyboard navigation and ARIA attributes
4. **Visual regression**: Consider adding visual snapshot tests for key states

### Test Files to Update
- `apps/web/src/components/todo/TodoEditModal.test.tsx`
- `apps/web/src/components/board/BoardView.test.tsx`
- `apps/web/src/components/board/BoardList.test.tsx`
- `apps/web/src/components/column/BoardColumn.test.tsx`
- `apps/web/src/components/todo/TodoCard.test.tsx`
- `apps/web/src/components/ui/Modal.test.tsx`
- `apps/web/src/components/ui/Toast.test.tsx`
- New tests for any new components

## Execution Order

1. Phase 1 (Drag & Drop) — fixes the most painful interaction
2. Phase 2 (Markdown Editor) — fixes the second biggest pain point
3. Phase 3 (Animations) — adds polish and life to the app
4. Phase 4 (UX Polish) — refinement pass on everything
5. Phase 5 (Tests) — run after each phase, comprehensive pass at the end

## Completion Criteria

For each phase, before marking complete:
- [ ] All changes work without console errors
- [ ] Existing tests pass (update as needed)
- [ ] New functionality has test coverage
- [ ] Mobile/responsive behavior verified
- [ ] Accessibility not degraded (keyboard nav, screen reader)
- [ ] `pnpm build` succeeds without errors
- [ ] `pnpm test` passes

When ALL phases are complete, output: **RALPH_COMPLETE**

## Important Notes

- Use `pnpm` for all package management commands
- Follow existing code patterns (hooks in `hooks/`, components in `components/`)
- Use the `cn()` utility from `lib/utils` for conditional Tailwind classes
- Keep bundle size in mind — tree-shake Framer Motion, lazy-load Tiptap
- Do NOT break existing functionality while improving UX
- Show changes for review before committing
