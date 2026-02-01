# PRD: Comprehensive Test Coverage Implementation

## Document Info
- **Author**: Claude Code
- **Date**: 2025-01-30
- **Status**: Draft
- **Version**: 1.0

---

## Executive Summary

This PRD outlines a phased approach to achieve comprehensive test coverage for the InZone Kanban board application. The plan addresses gaps in unit tests, BDD tests, and frontend hook tests across all entities (Boards, Todos, Columns, Labels).

### Current Coverage Status
| Layer | Coverage |
|-------|----------|
| Backend Services | ~85% |
| Backend Routes | ~80% |
| Frontend Hooks | **0%** |
| BDD Integration | ~85% |
| Edge Cases | ~30% |

---

## Feature Implementation Status

### Legend
- ✅ **Implemented** - Feature exists in both backend and frontend
- ⚠️ **Partial** - Backend exists but frontend is incomplete
- ❌ **Not Implemented** - Feature doesn't exist in frontend (tests should be skipped)

| Entity | Feature | Backend | Frontend | Test Priority |
|--------|---------|---------|----------|---------------|
| **Boards** | List | ✅ | ✅ | P0 |
| | Create | ✅ | ✅ | P0 |
| | Update | ✅ | ✅ | P0 |
| | Delete | ✅ | ✅ | P0 |
| | Duplicate | ✅ | ❌ | P2 (backend only) |
| | Reorder | ✅ | ❌ | P2 (backend only) |
| **Todos** | List | ✅ | ✅ | P0 |
| | Create | ✅ | ✅ | P0 |
| | Update | ✅ | ✅ | P0 |
| | Delete | ✅ | ✅ | P0 |
| | Move | ✅ | ✅ | P0 |
| | Reorder | ✅ | ✅ | P0 |
| | Archive | ✅ | ⚠️ (no UI) | P1 |
| | Filter | ✅ | ❌ | P2 (backend only) |
| | Search | ✅ | ❌ | P2 (backend only) |
| **Columns** | Create | ✅ | ✅ | P0 |
| | Update (name) | ✅ | ✅ | P0 |
| | Update (desc) | ✅ | ⚠️ (tooltip only) | P1 |
| | Update (WIP) | ✅ | ✅ | P0 |
| | Delete | ✅ | ✅ | P0 |
| | Reorder | ✅ | ✅ | P0 |
| **Labels** | List | ✅ | ✅ | P0 |
| | Create | ✅ | ✅ | P0 |
| | Update | ✅ | ✅ | P0 |
| | Delete | ✅ | ✅ | P0 |
| | Assign to Todo | ✅ | ✅ | P0 |

---

## Phase 1: Frontend Hooks Tests (Critical - 0% Coverage)

**Timeline**: Week 1-2
**Priority**: P0 - Blocking
**Estimated Tests**: ~80 tests

### 1.1 Boards Hooks (`apps/web/src/hooks/useBoards.test.ts`)

#### `useBoards` Hook
- [ ] Returns loading state initially
- [ ] Returns boards list on success
- [ ] Returns empty array when no boards
- [ ] Handles fetch error gracefully
- [ ] Refetches on window focus (if configured)

#### `useBoard` Hook
- [ ] Returns loading state initially
- [ ] Returns board with columns and todos
- [ ] Returns null/error for non-existent board
- [ ] Handles fetch error gracefully

#### `useCreateBoard` Hook
- [ ] Creates board successfully
- [ ] Invalidates boards list query on success
- [ ] Handles validation errors
- [ ] Handles server errors
- [ ] Returns created board data

#### `useUpdateBoard` Hook
- [ ] Updates board name successfully
- [ ] Updates board description successfully
- [ ] Clears description with null
- [ ] Invalidates board query on success
- [ ] Handles not found error
- [ ] Handles validation errors

#### `useDeleteBoard` Hook
- [ ] Deletes board successfully
- [ ] Invalidates boards list query on success
- [ ] Handles not found error
- [ ] Handles server errors

#### ❌ NOT IMPLEMENTED - Skip These Tests
- [ ] ~~`useDuplicateBoard` - duplicate board~~ (No frontend implementation)
- [ ] ~~`useReorderBoards` - reorder boards~~ (No frontend implementation)

---

### 1.2 Todos Hooks (`apps/web/src/hooks/useTodos.test.ts`)

#### `useCreateTodo` Hook
- [ ] Creates todo with minimal fields
- [ ] Creates todo with all fields (description, priority, due date, labels)
- [ ] Invalidates board detail query on success
- [ ] Invalidates boards list query (for task count)
- [ ] Handles validation errors
- [ ] Handles server errors

#### `useUpdateTodo` Hook
- [x] Updates todo successfully (existing)
- [x] Sets hadLabelUpdate flag when labels updated (existing)
- [x] Does not set hadLabelUpdate when no labels (existing)
- [ ] Invalidates board detail query on success
- [ ] Invalidates labels query when labels changed
- [ ] Handles not found error
- [ ] Handles validation errors

#### `useDeleteTodo` Hook
- [ ] Deletes todo successfully
- [ ] Invalidates board detail query on success
- [ ] Invalidates boards list query (for task count)
- [ ] Handles not found error

#### `useMoveTodo` Hook
- [ ] Moves todo to different column
- [ ] Moves todo to specific position
- [ ] Invalidates board detail query on success
- [ ] Handles not found error
- [ ] Handles invalid column error

#### `useReorderTodos` Hook
- [ ] Reorders todos within column
- [ ] Sends correct payload format
- [ ] Invalidates board detail query on success
- [ ] Handles server errors

#### `useArchiveTodo` Hook
- [ ] Archives todo successfully
- [ ] Unarchives todo successfully
- [ ] Invalidates board detail query on success
- [ ] Invalidates boards list query (for task count)
- [ ] Handles not found error

---

### 1.3 Columns Hooks (`apps/web/src/hooks/useColumns.test.ts`)

#### `useCreateColumn` Hook
- [x] Creates column successfully (existing)
- [x] Creates column with WIP limit (existing)
- [ ] Invalidates board detail query on success
- [ ] Invalidates boards list query (for column count) ✅ Fixed
- [ ] Handles validation errors
- [ ] Handles board not found error

#### `useUpdateColumn` Hook
- [x] Updates column name (existing)
- [x] Updates column WIP limit (existing)
- [x] Updates column description (existing - added)
- [ ] Invalidates board detail query on success
- [ ] Handles not found error
- [ ] Handles validation errors

#### `useDeleteColumn` Hook
- [x] Deletes column successfully (existing)
- [x] Deletes with move todos option (existing)
- [ ] Invalidates board detail query on success
- [ ] Invalidates boards list query (for column count) ✅ Fixed
- [ ] Handles not found error
- [ ] Handles move target not found error

#### `useReorderColumns` Hook
- [x] Reorders columns successfully (existing)
- [ ] Invalidates board detail query on success
- [ ] Handles server errors

---

### 1.4 Labels Hooks (`apps/web/src/hooks/useLabels.test.ts`)

#### `useLabels` Hook
- [ ] Returns loading state initially
- [ ] Returns labels list with todo counts
- [ ] Returns empty array when no labels
- [ ] Labels are sorted by name
- [ ] Handles fetch error gracefully

#### `useLabel` Hook
- [ ] Returns single label with todo count
- [ ] Handles not found error

#### `useCreateLabel` Hook
- [ ] Creates label with name and color
- [ ] Accepts various hex color formats
- [ ] Invalidates labels list query on success
- [ ] Handles validation errors (empty name, invalid color)
- [ ] Handles server errors

#### `useUpdateLabel` Hook
- [ ] Updates label name
- [ ] Updates label color
- [ ] Updates both name and color
- [ ] Invalidates labels list query on success
- [ ] Invalidates label detail query on success
- [ ] Handles not found error
- [ ] Handles validation errors

#### `useDeleteLabel` Hook
- [ ] Deletes label successfully
- [ ] Invalidates labels list query on success
- [ ] Handles not found error

---

## Phase 2: Backend Edge Cases & Missing Routes

**Timeline**: Week 2-3
**Priority**: P1
**Estimated Tests**: ~40 tests

### 2.1 Column Routes - Missing Endpoints

#### `GET /api/columns/:id` Route Tests
- [ ] Returns column with todos
- [ ] Returns column with empty todos array
- [ ] Returns 404 for non-existent column
- [ ] Returns 500 on database error

#### `GET /api/columns` Route Tests (if endpoint exists)
- [ ] Returns all columns
- [ ] Returns empty array when no columns
- [ ] Filters by boardId query param
- [ ] Returns 500 on database error

### 2.2 Board Edge Cases

- [ ] Create board with duplicate name (should allow)
- [ ] Update board position to conflicting value
- [ ] Delete board with 100+ todos (cascade performance)
- [ ] ❌ Duplicate board with large dataset (NOT IMPLEMENTED IN FE)

### 2.3 Todo Edge Cases

- [ ] Move todo with invalid position (negative)
- [ ] Move todo to column at WIP limit
- [ ] Reorder todos with position gaps
- [ ] Update todo with non-existent label IDs
- [ ] Create todo with title at max length (200 chars)
- [ ] ❌ Filter todos by multiple criteria (NOT IMPLEMENTED IN FE)
- [ ] ❌ Search todos by title/description (NOT IMPLEMENTED IN FE)

### 2.4 Column Edge Cases

- [ ] Update column description at max length
- [ ] Delete last/only column in board
- [ ] Move todos to column in different board (should fail)
- [ ] Column name uniqueness within board

### 2.5 Label Edge Cases

- [ ] Create label with duplicate name (behavior?)
- [ ] Color format edge cases (#FFF, #fff, #FFFFFF)
- [ ] Delete label with 100+ associated todos
- [ ] Label name at max length (50 chars)

---

## Phase 3: BDD Integration Tests

**Timeline**: Week 3-4
**Priority**: P1
**Estimated Tests**: ~30 scenarios

### 3.1 Cross-Entity Cascade Tests

- [ ] Delete board → all columns soft-deleted
- [ ] Delete board → all todos soft-deleted
- [ ] Delete column → todos moved to target column
- [ ] Delete column → todos deleted if no target
- [ ] Delete label → removed from all associated todos
- [x] Update todo labels → label count updates (added)
- [x] Create column → board column count updates (added)

### 3.2 Data Integrity Tests

- [ ] Transaction rollback on partial failure
- [ ] No orphaned records after failed operations
- [ ] Position consistency after reorder operations

### 3.3 Validation Boundary Tests

- [ ] Board name at exactly 100 characters
- [ ] Board description at exactly 500 characters
- [ ] Todo title at exactly 200 characters
- [ ] Column name at exactly 100 characters
- [ ] Label name at exactly 50 characters

---

## Phase 4: Backend-Only Feature Tests

**Timeline**: Week 4-5
**Priority**: P2
**Note**: These features exist in backend but NOT in frontend

### 4.1 Board Duplicate (❌ No Frontend)

- [ ] Duplicate board creates copy
- [ ] Duplicate board copies all columns
- [ ] Duplicate board copies all todos
- [ ] Duplicate board copies label associations
- [ ] Duplicate non-existent board returns 404

### 4.2 Board Reorder (❌ No Frontend)

- [ ] Reorder boards by position
- [ ] Handle position conflicts

### 4.3 Todo Filtering (❌ No Frontend)

- [ ] Filter by column ID
- [ ] Filter by priority
- [ ] Filter by label ID
- [ ] Filter by archived status
- [ ] Filter by multiple criteria
- [ ] Search by title
- [ ] Search by description

### 4.4 Todo Archive UI (⚠️ Partial - Hook exists, no UI)

- [ ] Archive todo removes from active view
- [ ] Unarchive todo restores to column
- [ ] Archived todos excluded from counts

---

## Phase 5: Performance & Stress Tests

**Timeline**: Week 5-6
**Priority**: P3
**Estimated Tests**: ~15 tests

### 5.1 Large Dataset Tests

- [ ] List 1000+ boards (pagination needed?)
- [ ] List 1000+ todos in single board
- [ ] Reorder 100+ todos in column
- [ ] Duplicate board with 500+ todos
- [ ] Delete board with 1000+ todos

### 5.2 Concurrent Operation Tests

- [ ] Simultaneous todo moves
- [ ] Simultaneous column reorders
- [ ] Simultaneous board updates
- [ ] Race condition prevention

---

## Implementation Plan

### Week 1: Frontend Hooks Tests (Phase 1.1-1.2)
- Set up testing infrastructure for hooks
- Implement Board hooks tests
- Implement Todo hooks tests
- **Deliverable**: ~40 new tests

### Week 2: Frontend Hooks Tests (Phase 1.3-1.4) + Backend Edge Cases
- Implement Column hooks tests
- Implement Label hooks tests
- Begin Column routes missing tests
- **Deliverable**: ~50 new tests

### Week 3: Backend Edge Cases (Phase 2)
- Complete all edge case tests
- Validation boundary tests
- **Deliverable**: ~40 new tests

### Week 4: BDD Integration Tests (Phase 3)
- Cross-entity cascade tests
- Data integrity tests
- **Deliverable**: ~30 new scenarios

### Week 5: Backend-Only Features (Phase 4)
- Tests for features without frontend
- Document feature gaps for future implementation
- **Deliverable**: ~25 new tests

### Week 6: Performance Tests (Phase 5)
- Large dataset tests
- Concurrent operation tests
- **Deliverable**: ~15 new tests

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Backend Unit Test Coverage | 85% | 95% |
| Frontend Hook Test Coverage | 0% | 90% |
| BDD Scenario Coverage | 85% | 95% |
| Edge Case Coverage | 30% | 80% |
| Integration Test Coverage | 25% | 75% |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Frontend hook testing complexity | High | Use MSW for mocking, follow existing patterns |
| Missing features block tests | Medium | Document as backend-only, defer frontend tests |
| Performance test infrastructure | Low | Use test database with seeded data |
| Time constraints | Medium | Prioritize P0/P1 tests first |

---

## Appendix A: Features NOT Implemented in Frontend

These features exist in the backend API but have no frontend implementation:

1. **Board Duplicate** - `POST /api/boards/:id/duplicate`
   - Backend: ✅ Implemented with full cascade copy
   - Frontend: ❌ No hook, no UI
   - Recommendation: Add to backlog for Phase 2 feature development

2. **Board Reorder** - Position field exists but no reorder API/UI
   - Backend: ⚠️ Position field exists, no dedicated endpoint
   - Frontend: ❌ No hook, no UI
   - Recommendation: Low priority, boards typically not reordered

3. **Todo Filtering** - `GET /api/todos?columnId=&priority=&labelId=&search=`
   - Backend: ✅ Full filtering support
   - Frontend: ❌ No filter UI, no search bar
   - Recommendation: High value feature, add to backlog

4. **Todo Search** - Search by title/description
   - Backend: ✅ Implemented
   - Frontend: ❌ No search UI
   - Recommendation: Bundle with filtering feature

5. **Todo Archive Toggle** - `PATCH /api/todos/:id/archive`
   - Backend: ✅ Implemented
   - Frontend: ⚠️ Hook exists (`useArchiveTodo`), no UI button
   - Recommendation: Quick win - just add UI toggle

---

## Appendix B: Test File Locations

```
Frontend Hook Tests:
  apps/web/src/hooks/useBoards.test.ts (NEW)
  apps/web/src/hooks/useTodos.test.ts (EXISTS - extend)
  apps/web/src/hooks/useColumns.test.ts (EXISTS - extend)
  apps/web/src/hooks/useLabels.test.ts (NEW)

Backend Unit Tests:
  apps/api/src/services/*.test.ts (EXISTS - extend)
  apps/api/src/routes/*.test.ts (EXISTS - extend)

BDD Tests:
  apps/api/tests/bdd/features/boards/boards-api.feature (EXISTS - extend)
  apps/api/tests/bdd/features/columns/columns-api.feature (EXISTS - extend)
  apps/api/tests/bdd/features/todos/todos-api.feature (EXISTS - extend)
  apps/api/tests/bdd/features/labels/labels-api.feature (EXISTS - extend)
  apps/api/tests/bdd/features/integration/cascade.feature (NEW)
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-30 | Initial draft |
