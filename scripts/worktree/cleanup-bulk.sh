#!/bin/bash
# Bulk worktree cleanup - remove multiple worktrees at once
# Supports removing by IDs, all worktrees, or stale worktrees

set -euo pipefail

# Script directory for sourcing other scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source registry functions
source "${SCRIPT_DIR}/registry.sh"

# Exit codes
EXIT_SUCCESS=0
EXIT_INVALID_ARGS=1
EXIT_PARTIAL_SUCCESS=2
EXIT_USER_CANCELLED=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
IDS=""
ALL=false
STALE_DAYS=""
DRY_RUN=false
FORCE=false
KEEP_BRANCH=false
VERBOSE=false

# Print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Show usage information
show_usage() {
    cat <<EOF
Usage: cleanup-bulk.sh [OPTIONS]

Remove multiple worktrees at once.

Options:
  -i, --ids <id1,id2,...>  Comma-separated list of worktree IDs to remove
  -a, --all                Remove ALL worktrees (with confirmation)
  -s, --stale <days>       Remove worktrees not accessed in N days
  --dry-run                Show what would be removed without doing it
  -f, --force              Skip confirmation prompts
  -k, --keep-branch        Don't delete git branches (only remove worktrees)
  -v, --verbose            Show detailed output
  -h, --help               Show this help message

Exit codes:
  0  Success (all specified worktrees removed)
  1  Invalid arguments
  2  Some worktrees failed to remove (partial success)
  3  User cancelled operation

Examples:
  cleanup-bulk.sh --ids feature-auth,bugfix-123
  cleanup-bulk.sh --all --dry-run
  cleanup-bulk.sh --stale 30
  cleanup-bulk.sh --all --force
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -i|--ids)
                IDS="$2"
                shift 2
                ;;
            -a|--all)
                ALL=true
                shift
                ;;
            -s|--stale)
                STALE_DAYS="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -k|--keep-branch)
                KEEP_BRANCH=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit $EXIT_SUCCESS
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit $EXIT_INVALID_ARGS
                ;;
        esac
    done
}

# Validate options
validate_options() {
    local option_count=0

    [[ -n "$IDS" ]] && ((option_count++)) || true
    [[ "$ALL" == true ]] && ((option_count++)) || true
    [[ -n "$STALE_DAYS" ]] && ((option_count++)) || true

    if [[ $option_count -eq 0 ]]; then
        log_error "Must specify one of: --ids, --all, or --stale"
        show_usage
        exit $EXIT_INVALID_ARGS
    fi

    if [[ $option_count -gt 1 ]]; then
        log_error "Cannot combine --ids, --all, and --stale options"
        exit $EXIT_INVALID_ARGS
    fi

    # Validate stale days is a number
    if [[ -n "$STALE_DAYS" ]] && ! [[ "$STALE_DAYS" =~ ^[0-9]+$ ]]; then
        log_error "Stale days must be a positive number"
        exit $EXIT_INVALID_ARGS
    fi
}

# Get worktrees to remove based on options
get_worktrees_to_remove() {
    local worktrees_json

    if [[ "$ALL" == true ]]; then
        # Get all worktrees
        worktrees_json=$(list_worktrees "json")
    elif [[ -n "$STALE_DAYS" ]]; then
        # Get stale worktrees (not accessed in N days)
        local cutoff_date
        cutoff_date=$(date -u -d "$STALE_DAYS days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                      date -u -v-"${STALE_DAYS}"d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)

        worktrees_json=$(jq --arg cutoff "$cutoff_date" \
            '[.[] | select(.lastAccessed < $cutoff)]' <<< "$(list_worktrees "json")")
    elif [[ -n "$IDS" ]]; then
        # Get specific worktrees by ID
        local id_list
        IFS=',' read -ra id_array <<< "$IDS"

        worktrees_json="[]"
        for id in "${id_array[@]}"; do
            id=$(echo "$id" | xargs)  # Trim whitespace
            local worktree
            worktree=$(get_worktree "$id")

            if [[ -n "$worktree" ]] && [[ "$worktree" != "null" ]]; then
                worktrees_json=$(echo "$worktrees_json" | jq --argjson wt "$worktree" '. += [$wt]')
            else
                log_warning "Worktree '$id' not found in registry"
            fi
        done
    fi

    echo "$worktrees_json"
}

# Display worktrees to be removed
display_worktrees() {
    local worktrees_json="$1"
    local count
    count=$(echo "$worktrees_json" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        log_info "No worktrees match the criteria"
        exit $EXIT_SUCCESS
    fi

    echo ""
    echo "Worktrees to be removed ($count):"
    echo ""
    echo "| ID               | Branch               | Ports (F/B/D)    | Last Accessed        |"
    echo "|------------------|----------------------|------------------|----------------------|"

    echo "$worktrees_json" | jq -r '.[] | "| \(.id | .[0:16] | . + " " * (16 - length)) | \(.branch | .[0:20] | . + " " * (20 - length)) | \(.ports.frontend)/\(.ports.backend)/\(.ports.database) | \(.lastAccessed | .[0:20]) |"'

    echo ""
}

# Calculate resources to be freed
calculate_freed_resources() {
    local worktrees_json="$1"

    local frontend_ports backend_ports database_ports
    frontend_ports=$(echo "$worktrees_json" | jq -r '[.[].ports.frontend] | join(", ")')
    backend_ports=$(echo "$worktrees_json" | jq -r '[.[].ports.backend] | join(", ")')
    database_ports=$(echo "$worktrees_json" | jq -r '[.[].ports.database] | join(", ")')

    echo "Resources to be freed:"
    echo "  - Frontend ports: $frontend_ports"
    echo "  - Backend ports:  $backend_ports"
    echo "  - Database ports: $database_ports"
    echo ""
}

# Confirm with user
confirm_removal() {
    local worktrees_json="$1"
    local count
    count=$(echo "$worktrees_json" | jq 'length')

    if [[ "$FORCE" == true ]]; then
        return 0
    fi

    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi

    echo -n "Are you sure you want to remove $count worktree(s)? [y/N] "
    read -r response

    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled by user"
        exit $EXIT_USER_CANCELLED
    fi
}

# Remove a single worktree
# Returns 0 on success, 1 on failure
remove_single_worktree() {
    local worktree_json="$1"
    local id branch path container_name db_container_name

    id=$(echo "$worktree_json" | jq -r '.id')
    branch=$(echo "$worktree_json" | jq -r '.branch')
    path=$(echo "$worktree_json" | jq -r '.path')
    container_name=$(echo "$worktree_json" | jq -r '.containerName // empty')
    db_container_name=$(echo "$worktree_json" | jq -r '.dbContainerName // empty')

    log_verbose "Removing worktree: $id"

    # Stop and remove Docker containers
    if [[ -n "$container_name" ]]; then
        if docker ps -q -f "name=^${container_name}$" 2>/dev/null | grep -q .; then
            docker stop "$container_name" 2>/dev/null || true
        fi
        if docker ps -aq -f "name=^${container_name}$" 2>/dev/null | grep -q .; then
            docker rm "$container_name" 2>/dev/null || true
        fi
    fi

    if [[ -n "$db_container_name" ]]; then
        if docker ps -q -f "name=^${db_container_name}$" 2>/dev/null | grep -q .; then
            docker stop "$db_container_name" 2>/dev/null || true
        fi
        if docker ps -aq -f "name=^${db_container_name}$" 2>/dev/null | grep -q .; then
            docker rm "$db_container_name" 2>/dev/null || true
        fi
    fi

    # Remove worktree-specific volume
    local volume_name="postgres_data_${id}"
    if docker volume ls -q 2>/dev/null | grep -q "^${volume_name}$"; then
        docker volume rm "$volume_name" 2>/dev/null || true
    fi

    # Remove git worktree
    if [[ -d "$path" ]]; then
        if ! git worktree remove "$path" --force 2>/dev/null; then
            rm -rf "$path" 2>/dev/null || true
            git worktree prune 2>/dev/null || true
        fi
    else
        git worktree prune 2>/dev/null || true
    fi

    # Delete branch (unless --keep-branch)
    if [[ "$KEEP_BRANCH" != true ]]; then
        if git show-ref --verify --quiet "refs/heads/$branch" 2>/dev/null; then
            git branch -D "$branch" 2>/dev/null || true
        fi
    fi

    # Remove from registry
    if ! remove_worktree "$id" 2>/dev/null; then
        return 1
    fi

    return 0
}

# Remove all specified worktrees
remove_worktrees() {
    local worktrees_json="$1"
    local count success_count=0 failed_count=0
    count=$(echo "$worktrees_json" | jq 'length')

    local failed_ids=""

    while IFS= read -r worktree; do
        local id
        id=$(echo "$worktree" | jq -r '.id')

        if remove_single_worktree "$worktree"; then
            ((success_count++))
            log_verbose "Successfully removed: $id"
        else
            ((failed_count++))
            failed_ids="${failed_ids}${id}, "
            log_warning "Failed to remove: $id"
        fi
    done < <(echo "$worktrees_json" | jq -c '.[]')

    # Print summary
    echo ""
    log_success "Cleanup complete!"
    echo ""
    echo "Summary:"
    echo "  - Successfully removed: $success_count worktree(s)"

    if [[ $failed_count -gt 0 ]]; then
        echo "  - Failed to remove: $failed_count worktree(s)"
        echo "  - Failed IDs: ${failed_ids%, }"
        return $EXIT_PARTIAL_SUCCESS
    fi

    return $EXIT_SUCCESS
}

# Print freed resources
print_freed_resources() {
    local worktrees_json="$1"

    local frontend_ports backend_ports database_ports
    frontend_ports=$(echo "$worktrees_json" | jq -r '[.[].ports.frontend] | join(", ")')
    backend_ports=$(echo "$worktrees_json" | jq -r '[.[].ports.backend] | join(", ")')
    database_ports=$(echo "$worktrees_json" | jq -r '[.[].ports.database] | join(", ")')

    echo ""
    echo "Freed ports:"
    echo "  - Frontend: $frontend_ports"
    echo "  - Backend:  $backend_ports"
    echo "  - Database: $database_ports"

    local remaining
    remaining=$(count_worktrees)
    echo ""
    echo "Remaining worktrees: $remaining"
}

# Main function
main() {
    parse_args "$@"
    validate_options

    # Ensure registry exists
    ensure_registry

    # Get worktrees to remove
    local worktrees_json
    worktrees_json=$(get_worktrees_to_remove)

    local count
    count=$(echo "$worktrees_json" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        log_info "No worktrees match the specified criteria"
        exit $EXIT_SUCCESS
    fi

    # Display worktrees
    display_worktrees "$worktrees_json"
    calculate_freed_resources "$worktrees_json"

    # Handle dry run
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Dry run - no changes made"
        exit $EXIT_SUCCESS
    fi

    # Confirm with user
    confirm_removal "$worktrees_json"

    # Remove worktrees
    log_info "Removing $count worktree(s)..."

    local exit_code
    if remove_worktrees "$worktrees_json"; then
        exit_code=$EXIT_SUCCESS
    else
        exit_code=$EXIT_PARTIAL_SUCCESS
    fi

    print_freed_resources "$worktrees_json"

    exit $exit_code
}

# Run main
main "$@"
