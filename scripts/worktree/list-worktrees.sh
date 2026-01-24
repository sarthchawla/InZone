#!/bin/bash
# List all active worktrees with their port configurations
# Part of the Git Worktree Setup System

set -euo pipefail

# Get script directory for sourcing other scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source registry utilities
source "${SCRIPT_DIR}/registry.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Output format
FORMAT="table"
VERBOSE=false
JSON_OUTPUT=false
SHOW_PATHS=false

# Print usage
usage() {
    cat << EOF
Usage: list-worktrees.sh [OPTIONS]

List all registered worktrees with their port configurations.

Options:
    -f, --format <format>   Output format: table (default), json, simple
    -v, --verbose           Show additional details (paths, timestamps)
    -p, --paths             Include full paths in output
    -j, --json              Output in JSON format (shorthand for -f json)
    -h, --help              Show this help message

Examples:
    list-worktrees.sh                   # Table format
    list-worktrees.sh -j                # JSON format
    list-worktrees.sh -v                # Verbose table with paths
    list-worktrees.sh --format simple   # Simple list format

EOF
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -f|--format)
                FORMAT="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -p|--paths)
                SHOW_PATHS=true
                shift
                ;;
            -j|--json)
                FORMAT="json"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                echo -e "${RED}Error: Unknown option: $1${NC}" >&2
                usage
                exit 1
                ;;
        esac
    done
}

# Format relative time from ISO timestamp
format_relative_time() {
    local timestamp="$1"
    local now
    local then
    local diff

    # Parse timestamp (handle both GNU and BSD date)
    if date --version >/dev/null 2>&1; then
        # GNU date
        now=$(date +%s)
        then=$(date -d "$timestamp" +%s 2>/dev/null || echo "$now")
    else
        # BSD date (macOS)
        now=$(date +%s)
        then=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$timestamp" +%s 2>/dev/null || echo "$now")
    fi

    diff=$((now - then))

    if [[ $diff -lt 60 ]]; then
        echo "just now"
    elif [[ $diff -lt 3600 ]]; then
        local mins=$((diff / 60))
        echo "${mins}m ago"
    elif [[ $diff -lt 86400 ]]; then
        local hours=$((diff / 3600))
        echo "${hours}h ago"
    elif [[ $diff -lt 604800 ]]; then
        local days=$((diff / 86400))
        echo "${days}d ago"
    else
        local weeks=$((diff / 604800))
        echo "${weeks}w ago"
    fi
}

# Get status color
status_color() {
    local status="$1"
    case "$status" in
        active) echo -e "${GREEN}●${NC}" ;;
        stopped) echo -e "${YELLOW}○${NC}" ;;
        error) echo -e "${RED}✗${NC}" ;;
        *) echo "?" ;;
    esac
}

# Print table header
print_table_header() {
    local verbose="$1"

    if [[ "$verbose" == true ]]; then
        printf "${BOLD}%-3s %-20s %-25s %-18s %-8s %-12s${NC}\n" \
            "" "ID" "Branch" "Ports (F/B/D)" "Status" "Last Access"
        printf "%-3s %-20s %-25s %-18s %-8s %-12s\n" \
            "---" "--------------------" "-------------------------" "------------------" "--------" "------------"
    else
        printf "${BOLD}%-3s %-20s %-18s %-8s %-12s${NC}\n" \
            "" "ID" "Ports (F/B/D)" "Status" "Last Access"
        printf "%-3s %-20s %-18s %-8s %-12s\n" \
            "---" "--------------------" "------------------" "--------" "------------"
    fi
}

# Print worktree row
print_table_row() {
    local entry="$1"
    local verbose="$2"

    local id branch ports_str status last_accessed path status_icon relative_time

    id=$(echo "$entry" | jq -r '.id')
    branch=$(echo "$entry" | jq -r '.branch')
    local frontend backend database
    frontend=$(echo "$entry" | jq -r '.ports.frontend')
    backend=$(echo "$entry" | jq -r '.ports.backend')
    database=$(echo "$entry" | jq -r '.ports.database')
    ports_str="${frontend}/${backend}/${database}"
    status=$(echo "$entry" | jq -r '.status')
    last_accessed=$(echo "$entry" | jq -r '.lastAccessed')
    path=$(echo "$entry" | jq -r '.path')

    status_icon=$(status_color "$status")
    relative_time=$(format_relative_time "$last_accessed")

    if [[ "$verbose" == true ]]; then
        # Truncate branch if too long
        if [[ ${#branch} -gt 25 ]]; then
            branch="${branch:0:22}..."
        fi
        printf "%-3s %-20s %-25s %-18s %-8s %-12s\n" \
            "$status_icon" "$id" "$branch" "$ports_str" "$status" "$relative_time"

        if [[ "$SHOW_PATHS" == true ]]; then
            printf "    ${CYAN}Path: %s${NC}\n" "$path"
        fi
    else
        printf "%-3s %-20s %-18s %-8s %-12s\n" \
            "$status_icon" "$id" "$ports_str" "$status" "$relative_time"
    fi
}

# Print simple format
print_simple() {
    local worktrees="$1"

    echo "$worktrees" | jq -r '.[] | "\(.id)\t\(.ports.frontend)/\(.ports.backend)/\(.ports.database)\t\(.status)"'
}

# Main list function
list_all() {
    ensure_registry

    local worktrees
    worktrees=$(jq '.worktrees' "$REGISTRY_FILE")
    local count
    count=$(echo "$worktrees" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        echo -e "${YELLOW}No worktrees registered.${NC}"
        echo ""
        echo "Create a new worktree with: /worktree"
        return 0
    fi

    case "$FORMAT" in
        json)
            echo "$worktrees" | jq '.'
            ;;
        simple)
            print_simple "$worktrees"
            ;;
        table|*)
            echo ""
            echo -e "${BOLD}Registered Worktrees${NC} ($count total)"
            echo ""
            print_table_header "$VERBOSE"

            while IFS= read -r entry; do
                print_table_row "$entry" "$VERBOSE"
            done < <(echo "$worktrees" | jq -c '.[]')

            echo ""
            echo -e "${CYAN}Legend: ${GREEN}● active${NC}  ${YELLOW}○ stopped${NC}  ${RED}✗ error${NC}"
            echo ""

            if [[ "$VERBOSE" != true ]]; then
                echo "Use -v for verbose output with branch names and paths"
            fi
            ;;
    esac
}

# Main function
main() {
    parse_args "$@"
    list_all
}

main "$@"
