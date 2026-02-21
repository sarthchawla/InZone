#!/usr/bin/env python3
"""
Ralph Loop Runner v2 - A user-friendly wrapper for running Claude CLI iterations.

Enhanced version with:
- Color-coded output
- Real-time streaming JSON parsing
- Tool call visualization
- Progress tracking
- Completion detection (<promise>COMPLETE</promise> or RALPH_COMPLETE)
- Cost and token statistics
- Activity log generation (activity.md)
- macOS notifications when loop finishes (completion, early completion, or interrupt)

Usage:
    python ralph_v2.py <iterations> [--prompt-file PROMPT.md]
    python ralph_v2.py 5
    python ralph_v2.py 10 --prompt-file custom_prompt.md
    python ralph_v2.py 30 --stop-on-complete --verbose
    python ralph_v2.py 5 --activity-log custom_activity.md
"""

import argparse
import json
import subprocess
import sys
import signal
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, List


# ANSI color codes
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"

    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_BLUE = "\033[44m"


class ActivityLog:
    """Tracks and writes activity to activity.md file."""

    def __init__(self, output_path: Path):
        self.output_path = output_path
        self.entries: List[dict] = []
        self.start_time = datetime.now()

    def add_iteration_start(self, iteration: int, total: int) -> None:
        """Log the start of an iteration."""
        self.entries.append({
            "type": "iteration_start",
            "iteration": iteration,
            "total": total,
            "timestamp": datetime.now().isoformat(),
        })

    def add_iteration_end(self, iteration: int, success: bool, complete: bool) -> None:
        """Log the end of an iteration."""
        self.entries.append({
            "type": "iteration_end",
            "iteration": iteration,
            "success": success,
            "complete": complete,
            "timestamp": datetime.now().isoformat(),
        })

    def add_tool_call(self, iteration: int, tool_name: str, tool_input: dict) -> None:
        """Log a tool call."""
        # Extract relevant info from tool_input
        summary = ""
        if "command" in tool_input:
            cmd = tool_input["command"]
            summary = cmd[:100] + "..." if len(cmd) > 100 else cmd
        elif "file_path" in tool_input:
            summary = tool_input["file_path"]
        elif "path" in tool_input:
            summary = tool_input["path"]
        elif "pattern" in tool_input:
            summary = tool_input["pattern"]
        elif "url" in tool_input:
            summary = tool_input["url"]

        self.entries.append({
            "type": "tool_call",
            "iteration": iteration,
            "tool_name": tool_name,
            "summary": summary,
            "timestamp": datetime.now().isoformat(),
        })

    def add_stats(self, iteration: int, cost: float, duration: float, tokens_in: int, tokens_out: int) -> None:
        """Log iteration stats."""
        self.entries.append({
            "type": "stats",
            "iteration": iteration,
            "cost": cost,
            "duration": duration,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "timestamp": datetime.now().isoformat(),
        })

    def add_error(self, iteration: int, error_msg: str) -> None:
        """Log an error."""
        self.entries.append({
            "type": "error",
            "iteration": iteration,
            "error": error_msg,
            "timestamp": datetime.now().isoformat(),
        })

    def add_iteration_summary(self, iteration: int, accumulated_text: str) -> None:
        """Log the assistant's accumulated text output as an iteration summary."""
        # Extract a meaningful summary from the accumulated text
        # Take the last significant chunk (usually the wrap-up text)
        summary = self._extract_summary(accumulated_text)
        if summary:
            self.entries.append({
                "type": "iteration_summary",
                "iteration": iteration,
                "summary": summary,
                "timestamp": datetime.now().isoformat(),
            })

    @staticmethod
    def _extract_summary(text: str) -> str:
        """Extract a concise summary from accumulated assistant text."""
        if not text:
            return ""
        # Split into lines and filter out empty/whitespace-only lines
        lines = [line.strip() for line in text.strip().split("\n") if line.strip()]
        if not lines:
            return ""
        # Take up to the last 30 meaningful lines as summary context
        summary_lines = lines[-30:]
        return "\n".join(summary_lines)

    def write(self, completed: int, failed: int, early_complete: bool, global_state: dict) -> None:
        """Write the activity log to activity.md."""
        lines = []
        lines.append("# Ralph Activity Log")
        lines.append("")
        lines.append(f"**Started:** {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**Finished:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        # Summary section
        lines.append("## Summary")
        lines.append("")
        lines.append(f"- **Total Iterations:** {completed + failed}")
        lines.append(f"- **Completed:** {completed}")
        lines.append(f"- **Failed:** {failed}")
        if early_complete:
            lines.append(f"- **Status:** RALPH_COMPLETE detected")

        if global_state.get("total_cost"):
            lines.append(f"- **Total Cost:** ${global_state['total_cost']:.4f}")
        if global_state.get("total_duration"):
            duration_mins = global_state["total_duration"] / 1000 / 60
            lines.append(f"- **Total Duration:** {duration_mins:.1f} minutes")
        if global_state.get("total_tokens_in") and global_state.get("total_tokens_out"):
            lines.append(f"- **Total Tokens:** {global_state['total_tokens_in']:,} in / {global_state['total_tokens_out']:,} out")
        lines.append("")

        # Group entries by iteration
        iterations_data = {}
        for entry in self.entries:
            if entry["type"] == "iteration_start":
                iter_num = entry["iteration"]
                if iter_num not in iterations_data:
                    iterations_data[iter_num] = {"tools": [], "errors": [], "stats": None, "success": None, "complete": False, "summary": None}
            elif entry["type"] == "iteration_end":
                iter_num = entry["iteration"]
                if iter_num in iterations_data:
                    iterations_data[iter_num]["success"] = entry["success"]
                    iterations_data[iter_num]["complete"] = entry["complete"]
            elif entry["type"] == "tool_call":
                iter_num = entry["iteration"]
                if iter_num in iterations_data:
                    iterations_data[iter_num]["tools"].append(entry)
            elif entry["type"] == "stats":
                iter_num = entry["iteration"]
                if iter_num in iterations_data:
                    iterations_data[iter_num]["stats"] = entry
            elif entry["type"] == "error":
                iter_num = entry["iteration"]
                if iter_num in iterations_data:
                    iterations_data[iter_num]["errors"].append(entry)
            elif entry["type"] == "iteration_summary":
                iter_num = entry["iteration"]
                if iter_num in iterations_data:
                    iterations_data[iter_num]["summary"] = entry["summary"]

        # Iteration details
        lines.append("## Iteration Details")
        lines.append("")

        for iter_num in sorted(iterations_data.keys()):
            data = iterations_data[iter_num]
            status = "✓" if data["success"] else "✗"
            complete_marker = " (COMPLETE)" if data["complete"] else ""
            lines.append(f"### Iteration {iter_num} {status}{complete_marker}")
            lines.append("")

            # Stats
            if data["stats"]:
                stats = data["stats"]
                lines.append(f"- Cost: ${stats['cost']:.4f}" if stats.get('cost') else "")
                lines.append(f"- Duration: {stats['duration']/1000:.1f}s" if stats.get('duration') else "")
                lines.append(f"- Tokens: {stats.get('tokens_in', 0):,} in / {stats.get('tokens_out', 0):,} out")
                lines.append("")

            # Tools used
            if data["tools"]:
                lines.append("**Tools Used:**")
                for tool in data["tools"]:
                    summary = f" - `{tool['summary']}`" if tool["summary"] else ""
                    lines.append(f"- `{tool['tool_name']}`{summary}")
                lines.append("")

            # Errors
            if data["errors"]:
                lines.append("**Errors:**")
                for error in data["errors"]:
                    lines.append(f"- {error['error']}")
                lines.append("")

            # Iteration summary (what was accomplished)
            if data["summary"]:
                lines.append("**Summary of Work Done:**")
                lines.append("")
                for summary_line in data["summary"].split("\n"):
                    lines.append(f"> {summary_line}")
                lines.append("")

        # Write to file
        self.output_path.write_text("\n".join(lines))


def send_macos_notification(title: str, message: str, sound: str = "default") -> None:
    """Send a macOS notification using osascript."""
    try:
        script = f'''
        display notification "{message}" with title "{title}" sound name "{sound}"
        '''
        subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            timeout=5
        )
    except Exception:
        # Silently fail if notification can't be sent
        pass


def colorize(text: str, *styles: str) -> str:
    """Apply color/style codes to text."""
    return "".join(styles) + text + Colors.RESET


def print_header(iteration: int, total: int) -> None:
    """Print a formatted iteration header."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    header = f" Iteration {iteration}/{total} "
    line = "═" * 60

    print()
    print(colorize(line, Colors.CYAN))
    print(colorize(f"║{header:^58}║", Colors.CYAN, Colors.BOLD))
    print(colorize(f"║{'Started at ' + timestamp:^58}║", Colors.CYAN))
    print(colorize(line, Colors.CYAN))
    print()


def print_footer(iteration: int, success: bool) -> None:
    """Print a formatted iteration footer."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status = "✓ Completed" if success else "✗ Failed"
    color = Colors.GREEN if success else Colors.RED

    print()
    print(colorize(f"── End of iteration {iteration} at {timestamp} {status} ──", color, Colors.BOLD))
    print()


def print_tool_call(tool_name: str, tool_input: dict) -> None:
    """Print a formatted tool call."""
    print(colorize(f"  🔧 {tool_name}", Colors.YELLOW, Colors.BOLD))

    # Show relevant parts of the input
    if "command" in tool_input:
        cmd = tool_input['command']
        # Truncate long commands
        if len(cmd) > 80:
            cmd = cmd[:77] + "..."
        print(colorize(f"     $ {cmd}", Colors.DIM))
    elif "file_path" in tool_input:
        print(colorize(f"     📄 {tool_input['file_path']}", Colors.DIM))
    elif "path" in tool_input:
        print(colorize(f"     📄 {tool_input['path']}", Colors.DIM))
    elif "pattern" in tool_input:
        print(colorize(f"     🔍 {tool_input['pattern']}", Colors.DIM))
    elif "url" in tool_input:
        print(colorize(f"     🌐 {tool_input['url']}", Colors.DIM))


def print_tool_result(result: str, is_error: bool = False) -> None:
    """Print a formatted tool result (truncated if long)."""
    max_lines = 10
    lines = result.split("\n")

    if is_error:
        print(colorize("     ❌ Error:", Colors.RED))
        color = Colors.RED
    else:
        color = Colors.DIM

    for i, line in enumerate(lines[:max_lines]):
        truncated_line = line[:100] + "..." if len(line) > 100 else line
        print(colorize(f"     {truncated_line}", color))

    if len(lines) > max_lines:
        print(colorize(f"     ... ({len(lines) - max_lines} more lines)", Colors.DIM))


def print_assistant_text(text: str) -> None:
    """Print assistant's text output."""
    for line in text.split("\n"):
        if line.strip():
            print(colorize(f"  {line}", Colors.WHITE))
        else:
            print()


def process_stream_json(line: str, state: dict, debug: bool = False, activity_log: ActivityLog = None, iteration: int = 0) -> None:
    """Process a single line of stream-json output."""
    if not line.strip():
        return

    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        # Not JSON - print it as it might be an error message or debug output
        stripped = line.strip()
        if stripped:
            print(colorize(f"  {stripped}", Colors.DIM))
            sys.stdout.flush()
        return

    event_type = data.get("type", "")

    # Debug: show all event types and data we receive
    if debug:
        data_str = json.dumps(data)[:200]
        print(colorize(f"  [DEBUG] {event_type}: {data_str}", Colors.DIM))
        sys.stdout.flush()

    # Claude CLI stream-json format
    if event_type == "system":
        subtype = data.get("subtype", "")
        if subtype == "init" and debug:
            tools = data.get("tools", [])
            print(colorize(f"  📋 Session started with {len(tools)} tools", Colors.CYAN))
            sys.stdout.flush()

    elif event_type == "assistant":
        message = data.get("message", {})
        content = message.get("content", [])

        for block in content:
            block_type = block.get("type", "")

            if block_type == "text":
                text = block.get("text", "")
                if text and text not in state.get("seen_text", set()):
                    state.setdefault("seen_text", set()).add(text)
                    state["accumulated_text"] = state.get("accumulated_text", "") + text

                    # Check for completion markers
                    accumulated = state["accumulated_text"]
                    if "RALPH_COMPLETE" in accumulated or "<promise>COMPLETE</promise>" in accumulated:
                        state["complete"] = True

                    print(colorize(text, Colors.WHITE))
                    sys.stdout.flush()

            elif block_type == "tool_use":
                tool_name = block.get("name", "unknown")
                tool_input = block.get("input", {})
                tool_id = block.get("id", "")

                if tool_id and tool_id not in state.get("seen_tools", set()):
                    state.setdefault("seen_tools", set()).add(tool_id)
                    print()
                    print_tool_call(tool_name, tool_input)
                    # Log tool call to activity log
                    if activity_log:
                        activity_log.add_tool_call(iteration, tool_name, tool_input)
                    sys.stdout.flush()

    elif event_type == "user":
        message = data.get("message", {})
        content = message.get("content", [])

        for block in content:
            if block.get("type") == "tool_result":
                tool_id = block.get("tool_use_id", "")
                result_content = block.get("content", "")
                is_error = block.get("is_error", False)

                if tool_id and tool_id not in state.get("seen_results", set()):
                    state.setdefault("seen_results", set()).add(tool_id)
                    if is_error:
                        truncated = result_content[:100] + "..." if len(result_content) > 100 else result_content
                        print(colorize(f"     ❌ {truncated}", Colors.RED))
                        # Log error to activity log
                        if activity_log:
                            activity_log.add_error(iteration, truncated)
                    elif debug:
                        truncated = result_content[:80] + "..." if len(result_content) > 80 else result_content
                        print(colorize(f"     ✓ {truncated}", Colors.DIM))
                    sys.stdout.flush()

    elif event_type == "result":
        cost = data.get("cost_usd")
        duration = data.get("duration_ms")
        tokens_in = data.get("total_input_tokens")
        tokens_out = data.get("total_output_tokens")

        print()
        stats = []
        if cost is not None:
            stats.append(f"💰 ${cost:.4f}")
            state["total_cost"] = state.get("total_cost", 0) + cost
        if duration is not None:
            stats.append(f"⏱️  {duration/1000:.1f}s")
            state["total_duration"] = state.get("total_duration", 0) + duration
        if tokens_in is not None and tokens_out is not None:
            stats.append(f"📊 {tokens_in}→{tokens_out} tokens")
            state["total_tokens_in"] = state.get("total_tokens_in", 0) + tokens_in
            state["total_tokens_out"] = state.get("total_tokens_out", 0) + tokens_out

        # Log stats to activity log
        if activity_log:
            activity_log.add_stats(iteration, cost or 0, duration or 0, tokens_in or 0, tokens_out or 0)

        if stats:
            print(colorize(f"  {' | '.join(stats)}", Colors.MAGENTA))
        sys.stdout.flush()

    elif event_type == "error":
        error = data.get("error", {})
        error_msg = error.get("message", str(error))
        print()
        print(colorize(f"  ❌ Error: {error_msg}", Colors.RED, Colors.BOLD))
        # Log error to activity log
        if activity_log:
            activity_log.add_error(iteration, error_msg)
        sys.stdout.flush()


def run_iteration(
    iteration: int,
    total: int,
    prompt: str,
    verbose: bool = False,
    global_state: dict = None,
    activity_log: ActivityLog = None
) -> Tuple[bool, bool]:
    """Run a single Claude iteration.

    Returns:
        Tuple of (success, complete) where complete indicates RALPH_COMPLETE was found.
    """
    print_header(iteration, total)
    sys.stdout.flush()

    # Log iteration start
    if activity_log:
        activity_log.add_iteration_start(iteration, total)

    cmd = [
        "claude",
        "-p", prompt,
        "--output-format", "stream-json",
        "--verbose",
        "--dangerously-skip-permissions",
        "--max-turns", "50",
        "--teammate-mode", "in-process",
    ]

    state = {
        "current_tool": None,
        "current_tool_input": "",
        "accumulated_text": "",
        "complete": False,
    }

    process = None
    try:
        # Set CLAUDE_CODE_SILENT=1 to suppress Claude Code notification hooks
        # Ralph has its own notification system, so we don't want duplicates
        env = os.environ.copy()
        env["CLAUDE_CODE_SILENT"] = "1"

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
        )

        for line in process.stdout:
            process_stream_json(line, state, debug=verbose, activity_log=activity_log, iteration=iteration)

        return_code = process.wait()

        # Accumulate stats to global state
        if global_state is not None:
            for key in ["total_cost", "total_duration", "total_tokens_in", "total_tokens_out"]:
                if key in state:
                    global_state[key] = global_state.get(key, 0) + state[key]

        success = return_code == 0
        complete = state.get("complete", False)

        # Log iteration summary (assistant's text output) and end
        if activity_log:
            accumulated = state.get("accumulated_text", "")
            if accumulated:
                activity_log.add_iteration_summary(iteration, accumulated)
            activity_log.add_iteration_end(iteration, success, complete)

        print_footer(iteration, success)
        sys.stdout.flush()

        return success, complete

    except KeyboardInterrupt:
        print()
        print(colorize("  ⚠️  Interrupted by user", Colors.YELLOW, Colors.BOLD))
        if process:
            process.terminate()
        # Log iteration end (interrupted)
        if activity_log:
            activity_log.add_iteration_end(iteration, False, False)
        return False, False
    except Exception as e:
        print(colorize(f"  ❌ Error running Claude: {e}", Colors.RED, Colors.BOLD))
        sys.stdout.flush()
        # Log error and iteration end
        if activity_log:
            activity_log.add_error(iteration, str(e))
            activity_log.add_iteration_end(iteration, False, False)
        return False, False


def print_banner(iterations: int, prompt_file: str) -> None:
    """Print startup banner."""
    print()
    print(colorize("╔══════════════════════════════════════════════════════════╗", Colors.BLUE, Colors.BOLD))
    print(colorize("║           🤖 Ralph Loop Runner v2                        ║", Colors.BLUE, Colors.BOLD))
    print(colorize("╠══════════════════════════════════════════════════════════╣", Colors.BLUE, Colors.BOLD))
    print(colorize(f"║  Iterations: {iterations:<45}║", Colors.BLUE))
    print(colorize(f"║  Prompt:     {prompt_file:<45}║", Colors.BLUE))
    print(colorize(f"║  Started:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<45}║", Colors.BLUE))
    print(colorize("╚══════════════════════════════════════════════════════════╝", Colors.BLUE, Colors.BOLD))


def print_summary(completed: int, failed: int, early_complete: bool, global_state: dict) -> None:
    """Print final summary."""
    print()
    print(colorize("╔══════════════════════════════════════════════════════════╗", Colors.BLUE, Colors.BOLD))
    print(colorize("║                    📊 Summary                            ║", Colors.BLUE, Colors.BOLD))
    print(colorize("╠══════════════════════════════════════════════════════════╣", Colors.BLUE, Colors.BOLD))
    print(colorize(f"║  Total iterations:  {completed + failed:<38}║", Colors.BLUE))

    completed_str = f"{completed} ✓"
    failed_str = f"{failed} ✗"
    print(colorize(f"║  Completed:         {completed_str:<38}║", Colors.GREEN if completed > 0 else Colors.BLUE))
    print(colorize(f"║  Failed:            {failed_str:<38}║", Colors.RED if failed > 0 else Colors.BLUE))

    if early_complete:
        print(colorize(f"║  Status:            {'🎉 RALPH_COMPLETE detected!':<38}║", Colors.GREEN))

    # Show accumulated stats
    if global_state.get("total_cost"):
        cost_str = f"${global_state['total_cost']:.4f}"
        print(colorize(f"║  Total cost:        {cost_str:<38}║", Colors.MAGENTA))

    if global_state.get("total_duration"):
        duration_mins = global_state["total_duration"] / 1000 / 60
        duration_str = f"{duration_mins:.1f} minutes"
        print(colorize(f"║  Total duration:    {duration_str:<38}║", Colors.MAGENTA))

    if global_state.get("total_tokens_in") and global_state.get("total_tokens_out"):
        tokens_str = f"{global_state['total_tokens_in']:,} in / {global_state['total_tokens_out']:,} out"
        print(colorize(f"║  Total tokens:      {tokens_str:<38}║", Colors.MAGENTA))

    print(colorize(f"║  Finished at:       {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<38}║", Colors.BLUE))
    print(colorize("╚══════════════════════════════════════════════════════════╝", Colors.BLUE, Colors.BOLD))
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Ralph Loop Runner v2 - Run Claude CLI iterations with enhanced output",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python ralph_v2.py 5                              # Run 5 iterations
    python ralph_v2.py 10 --prompt-file PROMPT.md    # Use custom prompt file
    python ralph_v2.py 30 --stop-on-complete         # Stop on RALPH_COMPLETE
    python ralph_v2.py 3 --verbose                   # Show verbose output
        """,
    )

    parser.add_argument(
        "iterations",
        type=int,
        help="Number of iterations to run",
    )

    parser.add_argument(
        "--prompt-file", "-p",
        type=str,
        default="PROMPT.md",
        help="Path to the prompt file (default: PROMPT.md)",
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show verbose/debug output",
    )

    parser.add_argument(
        "--stop-on-complete", "-s",
        action="store_true",
        default=True,
        help="Stop when RALPH_COMPLETE is detected (default: True)",
    )

    parser.add_argument(
        "--no-stop-on-complete",
        action="store_true",
        help="Don't stop when RALPH_COMPLETE is detected",
    )

    parser.add_argument(
        "--activity-log", "-a",
        type=str,
        default="activity.md",
        help="Path to the activity log file (default: activity.md)",
    )

    parser.add_argument(
        "--workdir", "-w",
        type=str,
        default=None,
        help="Working directory to run in (default: project root derived from script location)",
    )

    args = parser.parse_args()

    # Handle stop-on-complete logic
    stop_on_complete = args.stop_on_complete and not args.no_stop_on_complete

    # Change to working directory
    if args.workdir:
        project_root = Path(args.workdir).resolve()
    else:
        # Default: project root (parent of scripts/ralph/)
        script_dir = Path(__file__).parent
        project_root = script_dir.parent.parent
    os.chdir(project_root)

    # Validate prompt file
    prompt_file = Path(args.prompt_file)
    if not prompt_file.exists():
        print(colorize(f"Error: Prompt file '{prompt_file}' not found", Colors.RED, Colors.BOLD))
        print(colorize(f"  Create it from the example:", Colors.YELLOW))
        print(colorize(f"  cp scripts/ralph/PROMPT.md.example PROMPT.md", Colors.DIM))
        sys.exit(1)

    prompt = prompt_file.read_text()

    # Print startup banner
    print_banner(args.iterations, args.prompt_file)

    # Create activity log
    activity_log_path = project_root / args.activity_log
    activity_log = ActivityLog(activity_log_path)

    # Create silent mode flag file to suppress Claude Code notification hooks
    # This is more reliable than environment variables which may not be inherited by hooks
    silent_flag_file = Path("/tmp/.claude_code_silent")
    silent_flag_file.touch()

    # Run iterations
    completed = 0
    failed = 0
    early_complete = False
    global_state = {}

    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        print()
        print(colorize("\n⚠️  Stopping Ralph Loop...", Colors.YELLOW, Colors.BOLD))
        # Write activity log before exiting
        activity_log.write(completed, failed, early_complete, global_state)
        print(colorize(f"📝 Activity log written to: {activity_log_path}", Colors.CYAN))
        # Remove silent flag file before sending notification
        silent_flag_file.unlink(missing_ok=True)
        send_macos_notification(
            "Ralph Loop Interrupted ⚠️",
            f"Stopped after {completed + failed} iterations. Cost: ${global_state.get('total_cost', 0):.2f}"
        )
        sys.exit(130)

    signal.signal(signal.SIGINT, signal_handler)

    for i in range(1, args.iterations + 1):
        success, is_complete = run_iteration(
            i,
            args.iterations,
            prompt,
            verbose=args.verbose,
            global_state=global_state,
            activity_log=activity_log
        )

        if success:
            completed += 1
        else:
            failed += 1

        # Write activity log after each iteration (so progress is saved continuously)
        activity_log.write(completed, failed, early_complete, global_state)

        # Check for early completion
        if is_complete and stop_on_complete:
            print()
            print(colorize("🎉 RALPH_COMPLETE detected! All tasks done.", Colors.GREEN, Colors.BOLD))
            early_complete = True
            # Write final activity log with early_complete flag
            activity_log.write(completed, failed, early_complete, global_state)
            # Remove silent flag file before sending notification
            silent_flag_file.unlink(missing_ok=True)
            send_macos_notification(
                "Ralph Loop Complete 🎉",
                f"RALPH_COMPLETE detected after {i} iterations. Cost: ${global_state.get('total_cost', 0):.2f}"
            )
            break

    # Write activity log
    activity_log.write(completed, failed, early_complete, global_state)
    print(colorize(f"📝 Activity log written to: {activity_log_path}", Colors.CYAN))

    # Print summary
    print_summary(completed, failed, early_complete, global_state)
    sys.stdout.flush()

    # Remove silent flag file before sending notification
    silent_flag_file.unlink(missing_ok=True)

    # Send notification for normal completion (if not already sent for early completion)
    if not early_complete:
        status = "completed" if failed == 0 else f"finished with {failed} failures"
        send_macos_notification(
            "Ralph Loop Finished",
            f"{completed + failed} iterations {status}. Cost: ${global_state.get('total_cost', 0):.2f}"
        )

    # Exit with appropriate code
    exit_code = 1 if failed > 0 and not early_complete else 0
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
