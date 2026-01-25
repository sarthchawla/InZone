# InZone Task Board - PRD: Usability Issues & Improvements

**Date:** January 26, 2026
**Version:** 3.0
**App URL:** http://localhost:5173/

---

## Executive Summary

This document outlines all usability issues, bugs, and improvement opportunities discovered during a comprehensive user flow analysis of the InZone Task Board application. The issues are categorized by severity and include recommendations for resolution.

**Version 3.0 Updates:**
- Added 6 newly discovered critical/high priority bugs from deep analysis
- Due Date API validation bug (causes silent failures)
- Silent API error handling (no user feedback)
- Task deletion without confirmation
- Column renaming impossible (modal missing name field)
- Board title not editable

**Version 2.0 Updates:**
- Added unit test specifications for each fix
- Added BDD test specifications for each fix
- Added browser verification workflow for each fix using agent-browser CLI

---

## Testing Strategy

### Test Types Required for Each Fix

1. **Unit Tests** (Vitest + React Testing Library)
   - Location: `apps/web/src/components/**/*.test.tsx`
   - Run: `pnpm test:unit`

2. **BDD Tests** (Playwright-BDD with Gherkin)
   - Location: `apps/web/tests/bdd/features/**/*.feature`
   - Run: `pnpm test:bdd`

3. **Browser Verification** (agent-browser CLI)
   - After each fix, use agent-browser CLI to verify
   - Capture screenshots for documentation

---

## 1. Critical Issues (Must Fix)

### 1.1 Single Click on Task Cards Does Not Open Task Details

- **Location:** Board view > Task cards
- **Current Behavior:** Single clicking a task card only selects/focuses it. Users must double-click to open the Edit Task modal.
- **Expected Behavior:** Single click should open task details/edit modal
- **Impact:** High - Confusing for users, reduces productivity

#### Unit Tests (TodoCard.test.tsx)

```typescript
describe("TodoCard click behavior", () => {
  it("opens edit modal on single click", async () => {
    const onEdit = vi.fn();
    const todo = createMockTodo();
    renderWithDnd(<TodoCard todo={todo} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole("button", { name: /Test Todo/i }));
    expect(onEdit).toHaveBeenCalledWith(todo);
  });

  it("does not require double-click to open edit modal", async () => {
    const onEdit = vi.fn();
    const todo = createMockTodo();
    renderWithDnd(<TodoCard todo={todo} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole("button", { name: /Test Todo/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
```

#### BDD Tests (task-card-click.feature)

```gherkin
Feature: Task Card Click Behavior
  As a user
  I want to single-click on task cards to open details
  So that I can quickly view and edit tasks

  Background:
    Given I am viewing a board with columns "Todo, Done"
    And a todo "My Task" exists in "Todo" column

  Scenario: Single click opens task edit modal
    When I single-click on the todo "My Task"
    Then I should see the "Edit Task" modal

  Scenario: Drag handle allows drag without opening modal
    When I click on the drag handle of todo "My Task"
    Then I should not see the "Edit Task" modal
```

#### Browser Verification (agent-browser CLI)

```
1. browser_navigate: url=http://localhost:5173/board/{board-id}
2. browser_snapshot: Capture initial state
3. browser_click: ref=<task-card-ref> (single click)
4. browser_snapshot: Verify modal appeared
5. browser_take_screenshot: filename=fix-1.1-verified.png
```

---

### 1.2 Settings Button Non-Functional

- **Location:** Board view > Header toolbar > Settings button
- **Current Behavior:** Clicking shows "active" state but no modal appears
- **Expected Behavior:** Should open settings panel/modal
- **Impact:** High - Feature appears broken

#### Unit Tests (BoardHeader.test.tsx)

```typescript
describe("Settings button", () => {
  it("opens settings modal when clicked", async () => {
    render(<BoardView board={mockBoard} />);
    await userEvent.click(screen.getByRole("button", { name: /Settings/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Board Settings")).toBeInTheDocument();
  });

  it("closes settings modal on cancel", async () => {
    render(<BoardView board={mockBoard} />);
    await userEvent.click(screen.getByRole("button", { name: /Settings/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

#### BDD Tests (board-settings.feature)

```gherkin
Feature: Board Settings
  As a user
  I want to access board settings
  So that I can configure board options

  Scenario: Open settings modal
    Given I am viewing a board named "My Board"
    When I click the "Settings" button
    Then I should see the "Board Settings" modal

  Scenario: Change board name via settings
    Given I am viewing a board named "My Board"
    When I click the "Settings" button
    And I change the board name to "Renamed Board"
    And I click "Save"
    Then I should see "Renamed Board" as the board title
```

#### Browser Verification (agent-browser CLI)

```
1. browser_navigate: url=http://localhost:5173/board/{board-id}
2. browser_click: ref=<settings-button-ref>
3. browser_wait_for: time=1
4. browser_snapshot: Check if dialog appeared
5. browser_take_screenshot: filename=fix-1.2-verified.png
```

---

### 1.3 Edit Task Modal Buttons Outside Viewport

- **Location:** Board view > Edit Task modal
- **Current Behavior:** Save/Cancel buttons outside viewport, cannot be clicked
- **Expected Behavior:** All buttons accessible within viewport
- **Impact:** High - Users cannot save changes

#### Unit Tests (Modal.test.tsx)

```typescript
describe("Modal viewport behavior", () => {
  it("modal content is scrollable", () => {
    render(<EditTodoModal todo={mockTodo} isOpen={true} />);
    const modalContent = screen.getByTestId("modal-content");
    expect(modalContent).toHaveStyle({ overflowY: "auto" });
  });

  it("Save button is clickable within viewport", async () => {
    const onSave = vi.fn();
    render(<EditTodoModal todo={mockTodo} isOpen={true} onSave={onSave} />);
    const saveButton = screen.getByRole("button", { name: /Save/i });
    await userEvent.click(saveButton);
    expect(onSave).toHaveBeenCalled();
  });

  it("modal has max-height constraint", () => {
    render(<EditTodoModal todo={mockTodo} isOpen={true} />);
    const modal = screen.getByRole("dialog");
    expect(window.getComputedStyle(modal).maxHeight).toBeTruthy();
  });
});
```

#### BDD Tests (edit-todo-modal-viewport.feature)

```gherkin
Feature: Edit Task Modal Accessibility
  As a user
  I want modal buttons to be accessible
  So that I can save or cancel my changes

  Scenario: Save button is visible and clickable
    Given I am viewing a board with a todo "Test Task"
    When I open the edit modal for "Test Task"
    Then the "Save" button should be visible in viewport
    When I click "Save"
    Then the modal should close

  Scenario: Modal works on 720p screens
    Given the viewport is 1280x720
    When I open the edit modal for "Test Task"
    Then the "Save" button should be visible in viewport
```

#### Browser Verification (agent-browser CLI)

```
1. browser_resize: width=1280, height=720
2. browser_navigate: url=http://localhost:5173/board/{board-id}
3. browser_click: ref=<task-card-ref> (open modal)
4. browser_click: ref=<cancel-button-ref>
5. If TimeoutError: BUG EXISTS | If succeeds: FIX VERIFIED
6. browser_take_screenshot: filename=fix-1.3-verified.png
```

---

### 1.4 Due Date API Validation Bug (NEW - v3.0)

- **Location:** Board view > Edit Task modal > Due Date field
- **Current Behavior:** When saving a task with a due date, API returns 400 Bad Request with error: `{"errors":[{"code":"invalid_string","validation":"datetime","message":"Invalid datetime","path":["dueDate"]}]}`
- **Root Cause:** Frontend sends date in `YYYY-MM-DD` format, but API expects full ISO datetime format `YYYY-MM-DDTHH:mm:ss.sssZ`
- **Expected Behavior:** Due date should save successfully
- **Impact:** Critical - Users cannot set due dates on tasks

#### Unit Tests (EditTodoModal.test.tsx)

```typescript
describe("Due date handling", () => {
  it("converts date input to ISO datetime format before API call", async () => {
    const mockUpdateTodo = vi.fn();
    render(<EditTodoModal todo={mockTodo} onSave={mockUpdateTodo} />);

    await userEvent.type(screen.getByLabelText("Due Date"), "2026-02-15");
    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    expect(mockUpdateTodo).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      })
    );
  });

  it("handles empty due date correctly", async () => {
    const mockUpdateTodo = vi.fn();
    render(<EditTodoModal todo={mockTodo} onSave={mockUpdateTodo} />);
    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    expect(mockUpdateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: null })
    );
  });
});
```

#### BDD Tests (due-date-save.feature)

```gherkin
Feature: Due Date Saving
  As a user
  I want to set due dates on tasks
  So that I can track deadlines

  Scenario: Save task with due date
    Given I am viewing a board with a todo "Test Task"
    When I open the edit modal for "Test Task"
    And I set the due date to "2026-02-15"
    And I click "Save"
    Then the todo should show the due date "Feb 15"
    And the modal should close

  Scenario: Clear due date from task
    Given I have a todo with due date "2026-02-15"
    When I open the edit modal
    And I clear the due date
    And I click "Save"
    Then the todo should not show a due date
```

#### Browser Verification

```
1. browser_navigate: url=http://localhost:5173/board/{board-id}
2. browser_click: ref=<task-card> (double-click to open)
3. browser_type: ref=<due-date-input>, text="2026-02-15"
4. browser_click: ref=<save-button>
5. browser_network_requests: Check for 200 OK (not 400)
6. browser_take_screenshot: filename=fix-1.4-verified.png
```

---

### 1.5 Silent API Failures - No Error Messages (NEW - v3.0)

- **Location:** All modals with Save functionality
- **Current Behavior:** When API calls fail (e.g., due date validation error), the modal stays open with no error message shown to user. User has no idea their changes weren't saved.
- **Expected Behavior:** Display clear error message to user when save fails
- **Impact:** Critical - Users think their data is saved when it isn't

#### Unit Tests (EditTodoModal.test.tsx)

```typescript
describe("Error handling", () => {
  it("displays error message when save fails", async () => {
    const mockUpdateTodo = vi.fn().mockRejectedValue(new Error("Validation failed"));
    render(<EditTodoModal todo={mockTodo} onSave={mockUpdateTodo} />);

    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });

  it("keeps modal open on save failure", async () => {
    const mockUpdateTodo = vi.fn().mockRejectedValue(new Error("API Error"));
    render(<EditTodoModal todo={mockTodo} onSave={mockUpdateTodo} isOpen={true} />);

    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("displays specific validation errors from API", async () => {
    const apiError = { errors: [{ message: "Invalid datetime", path: ["dueDate"] }] };
    const mockUpdateTodo = vi.fn().mockRejectedValue(apiError);
    render(<EditTodoModal todo={mockTodo} onSave={mockUpdateTodo} />);

    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid datetime/i)).toBeInTheDocument();
    });
  });
});
```

#### BDD Tests (api-error-handling.feature)

```gherkin
Feature: API Error Handling
  As a user
  I want to see error messages when operations fail
  So that I know my changes weren't saved

  Scenario: Show error when save fails
    Given I am editing a todo
    And the API will return an error
    When I click "Save"
    Then I should see an error message
    And the modal should remain open

  Scenario: Show validation error details
    Given I am editing a todo with an invalid due date format
    When I click "Save"
    Then I should see "Invalid datetime" error message
```

#### Browser Verification

```
1. browser_navigate: url=http://localhost:5173/board/{board-id}
2. browser_click: ref=<task-card> (open edit modal)
3. browser_type: ref=<due-date-input>, text="invalid-date"
4. browser_click: ref=<save-button>
5. browser_snapshot: Check for error message element
6. browser_take_screenshot: filename=fix-1.5-verified.png
```

---

### 1.6 Task Deletion Without Confirmation (NEW - v3.0)

- **Location:** Board view > Edit Task modal > Delete button
- **Current Behavior:** Clicking Delete immediately deletes the task without any confirmation dialog
- **Expected Behavior:** Show confirmation dialog before deleting task
- **Impact:** High - Users can accidentally delete tasks with no way to recover

#### Unit Tests (EditTodoModal.test.tsx)

```typescript
describe("Delete confirmation", () => {
  it("shows confirmation dialog before deleting", async () => {
    render(<EditTodoModal todo={mockTodo} isOpen={true} />);

    await userEvent.click(screen.getByRole("button", { name: /Delete/i }));

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirm/i })).toBeInTheDocument();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const onDelete = vi.fn();
    render(<EditTodoModal todo={mockTodo} isOpen={true} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: /Delete/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("deletes when confirmation is confirmed", async () => {
    const onDelete = vi.fn();
    render(<EditTodoModal todo={mockTodo} isOpen={true} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: /Delete/i }));
    await userEvent.click(screen.getByRole("button", { name: /Confirm/i }));

    expect(onDelete).toHaveBeenCalledWith(mockTodo.id);
  });
});
```

#### BDD Tests (task-deletion.feature)

```gherkin
Feature: Task Deletion Confirmation
  As a user
  I want to confirm before deleting tasks
  So that I don't accidentally lose data

  Scenario: Confirm before deleting task
    Given I am editing a todo "Important Task"
    When I click "Delete"
    Then I should see a confirmation dialog
    And the dialog should say "Are you sure you want to delete this task?"

  Scenario: Cancel deletion
    Given I am editing a todo "Important Task"
    When I click "Delete"
    And I click "Cancel" on the confirmation
    Then the todo should still exist

  Scenario: Confirm deletion
    Given I am editing a todo "Task to Delete"
    When I click "Delete"
    And I click "Confirm" on the confirmation
    Then the todo should be deleted
    And I should not see "Task to Delete" on the board
```

#### Browser Verification

```
1. browser_navigate: url=http://localhost:5173/board/{board-id}
2. browser_click: ref=<task-card> (open edit modal)
3. browser_click: ref=<delete-button>
4. browser_snapshot: Check for confirmation dialog
5. browser_take_screenshot: filename=fix-1.6-verified.png
```

---

## 2. High Priority Issues

### 2.0 Edit Column Modal Missing Name Field (NEW - v3.0)

- **Location:** Board view > Column options > Edit
- **Current Behavior:** Edit Column modal only has Description field. No way to edit column name.
- **Expected Behavior:** Modal should include editable column name field
- **Impact:** High - Users cannot rename columns at all

#### Unit Tests (EditColumnModal.test.tsx)

```typescript
describe("EditColumnModal", () => {
  it("includes name field", () => {
    render(<EditColumnModal column={mockColumn} isOpen={true} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("pre-fills current column name", () => {
    const column = { id: "1", name: "Todo", description: "" };
    render(<EditColumnModal column={column} isOpen={true} />);
    expect(screen.getByLabelText(/name/i)).toHaveValue("Todo");
  });

  it("saves updated column name", async () => {
    const onSave = vi.fn();
    render(<EditColumnModal column={mockColumn} isOpen={true} onSave={onSave} />);

    await userEvent.clear(screen.getByLabelText(/name/i));
    await userEvent.type(screen.getByLabelText(/name/i), "New Name");
    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Name" })
    );
  });
});
```

#### BDD Tests (edit-column.feature)

```gherkin
Feature: Edit Column
  As a user
  I want to edit column name and description
  So that I can organize my board

  Scenario: Edit column name
    Given I am viewing a board with column "Todo"
    When I click column options for "Todo"
    And I click "Edit"
    Then I should see the "Edit Column" modal
    And I should see a "Name" field with value "Todo"
    When I change the name to "Backlog"
    And I click "Save"
    Then I should see "Backlog" column on the board

  Scenario: Edit column description
    Given I am viewing a board with column "Todo"
    When I edit the column "Todo"
    And I change the description to "Tasks to be done"
    And I click "Save"
    Then the column should have description "Tasks to be done"
```

#### Browser Verification

```
1. browser_navigate: url=http://localhost:5173/board/{board-id}
2. browser_click: ref=<column-options>
3. browser_click: ref=<edit-option>
4. browser_snapshot: Check for Name field in modal
5. browser_take_screenshot: filename=fix-2.0-verified.png
```

---

### 2.0.1 Board Title Not Editable (NEW - v3.0)

- **Location:** Board view > Board title heading
- **Current Behavior:** Clicking on board title does nothing
- **Expected Behavior:** Should open inline editor or modal to edit board name
- **Impact:** Medium - Users expect to be able to rename boards by clicking title

#### Unit Tests (BoardHeader.test.tsx)

```typescript
describe("Board title editing", () => {
  it("shows edit mode when clicking board title", async () => {
    render(<BoardHeader board={mockBoard} />);
    await userEvent.click(screen.getByRole("heading", { name: mockBoard.name }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("saves new title on blur", async () => {
    const onUpdateBoard = vi.fn();
    render(<BoardHeader board={mockBoard} onUpdateBoard={onUpdateBoard} />);

    await userEvent.click(screen.getByRole("heading", { name: mockBoard.name }));
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "New Board Name");
    await userEvent.tab(); // blur

    expect(onUpdateBoard).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Board Name" })
    );
  });
});
```

#### BDD Tests (board-title-edit.feature)

```gherkin
Feature: Edit Board Title
  As a user
  I want to click on board title to edit it
  So that I can quickly rename my board

  Scenario: Edit board title inline
    Given I am viewing a board named "My Board"
    When I click on the board title "My Board"
    Then I should see an editable text field
    When I type "Renamed Board" and press Enter
    Then the board title should be "Renamed Board"
```

---

### 2.1 Mobile Responsiveness Problems

- **Location:** Board view on mobile (375px width)
- **Issues:** Header cramped, Settings cut off, no scroll indication
- **Impact:** High - Poor mobile experience

#### Unit Tests (BoardHeader.test.tsx)

```typescript
describe("Mobile responsiveness", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 375 });
    window.dispatchEvent(new Event("resize"));
  });

  it("shows icon-only buttons on mobile", () => {
    render(<BoardHeader board={mockBoard} />);
    const editButton = screen.getByLabelText("Edit Description");
    expect(editButton.textContent).not.toContain("Edit Description");
  });

  it("all toolbar buttons are accessible on mobile", () => {
    render(<BoardHeader board={mockBoard} />);
    expect(screen.getByLabelText("Settings")).toBeVisible();
  });
});
```

#### BDD Tests (mobile-board-view.feature)

```gherkin
Feature: Mobile Board View
  As a mobile user
  I want the board to be fully functional on small screens

  Scenario: All toolbar buttons visible on mobile
    Given I am on a mobile device with viewport 375x812
    And I am viewing a board
    Then I should see the "Settings" button
    And I should see the "Labels" button
```

#### Browser Verification (agent-browser CLI)

```
1. browser_resize: width=375, height=812
2. browser_navigate: url=http://localhost:5173/board/{board-id}
3. browser_snapshot: Verify all buttons present
4. browser_click: ref=<settings-button-ref>
5. browser_take_screenshot: filename=fix-2.1-verified.png
```

---

### 2.2 No Horizontal Scroll Indicator

- **Location:** Board view with 6+ columns
- **Current Behavior:** No indication more columns exist off-screen
- **Impact:** Medium-High - Users may miss columns

#### Unit Tests (BoardColumns.test.tsx)

```typescript
describe("Scroll indicator", () => {
  it("shows scroll shadow when content overflows", () => {
    const manyColumns = Array.from({ length: 8 }, (_, i) =>
      createMockColumn({ id: `col-${i}` })
    );
    render(<BoardColumns columns={manyColumns} />);
    const container = screen.getByTestId("columns-container");
    expect(container).toHaveClass("scroll-shadow-right");
  });
});
```

#### BDD Tests (scroll-indicator.feature)

```gherkin
Feature: Column Scroll Indicator
  Scenario: Show scroll indicator when columns overflow
    Given I am viewing a board with 6 columns
    Then I should see a scroll indicator on the right
```

#### Browser Verification (agent-browser CLI)

```
1. browser_navigate: url=http://localhost:5173/board/{6-column-board-id}
2. browser_snapshot: Check for scroll indicators
3. browser_take_screenshot: filename=fix-2.2-verified.png
```

---

## 3. Medium Priority Issues

### 3.1 Empty Board State Lacks Onboarding

#### Unit Tests

```typescript
it("shows onboarding message when board has no columns", () => {
  const emptyBoard = createMockBoard({ columns: [] });
  render(<BoardView board={emptyBoard} />);
  expect(screen.getByText(/get started/i)).toBeInTheDocument();
});
```

#### BDD Tests

```gherkin
Scenario: Show onboarding message on empty board
  Given I am viewing a board with no columns
  Then I should see an onboarding message
```

#### Browser Verification

```
browser_navigate: url=http://localhost:5173/board/{empty-board-id}
browser_snapshot: Verify onboarding message present
```

---

### 3.2 InZone Header Not Clickable

#### Unit Tests

```typescript
it("InZone title is a link to homepage", () => {
  render(<Header />);
  const titleLink = screen.getByRole("link", { name: /InZone/i });
  expect(titleLink).toHaveAttribute("href", "/");
});
```

#### BDD Tests

```gherkin
Scenario: Click InZone logo to navigate home
  Given I am viewing a board
  When I click on the "InZone" header
  Then I should be on the homepage
```

#### Browser Verification

```
browser_navigate: url=http://localhost:5173/board/{id}
browser_click: ref=<inzone-heading>
Verify URL is now http://localhost:5173/
```

---

### 3.3 Grammar Issue: Plural vs Singular

#### Unit Tests

```typescript
describe("pluralize utility", () => {
  it("returns singular for count of 1", () => {
    expect(pluralize(1, "task")).toBe("1 task");
  });

  it("returns plural for count > 1", () => {
    expect(pluralize(2, "task")).toBe("2 tasks");
  });
});
```

#### BDD Tests

```gherkin
Scenario: Singular task count
  Given a board has 1 task
  Then I should see "1 task" on the board card
```

#### Browser Verification

```
browser_navigate: url=http://localhost:5173/
browser_snapshot: Look for "1 task" vs "1 tasks"
```

---

## 4. Low Priority (Tests when implementing)

- 4.1 No Search or Filter
- 4.2 No Keyboard Shortcuts
- 4.3 No Drag Handle for Cards
- 4.4 No Due Date Visualization
- 4.5 No Undo Functionality

---

## 5. Priority Matrix

| Priority | Issue | Unit Tests | BDD Tests | Status |
|----------|-------|------------|-----------|--------|
| **P0 - Critical** | | | | |
| P0 | 1.1 Single click task cards | 2 | 2 | Open |
| P0 | 1.2 Settings button broken | 2 | 2 | Open |
| P0 | 1.3 Modal buttons outside viewport | 3 | 2 | Open |
| P0 | 1.4 Due Date API validation bug (NEW) | 2 | 2 | Open |
| P0 | 1.5 Silent API failures (NEW) | 3 | 2 | Open |
| P0 | 1.6 Task deletion no confirmation (NEW) | 3 | 3 | Open |
| **P1 - High** | | | | |
| P1 | 2.0 Edit Column missing name field (NEW) | 3 | 2 | Open |
| P1 | 2.0.1 Board title not editable (NEW) | 2 | 1 | Open |
| P1 | 2.1 Mobile responsiveness | 2 | 1 | Open |
| P1 | 2.2 Horizontal scroll indicator | 1 | 1 | Open |
| **P2 - Medium** | | | | |
| P2 | 3.1 Empty board onboarding | 1 | 1 | Open |
| P2 | 3.2 Header link to home | 1 | 1 | Open |
| P2 | 3.3 Grammar (plural/singular) | 2 | 1 | Open |

**Total Issues:** 14 (6 Critical, 4 High, 4 Medium)

---

## 6. Post-Fix Verification Workflow

### For Each Fix:

1. **Run Unit Tests**
   ```bash
   pnpm test:unit --run
   ```

2. **Run BDD Tests**
   ```bash
   pnpm test:bdd
   ```

3. **Browser Verification (agent-browser CLI)**
   ```
   browser_navigate → browser_snapshot → browser_click → browser_snapshot → browser_take_screenshot
   ```

4. **Document Result**
   - Screenshot: `fix-X.X-verified.png`
   - Pass/Fail status
   - Commit SHA

---

## 7. New Test Files to Create

```
apps/web/tests/bdd/features/
├── todos/
│   ├── task-card-click.feature          # NEW (1.1)
│   ├── edit-todo-modal-viewport.feature # NEW (1.3)
│   ├── due-date-save.feature            # NEW (1.4) - v3.0
│   ├── api-error-handling.feature       # NEW (1.5) - v3.0
│   └── task-deletion.feature            # NEW (1.6) - v3.0
├── boards/
│   ├── board-settings.feature           # NEW (1.2)
│   ├── board-title-edit.feature         # NEW (2.0.1) - v3.0
│   ├── empty-board.feature              # NEW (3.1)
│   └── mobile-board-view.feature        # NEW (2.1)
├── columns/
│   ├── edit-column.feature              # NEW (2.0) - v3.0
│   └── scroll-indicator.feature         # NEW (2.2)
└── navigation/
    └── header-navigation.feature        # NEW (3.2)
```

### New Unit Test Files to Create/Update

```
apps/web/src/components/
├── todo/
│   ├── TodoCard.test.tsx                # UPDATE - add click tests
│   └── EditTodoModal.test.tsx           # UPDATE - add error handling, delete confirmation
├── column/
│   └── EditColumnModal.test.tsx         # UPDATE - add name field tests
├── board/
│   └── BoardHeader.test.tsx             # UPDATE - add title editing tests
└── common/
    └── Modal.test.tsx                   # UPDATE - add viewport tests
```

---

## 8. Implementation Order

### Phase 1 (Critical - Must Fix Immediately)
1. **Fix Due Date API validation** (1.4) - Convert date to ISO datetime format
2. **Add error message display** (1.5) - Show user-friendly errors on API failures
3. **Fix modal viewport/scrolling** (1.3) - Ensure buttons are always clickable
4. **Fix single-click on task cards** (1.1) - Open modal on single click
5. **Add task deletion confirmation** (1.6) - Show "Are you sure?" dialog
6. **Fix or remove Settings button** (1.2) - Implement or hide broken feature

### Phase 2 (High Priority - UX Improvements)
7. **Add column name field to Edit Column modal** (2.0)
8. **Make board title editable** (2.0.1)
9. Mobile responsiveness (2.1)
10. Scroll indicators (2.2)

### Phase 3 (Medium Priority - Polish)
11. Empty state onboarding (3.1)
12. Header link to home (3.2)
13. Grammar fixes (3.3)

### Phase 4 (Features - Future)
14. Search functionality
15. Keyboard shortcuts
16. Due date visualization
17. Undo functionality

---

## 9. Summary of New Issues Found (v3.0)

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | Due Date API Bug | Critical | API rejects dates - format mismatch |
| 2 | Silent Failures | Critical | No error shown when save fails |
| 3 | No Delete Confirm | High | Tasks deleted without confirmation |
| 4 | Column No Name | High | Cannot rename columns |
| 5 | Board Title | Medium | Cannot edit board title by clicking |
| 6 | InZone Header | Medium | Not a link to homepage |

---

*Document Version: 3.0 | Last Updated: 2026-01-26*
