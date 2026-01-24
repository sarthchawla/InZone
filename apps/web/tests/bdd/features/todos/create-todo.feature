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

  Scenario: Create a todo with description
    When I click "Add card" in the "Todo" column
    And I enter "Review PR" as the todo title
    And I enter "Check the authentication module changes" as the description
    And I click "Save"
    Then I should see "Review PR" in the "Todo" column

  Scenario: Create a todo with high priority
    When I click "Add card" in the "Todo" column
    And I enter "Fix critical bug" as the todo title
    And I select "HIGH" priority
    And I click "Save"
    Then I should see "Fix critical bug" in the "Todo" column
    And the todo should show "HIGH" priority badge

  Scenario: Create a todo with urgent priority
    When I click "Add card" in the "Todo" column
    And I enter "Production hotfix" as the todo title
    And I select "URGENT" priority
    And I click "Save"
    Then I should see "Production hotfix" in the "Todo" column
    And the todo should show "URGENT" priority badge

  Scenario: Create a todo with due date
    When I click "Add card" in the "Todo" column
    And I enter "Submit report" as the todo title
    And I set the due date to tomorrow
    And I click "Save"
    Then I should see "Submit report" in the "Todo" column
    And the todo should show the due date

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
    When I click "Add card" in the "Todo" column
    And I enter "Fix login issue" as the todo title
    And I assign labels "Bug, Urgent"
    And I click "Save"
    Then I should see "Fix login issue" in the "Todo" column
    And the todo should display "Bug" and "Urgent" labels

  Scenario: Create todo in a different column
    When I click "Add card" in the "In Progress" column
    And I enter "Working on feature" as the todo title
    And I click "Save"
    Then I should see "Working on feature" in the "In Progress" column
    And I should not see "Working on feature" in the "Todo" column

  Scenario: Create multiple todos in same column
    When I click "Add card" in the "Todo" column
    And I enter "First task" as the todo title
    And I click "Save"
    Then I should see "First task" in the "Todo" column
    When I click "Add card" in the "Todo" column
    And I enter "Second task" as the todo title
    And I click "Save"
    Then I should see "Second task" in the "Todo" column
    And I should see "First task" in the "Todo" column

  # Unhappy Path Scenarios
  Scenario: Cannot create todo with empty title
    When I click "Add card" in the "Todo" column
    And I leave the title empty
    And I click "Save"
    Then I should see an error "Title is required"
    And no todo should be created

  Scenario: Cannot create todo with whitespace-only title
    When I click "Add card" in the "Todo" column
    And I enter "   " as the todo title
    And I click "Save"
    Then I should see an error "Title is required"
    And no todo should be created

  Scenario: Cannot create todo with very long title
    When I click "Add card" in the "Todo" column
    And I enter a 501 character todo title
    And I click "Save"
    Then I should see an error "Title must be less than 500 characters"

  Scenario: Cannot create todo when column is at WIP limit
    Given the "In Progress" column has a WIP limit of 3
    And the "In Progress" column already has 3 todos
    When I try to add a todo to "In Progress" column
    Then I should see a warning "WIP limit reached"

  Scenario: Handle network error during creation
    Given the network is unavailable
    When I click "Add card" in the "Todo" column
    And I enter "Test todo" as the todo title
    And I click "Save"
    Then I should see an error message "Failed to create todo"
    And my input should be preserved

  Scenario: Handle server error during creation
    Given the server will return an error for todo creation
    When I click "Add card" in the "Todo" column
    And I enter "Test todo" as the todo title
    And I click "Save"
    Then I should see an error message "Failed to create todo"

  Scenario: Cancel todo creation
    When I click "Add card" in the "Todo" column
    And I enter "Draft todo" as the todo title
    And I click "Cancel"
    Then no todo should be created
    And I should not see "Draft todo" in the "Todo" column

  Scenario: Cancel todo creation preserves other todos
    Given a todo "Existing task" exists in "Todo" column
    When I click "Add card" in the "Todo" column
    And I enter "New task" as the todo title
    And I click "Cancel"
    Then I should see "Existing task" in the "Todo" column
    And I should not see "New task" in the "Todo" column
