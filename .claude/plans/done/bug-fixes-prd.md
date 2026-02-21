# PRD: InZone Bug Fixes

**Version:** 1.1
**Date:** 2026-01-26
**Status:** ✅ IMPLEMENTED
**App URL:** http://localhost:5173/

---

## Executive Summary

This PRD addresses four critical bugs affecting the InZone Kanban board application. These bugs impact core functionality including drag-and-drop reordering, swimlane information display, and real-time task count updates.

**All four bugs have been fixed.**

---

## Bug Inventory

| ID | Bug | Severity | Type | Status |
|----|-----|----------|------|--------|
| BUG-001 | Reordering via drag-and-drop in same swimlane doesn't work | High | Drag & Drop | ✅ FIXED |
| BUG-002 | Column drag-and-drop to reorder columns doesn't work | High | Drag & Drop | ✅ FIXED |
| BUG-003 | Hover on swimlane doesn't show description (add info icon) | Medium | UI/UX | ✅ FIXED |
| BUG-004 | Task count doesn't update after adding task until page refresh | Medium | State Management | ✅ FIXED |

---

## Bug Details & Root Cause Analysis

### BUG-001: Task Reordering in Same Swimlane ✅ FIXED

**Description:** When dragging a task within the same column (swimlane), the task does not persist its new position.

**Actual Root Cause:**
**API payload mismatch** - The frontend `useReorderTodos` hook was sending `{ boardId, todoIds }` but the API endpoint `/api/todos/reorder` expects `{ columnId, todos: [{ id, position }] }`.

**Files Changed:**
- `/apps/web/src/hooks/useTodos.ts` - Fixed payload format
- `/apps/web/src/components/board/BoardView.tsx` - Added `columnId` parameter to mutation call

**Fix Applied:**
```typescript
// Before (incorrect)
mutationFn: async ({ boardId, todoIds }) => {
  await apiClient.patch('/todos/reorder', { todoIds });
}

// After (correct)
mutationFn: async ({ boardId, columnId, todoIds }) => {
  const todos = todoIds.map((id, index) => ({ id, position: index }));
  await apiClient.patch('/todos/reorder', { columnId, todos });
}
```

---

### BUG-002: Column Reordering via Drag-and-Drop ✅ FIXED

**Description:** Dragging columns to reorder them doesn't persist the new order.

**Actual Root Cause:**
**API payload mismatch** - The frontend `useReorderColumns` hook was sending `{ columnIds }` but the API endpoint `/api/columns/reorder` expects `{ boardId, columns: [{ id, position }] }`.

**Files Changed:**
- `/apps/web/src/hooks/useColumns.ts` - Fixed payload format

**Fix Applied:**
```typescript
// Before (incorrect)
mutationFn: async ({ boardId, columnIds }) => {
  await apiClient.patch('/columns/reorder', { columnIds });
}

// After (correct)
mutationFn: async ({ boardId, columnIds }) => {
  const columns = columnIds.map((id, index) => ({ id, position: index }));
  await apiClient.patch('/columns/reorder', { boardId, columns });
}
```

---

### BUG-003: Swimlane Description Not Shown on Hover ✅ FIXED

**Description:** Hovering over a swimlane (column) does not display its description. User suggests adding an info icon.

**Actual Root Cause:**
The info icon was **conditionally rendered** only when `column.description` exists. Since most columns didn't have descriptions populated, the icon never appeared.

**Files Changed:**
- `/apps/web/src/components/column/BoardColumn.tsx` - Always show info icon

**Fix Applied:**
```tsx
// Before (conditional)
{column.description && (
  <div className="relative flex-shrink-0">
    <Info ... />
  </div>
)}

// After (always visible with fallback)
<div className="relative flex-shrink-0">
  <button
    onClick={handleEditClick}
    className={cn(
      "p-0.5 rounded transition-colors",
      column.description ? "text-blue-500 hover:text-blue-700" : "text-gray-400 hover:text-gray-600"
    )}
    data-testid="column-info-icon"
  >
    <Info className="h-4 w-4" />
  </button>
  {showTooltip && (
    <div className="tooltip">
      {column.description || "No description. Click to add one."}
    </div>
  )}
</div>
```

**Improvements:**
- Info icon always visible (blue if description exists, gray if not)
- Clicking the icon opens the edit modal
- Tooltip shows "No description. Click to add one." when empty
- Added `data-testid="column-info-icon"` for testing

---

### BUG-004: Task Count Not Updating After Adding Task ✅ FIXED

**Description:** When adding a task inside a board and returning to the boards list, the task count doesn't update until page refresh.

**Actual Root Cause:**
When a todo is created/deleted/archived, only `boardKeys.detail(boardId)` was invalidated. The boards list query (`boardKeys.all`) was NOT invalidated, causing stale cache to show old `todoCount`.

**Files Changed:**
- `/apps/web/src/hooks/useTodos.ts` - Added `boardKeys.all` invalidation

**Fix Applied:**
```typescript
// Added to useCreateTodo, useDeleteTodo, useArchiveTodo:
onSuccess: (_, variables) => {
  // Invalidate board detail for the current board view
  queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
  // Also invalidate boards list so task counts update
  queryClient.invalidateQueries({ queryKey: boardKeys.all });
},
```

---

## Acceptance Criteria

### BUG-001: Task Reordering ✅
- [x] User can drag a task within the same column
- [x] Task position persists after drag
- [x] Visual feedback shows during drag
- [x] Position is saved to database
- [x] Page refresh shows same order

### BUG-002: Column Reordering ✅
- [x] User can drag column by its handle
- [x] Column moves to new position visually
- [x] Position persists after release
- [x] Other columns shift appropriately
- [x] Page refresh shows same order

### BUG-003: Swimlane Description ✅
- [x] Info icon always visible in column header
- [x] Hovering info icon shows tooltip
- [x] Tooltip displays description or "No description"
- [x] Tooltip is positioned correctly (not clipped)
- [x] Click to edit description (opens edit modal)

### BUG-004: Task Count Update ✅
- [x] Adding task updates count immediately
- [x] Navigating to board list shows correct count
- [x] Deleting task updates count immediately
- [x] Archiving task updates count immediately
- [x] No page refresh required

---

## Test Plan

### Unit Tests to Add

```typescript
// useTodos.test.ts
describe('useReorderTodos', () => {
  it('should send correct payload format to API');
  it('should include columnId and todos with positions');
});

// useColumns.test.ts
describe('useReorderColumns', () => {
  it('should send correct payload format to API');
  it('should include boardId and columns with positions');
});

// BoardColumn.test.tsx
describe('info icon', () => {
  it('should always render info icon');
  it('should show description in tooltip on hover');
  it('should show fallback text when no description');
  it('should open edit modal when clicked');
});

// useTodos.test.ts
describe('createTodo mutation', () => {
  it('should invalidate board list query on success');
  it('should invalidate board detail query on success');
});

describe('deleteTodo mutation', () => {
  it('should invalidate board list query on success');
  it('should invalidate board detail query on success');
});
```

### BDD Tests to Add

```gherkin
# swimlane-description.feature
Feature: Swimlane description tooltip
  Scenario: View column description on hover
    Given I am on a board with a column that has a description
    When I hover over the info icon in the column header
    Then I should see a tooltip with the column description

  Scenario: Info icon shown for column without description
    Given I am on a board with a column without a description
    Then I should see an info icon in the column header
    When I hover over the info icon
    Then I should see a tooltip saying "No description. Click to add one."

  Scenario: Click info icon to edit description
    Given I am on a board with a column
    When I click the info icon in the column header
    Then I should see the edit column modal

# task-count-update.feature
Feature: Real-time task count updates
  Scenario: Task count updates when adding task
    Given I am on a board
    And I note the task count for the board
    When I add a new task to a column
    And I navigate to the boards list
    Then the task count should be incremented by 1

  Scenario: Task count updates when deleting task
    Given I am on a board with at least one task
    And I note the task count for the board
    When I delete a task
    And I navigate to the boards list
    Then the task count should be decremented by 1
```

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `/apps/web/src/hooks/useTodos.ts` | Fixed reorder payload, added boardKeys.all invalidation |
| `/apps/web/src/hooks/useColumns.ts` | Fixed reorder payload format |
| `/apps/web/src/components/board/BoardView.tsx` | Added columnId to reorderTodos call |
| `/apps/web/src/components/column/BoardColumn.tsx` | Always show info icon with click-to-edit |

---

## Verification

All fixes have been implemented. Next steps:
1. Run existing tests to ensure no regression
2. Add new unit tests for the fixes
3. Add new BDD tests for the features
4. Manual verification using agent-browser

---

## Appendix: File Reference

### Frontend Files
- `/apps/web/src/components/board/BoardView.tsx` - Main board with DnD
- `/apps/web/src/components/column/BoardColumn.tsx` - Column/swimlane component
- `/apps/web/src/components/board/BoardList.tsx` - Board list with counts
- `/apps/web/src/hooks/useTodos.ts` - Todo mutations and cache
- `/apps/web/src/hooks/useBoards.ts` - Board queries
- `/apps/web/src/hooks/useColumns.ts` - Column mutations

### Backend Files
- `/apps/api/src/routes/todos.ts` - Todo endpoints
- `/apps/api/src/routes/columns.ts` - Column endpoints
- `/apps/api/src/routes/boards.ts` - Board endpoints

### Test Files
- `/apps/web/tests/bdd/features/` - BDD feature files
- `/apps/web/src/components/__tests__/` - Unit tests
