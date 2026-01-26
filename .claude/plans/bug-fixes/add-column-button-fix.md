# Bug Fix: Add Column Button Not Working

## Issue Description
When the user clicks on the "Add column" button in the board view, nothing happens. The button is completely non-functional.

## Root Cause
The "Add column" button in `BoardView.tsx` (line 213) has no `onClick` handler attached to it. It's just a styled button with no functionality:

```tsx
<button className="flex items-center gap-2 w-72 min-w-72 h-fit p-3 rounded-lg bg-gray-200/50 hover:bg-gray-200 text-gray-600 transition-colors">
  <Plus className="h-5 w-5" />
  Add column
</button>
```

## Existing Infrastructure
The backend and state management are already fully implemented:

1. **Hook**: `useCreateColumn()` in `apps/web/src/hooks/useColumns.ts` - ready to use
2. **API Endpoint**: `POST /api/boards/:boardId/columns` - fully functional
3. **Pattern**: `BoardColumn.tsx` has a working pattern for inline add functionality (used for adding todos)

## Fix Plan

### Step 1: Import the required hook
**File**: `apps/web/src/components/board/BoardView.tsx`

Add import for `useCreateColumn`:
```tsx
import { useCreateColumn } from '../../hooks/useColumns';
```

Also import the `Input` component for the add form:
```tsx
import { Button, Input } from '../ui';
```

### Step 2: Add state for managing add column UI
**File**: `apps/web/src/components/board/BoardView.tsx`

Add these state variables after existing useState declarations (around line 34):
```tsx
const [isAddingColumn, setIsAddingColumn] = useState(false);
const [newColumnName, setNewColumnName] = useState('');
```

### Step 3: Initialize the mutation hook
**File**: `apps/web/src/components/board/BoardView.tsx`

After other hook calls (around line 30):
```tsx
const createColumn = useCreateColumn();
```

### Step 4: Add handler function
**File**: `apps/web/src/components/board/BoardView.tsx`

Add a handler function similar to `handleAddTodo` (around line 139):
```tsx
const handleAddColumn = () => {
  if (!boardId || !newColumnName.trim()) return;
  createColumn.mutate(
    { boardId, name: newColumnName.trim() },
    {
      onSuccess: () => {
        setNewColumnName('');
        setIsAddingColumn(false);
      },
    }
  );
};

const handleColumnKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleAddColumn();
  } else if (e.key === 'Escape') {
    setIsAddingColumn(false);
    setNewColumnName('');
  }
};
```

### Step 5: Update the add column button UI
**File**: `apps/web/src/components/board/BoardView.tsx`

Replace the static button (lines 212-216) with conditional UI:
```tsx
{/* Add column button */}
{isAddingColumn ? (
  <div className="flex flex-col gap-2 w-72 min-w-72 h-fit p-3 rounded-lg bg-gray-100">
    <Input
      value={newColumnName}
      onChange={(e) => setNewColumnName(e.target.value)}
      onKeyDown={handleColumnKeyDown}
      placeholder="Enter column name..."
      autoFocus
    />
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="primary"
        onClick={handleAddColumn}
        disabled={createColumn.isPending}
      >
        {createColumn.isPending ? 'Adding...' : 'Add'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsAddingColumn(false);
          setNewColumnName('');
        }}
      >
        Cancel
      </Button>
    </div>
  </div>
) : (
  <button
    onClick={() => setIsAddingColumn(true)}
    className="flex items-center gap-2 w-72 min-w-72 h-fit p-3 rounded-lg bg-gray-200/50 hover:bg-gray-200 text-gray-600 transition-colors"
  >
    <Plus className="h-5 w-5" />
    Add column
  </button>
)}
```

## Files to Modify
1. `apps/web/src/components/board/BoardView.tsx` - All changes in this single file

## Testing
1. Navigate to a board
2. Click "Add column" button
3. Verify input field appears
4. Enter column name and press Enter or click "Add"
5. Verify new column appears on the board
6. Test cancel functionality (Escape key and Cancel button)
7. Test adding column with empty name (should not work)

## Estimated Changes
- Lines added: ~35
- Lines modified: ~5
- Complexity: Low - follows existing patterns in the codebase
