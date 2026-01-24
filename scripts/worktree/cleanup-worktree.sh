#!/bin/bash
# Cleanup a single worktree and free its resources
# Removes git worktree, Docker containers, and registry entry

set -euo pipefail

# Script directory for sourcing other scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source registry functions
source "${SCRIPT_DIR}/registry.sh"

# Exit codes
EXIT_SUCCESS=0
EXIT_INVALID_ARGS=1
EXIT_GIT_FAILED=2
EXIT_NOT_FOUND=3
EXIT_USER_CANCELLED=4

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
TARGET=""
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
Usage: cleanup-worktree.sh [OPTIONS] <branch-or-id>

Remove a single worktree and free its resources.

Arguments:
  <branch-or-id>    Branch name (e.g., feature/auth) or worktree ID (e.g., feature-auth)

Options:
  -f, --force       Skip confirmation prompts
  -k, --keep-branch Don't delete the git branch (only remove worktree)
  -v, --verbose     Show detailed output
  -h, --help        Show this help message

What gets cleaned up:
  1. Git worktree directory
  2. Docker containers (app and database)
  3. Docker volumes (database data)
  4. Registry entry (frees allocated ports)
  5. Git branch (unless --keep-branch specified)

Exit codes:
  0  Success
  1  Invalid arguments
  2  Git operation failed
  3  Worktree not found
  4  User cancelled operation

Examples:
  cleanup-worktree.sh feature-auth
  cleanup-worktree.sh feature/authentication
  cleanup-worktree.sh feature-auth --force
  cleanup-worktree.sh feature-auth --keep-branch
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
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
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit $EXIT_INVALID_ARGS
                ;;
            *)
                if [[ -z "$TARGET" ]]; then
                    TARGET="$1"
                else
                    log_error "Unexpected argument: $1"
                    show_usage
                    exit $EXIT_INVALID_ARGS
                fi
                shift
                ;;
        esac
    done
}

# Resolve target to worktree ID
# Handles both branch names (feature/auth) and IDs (feature-auth)
resolve_worktree_id() {
    local target="$1"

    # First, try as-is (might be an ID)
    if worktree_exists "$target"; then
        echo "$target"
        return 0
    fi

    # Try converting branch name to ID
    local converted_id
    converted_id=$(branch_to_id "$target")
    if worktree_exists "$converted_id"; then
        echo "$converted_id"
        return 0
    fi

    # Not found
    return 1
}

# Get worktree information for display
get_worktree_info() {
    local id="$1"
    get_worktree "$id"
}

# Prompt user for confirmation
confirm_cleanup() {
    local id="$1"
    local info="$2"

    if [[ "$FORCE" == true ]]; then
        return 0
    fi

    local branch path frontend_port backend_port database_port
    branch=$(echo "$info" | jq -r '.branch')
    path=$(echo "$info" | jq -r '.path')
    frontend_port=$(echo "$info" | jq -r '.ports.frontend')
    backend_port=$(echo "$info" | jq -r '.ports.backend')
    database_port=$(echo "$info" | jq -r '.ports.database')

    echo ""
    echo "About to remove worktree:"
    echo "  ID:        $id"
    echo "  Branch:    $branch"
    echo "  Path:      $path"
    echo "  Ports:     ${frontend_port}/${backend_port}/${database_port}"
    echo ""

    read -p "Are you sure you want to continue? [y/N] " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled by user"
        exit $EXIT_USER_CANCELLED
    fi
}

# Stop and remove Docker containers
cleanup_docker() {
    local info="$1"

    local container_name db_container_name
    container_name=$(echo "$info" | jq -r '.containerName // empty')
    db_container_name=$(echo "$info" | jq -r '.dbContainerName // empty')

    log_verbose "Cleaning up Docker resources..."

    # Stop and remove app container
    if [[ -n "$container_name" ]]; then
        log_verbose "Stopping container: $container_name"
        if docker ps -q -f "name=^${container_name}$" 2>/dev/null | grep -q .; then
            docker stop "$container_name" 2>/dev/null || true
        fi
        if docker ps -aq -f "name=^${container_name}$" 2>/dev/null | grep -q .; then
            docker rm "$container_name" 2>/dev/null || true
            log_verbose "Removed container: $container_name"
        fi
    fi

    # Stop and remove database container
    if [[ -n "$db_container_name" ]]; then
        log_verbose "Stopping container: $db_container_name"
        if docker ps -q -f "name=^${db_container_name}$" 2>/dev/null | grep -q .; then
            docker stop "$db_container_name" 2>/dev/null || true
        fi
        if docker ps -aq -f "name=^${db_container_name}$" 2>/dev/null | grep -q .; then
            docker rm "$db_container_name" 2>/dev/null || true
            log_verbose "Removed container: $db_container_name"
        fi
    fi

    # Remove worktree-specific volume
    local worktree_id
    worktree_id=$(echo "$info" | jq -r '.id')
    local volume_name="postgres_data_${worktree_id}"
    if docker volume ls -q | grep -q "^${volume_name}$"; then
        docker volume rm "$volume_name" 2>/dev/null || true
        log_verbose "Removed volume: $volume_name"
    fi
}

# Remove git worktree
cleanup_git_worktree() {
    local info="$1"

    local path branch
    path=$(echo "$info" | jq -r '.path')
    branch=$(echo "$info" | jq -r '.branch')

    log_verbose "Removing git worktree at: $path"

    # Remove the worktree
    if [[ -d "$path" ]]; then
        # Use git worktree remove if available
        if git worktree remove "$path" --force 2>/dev/null; then
            log_verbose "Git worktree removed: $path"
        else
            # Fallback: manual removal
            log_warning "Git worktree remove failed, trying manual removal..."
            rm -rf "$path"
            git worktree prune 2>/dev/null || true
        fi
    else
        log_verbose "Worktree path does not exist: $path"
        # Prune stale worktrees
        git worktree prune 2>/dev/null || true
    fi

    # Delete the branch (unless --keep-branch)
    if [[ "$KEEP_BRANCH" != true ]]; then
        log_verbose "Deleting branch: $branch"
        # Force delete local branch
        if git show-ref --verify --quiet "refs/heads/$branch" 2>/dev/null; then
            if git branch -D "$branch" 2>/dev/null; then
                log_verbose "Branch deleted: $branch"
            else
                log_warning "Could not delete branch: $branch"
            fi
        else
            log_verbose "Branch does not exist locally: $branch"
        fi
    fi
}

# Remove from registry
cleanup_registry() {
    local id="$1"

    log_verbose "Removing from registry: $id"
    remove_worktree "$id"
}

# Print cleanup summary
print_summary() {
    local id="$1"
    local info="$2"

    local branch frontend_port backend_port database_port
    branch=$(echo "$info" | jq -r '.branch')
    frontend_port=$(echo "$info" | jq -r '.ports.frontend')
    backend_port=$(echo "$info" | jq -r '.ports.backend')
    database_port=$(echo "$info" | jq -r '.ports.database')

    echo ""
    log_success "Worktree '$id' cleaned up successfully!"
    echo ""
    echo "Freed resources:"
    echo "  - Frontend port: ${frontend_port}"
    echo "  - Backend port:  ${backend_port}"
    echo "  - Database port: ${database_port}"

    if [[ "$KEEP_BRANCH" == true ]]; then
        echo "  - Branch '$branch' was kept (use 'git branch -D $branch' to delete)"
    else
        echo "  - Branch '$branch' deleted"
    fi
    echo ""
}

# Main function
main() {
    parse_args "$@"

    # Validate target is provided
    if [[ -z "$TARGET" ]]; then
        log_error "No worktree specified."
        echo "Usage: cleanup-worktree.sh <branch-or-id>"
        exit $EXIT_INVALID_ARGS
    fi

    # Ensure registry exists
    ensure_registry

    # Resolve target to worktree ID
    local worktree_id
    if ! worktree_id=$(resolve_worktree_id "$TARGET"); then
        log_error "Worktree '$TARGET' not found in registry."
        echo ""
        echo "Run '/worktree-list' or 'registry.sh list table' to see available worktrees."
        exit $EXIT_NOT_FOUND
    fi

    log_verbose "Resolved target '$TARGET' to worktree ID: $worktree_id"

    # Get worktree information
    local worktree_info
    worktree_info=$(get_worktree_info "$worktree_id")

    if [[ -z "$worktree_info" ]] || [[ "$worktree_info" == "null" ]]; then
        log_error "Could not retrieve worktree information for '$worktree_id'"
        exit $EXIT_NOT_FOUND
    fi

    # Confirm with user
    confirm_cleanup "$worktree_id" "$worktree_info"

    log_info "Cleaning up worktree: $worktree_id"

    # Step 1: Stop and remove Docker resources
    cleanup_docker "$worktree_info"

    # Step 2: Remove git worktree and branch
    cleanup_git_worktree "$worktree_info"

    # Step 3: Remove from registry (frees ports)
    cleanup_registry "$worktree_id"

    # Print summary
    print_summary "$worktree_id" "$worktree_info"

    exit $EXIT_SUCCESS
}

# Run main
main "$@"
