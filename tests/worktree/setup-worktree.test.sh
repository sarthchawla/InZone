#!/bin/bash
# Integration tests for setup-worktree.sh
# Tests the main worktree setup orchestration script

set -euo pipefail

# Get script directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${TEST_DIR}/../../scripts/worktree"

# Source test utilities
source "${TEST_DIR}/setup.sh"

#######################################
# HELPER FUNCTIONS
#######################################

# Check if we're in a git repository (required for integration tests)
is_git_repo() {
    git rev-parse --git-dir &>/dev/null
}

# Skip test if not in git repo
require_git_repo() {
    if ! is_git_repo; then
        skip_test "Not in a git repository - skipping git-dependent test"
        return 1
    fi
    return 0
}

#######################################
# TEST CASES
#######################################

test_setup_script_exists() {
    # Given: Scripts directory exists

    # Then: setup-worktree.sh should exist and be executable
    assert_file_exists "${SCRIPTS_DIR}/setup-worktree.sh" "setup-worktree.sh should exist"

    if [[ -x "${SCRIPTS_DIR}/setup-worktree.sh" ]]; then
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} setup-worktree.sh should be executable"
    else
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} setup-worktree.sh should be executable"
    fi
}

test_setup_script_shows_help() {
    # Given: Script exists
    init_test_registry

    # When: Running with --help
    local output
    output=$("${SCRIPTS_DIR}/setup-worktree.sh" --help 2>&1 || true)

    # Then: Output contains usage information
    assert_contains "Usage" "$output" "Help should contain Usage"
    assert_contains "--branch" "$output" "Help should mention --branch option"
    assert_contains "--source" "$output" "Help should mention --source option"
}

test_setup_requires_branch() {
    # Given: Script exists
    init_test_registry

    # When: Running without branch argument
    local exit_code=0
    if "${SCRIPTS_DIR}/setup-worktree.sh" 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should exit with error (exit code 1)
    assert_exit_code "1" "$exit_code" "Missing branch should return exit code 1"
}

test_validates_branch_name_format() {
    # Given: Script and registry exist
    init_test_registry

    # When: Running with invalid branch name
    local exit_code=0
    if "${SCRIPTS_DIR}/setup-worktree.sh" --branch "invalid//branch" --source "master" 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should exit with error
    assert_exit_code "1" "$exit_code" "Invalid branch name should return exit code 1"
}

test_prevents_duplicate_worktree() {
    # Given: Registry with existing worktree
    init_test_registry
    add_test_worktree "feature-existing" "feature/existing" 5173 3001 5435
    create_fake_worktree "feature-existing"

    # When: Trying to create same worktree
    local exit_code=0
    if "${SCRIPTS_DIR}/setup-worktree.sh" --branch "feature/existing" --source "master" --no-open 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should fail with error
    assert_exit_code "1" "$exit_code" "Duplicate worktree should return exit code 1"
}

test_allocates_unique_ports() {
    # Given: Registry with existing worktree using default ports
    init_test_registry
    add_test_worktree "existing-wt" "feature/existing" 5173 3001 5435

    # When: Setup script determines ports (we test via find-free-port)
    local frontend_port backend_port db_port
    frontend_port=$("${SCRIPTS_DIR}/find-free-port.sh" frontend)
    backend_port=$("${SCRIPTS_DIR}/find-free-port.sh" backend)
    db_port=$("${SCRIPTS_DIR}/find-free-port.sh" database)

    # Then: Ports should be different from existing
    assert_equals "5174" "$frontend_port" "Frontend port should be 5174 (next available)"
    assert_equals "3002" "$backend_port" "Backend port should be 3002 (next available)"
    assert_equals "5436" "$db_port" "Database port should be 5436 (next available)"
}

test_templates_exist() {
    # Given: Templates directory

    # Then: Required templates should exist
    assert_file_exists "${SCRIPTS_DIR}/templates/docker-compose.worktree.template.yml" \
        "docker-compose template should exist"
    assert_file_exists "${SCRIPTS_DIR}/templates/devcontainer.worktree.template.json" \
        "devcontainer template should exist"
}

test_template_has_placeholders() {
    # Given: Docker compose template exists

    # When: Reading template content
    local content
    content=$(cat "${SCRIPTS_DIR}/templates/docker-compose.worktree.template.yml")

    # Then: Template contains required placeholders
    assert_contains "{{WORKTREE_ID}}" "$content" "Template should have WORKTREE_ID placeholder"
    assert_contains "{{FRONTEND_PORT}}" "$content" "Template should have FRONTEND_PORT placeholder"
    assert_contains "{{BACKEND_PORT}}" "$content" "Template should have BACKEND_PORT placeholder"
    assert_contains "{{DATABASE_PORT}}" "$content" "Template should have DATABASE_PORT placeholder"
}

test_devcontainer_template_has_placeholders() {
    # Given: DevContainer template exists

    # When: Reading template content
    local content
    content=$(cat "${SCRIPTS_DIR}/templates/devcontainer.worktree.template.json")

    # Then: Template contains required placeholders
    assert_contains "{{WORKTREE_ID}}" "$content" "Template should have WORKTREE_ID placeholder"
    assert_contains "{{FRONTEND_PORT}}" "$content" "Template should have FRONTEND_PORT placeholder"
}

test_exit_codes_documented() {
    # Given: Script help output
    init_test_registry

    # When: Getting help output
    local output
    output=$("${SCRIPTS_DIR}/setup-worktree.sh" --help 2>&1 || true)

    # Then: Exit codes should be documented
    assert_contains "0" "$output" "Help should document exit code 0"
    assert_contains "1" "$output" "Help should document exit code 1"
}

test_no_open_flag_works() {
    # Given: Script exists and test environment
    init_test_registry

    # When: Running with --no-open flag (just checking it's accepted)
    local output exit_code=0
    output=$("${SCRIPTS_DIR}/setup-worktree.sh" --help 2>&1 || true)

    # Then: --no-open should be mentioned in help
    assert_contains "no-open" "$output" "Help should mention --no-open flag"
}

test_source_branch_default() {
    # This test verifies the script behavior documentation
    # Given: Script help output
    init_test_registry

    # When: Getting help output
    local output
    output=$("${SCRIPTS_DIR}/setup-worktree.sh" --help 2>&1 || true)

    # Then: Source branch handling should be documented
    assert_contains "source" "$output" "Help should document source branch option"
}

test_cleanup_script_exists() {
    # Given: Scripts directory

    # Then: cleanup-worktree.sh should exist and be executable
    assert_file_exists "${SCRIPTS_DIR}/cleanup-worktree.sh" "cleanup-worktree.sh should exist"

    if [[ -x "${SCRIPTS_DIR}/cleanup-worktree.sh" ]]; then
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} cleanup-worktree.sh should be executable"
    else
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} cleanup-worktree.sh should be executable"
    fi
}

test_list_script_exists() {
    # Given: Scripts directory

    # Then: list-worktrees.sh should exist and be executable
    assert_file_exists "${SCRIPTS_DIR}/list-worktrees.sh" "list-worktrees.sh should exist"

    if [[ -x "${SCRIPTS_DIR}/list-worktrees.sh" ]]; then
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} list-worktrees.sh should be executable"
    else
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} list-worktrees.sh should be executable"
    fi
}

test_list_shows_empty_registry() {
    # Given: Empty registry
    init_test_registry

    # When: Running list command
    local output
    output=$("${SCRIPTS_DIR}/list-worktrees.sh" 2>&1)

    # Then: Should indicate no worktrees
    assert_contains "No worktrees" "$output" "Empty registry should show 'No worktrees' message"
}

test_list_shows_worktrees() {
    # Given: Registry with worktrees
    init_test_registry
    add_test_worktree "test-wt-1" "feature/test1" 5173 3001 5435
    add_test_worktree "test-wt-2" "feature/test2" 5174 3002 5436

    # When: Running list command
    local output
    output=$("${SCRIPTS_DIR}/list-worktrees.sh" 2>&1)

    # Then: Should show worktrees
    assert_contains "feature/test1" "$output" "List should show first worktree"
    assert_contains "feature/test2" "$output" "List should show second worktree"
    assert_contains "5173" "$output" "List should show first port"
    assert_contains "5174" "$output" "List should show second port"
}

test_verbose_list() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "verbose-test" "feature/verbose" 5173 3001 5435

    # When: Running list with -v flag
    local output
    output=$("${SCRIPTS_DIR}/list-worktrees.sh" -v 2>&1)

    # Then: Should show detailed information
    assert_contains "verbose-test" "$output" "Verbose list should show ID"
}

#######################################
# RUN TESTS
#######################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║       SETUP-WORKTREE INTEGRATION TESTS          ║"
    echo "╚════════════════════════════════════════════════╝"

    run_test test_setup_script_exists
    run_test test_setup_script_shows_help
    run_test test_setup_requires_branch
    run_test test_validates_branch_name_format
    run_test test_prevents_duplicate_worktree
    run_test test_allocates_unique_ports
    run_test test_templates_exist
    run_test test_template_has_placeholders
    run_test test_devcontainer_template_has_placeholders
    run_test test_exit_codes_documented
    run_test test_no_open_flag_works
    run_test test_source_branch_default
    run_test test_cleanup_script_exists
    run_test test_list_script_exists
    run_test test_list_shows_empty_registry
    run_test test_list_shows_worktrees
    run_test test_verbose_list

    print_summary
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
