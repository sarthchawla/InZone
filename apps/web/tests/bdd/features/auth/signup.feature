Feature: Sign Up
  As a new user with an invite
  I want to create an InZone account
  So that I can start using the application

  Background:
    Given the session API returns no active session

  @wip
  Scenario: Sign up page displays all expected elements with valid invite
    Given the invite validation API returns valid for "invited@example.com"
    When I navigate to the signup page with token "valid-token-123"
    Then I should see the heading "Create your InZone account"
    And I should see the text "You've been invited as invited@example.com"
    And I should see a "Continue with Google" button
    And I should see an "Email *" input
    And I should see a "Name *" input
    And I should see a "Username" input
    And I should see a "Password *" input
    And I should see a "Confirm Password *" input
    And I should see "Security Questions" section
    And I should see a "Create Account" button

  @wip
  Scenario: Email field is pre-filled and read-only with valid invite
    Given the invite validation API returns valid for "invited@example.com"
    When I navigate to the signup page with token "valid-token-123"
    Then the "Email *" input should have value "invited@example.com"
    And the "Email *" input should be read-only

  @wip
  Scenario: Invalid invite token shows error state
    Given the invite validation API returns invalid
    When I navigate to the signup page with token "expired-token"
    Then I should see the heading "Invalid Invite"
    And I should see the text "This invite link is invalid, expired, or has already been used."
    And I should see a "Back to Sign In" link

  @wip
  Scenario: Loading state shown while validating invite token
    Given the invite validation API is slow
    When I navigate to the signup page with token "slow-token"
    Then I should see a loading spinner

  @wip
  Scenario: Password strength indicators update as user types
    Given the invite validation API returns valid for "user@example.com"
    When I navigate to the signup page with token "valid-token-123"
    And I fill in "Password *" with "Abcdef1!"
    Then the password check "8+ characters" should be met
    And the password check "Uppercase letter" should be met
    And the password check "Lowercase letter" should be met
    And the password check "Number" should be met
    And the password check "Special character" should be met

  @wip
  Scenario: Password mismatch shows error
    Given the invite validation API returns valid for "user@example.com"
    When I navigate to the signup page with token "valid-token-123"
    And I fill in "Password *" with "Abcdef1!"
    And I fill in "Confirm Password *" with "different"
    Then I should see the text "Passwords do not match"

  @wip
  Scenario: Create Account button is disabled until form is valid
    Given the invite validation API returns valid for "user@example.com"
    When I navigate to the signup page with token "valid-token-123"
    Then the "Create Account" button should be disabled

  @wip
  Scenario: Successful sign up redirects to home
    Given the invite validation API returns valid for "user@example.com"
    And the sign-up API will succeed
    And the security questions API will succeed
    When I navigate to the signup page with token "valid-token-123"
    And I fill in the signup form with valid data
    And I click the "Create Account" button
    Then I should be redirected to "/"

  @wip
  Scenario: Failed sign up shows error message
    Given the invite validation API returns valid for "user@example.com"
    And the sign-up API will fail with "Email already registered"
    When I navigate to the signup page with token "valid-token-123"
    And I fill in the signup form with valid data
    And I click the "Create Account" button
    Then I should see an alert with "Email already registered"

  @wip
  Scenario: Sign in link navigates to login page
    Given the invite validation API returns valid for "user@example.com"
    When I navigate to the signup page with token "valid-token-123"
    And I click the "Sign in" link
    Then I should be on the "/login" page
