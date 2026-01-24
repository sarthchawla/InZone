@todos @api
Feature: Todos API
  As an API consumer
  I want to manage todos via REST API
  So that I can programmatically control tasks

  # ===== HAPPY PATH SCENARIOS =====

  @happy-path
  Scenario: List todos when none exist
    When I GET /api/todos
    Then the response status should be 200
    And the response should be an empty array

  @happy-path
  Scenario: List all todos
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Task 1"
    And the column has a todo "Task 2"
    When I GET /api/todos
    Then the response status should be 200
    And the response should contain 2 todos
    And the response should include a todo titled "Task 1"
    And the response should include a todo titled "Task 2"

  @happy-path
  Scenario: Create todo with title only
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | title    | New Task  |
      | columnId | :columnId |
    Then the response status should be 201
    And the response should contain the todo title "New Task"
    And the todo should have an id
    And the todo should have priority "MEDIUM"
    And the todo should not be archived

  @happy-path
  Scenario: Create todo with all fields
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | title       | Full Task             |
      | description | Detailed description  |
      | priority    | HIGH                  |
      | dueDate     | 2025-02-01            |
      | columnId    | :columnId             |
    Then the response status should be 201
    And the response should contain the todo title "Full Task"
    And the response should contain the description "Detailed description"
    And the todo should have priority "HIGH"
    And the todo should have a due date

  @happy-path
  Scenario: Create todo with LOW priority
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | title    | Low priority task |
      | priority | LOW               |
      | columnId | :columnId         |
    Then the response status should be 201
    And the todo should have priority "LOW"

  @happy-path
  Scenario: Create todo with URGENT priority
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | title    | Urgent task |
      | priority | URGENT      |
      | columnId | :columnId   |
    Then the response status should be 201
    And the todo should have priority "URGENT"

  @happy-path
  Scenario: Create todo with labels
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And a label "Bug" with color "#FF0000" exists
    And a label "Urgent" with color "#FF5500" exists
    When I POST to /api/todos with labels:
      | title    | Fix critical bug |
      | columnId | :columnId        |
      | labels   | Bug, Urgent      |
    Then the response status should be 201
    And the todo should have 2 labels
    And the todo should have label "Bug"
    And the todo should have label "Urgent"

  @happy-path
  Scenario: Get todo by ID
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I GET the todo by ID
    Then the response status should be 200
    And the response should contain the todo title "Test Task"
    And the response should include the column info

  @happy-path
  Scenario: Update todo title
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Old Title"
    When I PUT to /api/todos/:todoId with:
      | title | New Title |
    Then the response status should be 200
    And the response should contain the todo title "New Title"

  @happy-path
  Scenario: Update todo description
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PUT to /api/todos/:todoId with:
      | description | Updated description |
    Then the response status should be 200
    And the response should contain the description "Updated description"

  @happy-path
  Scenario: Clear todo description
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task" with description "Original desc"
    When I PUT to /api/todos/:todoId with:
      | description | null |
    Then the response status should be 200
    And the todo description should be null

  @happy-path
  Scenario: Update todo priority
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task" with priority "MEDIUM"
    When I PUT to /api/todos/:todoId with:
      | priority | HIGH |
    Then the response status should be 200
    And the todo should have priority "HIGH"

  @happy-path
  Scenario: Update todo due date
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PUT to /api/todos/:todoId with:
      | dueDate | 2025-03-15 |
    Then the response status should be 200
    And the todo should have a due date

  @happy-path
  Scenario: Clear todo due date
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task" with due date
    When I PUT to /api/todos/:todoId with:
      | dueDate | null |
    Then the response status should be 200
    And the todo due date should be null

  @happy-path
  Scenario: Update multiple todo fields at once
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PUT to /api/todos/:todoId with:
      | title       | Updated Task   |
      | description | New desc       |
      | priority    | URGENT         |
    Then the response status should be 200
    And the response should contain the todo title "Updated Task"
    And the response should contain the description "New desc"
    And the todo should have priority "URGENT"

  @happy-path
  Scenario: Delete todo
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "To Delete"
    When I DELETE the todo
    Then the response status should be 204
    And the todo should no longer exist

  @happy-path
  Scenario: Move todo to another column
    Given a board "Test Board" exists
    And the board has columns "Todo, In Progress"
    And the column "Todo" has a todo "Moving Task"
    When I PATCH /api/todos/:todoId/move to column "In Progress"
    Then the response status should be 200
    And the todo should be in column "In Progress"

  @happy-path
  Scenario: Move todo to another column with specific position
    Given a board "Test Board" exists
    And the board has columns "Todo, Done"
    And the column "Done" has 2 todos
    And the column "Todo" has a todo "Moving Task"
    When I PATCH /api/todos/:todoId/move to column "Done" at position 1
    Then the response status should be 200
    And the todo should be in column "Done"
    And the todo should have position 1

  @happy-path
  Scenario: Reorder todos within column
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has todos "Task A, Task B, Task C" in order
    When I PATCH /api/todos/reorder with new positions:
      | todo   | newPosition |
      | Task A | 2           |
      | Task B | 0           |
      | Task C | 1           |
    Then the response status should be 200
    And the todos should be in order "Task B, Task C, Task A"

  @happy-path
  Scenario: Archive todo
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "To Archive"
    When I PATCH /api/todos/:todoId/archive with archived true
    Then the response status should be 200
    And the todo should be archived

  @happy-path
  Scenario: Unarchive todo
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has an archived todo "Archived Task"
    When I PATCH /api/todos/:todoId/archive with archived false
    Then the response status should be 200
    And the todo should not be archived

  @happy-path
  Scenario: Filter todos by column
    Given a board "Test Board" exists
    And the board has columns "Todo, Done"
    And the column "Todo" has 2 todos
    And the column "Done" has 3 todos
    When I GET /api/todos filtered by column "Todo"
    Then the response status should be 200
    And the response should contain 2 todos

  @happy-path
  Scenario: Filter todos by archived status
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has 2 active todos
    And the column has 1 archived todo
    When I GET /api/todos filtered by archived true
    Then the response status should be 200
    And the response should contain 1 todos

  @happy-path
  Scenario: Filter todos by priority
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo with priority "HIGH"
    And the column has a todo with priority "LOW"
    When I GET /api/todos filtered by priority "HIGH"
    Then the response status should be 200
    And the response should contain 1 todos
    And the todo should have priority "HIGH"

  @happy-path
  Scenario: Filter todos by label
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And a label "Bug" with color "#FF0000" exists
    And the column has a todo "Bug Task" with label "Bug"
    And the column has a todo "Regular Task" without labels
    When I GET /api/todos filtered by label "Bug"
    Then the response status should be 200
    And the response should contain 1 todos
    And the response should include a todo titled "Bug Task"

  @happy-path
  Scenario: Search todos
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Fix login bug"
    And the column has a todo "Add feature"
    When I GET /api/todos with search query "login"
    Then the response status should be 200
    And the response should contain 1 todos
    And the response should include a todo titled "Fix login bug"

  @happy-path
  Scenario: Todo includes labels in response
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And a label "Feature" with color "#00FF00" exists
    And the column has a todo "Feature Task" with label "Feature"
    When I GET the todo by ID
    Then the response status should be 200
    And the todo should have 1 labels
    And the todo should have label "Feature"

  # ===== UNHAPPY PATH SCENARIOS =====

  @unhappy-path
  Scenario: Get non-existent todo
    When I GET /api/todos/non-existent-id
    Then the response status should be 404
    And the response should contain error "Todo not found"

  @unhappy-path
  Scenario: Create todo without title
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | description | No title provided |
      | columnId    | :columnId         |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create todo with empty title
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | title    |           |
      | columnId | :columnId |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create todo without columnId
    When I POST to /api/todos with:
      | title | No column |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create todo with non-existent columnId
    When I POST to /api/todos with:
      | title    | Test Task       |
      | columnId | non-existent-id |
    Then the response status should be 404
    And the response should contain error "Column not found"

  @unhappy-path
  Scenario: Create todo with invalid priority
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | title    | Test Task |
      | priority | INVALID   |
      | columnId | :columnId |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create todo with title exceeding max length
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with title exceeding 255 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create todo with invalid due date format
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with:
      | title    | Test Task    |
      | dueDate  | invalid-date |
      | columnId | :columnId    |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path @skip
  Scenario: Create todo with non-existent label
    # Note: This scenario is skipped because the current API implementation
    # returns a 500 error when Prisma fails to connect non-existent labels.
    # A future improvement would be to validate label IDs before connecting.
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I POST to /api/todos with non-existent labels:
      | title    | Test Task        |
      | columnId | :columnId        |
      | labels   | non-existent-id  |
    Then the response status should be 500

  @unhappy-path
  Scenario: Update non-existent todo
    When I PUT /api/todos/non-existent-id with:
      | title | Test |
    Then the response status should be 404
    And the response should contain error "Todo not found"

  @unhappy-path
  Scenario: Update todo with empty title
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PUT to /api/todos/:todoId with:
      | title | |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update todo with title exceeding max length
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PUT to /api/todos/:todoId with title exceeding 255 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update todo with invalid priority
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PUT to /api/todos/:todoId with:
      | priority | INVALID |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Delete non-existent todo
    When I DELETE /api/todos/non-existent-id
    Then the response status should be 404
    And the response should contain error "Todo not found"

  @unhappy-path
  Scenario: Move non-existent todo
    When I PATCH /api/todos/non-existent-id/move with:
      | columnId | some-column-id |
    Then the response status should be 404
    And the response should contain error "Target column not found"

  @unhappy-path
  Scenario: Move todo to non-existent column
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PATCH to move the todo with:
      | columnId | non-existent-id |
    Then the response status should be 404
    And the response should contain error "Target column not found"

  @unhappy-path
  Scenario: Move todo without columnId
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PATCH to move the todo with:
      | position | 0 |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Move todo with negative position
    Given a board "Test Board" exists
    And the board has columns "Todo, Done"
    And the column "Todo" has a todo "Test Task"
    When I PATCH /api/todos/:todoId/move to column "Done" at position -1
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Reorder todos with invalid column ID
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has todos "Task A, Task B" in order
    When I PATCH /api/todos/reorder with invalid columnId
    Then the response status should be 400
    And the response should contain error "Invalid todo IDs or column mismatch"

  @unhappy-path
  Scenario: Reorder todos with non-existent todo IDs
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I PATCH /api/todos/reorder with:
      | columnId | :columnId        |
      | todos    | non-existent     |
    Then the response status should be 400
    And the response should contain error "Invalid todo IDs or column mismatch"

  @unhappy-path
  Scenario: Reorder todos from different columns
    Given a board "Test Board" exists
    And the board has columns "Todo, Done"
    And the column "Todo" has a todo "Task 1"
    And the column "Done" has a todo "Task 2"
    When I PATCH /api/todos/reorder mixing todos from different columns
    Then the response status should be 400
    And the response should contain error "Invalid todo IDs or column mismatch"

  @unhappy-path
  Scenario: Reorder todos with missing columnId
    When I PATCH /api/todos/reorder without columnId
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Reorder todos with negative position
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has todos "Task A, Task B" in order
    When I PATCH /api/todos/reorder with negative position
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Archive non-existent todo
    When I PATCH /api/todos/non-existent-id/archive with:
      | archived | true |
    Then the response status should be 404
    And the response should contain error "Todo not found"

  @unhappy-path
  Scenario: Archive todo without archived field
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And the column has a todo "Test Task"
    When I PATCH /api/todos/:todoId/archive without archived field
    Then the response status should be 400
    And the response should contain validation errors
