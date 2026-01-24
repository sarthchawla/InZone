#!/bin/bash
# Registry tests for worktree system
# Tests the registry.sh script functionality

set -euo pipefail

# Get script directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${TEST_DIR}/../../scripts/worktree"

# Source test utilities
source "${TEST_DIR}/setup.sh"

#######################################
# TEST CASES
#######################################

test_init_creates_registry() {
    # Given: No registry file exists
    # (setup_test_env creates empty dir but no registry file)

    # When: init_registry is called via CLI
    "${SCRIPTS_DIR}/registry.sh" init

    # Then: Registry file should be created with default settings
    assert_file_exists "$TEST_REGISTRY_FILE" "Registry file should be created"

    local content
    content=$(cat "$TEST_REGISTRY_FILE")
    assert_json_field "$content" ".worktrees | length" "0" "Worktrees array should be empty"
    assert_json_field "$content" ".settings.portRanges.frontend.min" "5173" "Frontend min port should be 5173"
    assert_json_field "$content" ".settings.portRanges.backend.min" "3001" "Backend min port should be 3001"
    assert_json_field "$content" ".settings.portRanges.database.min" "5435" "Database min port should be 5435"
}

test_init_does_not_overwrite() {
    # Given: Registry exists with data
    init_test_registry
    add_test_worktree "existing-wt" "feature/existing" 5173 3001 5435

    # When: init_registry is called again
    "${SCRIPTS_DIR}/registry.sh" init

    # Then: Existing data should be preserved
    local count
    count=$("${SCRIPTS_DIR}/registry.sh" count)
    assert_equals "1" "$count" "Existing worktree should be preserved"
}

test_add_worktree() {
    # Given: Empty registry
    init_test_registry

    # When: add_worktree is called with JSON data
    local worktree_data='{"id":"test-wt","branch":"feature/test","sourceBranch":"master","path":"/tmp/test","ports":{"frontend":5173,"backend":3001,"database":5435},"containerName":"test-container","dbContainerName":"test-db"}'
    "${SCRIPTS_DIR}/registry.sh" add "$worktree_data"

    # Then: Worktree should be in registry
    local count
    count=$("${SCRIPTS_DIR}/registry.sh" count)
    assert_equals "1" "$count" "Worktree count should be 1"

    local worktree
    worktree=$("${SCRIPTS_DIR}/registry.sh" get "test-wt")
    assert_json_field "$worktree" ".branch" "feature/test" "Branch should match"
    assert_json_field "$worktree" ".status" "active" "Status should be active"
    assert_not_empty "$(echo "$worktree" | jq -r '.createdAt')" "createdAt should be set"
}

test_get_worktree() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "my-worktree" "feature/auth" 5174 3002 5436

    # When: get_worktree is called
    local worktree
    worktree=$("${SCRIPTS_DIR}/registry.sh" get "my-worktree")

    # Then: Correct worktree data is returned
    assert_json_field "$worktree" ".id" "my-worktree" "ID should match"
    assert_json_field "$worktree" ".branch" "feature/auth" "Branch should match"
    assert_json_field "$worktree" ".ports.frontend" "5174" "Frontend port should match"
}

test_get_nonexistent_worktree() {
    # Given: Empty registry
    init_test_registry

    # When: get_worktree is called for nonexistent ID
    local worktree
    worktree=$("${SCRIPTS_DIR}/registry.sh" get "nonexistent")

    # Then: Empty result
    assert_equals "" "$worktree" "Nonexistent worktree should return empty"
}

test_worktree_exists_true() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "exists-test" "feature/exists" 5173 3001 5435

    # When: exists check is called
    local result
    result=$("${SCRIPTS_DIR}/registry.sh" exists "exists-test")

    # Then: Returns true
    assert_equals "true" "$result" "Existing worktree should return true"
}

test_worktree_exists_false() {
    # Given: Empty registry
    init_test_registry

    # When: exists check is called for nonexistent
    local result exit_code=0
    if result=$("${SCRIPTS_DIR}/registry.sh" exists "nonexistent"); then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Returns false with exit code 1
    assert_equals "false" "$result" "Nonexistent worktree should return false"
    assert_exit_code "1" "$exit_code" "Nonexistent worktree should exit with code 1"
}

test_remove_worktree() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "to-remove" "feature/remove" 5173 3001 5435

    # When: remove_worktree is called
    "${SCRIPTS_DIR}/registry.sh" remove "to-remove"

    # Then: Worktree should be removed
    local count
    count=$("${SCRIPTS_DIR}/registry.sh" count)
    assert_equals "0" "$count" "Worktree count should be 0 after removal"
}

test_remove_nonexistent_worktree() {
    # Given: Empty registry
    init_test_registry

    # When: remove is called for nonexistent
    local exit_code=0
    if "${SCRIPTS_DIR}/registry.sh" remove "nonexistent" 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should return error exit code
    assert_exit_code "1" "$exit_code" "Removing nonexistent should fail"
}

test_list_worktrees_json() {
    # Given: Registry with 2 worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436

    # When: list is called with json format
    local result
    result=$("${SCRIPTS_DIR}/registry.sh" list json)

    # Then: Returns JSON array with 2 items
    assert_json_length "$result" "2" "Should list 2 worktrees"
}

test_list_worktrees_table() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435

    # When: list is called with table format
    local result
    result=$("${SCRIPTS_DIR}/registry.sh" list table)

    # Then: Returns table formatted output
    assert_contains "feature/one" "$result" "Table should contain branch name"
    assert_contains "5173/3001/5435" "$result" "Table should contain ports"
}

test_count_worktrees() {
    # Given: Registry with 3 worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436
    add_test_worktree "wt-3" "feature/three" 5175 3003 5437

    # When: count is called
    local count
    count=$("${SCRIPTS_DIR}/registry.sh" count)

    # Then: Returns 3
    assert_equals "3" "$count" "Count should be 3"
}

test_get_used_ports() {
    # Given: Registry with 2 worktrees using different ports
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5175 3003 5437

    # When: used-ports is called for frontend
    local result
    result=$("${SCRIPTS_DIR}/registry.sh" used-ports frontend)

    # Then: Returns used frontend ports
    assert_contains "5173" "$result" "Should include 5173"
    assert_contains "5175" "$result" "Should include 5175"
}

test_get_port_range() {
    # Given: Registry with default settings
    init_test_registry

    # When: port-range is called for each type
    local frontend_range backend_range db_range
    frontend_range=$("${SCRIPTS_DIR}/registry.sh" port-range frontend)
    backend_range=$("${SCRIPTS_DIR}/registry.sh" port-range backend)
    db_range=$("${SCRIPTS_DIR}/registry.sh" port-range database)

    # Then: Returns correct ranges
    assert_equals "5173 5199" "$frontend_range" "Frontend range should be 5173 5199"
    assert_equals "3001 3099" "$backend_range" "Backend range should be 3001 3099"
    assert_equals "5435 5499" "$db_range" "Database range should be 5435 5499"
}

test_update_worktree() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "update-test" "feature/update" 5173 3001 5435

    # When: update is called with new status
    "${SCRIPTS_DIR}/registry.sh" update "update-test" '{"status":"stopped"}'

    # Then: Status should be updated
    local worktree
    worktree=$("${SCRIPTS_DIR}/registry.sh" get "update-test")
    assert_json_field "$worktree" ".status" "stopped" "Status should be updated to stopped"
}

test_update_status() {
    # Given: Registry with active worktree
    init_test_registry
    add_test_worktree "status-test" "feature/status" 5173 3001 5435

    # When: status command is called
    "${SCRIPTS_DIR}/registry.sh" status "status-test" "error"

    # Then: Status should be updated
    local worktree
    worktree=$("${SCRIPTS_DIR}/registry.sh" get "status-test")
    assert_json_field "$worktree" ".status" "error" "Status should be error"
}

test_get_by_status() {
    # Given: Registry with worktrees in different states
    init_test_registry
    add_test_worktree "active-1" "feature/active1" 5173 3001 5435
    add_test_worktree "active-2" "feature/active2" 5174 3002 5436
    add_test_worktree "stopped-1" "feature/stopped1" 5175 3003 5437

    # Update one to stopped
    "${SCRIPTS_DIR}/registry.sh" status "stopped-1" "stopped"

    # When: by-status is called
    local active_result stopped_result
    active_result=$("${SCRIPTS_DIR}/registry.sh" by-status active)
    stopped_result=$("${SCRIPTS_DIR}/registry.sh" by-status stopped)

    # Then: Returns correct worktrees
    assert_json_length "$active_result" "2" "Should have 2 active worktrees"
    assert_json_length "$stopped_result" "1" "Should have 1 stopped worktree"
}

test_branch_to_id() {
    # Given: Various branch name formats

    # When: branch-to-id is called
    local result1 result2 result3 result4

    result1=$("${SCRIPTS_DIR}/registry.sh" branch-to-id "feature/auth")
    result2=$("${SCRIPTS_DIR}/registry.sh" branch-to-id "refs/heads/bugfix/issue-123")
    result3=$("${SCRIPTS_DIR}/registry.sh" branch-to-id "FEATURE/UPPER_case")
    result4=$("${SCRIPTS_DIR}/registry.sh" branch-to-id "simple")

    # Then: IDs are properly formatted
    assert_equals "feature-auth" "$result1" "feature/auth -> feature-auth"
    assert_equals "bugfix-issue-123" "$result2" "refs/heads/bugfix/issue-123 -> bugfix-issue-123"
    assert_equals "feature-upper_case" "$result3" "FEATURE/UPPER_case -> feature-upper_case"
    assert_equals "simple" "$result4" "simple -> simple"
}

test_validate_branch_name_valid() {
    # Given: Valid branch names
    local valid_names=("feature/auth" "bugfix-123" "simple" "with_underscore" "feature/nested/path")

    for name in "${valid_names[@]}"; do
        # When: validate-branch is called
        local result
        result=$("${SCRIPTS_DIR}/registry.sh" validate-branch "$name")

        # Then: Returns valid
        assert_equals "valid" "$result" "Branch '$name' should be valid"
    done
}

test_validate_branch_name_invalid() {
    # Given: Invalid branch names
    local invalid_names=("feature//double-slash" "/leading-slash" "trailing-slash/" "with space" "special@char")

    for name in "${invalid_names[@]}"; do
        # When: validate-branch is called
        local result exit_code=0
        if result=$("${SCRIPTS_DIR}/registry.sh" validate-branch "$name"); then
            exit_code=0
        else
            exit_code=$?
        fi

        # Then: Returns invalid with exit code 1
        assert_equals "invalid" "$result" "Branch '$name' should be invalid"
        assert_exit_code "1" "$exit_code" "Invalid branch should exit with code 1"
    done
}

test_base_dir_get() {
    # Given: Registry with default settings
    init_test_registry

    # When: base-dir is called without argument
    local result
    result=$("${SCRIPTS_DIR}/registry.sh" base-dir)

    # Then: Returns default base dir
    assert_equals "../InZone-App-worktrees" "$result" "Default base dir should be ../InZone-App-worktrees"
}

test_base_dir_set() {
    # Given: Registry with default settings
    init_test_registry

    # When: base-dir is called with new value
    "${SCRIPTS_DIR}/registry.sh" base-dir "/custom/worktrees"

    # Then: Base dir should be updated
    local result
    result=$("${SCRIPTS_DIR}/registry.sh" base-dir)
    assert_equals "/custom/worktrees" "$result" "Base dir should be updated"
}

test_help_output() {
    # Given: Script exists

    # When: help is called
    local output
    output=$("${SCRIPTS_DIR}/registry.sh" help)

    # Then: Help contains command descriptions
    assert_contains "Usage" "$output" "Help should contain Usage"
    assert_contains "init" "$output" "Help should mention init command"
    assert_contains "add" "$output" "Help should mention add command"
    assert_contains "remove" "$output" "Help should mention remove command"
    assert_contains "list" "$output" "Help should mention list command"
}

#######################################
# RUN TESTS
#######################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║           REGISTRY TESTS                        ║"
    echo "╚════════════════════════════════════════════════╝"

    run_test test_init_creates_registry
    run_test test_init_does_not_overwrite
    run_test test_add_worktree
    run_test test_get_worktree
    run_test test_get_nonexistent_worktree
    run_test test_worktree_exists_true
    run_test test_worktree_exists_false
    run_test test_remove_worktree
    run_test test_remove_nonexistent_worktree
    run_test test_list_worktrees_json
    run_test test_list_worktrees_table
    run_test test_count_worktrees
    run_test test_get_used_ports
    run_test test_get_port_range
    run_test test_update_worktree
    run_test test_update_status
    run_test test_get_by_status
    run_test test_branch_to_id
    run_test test_validate_branch_name_valid
    run_test test_validate_branch_name_invalid
    run_test test_base_dir_get
    run_test test_base_dir_set
    run_test test_help_output

    print_summary
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
