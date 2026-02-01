Feature: Swimlane Description Tooltip
  As a user
  I want to see column descriptions when hovering over an info icon
  So that I can understand the purpose of each column

  Background:
    Given I am viewing a board with columns "Todo, In Progress, Done"

  # Happy Path Scenarios
  Scenario: Info icon is always visible in column header
    Then I should see an info icon in the "Todo" column header
    And I should see an info icon in the "In Progress" column header
    And I should see an info icon in the "Done" column header

  Scenario: View column description on hover
    Given the "Todo" column has description "Tasks that need to be started"
    When I hover over the info icon in the "Todo" column header
    Then I should see a tooltip with "Tasks that need to be started"

  Scenario: Fallback text shown when no description
    Given the "In Progress" column has no description
    When I hover over the info icon in the "In Progress" column header
    Then I should see a tooltip with "No description. Click to add one."

  Scenario: Tooltip hides when mouse leaves
    Given the "Todo" column has description "Tasks that need to be started"
    When I hover over the info icon in the "Todo" column header
    Then I should see a tooltip with "Tasks that need to be started"
    When I move the mouse away from the info icon
    Then I should not see the tooltip

  Scenario: Click info icon opens edit modal
    When I click the info icon in the "Todo" column header
    Then I should see the "Edit Column" modal
    And I should see a description input field

  # Edge Cases
  Scenario: Long description displays correctly in tooltip
    Given the "Todo" column has description "This is a very long description that explains in detail what kinds of tasks should go in this column and when they should be moved to the next stage"
    When I hover over the info icon in the "Todo" column header
    Then I should see the full description in the tooltip

  Scenario: Description with special characters displays correctly
    Given the "Todo" column has description "Tasks with <special> & 'characters'"
    When I hover over the info icon in the "Todo" column header
    Then I should see "Tasks with <special> & 'characters'" in the tooltip
