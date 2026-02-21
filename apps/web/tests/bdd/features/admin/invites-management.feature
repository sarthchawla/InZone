Feature: Invites Management
  As an admin user
  I want to manage invite links
  So that I can control who can sign up for InZone

  Background:
    Given the session API returns an admin session

  @wip
  Scenario: Invites page displays expected elements
    Given the invites API returns an empty list
    When I navigate to the admin invites page
    Then I should see the heading "Invite Management"
    And I should see an "Email" input
    And I should see a role selector
    And I should see a "Create Invite" button
    And I should see the text "No pending invites."

  @wip
  Scenario: Create invite button is disabled when email is empty
    Given the invites API returns an empty list
    When I navigate to the admin invites page
    Then the "Create Invite" button should be disabled

  @wip
  Scenario: Successfully create an invite
    Given the invites API returns an empty list
    And the create invite API will succeed for "newuser@example.com"
    When I navigate to the admin invites page
    And I fill in "Email" with "newuser@example.com"
    And I click the "Create Invite" button
    Then I should see the text "Invite created for newuser@example.com"
    And I should see a "Copy Link" button

  @wip
  Scenario: Display pending invites
    Given the invites API returns pending invites
    When I navigate to the admin invites page
    Then I should see "alice@example.com" in the pending invites list
    And I should see "bob@example.com" in the pending invites list
    And I should see "Copy Link" for each pending invite
    And I should see "Revoke" for each pending invite

  @wip
  Scenario: Revoke a pending invite
    Given the invites API returns pending invites
    And the revoke invite API will succeed
    When I navigate to the admin invites page
    And I click "Revoke" for "alice@example.com"
    Then the invites list should be refreshed

  @wip
  Scenario: Display invite history
    Given the invites API returns invites with history
    When I navigate to the admin invites page
    Then I should see the "History" section
    And I should see used invites in the history

  @wip
  Scenario: Failed invite creation shows error
    Given the invites API returns an empty list
    And the create invite API will fail with "Email already invited"
    When I navigate to the admin invites page
    And I fill in "Email" with "existing@example.com"
    And I click the "Create Invite" button
    Then I should see an alert with "Email already invited"

  @wip
  Scenario: Select admin role for invite
    Given the invites API returns an empty list
    And the create invite API will succeed for "admin@example.com" with role "admin"
    When I navigate to the admin invites page
    And I fill in "Email" with "admin@example.com"
    And I select "Admin" as the invite role
    And I click the "Create Invite" button
    Then I should see the text "Invite created for admin@example.com"
