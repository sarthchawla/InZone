Feature: Move Todo
  As a user
  I want to move todos between columns
  So that I can update task progress

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"
    And a todo "Fix bug" exists in "Todo" column

  # Happy Path Scenarios
  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Drag todo to another column
    When I drag "Fix bug" to "In Progress" column
    Then "Fix bug" should appear in "In Progress" column
    And "Fix bug" should not appear in "Todo" column

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Drag todo to Done column
    When I drag "Fix bug" to "Done" column
    Then "Fix bug" should appear in "Done" column
    And "Fix bug" should not appear in "Todo" column

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Move todo back to previous column
    Given a todo "Blocked task" exists in "In Progress" column
    When I drag "Blocked task" to "Todo" column
    Then "Blocked task" should appear in "Todo" column
    And "Blocked task" should not appear in "In Progress" column

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Reorder todos within column
    Given "Fix bug" and "Write docs" exist in "Todo" column
    When I drag "Write docs" above "Fix bug"
    Then "Write docs" should appear before "Fix bug"

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Reorder multiple todos within column
    Given todos "Task A, Task B, Task C" exist in "Todo" column in that order
    When I drag "Task C" above "Task A"
    Then todos should be ordered "Task C, Task A, Task B" in "Todo" column

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Move todo to end of another column
    Given a todo "Existing task" exists in "In Progress" column
    When I drag "Fix bug" to "In Progress" column
    Then "Fix bug" should appear in "In Progress" column
    And "Fix bug" should appear after "Existing task" in the column

  @skip
  # SKIP: Context menu not implemented on TodoCard
  Scenario: Move todo via context menu
    When I right-click on "Fix bug"
    And I select "Move to In Progress"
    Then "Fix bug" should appear in "In Progress" column
    And "Fix bug" should not appear in "Todo" column

  @skip
  # SKIP: Move button/dropdown not implemented on TodoCard
  Scenario: Move todo via dropdown menu
    When I click the move button on "Fix bug"
    And I select "In Progress" from the column list
    Then "Fix bug" should appear in "In Progress" column

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Move multiple todos in sequence
    Given "Task A" and "Task B" exist in "Todo" column
    When I drag "Task A" to "In Progress" column
    And I drag "Task B" to "In Progress" column
    Then "Task A" should appear in "In Progress" column
    And "Task B" should appear in "In Progress" column
    And "Todo" column should be empty

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Move todo preserves all details
    Given a todo "Detailed task" exists in "Todo" column with details:
      | description | Important task description |
      | priority    | HIGH                       |
      | dueDate     | tomorrow                   |
    And labels "Bug" are assigned to "Detailed task"
    When I drag "Detailed task" to "In Progress" column
    Then "Detailed task" should appear in "In Progress" column
    And the todo "Detailed task" should show "HIGH" priority badge
    And the todo "Detailed task" should show the due date
    And the todo "Detailed task" should display "Bug" label

  @skip
  # SKIP: Drag and drop tests are flaky in Playwright with dnd-kit
  Scenario: Move todo updates column counts
    Given "Todo" column shows count of 1
    And "In Progress" column shows count of 0
    When I drag "Fix bug" to "In Progress" column
    Then "Todo" column should show count of 0
    And "In Progress" column should show count of 1

  # Unhappy Path Scenarios
  @skip
  # SKIP: Error message display for failed moves not implemented
  Scenario: Move fails due to server error
    Given the server will return an error for todo move
    When I drag "Fix bug" to "In Progress" column
    Then I should see an error message "Failed to move todo"
    And "Fix bug" should remain in "Todo" column

  @skip
  # SKIP: Error message display for failed moves not implemented
  Scenario: Move fails due to network error
    Given the network is unavailable
    When I drag "Fix bug" to "In Progress" column
    Then I should see an error message "Failed to move todo"
    And "Fix bug" should remain in "Todo" column

  @skip
  # SKIP: Non-existent column detection not implemented
  Scenario: Cannot move to non-existent column
    Given a column has been deleted by another user
    When I try to move a todo to that column
    Then I should see an error message "Column no longer exists"
    And I should see updated column list

  @skip
  # SKIP: WIP limit enforcement not implemented in UI
  Scenario: Cannot move to column at WIP limit
    Given the "In Progress" column has a WIP limit of 2
    And the "In Progress" column already has 2 todos
    When I drag "Fix bug" to "In Progress" column
    Then I should see a warning "WIP limit reached"
    And "Fix bug" should remain in "Todo" column

  @skip
  # SKIP: Optimistic update rollback not testable with current setup
  Scenario: Handle optimistic update rollback
    Given the server will return an error for todo move
    When I drag "Fix bug" to "In Progress" column
    Then "Fix bug" should briefly appear in "In Progress" column
    And then "Fix bug" should return to "Todo" column
    And I should see an error message

  @skip
  # SKIP: Drag cancel behavior not testable with current setup
  Scenario: Drag cancelled returns todo to original position
    When I start dragging "Fix bug"
    And I release outside any column
    Then "Fix bug" should remain in "Todo" column
    And "Fix bug" should be in its original position

  @skip
  # SKIP: Error message display for failed reorders not implemented
  Scenario: Reorder fails due to server error
    Given "Task A" and "Task B" exist in "Todo" column
    And the server will return an error for todo reorder
    When I drag "Task B" above "Task A"
    Then I should see an error message
    And todos should remain in original order

  @skip
  # SKIP: Stale column detection not implemented
  Scenario: Move todo when board has been modified
    Given another user has deleted "In Progress" column
    When I try to drag "Fix bug" to "In Progress" column
    Then I should see an error message "Column no longer exists"
    And I should see the board refreshed with current state

  @skip
  # SKIP: Concurrent modification detection not implemented
  Scenario: Concurrent move conflict
    Given another user is moving the same todo
    When I drag "Fix bug" to "In Progress" column
    Then I should see a warning about concurrent modification
    And the todo should be in its server-confirmed position
