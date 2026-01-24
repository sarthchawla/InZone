#!/bin/bash
# Test setup and teardown utilities for worktree system tests
# Provides functions for creating isolated test environments

set -euo pipefail

# Test directories
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${TEST_DIR}/../../scripts/worktree"

# Test-specific paths
TEST_REGISTRY_DIR=""
TEST_REGISTRY_FILE=""
TEST_WORKTREE_DIR=""
ORIGINAL_HOME=""

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Initialize test environment
# Creates isolated directories for registry and worktrees
setup_test_env() {
    local test_name="${1:-test}"

    # Save original HOME
    ORIGINAL_HOME="$HOME"

    # Create temporary test directories
    TEST_REGISTRY_DIR=$(mktemp -d -t "worktree-test-registry-${test_name}-XXXXXX")
    TEST_WORKTREE_DIR=$(mktemp -d -t "worktree-test-worktrees-${test_name}-XXXXXX")

    # Create .inzone directory within test registry
    mkdir -p "${TEST_REGISTRY_DIR}/.inzone"

    # Override HOME to use test registry location
    export HOME="$TEST_REGISTRY_DIR"

    # Set registry file path
    TEST_REGISTRY_FILE="${TEST_REGISTRY_DIR}/.inzone/worktree.json"

    # Export for scripts to use
    export REGISTRY_DIR="${TEST_REGISTRY_DIR}/.inzone"
    export REGISTRY_FILE="$TEST_REGISTRY_FILE"

    echo -e "${BLUE}[SETUP]${NC} Test environment initialized"
    echo "  Registry: $TEST_REGISTRY_FILE"
    echo "  Worktrees: $TEST_WORKTREE_DIR"
}

# Cleanup test environment
teardown_test_env() {
    # Restore original HOME
    if [[ -n "$ORIGINAL_HOME" ]]; then
        export HOME="$ORIGINAL_HOME"
    fi

    # Remove test directories
    if [[ -n "$TEST_REGISTRY_DIR" ]] && [[ -d "$TEST_REGISTRY_DIR" ]]; then
        rm -rf "$TEST_REGISTRY_DIR"
    fi

    if [[ -n "$TEST_WORKTREE_DIR" ]] && [[ -d "$TEST_WORKTREE_DIR" ]]; then
        rm -rf "$TEST_WORKTREE_DIR"
    fi

    # Clear variables
    TEST_REGISTRY_DIR=""
    TEST_REGISTRY_FILE=""
    TEST_WORKTREE_DIR=""

    echo -e "${BLUE}[TEARDOWN]${NC} Test environment cleaned up"
}

# Initialize test registry with default settings
init_test_registry() {
    mkdir -p "$(dirname "$TEST_REGISTRY_FILE")"
    cat > "$TEST_REGISTRY_FILE" << 'EOF'
{
  "worktrees": [],
  "settings": {
    "worktreeBaseDir": "../test-worktrees",
    "portRanges": {
      "frontend": { "min": 5173, "max": 5199 },
      "backend": { "min": 3001, "max": 3099 },
      "database": { "min": 5435, "max": 5499 }
    }
  }
}
EOF
}

# Add a test worktree entry to registry
# Usage: add_test_worktree <id> <branch> [frontend_port] [backend_port] [db_port]
add_test_worktree() {
    local id="$1"
    local branch="$2"
    local frontend_port="${3:-5173}"
    local backend_port="${4:-3001}"
    local db_port="${5:-5435}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Create worktree entry
    local entry
    entry=$(cat <<EOF
{
  "id": "$id",
  "branch": "$branch",
  "sourceBranch": "master",
  "path": "${TEST_WORKTREE_DIR}/${id}",
  "ports": {
    "frontend": $frontend_port,
    "backend": $backend_port,
    "database": $db_port
  },
  "containerName": "inzone-worktree-${id}",
  "dbContainerName": "inzone-postgres-worktree-${id}",
  "status": "active",
  "createdAt": "$timestamp",
  "lastAccessed": "$timestamp"
}
EOF
)

    # Add to registry
    local tmp_file
    tmp_file=$(mktemp)
    jq --argjson entry "$entry" '.worktrees += [$entry]' "$TEST_REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$TEST_REGISTRY_FILE"
}

# Create a fake worktree directory
# Usage: create_fake_worktree <id>
create_fake_worktree() {
    local id="$1"
    mkdir -p "${TEST_WORKTREE_DIR}/${id}"
}

# Add stale worktree entry (with old lastAccessed date)
# Usage: add_stale_worktree <id> <branch> <days_ago>
add_stale_worktree() {
    local id="$1"
    local branch="$2"
    local days_ago="$3"
    local frontend_port="${4:-5173}"
    local backend_port="${5:-3001}"
    local db_port="${6:-5435}"

    local timestamp
    # Try GNU date first, fall back to BSD date
    timestamp=$(date -u -d "$days_ago days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                date -u -v-"${days_ago}"d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)

    local created_timestamp
    created_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local entry
    entry=$(cat <<EOF
{
  "id": "$id",
  "branch": "$branch",
  "sourceBranch": "master",
  "path": "${TEST_WORKTREE_DIR}/${id}",
  "ports": {
    "frontend": $frontend_port,
    "backend": $backend_port,
    "database": $db_port
  },
  "containerName": "inzone-worktree-${id}",
  "dbContainerName": "inzone-postgres-worktree-${id}",
  "status": "active",
  "createdAt": "$created_timestamp",
  "lastAccessed": "$timestamp"
}
EOF
)

    local tmp_file
    tmp_file=$(mktemp)
    jq --argjson entry "$entry" '.worktrees += [$entry]' "$TEST_REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$TEST_REGISTRY_FILE"
}

# Test assertion functions
# Usage: assert_equals <expected> <actual> <message>
assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    ((TESTS_RUN++))

    if [[ "$expected" == "$actual" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} $message"
        echo -e "       Expected: $expected"
        echo -e "       Actual:   $actual"
        return 1
    fi
}

# Assert that actual value contains expected substring
# Usage: assert_contains <expected> <actual> <message>
assert_contains() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    ((TESTS_RUN++))

    if [[ "$actual" == *"$expected"* ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} $message"
        echo -e "       Expected to contain: $expected"
        echo -e "       Actual: $actual"
        return 1
    fi
}

# Assert that a value is not empty
# Usage: assert_not_empty <value> <message>
assert_not_empty() {
    local value="$1"
    local message="${2:-}"

    ((TESTS_RUN++))

    if [[ -n "$value" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} $message"
        echo -e "       Expected non-empty value"
        return 1
    fi
}

# Assert that a file exists
# Usage: assert_file_exists <path> <message>
assert_file_exists() {
    local path="$1"
    local message="${2:-}"

    ((TESTS_RUN++))

    if [[ -f "$path" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} $message"
        echo -e "       File not found: $path"
        return 1
    fi
}

# Assert that a directory exists
# Usage: assert_dir_exists <path> <message>
assert_dir_exists() {
    local path="$1"
    local message="${2:-}"

    ((TESTS_RUN++))

    if [[ -d "$path" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} $message"
        echo -e "       Directory not found: $path"
        return 1
    fi
}

# Assert exit code of last command
# Usage: assert_exit_code <expected> <actual> <message>
assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    ((TESTS_RUN++))

    if [[ "$expected" -eq "$actual" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}[PASS]${NC} $message"
        return 0
    else
        ((TESTS_FAILED++))
        echo -e "${RED}[FAIL]${NC} $message"
        echo -e "       Expected exit code: $expected"
        echo -e "       Actual exit code:   $actual"
        return 1
    fi
}

# Assert JSON field value
# Usage: assert_json_field <json> <field_path> <expected> <message>
assert_json_field() {
    local json="$1"
    local field_path="$2"
    local expected="$3"
    local message="${4:-}"

    local actual
    actual=$(echo "$json" | jq -r "$field_path")

    assert_equals "$expected" "$actual" "$message"
}

# Assert that JSON array has expected length
# Usage: assert_json_length <json> <expected_length> <message>
assert_json_length() {
    local json="$1"
    local expected="$2"
    local message="${3:-}"

    local actual
    actual=$(echo "$json" | jq 'length')

    assert_equals "$expected" "$actual" "$message"
}

# Run a test function and handle errors
# Usage: run_test <test_function_name>
run_test() {
    local test_name="$1"

    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Setup test environment
    setup_test_env "$test_name"

    # Run the test
    local test_result=0
    if "$test_name"; then
        test_result=0
    else
        test_result=$?
    fi

    # Teardown test environment
    teardown_test_env

    return $test_result
}

# Print test summary
print_summary() {
    echo ""
    echo "════════════════════════════════════════════════"
    echo "                 TEST SUMMARY                    "
    echo "════════════════════════════════════════════════"
    echo ""
    echo -e "  Tests run:    $TESTS_RUN"
    echo -e "  ${GREEN}Passed:       $TESTS_PASSED${NC}"
    echo -e "  ${RED}Failed:       $TESTS_FAILED${NC}"
    echo ""

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        return 1
    fi
}

# Mock function for simulating port in use
# Usage: mock_port_in_use <port>
mock_port_in_use() {
    local port="$1"
    # Create a simple listener on the port (will be cleaned up on teardown)
    # For testing purposes, we can skip actual port binding since we're testing registry logic
    echo "$port" >> "${TEST_REGISTRY_DIR}/mocked_ports"
}

# Check if port is mocked as in use
is_mocked_port_in_use() {
    local port="$1"
    if [[ -f "${TEST_REGISTRY_DIR}/mocked_ports" ]]; then
        grep -q "^${port}$" "${TEST_REGISTRY_DIR}/mocked_ports" 2>/dev/null
        return $?
    fi
    return 1
}

# Skip test with message (for tests that require specific environment)
skip_test() {
    local reason="$1"
    echo -e "${YELLOW}[SKIP]${NC} $reason"
    return 0
}

# Mark test as expected to fail
expect_failure() {
    local command="$1"
    local expected_exit="$2"
    local message="${3:-}"

    local actual_exit=0
    if eval "$command" >/dev/null 2>&1; then
        actual_exit=0
    else
        actual_exit=$?
    fi

    assert_exit_code "$expected_exit" "$actual_exit" "$message"
}

# Utility: Get registry worktree count
get_worktree_count() {
    jq '.worktrees | length' "$TEST_REGISTRY_FILE"
}

# Utility: Get specific port from registry
get_registered_port() {
    local id="$1"
    local port_type="$2"
    jq -r --arg id "$id" --arg type "$port_type" \
        '.worktrees[] | select(.id == $id) | .ports[$type]' "$TEST_REGISTRY_FILE"
}

# Export functions for test files
export -f setup_test_env teardown_test_env init_test_registry
export -f add_test_worktree create_fake_worktree add_stale_worktree
export -f assert_equals assert_contains assert_not_empty
export -f assert_file_exists assert_dir_exists assert_exit_code
export -f assert_json_field assert_json_length
export -f run_test print_summary
export -f mock_port_in_use is_mocked_port_in_use
export -f skip_test expect_failure
export -f get_worktree_count get_registered_port
