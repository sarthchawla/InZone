#!/bin/bash
# Launch Ralph Loop in Devcontainer
#
# This script starts the devcontainer and runs ralph_v2.py inside it.
# All arguments are passed through to ralph_v2.py.
#
# Usage:
#     ./scripts/ralph/launch-devcontainer-ralph.sh <iterations> [ralph options...]
#     ./scripts/ralph/launch-devcontainer-ralph.sh 5
#     ./scripts/ralph/launch-devcontainer-ralph.sh 10 --prompt-file custom.md --verbose
#     ./scripts/ralph/launch-devcontainer-ralph.sh 30 --stop-on-complete
#
# Prerequisites:
#     - Docker installed and running
#     - devcontainer CLI installed (npm install -g @devcontainers/cli)
#     - PROMPT.md file exists in project root

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

log() {
    echo -e "${BLUE}[Launch]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[Launch]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[Launch]${NC} $1"
}

log_error() {
    echo -e "${RED}[Launch]${NC} $1"
}

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEVCONTAINER_DIR="$PROJECT_ROOT/.devcontainer"

# Check for help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo ""
    echo -e "${BOLD}${CYAN}Launch Ralph Loop in Devcontainer${NC}"
    echo ""
    echo "Usage:"
    echo "    $0 <iterations> [ralph options...]"
    echo ""
    echo "Examples:"
    echo "    $0 5                                  # Run 5 iterations"
    echo "    $0 10 --prompt-file custom.md        # Use custom prompt file"
    echo "    $0 30 --verbose                      # Show verbose output"
    echo "    $0 20 --activity-log my-activity.md  # Custom activity log"
    echo ""
    echo "Ralph Options (passed through to ralph_v2.py):"
    echo "    --prompt-file, -p     Path to prompt file (default: PROMPT.md)"
    echo "    --verbose, -v         Show verbose/debug output"
    echo "    --stop-on-complete    Stop when RALPH_COMPLETE detected (default)"
    echo "    --no-stop-on-complete Don't stop on RALPH_COMPLETE"
    echo "    --activity-log, -a    Path to activity log file (default: activity.md)"
    echo ""
    echo "Prerequisites:"
    echo "    - Docker installed and running"
    echo "    - devcontainer CLI: npm install -g @devcontainers/cli"
    echo "    - PROMPT.md file in project root"
    echo ""
    exit 0
fi

# Validate arguments
if [[ $# -lt 1 ]]; then
    log_error "Missing required argument: iterations"
    echo ""
    echo "Usage: $0 <iterations> [ralph options...]"
    echo "Run '$0 --help' for more information."
    exit 1
fi

# Check prerequisites
log "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check devcontainer CLI
if ! command -v devcontainer &> /dev/null; then
    log_warning "devcontainer CLI not found. Installing..."
    npm install -g @devcontainers/cli
fi

# Check PROMPT.md exists (unless a custom prompt file is specified)
PROMPT_FILE="PROMPT.md"
for arg in "$@"; do
    if [[ "$arg" == "--prompt-file" ]] || [[ "$arg" == "-p" ]]; then
        # Next arg will be the prompt file, skip check for default
        PROMPT_FILE=""
        break
    fi
done

if [[ -n "$PROMPT_FILE" ]] && [[ ! -f "$PROJECT_ROOT/$PROMPT_FILE" ]]; then
    log_error "PROMPT.md not found in project root."
    log_warning "Create it from the example:"
    log_warning "  cp scripts/ralph/PROMPT.md.example PROMPT.md"
    exit 1
fi

# Check devcontainer configuration
if [[ ! -f "$DEVCONTAINER_DIR/devcontainer.json" ]]; then
    log_error "devcontainer.json not found in .devcontainer/"
    exit 1
fi

log_success "Prerequisites check passed"

# Build banner
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       🚀 Ralph Devcontainer Launcher                         ║${NC}"
echo -e "${BOLD}${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Project:    ${PROJECT_ROOT##*/}$(printf '%*s' $((46 - ${#PROJECT_ROOT##*/})) '')║${NC}"
echo -e "${CYAN}║  Arguments:  $*$(printf '%*s' $((46 - ${#*})) '')║${NC}"
echo -e "${CYAN}║  Started:    $(date '+%Y-%m-%d %H:%M:%S')$(printf '%*s' 27 '')║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Start/ensure devcontainer is running
log "Starting devcontainer..."

cd "$PROJECT_ROOT"

# Check if container is already running
CONTAINER_NAME="inzone-dev"
if docker ps --format '{{.Names}}' | grep -q "devcontainer"; then
    log_success "Devcontainer already running"
else
    log "Building and starting devcontainer (this may take a while on first run)..."
    devcontainer up --workspace-folder "$PROJECT_ROOT" --remove-existing-container 2>&1 | while read -r line; do
        echo -e "${BLUE}  │${NC} $line"
    done
    log_success "Devcontainer started"
fi

# Run ralph_v2.py inside the devcontainer
log "Launching Ralph loop inside devcontainer..."
echo ""

# Execute ralph_v2.py with all passed arguments
devcontainer exec --workspace-folder "$PROJECT_ROOT" python3 /InZone-App/scripts/ralph/ralph_v2.py "$@"

# Capture exit code
EXIT_CODE=$?

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
    log_success "Ralph loop completed successfully"
else
    log_warning "Ralph loop exited with code $EXIT_CODE"
fi

exit $EXIT_CODE
