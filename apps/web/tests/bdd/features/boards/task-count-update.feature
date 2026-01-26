Feature: Real-time Task Count Updates
  As a user
  I want task counts to update immediately
  So that I can see accurate board statistics without refreshing

  Background:
    Given I am on the boards list page

  # Happy Path Scenarios
  Scenario: Task count updates when adding a task
    Given a board "Project Board" exists with 3 tasks
    And I click on "Project Board" to open it
    When I add a new task "New Important Task" to the first column
    And I navigate back to the boards list
    Then I should see "Project Board" showing 4 tasks

  Scenario: Task count updates when deleting a task
    Given a board "Project Board" exists with 3 tasks
    And I click on "Project Board" to open it
    When I delete a task from the first column
    And I navigate back to the boards list
    Then I should see "Project Board" showing 2 tasks

  Scenario: Task count updates when archiving a task
    Given a board "Project Board" exists with 3 tasks
    And I click on "Project Board" to open it
    When I archive a task from the first column
    And I navigate back to the boards list
    Then I should see "Project Board" showing 2 tasks

  Scenario: Multiple task additions update count correctly
    Given a board "Project Board" exists with 0 tasks
    And I click on "Project Board" to open it
    When I add a new task "Task 1" to the first column
    And I add a new task "Task 2" to the first column
    And I add a new task "Task 3" to the first column
    And I navigate back to the boards list
    Then I should see "Project Board" showing 3 tasks

  # Edge Cases
  Scenario: Count remains correct after rapid task operations
    Given a board "Project Board" exists with 5 tasks
    And I click on "Project Board" to open it
    When I add a new task "Quick Task 1" to the first column
    And I add a new task "Quick Task 2" to the first column
    And I delete the task "Quick Task 1"
    And I navigate back to the boards list
    Then I should see "Project Board" showing 6 tasks

  Scenario: Count stays at zero after deleting all tasks
    Given a board "Project Board" exists with 1 task
    And I click on "Project Board" to open it
    When I delete the only task in the column
    And I navigate back to the boards list
    Then I should see "Project Board" showing 0 tasks
