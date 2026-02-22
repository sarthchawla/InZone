@auth @security-questions @api @wip
Feature: Security Questions API
  As a user
  I want to set up and use security questions
  So that I can recover my account if I forget my password

  # ===== HAPPY PATH SCENARIOS =====

  @wip @happy-path
  Scenario: Set up security questions
    Given I am authenticated as a user
    When I POST to /api/security-questions/setup with 3 valid questions and answers
    Then the response status should be 200
    And the response should contain success true

  @wip @happy-path
  Scenario: Check security questions status when configured
    Given I am authenticated as a user
    And the user has configured security questions
    When I GET /api/security-questions/status
    Then the response status should be 200
    And the response should contain configured true

  @wip @happy-path
  Scenario: Check security questions status when not configured
    Given I am authenticated as a user
    When I GET /api/security-questions/status
    Then the response status should be 200
    And the response should contain configured false

  @wip @happy-path
  Scenario: Get security questions for a valid user by email
    Given a user with email "recovery@example.com" has security questions configured
    When I POST to /api/security-questions/questions with:
      | identifier | recovery@example.com |
    Then the response status should be 200
    And the response should contain 3 questions

  @wip @happy-path
  Scenario: Get security questions for a valid user by username
    Given a user with username "recoveryuser" has security questions configured
    When I POST to /api/security-questions/questions with:
      | identifier | recoveryuser |
    Then the response status should be 200
    And the response should contain 3 questions

  @wip @happy-path
  Scenario: Verify correct security question answers
    Given a user with email "verify@example.com" has security questions configured
    When I POST to /api/security-questions/verify with correct answers for "verify@example.com"
    Then the response status should be 200
    And the response should contain a reset token

  @wip @happy-path
  Scenario: Update existing security questions
    Given I am authenticated as a user
    And the user has configured security questions
    When I POST to /api/security-questions/setup with 3 different valid questions and answers
    Then the response status should be 200
    And the response should contain success true

  # ===== UNHAPPY PATH SCENARIOS =====

  @wip @unhappy-path
  Scenario: Set up security questions without authentication
    When I POST to /api/security-questions/setup with 3 valid questions and answers
    Then the response status should be 401

  @wip @unhappy-path
  Scenario: Set up with fewer than 3 questions
    Given I am authenticated as a user
    When I POST to /api/security-questions/setup with 2 questions
    Then the response status should be 400
    And the response should contain error "Exactly 3 security questions required"

  @wip @unhappy-path
  Scenario: Set up with more than 3 questions
    Given I am authenticated as a user
    When I POST to /api/security-questions/setup with 4 questions
    Then the response status should be 400
    And the response should contain error "Exactly 3 security questions required"

  @wip @unhappy-path
  Scenario: Set up with duplicate questions
    Given I am authenticated as a user
    When I POST to /api/security-questions/setup with 3 questions where 2 are the same
    Then the response status should be 400
    And the response should contain error "All 3 questions must be different."

  @wip @unhappy-path
  Scenario: Set up with invalid question not in predefined pool
    Given I am authenticated as a user
    When I POST to /api/security-questions/setup with an invalid question
    Then the response status should be 400
    And the response should contain error matching "Invalid question"

  @wip @unhappy-path
  Scenario: Set up with answer too short
    Given I am authenticated as a user
    When I POST to /api/security-questions/setup with a short answer
    Then the response status should be 400
    And the response should contain error "Answer must be at least 2 characters"

  @wip @unhappy-path
  Scenario: Get questions for non-existent user returns fake questions
    When I POST to /api/security-questions/questions with:
      | identifier | nonexistent@example.com |
    Then the response status should be 200
    And the response should contain 3 questions

  @wip @unhappy-path
  Scenario: Verify with incorrect answers
    Given a user with email "wrong@example.com" has security questions configured
    When I POST to /api/security-questions/verify with incorrect answers for "wrong@example.com"
    Then the response status should be 400
    And the response should contain error "Incorrect answers."

  @wip @unhappy-path
  Scenario: Verify for non-existent user
    When I POST to /api/security-questions/verify with:
      | identifier | ghost@example.com               |
      | answers    | ["ans1", "ans2", "ans3"]        |
    Then the response status should be 400
    And the response should contain error "Incorrect answers."

  @wip @unhappy-path
  Scenario: Check status without authentication
    When I GET /api/security-questions/status
    Then the response status should be 401
