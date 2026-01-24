Feature: Edit Todo
  As a user
  I want to edit existing todos
  So that I can update task details

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"
    And a todo "Original task" exists in "Todo" column with details:
      | description | Original description |
      | priority    | MEDIUM               |

  # Happy Path Scenarios
  Scenario: Edit todo title
    When I click on the todo "Original task"
    And I change the title to "Updated task"
    And I click "Save"
    Then I should see "Updated task" in the "Todo" column
    And I should not see "Original task" in the "Todo" column

  Scenario: Edit todo description
    When I click on the todo "Original task"
    And I change the description to "Updated description"
    And I click "Save"
    Then the todo "Original task" should have description "Updated description"

  Scenario: Clear todo description
    When I click on the todo "Original task"
    And I clear the description
    And I click "Save"
    Then the todo "Original task" should have no description

  Scenario: Edit todo priority
    When I click on the todo "Original task"
    And I change the priority to "HIGH"
    And I click "Save"
    Then the todo "Original task" should show "HIGH" priority badge

  Scenario: Change priority from HIGH to LOW
    Given a todo "High priority task" exists in "Todo" column with priority "HIGH"
    When I click on the todo "High priority task"
    And I change the priority to "LOW"
    And I click "Save"
    Then the todo "High priority task" should show "LOW" priority badge

  Scenario: Add due date to existing todo
    When I click on the todo "Original task"
    And I set the due date to tomorrow
    And I click "Save"
    Then the todo "Original task" should show the due date

  Scenario: Change due date
    Given a todo "Dated task" exists in "Todo" column with due date in 3 days
    When I click on the todo "Dated task"
    And I set the due date to tomorrow
    And I click "Save"
    Then the todo "Dated task" should show the updated due date

  Scenario: Remove due date from todo
    Given a todo "Dated task" exists in "Todo" column with due date in 3 days
    When I click on the todo "Dated task"
    And I clear the due date
    And I click "Save"
    Then the todo "Dated task" should not show a due date

  Scenario: Add label to existing todo
    Given labels "Bug, Feature, Urgent" exist
    When I click on the todo "Original task"
    And I add label "Bug"
    And I click "Save"
    Then the todo "Original task" should display "Bug" label

  Scenario: Remove label from todo
    Given labels "Bug, Feature, Urgent" exist
    And a todo "Labeled task" exists in "Todo" column with label "Bug"
    When I click on the todo "Labeled task"
    And I remove label "Bug"
    And I click "Save"
    Then the todo "Labeled task" should not display "Bug" label

  Scenario: Edit multiple fields at once
    Given labels "Bug, Feature" exist
    When I click on the todo "Original task"
    And I change the title to "Completely updated"
    And I change the description to "New description"
    And I change the priority to "URGENT"
    And I set the due date to tomorrow
    And I add label "Bug"
    And I click "Save"
    Then I should see "Completely updated" in the "Todo" column
    And the todo "Completely updated" should show "URGENT" priority badge
    And the todo "Completely updated" should show the due date
    And the todo "Completely updated" should display "Bug" label

  Scenario: Edit todo via inline editing
    When I double-click on the todo title "Original task"
    And I type "Quick edit" and press Enter
    Then I should see "Quick edit" in the "Todo" column

  # Unhappy Path Scenarios
  Scenario: Cannot save todo with empty title
    When I click on the todo "Original task"
    And I clear the title
    And I click "Save"
    Then I should see an error "Title is required"
    And the todo should still be "Original task"

  Scenario: Cannot save todo with whitespace-only title
    When I click on the todo "Original task"
    And I change the title to "   "
    And I click "Save"
    Then I should see an error "Title is required"
    And the todo should still be "Original task"

  Scenario: Cannot save todo with very long title
    When I click on the todo "Original task"
    And I enter a 501 character todo title
    And I click "Save"
    Then I should see an error "Title must be less than 500 characters"

  Scenario: Handle network error during edit
    Given the network is unavailable
    When I click on the todo "Original task"
    And I change the title to "Updated task"
    And I click "Save"
    Then I should see an error message "Failed to update todo"
    And the todo should still be "Original task"

  Scenario: Handle server error during edit
    Given the server will return an error for todo update
    When I click on the todo "Original task"
    And I change the title to "Updated task"
    And I click "Save"
    Then I should see an error message "Failed to update todo"

  Scenario: Handle concurrent edit conflict
    Given another user has modified the todo "Original task"
    When I click on the todo "Original task"
    And I change the title to "My update"
    And I click "Save"
    Then I should see a warning about concurrent modification
    And I should be prompted to refresh or overwrite

  Scenario: Cancel edit preserves original values
    When I click on the todo "Original task"
    And I change the title to "Discarded changes"
    And I change the priority to "URGENT"
    And I click "Cancel"
    Then I should see "Original task" in the "Todo" column
    And the todo "Original task" should show "MEDIUM" priority badge

  Scenario: Close edit modal with Escape key
    When I click on the todo "Original task"
    And I change the title to "Discarded changes"
    And I press Escape
    Then the edit modal should be closed
    And I should see "Original task" in the "Todo" column

  Scenario: Edit non-existent todo shows error
    Given the todo "Original task" has been deleted by another user
    When I click on the todo "Original task"
    Then I should see an error message "Todo not found"
    And I should see updated todo list
