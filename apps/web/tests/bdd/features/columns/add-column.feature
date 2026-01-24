Feature: Add Column
  As a user
  I want to add columns to my board
  So that I can customize my workflow

  Background:
    Given I am viewing a board with columns "Todo, Done"

  # Happy Path Scenarios
  Scenario: Add a new column
    Given the create column endpoint returns success
    When I click "Add column"
    And I enter "In Review" as the column name
    And I click "Save"
    Then I should see "In Review" column after "Done"

  Scenario: Add column with WIP limit
    Given the create column endpoint returns success
    When I click "Add column"
    And I enter "In Progress" as the column name
    And I set WIP limit to 5
    And I click "Save"
    Then "In Progress" column should show WIP limit indicator

  Scenario: Add column at specific position
    Given the create column endpoint returns success
    When I click "Add column"
    And I enter "In Progress" as the column name
    And I click "Save"
    Then I should see 3 columns on the board

  Scenario: Add multiple columns
    Given the create column endpoint returns success
    When I add a column named "In Progress"
    And I add a column named "Review"
    Then I should see 4 columns on the board
    And columns should be ordered "Todo, Done, In Progress, Review"

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

  Scenario: Cannot add column with very long name
    When I click "Add column"
    And I enter a 256 character column name
    And I click "Save"
    Then I should see an error "Column name must be less than 255 characters"

  Scenario: Handle server error during column creation
    Given the server will return an error for column creation
    When I click "Add column"
    And I enter "New Column" as the column name
    And I click "Save"
    Then I should see an error "Failed to create column"
    And I should see 2 columns on the board

  Scenario: Cancel column creation
    When I click "Add column"
    And I enter "New Column" as the column name
    And I click "Cancel"
    Then the add column form should be closed
    And I should see 2 columns on the board

  Scenario: Cannot set negative WIP limit
    When I click "Add column"
    And I enter "In Progress" as the column name
    And I set WIP limit to -1
    And I click "Save"
    Then I should see an error "WIP limit must be a positive number"
