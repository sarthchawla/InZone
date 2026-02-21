Feature: Login
  As a user with an account
  I want to sign in to InZone
  So that I can access my boards

  Background:
    Given the session API returns no active session

  @wip
  Scenario: Login page displays all expected elements
    When I navigate to the login page
    Then I should see the heading "InZone"
    And I should see the text "Sign in to manage your boards"
    And I should see an "Email or Username" input
    And I should see a "Password" input
    And I should see a "Sign In" button
    And I should see a "Continue with Google" button
    And I should see a "Forgot password?" link
    And I should see a "Request Access" link

  @wip
  Scenario: Sign in button is disabled when fields are empty
    When I navigate to the login page
    Then the "Sign In" button should be disabled

  @wip
  Scenario: Sign in button is disabled when only email is filled
    When I navigate to the login page
    And I fill in "Email or Username" with "user@example.com"
    Then the "Sign In" button should be disabled

  @wip
  Scenario: Sign in button is enabled when both fields are filled
    When I navigate to the login page
    And I fill in "Email or Username" with "user@example.com"
    And I fill in "Password" with "password123"
    Then the "Sign In" button should be enabled

  @wip
  Scenario: Successful login with email redirects to home
    Given the sign-in API will succeed
    When I navigate to the login page
    And I fill in "Email or Username" with "user@example.com"
    And I fill in "Password" with "password123"
    And I click the "Sign In" button
    Then I should be redirected to "/"

  @wip
  Scenario: Successful login with username redirects to home
    Given the sign-in API will succeed for username
    When I navigate to the login page
    And I fill in "Email or Username" with "myusername"
    And I fill in "Password" with "password123"
    And I click the "Sign In" button
    Then I should be redirected to "/"

  @wip
  Scenario: Failed login shows error message
    Given the sign-in API will fail with "Invalid credentials."
    When I navigate to the login page
    And I fill in "Email or Username" with "user@example.com"
    And I fill in "Password" with "wrongpassword"
    And I click the "Sign In" button
    Then I should see an alert with "Invalid credentials."

  @wip
  Scenario: Forgot password link navigates to reset password page
    When I navigate to the login page
    And I click the "Forgot password?" link
    Then I should be on the "/reset-password" page

  @wip
  Scenario: Request Access link navigates to request access page
    When I navigate to the login page
    And I click the "Request Access" link
    Then I should be on the "/request-access" page
