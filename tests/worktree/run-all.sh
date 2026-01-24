#!/bin/bash
# Run all worktree system tests
# Usage: ./run-all.sh [--verbose]

set -euo pipefail

# Get script directory
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Options
VERBOSE="${VERBOSE:-false}"
if [[ "${1:-}" == "--verbose" ]] || [[ "${1:-}" == "-v" ]]; then
    VERBOSE=true
    export VERBOSE
fi

# Test files to run (in order)
TEST_FILES=(
    "registry.test.sh"
    "port-allocation.test.sh"
    "setup-worktree.test.sh"
    "devcontainer.test.sh"
    "cleanup-bulk.test.sh"
    "sync-registry.test.sh"
)

# Counters
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
SUITES_RUN=0
SUITES_PASSED=0
SUITES_FAILED=0

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║            WORKTREE SYSTEM TEST SUITE                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Running all test suites..."
echo ""

for test_file in "${TEST_FILES[@]}"; do
    test_path="${TEST_DIR}/${test_file}"

    if [[ ! -f "$test_path" ]]; then
        echo -e "${YELLOW}[SKIP]${NC} ${test_file} - File not found"
        continue
    fi

    if [[ ! -x "$test_path" ]]; then
        echo -e "${YELLOW}[SKIP]${NC} ${test_file} - Not executable"
        continue
    fi

    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Running: ${test_file}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Run the test file and capture output
    set +e
    output=$("$test_path" 2>&1)
    exit_code=$?
    set -e

    # Display output
    echo "$output"
    echo ""

    # Extract test counts from output (looking for "Tests run:", "Passed:", "Failed:")
    suite_tests=$(echo "$output" | grep -E "Tests run:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")
    suite_passed=$(echo "$output" | grep -E "Passed:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")
    suite_failed=$(echo "$output" | grep -E "Failed:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")

    # Update totals
    ((TOTAL_TESTS += suite_tests)) || true
    ((TOTAL_PASSED += suite_passed)) || true
    ((TOTAL_FAILED += suite_failed)) || true
    ((SUITES_RUN++)) || true

    if [[ "$exit_code" -eq 0 ]] && [[ "${suite_failed:-0}" -eq 0 ]]; then
        ((SUITES_PASSED++)) || true
        echo -e "${GREEN}[SUITE PASSED]${NC} ${test_file}"
    else
        ((SUITES_FAILED++)) || true
        echo -e "${RED}[SUITE FAILED]${NC} ${test_file}"
    fi

    echo ""
done

# Print final summary
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    FINAL SUMMARY                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Test Suites:"
echo -e "  Run:    ${SUITES_RUN}"
echo -e "  ${GREEN}Passed: ${SUITES_PASSED}${NC}"
echo -e "  ${RED}Failed: ${SUITES_FAILED}${NC}"
echo ""
echo "Individual Tests:"
echo -e "  Run:    ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed: ${TOTAL_PASSED}${NC}"
echo -e "  ${RED}Failed: ${TOTAL_FAILED}${NC}"
echo ""

if [[ $TOTAL_FAILED -eq 0 ]] && [[ $SUITES_FAILED -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}Some tests failed.${NC}"
    exit 1
fi
