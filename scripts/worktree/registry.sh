#!/bin/bash
# Registry management utilities for worktree system
# Location: ~/.inzone/worktree.json

set -euo pipefail

# Registry file location
REGISTRY_DIR="${HOME}/.inzone"
REGISTRY_FILE="${REGISTRY_DIR}/worktree.json"

# Default port ranges
DEFAULT_FRONTEND_MIN=5173
DEFAULT_FRONTEND_MAX=5199
DEFAULT_BACKEND_MIN=3001
DEFAULT_BACKEND_MAX=3099
DEFAULT_DATABASE_MIN=5435
DEFAULT_DATABASE_MAX=5499

# Initialize registry if not exists
init_registry() {
    if [[ ! -d "$REGISTRY_DIR" ]]; then
        mkdir -p "$REGISTRY_DIR"
    fi

    if [[ ! -f "$REGISTRY_FILE" ]]; then
        cat > "$REGISTRY_FILE" << 'EOF'
{
  "worktrees": [],
  "settings": {
    "worktreeBaseDir": "../InZone-App-worktrees",
    "portRanges": {
      "frontend": { "min": 5173, "max": 5199 },
      "backend": { "min": 3001, "max": 3099 },
      "database": { "min": 5435, "max": 5499 }
    }
  }
}
EOF
        echo "Registry initialized at $REGISTRY_FILE"
    fi
}

# Ensure registry exists before operations
ensure_registry() {
    if [[ ! -f "$REGISTRY_FILE" ]]; then
        init_registry
    fi
}

# Get worktree by ID
# Usage: get_worktree <id>
# Returns: JSON object or empty if not found
get_worktree() {
    local id="$1"
    ensure_registry
    jq -r --arg id "$id" '.worktrees[] | select(.id == $id)' "$REGISTRY_FILE"
}

# Check if worktree exists
# Usage: worktree_exists <id>
# Returns: 0 if exists, 1 if not
worktree_exists() {
    local id="$1"
    ensure_registry
    local count
    count=$(jq -r --arg id "$id" '[.worktrees[] | select(.id == $id)] | length' "$REGISTRY_FILE")
    [[ "$count" -gt 0 ]]
}

# Add new worktree entry
# Usage: add_worktree <json_data>
# json_data should include: id, branch, sourceBranch, path, ports, containerName, dbContainerName
add_worktree() {
    local json_data="$1"
    ensure_registry

    # Add timestamps
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local full_entry
    full_entry=$(echo "$json_data" | jq --arg ts "$timestamp" '. + {status: "active", createdAt: $ts, lastAccessed: $ts}')

    # Add to registry
    local tmp_file
    tmp_file=$(mktemp)
    jq --argjson entry "$full_entry" '.worktrees += [$entry]' "$REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$REGISTRY_FILE"

    echo "Worktree added: $(echo "$json_data" | jq -r '.id')"
}

# Update worktree entry
# Usage: update_worktree <id> <json_updates>
update_worktree() {
    local id="$1"
    local updates="$2"
    ensure_registry

    # Update lastAccessed timestamp
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local tmp_file
    tmp_file=$(mktemp)
    jq --arg id "$id" --argjson updates "$updates" --arg ts "$timestamp" \
        '(.worktrees[] | select(.id == $id)) |= (. + $updates + {lastAccessed: $ts})' \
        "$REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$REGISTRY_FILE"
}

# Remove worktree entry
# Usage: remove_worktree <id>
remove_worktree() {
    local id="$1"
    ensure_registry

    if ! worktree_exists "$id"; then
        echo "Warning: Worktree '$id' not found in registry" >&2
        return 1
    fi

    local tmp_file
    tmp_file=$(mktemp)
    jq --arg id "$id" 'del(.worktrees[] | select(.id == $id))' "$REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$REGISTRY_FILE"

    echo "Worktree removed: $id"
}

# List all worktrees
# Usage: list_worktrees [format]
# format: json (default), table
list_worktrees() {
    local format="${1:-json}"
    ensure_registry

    if [[ "$format" == "json" ]]; then
        jq '.worktrees' "$REGISTRY_FILE"
    elif [[ "$format" == "table" ]]; then
        echo "ID|Branch|Ports (F/B/D)|Status|Last Accessed"
        echo "---|------|-------------|------|-------------"
        jq -r '.worktrees[] | "\(.id)|\(.branch)|\(.ports.frontend)/\(.ports.backend)/\(.ports.database)|\(.status)|\(.lastAccessed)"' "$REGISTRY_FILE"
    fi
}

# Get count of worktrees
count_worktrees() {
    ensure_registry
    jq '.worktrees | length' "$REGISTRY_FILE"
}

# Get all used ports for a service type
# Usage: get_used_ports <service_type>
# service_type: frontend, backend, database
get_used_ports() {
    local service_type="$1"
    ensure_registry
    jq -r --arg type "$service_type" '.worktrees[].ports[$type]' "$REGISTRY_FILE" | sort -n
}

# Get port range for a service type
# Usage: get_port_range <service_type>
# Returns: min max (space separated)
get_port_range() {
    local service_type="$1"
    ensure_registry
    jq -r --arg type "$service_type" '.settings.portRanges[$type] | "\(.min) \(.max)"' "$REGISTRY_FILE"
}

# Get worktree base directory
get_worktree_base_dir() {
    ensure_registry
    jq -r '.settings.worktreeBaseDir' "$REGISTRY_FILE"
}

# Set worktree base directory
set_worktree_base_dir() {
    local dir="$1"
    ensure_registry

    local tmp_file
    tmp_file=$(mktemp)
    jq --arg dir "$dir" '.settings.worktreeBaseDir = $dir' "$REGISTRY_FILE" > "$tmp_file"
    mv "$tmp_file" "$REGISTRY_FILE"
}

# Get orphaned entries (in registry but worktree doesn't exist)
# Returns: JSON array of orphaned entries with reason
get_orphaned_entries() {
    ensure_registry

    local orphans="[]"

    while IFS= read -r entry; do
        local id path
        id=$(echo "$entry" | jq -r '.id')
        path=$(echo "$entry" | jq -r '.path')

        local reason=""

        # Check if path exists
        if [[ ! -d "$path" ]]; then
            reason="Path does not exist"
        else
            # Check if git recognizes it as a worktree
            local git_root
            git_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
            if [[ -n "$git_root" ]]; then
                if ! git -C "$git_root" worktree list --porcelain | grep -q "worktree $path"; then
                    reason="Not in git worktree list"
                fi
            fi
        fi

        if [[ -n "$reason" ]]; then
            orphans=$(echo "$orphans" | jq --argjson entry "$entry" --arg reason "$reason" '. += [$entry + {orphanReason: $reason}]')
        fi
    done < <(jq -c '.worktrees[]' "$REGISTRY_FILE")

    echo "$orphans"
}

# Prune orphaned entries from registry
# Usage: prune_orphans [--dry-run]
prune_orphans() {
    local dry_run=false
    if [[ "${1:-}" == "--dry-run" ]]; then
        dry_run=true
    fi

    ensure_registry

    local orphans
    orphans=$(get_orphaned_entries)
    local orphan_count
    orphan_count=$(echo "$orphans" | jq 'length')

    if [[ "$orphan_count" -eq 0 ]]; then
        echo "No orphaned entries found"
        return 0
    fi

    echo "Found $orphan_count orphaned entries:"
    echo "$orphans" | jq -r '.[] | "  - \(.id): \(.orphanReason)"'

    if [[ "$dry_run" == true ]]; then
        echo ""
        echo "Dry run - no changes made"
        return 0
    fi

    # Remove each orphaned entry
    local removed_count=0
    while IFS= read -r id; do
        if remove_worktree "$id" 2>/dev/null; then
            ((removed_count++))
        fi
    done < <(echo "$orphans" | jq -r '.[].id')

    echo "Removed $removed_count orphaned entries"
}

# Update worktree status
# Usage: update_status <id> <status>
# status: active, stopped, error
update_status() {
    local id="$1"
    local status="$2"
    update_worktree "$id" "{\"status\": \"$status\"}"
}

# Get worktrees by status
# Usage: get_by_status <status>
get_by_status() {
    local status="$1"
    ensure_registry
    jq --arg status "$status" '[.worktrees[] | select(.status == $status)]' "$REGISTRY_FILE"
}

# Sanitize branch name to ID (slug)
# Usage: branch_to_id <branch_name>
branch_to_id() {
    local branch="$1"
    # Remove leading refs/heads/ if present
    branch="${branch#refs/heads/}"
    # Replace / with -
    branch="${branch//\//-}"
    # Remove any non-alphanumeric characters except - and _
    branch=$(echo "$branch" | sed 's/[^a-zA-Z0-9_-]//g')
    # Lowercase
    echo "$branch" | tr '[:upper:]' '[:lower:]'
}

# Validate branch name format
# Usage: validate_branch_name <branch_name>
# Returns: 0 if valid, 1 if invalid
validate_branch_name() {
    local branch="$1"
    # Check for invalid characters (allow alphanumeric, -, _, /)
    if [[ ! "$branch" =~ ^[a-zA-Z0-9/_-]+$ ]]; then
        return 1
    fi
    # Check for consecutive slashes
    if [[ "$branch" =~ // ]]; then
        return 1
    fi
    # Check for leading/trailing slash
    if [[ "$branch" =~ ^/ ]] || [[ "$branch" =~ /$ ]]; then
        return 1
    fi
    return 0
}

# Main function for CLI usage
main() {
    local cmd="${1:-help}"
    shift || true

    case "$cmd" in
        init)
            init_registry
            ;;
        get)
            get_worktree "$1"
            ;;
        exists)
            if worktree_exists "$1"; then
                echo "true"
                exit 0
            else
                echo "false"
                exit 1
            fi
            ;;
        add)
            add_worktree "$1"
            ;;
        update)
            update_worktree "$1" "$2"
            ;;
        remove)
            remove_worktree "$1"
            ;;
        list)
            list_worktrees "${1:-json}"
            ;;
        count)
            count_worktrees
            ;;
        used-ports)
            get_used_ports "$1"
            ;;
        port-range)
            get_port_range "$1"
            ;;
        base-dir)
            if [[ -n "${1:-}" ]]; then
                set_worktree_base_dir "$1"
            else
                get_worktree_base_dir
            fi
            ;;
        orphans)
            get_orphaned_entries
            ;;
        prune)
            prune_orphans "${1:-}"
            ;;
        status)
            update_status "$1" "$2"
            ;;
        by-status)
            get_by_status "$1"
            ;;
        branch-to-id)
            branch_to_id "$1"
            ;;
        validate-branch)
            if validate_branch_name "$1"; then
                echo "valid"
                exit 0
            else
                echo "invalid"
                exit 1
            fi
            ;;
        help|--help|-h)
            echo "Usage: registry.sh <command> [args]"
            echo ""
            echo "Commands:"
            echo "  init                    Initialize registry file"
            echo "  get <id>                Get worktree by ID"
            echo "  exists <id>             Check if worktree exists (exit 0/1)"
            echo "  add <json>              Add new worktree entry"
            echo "  update <id> <json>      Update worktree entry"
            echo "  remove <id>             Remove worktree entry"
            echo "  list [format]           List all worktrees (json|table)"
            echo "  count                   Count worktrees"
            echo "  used-ports <type>       Get used ports for service type"
            echo "  port-range <type>       Get port range for service type"
            echo "  base-dir [dir]          Get or set worktree base directory"
            echo "  orphans                 Get orphaned registry entries"
            echo "  prune [--dry-run]       Remove orphaned entries"
            echo "  status <id> <status>    Update worktree status"
            echo "  by-status <status>      Get worktrees by status"
            echo "  branch-to-id <branch>   Convert branch name to ID"
            echo "  validate-branch <name>  Validate branch name format"
            ;;
        *)
            echo "Unknown command: $cmd" >&2
            echo "Run 'registry.sh help' for usage" >&2
            exit 1
            ;;
    esac
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
