# PRD: Board, Swimlane & Task Enhancements

**Version:** 1.1
**Created:** 2026-01-24
**Updated:** 2026-01-24
**Status:** Draft

---

## Overview

This PRD outlines enhancements to the InZone board management system, focusing on improved editability, markdown-enabled descriptions, soft-delete functionality, and better user interactions for boards, swimlanes (columns), and tasks.

---

## Goals

- Enhance user experience with intuitive editing capabilities
- Add **markdown-enabled descriptions** to all major entities (boards, swimlanes, tasks)
- Implement soft-delete across all entities to enable undo functionality
- Improve drag-and-drop interactions for swimlanes and tasks
- Handle large descriptions efficiently in both database and UI

---

## Feature Requirements

### 1. Board Enhancements

#### 1.1 Board Description
- **Requirement:** Boards should have a markdown-enabled description field
- **Details:**
  - Add `description` field to Board entity (nullable TEXT field)
  - **Markdown support:** Full markdown rendering (headers, lists, code blocks, links, etc.)
  - Display description below board title in board view
  - Store raw markdown in database, render on client
  - See [Description Storage & Display Strategy](#description-storage--display-strategy) for UI handling

#### 1.2 Editable Board Name & Description
- **Requirement:** Board name and description should be editable
- **Details:**
  - Clicking on board name enters inline edit mode
  - Dedicated edit button/icon to edit both name and description
  - Modal or inline form for editing description
  - Save on blur or explicit save button
  - Cancel editing with Escape key

#### 1.3 Board Soft Delete
- **Requirement:** Board deletion should be soft delete
- **Details:**
  - Add `deleted_at` timestamp field to Board entity
  - Add `is_deleted` boolean field (optional, for query optimization)
  - Delete action sets `deleted_at` to current timestamp
  - All queries filter out deleted boards by default
  - Enables future undo/restore functionality

---

### 2. Swimlane (Column) Enhancements

#### 2.1 Swimlane Description
- **Requirement:** Swimlanes should have a markdown-enabled description field
- **Details:**
  - Add `description` field to Column entity (nullable TEXT field)
  - **Markdown support:** Full markdown rendering
  - Description remains hidden by default (space-efficient)
  - Description viewable on hover or click-to-expand
  - See [Description Storage & Display Strategy](#description-storage--display-strategy) for UI handling

#### 2.2 Swimlane Description Display (Hidden by Default)
- **Requirement:** Description should be hidden but easily accessible
- **Details:**
  - **Indicator:** Small info icon (ℹ️) next to swimlane title when description exists
  - **Hover behavior:**
    - Short descriptions (<500 chars): Show in tooltip/popover
    - Long descriptions: Show truncated preview with "View full description" link
  - **Click behavior:** Opens modal/drawer with full rendered markdown
  - Tooltip/popover auto-hides after mouse leaves
  - Styled consistently with app design

#### 2.3 Moveable Swimlanes (Positioning)
- **Requirement:** Swimlanes should be repositionable via drag-and-drop
- **Details:**
  - Add `position` field to Column entity (integer)
  - Drag handle on swimlane header for reordering
  - Visual feedback during drag (placeholder, ghost element)
  - Update positions of affected swimlanes on drop
  - Persist new order to database

#### 2.4 Editable Swimlanes
- **Requirement:** Swimlanes should be fully editable
- **Details:**
  - Edit name, description, and other properties
  - Changes persist immediately or on explicit save

#### 2.5 Three-Dots Menu Functionality
- **Requirement:** Three-dots menu icon should work for edit and delete
- **Details:**
  - Menu items:
    - "Edit" - Opens edit modal/form for swimlane
    - "Delete" - Triggers soft delete with confirmation
  - Menu positioned correctly relative to icon
  - Menu closes on outside click or action selection

#### 2.6 Double-Click to Edit Swimlane Title
- **Requirement:** Double-clicking swimlane title enables inline editing
- **Details:**
  - Double-click transforms title into input field
  - Input pre-filled with current title
  - Save on Enter or blur
  - Cancel on Escape
  - Prevent empty titles

#### 2.7 Swimlane Soft Delete
- **Requirement:** Swimlane deletion should be soft delete
- **Details:**
  - Add `deleted_at` timestamp field to Column entity
  - Add `is_deleted` boolean field (optional)
  - Delete action sets `deleted_at` to current timestamp
  - All queries filter out deleted swimlanes by default
  - Tasks in deleted swimlane remain associated but hidden
  - Enables future undo/restore functionality

---

### 3. Task Enhancements

#### 3.1 Task Description with Markdown
- **Requirement:** Tasks should have markdown-formatted descriptions
- **Details:**
  - Add/update `description` field to Task entity (TEXT field)
  - **Markdown support:** Full GFM (GitHub Flavored Markdown)
  - Implement proper markdown editor component
  - Editor features:
    - Toolbar with common formatting (bold, italic, headers, lists, code, tables)
    - Live preview or split view
    - Syntax highlighting for code blocks
    - Image support (via URL or upload)
    - Table support
  - Rendered markdown in task view/detail modal
  - Task card shows truncated plain-text preview
  - See [Description Storage & Display Strategy](#description-storage--display-strategy) for UI handling
  - Recommended library: `@uiw/react-md-editor` or `@mdxeditor/editor`

#### 3.2 Improved Task Drag-and-Drop
- **Requirement:** Task drag-and-drop should work from anywhere on the task card
- **Details:**
  - Entire task card is draggable (not just a handle)
  - Visual feedback on drag start (opacity change, shadow)
  - Clear drop zones indicated during drag
  - Smooth animation on drop
  - Works across swimlanes

#### 3.3 Double-Click to Edit Task
- **Requirement:** Double-clicking a task opens edit mode
- **Details:**
  - Double-click on task card opens task edit modal/drawer
  - Modal contains all editable fields (title, description, etc.)
  - Single click behavior remains unchanged (select/view)
  - Clear distinction between view and edit modes

#### 3.4 Task Soft Delete
- **Requirement:** Task deletion should be soft delete
- **Details:**
  - Add `deleted_at` timestamp field to Task entity
  - Add `is_deleted` boolean field (optional)
  - Delete action sets `deleted_at` to current timestamp
  - All queries filter out deleted tasks by default
  - Enables future undo/restore functionality

---

## Database Schema Changes

### PostgreSQL TEXT Type - Storage Considerations

**Why TEXT for Markdown Descriptions:**
- PostgreSQL `TEXT` type has **no practical size limit** (up to 1GB per field)
- Stored using TOAST (The Oversized-Attribute Storage Technique)
- Large values automatically compressed and stored out-of-line
- No performance penalty for unused capacity (unlike fixed VARCHAR)
- Perfect for markdown which can vary from a few characters to full documentation

**Storage Strategy:**
- Store **raw markdown source** in database (NOT rendered HTML)
- Rendering happens client-side for security and flexibility
- Enables future editor/renderer upgrades without data migration
- Typical markdown documents: 1KB - 100KB (well within PostgreSQL limits)
- Extreme case support: Up to 1GB (handles embedded base64 images if needed)

**Recommended Practical Limits (Application Layer):**
| Entity | Soft Limit | Hard Limit | Rationale |
|--------|------------|------------|-----------|
| Board Description | 50KB | 1MB | Board context, may include images |
| Swimlane Description | 10KB | 100KB | Column definitions, acceptance criteria |
| Task Description | 100KB | 5MB | Full specs, embedded diagrams, code samples |

*Note: Limits enforced at API/application layer, not database constraints*

### Boards Table
```sql
-- Description: TEXT with no DB limit, app enforces soft/hard limits
ALTER TABLE boards ADD COLUMN description TEXT;
ALTER TABLE boards ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE boards ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Index for soft-delete filtering
CREATE INDEX idx_boards_is_deleted ON boards(is_deleted) WHERE is_deleted = FALSE;
```

### Columns (Swimlanes) Table
```sql
-- Description: TEXT with no DB limit, app enforces soft/hard limits
ALTER TABLE columns ADD COLUMN description TEXT;
ALTER TABLE columns ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE columns ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE columns ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX idx_columns_is_deleted ON columns(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_columns_position ON columns(board_id, position);
```

### Tasks Table
```sql
-- Description: TEXT with no DB limit, app enforces soft/hard limits
-- If description exists, ensure it's TEXT type (not VARCHAR)
ALTER TABLE tasks ALTER COLUMN description TYPE TEXT;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Index for soft-delete filtering
CREATE INDEX idx_tasks_is_deleted ON tasks(is_deleted) WHERE is_deleted = FALSE;
```

### Why Not Separate Description Tables?
For descriptions up to a few MB, inline TEXT columns are preferred because:
- Simpler queries (no JOINs needed)
- PostgreSQL TOAST handles large values efficiently
- Atomic updates (no orphaned description records)
- Only consider separate tables for: file attachments, version history, or descriptions >10MB

---

## API Changes

### Board Endpoints
- `GET /api/boards` - Returns boards **without** description (list optimization)
- `GET /api/boards/:id` - Returns board **with** full description
- `PATCH /api/boards/:id` - Update name, description (validates size limits)
- `DELETE /api/boards/:id` - Soft delete (set deleted_at)

### Column Endpoints
- `GET /api/boards/:boardId/columns` - Returns columns **without** descriptions
- `GET /api/columns/:id` - Returns column **with** full description
- `GET /api/columns/:id/description` - Returns only description (lazy load endpoint)
- `PATCH /api/columns/:id` - Update name, description, position
- `DELETE /api/columns/:id` - Soft delete (set deleted_at)
- `PATCH /api/boards/:boardId/columns/reorder` - Bulk update positions

### Task Endpoints
- `GET /api/columns/:columnId/tasks` - Returns tasks **without** descriptions
- `GET /api/tasks/:id` - Returns task **with** full description
- `GET /api/tasks/:id/description` - Returns only description (lazy load endpoint)
- `PATCH /api/tasks/:id` - Update including markdown description (validates size limits)
- `DELETE /api/tasks/:id` - Soft delete (set deleted_at)

### API Response Strategy for Large Descriptions
```typescript
// List endpoints: Exclude description, include metadata
interface TaskListItem {
  id: string;
  title: string;
  // description NOT included
  hasDescription: boolean;       // Indicates if description exists
  descriptionLength?: number;    // Optional: byte size for UI hints
}

// Detail endpoints: Include full description
interface TaskDetail extends TaskListItem {
  description: string | null;    // Full markdown content
}
```

---

## Description Storage & Display Strategy

*Inspired by Jira/Trello patterns for handling large content efficiently*

### Core Principle: Load on Demand

Descriptions can be large (potentially MBs of markdown). To maintain fast UI:
1. **Never load descriptions in list views**
2. **Lazy-load descriptions when user requests them**
3. **Show indicators when description exists**

### Entity-Specific Display Patterns

#### Board Description (Jira Project Description Pattern)
```
┌─────────────────────────────────────────────────────┐
│ 📋 Project Alpha                              [⚙️]  │
│ ─────────────────────────────────────────────────── │
│ ▼ Description                                       │  ← Collapsible header
│ ┌─────────────────────────────────────────────────┐ │
│ │ This board tracks the Alpha release...          │ │  ← Rendered markdown
│ │ ## Goals                                        │ │
│ │ - Ship by Q2                                    │ │
│ │ - Zero critical bugs                            │ │
│ └─────────────────────────────────────────────────┘ │
│ [Edit Description]                                  │  ← Click opens editor
└─────────────────────────────────────────────────────┘
```
- **Default state:** Collapsed (shows "▶ Description" with preview)
- **Expanded state:** Full rendered markdown
- **Edit:** Click "Edit" or double-click description area → opens markdown editor modal
- **No description:** Shows "Add a description..." placeholder

#### Swimlane/Column Description (Jira Column Config Pattern)
```
┌─────────────────────────────┐
│ To Do                 [ℹ️] [⋮]│  ← Info icon when description exists
│ ─────────────────────────────│
│ ┌─────────┐ ┌─────────┐     │
│ │ Task 1  │ │ Task 2  │     │
│ └─────────┘ └─────────┘     │
└─────────────────────────────┘

Hover on ℹ️ shows popover:
┌─────────────────────────────────┐
│ Tasks that haven't been started │
│ yet. Move here when blocked.    │
│                                 │
│ [View full description]         │  ← For long descriptions
└─────────────────────────────────┘
```
- **Default state:** Hidden (only ℹ️ icon visible if description exists)
- **Hover:** Shows popover with truncated description (first 200 chars)
- **Long descriptions:** "View full description" opens modal with full markdown
- **Edit:** Via three-dots menu → "Edit Column" modal with markdown editor

#### Task Description (Jira Issue Detail Pattern)
```
Task Card (in board):              Task Detail Modal:
┌─────────────────────┐            ┌────────────────────────────────────┐
│ TASK-123            │            │ TASK-123: Fix login bug       [✕]  │
│ Fix login bug       │            │ ──────────────────────────────────  │
│                     │            │ Status: In Progress | Priority: High│
│ 📝 [2 attachments]  │            │ ──────────────────────────────────  │
│ ─────────────────── │            │ Description                    [✏️] │
│ [Jira style badges] │            │ ┌──────────────────────────────────┐│
└─────────────────────┘            │ │ ## Steps to Reproduce           ││
     │                             │ │ 1. Go to login page             ││
     │ Double-click                │ │ 2. Enter invalid credentials    ││
     ▼                             │ │ 3. Click submit                 ││
Opens detail modal ───────────────►│ │                                 ││
                                   │ │ ## Expected                     ││
                                   │ │ Error message appears           ││
                                   │ └──────────────────────────────────┘│
                                   │ [Show more] (if truncated)          │
                                   └────────────────────────────────────┘
```
- **Card view:** NO description shown (only indicator: 📝 icon if exists)
- **Detail modal:** Full description with rendered markdown
- **Very long descriptions:** Show first ~500 lines with "Show more" expansion
- **Edit:** Click ✏️ icon → inline markdown editor (like Jira)

### Markdown Editor Behavior (Jira-Inspired)

```
View Mode (default):              Edit Mode (on click):
┌──────────────────────────┐      ┌──────────────────────────────────────┐
│ ## Acceptance Criteria   │      │ [B][I][H1][H2][•][1.][📎][</>][👁️]  │ ← Toolbar
│ - User can login         │  →   │ ┌────────────────────────────────────┐│
│ - Error shown on failure │      │ │## Acceptance Criteria             ││ ← Raw MD
│                          │      │ │- User can login                   ││
│                          │      │ │- Error shown on failure           ││
│                          │      │ └────────────────────────────────────┘│
│ [Click to edit]          │      │ [Save] [Cancel]     [Preview] [Split]│
└──────────────────────────┘      └──────────────────────────────────────┘
```
- **View mode:** Rendered markdown (click to edit, or click ✏️ icon)
- **Edit mode:** Toolbar + raw markdown textarea + preview options
- **Auto-save:** Draft saved to localStorage every 30 seconds
- **Cancel:** Warns if unsaved changes

### Performance Optimization Patterns

| Scenario | Strategy |
|----------|----------|
| Board list page | Don't fetch any descriptions |
| Board view (with swimlanes) | Fetch board description only, lazy-load swimlane descriptions on hover |
| Task cards | Never include description in card data |
| Task detail modal | Fetch description when modal opens |
| Search results | Show snippet only, not full description |
| Bulk operations | Never load descriptions |

### Loading States

```
Description loading:         Description empty:
┌────────────────────┐       ┌────────────────────┐
│ Description        │       │ Description        │
│ ┌────────────────┐ │       │                    │
│ │ ████████████   │ │       │ Add a description  │
│ │ ████████       │ │       │ to help your team  │
│ │ ██████████████ │ │       │ understand this... │
│ └────────────────┘ │       │                    │
│ Loading...         │       │ [+ Add Description]│
└────────────────────┘       └────────────────────┘
```

---

## UI/UX Specifications

### Interaction Patterns

| Entity | Single Click | Double Click | Three-Dots Menu |
|--------|--------------|--------------|-----------------|
| Board | Select/View | Edit name | Edit, Delete |
| Swimlane | - | Edit title inline | Edit, Delete |
| Task | View details | Open edit modal | Edit, Delete |

### Visual Indicators

- **Hover states:** Subtle background change, show action icons
- **Edit mode:** Input field with border, save/cancel buttons
- **Drag state:** Reduced opacity, drop shadow, cursor change
- **Description tooltip:** Rounded corners, max-width 300px, arrow pointer

---

## Technical Considerations

### Markdown Editor - Full Specification

**Recommended Library:** `@uiw/react-md-editor` or `@mdxeditor/editor`

**Editor Modes:**
1. **View Mode** - Rendered markdown (default)
2. **Edit Mode** - Raw markdown with toolbar
3. **Split Mode** - Side-by-side edit and preview
4. **Preview Mode** - Full preview while editing

**Toolbar Features (Jira-Inspired):**
| Icon | Function | Shortcut |
|------|----------|----------|
| **B** | Bold | `Ctrl/Cmd + B` |
| *I* | Italic | `Ctrl/Cmd + I` |
| ~~S~~ | Strikethrough | `Ctrl/Cmd + Shift + S` |
| H1 | Heading 1 | `Ctrl/Cmd + 1` |
| H2 | Heading 2 | `Ctrl/Cmd + 2` |
| H3 | Heading 3 | `Ctrl/Cmd + 3` |
| • | Bullet list | `Ctrl/Cmd + Shift + 8` |
| 1. | Numbered list | `Ctrl/Cmd + Shift + 7` |
| ☐ | Checkbox/Task list | `Ctrl/Cmd + Shift + C` |
| `</>` | Code inline | `Ctrl/Cmd + E` |
| ```  | Code block | `Ctrl/Cmd + Shift + E` |
| "" | Quote/Blockquote | `Ctrl/Cmd + Shift + 9` |
| 🔗 | Insert link | `Ctrl/Cmd + K` |
| 📷 | Insert image | `Ctrl/Cmd + Shift + I` |
| 📎 | Attach file | - |
| 📊 | Insert table | - |
| ➖ | Horizontal rule | `Ctrl/Cmd + Shift + -` |
| 👁️ | Toggle preview | `Ctrl/Cmd + P` |
| ⛶ | Fullscreen edit | `F11` or `Ctrl/Cmd + Shift + F` |

**Supported Markdown Features (GFM - GitHub Flavored Markdown):**
- Headers (H1-H6)
- Bold, Italic, Strikethrough
- Ordered and Unordered lists
- Task lists (checkboxes)
- Code blocks with syntax highlighting
- Inline code
- Blockquotes
- Tables
- Links (auto-linking URLs)
- Images (inline and reference)
- Horizontal rules
- Mentions (@user) - future enhancement
- Emoji shortcodes (:emoji:)

**Editor Behavior:**
```typescript
interface MarkdownEditorConfig {
  // Auto-save draft to localStorage
  autosaveDraft: boolean;           // default: true
  autosaveIntervalMs: number;       // default: 30000 (30s)

  // Size limits (application layer)
  maxSizeBytes: number;             // varies by entity type
  showCharacterCount: boolean;      // default: true
  warnAtPercentage: number;         // default: 80

  // UI behavior
  defaultMode: 'edit' | 'split' | 'preview';  // default: 'edit'
  toolbarPosition: 'top' | 'bottom';          // default: 'top'
  stickyToolbar: boolean;                      // default: true

  // Validation
  sanitizeOnSave: boolean;          // default: true (XSS prevention)
  allowHtml: boolean;               // default: false

  // Upload (future)
  allowImageUpload: boolean;        // default: false initially
  allowFileAttachment: boolean;     // default: false initially
}
```

**Keyboard Shortcuts (Global - Jira-Style):**
| Shortcut | Action |
|----------|--------|
| `Esc` | Cancel edit, discard changes (with confirmation if dirty) |
| `Ctrl/Cmd + Enter` | Save and close editor |
| `Ctrl/Cmd + S` | Save (stay in edit mode) |
| `Tab` | Indent (in lists/code blocks) |
| `Shift + Tab` | Outdent |

### Drag-and-Drop Library
- Current: Verify existing implementation
- **Recommended:** `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)
- Alternative: `@dnd-kit/core` (more modern, flexible)
- **Requirements:**
  - Full card draggable (not just handles)
  - Cross-column drag support
  - Column reordering support
  - Smooth animations
  - Mobile/touch support
  - Accessibility (keyboard drag)

### Soft Delete Implementation
- Add database indexes on `deleted_at` and `is_deleted` for performance
- Update all list queries to filter: `WHERE deleted_at IS NULL`
- Add restore endpoint for future undo feature
- Consider scheduled hard-delete cleanup (e.g., after 30 days)

### Inline Editing Specification

**Double-Click to Edit (All Entities):**
```typescript
interface InlineEditConfig {
  // Trigger
  trigger: 'doubleClick' | 'click' | 'icon';

  // Behavior
  selectAllOnFocus: boolean;        // default: true
  submitOnBlur: boolean;            // default: true
  submitOnEnter: boolean;           // default: true
  cancelOnEscape: boolean;          // default: true

  // Validation
  minLength: number;                // default: 1
  maxLength: number;                // varies by field
  allowEmpty: boolean;              // default: false
  trimWhitespace: boolean;          // default: true

  // UI
  showSaveCancel: boolean;          // default: false (for title)
  inputClassName: string;           // match existing title style
}
```

**Swimlane Title Inline Edit:**
```
Normal:                    Edit Mode:
┌──────────────────┐       ┌──────────────────┐
│ To Do      [ℹ️][⋮]│  →    │ [To Do______] [⋮]│
└──────────────────┘       └──────────────────┘
                           ↳ Input field styled to match
                             Press Enter to save
                             Press Esc to cancel
```

**Board Title Inline Edit:**
```
Normal:                    Edit Mode:
┌──────────────────┐       ┌──────────────────────┐
│ 📋 Project Alpha │  →    │ 📋 [Project Alpha__] │
└──────────────────┘       └──────────────────────┘
```

### Three-Dots Menu Specification

**Menu Structure (Jira-Style):**
```
Click [⋮]:
┌─────────────────────┐
│ ✏️  Edit            │  → Opens edit modal
│ 📋 Duplicate        │  → Creates copy (future)
│ ───────────────────  │
│ 🗑️  Delete          │  → Soft delete with confirmation
└─────────────────────┘
```

**Delete Confirmation Modal:**
```
┌────────────────────────────────────────┐
│ Delete "To Do" column?                 │
│ ────────────────────────────────────── │
│ This column contains 5 tasks.          │
│ Tasks will be moved to trash.          │
│                                        │
│ [Cancel]              [Delete Column]  │
└────────────────────────────────────────┘
```

### Context Menu Support (Right-Click)
Same options as three-dots menu, triggered by right-click on:
- Swimlane header
- Task card
- Board title area

---

## Acceptance Criteria

### Board
- [ ] Board has editable markdown description field
- [ ] Board description renders markdown correctly
- [ ] Board name is editable via double-click (inline edit)
- [ ] Board description is editable via markdown editor modal
- [ ] Board description is collapsible (hidden by default on list views)
- [ ] Board delete is soft delete (sets deleted_at)
- [ ] Deleted boards don't appear in board list

### Swimlane
- [ ] Swimlane has markdown description field
- [ ] Info icon (ℹ️) appears when description exists
- [ ] Hover on info icon shows popover with truncated description
- [ ] Long descriptions show "View full description" link in popover
- [ ] Full description modal renders markdown correctly
- [ ] Swimlanes can be reordered via drag-and-drop
- [ ] Three-dots menu opens with Edit and Delete options
- [ ] Edit option opens swimlane edit modal with markdown editor
- [ ] Delete option soft-deletes swimlane with confirmation
- [ ] Double-click on title enables inline editing
- [ ] Inline edit saves on Enter/blur, cancels on Escape

### Task
- [ ] Task has markdown description field
- [ ] Task card shows description indicator (📝 icon) when description exists
- [ ] Task card does NOT display description content (performance)
- [ ] Double-click on task opens detail modal with full description
- [ ] Markdown editor has toolbar (bold, italic, lists, code, etc.)
- [ ] Markdown editor supports keyboard shortcuts
- [ ] Markdown renders correctly in task detail modal
- [ ] Very long descriptions have "Show more" expansion
- [ ] Task card is draggable from anywhere (not just handle)
- [ ] Task delete is soft delete (sets deleted_at)
- [ ] Deleted tasks don't appear in swimlane

### Markdown Editor (All Entities)
- [ ] Supports GFM (GitHub Flavored Markdown)
- [ ] Toolbar includes: Bold, Italic, Headers, Lists, Code, Links, Tables
- [ ] Keyboard shortcuts work (Ctrl+B for bold, etc.)
- [ ] Auto-saves draft to localStorage
- [ ] Shows character/size count with warning at 80%
- [ ] Validates against size limits (soft and hard)
- [ ] Sanitizes HTML to prevent XSS
- [ ] Cancel warns if unsaved changes

### API & Performance
- [ ] List endpoints exclude description fields
- [ ] Detail endpoints include full descriptions
- [ ] Dedicated `/description` endpoints for lazy loading
- [ ] Response includes `hasDescription` boolean for UI indicators
- [ ] Size limits enforced at API layer

### Soft Delete
- [ ] All entities have `deleted_at` timestamp field
- [ ] All entities have `is_deleted` boolean field
- [ ] All list queries exclude soft-deleted items
- [ ] Delete confirmations show affected items count
- [ ] Database partial indexes created for performance

### Database
- [ ] Migrations created for all schema changes
- [ ] Description fields use TEXT type (not VARCHAR)
- [ ] Indexes created for soft-delete filtering
- [ ] Position column added for swimlane ordering

---

## Future Enhancements (Out of Scope)

- Undo/Restore functionality for soft-deleted items
- Trash/Archive view for deleted items
- Bulk operations (delete multiple, restore multiple)
- Version history for descriptions
- Collaborative editing indicators
- Keyboard shortcuts for editing

---

## Dependencies

- Markdown editor library (to be selected)
- Drag-and-drop library (verify/update current implementation)
- Tooltip component (may use existing UI library)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance impact of soft-delete queries | Medium | Add partial indexes (`WHERE is_deleted = FALSE`), use boolean flag for fast filtering |
| Large descriptions slow down list views | High | Never include descriptions in list APIs, lazy-load on demand |
| Markdown XSS vulnerabilities | Critical | Use DOMPurify or sanitize-html, disable raw HTML in markdown, CSP headers |
| Complex drag-and-drop interactions | Medium | Use battle-tested library (@hello-pangea/dnd), thorough E2E testing |
| Data migration issues | Medium | Create reversible migrations, test on staging, backup before deploy |
| Markdown editor bundle size | Low | Code-split editor component, lazy-load only when editing |
| Lost work from accidental navigation | Medium | Auto-save drafts to localStorage, warn on unsaved changes |
| Mobile touch interactions | Medium | Test on mobile devices, ensure drag-and-drop touch support |
| Database TOAST overhead for large text | Low | Monitor query performance, consider compression for very large descriptions |

---

## Implementation Priority

1. **Phase 1 - Database & API Foundation**
   - Add soft-delete fields to all entities
   - Update API endpoints for soft delete
   - Add description fields

2. **Phase 2 - Swimlane Features**
   - Implement swimlane reordering
   - Add three-dots menu functionality
   - Implement double-click editing
   - Add description with hover tooltip

3. **Phase 3 - Task Features**
   - Implement markdown editor
   - Improve drag-and-drop to full card
   - Implement double-click to edit

4. **Phase 4 - Board Features**
   - Add board description
   - Implement board editing UI

---

## Sign-off

| Role | Name | Date | Approval |
|------|------|------|----------|
| Product Owner | | | |
| Tech Lead | | | |
| Design Lead | | | |
