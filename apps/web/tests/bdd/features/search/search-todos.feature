Feature: Search Todos
  As a user
  I want to search todos
  So that I can find specific tasks quickly

  Background:
    Given I am on the boards list page
    And the following boards with todos exist:
      | boardName | todoTitle          | todoDescription        |
      | Work      | Fix login bug      | Auth module issue      |
      | Work      | Review PR #123     | Code review needed     |
      | Work      | Update API docs    | REST API documentation |
      | Personal  | Buy groceries      | Weekly shopping        |
      | Personal  | Call dentist       | Schedule appointment   |

  # Happy Path Scenarios - Basic Search
  Scenario: Search by todo title
    When I enter "login" in the search box
    And I submit the search
    Then I should see "Fix login bug" in the search results
    And I should not see "Buy groceries" in the search results
    And I should not see "Review PR #123" in the search results

  Scenario: Search by partial title match
    When I enter "PR" in the search box
    And I submit the search
    Then I should see "Review PR #123" in the search results
    And I should not see "Fix login bug" in the search results

  Scenario: Search returns multiple matches
    When I enter "e" in the search box
    And I submit the search
    Then I should see "Fix login bug" in the search results
    And I should see "Review PR #123" in the search results
    And I should see "Update API docs" in the search results

  Scenario: Search is case-insensitive
    When I enter "LOGIN" in the search box
    And I submit the search
    Then I should see "Fix login bug" in the search results

  Scenario: Search by description content
    When I enter "shopping" in the search box
    And I submit the search
    Then I should see "Buy groceries" in the search results
    And I should not see "Fix login bug" in the search results

  Scenario: Search across all boards
    When I enter "API" in the search box
    And I submit the search
    Then I should see "Update API docs" in the search results
    And the search results should show the board name "Work"

  Scenario: Click search result navigates to todo
    When I enter "login" in the search box
    And I submit the search
    And I click on the "Fix login bug" search result
    Then I should be navigated to the board containing that todo
    And the "Fix login bug" todo should be highlighted or visible

  Scenario: Search with exact phrase
    When I enter "Review PR" in the search box
    And I submit the search
    Then I should see "Review PR #123" in the search results

  # Happy Path Scenarios - Empty/No Results
  Scenario: No search results found
    When I enter "nonexistent" in the search box
    And I submit the search
    Then I should see "No results found" message
    And I should not see any todo cards in results

  Scenario: Empty search shows no results section
    When I clear the search box
    And I submit the search
    Then I should see the default board list view
    And search results should not be displayed

  Scenario: Search with only spaces shows no results
    When I enter "   " in the search box
    And I submit the search
    Then I should see the default board list view

  # Happy Path Scenarios - Search UI Interactions
  Scenario: Clear search button resets view
    When I enter "login" in the search box
    And I submit the search
    Then I should see search results
    When I click the clear search button
    Then the search box should be empty
    And I should see the default board list view

  Scenario: Search on Enter key press
    When I enter "bug" in the search box
    And I press Enter
    Then I should see "Fix login bug" in the search results

  Scenario: Search results show todo metadata
    When I enter "login" in the search box
    And I submit the search
    Then I should see "Fix login bug" in the search results
    And the search result should display the board name
    And the search result should display the column name

  Scenario: Search while on board view
    Given I am viewing the "Work" board
    When I enter "login" in the search box
    And I submit the search
    Then I should see search results
    And I should see "Fix login bug" in the search results

  # Happy Path Scenarios - Search with Filters
  Scenario: Search combined with board filter
    When I select "Work" board filter
    And I enter "bug" in the search box
    And I submit the search
    Then I should see "Fix login bug" in the search results
    And I should not see results from "Personal" board

  Scenario: Search combined with label filter
    Given a label "Critical" exists on "Fix login bug"
    When I enter "bug" in the search box
    And I filter by "Critical" label
    And I submit the search
    Then I should see "Fix login bug" in the search results

  # Unhappy Path Scenarios - Input Validation
  Scenario: Handle search with special characters
    When I enter "<script>alert('xss')</script>" in the search box
    And I submit the search
    Then the search should complete safely
    And no script should execute
    And I should see "No results found" message

  Scenario: Search with HTML tags is escaped
    When I enter "<div>test</div>" in the search box
    And I submit the search
    Then the search query should be properly escaped
    And the application should not crash

  Scenario: Search with very long query
    When I enter a 1000 character search query
    And I submit the search
    Then I should see appropriate results or empty state
    And the application should not crash

  Scenario: Search with SQL injection attempt
    When I enter "'; DROP TABLE todos; --" in the search box
    And I submit the search
    Then the search should complete safely
    And the application should not crash

  Scenario: Search with unicode characters
    When I enter "test" in the search box
    And I submit the search
    Then the search should complete safely

  # Unhappy Path Scenarios - Network/Server Errors
  Scenario: Handle network error during search
    Given the network is unavailable
    When I enter "bug" in the search box
    And I submit the search
    Then I should see an error message "Search failed"
    And I should see a "Retry" button

  Scenario: Handle server error during search
    Given the server will return an error
    When I enter "bug" in the search box
    And I submit the search
    Then I should see an error message "Search failed"

  Scenario: Handle slow network during search
    Given the network is slow
    When I enter "bug" in the search box
    And I submit the search
    Then I should see a loading indicator
    And search results should eventually appear

  Scenario: Handle timeout during search
    Given the API will timeout
    When I enter "bug" in the search box
    And I submit the search
    Then I should see an error message "Search timed out"
    And I should see a "Retry" button

  # Unhappy Path Scenarios - Edge Cases
  Scenario: Search immediately after page load
    When I reload the page
    And I immediately enter "bug" in the search box
    And I submit the search
    Then the search should complete safely
    And I should see appropriate results

  Scenario: Rapid successive searches
    When I enter "a" in the search box
    And I quickly change to "ab"
    And I quickly change to "abc"
    And I submit the search
    Then I should see results matching "abc"
    And there should be no duplicate requests

  Scenario: Search with leading/trailing whitespace
    When I enter "  login  " in the search box
    And I submit the search
    Then I should see "Fix login bug" in the search results

  Scenario: Search during data mutation
    Given another user is modifying todos
    When I enter "bug" in the search box
    And I submit the search
    Then the search should complete safely
    And I should see current search results

  Scenario: Search for archived todos
    Given a todo "Old Task" is archived
    When I enter "Old Task" in the search box
    And I submit the search
    Then I should not see "Old Task" in the search results
    When I toggle "Include archived" option
    And I submit the search
    Then I should see "Old Task" in the search results

  Scenario: Search box maintains focus on error
    Given the network is unavailable
    When I enter "bug" in the search box
    And I submit the search
    Then I should see an error message
    And the search box should retain focus
    And my search query should be preserved

  # Unhappy Path Scenarios - UI Edge Cases
  Scenario: Search with browser back button
    When I enter "login" in the search box
    And I submit the search
    And I click on the "Fix login bug" search result
    And I press the browser back button
    Then I should see the search results again
    And the search query "login" should be preserved

  Scenario: Keyboard navigation in search results
    When I enter "e" in the search box
    And I submit the search
    And I press the down arrow key
    Then the first search result should be focused
    When I press Enter
    Then I should be navigated to that todo

  Scenario: Search accessibility - screen reader announcement
    When I enter "bug" in the search box
    And I submit the search
    Then search results should have aria-live announcement
    And the number of results should be announced
