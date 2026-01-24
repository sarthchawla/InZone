#!/bin/bash
# Sync registry with actual git worktrees - clean up orphaned entries
# Detects and removes registry entries that no longer have corresponding worktrees

set -euo pipefail

# Script directory for sourcing other scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source registry functions
source "${SCRIPT_DIR}/registry.sh"

# Exit codes
EXIT_SUCCESS=0
EXIT_INVALID_ARGS=1
EXIT_REGISTRY_ERROR=2
EXIT_USER_CANCELLED=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Options
DRY_RUN=false
FORCE=false
VERBOSE=false

# Counters
VALID_COUNT=0
ORPHANED_COUNT=0
STALE_CONTAINERS_COUNT=0

# Arrays to store results
declare -a VALID_WORKTREES=()
declare -a ORPHANED_ENTRIES=()
declare -a STALE_CONTAINERS=()
declare -a FREED_PORTS=()

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
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# Show usage information
show_usage() {
    cat <<EOF
Usage: sync-registry.sh [OPTIONS]

Sync the worktree registry with the actual filesystem.
Identifies and removes orphaned registry entries.

Options:
  --dry-run          Show orphaned entries without removing them
  -f, --force        Skip confirmation prompts
  -v, --verbose      Show detailed verification for each entry
  -h, --help         Show this help message

Exit codes:
  0  Success (registry synced, orphans removed if any)
  1  Invalid arguments
  2  Registry file not found or corrupted
  3  User cancelled operation

Examples:
  sync-registry.sh                # Sync registry, prompt before cleanup
  sync-registry.sh --dry-run      # Preview orphaned entries
  sync-registry.sh --force        # Clean up without prompts
  sync-registry.sh -v --dry-run   # Detailed verification output
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
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

# Check if Docker is available
check_docker() {
    if command -v docker &> /dev/null; then
        return 0
    else
        log_verbose "Docker not available, skipping container checks"
        return 1
    fi
}

# Check if a container exists (running or stopped)
container_exists() {
    local container_name="$1"
    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
        return 0
    fi
    return 1
}

# Check if a container is running
container_running() {
    local container_name="$1"
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
        return 0
    fi
    return 1
}

# Verify a single worktree entry
# Returns: "valid", "orphaned:<reason>", or "stale_container"
verify_entry() {
    local entry="$1"
    local id path container_name db_container_name

    id=$(echo "$entry" | jq -r '.id')
    path=$(echo "$entry" | jq -r '.path')
    container_name=$(echo "$entry" | jq -r '.containerName // empty')
    db_container_name=$(echo "$entry" | jq -r '.dbContainerName // empty')

    log_verbose "Verifying entry: $id"
    log_verbose "  Path: $path"

    # Check 1: Path exists on filesystem
    if [[ ! -d "$path" ]]; then
        log_verbose "  Check 1 FAILED: Path does not exist"
        echo "orphaned:Path does not exist"
        return 0
    fi
    log_verbose "  Check 1 PASSED: Path exists"

    # Check 2: Git recognizes it as a worktree
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

    if [[ -n "$git_root" ]]; then
        if ! git -C "$git_root" worktree list --porcelain 2>/dev/null | grep -q "worktree $path"; then
            log_verbose "  Check 2 FAILED: Not in git worktree list"
            echo "orphaned:Not in git worktree list"
            return 0
        fi
        log_verbose "  Check 2 PASSED: Git recognizes worktree"
    else
        log_verbose "  Check 2 SKIPPED: Not in a git repository"
    fi

    # Check 3: Docker containers (optional, informational)
    if check_docker; then
        if [[ -n "$container_name" ]]; then
            if container_exists "$container_name"; then
                log_verbose "  Check 3: Container '$container_name' exists"
            else
                log_verbose "  Check 3: Container '$container_name' not found"
            fi
        fi
    fi

    log_verbose "  Result: VALID"
    echo "valid"
}

# Find stale containers (containers for worktrees that no longer exist)
find_stale_containers() {
    if ! check_docker; then
        return 0
    fi

    log_verbose "Searching for stale worktree containers..."

    # Look for containers matching worktree naming pattern
    local containers
    containers=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -E '^inzone-(worktree|postgres-worktree)-' || true)

    while IFS= read -r container; do
        [[ -z "$container" ]] && continue

        # Extract worktree ID from container name
        local worktree_id
        if [[ "$container" =~ ^inzone-worktree-(.+)$ ]]; then
            worktree_id="${BASH_REMATCH[1]}"
        elif [[ "$container" =~ ^inzone-postgres-worktree-(.+)$ ]]; then
            worktree_id="${BASH_REMATCH[1]}"
        else
            continue
        fi

        # Check if this worktree still exists in registry
        if ! worktree_exists "$worktree_id" 2>/dev/null; then
            STALE_CONTAINERS+=("$container")
            ((STALE_CONTAINERS_COUNT++))
            log_verbose "Found stale container: $container (worktree $worktree_id not in registry)"
        fi
    done <<< "$containers"
}

# Scan and classify all registry entries
scan_registry() {
    ensure_registry

    local worktrees_json
    worktrees_json=$(list_worktrees "json")

    local count
    count=$(echo "$worktrees_json" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        log_info "No worktrees registered"
        return 0
    fi

    log_info "Scanning $count registered worktree(s)..."
    echo ""

    while IFS= read -r entry; do
        local id result
        id=$(echo "$entry" | jq -r '.id')
        result=$(verify_entry "$entry")

        if [[ "$result" == "valid" ]]; then
            VALID_WORKTREES+=("$id")
            ((VALID_COUNT++))
        elif [[ "$result" =~ ^orphaned:(.+)$ ]]; then
            local reason="${BASH_REMATCH[1]}"
            ORPHANED_ENTRIES+=("$id|$reason|$entry")
            ((ORPHANED_COUNT++))
        fi
    done < <(echo "$worktrees_json" | jq -c '.[]')

    # Find stale containers
    find_stale_containers
}

# Display scan results report
display_report() {
    echo ""
    echo -e "${BOLD}Registry Sync Report${NC}"
    echo "════════════════════"
    echo ""
    echo -e "Valid worktrees:    ${GREEN}$VALID_COUNT${NC}"
    echo -e "Orphaned entries:   ${YELLOW}$ORPHANED_COUNT${NC}"
    echo -e "Stale containers:   ${YELLOW}$STALE_CONTAINERS_COUNT${NC}"
    echo ""

    if [[ $ORPHANED_COUNT -eq 0 && $STALE_CONTAINERS_COUNT -eq 0 ]]; then
        log_success "All worktrees are valid. No cleanup needed."
        return 0
    fi

    # Display orphaned entries
    if [[ $ORPHANED_COUNT -gt 0 ]]; then
        echo -e "${BOLD}Orphaned entries to remove:${NC}"
        echo ""
        echo "| ID               | Branch               | Ports         | Reason                    |"
        echo "|------------------|----------------------|---------------|---------------------------|"

        for item in "${ORPHANED_ENTRIES[@]}"; do
            local id reason entry
            IFS='|' read -r id reason entry <<< "$item"

            local branch ports
            branch=$(echo "$entry" | jq -r '.branch')
            ports=$(echo "$entry" | jq -r '"\(.ports.frontend)/\(.ports.backend)/\(.ports.database)"')

            # Truncate for table display
            local id_display="${id:0:16}"
            local branch_display="${branch:0:20}"
            local reason_display="${reason:0:25}"

            printf "| %-16s | %-20s | %-13s | %-25s |\n" "$id_display" "$branch_display" "$ports" "$reason_display"

            # Track freed ports
            local fp bp dp
            fp=$(echo "$entry" | jq -r '.ports.frontend')
            bp=$(echo "$entry" | jq -r '.ports.backend')
            dp=$(echo "$entry" | jq -r '.ports.database')
            FREED_PORTS+=("$fp" "$bp" "$dp")
        done
        echo ""
    fi

    # Display stale containers
    if [[ $STALE_CONTAINERS_COUNT -gt 0 ]]; then
        echo -e "${BOLD}Stale containers to remove:${NC}"
        for container in "${STALE_CONTAINERS[@]}"; do
            echo "  - $container"
        done
        echo ""
    fi

    return 0
}

# Confirm with user
confirm_cleanup() {
    if [[ "$FORCE" == true ]]; then
        return 0
    fi

    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi

    local total=$((ORPHANED_COUNT + STALE_CONTAINERS_COUNT))
    echo -n "Remove $ORPHANED_COUNT orphaned entries and $STALE_CONTAINERS_COUNT stale containers? [y/N] "
    read -r response

    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled by user"
        exit $EXIT_USER_CANCELLED
    fi
}

# Remove orphaned entries
cleanup_orphans() {
    local removed_count=0

    for item in "${ORPHANED_ENTRIES[@]}"; do
        local id entry
        IFS='|' read -r id _ entry <<< "$item"

        # Stop and remove any associated containers
        local container_name db_container_name
        container_name=$(echo "$entry" | jq -r '.containerName // empty')
        db_container_name=$(echo "$entry" | jq -r '.dbContainerName // empty')

        if check_docker; then
            if [[ -n "$container_name" ]] && container_exists "$container_name"; then
                log_verbose "Stopping container: $container_name"
                docker stop "$container_name" 2>/dev/null || true
                docker rm "$container_name" 2>/dev/null || true
            fi

            if [[ -n "$db_container_name" ]] && container_exists "$db_container_name"; then
                log_verbose "Stopping container: $db_container_name"
                docker stop "$db_container_name" 2>/dev/null || true
                docker rm "$db_container_name" 2>/dev/null || true
            fi

            # Remove worktree-specific volume
            local volume_name="postgres_data_${id}"
            if docker volume ls -q 2>/dev/null | grep -q "^${volume_name}$"; then
                log_verbose "Removing volume: $volume_name"
                docker volume rm "$volume_name" 2>/dev/null || true
            fi
        fi

        # Remove from registry
        if remove_worktree "$id" 2>/dev/null; then
            ((removed_count++))
            log_verbose "Removed registry entry: $id"
        fi
    done

    echo "Removed $removed_count orphaned registry entries"
}

# Remove stale containers
cleanup_stale_containers() {
    local removed_count=0

    if ! check_docker; then
        return 0
    fi

    for container in "${STALE_CONTAINERS[@]}"; do
        log_verbose "Removing stale container: $container"
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
        ((removed_count++))
    done

    if [[ $removed_count -gt 0 ]]; then
        echo "Stopped and removed $removed_count stale containers"
    fi
}

# Print cleanup summary
print_summary() {
    echo ""
    log_success "Cleanup complete!"
    echo ""

    if [[ ${#FREED_PORTS[@]} -gt 0 ]]; then
        # Remove duplicates and sort
        local unique_ports
        unique_ports=$(printf '%s\n' "${FREED_PORTS[@]}" | sort -n | uniq | tr '\n' ', ' | sed 's/,$//')
        echo "Freed ports: $unique_ports"
    fi

    local remaining
    remaining=$(count_worktrees)
    echo "Remaining worktrees: $remaining"
}

# Main function
main() {
    parse_args "$@"

    # Ensure registry exists
    if ! ensure_registry 2>/dev/null; then
        log_error "Failed to access registry file"
        exit $EXIT_REGISTRY_ERROR
    fi

    # Scan registry
    scan_registry

    # Display report
    display_report

    # Handle dry run
    if [[ "$DRY_RUN" == true ]]; then
        echo ""
        log_info "Dry run - no changes made"
        exit $EXIT_SUCCESS
    fi

    # If nothing to clean up, exit
    if [[ $ORPHANED_COUNT -eq 0 && $STALE_CONTAINERS_COUNT -eq 0 ]]; then
        exit $EXIT_SUCCESS
    fi

    # Confirm with user
    confirm_cleanup

    # Perform cleanup
    log_info "Cleaning up..."
    echo ""

    cleanup_orphans
    cleanup_stale_containers

    # Print summary
    print_summary

    exit $EXIT_SUCCESS
}

# Run main
main "$@"
