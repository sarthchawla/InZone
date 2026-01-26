@templates @api
Feature: Templates API
  As an API consumer
  I want to view board templates via REST API
  So that I can use templates to create boards

  # ===== HAPPY PATH SCENARIOS =====

  @happy-path
  Scenario: List all built-in templates
    When I GET /api/templates
    Then the response status should be 200
    And the response should be an array
    And the response should contain at least 3 templates
    And the response should include a template named "Basic Kanban"
    And the response should include a template named "Development"
    And the response should include a template named "Simple"

  @happy-path
  Scenario: Templates are returned in alphabetical order
    When I GET /api/templates
    Then the response status should be 200
    And the templates should be in alphabetical order by name

  @happy-path
  Scenario: Get Basic Kanban template by ID
    When I GET /api/templates/kanban-basic
    Then the response status should be 200
    And the response should contain the template name "Basic Kanban"
    And the response should contain the template description "Simple three-column Kanban board"
    And the template should have 3 columns
    And the template columns should be named "Todo, In Progress, Done"
    And the template should be marked as built-in

  @happy-path
  Scenario: Get Development template by ID
    When I GET /api/templates/dev-workflow
    Then the response status should be 200
    And the response should contain the template name "Development"
    And the response should contain the template description "Software development workflow"
    And the template should have 5 columns
    And the template columns should be named "Backlog, Todo, In Progress, Review, Done"
    And the template should be marked as built-in

  @happy-path
  Scenario: Get Simple template by ID
    When I GET /api/templates/simple
    Then the response status should be 200
    And the response should contain the template name "Simple"
    And the response should contain the template description "Minimal two-column setup"
    And the template should have 2 columns
    And the template columns should be named "Todo, Done"
    And the template should be marked as built-in

  @happy-path
  Scenario: Template includes all required fields
    When I GET /api/templates/kanban-basic
    Then the response status should be 200
    And the template should have an id
    And the template should have a name
    And the template should have a description
    And the template should have columns
    And the template should have an isBuiltIn field
    And the template should have a createdAt timestamp
    And the template should have an updatedAt timestamp

  @happy-path
  Scenario: Templates contain column definitions with names
    When I GET /api/templates/kanban-basic
    Then the response status should be 200
    And each template column should have a name

  # ===== UNHAPPY PATH SCENARIOS =====

  @unhappy-path
  Scenario: Get non-existent template
    When I GET /api/templates/non-existent-template-id
    Then the response status should be 404
    And the response should contain error "Template not found"

  @unhappy-path
  Scenario: Get template with empty ID
    When I GET /api/templates/
    Then the response status should be 200
    And the response should be an array

  @unhappy-path
  Scenario: Get template with special characters in ID
    When I GET /api/templates with URL-encoded spaces in ID
    Then the response status should be 404
    And the response should contain error "Template not found"

  @unhappy-path
  Scenario: Get template with very long ID
    When I GET /api/templates with ID exceeding 100 characters
    Then the response status should be 404
    And the response should contain error "Template not found"

  @unhappy-path
  Scenario: Get template with SQL injection attempt
    When I GET /api/templates with SQL injection in ID
    Then the response status should be 404
    And the response should contain error "Template not found"

  @unhappy-path
  Scenario: Get template with script-like ID
    When I GET /api/templates/javascript:alert
    Then the response status should be 404
    And the response should contain error "Template not found"
