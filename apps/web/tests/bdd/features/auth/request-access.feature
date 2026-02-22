@wip
Feature: Request Access
  As a potential user without an account
  I want to request access to InZone
  So that an admin can invite me

  Background:
    Given the session API returns no active session

  @wip
  Scenario: Request access page displays all expected elements
    When I navigate to the request access page
    Then I should see the heading "Request Access to InZone"
    And I should see a "Name *" input
    And I should see an "Email *" input
    And I should see a reason textarea
    And I should see a "Submit Request" button
    And I should see a "Sign in" link

  @wip
  Scenario: Submit button is disabled when required fields are empty
    When I navigate to the request access page
    Then the "Submit Request" button should be disabled

  @wip
  Scenario: Submit button is enabled when name and email are filled
    When I navigate to the request access page
    And I fill in "Name *" with "John Doe"
    And I fill in "Email *" with "john@example.com"
    Then the "Submit Request" button should be enabled

  @wip
  Scenario: Successful access request shows confirmation
    Given the access request API will succeed
    When I navigate to the request access page
    And I fill in "Name *" with "John Doe"
    And I fill in "Email *" with "john@example.com"
    And I click the "Submit Request" button
    Then I should see the text "Request Submitted"
    And I should see the text "Your request has been sent to the admin team"
    And I should see a "Back to Sign In" link

  @wip
  Scenario: Successful access request with optional reason
    Given the access request API will succeed
    When I navigate to the request access page
    And I fill in "Name *" with "John Doe"
    And I fill in "Email *" with "john@example.com"
    And I fill in the reason with "I want to manage my project tasks"
    And I click the "Submit Request" button
    Then I should see the text "Request Submitted"

  @wip
  Scenario: Failed access request shows error message
    Given the access request API will fail with "Email already has a pending request"
    When I navigate to the request access page
    And I fill in "Name *" with "John Doe"
    And I fill in "Email *" with "existing@example.com"
    And I click the "Submit Request" button
    Then I should see an alert with "Email already has a pending request"

  @wip
  Scenario: Sign in link navigates to login page
    When I navigate to the request access page
    And I click the "Sign in" link
    Then I should be on the "/login" page
