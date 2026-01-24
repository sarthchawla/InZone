Feature: Delete Column
  As a user
  I want to delete columns from my board
  So that I can remove unused workflow stages

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"

  # Happy Path Scenarios
  Scenario: Delete empty column with confirmation
    Given the "Done" column has no todos
    And the delete column endpoint returns success
    When I click the delete button for "Done" column
    Then I should see a confirmation dialog
    When I confirm the deletion
    Then "Done" should no longer appear in the column list
    And I should see 2 columns on the board

  Scenario: Cancel column deletion
    When I click the delete button for "Done" column
    And I cancel the deletion
    Then "Done" should still appear in the column list
    And I should see 3 columns on the board

  Scenario: Delete column with todos after confirmation
    Given the "In Progress" column has 3 todos
    And the delete column endpoint returns success
    When I click the delete button for "In Progress" column
    Then I should see a warning about 3 todos being deleted
    When I confirm the deletion
    Then "In Progress" should no longer appear in the column list
    And the 3 todos should be deleted

  Scenario: Delete column and move todos to another column
    Given the "In Progress" column has 2 todos
    And the delete column endpoint returns success
    When I click the delete button for "In Progress" column
    And I choose to move todos to "Todo" column
    And I confirm the deletion
    Then "In Progress" should no longer appear in the column list
    And the "Todo" column should have 2 additional todos

  Scenario: Delete the first column
    Given the delete column endpoint returns success
    When I click the delete button for "Todo" column
    And I confirm the deletion
    Then "Todo" should no longer appear in the column list
    And columns should be ordered "In Progress, Done"

  Scenario: Delete the last column
    Given the delete column endpoint returns success
    When I click the delete button for "Done" column
    And I confirm the deletion
    Then "Done" should no longer appear in the column list
    And columns should be ordered "Todo, In Progress"

  # Unhappy Path Scenarios
  Scenario: Cannot delete last remaining column
    Given I am viewing a board with columns "Only Column"
    When I click the delete button for "Only Column" column
    Then I should see an error "Cannot delete the last column"
    And "Only Column" should still appear in the column list

  Scenario: Handle server error during deletion
    Given the server will return an error for column deletion
    When I click the delete button for "Done" column
    And I confirm the deletion
    Then I should see an error "Failed to delete column"
    And "Done" should still appear in the column list

  Scenario: Handle network error during deletion
    Given the network is unavailable
    When I click the delete button for "Done" column
    And I confirm the deletion
    Then I should see an error "Failed to delete column"
    And "Done" should still appear in the column list

  Scenario: Handle column deleted by another user
    Given the "In Progress" column has been deleted by another user
    When I click the delete button for "In Progress" column
    Then I should see an error "Column no longer exists"
    And the board should refresh to show current state
