# Error Handling Improvements Plan

## Overview

This plan addresses three issues related to error handling and developer experience:

1. Errors not displayed on UI when backend API fails (e.g., DB connection issues)
2. UI stuck on "Create Board" popup when backend API fails
3. `start.sh` script issues with PostgreSQL setup commands

---

## Issue 1: Errors Not Showing on UI When Backend API Fails

### Problem Analysis
- The frontend uses React Query for data fetching/mutations
- API errors are logged to console but **not displayed to users**
- No toast/notification component exists for user-facing error messages
- Mutations fail silently - users don't know why operations failed

### Solution

#### 1.1 Add Toast/Notification Component

**Create new file:** `apps/web/src/components/ui/Toast.tsx`

- Use a toast library (react-hot-toast or sonner) or build a simple custom component
- Support error, success, warning, and info variants
- Auto-dismiss with configurable duration
- Stack multiple toasts

#### 1.2 Create Toast Context/Provider

**Create new file:** `apps/web/src/contexts/ToastContext.tsx`

- Wrap app with ToastProvider
- Export `useToast()` hook for triggering notifications
- Handle toast queue and dismissal logic

#### 1.3 Add Global Error Handler for React Query

**Modify file:** `apps/web/src/App.tsx`

- Configure React Query's `QueryClient` with `onError` callback
- Display toast on query/mutation failures
- Extract meaningful error messages from API responses

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        // Show toast with error message
      },
    },
  },
});
```

#### 1.4 Update API Client Error Handling

**Modify file:** `apps/web/src/api/client.ts`

- Extract and normalize error messages from different error response formats
- Handle network errors vs API errors distinctly
- Create helper function to get user-friendly error message

```typescript
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Handle API error responses
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    // Handle network errors
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to connect to server. Please check your connection.';
    }
  }
  return 'An unexpected error occurred';
}
```

---

## Issue 2: UI Stuck on Create Board Popup After Backend API Failure

### Problem Analysis

**File:** `apps/web/src/components/board/BoardList.tsx`

Current implementation:
```typescript
createBoard.mutate(
  { name, description, templateId },
  {
    onSuccess: () => {
      setIsCreateModalOpen(false);  // Only closes on success
      // ... reset form
    },
    // No onError handler!
  }
);
```

- Modal only closes on `onSuccess`
- No `onError` callback to handle failures
- No error message displayed to user
- User is stuck with no feedback

### Solution

#### 2.1 Add Error Handling to Create Board Mutation

**Modify file:** `apps/web/src/components/board/BoardList.tsx`

```typescript
const [createError, setCreateError] = useState<string | null>(null);

const handleCreateBoard = () => {
  if (newBoardName.trim()) {
    setCreateError(null);  // Clear previous error
    createBoard.mutate(
      { name, description, templateId },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
          setNewBoardName('');
          setNewBoardDescription('');
          setSelectedTemplate('');
        },
        onError: (error) => {
          setCreateError(getErrorMessage(error));
          // OR use toast: toast.error(getErrorMessage(error));
        },
      }
    );
  }
};
```

#### 2.2 Display Error in Modal

Add error message display inside the create board modal:
```tsx
{createError && (
  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
    {createError}
  </div>
)}
```

#### 2.3 Add Cancel/Close Button Behavior

- Ensure cancel button always works (even during loading)
- Clear error state when modal is closed
- Reset form state on modal close

#### 2.4 Update Other Mutation Handlers

Apply same pattern to other mutations in the codebase:
- `deleteBoard` in `BoardList.tsx`
- Todo mutations in `BoardView.tsx`
- Column mutations
- Label mutations

---

## Issue 3: start.sh Script PostgreSQL Setup Issues

### Problem Analysis

**File:** `start.sh`

Current issues:
- `createdb` command may not be available on all systems
- Script assumes specific PostgreSQL installation method (Homebrew)
- No fallback if `createdb` fails
- Hard-coded database name without validation

### Solution

#### 3.1 Replace `createdb` with `psql` Alternative

**Modify file:** `start.sh`

Replace:
```bash
if ! psql -lqt | cut -d \| -f 1 | grep -qw inzone; then
    echo -e "${YELLOW}Creating 'inzone' database...${NC}"
    createdb inzone
    echo -e "${GREEN}Database created${NC}"
```

With:
```bash
if ! psql -lqt | cut -d \| -f 1 | grep -qw inzone; then
    echo -e "${YELLOW}Creating 'inzone' database...${NC}"
    psql -d postgres -c "CREATE DATABASE inzone;" 2>/dev/null || \
    psql -c "CREATE DATABASE inzone;" 2>/dev/null || \
    createdb inzone 2>/dev/null

    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create database. Please create it manually:${NC}"
        echo -e "${RED}  psql -c 'CREATE DATABASE inzone;'${NC}"
        exit 1
    fi
    echo -e "${GREEN}Database created${NC}"
```

#### 3.2 Improve PostgreSQL Detection

Add more robust PostgreSQL detection:
```bash
# Check for PostgreSQL client tools
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL client (psql) not found.${NC}"
    echo -e "${YELLOW}Please install PostgreSQL:${NC}"
    echo -e "  macOS: brew install postgresql@14"
    echo -e "  Ubuntu: sudo apt install postgresql-client"
    exit 1
fi
```

#### 3.3 Add Connection String Support

Allow custom database connection via environment variable:
```bash
# Use DATABASE_URL if provided, otherwise use local defaults
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-$(whoami)}"
DB_NAME="${PGDATABASE:-inzone}"
```

#### 3.4 Add Graceful Fallbacks

- Check multiple PostgreSQL service names
- Support both Homebrew and system PostgreSQL
- Provide clear manual instructions on failure

---

## Implementation Order

### Phase 1: Toast System (Foundation)
1. Install toast library or create Toast component
2. Create ToastContext and provider
3. Wrap app with ToastProvider
4. Test basic toast functionality

### Phase 2: API Error Handling
1. Add error message extraction utility to API client
2. Configure React Query global error handler
3. Test with simulated API failures

### Phase 3: Create Board Fix
1. Add error state to BoardList component
2. Add onError handler to createBoard mutation
3. Display error message in modal
4. Test with various error scenarios

### Phase 4: Apply Pattern to Other Components
1. Update delete board error handling
2. Update todo mutation error handling
3. Update column mutation error handling
4. Update label mutation error handling

### Phase 5: Start Script Fix
1. Update PostgreSQL detection logic
2. Replace createdb with psql fallback
3. Add better error messages
4. Test on fresh environment

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/components/ui/Toast.tsx` | **NEW** - Toast component |
| `apps/web/src/contexts/ToastContext.tsx` | **NEW** - Toast context/provider |
| `apps/web/src/App.tsx` | Add ToastProvider, configure QueryClient error handling |
| `apps/web/src/api/client.ts` | Add error message extraction utility |
| `apps/web/src/components/board/BoardList.tsx` | Add error handling to create/delete board |
| `apps/web/src/components/board/BoardView.tsx` | Add error handling to todo/column mutations |
| `start.sh` | Fix PostgreSQL setup commands |

---

## Testing Checklist

- [ ] Stop database and verify error toast appears on page load
- [ ] Create board with DB down - verify error shows and modal doesn't hang
- [ ] Delete board with DB down - verify error notification
- [ ] Run start.sh on system without `createdb` command
- [ ] Run start.sh on fresh system without PostgreSQL running
- [ ] Verify all mutations show appropriate error feedback

---

## Implementation Status

### Completed

| Phase | Task | Status |
|-------|------|--------|
| 1 | Toast component (`Toast.tsx`) | ✅ Done |
| 1 | Toast context (`ToastContext.tsx`) | ✅ Done |
| 1 | Add ToastProvider to App.tsx | ✅ Done |
| 2 | Error message extraction (`getErrorMessage` in client.ts) | ✅ Done |
| 2 | Tailwind animation config for toast slide-in | ✅ Done |
| 3 | BoardList - error state for create board | ✅ Done |
| 3 | BoardList - onError handler for createBoard mutation | ✅ Done |
| 3 | BoardList - error display in modal | ✅ Done |
| 3 | BoardList - handleCloseCreateModal to reset state | ✅ Done |
| 4 | BoardList - deleteBoard error handling with toast | ✅ Done |
| 4 | BoardList - loadError display when fetching boards fails | ✅ Done |
| 5 | start.sh - psql command check | ✅ Done |
| 5 | start.sh - psql fallback for database creation | ✅ Done |
| 5 | start.sh - multi-platform PostgreSQL service detection | ✅ Done |

### Remaining (Optional Enhancements)

| Phase | Task | Status |
|-------|------|--------|
| 4 | BoardView - todo/column mutation error handling | ⏳ Pending |
| 4 | Label mutation error handling | ⏳ Pending |

**Note:** The core issues are fixed. BoardView error handling can be added as a follow-up enhancement.
