@auth @access-requests @api @wip
Feature: Access Requests API
  As a visitor or admin
  I want to manage access requests via REST API
  So that users can request access and admins can approve or reject them

  # ===== HAPPY PATH SCENARIOS =====

  @wip @happy-path
  Scenario: Submit an access request
    When I POST to /api/access-requests with:
      | email  | requester@example.com      |
      | name   | John Doe                   |
      | reason | I want to join the project |
    Then the response status should be 201
    And the response should contain the access request status "pending"
    And the response should contain the message "Your request has been submitted."

  @wip @happy-path
  Scenario: Submit an access request without a reason
    When I POST to /api/access-requests with:
      | email | noreason@example.com |
      | name  | Jane Doe             |
    Then the response status should be 201
    And the response should contain the access request status "pending"

  @wip @happy-path
  Scenario: List all access requests
    Given I am authenticated as an admin
    And an access request from "user1@example.com" exists
    And an access request from "user2@example.com" exists
    When I GET /api/access-requests
    Then the response status should be 200
    And the response should be an array with 2 items

  @wip @happy-path
  Scenario: List access requests filtered by status
    Given I am authenticated as an admin
    And an access request from "pending@example.com" with status "pending" exists
    And an access request from "approved@example.com" with status "approved" exists
    When I GET /api/access-requests?status=pending
    Then the response status should be 200
    And the response should be an array with 1 items
    And the first access request email should be "pending@example.com"

  @wip @happy-path
  Scenario: Approve an access request
    Given I am authenticated as an admin
    And an access request from "approve-me@example.com" exists
    When I POST to approve the access request
    Then the response status should be 200
    And the response should contain the access request status "approved"

  @wip @happy-path
  Scenario: Approve an access request with admin role
    Given I am authenticated as an admin
    And an access request from "make-admin@example.com" exists
    When I POST to approve the access request with:
      | role | admin |
    Then the response status should be 200
    And the response should contain the access request status "approved"
    And the response should contain the access request role "admin"

  @wip @happy-path
  Scenario: Reject an access request
    Given I am authenticated as an admin
    And an access request from "reject-me@example.com" exists
    When I POST to reject the access request
    Then the response status should be 200
    And the response should contain the access request status "rejected"

  # ===== UNHAPPY PATH SCENARIOS =====

  @wip @unhappy-path
  Scenario: Submit access request with invalid email
    When I POST to /api/access-requests with:
      | email | not-an-email |
      | name  | Test User    |
    Then the response status should be 400
    And the response should contain error "Invalid email"

  @wip @unhappy-path
  Scenario: Submit access request without name
    When I POST to /api/access-requests with:
      | email | noname@example.com |
    Then the response status should be 400

  @wip @unhappy-path
  Scenario: Submit access request with empty name
    When I POST to /api/access-requests with:
      | email | empty@example.com |
      | name  |                   |
    Then the response status should be 400

  @wip @unhappy-path
  Scenario: Submit access request for already registered email
    Given a user with email "existing@example.com" exists
    When I POST to /api/access-requests with:
      | email | existing@example.com |
      | name  | Existing User        |
    Then the response status should be 400
    And the response should contain error "You already have an account. Try signing in."

  @wip @unhappy-path
  Scenario: Submit duplicate pending access request
    Given an access request from "dup@example.com" exists
    When I POST to /api/access-requests with:
      | email | dup@example.com |
      | name  | Dup User        |
    Then the response status should be 400
    And the response should contain error "You've already submitted a request."

  @wip @unhappy-path
  Scenario: List access requests without authentication
    When I GET /api/access-requests
    Then the response status should be 401

  @wip @unhappy-path
  Scenario: Approve non-existent access request
    Given I am authenticated as an admin
    When I POST /api/access-requests/non-existent-id/approve
    Then the response status should be 404
    And the response should contain error "Request not found."

  @wip @unhappy-path
  Scenario: Approve already reviewed access request
    Given I am authenticated as an admin
    And an access request from "reviewed@example.com" with status "approved" exists
    When I POST to approve the access request
    Then the response status should be 400
    And the response should contain error "This request has already been reviewed."

  @wip @unhappy-path
  Scenario: Reject non-existent access request
    Given I am authenticated as an admin
    When I POST /api/access-requests/non-existent-id/reject
    Then the response status should be 404
    And the response should contain error "Request not found."

  @wip @unhappy-path
  Scenario: Reject already reviewed access request
    Given I am authenticated as an admin
    And an access request from "reviewed2@example.com" with status "rejected" exists
    When I POST to reject the access request
    Then the response status should be 400
    And the response should contain error "This request has already been reviewed."
