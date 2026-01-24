#!/bin/bash
# Registry sync tests for worktree system
# Tests the sync-registry.sh script functionality

set -euo pipefail

# Get script directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${TEST_DIR}/../../scripts/worktree"

# Source test utilities
source "${TEST_DIR}/setup.sh"

#######################################
# TEST CASES
#######################################

test_sync_script_exists() {
    # Then: sync-registry.sh should exist and be executable
    assert_file_exists "${SCRIPTS_DIR}/sync-registry.sh" "sync-registry.sh should exist"

    if [[ -x "${SCRIPTS_DIR}/sync-registry.sh" ]]; then
        ((TESTS_RUN++))
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} sync-registry.sh should be executable"
    else
        ((TESTS_RUN++))
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} sync-registry.sh should be executable"
    fi
}

test_sync_shows_help() {
    # Given: Script exists

    # When: Running with --help
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --help 2>&1 || true)

    # Then: Output contains usage information
    assert_contains "Usage" "$output" "Help should contain Usage"
    assert_contains "--dry-run" "$output" "Help should mention --dry-run option"
    assert_contains "--force" "$output" "Help should mention --force option"
    assert_contains "--verbose" "$output" "Help should mention --verbose option"
}

test_detect_orphaned_path_missing() {
    # Given: Registry entry for worktree that doesn't exist on filesystem
    init_test_registry
    add_test_worktree "orphan-wt" "feature/orphan" 5173 3001 5435
    # Note: NOT creating the actual directory

    # When: Running sync with --dry-run
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --dry-run --verbose 2>&1)

    # Then: Entry should be identified as orphaned
    assert_contains "orphan" "$output" "Should detect orphaned worktree"
    assert_contains "Path does not exist" "$output" "Should indicate path does not exist"

    # Registry should be unchanged (dry run)
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "1" "$count" "Dry run should not modify registry"
}

test_detect_valid_worktree() {
    # Given: Registry entry with existing directory
    init_test_registry
    add_test_worktree "valid-wt" "feature/valid" 5173 3001 5435
    create_fake_worktree "valid-wt"

    # When: Running sync with --dry-run
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --dry-run --verbose 2>&1)

    # Then: Entry should be identified as valid (path exists)
    assert_contains "Valid worktrees" "$output" "Should show valid worktrees section"
    # Note: May still be orphaned if not in git worktree list, but path check passes
}

test_sync_removes_orphans() {
    # Given: Registry with orphaned entries
    init_test_registry
    add_test_worktree "orphan-1" "feature/orphan1" 5173 3001 5435
    add_test_worktree "orphan-2" "feature/orphan2" 5174 3002 5436
    # NOT creating directories - these are orphaned

    # When: Running sync with --force
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --force 2>&1)

    # Then: Orphaned entries should be removed
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "0" "$count" "Orphaned entries should be removed"

    assert_contains "Removed" "$output" "Output should indicate removal"
}

test_sync_preserves_valid_entries() {
    # Given: Registry with mixed entries (some valid, some orphaned)
    init_test_registry
    add_test_worktree "valid-wt" "feature/valid" 5173 3001 5435
    add_test_worktree "orphan-wt" "feature/orphan" 5174 3002 5436
    create_fake_worktree "valid-wt"
    # NOT creating orphan directory

    # When: Running sync with --force
    "${SCRIPTS_DIR}/sync-registry.sh" --force 2>&1 || true

    # Then: Valid entry should remain, orphan removed
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "1" "$count" "Should have 1 worktree remaining"

    local remaining_id
    remaining_id=$(jq -r '.worktrees[0].id' "$TEST_REGISTRY_FILE")
    assert_equals "valid-wt" "$remaining_id" "Valid worktree should remain"
}

test_sync_dry_run_no_changes() {
    # Given: Registry with orphaned entries
    init_test_registry
    add_test_worktree "orphan-1" "feature/orphan1" 5173 3001 5435
    add_test_worktree "orphan-2" "feature/orphan2" 5174 3002 5436

    # When: Running sync with --dry-run
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --dry-run 2>&1)

    # Then: No changes should be made
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "2" "$count" "Dry run should not modify registry"

    assert_contains "dry run" "$output" "Output should indicate dry run"
}

test_sync_empty_registry() {
    # Given: Empty registry
    init_test_registry

    # When: Running sync
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" 2>&1)

    # Then: Should handle gracefully
    assert_contains "No worktrees" "$output" "Should indicate no worktrees registered"
}

test_sync_all_valid() {
    # Given: Registry with all valid worktrees
    init_test_registry
    add_test_worktree "wt-1" "feature/one" 5173 3001 5435
    add_test_worktree "wt-2" "feature/two" 5174 3002 5436
    create_fake_worktree "wt-1"
    create_fake_worktree "wt-2"

    # When: Running sync
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --dry-run 2>&1)

    # Then: Should indicate all valid (or orphaned for git, but path exists)
    # The key is no entries are removed in dry run
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "2" "$count" "All worktrees should remain"
}

test_sync_shows_report() {
    # Given: Registry with mixed entries
    init_test_registry
    add_test_worktree "valid-wt" "feature/valid" 5173 3001 5435
    add_test_worktree "orphan-wt" "feature/orphan" 5174 3002 5436
    create_fake_worktree "valid-wt"

    # When: Running sync with --dry-run
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --dry-run 2>&1)

    # Then: Should show report
    assert_contains "Report" "$output" "Should show sync report"
    assert_contains "Valid" "$output" "Should show valid count"
    assert_contains "Orphaned" "$output" "Should show orphaned count"
}

test_sync_verbose_output() {
    # Given: Registry with worktree
    init_test_registry
    add_test_worktree "test-wt" "feature/test" 5173 3001 5435

    # When: Running sync with --verbose
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --dry-run --verbose 2>&1)

    # Then: Should show detailed verification
    assert_contains "test-wt" "$output" "Verbose output should show worktree ID"
    assert_contains "Check" "$output" "Verbose output should show checks"
}

test_sync_freed_ports() {
    # Given: Registry with orphaned entries
    init_test_registry
    add_test_worktree "orphan-1" "feature/orphan1" 5175 3003 5437
    add_test_worktree "orphan-2" "feature/orphan2" 5176 3004 5438

    # When: Running sync with --force
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --force 2>&1)

    # Then: Should show freed ports
    assert_contains "5175" "$output" "Should show freed frontend port"
    assert_contains "3003" "$output" "Should show freed backend port"
}

test_sync_remaining_count() {
    # Given: Registry with mixed entries
    init_test_registry
    add_test_worktree "valid-wt" "feature/valid" 5173 3001 5435
    add_test_worktree "orphan-wt" "feature/orphan" 5174 3002 5436
    create_fake_worktree "valid-wt"

    # When: Running sync with --force
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --force 2>&1)

    # Then: Should show remaining count
    assert_contains "1" "$output" "Should show remaining worktree count"
}

test_sync_exit_codes() {
    # Given: Script help
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --help 2>&1 || true)

    # Then: Exit codes should be documented
    assert_contains "Exit codes" "$output" "Help should document exit codes"
    assert_contains "0" "$output" "Help should document exit code 0"
}

test_sync_multiple_orphans() {
    # Given: Registry with multiple orphaned entries
    init_test_registry
    add_test_worktree "orphan-1" "feature/orphan1" 5173 3001 5435
    add_test_worktree "orphan-2" "feature/orphan2" 5174 3002 5436
    add_test_worktree "orphan-3" "feature/orphan3" 5175 3003 5437

    # When: Running sync with --force
    local output
    output=$("${SCRIPTS_DIR}/sync-registry.sh" --force 2>&1)

    # Then: All orphaned entries should be removed
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "0" "$count" "All orphaned entries should be removed"
}

test_sync_mixed_states() {
    # Given: Registry with entries in different states
    init_test_registry
    add_test_worktree "valid-1" "feature/valid1" 5173 3001 5435
    add_test_worktree "valid-2" "feature/valid2" 5174 3002 5436
    add_test_worktree "orphan-1" "feature/orphan1" 5175 3003 5437
    add_test_worktree "orphan-2" "feature/orphan2" 5176 3004 5438
    create_fake_worktree "valid-1"
    create_fake_worktree "valid-2"

    # When: Running sync with --force
    "${SCRIPTS_DIR}/sync-registry.sh" --force 2>&1 || true

    # Then: Only valid entries should remain
    local count
    count=$(jq '.worktrees | length' "$TEST_REGISTRY_FILE")
    assert_equals "2" "$count" "Should have 2 valid worktrees remaining"

    # Verify correct ones remain
    local ids
    ids=$(jq -r '.worktrees[].id' "$TEST_REGISTRY_FILE" | sort | tr '\n' ',')
    assert_contains "valid-1" "$ids" "valid-1 should remain"
    assert_contains "valid-2" "$ids" "valid-2 should remain"
}

#######################################
# RUN TESTS
#######################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║          REGISTRY SYNC TESTS                    ║"
    echo "╚════════════════════════════════════════════════╝"

    run_test test_sync_script_exists
    run_test test_sync_shows_help
    run_test test_detect_orphaned_path_missing
    run_test test_detect_valid_worktree
    run_test test_sync_removes_orphans
    run_test test_sync_preserves_valid_entries
    run_test test_sync_dry_run_no_changes
    run_test test_sync_empty_registry
    run_test test_sync_all_valid
    run_test test_sync_shows_report
    run_test test_sync_verbose_output
    run_test test_sync_freed_ports
    run_test test_sync_remaining_count
    run_test test_sync_exit_codes
    run_test test_sync_multiple_orphans
    run_test test_sync_mixed_states

    print_summary
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
