# Explicit Save Flow For Board Editing

## Summary
- Create a separate feature worktree/branch, e.g. `codex/explicit-save-ui`, leaving the current dirty `codex/4228` worktree untouched.
- Save this plan first at `.codex/plans/explicit-save-and-loaders-plan.md` in the new worktree.
- Replace autosave/debounced persistence with staged local edits plus explicit Save, covering task detail fields, board name/description, column edits that currently blur-save, and drag/drop reorder.
- Keep already-explicit create/delete actions immediate for now, since they already use buttons and are not part of the autosave problem.

## Key Changes
- Add a board draft layer in `BoardView` that initializes from `useBoard(boardId)` and tracks dirty changes separately from server data.
- Remove `useDebouncedMutation` usage from drag/drop. Dragging updates the local draft immediately, records pending final order/move changes, and shows a persistent Save affordance instead of firing reorder APIs.
- Add explicit save UI:
  - Board-level changes and drag/drop: show a top-right `Save changes` button in the board header beside status/labels, with `Discard` available when dirty.
  - Task detail edits: show a sticky bottom action area inside `DetailPanel` with `Save task` and `Discard`; disable autosave on title, priority, due date, labels, and description changes.
- During save, disable further editing/dragging, show spinner/loading text, set `aria-busy`, and keep the loader visible until all API writes complete and the latest board query has fully refetched.
- Implement save orchestration with `mutateAsync` or direct `apiClient` calls, then `await` board detail/list refetches before clearing dirty state.
- Preserve existing validation defaults: empty task title cannot save; empty board/column names do not persist; due dates still serialize as ISO midnight UTC or `null`.

## Test Plan
- Update unit tests:
  - `DetailPanel`: field changes do not call API before Save; Save sends merged changed fields; due date ISO/null behavior remains; saving state disables controls.
  - `BoardView`: board name/description blur no longer persists; Save persists and waits for refetch; Discard restores server data.
  - DnD: drag/drop changes local order only; reorder/move API calls happen only after Save.
- Update BDD helpers by removing the fake autosave blur/wait behavior for `I click "Save"` and clicking the actual Save button.
- Run focused checks with `pnpm`:
  - `cd apps/web && pnpm vitest run src/components/board/DetailPanel.test.tsx src/components/board/BoardView.test.tsx src/hooks/useBoardDnD.test.ts`
  - `cd apps/web && pnpm test:bdd -- --grep "Edit Todo|Move Todo"` if supported by the existing Playwright setup, otherwise run the relevant generated specs.
- Use `@Browser` against the local app to verify the visible flow: edit a task, confirm no save before clicking Save, confirm loader remains through save/refetch, confirm drag/drop shows pending Save. If Docker/OrbStack is unavailable again, document that local Browser verification is blocked and rely on mocked Playwright/BDD coverage.

## Assumptions
- "Fields + DnD" scope is locked: drag/drop reorder must be staged until explicit Save.
- New branch means a separate worktree branch, not switching the current `codex/4228` worktree.
- Label management and create/delete flows remain immediate because they already have explicit user actions and broader staging would increase scope.

## Follow-up Loader Hardening
- Immediate explicit actions should not rely on optimistic UI alone in production because the app is slow there.
- For immediate actions, keep the initiating control in a disabled loading state until the API call finishes and the latest relevant query has refetched.
- Board-surface actions to harden first:
  - Add column: keep `Adding...` until create plus board/list refetch finishes; then replace the draft from the latest board and reveal the new column.
  - Add todo: keep the add-card form open with `Adding...` until create plus board/list refetch finishes; then replace the draft from the latest board.
  - Delete column: show a deleting state for the column action until delete plus board/list refetch finishes; then replace the draft from latest board.
  - Delete todo: show `Deleting...` in the task detail panel until delete plus board/list refetch finishes.
- Keep staged field/DnD edits on explicit Save; loaders are for already-explicit immediate actions.

## Follow-up Unsaved Navigation Protection
- Warn users before losing staged board edits through browser refresh, tab close, or in-app navigation away from the board.
- Use the same board dirty state that drives `Save changes`, so the warning appears for staged board metadata, column edits, task priority changes, and drag/drop changes.
- Do not warn while immediate actions are only loading, because those actions are already in-flight and not user-discardable drafts.
- Add focused tests for:
  - `beforeunload` is prevented while board changes are unsaved.
  - in-app Back to boards navigation prompts while board changes are unsaved.
  - no prompt after Discard or Save clears the dirty state.

## Follow-up Recording Split
- Replace one large native video with multiple short scenario videos to keep each artifact reviewable and uploadable.
- Target scenario files:
  - `explicit-save-unsaved-navigation.mov`
  - `explicit-save-board-save.mov`
  - `explicit-save-task-save.mov`
  - `explicit-save-immediate-loaders.mov`
- Add the videos as GitHub PR comments using direct playable Markdown/video embedding where GitHub supports it; fall back to clear direct links only if GitHub sanitizes inline playback.
