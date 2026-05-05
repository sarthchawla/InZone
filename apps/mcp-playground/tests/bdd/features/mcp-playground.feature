@mcp-playground
Feature: MCP playground
  Scenario: A user connects to InZone MCP and calls a tool
    Given I have a valid MCP token for the playground
    When I open the MCP playground
    And I connect the playground to the MCP server
    Then I should see MCP tool "list-boards"
    When I run MCP tool "list-boards" with arguments "{}"
    Then the MCP playground result should include "content"

  Scenario: The playground reports malformed JSON before calling a tool
    Given I have a valid MCP token for the playground
    When I open the MCP playground
    And I connect the playground to the MCP server
    When I run MCP tool "list-boards" with arguments "{bad"
    Then the MCP playground error should include "JSON"
