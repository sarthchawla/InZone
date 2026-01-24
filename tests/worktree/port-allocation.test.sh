#!/bin/bash
# Port allocation tests for worktree system
# Tests the find-free-port.sh script functionality

set -euo pipefail

# Get script directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${TEST_DIR}/../../scripts/worktree"

# Source test utilities
source "${TEST_DIR}/setup.sh"

# Source the script to test (need to source registry.sh functions)
source "${SCRIPTS_DIR}/registry.sh"

#######################################
# TEST CASES
#######################################

test_find_first_available_port() {
    # Given: Empty registry
    init_test_registry

    # When: Finding frontend port
    local port
    port=$("${SCRIPTS_DIR}/find-free-port.sh" frontend)

    # Then: Returns 5173 (base port)
    assert_equals "5173" "$port" "Empty registry should return base frontend port (5173)"
}

test_find_first_available_backend_port() {
    # Given: Empty registry
    init_test_registry

    # When: Finding backend port
    local port
    port=$("${SCRIPTS_DIR}/find-free-port.sh" backend)

    # Then: Returns 3001 (base port)
    assert_equals "3001" "$port" "Empty registry should return base backend port (3001)"
}

test_find_first_available_database_port() {
    # Given: Empty registry
    init_test_registry

    # When: Finding database port
    local port
    port=$("${SCRIPTS_DIR}/find-free-port.sh" database)

    # Then: Returns 5435 (base port)
    assert_equals "5435" "$port" "Empty registry should return base database port (5435)"
}

test_find_next_available_port() {
    # Given: Registry with frontend port 5173 used
    init_test_registry
    add_test_worktree "test-wt-1" "feature/test" 5173 3001 5435

    # When: Finding frontend port
    local port
    port=$("${SCRIPTS_DIR}/find-free-port.sh" frontend)

    # Then: Returns 5174
    assert_equals "5174" "$port" "With 5173 used, should return 5174"
}

test_find_port_with_gap() {
    # Given: Registry with ports 5173 and 5175 used (gap at 5174)
    init_test_registry
    add_test_worktree "test-wt-1" "feature/test1" 5173 3001 5435
    add_test_worktree "test-wt-2" "feature/test2" 5175 3003 5437

    # When: Finding frontend port
    local port
    port=$("${SCRIPTS_DIR}/find-free-port.sh" frontend)

    # Then: Returns 5174 (fills the gap)
    assert_equals "5174" "$port" "Should fill gap and return 5174"
}

test_find_multiple_ports() {
    # Given: Registry with first two ports used
    init_test_registry
    add_test_worktree "test-wt-1" "feature/test1" 5173 3001 5435
    add_test_worktree "test-wt-2" "feature/test2" 5174 3002 5436

    # When: Finding all ports
    local frontend_port backend_port database_port
    frontend_port=$("${SCRIPTS_DIR}/find-free-port.sh" frontend)
    backend_port=$("${SCRIPTS_DIR}/find-free-port.sh" backend)
    database_port=$("${SCRIPTS_DIR}/find-free-port.sh" database)

    # Then: Returns next available in each range
    assert_equals "5175" "$frontend_port" "Frontend should return 5175"
    assert_equals "3003" "$backend_port" "Backend should return 3003"
    assert_equals "5437" "$database_port" "Database should return 5437"
}

test_find_all_ports_json() {
    # Given: Empty registry
    init_test_registry

    # When: Finding all ports at once
    local result
    result=$("${SCRIPTS_DIR}/find-free-port.sh" all)

    # Then: Returns JSON with all three ports
    assert_json_field "$result" ".frontend" "5173" "JSON should have frontend: 5173"
    assert_json_field "$result" ".backend" "3001" "JSON should have backend: 3001"
    assert_json_field "$result" ".database" "5435" "JSON should have database: 5435"
}

test_invalid_service_type() {
    # Given: Registry exists
    init_test_registry

    # When: Finding port for invalid service type
    local exit_code=0
    if "${SCRIPTS_DIR}/find-free-port.sh" invalid 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Exit code 1 (invalid args)
    assert_exit_code "1" "$exit_code" "Invalid service type should return exit code 1"
}

test_shows_help() {
    # Given: Script exists

    # When: Running with --help
    local output
    output=$("${SCRIPTS_DIR}/find-free-port.sh" --help)

    # Then: Output contains usage information
    assert_contains "Usage" "$output" "Help should contain Usage"
    assert_contains "frontend" "$output" "Help should mention frontend"
    assert_contains "backend" "$output" "Help should mention backend"
    assert_contains "database" "$output" "Help should mention database"
}

test_respects_port_range_settings() {
    # Given: Registry with custom port range
    init_test_registry

    # Modify port range for frontend (narrow range for testing)
    local tmp_file
    tmp_file=$(mktemp)
    jq '.settings.portRanges.frontend = {"min": 6000, "max": 6010}' "$TEST_REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$TEST_REGISTRY_FILE"

    # When: Finding frontend port
    local port
    port=$("${SCRIPTS_DIR}/find-free-port.sh" frontend)

    # Then: Returns port from custom range
    assert_equals "6000" "$port" "Should return port from custom range (6000)"
}

test_sequential_allocations() {
    # Given: Empty registry
    init_test_registry

    # When: Allocating 5 sequential frontend ports (simulating multiple worktrees)
    local ports=()
    for i in {1..5}; do
        local port
        port=$("${SCRIPTS_DIR}/find-free-port.sh" frontend)
        ports+=("$port")
        # Add to registry to simulate actual allocation
        add_test_worktree "test-wt-$i" "feature/test$i" "$port" "$((3000 + i))" "$((5434 + i))"
    done

    # Then: Ports should be sequential
    assert_equals "5173" "${ports[0]}" "First allocation should be 5173"
    assert_equals "5174" "${ports[1]}" "Second allocation should be 5174"
    assert_equals "5175" "${ports[2]}" "Third allocation should be 5175"
    assert_equals "5176" "${ports[3]}" "Fourth allocation should be 5176"
    assert_equals "5177" "${ports[4]}" "Fifth allocation should be 5177"
}

test_exhausted_port_range() {
    # Given: Registry with a very narrow port range (all ports used)
    init_test_registry

    # Set a very narrow range
    local tmp_file
    tmp_file=$(mktemp)
    jq '.settings.portRanges.frontend = {"min": 9000, "max": 9002}' "$TEST_REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$TEST_REGISTRY_FILE"

    # Use all ports in range
    add_test_worktree "test-wt-1" "feature/test1" 9000 3001 5435
    add_test_worktree "test-wt-2" "feature/test2" 9001 3002 5436
    add_test_worktree "test-wt-3" "feature/test3" 9002 3003 5437

    # When: Trying to find another port
    local exit_code=0
    if "${SCRIPTS_DIR}/find-free-port.sh" frontend 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should exit with code 3 (no ports available)
    assert_exit_code "3" "$exit_code" "Exhausted port range should return exit code 3"
}

#######################################
# RUN TESTS
#######################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║       PORT ALLOCATION TESTS                     ║"
    echo "╚════════════════════════════════════════════════╝"

    run_test test_find_first_available_port
    run_test test_find_first_available_backend_port
    run_test test_find_first_available_database_port
    run_test test_find_next_available_port
    run_test test_find_port_with_gap
    run_test test_find_multiple_ports
    run_test test_find_all_ports_json
    run_test test_invalid_service_type
    run_test test_shows_help
    run_test test_respects_port_range_settings
    run_test test_sequential_allocations
    run_test test_exhausted_port_range

    print_summary
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
