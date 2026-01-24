Feature: Delete Board
  As a user
  I want to delete boards
  So that I can remove unused boards

  Background:
    Given I am on the boards list page

  # Happy Path Scenarios
  Scenario: Delete board with confirmation
    Given a board named "Test Board" exists with 3 todos
    And the delete endpoint returns success
    When I click the delete button for "Test Board"
    And I confirm the deletion
    Then "Test Board" should no longer appear in the boards list
    And all associated todos should be deleted

  Scenario: Cancel board deletion
    Given a board named "Test Board" exists with 3 todos
    When I click the delete button for "Test Board"
    And I cancel the deletion
    Then "Test Board" should still appear in the boards list
    And all todos should be preserved

  Scenario: Delete empty board
    Given a board named "Empty Board" exists with 0 todos
    And the delete endpoint returns success
    When I click the delete button for "Empty Board"
    And I confirm the deletion
    Then "Empty Board" should no longer appear in the boards list

  Scenario: Delete one of multiple boards
    Given the following boards exist:
      | name       | todoCount |
      | Work       | 5         |
      | Personal   | 3         |
      | Projects   | 10        |
    And the delete endpoint returns success
    When I click the delete button for "Personal"
    And I confirm the deletion
    Then "Personal" should no longer appear in the boards list
    And I should see "Work" in the boards list
    And I should see "Projects" in the boards list

  # Unhappy Path Scenarios
  Scenario: Handle server error during deletion
    Given a board named "Test Board" exists with 3 todos
    And the server will return an error for delete
    When I click the delete button for "Test Board"
    And I confirm the deletion
    Then I should see an error message "Failed to delete board"
    And "Test Board" should still appear in the boards list

  Scenario: Handle network failure during deletion
    Given a board named "Test Board" exists with 3 todos
    And the network is unavailable for delete
    When I click the delete button for "Test Board"
    And I confirm the deletion
    Then I should see an error message "Failed to delete board"
    And "Test Board" should still appear in the boards list

  Scenario: Attempt to delete board that no longer exists
    Given a board named "Stale Board" exists
    And the board is deleted by another user
    When I click the delete button for "Stale Board"
    And I confirm the deletion
    Then I should see an error message "Board not found"
