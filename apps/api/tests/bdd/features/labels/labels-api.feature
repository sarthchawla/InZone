@labels @api
Feature: Labels API
  As an API consumer
  I want to manage labels via REST API
  So that I can categorize and organize todos

  # ===== HAPPY PATH SCENARIOS =====

  @happy-path
  Scenario: List labels when none exist
    When I GET /api/labels
    Then the response status should be 200
    And the response should be an empty array

  @happy-path
  Scenario: List all labels
    Given a label "Bug" with color "#FF0000" exists
    And a label "Feature" with color "#00FF00" exists
    When I GET /api/labels
    Then the response status should be 200
    And the response should contain 2 labels
    And the response should include a label named "Bug"
    And the response should include a label named "Feature"

  @happy-path
  Scenario: List labels returns them sorted by name
    Given a label "Zebra" with color "#000000" exists
    And a label "Alpha" with color "#FFFFFF" exists
    And a label "Middle" with color "#888888" exists
    When I GET /api/labels
    Then the response status should be 200
    And the labels should be ordered by name ascending

  @happy-path
  Scenario: Create a label
    When I POST to /api/labels with:
      | name  | Urgent  |
      | color | #FF0000 |
    Then the response status should be 201
    And the response should contain the label name "Urgent"
    And the response should contain the color "#FF0000"
    And the label should have an id

  @happy-path
  Scenario: Create a label with different color formats
    When I POST to /api/labels with:
      | name  | LowPriority |
      | color | #abcdef     |
    Then the response status should be 201
    And the response should contain the color "#abcdef"

  @happy-path
  Scenario: Create a label with uppercase hex color
    When I POST to /api/labels with:
      | name  | Important |
      | color | #AABBCC   |
    Then the response status should be 201
    And the response should contain the color "#AABBCC"

  @happy-path
  Scenario: Get label by ID
    Given a label "Test Label" with color "#123456" exists
    When I GET the label by ID
    Then the response status should be 200
    And the response should contain the label name "Test Label"
    And the response should contain the color "#123456"

  @happy-path
  Scenario: Get label includes todo count
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And a label "Bug" with color "#FF0000" exists
    And the column has a todo "Task 1" with label "Bug"
    And the column has a todo "Task 2" with label "Bug"
    When I GET the label by ID
    Then the response status should be 200
    And the label should have todo count of 2

  @happy-path
  Scenario: Label count updates when label is added to todo
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And a label "Feature" with color "#00FF00" exists
    And the column has a todo "Task Without Label"
    When I update the todo to add label "Feature"
    Then the response status should be 200
    When I GET /api/labels
    Then the response status should be 200
    And the label "Feature" should have todo count of 1

  @happy-path
  Scenario: Label count updates when label is removed from todo
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And a label "Temporary" with color "#888888" exists
    And the column has a todo "Task With Label" with label "Temporary"
    When I update the todo to remove all labels
    Then the response status should be 200
    When I GET /api/labels
    Then the response status should be 200
    And the label "Temporary" should have todo count of 0

  @happy-path
  Scenario: Update label name
    Given a label "Old Name" with color "#FF0000" exists
    When I PUT to /api/labels/:labelId with:
      | name | New Name |
    Then the response status should be 200
    And the response should contain the label name "New Name"
    And the response should contain the color "#FF0000"

  @happy-path
  Scenario: Update label color
    Given a label "Test" with color "#FF0000" exists
    When I PUT to /api/labels/:labelId with:
      | color | #00FF00 |
    Then the response status should be 200
    And the response should contain the label name "Test"
    And the response should contain the color "#00FF00"

  @happy-path
  Scenario: Update both label name and color
    Given a label "Old Label" with color "#000000" exists
    When I PUT to /api/labels/:labelId with:
      | name  | New Label |
      | color | #FFFFFF   |
    Then the response status should be 200
    And the response should contain the label name "New Label"
    And the response should contain the color "#FFFFFF"

  @happy-path
  Scenario: Delete label
    Given a label "To Delete" with color "#FF0000" exists
    When I DELETE the label
    Then the response status should be 204
    And the label should no longer exist

  @happy-path
  Scenario: Delete label removes it from todos
    Given a board "Test Board" exists
    And the board has a column "Todo"
    And a label "Temporary" with color "#888888" exists
    And the column has a todo "Task" with label "Temporary"
    When I DELETE the label
    Then the response status should be 204
    And the todo should have no labels

  # ===== UNHAPPY PATH SCENARIOS =====

  @unhappy-path
  Scenario: Get non-existent label
    When I GET /api/labels/non-existent-id
    Then the response status should be 404
    And the response should contain error "Label not found"

  @unhappy-path
  Scenario: Create label without name
    When I POST to /api/labels with:
      | color | #FF0000 |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create label with empty name
    When I POST to /api/labels with:
      | name  |         |
      | color | #FF0000 |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create label without color
    When I POST to /api/labels with:
      | name | No Color |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create label with invalid color format - missing hash
    When I POST to /api/labels with:
      | name  | Test   |
      | color | FF0000 |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create label with invalid color format - wrong length
    When I POST to /api/labels with:
      | name  | Test  |
      | color | #FFF  |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create label with invalid color format - non-hex characters
    When I POST to /api/labels with:
      | name  | Test    |
      | color | #GGGGGG |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create label with invalid color format - random string
    When I POST to /api/labels with:
      | name  | Test    |
      | color | invalid |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Create label with name exceeding max length
    When I POST to /api/labels with name exceeding 50 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update non-existent label
    When I PUT /api/labels/non-existent-id with:
      | name | Test |
    Then the response status should be 404
    And the response should contain error "Label not found"

  @unhappy-path
  Scenario: Update label with empty name
    Given a label "Test" with color "#FF0000" exists
    When I PUT to /api/labels/:labelId with:
      | name | |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update label with invalid color
    Given a label "Test" with color "#FF0000" exists
    When I PUT to /api/labels/:labelId with:
      | color | invalid |
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Update label with name exceeding max length
    Given a label "Test" with color "#FF0000" exists
    When I PUT to /api/labels/:labelId with name exceeding 50 characters
    Then the response status should be 400
    And the response should contain validation errors

  @unhappy-path
  Scenario: Delete non-existent label
    When I DELETE /api/labels/non-existent-id
    Then the response status should be 404
    And the response should contain error "Label not found"
