#!/bin/bash
# Main worktree setup orchestrator
# Creates a new git worktree with isolated dev container and unique ports

set -euo pipefail

# Script directory for sourcing other scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="${SCRIPT_DIR}/templates"

# Source registry and port allocation functions
source "${SCRIPT_DIR}/registry.sh"
source "${SCRIPT_DIR}/find-free-port.sh"

# Exit codes
EXIT_SUCCESS=0
EXIT_INVALID_ARGS=1
EXIT_GIT_FAILED=2
EXIT_PORT_FAILED=3
EXIT_DEVCONTAINER_FAILED=4
EXIT_CURSOR_FAILED=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BRANCH=""
SOURCE_BRANCH=""
NO_OPEN=false
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

# Show usage information
show_usage() {
    cat <<EOF
Usage: setup-worktree.sh [OPTIONS]

Setup a new git worktree with isolated dev container and unique ports.

Options:
  -b, --branch <name>     Branch name for the worktree (required)
  -s, --source <branch>   Source branch to create from (default: current branch)
  -n, --no-open           Don't open in Cursor after setup
  -v, --verbose           Show verbose output
  -h, --help              Show this help message

Exit codes:
  0  Success
  1  Invalid arguments
  2  Git operation failed
  3  Port allocation failed
  4  DevContainer generation failed
  5  Cursor launch failed

Examples:
  setup-worktree.sh -b feature/auth
  setup-worktree.sh -b feature/auth -s master
  setup-worktree.sh -b bugfix/123 -s develop --no-open
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -s|--source)
                SOURCE_BRANCH="$2"
                shift 2
                ;;
            -n|--no-open)
                NO_OPEN=true
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

# Get the git repository root
get_git_root() {
    git rev-parse --show-toplevel 2>/dev/null
}

# Get current branch name
get_current_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null
}

# Check if branch exists (local or remote)
branch_exists() {
    local branch="$1"
    git show-ref --verify --quiet "refs/heads/$branch" 2>/dev/null || \
    git show-ref --verify --quiet "refs/remotes/origin/$branch" 2>/dev/null
}

# Validate inputs
validate_inputs() {
    # Branch is required
    if [[ -z "$BRANCH" ]]; then
        log_error "Branch name is required. Use -b/--branch option."
        exit $EXIT_INVALID_ARGS
    fi

    # Validate branch name format
    if ! validate_branch_name "$BRANCH"; then
        log_error "Branch name contains invalid characters. Use alphanumeric, '-', '_', '/'."
        exit $EXIT_INVALID_ARGS
    fi

    # Set default source branch to current branch
    if [[ -z "$SOURCE_BRANCH" ]]; then
        SOURCE_BRANCH=$(get_current_branch)
        log_info "Using current branch as source: $SOURCE_BRANCH"
    fi

    # Check if worktree already exists for this branch
    local worktree_id
    worktree_id=$(branch_to_id "$BRANCH")
    if worktree_exists "$worktree_id"; then
        local existing_path
        existing_path=$(get_worktree "$worktree_id" | jq -r '.path')
        log_error "Worktree for branch '$BRANCH' already exists at: $existing_path"
        log_error "Use '/worktree-list' to see all worktrees or '/worktree-cleanup' to remove it."
        exit $EXIT_INVALID_ARGS
    fi
}

# Fetch latest from remote
fetch_remote() {
    log_info "Fetching latest from remote..."
    if ! git fetch origin 2>/dev/null; then
        log_warning "Could not fetch from remote. Continuing with local state."
    fi
}

# Create branch if it doesn't exist
create_branch_if_needed() {
    if branch_exists "$BRANCH"; then
        log_info "Branch '$BRANCH' already exists"
    else
        log_info "Creating branch '$BRANCH' from '$SOURCE_BRANCH'..."

        # Check if source branch exists
        if ! branch_exists "$SOURCE_BRANCH"; then
            log_error "Source branch '$SOURCE_BRANCH' not found."
            log_error "Run 'git fetch' or check the branch name."
            exit $EXIT_GIT_FAILED
        fi

        # Create the branch
        if ! git branch "$BRANCH" "$SOURCE_BRANCH" 2>/dev/null; then
            # Try with remote prefix
            if ! git branch "$BRANCH" "origin/$SOURCE_BRANCH" 2>/dev/null; then
                log_error "Failed to create branch '$BRANCH' from '$SOURCE_BRANCH'"
                exit $EXIT_GIT_FAILED
            fi
        fi
        log_success "Branch '$BRANCH' created"
    fi
}

# Get worktree directory path
get_worktree_path() {
    local git_root worktree_base worktree_id
    git_root=$(get_git_root)
    worktree_base=$(get_worktree_base_dir)
    worktree_id=$(branch_to_id "$BRANCH")

    # Resolve relative path
    if [[ "$worktree_base" == ../* ]]; then
        echo "$(dirname "$git_root")/${worktree_base#../}/$worktree_id"
    else
        echo "$worktree_base/$worktree_id"
    fi
}

# Create git worktree
create_worktree() {
    local worktree_path="$1"

    log_info "Creating worktree at: $worktree_path"

    # Create parent directory if needed
    mkdir -p "$(dirname "$worktree_path")"

    # Create the worktree
    if ! git worktree add "$worktree_path" "$BRANCH" 2>&1; then
        log_error "Failed to create worktree: git worktree add failed"
        exit $EXIT_GIT_FAILED
    fi

    log_success "Worktree created at: $worktree_path"
}

# Allocate ports for the worktree
allocate_ports() {
    log_info "Allocating ports..."

    local ports_json
    if ! ports_json=$(find_all_ports 2>&1); then
        log_error "Failed to allocate ports: $ports_json"
        exit $EXIT_PORT_FAILED
    fi

    echo "$ports_json"
}

# Generate devcontainer override files
generate_devcontainer_config() {
    local worktree_path="$1"
    local worktree_id="$2"
    local ports_json="$3"

    log_info "Generating devcontainer configuration..."

    local frontend_port backend_port database_port
    frontend_port=$(echo "$ports_json" | jq -r '.frontend')
    backend_port=$(echo "$ports_json" | jq -r '.backend')
    database_port=$(echo "$ports_json" | jq -r '.database')

    local devcontainer_dir="${worktree_path}/.devcontainer"

    # Copy existing devcontainer config if not present
    if [[ ! -d "$devcontainer_dir" ]]; then
        log_error "DevContainer directory not found in worktree"
        exit $EXIT_DEVCONTAINER_FAILED
    fi

    # Check for docker-compose template
    local compose_template="${TEMPLATE_DIR}/docker-compose.worktree.template.yml"
    if [[ ! -f "$compose_template" ]]; then
        log_warning "Docker compose template not found. Creating basic override."
        # Generate basic override without template
        cat > "${devcontainer_dir}/docker-compose.worktree.yml" <<EOF
# Docker Compose override for worktree: ${worktree_id}
# Generated by setup-worktree.sh - DO NOT EDIT MANUALLY

services:
  app:
    container_name: inzone-worktree-${worktree_id}
    environment:
      - VITE_DEV_PORT=${frontend_port}
      - API_PORT=${backend_port}
      - DATABASE_URL=postgresql://inzone:inzone_dev@db:5432/inzone?schema=public
    ports:
      - "${frontend_port}:${frontend_port}"
      - "${backend_port}:${backend_port}"

  db:
    container_name: inzone-postgres-worktree-${worktree_id}
    ports:
      - "${database_port}:5432"

volumes:
  postgres_data_${worktree_id}:
EOF
    else
        # Use template with substitution
        sed -e "s/{{WORKTREE_ID}}/${worktree_id}/g" \
            -e "s/{{FRONTEND_PORT}}/${frontend_port}/g" \
            -e "s/{{BACKEND_PORT}}/${backend_port}/g" \
            -e "s/{{DATABASE_PORT}}/${database_port}/g" \
            "$compose_template" > "${devcontainer_dir}/docker-compose.worktree.yml"
    fi

    # Update devcontainer.json to use the override
    local devcontainer_json="${devcontainer_dir}/devcontainer.json"
    if [[ -f "$devcontainer_json" ]]; then
        # Create a backup
        cp "$devcontainer_json" "${devcontainer_json}.backup"

        # Update the devcontainer.json
        local updated_json
        updated_json=$(jq --arg name "InZone - ${worktree_id}" \
            --argjson frontend "$frontend_port" \
            --argjson backend "$backend_port" \
            --argjson database "$database_port" \
            '. + {
                name: $name,
                forwardPorts: [$frontend, $backend, $database]
            }' "$devcontainer_json")

        echo "$updated_json" > "$devcontainer_json"
    fi

    log_success "DevContainer configuration generated"
}

# Register worktree in registry
register_worktree() {
    local worktree_path="$1"
    local worktree_id="$2"
    local ports_json="$3"

    log_info "Registering worktree..."

    local frontend_port backend_port database_port
    frontend_port=$(echo "$ports_json" | jq -r '.frontend')
    backend_port=$(echo "$ports_json" | jq -r '.backend')
    database_port=$(echo "$ports_json" | jq -r '.database')

    local entry_json
    entry_json=$(cat <<EOF
{
    "id": "$worktree_id",
    "branch": "$BRANCH",
    "sourceBranch": "$SOURCE_BRANCH",
    "path": "$worktree_path",
    "ports": {
        "frontend": $frontend_port,
        "backend": $backend_port,
        "database": $database_port
    },
    "containerName": "inzone-worktree-$worktree_id",
    "dbContainerName": "inzone-postgres-worktree-$worktree_id"
}
EOF
)

    add_worktree "$entry_json"
    log_success "Worktree registered"
}

# Launch Cursor with the worktree
launch_cursor() {
    local worktree_path="$1"

    if [[ "$NO_OPEN" == true ]]; then
        log_info "Skipping Cursor launch (--no-open specified)"
        return
    fi

    log_info "Opening in Cursor..."

    # Check if cursor command exists
    if ! command -v cursor &>/dev/null; then
        # Try code as fallback (VS Code)
        if command -v code &>/dev/null; then
            log_warning "Cursor not found. Opening in VS Code instead."
            code "$worktree_path"
        else
            log_warning "Neither Cursor nor VS Code found. Please open manually: $worktree_path"
            return
        fi
    else
        cursor "$worktree_path"
    fi

    log_success "Opened in editor"
}

# Print summary
print_summary() {
    local worktree_path="$1"
    local worktree_id="$2"
    local ports_json="$3"

    local frontend_port backend_port database_port
    frontend_port=$(echo "$ports_json" | jq -r '.frontend')
    backend_port=$(echo "$ports_json" | jq -r '.backend')
    database_port=$(echo "$ports_json" | jq -r '.database')

    echo ""
    echo "=========================================="
    log_success "Worktree '${BRANCH}' is ready!"
    echo "=========================================="
    echo ""
    echo "| Resource  | Value                                      |"
    echo "|-----------|-------------------------------------------|"
    echo "| Path      | $worktree_path"
    echo "| Branch    | $BRANCH"
    echo "| Source    | $SOURCE_BRANCH"
    echo "| Frontend  | http://localhost:${frontend_port}"
    echo "| Backend   | http://localhost:${backend_port}"
    echo "| Database  | localhost:${database_port}"
    echo ""

    if [[ "$NO_OPEN" == true ]]; then
        echo "To open in Cursor: cursor $worktree_path"
    fi
}

# Main function
main() {
    parse_args "$@"

    # Ensure we're in a git repository
    if ! get_git_root &>/dev/null; then
        log_error "Not in a git repository"
        exit $EXIT_GIT_FAILED
    fi

    # Initialize registry if needed
    ensure_registry

    # Validate inputs
    validate_inputs

    # Phase 1: Git operations
    fetch_remote
    create_branch_if_needed

    # Get worktree path and ID
    local worktree_path worktree_id
    worktree_path=$(get_worktree_path)
    worktree_id=$(branch_to_id "$BRANCH")

    # Phase 2: Create worktree
    create_worktree "$worktree_path"

    # Phase 3: Allocate ports
    local ports_json
    ports_json=$(allocate_ports)

    # Phase 4: Register worktree (do this before generating config so ports are reserved)
    register_worktree "$worktree_path" "$worktree_id" "$ports_json"

    # Phase 5: Generate devcontainer config
    generate_devcontainer_config "$worktree_path" "$worktree_id" "$ports_json"

    # Phase 6: Launch Cursor
    launch_cursor "$worktree_path"

    # Print summary
    print_summary "$worktree_path" "$worktree_id" "$ports_json"

    exit $EXIT_SUCCESS
}

# Run main
main "$@"
