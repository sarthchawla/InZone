@mcp @api
Feature: MCP API
  As an authenticated InZone user
  I want to generate MCP tokens and use them against the MCP endpoint
  So that MCP clients can manage my boards and tasks safely

  Scenario: Generate and revoke an MCP token
    When I create an MCP token named "Claude Desktop" expiring in "90d"
    Then the response status should be 201
    And the response should include a raw MCP token
    When I revoke the created MCP token
    Then the response status should be 204

  Scenario: Missing MCP token cannot initialize the MCP server
    When I initialize MCP without a bearer token
    Then the response status should be 401

  Scenario: Revoked MCP token cannot initialize the MCP server
    When I create an MCP token named "Claude Desktop" expiring in "90d"
    And I revoke the created MCP token
    When I initialize MCP with the created token
    Then the response status should be 401

  Scenario: Valid MCP token can initialize the MCP server
    When I create an MCP token named "Claude Desktop" expiring in "90d"
    And I initialize MCP with the created token
    Then the response status should be 200
    And the MCP response should include server info
