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
