#!/bin/bash
# Ralph Wiggum - Autonomous Claude Code Loop
# Runs Claude Code iteratively with fresh context per iteration
# Usage: ./scripts/ralph/ralph.sh [max_iterations] [completion_phrase]
#
# The devcontainer's firewall isolation enables --dangerously-skip-permissions,
# allowing Claude to run unattended without permission prompts.

set -euo pipefail

# Enable silent mode to suppress Claude Code notification hooks
# This prevents duplicate notifications since Ralph has its own notification system
export CLAUDE_CODE_SILENT=1

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# Configuration
MAX_ITERATIONS="${1:-10}"
COMPLETION_PHRASE="${2:-RALPH_COMPLETE}"
PROMPT_FILE="PROMPT.md"
ACTIVITY_FILE="activity.md"
ITERATION=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[Ralph]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[Ralph]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[Ralph]${NC} $1"
}

log_error() {
    echo -e "${RED}[Ralph]${NC} $1"
}

# Ensure PROMPT.md exists
if [[ ! -f "$PROMPT_FILE" ]]; then
    log_error "PROMPT.md not found in project root."
    log_warning "Create it from the example:"
    log_warning "  cp scripts/ralph/PROMPT.md.example PROMPT.md"
    exit 1
fi

# Initialize activity log
echo "# Ralph Activity Log" > "$ACTIVITY_FILE"
echo "" >> "$ACTIVITY_FILE"
echo "Started: $(date -Iseconds)" >> "$ACTIVITY_FILE"
echo "Max iterations: $MAX_ITERATIONS" >> "$ACTIVITY_FILE"
echo "Completion phrase: $COMPLETION_PHRASE" >> "$ACTIVITY_FILE"
echo "" >> "$ACTIVITY_FILE"
echo "---" >> "$ACTIVITY_FILE"
echo "" >> "$ACTIVITY_FILE"

log "Starting Ralph Wiggum autonomous loop"
log "Max iterations: $MAX_ITERATIONS"
log "Completion phrase: $COMPLETION_PHRASE"
echo ""

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    ITERATION=$((ITERATION + 1))
    log "=== Iteration $ITERATION of $MAX_ITERATIONS ==="

    # Log iteration start
    echo "## Iteration $ITERATION" >> "$ACTIVITY_FILE"
    echo "Started: $(date -Iseconds)" >> "$ACTIVITY_FILE"
    echo "" >> "$ACTIVITY_FILE"

    # Read the prompt
    PROMPT=$(cat "$PROMPT_FILE")

    # Run Claude Code with fresh context
    # --dangerously-skip-permissions: Skip all permission prompts (enabled by firewall isolation)
    # --print: Output only the final response
    # --max-turns: Limit API round-trips per iteration
    set +e
    OUTPUT=$(claude --dangerously-skip-permissions --print --max-turns 50 "$PROMPT" 2>&1)
    EXIT_CODE=$?
    set -e

    # Log output
    echo "### Output" >> "$ACTIVITY_FILE"
    echo '```' >> "$ACTIVITY_FILE"
    echo "$OUTPUT" >> "$ACTIVITY_FILE"
    echo '```' >> "$ACTIVITY_FILE"
    echo "" >> "$ACTIVITY_FILE"
    echo "Exit code: $EXIT_CODE" >> "$ACTIVITY_FILE"
    echo "Ended: $(date -Iseconds)" >> "$ACTIVITY_FILE"
    echo "" >> "$ACTIVITY_FILE"
    echo "---" >> "$ACTIVITY_FILE"
    echo "" >> "$ACTIVITY_FILE"

    # Check for errors
    if [[ $EXIT_CODE -ne 0 ]]; then
        log_error "Claude exited with code $EXIT_CODE"
        log_warning "Continuing to next iteration..."
        continue
    fi

    # Check for completion phrase
    if echo "$OUTPUT" | grep -q "$COMPLETION_PHRASE"; then
        log_success "Completion phrase detected! Ralph is done."
        echo "## Completion" >> "$ACTIVITY_FILE"
        echo "Ralph completed successfully at iteration $ITERATION" >> "$ACTIVITY_FILE"
        echo "Completion phrase '$COMPLETION_PHRASE' was detected" >> "$ACTIVITY_FILE"
        exit 0
    fi

    log "Iteration $ITERATION complete"
    echo ""
done

log_warning "Max iterations ($MAX_ITERATIONS) reached without completion phrase"
echo "## Timeout" >> "$ACTIVITY_FILE"
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completion phrase" >> "$ACTIVITY_FILE"
exit 1
