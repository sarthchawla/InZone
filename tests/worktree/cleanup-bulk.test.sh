#!/bin/bash
# Bulk cleanup tests for worktree system
# Tests the cleanup-bulk.sh script functionality

set -euo pipefail

# Get script directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${TEST_DIR}/../../scripts/worktree"

# Source test utilities
source "${TEST_DIR}/setup.sh"

#######################################
# TEST CASES
#######################################

test_cleanup_bulk_script_exists() {
    # Then: cleanup-bulk.sh should exist and be executable
    assert_file_exists "${SCRIPTS_DIR}/cleanup-bulk.sh" "cleanup-bulk.sh should exist"

    if [[ -x "${SCRIPTS_DIR}/cleanup-bulk.sh" ]]; then
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} cleanup-bulk.sh should be executable"
    else
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} cleanup-bulk.sh should be executable"
    fi
}

test_cleanup_bulk_shows_help() {
    # Given: Script exists
    init_test_registry

    # When: Running with --help
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --help 2>&1 || true)

    # Then: Output contains usage information
    assert_contains "Usage" "$output" "Help should contain Usage"
    assert_contains "--ids" "$output" "Help should mention --ids option"
    assert_contains "--all" "$output" "Help should mention --all option"
    assert_contains "--stale" "$output" "Help should mention --stale option"
    assert_contains "--dry-run" "$output" "Help should mention --dry-run option"
}

test_cleanup_bulk_requires_option() {
    # Given: Script and registry exist
    init_test_registry

    # When: Running without any options
    local exit_code=0
    if "${SCRIPTS_DIR}/cleanup-bulk.sh" 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should exit with error (exit code 1)
    assert_exit_code "1" "$exit_code" "Missing options should return exit code 1"
}

test_cleanup_bulk_cannot_combine_options() {
    # Given: Script and registry exist
    init_test_registry

    # When: Running with multiple conflicting options
    local exit_code=0
    if "${SCRIPTS_DIR}/cleanup-bulk.sh" --all --stale 30 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should exit with error
    assert_exit_code "1" "$exit_code" "Conflicting options should return exit code 1"
}

test_cleanup_bulk_by_ids_dry_run() {
    # Given: Registry with 3 worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436
    add_test_worktree "wt-3" "feature/three" 5175 3003 5437
    create_fake_worktree "wt-1"
    create_fake_worktree "wt-2"
    create_fake_worktree "wt-3"

    # When: Running with --ids and --dry-run
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --ids "wt-1,wt-2" --dry-run 2>&1)

    # Then: Should show what would be removed without making changes
    assert_contains "wt-1" "$output" "Output should mention wt-1"
    assert_contains "wt-2" "$output" "Output should mention wt-2"
    assert_contains "dry run" "$output" "Output should indicate dry run"

    # Verify no changes made
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "3" "$count" "Dry run should not modify registry"
}

test_cleanup_bulk_by_ids_force() {
    # Given: Registry with 3 worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436
    add_test_worktree "wt-3" "feature/three" 5175 3003 5437

    # When: Running with --ids and --force (skip git operations)
    "${SCRIPTS_DIR}/cleanup-bulk.sh" --ids "wt-1,wt-2" --force 2>&1 || true

    # Then: wt-1 and wt-2 should be removed, wt-3 remains
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "1" "$count" "Should have 1 worktree remaining"

    local remaining_id
    remaining_id=$(jq -r '.worktrees[0].id' "$TEST_REGISTRY_FILE")
    assert_equals "wt-3" "$remaining_id" "wt-3 should remain"
}

test_cleanup_bulk_all_dry_run() {
    # Given: Registry with 3 worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436
    add_test_worktree "wt-3" "feature/three" 5175 3003 5437

    # When: Running with --all and --dry-run
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --all --dry-run 2>&1)

    # Then: Should show all worktrees to be removed
    assert_contains "wt-1" "$output" "Output should mention wt-1"
    assert_contains "wt-2" "$output" "Output should mention wt-2"
    assert_contains "wt-3" "$output" "Output should mention wt-3"

    # Verify no changes made
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "3" "$count" "Dry run should not modify registry"
}

test_cleanup_bulk_all_force() {
    # Given: Registry with 3 worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436
    add_test_worktree "wt-3" "feature/three" 5175 3003 5437

    # When: Running with --all and --force
    "${SCRIPTS_DIR}/cleanup-bulk.sh" --all --force 2>&1 || true

    # Then: All worktrees should be removed
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "0" "$count" "All worktrees should be removed"
}

test_cleanup_bulk_stale_dry_run() {
    # Given: Registry with worktrees of different ages
    init_test_registry
    add_test_worktree "recent" "feature/recent" 5173 3001 5435
    add_stale_worktree "old-1" "feature/old1" 45 5174 3002 5436
    add_stale_worktree "old-2" "feature/old2" 60 5175 3003 5437

    # When: Running with --stale 30 and --dry-run
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --stale 30 --dry-run 2>&1)

    # Then: Should show old worktrees but not recent
    assert_contains "old-1" "$output" "Output should mention old-1"
    assert_contains "old-2" "$output" "Output should mention old-2"

    # Verify no changes made
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "3" "$count" "Dry run should not modify registry"
}

test_cleanup_bulk_stale_force() {
    # Given: Registry with worktrees of different ages
    init_test_registry
    add_test_worktree "recent" "feature/recent" 5173 3001 5435
    add_stale_worktree "old-1" "feature/old1" 45 5174 3002 5436

    # When: Running with --stale 30 and --force
    "${SCRIPTS_DIR}/cleanup-bulk.sh" --stale 30 --force 2>&1 || true

    # Then: Old worktree should be removed, recent remains
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "1" "$count" "Should have 1 worktree remaining"

    local remaining_id
    remaining_id=$(jq -r '.worktrees[0].id' "$TEST_REGISTRY_FILE")
    assert_equals "recent" "$remaining_id" "Recent worktree should remain"
}

test_cleanup_bulk_keep_branch() {
    # Given: Registry with worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435

    # When: Running with --keep-branch
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --ids "wt-1" --force --keep-branch 2>&1 || true)

    # Then: Should complete (we can't verify branch kept without git)
    # Just verify the flag is accepted and script runs
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "0" "$count" "Worktree should be removed from registry"
}

test_cleanup_bulk_empty_registry() {
    # Given: Empty registry
    init_test_registry

    # When: Running with --all
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --all --force 2>&1)

    # Then: Should handle gracefully
    assert_contains "No worktrees" "$output" "Should indicate no worktrees to remove"
}

test_cleanup_bulk_nonexistent_ids() {
    # Given: Registry with worktrees
    init_test_registry
    add_test_worktree "existing" "feature/existing" 5173 3001 5435

    # When: Running with nonexistent IDs
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --ids "nonexistent" --force 2>&1)

    # Then: Should warn about not found
    assert_contains "not found" "$output" "Should warn about nonexistent worktree"

    # Existing worktree should be unchanged
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "1" "$count" "Existing worktree should remain"
}

test_cleanup_bulk_verbose() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435

    # When: Running with --verbose
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --ids "wt-1" --force --verbose 2>&1 || true)

    # Then: Should show detailed output
    # Verbose output should contain more information
    assert_contains "wt-1" "$output" "Verbose output should mention worktree ID"
}

test_cleanup_bulk_shows_freed_ports() {
    # Given: Registry with worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5174 3002 5436
    add_test_worktree "wt-2" "feature/two" 5175 3003 5437

    # When: Running cleanup
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --all --force 2>&1 || true)

    # Then: Should show freed ports
    assert_contains "5174" "$output" "Should show freed frontend port"
    assert_contains "5175" "$output" "Should show freed frontend port"
}

test_cleanup_bulk_stale_invalid_days() {
    # Given: Registry exists
    init_test_registry

    # When: Running with invalid stale days
    local exit_code=0
    if "${SCRIPTS_DIR}/cleanup-bulk.sh" --stale "invalid" 2>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Then: Should exit with error
    assert_exit_code "1" "$exit_code" "Invalid stale days should return exit code 1"
}

test_cleanup_bulk_shows_remaining_count() {
    # Given: Registry with worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436
    add_test_worktree "wt-3" "feature/three" 5175 3003 5437

    # When: Running cleanup on some worktrees
    local output
    output=$("${SCRIPTS_DIR}/cleanup-bulk.sh" --ids "wt-1,wt-2" --force 2>&1 || true)

    # Then: Should show remaining count
    assert_contains "1" "$output" "Should show remaining worktree count"
}

#######################################
# RUN TESTS
#######################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║          BULK CLEANUP TESTS                     ║"
    echo "╚════════════════════════════════════════════════╝"

    run_test test_cleanup_bulk_script_exists
    run_test test_cleanup_bulk_shows_help
    run_test test_cleanup_bulk_requires_option
    run_test test_cleanup_bulk_cannot_combine_options
    run_test test_cleanup_bulk_by_ids_dry_run
    run_test test_cleanup_bulk_by_ids_force
    run_test test_cleanup_bulk_all_dry_run
    run_test test_cleanup_bulk_all_force
    run_test test_cleanup_bulk_stale_dry_run
    run_test test_cleanup_bulk_stale_force
    run_test test_cleanup_bulk_keep_branch
    run_test test_cleanup_bulk_empty_registry
    run_test test_cleanup_bulk_nonexistent_ids
    run_test test_cleanup_bulk_verbose
    run_test test_cleanup_bulk_shows_freed_ports
    run_test test_cleanup_bulk_stale_invalid_days
    run_test test_cleanup_bulk_shows_remaining_count

    print_summary
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
