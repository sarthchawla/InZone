# Bug Fix: BoardList.tsx - Cannot read properties of undefined (reading 'length')

## Error

```
BoardList.tsx:132 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at BoardList.tsx:132:69
    at Array.reduce (<anonymous>)
```

## Root Cause Analysis

### The Problem

In `BoardList.tsx` lines 129-132:
```tsx
<div className="mt-4 text-xs text-gray-400">
  {board.columns.length} columns
  {' · '}
  {board.columns.reduce((acc, col) => acc + col.todos.length, 0)} tasks
</div>
```

The code assumes `col.todos` is an array with a `.length` property, but **the API doesn't return the `todos` array**.

### Backend API Response (apps/api/src/routes/boards.ts)

The `GET /api/boards` endpoint returns:
```typescript
const boards = await prisma.board.findMany({
  include: {
    columns: {
      include: {
        _count: {
          select: { todos: { where: { archived: false } } },
        },
      },
    },
  },
});

// Returns boards with:
// - board.columns[].todos = undefined (NOT included)
// - board.columns[]._count.todos = number (count only)
// - board.todoCount = total count (mapped)
```

### Type Mismatch

**Frontend Type** (`apps/web/src/types/index.ts`):
```typescript
export interface Column {
  todos: Todo[];  // Expects full array
}
```

**Actual API Response**:
```typescript
{
  columns: [{
    _count: { todos: 5 },  // Only count, no array
    // todos is undefined!
  }]
}
```

---

## Solution

### Option A: Fix Frontend to Use Existing Count (Recommended)

The backend already returns `board.todoCount` for each board. Use it directly instead of recalculating.

**Changes to `BoardList.tsx`:**
```tsx
// Before (broken):
{board.columns.reduce((acc, col) => acc + col.todos.length, 0)} tasks

// After (fixed):
{board.todoCount ?? 0} tasks
```

**Update Frontend Types** (`apps/web/src/types/index.ts`):
```typescript
export interface Board {
  // ... existing fields
  todoCount?: number;  // Add this field
}

export interface Column {
  // ... existing fields
  todos?: Todo[];  // Make optional since list view doesn't include it
  _count?: { todos: number };  // Add count type
}
```

### Option B: Defensive Coding (Additional Safety)

Add optional chaining for extra safety:

```tsx
<div className="mt-4 text-xs text-gray-400">
  {board.columns?.length ?? 0} columns
  {' · '}
  {board.todoCount ?? 0} tasks
</div>
```

---

## Implementation Plan

### Step 1: Update Types
**File:** `apps/web/src/types/index.ts`

- Add `todoCount?: number` to `Board` interface
- Add `_count?: { todos: number }` to `Column` interface
- Make `todos` optional in `Column` (only populated in detail view)

### Step 2: Fix BoardList Component
**File:** `apps/web/src/components/board/BoardList.tsx`

- Replace `board.columns.reduce((acc, col) => acc + col.todos.length, 0)` with `board.todoCount ?? 0`
- Add optional chaining to `board.columns?.length ?? 0` for safety

### Step 3: Verify BoardView Still Works
**File:** `apps/web/src/components/board/BoardView.tsx`

- Ensure the detail view API (`GET /api/boards/:id`) still returns full `todos` array
- The detail endpoint should include full todos, not just counts

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/types/index.ts` | Add `todoCount` to Board, make `todos` optional in Column |
| `apps/web/src/components/board/BoardList.tsx` | Use `board.todoCount` instead of calculating from todos array |

---

## Testing Checklist

- [ ] BoardList loads without errors
- [ ] Board card shows correct column count
- [ ] Board card shows correct task count
- [ ] BoardView (detail page) still shows all todos correctly
- [ ] Creating a board updates the counts correctly
- [ ] Deleting a board works without errors

---

## Implementation Status: COMPLETE

### Changes Made

| File | Changes |
|------|---------|
| `apps/web/src/types/index.ts` | Added `todoCount?: number` to Board, made `todos` optional, added `_count` type |
| `apps/web/src/components/board/BoardList.tsx` | Use `board.todoCount ?? 0` and `board.columns?.length ?? 0` |
| `apps/web/src/components/board/BoardView.tsx` | Added `?? []` fallbacks for `column.todos` in 3 places |
| `apps/web/src/components/column/BoardColumn.tsx` | Extract `todos = column.todos ?? []` and use throughout |

TypeScript compilation: **Passing**
