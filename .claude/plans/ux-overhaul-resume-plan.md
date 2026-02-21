# InZone UX Overhaul - Resumed Plan

## Priority 1: Fix Build Errors (BLOCKING)
- Wire up `useKeyboardShortcuts` + `BOARD_SHORTCUTS` + `KeyboardShortcutsHelp` in BoardView.tsx
- Remove unused `useMemo` import
- Add state for shortcuts modal (`showShortcutsHelp`)
- Wire `?` shortcut → open shortcuts help modal
- Wire `N` shortcut → add new card to first column
- Render `KeyboardShortcutsHelp` component in JSX

## Priority 2: Fix Failing Tests
### useAuth.test.ts (3 failures)
- Tests expect non-bypass behavior but `VITE_AUTH_BYPASS=true` in test env
- Fix: Update tests to expect `DEV_USER` always (matching `AuthContext.test.tsx` pattern)
- Test 1: "returns user from session" → expect DEV_USER instead of mock user
- Test 2: "returns null user when no session" → expect DEV_USER instead of null
- Test 3: "returns isPending true while loading" → expect `isPending: false`

### BoardColumn.test.tsx (2 failures)
- Tests look for text "WIP" but component renders "Over limit" / "At limit"
- Fix: Update assertions to match actual rendered text
- Test 1: "at limit" → look for "At limit" instead of "WIP"
- Test 2: "over limit" → look for "Over limit" instead of "WIP"

## Priority 3: Remaining UX Polish
1. Board card progress bars in BoardList.tsx
2. Tooltips on icon-only buttons (BoardColumn, TodoCard)
3. `E` shortcut → edit selected card
4. `Delete`/`Backspace` shortcut → delete with confirmation
5. Checkbox check animation
6. Success/error micro-animations

## Priority 4: Comprehensive Test Updates
- All existing tests pass
- New component tests (KeyboardShortcutsHelp, Skeleton, RichTextEditor basic render)
- Build succeeds, all tests pass

## Priority 5: BDD Tests
- Drag & drop flows
- Rich text editing
- Keyboard shortcuts
- Board navigation
- WIP limits
