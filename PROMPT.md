# Ralph Loop Prompt - Board, Swimlane & Task Enhancements

**Goal:** Implement the features defined in `.claude/plans/features/board-swimlane-task-enhancements-prd.md`

**Branch:** `board-swimlane-task-enhancements`

## PRD Reference

Full PRD: `.claude/plans/features/board-swimlane-task-enhancements-prd.md`

## Implementation Phases

### Phase 1 - Database & API Foundation ✅
- [x] Add soft-delete fields (`deleted_at`, `is_deleted`) to Board, Column, Task entities
- [x] Add `description` (TEXT) field to Board and Column entities
- [x] Add `position` (INTEGER) field to Column entity
- [x] Update API endpoints for soft delete behavior
- [x] Create database migrations

### Phase 2 - Swimlane Features ✅
- [x] Implement swimlane reordering (drag-and-drop)
- [x] Add three-dots menu functionality (Edit, Delete)
- [x] Implement double-click inline title editing
- [x] Add description with hover tooltip/popover
- [x] Info icon (ℹ️) when description exists

### Phase 3 - Task Features ✅
- [x] Implement markdown editor component
- [x] Improve drag-and-drop to work from anywhere on card
- [x] Implement double-click to open edit modal
- [x] Task detail modal with full markdown description
- [x] Description indicator (📝) on task cards

### Phase 4 - Board Features ✅
- [x] Add board description (collapsible, markdown-enabled)
- [x] Implement board name inline editing
- [x] Board description editor modal

## Instructions

1. **Check Current Progress** - Review the checklist above and PRD acceptance criteria
2. **Pick Next Task** - Select the next uncompleted item from the current phase
3. **Implement** - Write the code following PRD specifications
4. **Test** - Run relevant tests to verify the implementation
5. **Commit** - Commit with descriptive message:
   ```bash
   git add -A && git commit -m "Feat: <description>" && git push
   ```
6. **Update Checklist** - Mark completed items in this file
7. **Repeat** - Continue until all phases are complete

## Key Technical Decisions

- **Markdown Editor:** `@uiw/react-md-editor` or `@mdxeditor/editor`
- **Drag-and-Drop:** `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)
- **Soft Delete:** Use `deleted_at` timestamp + `is_deleted` boolean with partial indexes
- **Description Storage:** PostgreSQL TEXT type, raw markdown stored, rendered client-side

## Useful Commands

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run migrations
cd backend && npm run migration:run

# Generate migration
cd backend && npm run migration:generate -- -n <MigrationName>
```

## Completion Criteria

All acceptance criteria from the PRD are met:
- [x] All Board acceptance criteria ✓
- [x] All Swimlane acceptance criteria ✓
- [x] All Task acceptance criteria ✓
- [x] All Markdown Editor criteria ✓
- [x] All API & Performance criteria ✓
- [x] All Soft Delete criteria ✓
- [x] All Database criteria ✓
- [x] All tests pass

**RALPH_COMPLETE**

## Notes

- Follow existing code patterns in the codebase
- Ensure all new code has appropriate tests
- Keep PRD open for reference on detailed specifications
- Focus on one phase at a time
- Commit frequently with descriptive messages
