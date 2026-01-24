#!/bin/bash
# DevContainer configuration tests for worktree system
# Tests template generation and configuration

set -euo pipefail

# Get script directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${TEST_DIR}/../../scripts/worktree"
TEMPLATES_DIR="${SCRIPTS_DIR}/templates"

# Source test utilities
source "${TEST_DIR}/setup.sh"

#######################################
# HELPER FUNCTIONS
#######################################

# Generate docker-compose override from template
generate_docker_compose() {
    local worktree_id="$1"
    local frontend_port="$2"
    local backend_port="$3"
    local database_port="$4"

    local template="${TEMPLATES_DIR}/docker-compose.worktree.template.yml"
    local output

    output=$(cat "$template" | \
        sed "s/{{WORKTREE_ID}}/${worktree_id}/g" | \
        sed "s/{{FRONTEND_PORT}}/${frontend_port}/g" | \
        sed "s/{{BACKEND_PORT}}/${backend_port}/g" | \
        sed "s/{{DATABASE_PORT}}/${database_port}/g")

    echo "$output"
}

# Generate devcontainer.json from template
generate_devcontainer_json() {
    local worktree_id="$1"
    local frontend_port="$2"
    local backend_port="$3"
    local database_port="$4"

    local template="${TEMPLATES_DIR}/devcontainer.worktree.template.json"
    local output

    output=$(cat "$template" | \
        sed "s/{{WORKTREE_ID}}/${worktree_id}/g" | \
        sed "s/{{FRONTEND_PORT}}/${frontend_port}/g" | \
        sed "s/{{BACKEND_PORT}}/${backend_port}/g" | \
        sed "s/{{DATABASE_PORT}}/${database_port}/g")

    echo "$output"
}

#######################################
# TEST CASES
#######################################

test_docker_compose_template_exists() {
    # Then: Template file should exist
    assert_file_exists "${TEMPLATES_DIR}/docker-compose.worktree.template.yml" \
        "docker-compose template should exist"
}

test_devcontainer_template_exists() {
    # Then: Template file should exist
    assert_file_exists "${TEMPLATES_DIR}/devcontainer.worktree.template.json" \
        "devcontainer template should exist"
}

test_docker_compose_template_valid_yaml() {
    # Given: Template exists

    # When: Reading template
    local content
    content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")

    # Then: Should contain expected YAML structure
    assert_contains "services:" "$content" "Template should have services section"
    assert_contains "ports:" "$content" "Template should have ports section"
    assert_contains "environment:" "$content" "Template should have environment section"
}

test_docker_compose_has_all_placeholders() {
    # Given: Template exists

    # When: Reading template
    local content
    content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")

    # Then: Should contain all required placeholders
    assert_contains "{{WORKTREE_ID}}" "$content" "Template should have WORKTREE_ID"
    assert_contains "{{FRONTEND_PORT}}" "$content" "Template should have FRONTEND_PORT"
    assert_contains "{{BACKEND_PORT}}" "$content" "Template should have BACKEND_PORT"
    assert_contains "{{DATABASE_PORT}}" "$content" "Template should have DATABASE_PORT"
}

test_devcontainer_template_valid_json() {
    # Given: Template exists

    # When: Checking if valid JSON (with placeholders replaced)
    local content
    content=$(generate_devcontainer_json "test-id" "5173" "3001" "5435")

    # Then: Should be valid JSON
    if echo "$content" | jq . >/dev/null 2>&1; then
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} Generated devcontainer.json should be valid JSON"
    else
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} Generated devcontainer.json should be valid JSON"
    fi
}

test_docker_compose_generates_correctly() {
    # Given: Template and test values
    local worktree_id="feature-auth"
    local frontend_port="5174"
    local backend_port="3002"
    local database_port="5436"

    # When: Generating docker-compose
    local output
    output=$(generate_docker_compose "$worktree_id" "$frontend_port" "$backend_port" "$database_port")

    # Then: Placeholders should be replaced
    assert_contains "feature-auth" "$output" "Output should contain worktree ID"
    assert_contains "5174" "$output" "Output should contain frontend port"
    assert_contains "3002" "$output" "Output should contain backend port"
    assert_contains "5436" "$output" "Output should contain database port"

    # Should not contain any unreplaced placeholders
    if [[ "$output" == *"{{"* ]]; then
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} Output should not contain unreplaced placeholders"
    else
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} Output should not contain unreplaced placeholders"
    fi
}

test_devcontainer_generates_correctly() {
    # Given: Template and test values
    local worktree_id="bugfix-123"
    local frontend_port="5175"
    local backend_port="3003"
    local database_port="5437"

    # When: Generating devcontainer.json
    local output
    output=$(generate_devcontainer_json "$worktree_id" "$frontend_port" "$backend_port" "$database_port")

    # Then: Placeholders should be replaced
    assert_contains "bugfix-123" "$output" "Output should contain worktree ID"
    assert_contains "5175" "$output" "Output should contain frontend port"

    # Should not contain any unreplaced placeholders
    if [[ "$output" == *"{{"* ]]; then
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} Output should not contain unreplaced placeholders"
    else
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} Output should not contain unreplaced placeholders"
    fi
}

test_docker_compose_unique_container_names() {
    # Given: Two different worktree IDs

    # When: Generating docker-compose for each
    local output1 output2
    output1=$(generate_docker_compose "feature-one" "5174" "3002" "5436")
    output2=$(generate_docker_compose "feature-two" "5175" "3003" "5437")

    # Then: Container names should be unique
    assert_contains "feature-one" "$output1" "First output should have first ID"
    assert_contains "feature-two" "$output2" "Second output should have second ID"

    # Verify they're different
    if [[ "$output1" != "$output2" ]]; then
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} Different worktrees should produce different configs"
    else
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} Different worktrees should produce different configs"
    fi
}

test_docker_compose_has_vite_port_env() {
    # Given: Template exists

    # When: Reading template
    local content
    content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")

    # Then: Should have VITE_DEV_PORT environment variable
    assert_contains "VITE_DEV_PORT" "$content" "Template should set VITE_DEV_PORT env var"
}

test_docker_compose_has_api_port_env() {
    # Given: Template exists

    # When: Reading template
    local content
    content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")

    # Then: Should have API_PORT environment variable
    assert_contains "API_PORT" "$content" "Template should set API_PORT env var"
}

test_docker_compose_has_db_service() {
    # Given: Template exists

    # When: Reading template
    local content
    content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")

    # Then: Should have db service defined
    assert_contains "db:" "$content" "Template should have db service"
}

test_docker_compose_has_volume_definition() {
    # Given: Template exists

    # When: Reading template
    local content
    content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")

    # Then: Should have volumes section
    assert_contains "volumes:" "$content" "Template should have volumes section"
}

test_devcontainer_has_name_field() {
    # Given: Template and test values

    # When: Generating devcontainer.json
    local output
    output=$(generate_devcontainer_json "test-wt" "5173" "3001" "5435")

    # Then: Should have name field with worktree ID
    assert_json_field "$output" ".name" "InZone - test-wt" "devcontainer should have correct name"
}

test_devcontainer_has_forward_ports() {
    # Given: Template and test values

    # When: Generating devcontainer.json
    local output
    output=$(generate_devcontainer_json "test-wt" "5174" "3002" "5436")

    # Then: Should have forwardPorts array with correct ports
    local ports_json
    ports_json=$(echo "$output" | jq '.forwardPorts')

    assert_contains "5174" "$ports_json" "forwardPorts should include frontend port"
    assert_contains "3002" "$ports_json" "forwardPorts should include backend port"
}

test_templates_no_hardcoded_ports() {
    # Given: Templates exist

    # When: Reading templates
    local dc_content devcontainer_content
    dc_content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")
    devcontainer_content=$(cat "${TEMPLATES_DIR}/devcontainer.worktree.template.json")

    # Then: Should not have hardcoded port numbers (except internal ports like 5432)
    # Check for hardcoded external ports in port mappings
    if echo "$dc_content" | grep -E '^\s*-\s*"(5173|5174|3001|3002|5435|5436):(5173|5174|3001|3002)"' >/dev/null; then
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} docker-compose template should not have hardcoded ports"
    else
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} docker-compose template should not have hardcoded ports"
    fi
}

test_docker_compose_has_database_url() {
    # Given: Template exists

    # When: Reading template
    local content
    content=$(cat "${TEMPLATES_DIR}/docker-compose.worktree.template.yml")

    # Then: Should have DATABASE_URL environment variable
    assert_contains "DATABASE_URL" "$content" "Template should set DATABASE_URL env var"
}

#######################################
# RUN TESTS
#######################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║       DEVCONTAINER CONFIGURATION TESTS          ║"
    echo "╚════════════════════════════════════════════════╝"

    run_test test_docker_compose_template_exists
    run_test test_devcontainer_template_exists
    run_test test_docker_compose_template_valid_yaml
    run_test test_docker_compose_has_all_placeholders
    run_test test_devcontainer_template_valid_json
    run_test test_docker_compose_generates_correctly
    run_test test_devcontainer_generates_correctly
    run_test test_docker_compose_unique_container_names
    run_test test_docker_compose_has_vite_port_env
    run_test test_docker_compose_has_api_port_env
    run_test test_docker_compose_has_db_service
    run_test test_docker_compose_has_volume_definition
    run_test test_devcontainer_has_name_field
    run_test test_devcontainer_has_forward_ports
    run_test test_templates_no_hardcoded_ports
    run_test test_docker_compose_has_database_url

    print_summary
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
