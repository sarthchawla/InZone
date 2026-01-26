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
  Scenario: Cannot create todo with whitespace-only title
    When I click "Add card" in the "Todo" column
    And I enter "   " as the todo title
    And I click "Save"
    Then no todo should be created

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
