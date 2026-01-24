Feature: Delete Todo
  As a user
  I want to delete todos
  So that I can remove completed or unwanted tasks

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"
    And a todo "Task to delete" exists in "Todo" column

  # Happy Path Scenarios
  Scenario: Delete todo with confirmation
    When I click the delete button on "Task to delete"
    Then I should see a confirmation dialog
    When I confirm the deletion
    Then "Task to delete" should no longer appear in the "Todo" column

  Scenario: Delete todo from edit modal
    When I click on the todo "Task to delete"
    And I click the delete button in the modal
    And I confirm the deletion
    Then "Task to delete" should no longer appear in the "Todo" column

  Scenario: Delete todo from context menu
    When I right-click on "Task to delete"
    And I select "Delete"
    And I confirm the deletion
    Then "Task to delete" should no longer appear in the "Todo" column

  Scenario: Delete todo with labels
    Given labels "Bug, Feature" exist
    And a todo "Labeled task" exists in "Todo" column with label "Bug"
    When I click the delete button on "Labeled task"
    And I confirm the deletion
    Then "Labeled task" should no longer appear in the "Todo" column
    And the label "Bug" should still exist

  Scenario: Delete todo with due date
    Given a todo "Dated task" exists in "Todo" column with due date in 3 days
    When I click the delete button on "Dated task"
    And I confirm the deletion
    Then "Dated task" should no longer appear in the "Todo" column

  Scenario: Delete one of multiple todos
    Given todos "Task A, Task B, Task C" exist in "Todo" column
    When I click the delete button on "Task B"
    And I confirm the deletion
    Then "Task B" should no longer appear in the "Todo" column
    And "Task A" should still appear in "Todo" column
    And "Task C" should still appear in "Todo" column

  Scenario: Delete todo updates column count
    Given "Todo" column shows count of 1
    When I click the delete button on "Task to delete"
    And I confirm the deletion
    Then "Todo" column should show count of 0

  Scenario: Delete todo from In Progress column
    Given a todo "Working task" exists in "In Progress" column
    When I click the delete button on "Working task"
    And I confirm the deletion
    Then "Working task" should no longer appear in the "In Progress" column

  Scenario: Delete todo from Done column
    Given a todo "Completed task" exists in "Done" column
    When I click the delete button on "Completed task"
    And I confirm the deletion
    Then "Completed task" should no longer appear in the "Done" column

  Scenario: Delete all todos from a column
    Given todos "Task A, Task B" exist in "Todo" column
    When I click the delete button on "Task A"
    And I confirm the deletion
    And I click the delete button on "Task B"
    And I confirm the deletion
    Then "Todo" column should be empty

  Scenario: Delete todo with keyboard shortcut
    When I select the todo "Task to delete"
    And I press Delete key
    And I confirm the deletion
    Then "Task to delete" should no longer appear in the "Todo" column

  # Unhappy Path Scenarios
  Scenario: Cancel todo deletion
    When I click the delete button on "Task to delete"
    Then I should see a confirmation dialog
    When I cancel the deletion
    Then "Task to delete" should still appear in the "Todo" column

  Scenario: Cancel deletion from edit modal
    When I click on the todo "Task to delete"
    And I click the delete button in the modal
    And I cancel the deletion
    Then "Task to delete" should still appear in the "Todo" column
    And the edit modal should still be open

  Scenario: Close confirmation dialog with Escape
    When I click the delete button on "Task to delete"
    Then I should see a confirmation dialog
    When I press Escape
    Then the confirmation dialog should be closed
    And "Task to delete" should still appear in the "Todo" column

  Scenario: Handle network error during deletion
    Given the network is unavailable
    When I click the delete button on "Task to delete"
    And I confirm the deletion
    Then I should see an error message "Failed to delete todo"
    And "Task to delete" should still appear in the "Todo" column

  Scenario: Handle server error during deletion
    Given the server will return an error for todo deletion
    When I click the delete button on "Task to delete"
    And I confirm the deletion
    Then I should see an error message "Failed to delete todo"
    And "Task to delete" should still appear in the "Todo" column

  Scenario: Delete already deleted todo
    Given the todo "Task to delete" has been deleted by another user
    When I click the delete button on "Task to delete"
    And I confirm the deletion
    Then I should see an error message "Todo not found"
    And the todo list should be refreshed

  Scenario: Delete todo during network recovery
    Given the network was unavailable
    And the network is now available
    When I click the delete button on "Task to delete"
    And I confirm the deletion
    Then "Task to delete" should no longer appear in the "Todo" column

  Scenario: Rapid deletion clicks handled properly
    When I click the delete button on "Task to delete"
    And I quickly click confirm multiple times
    Then "Task to delete" should no longer appear in the "Todo" column
    And no error should occur

  Scenario: Delete button disabled during pending operation
    When I click the delete button on "Task to delete"
    And I confirm the deletion
    Then the delete button should be disabled until operation completes

  Scenario: Undo delete not available after confirmation
    When I click the delete button on "Task to delete"
    And I confirm the deletion
    Then "Task to delete" should no longer appear in the "Todo" column
    And I should not see an undo option
