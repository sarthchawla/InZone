# InZone Frontend UX Overhaul - Implementation Plan (v6)

## Current State Assessment

Most PRD features already implemented (Tiptap, Framer Motion, Skeletons, DnD overlays).

### Already Implemented
- Tiptap Rich Text Editor with StarterKit, Placeholder, Link, TaskList, TaskItem, Highlight, Typography
- Fixed toolbar + Bubble menu + markdown import/export
- Framer Motion page transitions, modal spring animations, toast spring animations
- Board card stagger entrance, column stagger entrance
- dnd-kit DragOverlay, cross-column movement, column reordering
- Skeleton loaders (boards, columns, todo cards)
- Card hover lift + press feedback, button active:scale
- Drag skeleton placeholder at origin + drop insertion line
- Empty states for boards and columns
- Board/Column name inline editing
- Board description editing with RichTextEditor

## Remaining Implementation

### Phase 1: DnD Polish
- Improve drop animation easing (spring physics)
- Better column DragOverlay visual
- Layout animations on todo items for smoother reflow

### Phase 3: Animation Refinement
- AnimatePresence on todo cards for enter/exit
- Stagger animation on todo cards within columns

### Phase 4: UX Polish
- Board cards: progress bar, relative last-updated time
- WIP limit warnings: amber/red graduated colors
- Tooltips on icon-only buttons
- Keyboard shortcuts: N (new card), E (edit), Delete, ? (help)
- useKeyboardShortcuts hook
- KeyboardShortcutsHelp modal

### Phase 5: Tests
- Fix any existing test failures
- Update tests for changed components
- Ensure build + tests pass
- Output RALPH_COMPLETE

## Files to Modify
- `BoardView.tsx`: DnD polish, keyboard shortcuts integration
- `BoardColumn.tsx`: WIP limit improvement, todo stagger animation
- `TodoCard.tsx`: Layout animation wrapper
- `BoardList.tsx`: Board card enrichment (progress, relative time)
- New: `hooks/useKeyboardShortcuts.ts`
- New: `components/ui/KeyboardShortcutsHelp.tsx`
- All test files as needed
