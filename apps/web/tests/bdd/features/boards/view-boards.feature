Feature: View Boards
  As a user
  I want to view my boards
  So that I can access my tasks

  # Happy Path Scenarios
  Scenario: View empty boards list
    Given no boards exist
    When I navigate to the boards list
    Then I should see an empty state message
    And I should see a "Create your first board" prompt

  Scenario: View boards list with multiple boards
    Given the following boards exist:
      | name       | todoCount |
      | Work       | 5         |
      | Personal   | 3         |
      | Projects   | 10        |
    When I navigate to the boards list
    Then I should see 3 boards
    And each board should display its todo count

  Scenario: Open board view
    Given a board named "Work" exists
    When I navigate to the boards list
    And I click on "Work" board
    Then I should be navigated to the board view
    And I should see the board columns

  # Unhappy Path Scenarios
  @skip
  # SKIP: Error message UI for loading errors not implemented
  Scenario: Handle loading error
    Given the API is unavailable
    When I navigate to the boards list
    Then I should see an error message "Failed to load boards"
    And I should see a "Retry" button

  Scenario: Handle slow network
    Given the network is slow
    When I navigate to the boards list
    Then I should see a loading indicator
    And boards should eventually appear
