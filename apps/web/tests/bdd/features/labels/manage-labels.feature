@skip
# SKIP: Label management page (/labels) not implemented. Labels are managed inline via LabelManager component in board view.
Feature: Manage Labels
  As a user
  I want to manage labels
  So that I can categorize my todos

  Background:
    Given I am on the boards list page
    And a board "Test Board" exists with columns "Todo, In Progress, Done"

  # Happy Path Scenarios - Label Creation
  Scenario: Create a new label with name and color
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "Bug" as the label name
    And I select "#FF0000" as the label color
    And I click "Save"
    Then I should see "Bug" label in the list
    And the "Bug" label should have color "#FF0000"

  Scenario: Create multiple labels
    When I navigate to the label management page
    And I create a label with name "Feature" and color "#00FF00"
    And I create a label with name "Documentation" and color "#0000FF"
    And I create a label with name "Urgent" and color "#FF6600"
    Then I should see "Feature" label in the list
    And I should see "Documentation" label in the list
    And I should see "Urgent" label in the list

  Scenario: Create label with predefined color picker
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "Enhancement" as the label name
    And I select the blue color from the color picker
    And I click "Save"
    Then I should see "Enhancement" label in the list

  # Happy Path Scenarios - Label Editing
  Scenario: Edit a label name
    Given a label "Old Name" with color "#FF0000" exists
    When I navigate to the label management page
    And I edit the "Old Name" label
    And I change the name to "New Name"
    And I click "Save"
    Then I should see "New Name" label in the list
    And I should not see "Old Name" label in the list

  Scenario: Edit a label color
    Given a label "Feature" with color "#00FF00" exists
    When I navigate to the label management page
    And I edit the "Feature" label
    And I change the color to "#0000FF"
    And I click "Save"
    Then the "Feature" label should have color "#0000FF"

  Scenario: Edit both label name and color
    Given a label "Test" with color "#FF0000" exists
    When I navigate to the label management page
    And I edit the "Test" label
    And I change the name to "Updated Test"
    And I change the color to "#00FF00"
    And I click "Save"
    Then I should see "Updated Test" label in the list
    And the "Updated Test" label should have color "#00FF00"

  # Happy Path Scenarios - Label Deletion
  Scenario: Delete a label
    Given a label "Deprecated" exists
    When I navigate to the label management page
    And I delete the "Deprecated" label
    Then "Deprecated" should not appear in the labels list

  Scenario: Delete label with confirmation dialog
    Given a label "To Delete" exists
    When I navigate to the label management page
    And I click the delete button for "To Delete" label
    Then I should see a confirmation dialog
    When I confirm the deletion
    Then "To Delete" should not appear in the labels list

  Scenario: Cancel label deletion
    Given a label "Keep This" exists
    When I navigate to the label management page
    And I click the delete button for "Keep This" label
    And I cancel the deletion
    Then I should see "Keep This" label in the list

  Scenario: Delete label removes it from assigned todos
    Given a label "Cleanup" exists
    And a todo "Test Task" exists with label "Cleanup"
    When I navigate to the label management page
    And I delete the "Cleanup" label
    Then "Cleanup" should not appear in the labels list
    And todos should no longer have "Cleanup" label

  # Happy Path Scenarios - Label Assignment
  Scenario: Assign label to todo
    Given a label "Urgent" exists
    And a todo "Fix critical bug" exists in "Todo" column
    When I open the "Fix critical bug" todo
    And I assign "Urgent" label to the todo
    And I click "Save"
    Then "Fix critical bug" should display "Urgent" label

  Scenario: Assign multiple labels to a single todo
    Given labels "Bug, High Priority, Backend" exist
    And a todo "API Issue" exists in "Todo" column
    When I open the "API Issue" todo
    And I assign labels "Bug" and "High Priority" and "Backend" to the todo
    And I click "Save"
    Then "API Issue" should display "Bug" label
    And "API Issue" should display "High Priority" label
    And "API Issue" should display "Backend" label

  Scenario: Remove label from todo
    Given a label "Feature" exists
    And a todo "New functionality" exists with label "Feature"
    When I open the "New functionality" todo
    And I remove "Feature" label from the todo
    And I click "Save"
    Then "New functionality" should not display "Feature" label

  Scenario: Assign same label to multiple todos
    Given a label "Urgent" exists
    And a todo "Task 1" exists in "Todo" column
    And a todo "Task 2" exists in "Todo" column
    When I assign "Urgent" label to "Task 1"
    And I assign "Urgent" label to "Task 2"
    Then "Task 1" should display "Urgent" label
    And "Task 2" should display "Urgent" label

  # Happy Path Scenarios - Label Filtering
  Scenario: Filter todos by label
    Given a label "Bug" exists
    And a todo "Fix login" exists with label "Bug"
    And a todo "Add feature" exists without labels
    When I filter by "Bug" label
    Then I should see "Fix login" in the filtered results
    And I should not see "Add feature" in the filtered results

  Scenario: Clear label filter shows all todos
    Given a label "Bug" exists
    And a todo "Fix login" exists with label "Bug"
    And a todo "Add feature" exists without labels
    When I filter by "Bug" label
    And I clear the label filter
    Then I should see "Fix login"
    And I should see "Add feature"

  # Unhappy Path Scenarios - Validation Errors
  Scenario: Cannot create label with empty name
    When I navigate to the label management page
    And I click "Create Label"
    And I leave the label name empty
    And I select "#FF0000" as the label color
    And I click "Save"
    Then I should see an error "Label name is required"
    And no new label should be created

  Scenario: Cannot create label with whitespace-only name
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "   " as the label name
    And I select "#FF0000" as the label color
    And I click "Save"
    Then I should see an error "Label name is required"
    And no new label should be created

  Scenario: Cannot create label with very long name
    When I navigate to the label management page
    And I click "Create Label"
    And I enter a 101 character label name
    And I select "#FF0000" as the label color
    And I click "Save"
    Then I should see an error "Label name must be less than 100 characters"

  Scenario: Cannot create duplicate label name
    Given a label "Bug" exists
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "Bug" as the label name
    And I select "#00FF00" as the label color
    And I click "Save"
    Then I should see an error "Label already exists"
    And no new label should be created

  Scenario: Cannot create label with invalid color format
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "Test" as the label name
    And I enter "invalid-color" as the label color
    And I click "Save"
    Then I should see an error "Invalid color format"

  Scenario: Cannot create label without selecting color
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "Test Label" as the label name
    And I do not select a color
    And I click "Save"
    Then I should see an error "Color is required"

  Scenario: Cannot rename label to existing name
    Given labels "Bug, Feature" exist
    When I navigate to the label management page
    And I edit the "Feature" label
    And I change the name to "Bug"
    And I click "Save"
    Then I should see an error "Label name already exists"
    And the "Feature" label should remain unchanged

  # Unhappy Path Scenarios - Network/Server Errors
  Scenario: Handle network error during label creation
    Given the network is unavailable
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "New Label" as the label name
    And I select "#FF0000" as the label color
    And I click "Save"
    Then I should see an error message "Failed to create label"
    And my input should be preserved

  Scenario: Handle server error during label creation
    Given the server will return an error
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "New Label" as the label name
    And I select "#FF0000" as the label color
    And I click "Save"
    Then I should see an error message "Failed to create label"

  Scenario: Handle network error during label update
    Given a label "Test" with color "#FF0000" exists
    When I navigate to the label management page
    And I edit the "Test" label
    Given the network is unavailable
    When I change the name to "Updated Test"
    And I click "Save"
    Then I should see an error message "Failed to update label"
    And the "Test" label should remain unchanged

  Scenario: Handle server error during label deletion
    Given a label "Test" exists
    When I navigate to the label management page
    Given the server will return an error
    When I delete the "Test" label
    Then I should see an error message "Failed to delete label"
    And I should see "Test" label in the list

  Scenario: Handle loading error for labels list
    Given the API is unavailable
    When I navigate to the label management page
    Then I should see an error message "Failed to load labels"
    And I should see a "Retry" button

  Scenario: Handle slow network loading labels
    Given the network is slow
    When I navigate to the label management page
    Then I should see a loading indicator
    And labels should eventually appear

  # Unhappy Path Scenarios - Edge Cases
  Scenario: Handle label deletion while assigned to many todos
    Given a label "Common" exists
    And 50 todos exist with label "Common"
    When I navigate to the label management page
    And I delete the "Common" label
    Then I should see a warning about affected todos
    When I confirm the deletion
    Then "Common" should not appear in the labels list

  Scenario: Handle concurrent label editing
    Given a label "Shared" with color "#FF0000" exists
    And another user has deleted the "Shared" label
    When I try to edit the "Shared" label
    Then I should see an error message "Label no longer exists"
    And the labels list should be refreshed

  Scenario: Handle special characters in label name
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "Bug <script>alert('xss')</script>" as the label name
    And I select "#FF0000" as the label color
    And I click "Save"
    Then the label name should be properly escaped
    And no script should execute

  Scenario: Cancel label creation preserves form state
    When I navigate to the label management page
    And I click "Create Label"
    And I enter "Draft Label" as the label name
    And I click "Cancel"
    Then no new label should be created
    And the create label form should be hidden

  Scenario: Cancel label edit preserves original values
    Given a label "Original" with color "#FF0000" exists
    When I navigate to the label management page
    And I edit the "Original" label
    And I change the name to "Modified"
    And I click "Cancel"
    Then I should see "Original" label in the list
    And I should not see "Modified" label in the list
    And the "Original" label should have color "#FF0000"
