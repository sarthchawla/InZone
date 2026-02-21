@columns @api
Feature: Columns API
  As an API consumer
  I want to manage columns via REST API
  So that I can programmatically control board columns

  # ===== HAPPY PATH SCENARIOS =====

  @happy-path
  Scenario: Add column to board
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | name | New Column |
    Then the response status should be 201
    And the response should contain the column name "New Column"
    And the column should have an id
    And the column should have position 0

  @happy-path
  Scenario: Add second column to board
    Given a board "Test Board" exists
    And the board has a column "First Column"
    When I POST to /api/boards/:boardId/columns with:
      | name | Second Column |
    Then the response status should be 201
    And the response should contain the column name "Second Column"
    And the column should have position 1

  @happy-path
  Scenario: Add column with WIP limit
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with:
      | name     | In Progress |
      | wipLimit | 5           |
    Then the response status should be 201
    And the response should contain the column name "In Progress"
    And the column should have WIP limit 5

  @happy-path
  Scenario: Update column name
    Given a board "Test Board" exists
    And the board has a column "Old Name"
    When I PUT to /api/columns/:columnId with:
      | name | New Name |
    Then the response status should be 200
    And the response should contain the column name "New Name"

  @happy-path
  Scenario: Update column WIP limit
    Given a board "Test Board" exists
    And the board has a column "In Progress" with WIP limit 3
    When I PUT to /api/columns/:columnId with:
      | wipLimit | 10 |
    Then the response status should be 200
    And the column should have WIP limit 10

  @happy-path
  Scenario: Remove column WIP limit
    Given a board "Test Board" exists
    And the board has a column "In Progress" with WIP limit 5
    When I PUT to /api/columns/:columnId with:
      | wipLimit | null |
    Then the response status should be 200
    And the column WIP limit should be null

  @happy-path
  Scenario: Update column name and WIP limit together
    Given a board "Test Board" exists
    And the board has a column "Old Name"
    When I PUT to /api/columns/:columnId with:
      | name     | Updated Name |
      | wipLimit | 7            |
    Then the response status should be 200
    And the response should contain the column name "Updated Name"
    And the column should have WIP limit 7

  @happy-path
  Scenario: Delete empty column
    Given a board "Test Board" exists
    And the board has a column "To Delete" with no todos
    When I DELETE the column
    Then the response status should be 204
    And the column should no longer exist

  @happy-path
  Scenario: Delete column with todos cascades deletion
    Given a board "Test Board" exists
    And the board has a column "To Delete" with 3 todos
    When I DELETE the column
    Then the response status should be 204
    And the column should no longer exist
    And the todos should be deleted

  @happy-path
  Scenario: Delete column and move todos to another column
    Given a board "Test Board" exists
    And the board has columns "Source, Target"
    And the column "Source" has 2 todos
    When I DELETE column "Source" moving todos to "Target"
    Then the response status should be 204
    And the column "Source" should no longer exist
    And the column "Target" should have 2 todos

  @happy-path
  Scenario: Reorder columns
    Given a board "Test Board" exists
    And the board has columns "A, B, C" in that order
    When I PATCH /api/columns/reorder with new positions:
      | column | newPosition |
      | A      | 2           |
      | B      | 0           |
      | C      | 1           |
    Then the response status should be 200
    And the columns should be in order "B, C, A"

  @happy-path
  Scenario: Reorder two columns swap positions
    Given a board "Test Board" exists
    And the board has columns "First, Second" in that order
    When I PATCH /api/columns/reorder to swap "First" and "Second"
    Then the response status should be 200
    And the columns should be in order "Second, First"

  @happy-path
  Scenario: Column update returns todos
    Given a board "Test Board" exists
    And the board has a column "Todo" with 2 todos
    When I PUT to /api/columns/:columnId with:
      | name | Updated Todo |
    Then the response status should be 200
    And the response should include the column todos

  @happy-path
  Scenario: Add description to column
    Given a board "Test Board" exists
    And the board has a column "Todo"
    When I PUT to /api/columns/:columnId with:
      | description | This is a column description |
    Then the response status should be 200
    And the column description should be "This is a column description"

  @happy-path
  Scenario: Update column description
    Given a board "Test Board" exists
    And the board has a column "Todo" with description "Old description"
    When I PUT to /api/columns/:columnId with:
      | description | New description |
    Then the response status should be 200
    And the column description should be "New description"

  @happy-path
  Scenario: Clear column description
    Given a board "Test Board" exists
    And the board has a column "Todo" with description "Some description"
    When I PUT to /api/columns/:columnId with:
      | description | null |
    Then the response status should be 200
    And the column description should be null

  @happy-path
  Scenario: Update column name and description together
    Given a board "Test Board" exists
    And the board has a column "Old Name"
    When I PUT to /api/columns/:columnId with:
      | name        | New Name                     |
      | description | Added a helpful description  |
    Then the response status should be 200
    And the response should contain the column name "New Name"
    And the column description should be "Added a helpful description"

  # ===== UNHAPPY PATH SCENARIOS =====

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
  Scenario: Add column with name exceeding max length
    Given a board "Test Board" exists
    When I POST to /api/boards/:boardId/columns with name exceeding 100 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Add column with zero WIP limit
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

  @unhappy-path
  Scenario: Update non-existent column
    When I PUT /api/columns/non-existent-id with:
      | name | Test |
    Then the response status should be 404
    And the response should contain error "Column not found"

  @unhappy-path
  Scenario: Update column with empty name
    Given a board "Test Board" exists
    And the board has a column "Test Column"
    When I PUT to /api/columns/:columnId with:
      | name | |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update column with name exceeding max length
    Given a board "Test Board" exists
    And the board has a column "Test Column"
    When I PUT to /api/columns/:columnId with name exceeding 100 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update column with zero WIP limit
    Given a board "Test Board" exists
    And the board has a column "Test Column"
    When I PUT to /api/columns/:columnId with:
      | wipLimit | 0 |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update column with negative WIP limit
    Given a board "Test Board" exists
    And the board has a column "Test Column"
    When I PUT to /api/columns/:columnId with:
      | wipLimit | -5 |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Delete non-existent column
    When I DELETE /api/columns/non-existent-id
    Then the response status should be 404
    And the response should contain error "Column not found"

  @unhappy-path
  Scenario: Delete column moving todos to non-existent target
    Given a board "Test Board" exists
    And the board has a column "Source" with 2 todos
    When I DELETE /api/columns/:columnId with moveToColumnId "non-existent-id"
    Then the response status should be 400
    And the response should contain error "Invalid target column"

  @unhappy-path
  Scenario: Delete column moving todos to column in different board
    Given a board "Board A" exists
    And the board has a column "Source" with 2 todos
    And a different board "Board B" exists with column "Target"
    When I DELETE column "Source" moving todos to column in different board
    Then the response status should be 400
    And the response should contain error "Invalid target column"

  @unhappy-path
  Scenario: Reorder columns with invalid board ID
    Given a board "Test Board" exists
    And the board has columns "A, B" in that order
    When I PATCH /api/columns/reorder with invalid boardId
    Then the response status should be 404
    And the response should contain error "Board not found"

  @unhappy-path
  Scenario: Reorder columns with non-existent column IDs
    Given a board "Test Board" exists
    When I PATCH /api/columns/reorder with:
      | boardId | boardId        |
      | columns | non-existent   |
    Then the response status should be 400
    And the response should contain error "Invalid column IDs or board mismatch"

  @unhappy-path
  Scenario: Reorder columns from different boards
    Given a board "Board A" exists with columns "A1, A2"
    And a board "Board B" exists with columns "B1, B2"
    When I PATCH /api/columns/reorder mixing columns from different boards
    Then the response status should be 400
    And the response should contain error "Invalid column IDs or board mismatch"

  @unhappy-path
  Scenario: Reorder columns with missing boardId
    When I PATCH /api/columns/reorder without boardId
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Reorder columns with empty columns array
    Given a board "Test Board" exists
    When I PATCH /api/columns/reorder with empty columns array
    Then the response status should be 200
    And the response should be an empty array

  @unhappy-path
  Scenario: Reorder columns with negative position
    Given a board "Test Board" exists
    And the board has columns "A, B" in that order
    When I PATCH /api/columns/reorder with negative position
    Then the response status should be 400
    And the response should contain validation errors
