# BDD Testing PRD - InZone

## Overview

This document defines the Behavior-Driven Development (BDD) testing requirements for the InZone application. BDD tests ensure the application behaves correctly from an end-user perspective, covering both frontend UI interactions and backend API behavior.

---

## 1. Testing Framework & Tools

### Frontend (E2E/Integration)
| Tool | Purpose |
|------|---------|
| **Playwright** | E2E browser testing, cross-browser support |
| **Cucumber.js** | BDD syntax with Gherkin feature files |
| **@cucumber/cucumber** | Cucumber integration for Node.js |

### Backend (API BDD)
| Tool | Purpose |
|------|---------|
| **Supertest** | HTTP assertions for API testing |
| **Cucumber.js** | BDD syntax with Gherkin feature files |
| **Chai** | Assertion library |

---

## 2. Project Structure

```
inzone/
├── apps/
│   ├── web/
│   │   └── tests/
│   │       └── bdd/
│   │           ├── features/           # Gherkin feature files
│   │           │   ├── boards/
│   │           │   │   ├── create-board.feature
│   │           │   │   ├── delete-board.feature
│   │           │   │   └── view-boards.feature
│   │           │   ├── columns/
│   │           │   │   ├── add-column.feature
│   │           │   │   ├── reorder-columns.feature
│   │           │   │   └── delete-column.feature
│   │           │   ├── todos/
│   │           │   │   ├── create-todo.feature
│   │           │   │   ├── edit-todo.feature
│   │           │   │   ├── move-todo.feature
│   │           │   │   └── delete-todo.feature
│   │           │   ├── labels/
│   │           │   │   └── manage-labels.feature
│   │           │   └── search/
│   │           │       └── search-todos.feature
│   │           ├── step-definitions/   # Step implementations
│   │           │   ├── board.steps.ts
│   │           │   ├── column.steps.ts
│   │           │   ├── todo.steps.ts
│   │           │   ├── label.steps.ts
│   │           │   └── common.steps.ts
│   │           ├── support/            # Helpers and hooks
│   │           │   ├── world.ts
│   │           │   ├── hooks.ts
│   │           │   └── pages/          # Page objects
│   │           │       ├── board-list.page.ts
│   │           │       ├── board-view.page.ts
│   │           │       └── todo-modal.page.ts
│   │           └── cucumber.config.ts
│   └── api/
│       └── tests/
│           └── bdd/
│               ├── features/
│               │   ├── boards/
│               │   │   ├── boards-api.feature
│               │   │   └── board-templates.feature
│               │   ├── columns/
│               │   │   └── columns-api.feature
│               │   ├── todos/
│               │   │   └── todos-api.feature
│               │   └── labels/
│               │       └── labels-api.feature
│               ├── step-definitions/
│               │   ├── boards.steps.ts
│               │   ├── columns.steps.ts
│               │   ├── todos.steps.ts
│               │   └── labels.steps.ts
│               ├── support/
│               │   ├── world.ts
│               │   └── hooks.ts
│               └── cucumber.config.ts
```

---

## 3. Feature Specifications

### 3.1 Board Features (Frontend)

#### Feature: Create Board (`create-board.feature`)

```gherkin
Feature: Create Board
  As a user
  I want to create new boards
  So that I can organize my tasks

  Background:
    Given I am on the boards list page

  # Happy Path Scenarios
  Scenario: Create a board from scratch
    When I click the "New Board" button
    And I enter "My Project" as the board name
    And I click "Create"
    Then I should see "My Project" in the boards list
    And the board should have no columns

  Scenario: Create a board from Basic Kanban template
    When I click the "New Board" button
    And I select "Basic Kanban" template
    And I enter "Sprint Board" as the board name
    And I click "Create"
    Then I should see "Sprint Board" in the boards list
    And the board should have columns "Todo, In Progress, Done"

  Scenario: Create a board from Development template
    When I click the "New Board" button
    And I select "Development" template
    And I enter "Dev Project" as the board name
    And I click "Create"
    Then I should see "Dev Project" in the boards list
    And the board should have columns "Backlog, Todo, In Progress, Review, Done"

  Scenario: Create a board from Simple template
    When I click the "New Board" button
    And I select "Simple" template
    And I enter "Quick Tasks" as the board name
    And I click "Create"
    Then I should see "Quick Tasks" in the boards list
    And the board should have columns "Todo, Done"

  # Unhappy Path Scenarios
  Scenario: Cannot create board with empty name
    When I click the "New Board" button
    And I leave the board name empty
    And I click "Create"
    Then I should see an error message "Board name is required"
    And no new board should be created

  Scenario: Cannot create board with very long name
    When I click the "New Board" button
    And I enter a 256 character board name
    And I click "Create"
    Then I should see an error message "Board name must be less than 255 characters"

  Scenario: Cannot create board with duplicate name
    Given a board named "Existing Board" exists
    When I click the "New Board" button
    And I enter "Existing Board" as the board name
    And I click "Create"
    Then I should see a warning about duplicate board name
```

#### Feature: Delete Board (`delete-board.feature`)

```gherkin
Feature: Delete Board
  As a user
  I want to delete boards
  So that I can remove unused boards

  Background:
    Given I am on the boards list page
    And a board named "Test Board" exists with 3 todos

  # Happy Path Scenarios
  Scenario: Delete board with confirmation
    When I click the delete button for "Test Board"
    Then I should see a confirmation dialog
    When I confirm the deletion
    Then "Test Board" should no longer appear in the boards list
    And all associated todos should be deleted

  Scenario: Cancel board deletion
    When I click the delete button for "Test Board"
    And I cancel the deletion
    Then "Test Board" should still appear in the boards list
    And all todos should be preserved

  # Unhappy Path Scenarios
  Scenario: Handle server error during deletion
    Given the server will return an error
    When I click the delete button for "Test Board"
    And I confirm the deletion
    Then I should see an error message "Failed to delete board"
    And "Test Board" should still appear in the boards list
```

#### Feature: View Boards (`view-boards.feature`)

```gherkin
Feature: View Boards
  As a user
  I want to view my boards
  So that I can access my tasks

  # Happy Path Scenarios
  Scenario: View empty boards list
    Given no boards exist
    When I navigate to the boards list
    Then I should see an empty state message
    And I should see a "Create your first board" prompt

  Scenario: View boards list with multiple boards
    Given the following boards exist:
      | name       | todoCount |
      | Work       | 5         |
      | Personal   | 3         |
      | Projects   | 10        |
    When I navigate to the boards list
    Then I should see 3 boards
    And each board should display its todo count

  Scenario: Open board view
    Given a board named "Work" exists
    When I click on "Work" board
    Then I should be navigated to the board view
    And I should see the board columns

  # Unhappy Path Scenarios
  Scenario: Handle loading error
    Given the API is unavailable
    When I navigate to the boards list
    Then I should see an error message "Failed to load boards"
    And I should see a "Retry" button

  Scenario: Handle slow network
    Given the network is slow
    When I navigate to the boards list
    Then I should see a loading indicator
    And boards should eventually appear
```

### 3.2 Todo Features (Frontend)

#### Feature: Create Todo (`create-todo.feature`)

```gherkin
Feature: Create Todo
  As a user
  I want to create todos
  So that I can track my tasks

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"

  # Happy Path Scenarios
  Scenario: Create a simple todo
    When I click "Add card" in the "Todo" column
    And I enter "Buy groceries" as the todo title
    And I click "Save"
    Then I should see "Buy groceries" in the "Todo" column

  Scenario: Create a todo with all fields
    When I click "Add card" in the "Todo" column
    And I enter the following todo details:
      | title       | Review pull request       |
      | description | Check the new auth module |
      | priority    | HIGH                      |
      | dueDate     | tomorrow                  |
    And I click "Save"
    Then I should see "Review pull request" in the "Todo" column
    And the todo should show "HIGH" priority badge
    And the todo should show the due date

  Scenario: Create todo with labels
    Given labels "Bug, Feature, Urgent" exist
    When I create a todo titled "Fix login issue"
    And I assign labels "Bug, Urgent"
    Then the todo should display "Bug" and "Urgent" labels

  # Unhappy Path Scenarios
  Scenario: Cannot create todo with empty title
    When I click "Add card" in the "Todo" column
    And I leave the title empty
    And I click "Save"
    Then I should see an error "Title is required"
    And no todo should be created

  Scenario: Cannot create todo when column is at WIP limit
    Given the "In Progress" column has a WIP limit of 3
    And the "In Progress" column already has 3 todos
    When I try to add a todo to "In Progress" column
    Then I should see a warning "WIP limit reached"

  Scenario: Handle network error during creation
    Given the network is unavailable
    When I try to create a todo
    Then I should see an error message "Failed to create todo"
    And my input should be preserved
```

#### Feature: Move Todo (`move-todo.feature`)

```gherkin
Feature: Move Todo
  As a user
  I want to move todos between columns
  So that I can update task progress

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"
    And a todo "Fix bug" exists in "Todo" column

  # Happy Path Scenarios
  Scenario: Drag todo to another column
    When I drag "Fix bug" to "In Progress" column
    Then "Fix bug" should appear in "In Progress" column
    And "Fix bug" should not appear in "Todo" column

  Scenario: Reorder todos within column
    Given "Fix bug" and "Write docs" exist in "Todo" column
    When I drag "Write docs" above "Fix bug"
    Then "Write docs" should appear before "Fix bug"

  Scenario: Move todo via context menu
    When I right-click on "Fix bug"
    And I select "Move to In Progress"
    Then "Fix bug" should appear in "In Progress" column

  # Unhappy Path Scenarios
  Scenario: Move fails due to server error
    Given the server will return an error
    When I drag "Fix bug" to "In Progress" column
    Then I should see an error message
    And "Fix bug" should remain in "Todo" column

  Scenario: Cannot move to non-existent column
    Given a column has been deleted by another user
    When I try to move a todo to that column
    Then I should see an error message "Column no longer exists"
    And I should see updated column list
```

### 3.3 Column Features (Frontend)

#### Feature: Add Column (`add-column.feature`)

```gherkin
Feature: Add Column
  As a user
  I want to add columns to my board
  So that I can customize my workflow

  Background:
    Given I am viewing a board with columns "Todo, Done"

  # Happy Path Scenarios
  Scenario: Add a new column
    When I click "Add column"
    And I enter "In Review" as the column name
    And I click "Save"
    Then I should see "In Review" column after "Done"

  Scenario: Add column with WIP limit
    When I click "Add column"
    And I enter "In Progress" as the column name
    And I set WIP limit to 5
    And I click "Save"
    Then "In Progress" column should show WIP limit indicator

  # Unhappy Path Scenarios
  Scenario: Cannot add column with empty name
    When I click "Add column"
    And I leave the column name empty
    And I click "Save"
    Then I should see an error "Column name is required"

  Scenario: Cannot add column with duplicate name
    When I click "Add column"
    And I enter "Todo" as the column name
    And I click "Save"
    Then I should see an error "Column name already exists"
```

#### Feature: Reorder Columns (`reorder-columns.feature`)

```gherkin
Feature: Reorder Columns
  As a user
  I want to reorder columns
  So that I can customize my workflow

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"

  # Happy Path Scenarios
  Scenario: Drag column to new position
    When I drag "Done" column before "In Progress"
    Then columns should be ordered "Todo, Done, In Progress"

  # Unhappy Path Scenarios
  Scenario: Reorder fails due to server error
    Given the server will return an error
    When I drag "Done" column before "In Progress"
    Then I should see an error message
    And columns should remain "Todo, In Progress, Done"
```

### 3.4 Label Features (Frontend)

#### Feature: Manage Labels (`manage-labels.feature`)

```gherkin
Feature: Manage Labels
  As a user
  I want to manage labels
  So that I can categorize my todos

  # Happy Path Scenarios
  Scenario: Create a new label
    When I open label management
    And I create a label with name "Bug" and color "#FF0000"
    Then I should see "Bug" label in the list

  Scenario: Edit a label
    Given a label "Feature" with color "#00FF00" exists
    When I edit the "Feature" label
    And I change the color to "#0000FF"
    Then the label color should be updated

  Scenario: Delete a label
    Given a label "Deprecated" exists
    When I delete the "Deprecated" label
    Then "Deprecated" should not appear in the labels list
    And todos should no longer have "Deprecated" label

  Scenario: Assign label to todo
    Given a label "Urgent" exists
    And a todo "Fix critical bug" exists
    When I assign "Urgent" label to "Fix critical bug"
    Then "Fix critical bug" should display "Urgent" label

  # Unhappy Path Scenarios
  Scenario: Cannot create label with empty name
    When I try to create a label without a name
    Then I should see an error "Label name is required"

  Scenario: Cannot create duplicate label
    Given a label "Bug" exists
    When I try to create another label named "Bug"
    Then I should see an error "Label already exists"
```

### 3.5 Search Features (Frontend)

#### Feature: Search Todos (`search-todos.feature`)

```gherkin
Feature: Search Todos
  As a user
  I want to search todos
  So that I can find specific tasks

  Background:
    Given the following todos exist across boards:
      | title              | description          | board    |
      | Fix login bug      | Auth module issue    | Work     |
      | Buy groceries      | Weekly shopping      | Personal |
      | Review PR #123     | Code review needed   | Work     |

  # Happy Path Scenarios
  Scenario: Search by title
    When I enter "login" in the search box
    Then I should see "Fix login bug" in results
    And I should not see "Buy groceries" in results

  Scenario: Search by description
    When I enter "shopping" in the search box
    Then I should see "Buy groceries" in results

  Scenario: Search across all boards
    When I enter "Work" related search
    Then I should see results from "Work" board

  Scenario: No search results
    When I enter "nonexistent" in the search box
    Then I should see "No results found" message

  # Unhappy Path Scenarios
  Scenario: Handle search with special characters
    When I enter "<script>alert('xss')</script>" in the search box
    Then the search should complete safely
    And no script should execute

  Scenario: Search with very long query
    When I enter a 1000 character search query
    Then I should see appropriate results or empty state
    And the application should not crash
```

---

## 4. API BDD Features (Backend)

### 4.1 Boards API (`boards-api.feature`)

```gherkin
Feature: Boards API
  As an API consumer
  I want to manage boards via REST API
  So that I can programmatically control boards

  # Happy Path Scenarios
  Scenario: List all boards
    Given boards "Work" and "Personal" exist
    When I GET /api/boards
    Then the response status should be 200
    And the response should contain 2 boards

  Scenario: Create a board
    When I POST to /api/boards with:
      | name        | New Project |
      | description | Test board  |
    Then the response status should be 201
    And the response should contain the created board

  Scenario: Create board from template
    When I POST to /api/boards with:
      | name       | Sprint Board |
      | templateId | kanban-basic |
    Then the response status should be 201
    And the board should have 3 columns

  Scenario: Get board by ID
    Given a board "Test" exists with id "board-123"
    When I GET /api/boards/board-123
    Then the response status should be 200
    And the response should contain board details

  Scenario: Update board
    Given a board "Old Name" exists
    When I PUT /api/boards/:id with:
      | name | New Name |
    Then the response status should be 200
    And the board name should be "New Name"

  Scenario: Delete board
    Given a board "To Delete" exists
    When I DELETE /api/boards/:id
    Then the response status should be 204
    And the board should no longer exist

  # Unhappy Path Scenarios
  Scenario: Get non-existent board
    When I GET /api/boards/non-existent-id
    Then the response status should be 404
    And the response should contain "Board not found"

  Scenario: Create board with invalid data
    When I POST to /api/boards with:
      | name | |
    Then the response status should be 400
    And the response should contain validation errors

  Scenario: Update non-existent board
    When I PUT /api/boards/non-existent-id with:
      | name | Test |
    Then the response status should be 404

  Scenario: Delete non-existent board
    When I DELETE /api/boards/non-existent-id
    Then the response status should be 404
```

### 4.2 Columns API (`columns-api.feature`)

```gherkin
Feature: Columns API
  As an API consumer
  I want to manage columns via REST API
  So that I can programmatically control board columns

  Background:
    Given a board "Test Board" exists with id "board-1"

  # Happy Path Scenarios
  Scenario: Add column to board
    When I POST to /api/boards/board-1/columns with:
      | name     | New Column |
      | position | 0          |
    Then the response status should be 201
    And the column should be added to the board

  Scenario: Update column
    Given a column "Old Name" exists
    When I PUT /api/columns/:id with:
      | name | New Name |
    Then the response status should be 200

  Scenario: Delete column
    Given a column "To Delete" exists with no todos
    When I DELETE /api/columns/:id
    Then the response status should be 204

  Scenario: Reorder columns
    Given columns "A, B, C" exist in that order
    When I PATCH /api/columns/reorder with new positions
    Then the columns should be reordered

  # Unhappy Path Scenarios
  Scenario: Add column to non-existent board
    When I POST to /api/boards/non-existent/columns
    Then the response status should be 404

  Scenario: Delete column with todos
    Given a column with 5 todos exists
    When I DELETE /api/columns/:id without force flag
    Then the response status should be 409
    And the response should warn about existing todos
```

### 4.3 Todos API (`todos-api.feature`)

```gherkin
Feature: Todos API
  As an API consumer
  I want to manage todos via REST API
  So that I can programmatically control tasks

  # Happy Path Scenarios
  Scenario: Create todo
    Given a column exists
    When I POST to /api/todos with:
      | title    | New Task |
      | columnId | col-1    |
    Then the response status should be 201

  Scenario: Create todo with all fields
    When I POST to /api/todos with:
      | title       | Full Task           |
      | description | Detailed desc       |
      | priority    | HIGH                |
      | dueDate     | 2025-02-01          |
      | columnId    | col-1               |
    Then the response status should be 201
    And all fields should be saved

  Scenario: Update todo
    Given a todo "Test" exists
    When I PUT /api/todos/:id with:
      | title | Updated |
    Then the response status should be 200

  Scenario: Move todo to another column
    Given a todo in column "Todo" exists
    When I PATCH /api/todos/:id/move with:
      | columnId | in-progress-col |
    Then the response status should be 200
    And the todo should be in new column

  Scenario: Delete todo
    Given a todo exists
    When I DELETE /api/todos/:id
    Then the response status should be 204

  Scenario: Archive todo
    Given a todo exists
    When I PATCH /api/todos/:id/archive
    Then the response status should be 200
    And the todo should be archived

  # Unhappy Path Scenarios
  Scenario: Create todo without required fields
    When I POST to /api/todos with:
      | description | No title |
    Then the response status should be 400

  Scenario: Create todo with invalid priority
    When I POST to /api/todos with:
      | title    | Test    |
      | priority | INVALID |
      | columnId | col-1   |
    Then the response status should be 400
    And the response should contain "Invalid priority"

  Scenario: Move todo to non-existent column
    Given a todo exists
    When I PATCH /api/todos/:id/move with:
      | columnId | non-existent |
    Then the response status should be 404
```

### 4.4 Labels API (`labels-api.feature`)

```gherkin
Feature: Labels API
  As an API consumer
  I want to manage labels via REST API

  # Happy Path Scenarios
  Scenario: List all labels
    Given labels "Bug, Feature" exist
    When I GET /api/labels
    Then the response status should be 200
    And the response should contain 2 labels

  Scenario: Create label
    When I POST to /api/labels with:
      | name  | Urgent  |
      | color | #FF0000 |
    Then the response status should be 201

  Scenario: Update label
    Given a label "Test" exists
    When I PUT /api/labels/:id with:
      | color | #00FF00 |
    Then the response status should be 200

  Scenario: Delete label
    Given a label "To Delete" exists
    When I DELETE /api/labels/:id
    Then the response status should be 204

  # Unhappy Path Scenarios
  Scenario: Create label with invalid color
    When I POST to /api/labels with:
      | name  | Test    |
      | color | invalid |
    Then the response status should be 400
    And the response should contain "Invalid color format"
```

---

## 5. Test Implementation Checklist

### Phase 2.1: BDD Test Setup
- [ ] Install Playwright and Cucumber.js dependencies (frontend)
- [ ] Install Supertest and Cucumber.js dependencies (backend)
- [ ] Configure Cucumber for both frontend and backend
- [ ] Set up test database for backend tests
- [ ] Create Page Objects for frontend tests
- [ ] Create API helpers for backend tests

### Phase 2.2: Frontend BDD Tests
- [ ] Implement Board feature tests (create, delete, view)
- [ ] Implement Column feature tests (add, reorder, delete)
- [ ] Implement Todo feature tests (create, edit, move, delete)
- [ ] Implement Label feature tests (manage labels)
- [ ] Implement Search feature tests

### Phase 2.3: Backend BDD Tests
- [ ] Implement Boards API tests
- [ ] Implement Columns API tests
- [ ] Implement Todos API tests
- [ ] Implement Labels API tests
- [ ] Implement Templates API tests

### Phase 2.4: CI Integration
- [ ] Add BDD test job to CI pipeline
- [ ] Configure test database in CI
- [ ] Add test reporting
- [ ] Configure parallel test execution
- [ ] Add test coverage thresholds

---

## 6. Package Scripts

```json
// apps/web/package.json
{
  "scripts": {
    "test:bdd": "cucumber-js -p default",
    "test:bdd:watch": "cucumber-js -p default --watch",
    "test:bdd:report": "cucumber-js -p default --format html:reports/bdd.html"
  }
}

// apps/api/package.json
{
  "scripts": {
    "test:bdd": "cucumber-js -p default",
    "test:bdd:watch": "cucumber-js -p default --watch",
    "test:bdd:report": "cucumber-js -p default --format html:reports/bdd.html"
  }
}
```

---

## 7. CI Pipeline Configuration

```yaml
# .github/workflows/bdd-tests.yml
name: BDD Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  frontend-bdd:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - name: Run Frontend BDD Tests
        run: pnpm --filter web test:bdd
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/

  backend-bdd:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: inzone_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - name: Setup Test Database
        run: |
          pnpm --filter api db:migrate:deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/inzone_test
      - name: Run Backend BDD Tests
        run: pnpm --filter api test:bdd
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/inzone_test
```

---

*Document Version: 1.0*
*Last Updated: 2025-01-25*
*Parent PRD: [InZone PRD](../inzone-prd.md)*
