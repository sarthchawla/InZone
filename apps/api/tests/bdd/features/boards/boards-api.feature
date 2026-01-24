@boards @api
Feature: Boards API
  As an API consumer
  I want to manage boards via REST API
  So that I can programmatically control boards

  # ===== HAPPY PATH SCENARIOS =====

  @happy-path
  Scenario: List all boards when none exist
    When I GET /api/boards
    Then the response status should be 200
    And the response should be an empty array

  @happy-path
  Scenario: List all boards
    Given a board "Work" exists
    And a board "Personal" exists
    When I GET /api/boards
    Then the response status should be 200
    And the response should contain 2 boards
    And the response should include a board named "Work"
    And the response should include a board named "Personal"

  @happy-path
  Scenario: Create a board with name only
    When I POST to /api/boards with:
      | name | New Project |
    Then the response status should be 201
    And the response should contain the board name "New Project"
    And the board should have an id

  @happy-path
  Scenario: Create a board with name and description
    When I POST to /api/boards with:
      | name        | Sprint Board        |
      | description | Q1 Sprint planning  |
    Then the response status should be 201
    And the response should contain the board name "Sprint Board"
    And the response should contain the description "Q1 Sprint planning"

  @happy-path
  Scenario: Create a board from Basic Kanban template
    When I POST to /api/boards with:
      | name       | Sprint Board |
      | templateId | kanban-basic |
    Then the response status should be 201
    And the board should have 3 columns
    And the columns should be named "Todo, In Progress, Done"

  @happy-path
  Scenario: Create a board from Development template
    When I POST to /api/boards with:
      | name       | Dev Project  |
      | templateId | dev-workflow |
    Then the response status should be 201
    And the board should have 5 columns
    And the columns should be named "Backlog, Todo, In Progress, Review, Done"

  @happy-path
  Scenario: Create a board from Simple template
    When I POST to /api/boards with:
      | name       | Quick Tasks |
      | templateId | simple      |
    Then the response status should be 201
    And the board should have 2 columns
    And the columns should be named "Todo, Done"

  @happy-path
  Scenario: Get board by ID
    Given a board "Test Board" exists
    When I GET the board by ID
    Then the response status should be 200
    And the response should contain the board name "Test Board"

  @happy-path
  Scenario: Get board includes columns and todos
    Given a board "Test Board" with columns and todos exists
    When I GET the board by ID
    Then the response status should be 200
    And the response should contain columns
    And the columns should contain todos

  @happy-path
  Scenario: Update board name
    Given a board "Old Name" exists
    When I PUT to update the board with:
      | name | New Name |
    Then the response status should be 200
    And the response should contain the board name "New Name"

  @happy-path
  Scenario: Update board description
    Given a board "Test Board" exists
    When I PUT to update the board with:
      | description | Updated description |
    Then the response status should be 200
    And the response should contain the description "Updated description"

  @happy-path
  Scenario: Clear board description
    Given a board "Test Board" with description "Original desc" exists
    When I PUT to update the board with:
      | description | null |
    Then the response status should be 200
    And the board description should be null

  @happy-path
  Scenario: Delete board
    Given a board "To Delete" exists
    When I DELETE the board
    Then the response status should be 204
    And the board should no longer exist

  @happy-path
  Scenario: Delete board cascades to columns and todos
    Given a board "Test Board" with columns and todos exists
    When I DELETE the board
    Then the response status should be 204
    And the board columns should be deleted
    And the board todos should be deleted

  @happy-path
  Scenario: Duplicate board
    Given a board "Original Board" exists
    When I POST to duplicate the board
    Then the response status should be 201
    And the response should contain the board name "Original Board (Copy)"

  @happy-path
  Scenario: Duplicate board with columns
    Given a board "Source Board" with template "kanban-basic" exists
    When I POST to duplicate the board
    Then the response status should be 201
    And the duplicated board should have 3 columns
    And the columns should be named "Todo, In Progress, Done"

  @happy-path
  Scenario: Duplicate board with todos
    Given a board "Source Board" with columns and todos exists
    When I POST to duplicate the board
    Then the response status should be 201
    And the duplicated board should contain the same todos

  @happy-path
  Scenario: Add column to board
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | name | New Column |
    Then the response status should be 201
    And the response should contain the column name "New Column"

  @happy-path
  Scenario: Add column with WIP limit
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | name     | In Progress |
      | wipLimit | 5           |
    Then the response status should be 201
    And the column should have WIP limit 5

  @happy-path
  Scenario: Boards are listed in position order
    Given the following boards exist in order:
      | name     | position |
      | Third    | 2        |
      | First    | 0        |
      | Second   | 1        |
    When I GET /api/boards
    Then the response status should be 200
    And the boards should be in order "First, Second, Third"

  @happy-path
  Scenario: Board includes todo count
    Given a board "Work" with 5 todos exists
    When I GET /api/boards
    Then the response status should be 200
    And the board "Work" should have todo count 5

  # ===== UNHAPPY PATH SCENARIOS =====

  @unhappy-path
  Scenario: Get non-existent board
    When I GET /api/boards/non-existent-id
    Then the response status should be 404
    And the response should contain error "Board not found"

  @unhappy-path
  Scenario: Create board without name
    When I POST to /api/boards with:
      | description | No name provided |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create board with empty name
    When I POST to /api/boards with:
      | name | |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create board with name exceeding max length
    When I POST to /api/boards with name exceeding 100 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create board with description exceeding max length
    When I POST to /api/boards with description exceeding 500 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create board with non-existent template
    When I POST to /api/boards with:
      | name       | Test Board    |
      | templateId | non-existent  |
    Then the response status should be 201
    And the board should have 0 columns

  @unhappy-path
  Scenario: Update non-existent board
    When I PUT /api/boards/non-existent-id with:
      | name | Test |
    Then the response status should be 404
    And the response should contain error "Board not found"

  @unhappy-path
  Scenario: Update board with invalid name
    Given a board "Test Board" exists
    When I PUT to update the board with:
      | name | |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update board with name exceeding max length
    Given a board "Test Board" exists
    When I PUT to update the board with name exceeding 100 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Delete non-existent board
    When I DELETE /api/boards/non-existent-id
    Then the response status should be 404
    And the response should contain error "Board not found"

  @unhappy-path
  Scenario: Duplicate non-existent board
    When I POST /api/boards/non-existent-id/duplicate
    Then the response status should be 404
    And the response should contain error "Board not found"

  @unhappy-path
  Scenario: Add column to non-existent board
    When I POST to /api/boards/non-existent-id/columns with:
      | name | Test Column |
    Then the response status should be 404
    And the response should contain error "Board not found"

  @unhappy-path
  Scenario: Add column without name
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | wipLimit | 5 |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Add column with empty name
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | name | |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Add column with invalid WIP limit
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | name     | Test Column |
      | wipLimit | 0           |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Add column with negative WIP limit
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | name     | Test Column |
      | wipLimit | -1          |
    Then the response status should be 400
    And the response should contain validation errors
