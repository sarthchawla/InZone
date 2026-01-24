#!/bin/bash
# Find an available port in the specified range
# Usage: find-free-port.sh <service_type>
# Service types: frontend, backend, database
# Returns: First available port number

set -euo pipefail

# Script directory for sourcing registry.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source registry functions
source "${SCRIPT_DIR}/registry.sh"

# Exit codes
EXIT_SUCCESS=0
EXIT_INVALID_ARGS=1
EXIT_NO_PORTS=3

# Check if a port is in use by the system
# Usage: is_port_in_use <port>
# Returns: 0 if in use, 1 if free
is_port_in_use() {
    local port="$1"

    # Try ss first (faster and more common on modern Linux)
    if command -v ss &>/dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":${port}\b"; then
            return 0
        fi
    # Fall back to lsof
    elif command -v lsof &>/dev/null; then
        if lsof -i ":${port}" &>/dev/null; then
            return 0
        fi
    # Fall back to netstat
    elif command -v netstat &>/dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":${port}\b"; then
            return 0
        fi
    fi

    return 1
}

# Check if a port is reserved in the registry
# Usage: is_port_reserved <service_type> <port>
# Returns: 0 if reserved, 1 if free
is_port_reserved() {
    local service_type="$1"
    local port="$2"

    local used_ports
    used_ports=$(get_used_ports "$service_type")

    if echo "$used_ports" | grep -q "^${port}$"; then
        return 0
    fi

    return 1
}

# Find the first available port in the range for a service type
# Usage: find_free_port <service_type>
# Returns: Port number or exits with error
find_free_port() {
    local service_type="$1"

    # Validate service type
    case "$service_type" in
        frontend|backend|database)
            ;;
        *)
            echo "Error: Invalid service type '$service_type'. Use: frontend, backend, database" >&2
            exit $EXIT_INVALID_ARGS
            ;;
    esac

    # Get port range from registry
    local range
    range=$(get_port_range "$service_type")
    local min_port max_port
    min_port=$(echo "$range" | cut -d' ' -f1)
    max_port=$(echo "$range" | cut -d' ' -f2)

    # Iterate through port range
    local port
    for port in $(seq "$min_port" "$max_port"); do
        # Check if port is reserved in registry
        if is_port_reserved "$service_type" "$port"; then
            continue
        fi

        # Check if port is in use by system
        if is_port_in_use "$port"; then
            continue
        fi

        # Port is available
        echo "$port"
        return $EXIT_SUCCESS
    done

    # No ports available
    echo "Error: No free ports available in range ${min_port}-${max_port} for ${service_type}" >&2
    echo "Run '/worktree-cleanup' to free unused worktrees or expand port range" >&2
    exit $EXIT_NO_PORTS
}

# Find all three ports at once (frontend, backend, database)
# Usage: find_all_ports
# Returns: JSON object with all three ports
find_all_ports() {
    local frontend_port backend_port database_port

    frontend_port=$(find_free_port "frontend")
    backend_port=$(find_free_port "backend")
    database_port=$(find_free_port "database")

    cat <<EOF
{
  "frontend": $frontend_port,
  "backend": $backend_port,
  "database": $database_port
}
EOF
}

# Show usage information
show_usage() {
    cat <<EOF
Usage: find-free-port.sh <service_type|all>

Find an available port for the specified service type.

Service types:
  frontend    Find port in frontend range (default: 5173-5199)
  backend     Find port in backend range (default: 3001-3099)
  database    Find port in database range (default: 5435-5499)
  all         Find all three ports and return as JSON

Exit codes:
  0  Success
  1  Invalid arguments
  3  No free ports available

Examples:
  find-free-port.sh frontend
  find-free-port.sh backend
  find-free-port.sh database
  find-free-port.sh all

The script checks:
  1. Registry for already allocated ports
  2. System for ports in use (via ss, lsof, or netstat)

Returns the first available port in the range.
EOF
}

# Main function
main() {
    local service_type="${1:-}"

    if [[ -z "$service_type" ]] || [[ "$service_type" == "--help" ]] || [[ "$service_type" == "-h" ]]; then
        show_usage
        exit $EXIT_SUCCESS
    fi

    # Ensure registry is initialized
    ensure_registry

    if [[ "$service_type" == "all" ]]; then
        find_all_ports
    else
        find_free_port "$service_type"
    fi
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
