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

## 2. High Priority Issues

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

| Priority | Issue | Unit Tests | BDD Tests |
|----------|-------|------------|-----------|
| P0 | Single click task cards | 2 | 2 |
| P0 | Settings button broken | 2 | 2 |
| P0 | Modal buttons outside viewport | 3 | 2 |
| P1 | Mobile responsiveness | 2 | 1 |
| P1 | Horizontal scroll indicator | 1 | 1 |
| P2 | Empty board onboarding | 1 | 1 |
| P2 | Header link to home | 1 | 1 |
| P2 | Grammar (plural/singular) | 2 | 1 |

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
│   ├── task-card-click.feature          # NEW
│   └── edit-todo-modal-viewport.feature # NEW
├── boards/
│   ├── board-settings.feature           # NEW
│   ├── empty-board.feature              # NEW
│   └── mobile-board-view.feature        # NEW
├── columns/
│   └── scroll-indicator.feature         # NEW
└── navigation/
    └── header-navigation.feature        # NEW
```

---

## 8. Implementation Order

### Phase 1 (Critical)
1. Fix single-click on task cards
2. Fix or remove Settings button
3. Fix modal viewport/scrolling

### Phase 2 (UX)
4. Mobile responsiveness
5. Scroll indicators
6. Empty state onboarding
7. Grammar fixes
8. Header link

### Phase 3 (Features)
9. Search functionality
10. Keyboard shortcuts
11. Due date visualization

---

*Document Version: 2.0 | Last Updated: 2026-01-26*
