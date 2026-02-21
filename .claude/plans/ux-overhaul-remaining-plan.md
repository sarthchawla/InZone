# UX Overhaul Remaining Work Plan

## Current Status
- Build: PASSING
- Tests: 641/641 PASSING (21 test files)
- Phases 1-3: COMPLETE
- Phase 4: MOSTLY COMPLETE (keyboard shortcuts, progress bars, tooltips, WIP limits all done)

## Remaining Items

### 1. Checkbox Check Animation (TodoCard)
- Add animated checkbox/completion toggle to TodoCard
- Use Framer Motion for scale/check animation on completion
- Need to add a completion toggle mechanism (currently cards don't have inline completion)
- Since todos don't have a "completed" field visible in the card, this should be a visual enhancement when clicking the todo card or a dedicated checkbox

### 2. Success/Error Micro-animations
- Toast system already has spring animations (motion.div in Toast.tsx)
- Add entrance animations to success/error states in mutation callbacks
- The toast system already provides this - confirm it's working well with the spring animations

### 3. Remaining Tooltips
- Most icon-only buttons already have `title` attributes
- Audit any remaining buttons without `title`
- Focus areas: TodoCard (drag handle has title), BoardColumn buttons all have titles/aria-labels
- May already be complete based on code review

### 4. Test Coverage for New Components
- KeyboardShortcutsHelp.test.tsx - basic render, shortcut display, close behavior
- Skeleton.test.tsx - render tests for Skeleton, BoardCardSkeleton, ColumnSkeleton, TodoCardSkeleton
- RichTextEditor.test.tsx - basic render test (mocking tiptap)

### 5. BDD Tests (.bdd.test.tsx alongside components)
- BoardView.bdd.test.tsx - keyboard shortcuts, drag & drop flows, WIP limits
- BoardList.bdd.test.tsx - board navigation, skeleton loaders, empty states
- TodoCard.bdd.test.tsx - card interactions
- These use vitest (not Playwright) with Given/When/Then naming patterns

### 6. Final Verification
- `pnpm --filter web build` succeeds
- `pnpm --filter web test -- --run` passes
- No regressions
