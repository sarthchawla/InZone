@auth @invites @api @wip
Feature: Invites API
  As an admin
  I want to manage invite links via REST API
  So that I can control who can sign up for the application

  # ===== HAPPY PATH SCENARIOS =====

  @wip @happy-path
  Scenario: Create an invite with user role
    Given I am authenticated as an admin
    When I POST to /api/invites with:
      | email | newuser@example.com |
      | role  | user                |
    Then the response status should be 201
    And the response should contain the invite email "newuser@example.com"
    And the response should contain the invite role "user"
    And the response should contain the invite status "pending"
    And the response should contain an invite link

  @wip @happy-path
  Scenario: Create an invite with admin role
    Given I am authenticated as an admin
    When I POST to /api/invites with:
      | email | admin@example.com |
      | role  | admin             |
    Then the response status should be 201
    And the response should contain the invite role "admin"

  @wip @happy-path
  Scenario: List all invites
    Given I am authenticated as an admin
    And an invite for "user1@example.com" exists
    And an invite for "user2@example.com" exists
    When I GET /api/invites
    Then the response status should be 200
    And the response should be an array with 2 items
    And the invites should be ordered by creation date descending

  @wip @happy-path
  Scenario: Revoke a pending invite
    Given I am authenticated as an admin
    And an invite for "revoke-me@example.com" exists
    When I DELETE the invite
    Then the response status should be 200
    And the response should contain the invite status "revoked"

  @wip @happy-path
  Scenario: Validate a valid invite token
    Given an invite for "valid@example.com" exists with a known token
    When I GET /api/invites/validate with the token
    Then the response status should be 200
    And the response should contain valid true
    And the response should contain the email "valid@example.com"

  @wip @happy-path
  Scenario: Set invite token cookie for OAuth flow
    Given an invite for "oauth@example.com" exists with a known token
    When I POST to /api/invites/set-token with the token
    Then the response status should be 200
    And the response should contain success true
    And the response should set an invite cookie

  # ===== UNHAPPY PATH SCENARIOS =====

  @wip @unhappy-path
  Scenario: Create invite without authentication
    When I POST to /api/invites with:
      | email | noauth@example.com |
      | role  | user               |
    Then the response status should be 401

  @wip @unhappy-path
  Scenario: Create invite with invalid email
    Given I am authenticated as an admin
    When I POST to /api/invites with:
      | email | not-an-email |
      | role  | user         |
    Then the response status should be 400
    And the response should contain error "Invalid email"

  @wip @unhappy-path
  Scenario: Create invite with invalid role
    Given I am authenticated as an admin
    When I POST to /api/invites with:
      | email | valid@example.com |
      | role  | superadmin        |
    Then the response status should be 400

  @wip @unhappy-path
  Scenario: Create invite for already registered email
    Given I am authenticated as an admin
    And a user with email "existing@example.com" exists
    When I POST to /api/invites with:
      | email | existing@example.com |
      | role  | user                 |
    Then the response status should be 400
    And the response should contain error "This email is already registered."

  @wip @unhappy-path
  Scenario: Create duplicate pending invite
    Given I am authenticated as an admin
    And an invite for "dup@example.com" exists
    When I POST to /api/invites with:
      | email | dup@example.com |
      | role  | user            |
    Then the response status should be 400
    And the response should contain error "A pending invite already exists for this email."

  @wip @unhappy-path
  Scenario: Revoke a non-existent invite
    Given I am authenticated as an admin
    When I DELETE /api/invites/non-existent-id
    Then the response status should be 404
    And the response should contain error "Invite not found."

  @wip @unhappy-path
  Scenario: Revoke an already revoked invite
    Given I am authenticated as an admin
    And an invite for "revoked@example.com" exists and is revoked
    When I DELETE the invite
    Then the response status should be 400
    And the response should contain error "Only pending invites can be revoked."

  @wip @unhappy-path
  Scenario: Validate an invalid token
    When I GET /api/invites/validate?token=invalid-token
    Then the response status should be 200
    And the response should contain valid false

  @wip @unhappy-path
  Scenario: Validate without a token
    When I GET /api/invites/validate
    Then the response status should be 200
    And the response should contain valid false

  @wip @unhappy-path
  Scenario: Set token with invalid invite token
    When I POST to /api/invites/set-token with:
      | token | invalid-token |
    Then the response status should be 400
    And the response should contain error "Invalid invite token."

  @wip @unhappy-path
  Scenario: Set token with expired invite
    Given an invite for "expired@example.com" exists and is expired
    When I POST to /api/invites/set-token with the expired token
    Then the response status should be 400
    And the response should contain error "Invite has expired."
