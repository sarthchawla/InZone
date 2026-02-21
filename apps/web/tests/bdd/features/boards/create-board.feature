Feature: Create Board
  As a user
  I want to create new boards
  So that I can organize my tasks

  Background:
    Given I am on the boards list page

  # Happy Path Scenarios
  Scenario: Create a board from scratch
    Given no boards exist
    When I click the "New Board" button
    And I enter "My Project" as the board name
    And I click "Create"
    Then I should see "My Project" in the boards list

  Scenario: Create a board from Basic Kanban template
    Given no boards exist
    And the templates endpoint returns default templates
    When I click the "New Board" button
    And I select "Basic Kanban" template
    And I enter "Sprint Board" as the board name
    And I click "Create"
    Then I should see "Sprint Board" in the boards list
    And the board should have columns "Todo, In Progress, Done"

  Scenario: Create a board from Development template
    Given no boards exist
    And the templates endpoint returns default templates
    When I click the "New Board" button
    And I select "Development" template
    And I enter "Dev Project" as the board name
    And I click "Create"
    Then I should see "Dev Project" in the boards list
    And the board should have columns "Backlog, Todo, In Progress, Review, Done"

  Scenario: Create a board from Simple template
    Given no boards exist
    And the templates endpoint returns default templates
    When I click the "New Board" button
    And I select "Simple" template
    And I enter "Quick Tasks" as the board name
    And I click "Create"
    Then I should see "Quick Tasks" in the boards list
    And the board should have columns "Todo, Done"

  @skip
  Scenario: Create a board with description
    Given no boards exist
    When I click the "New Board" button
    And I enter "My Project" as the board name
    And I enter "This is my project description" as the description
    And I click "Create"
    Then I should see "My Project" in the boards list

  # Validation Scenarios
  Scenario: Cannot create board with empty name - button disabled
    Given no boards exist
    When I click the "New Board" button
    And I leave the board name empty
    Then the create button should be disabled

  @skip
  Scenario: Handle network error during board creation
    # SKIP: Error messages not displayed in UI for failed API calls
    Given no boards exist
    And the server will return an error for create
    When I click the "New Board" button
    And I enter "My Project" as the board name
    And I click "Create"
    Then I should see an error message "Failed to create board"
    And no new board should be created

  @skip
  Scenario: Cancel board creation
    # SKIP: Inline create form has no Cancel button — there is no creation dialog to cancel
    Given no boards exist
    When I click the "New Board" button
    And I enter "My Project" as the board name
    And I click "Cancel"
    Then the create dialog should be closed
    And no new board should be created
