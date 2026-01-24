# Ralph Loop - Autonomous Development

This project uses **Ralph** for autonomous, PRD-driven development. Ralph runs Claude Code in a loop, working through the PRD checklist item by item.

## Available Versions

| Version | File | Description |
|---------|------|-------------|
| **v1 (Bash)** | `scripts/ralph/ralph.sh` | Simple bash script, logs to activity.md |
| **v2 (Python)** | `scripts/ralph/ralph_v2.py` | Enhanced with colors, real-time streaming, statistics |

> **Recommended**: Use `ralph_v2.py` for better visibility and cost tracking.

## How the Ralph Loop Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         RALPH LOOP                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │  PROMPT.md   │────▶│ Claude Code  │────▶│  activity.md │   │
│   │  (static)    │     │  (1 run)     │     │  (log)       │   │
│   └──────────────┘     └──────┬───────┘     └──────────────┘   │
│                               │                                  │
│                               ▼                                  │
│                    ┌──────────────────┐                         │
│                    │  Read PRD        │                         │
│                    │  Find next [ ]   │                         │
│                    │  Implement it    │                         │
│                    │  Mark as [x]     │                         │
│                    │  Commit          │                         │
│                    └────────┬─────────┘                         │
│                             │                                    │
│              ┌──────────────┴──────────────┐                    │
│              ▼                             ▼                    │
│     ┌────────────────┐           ┌────────────────┐            │
│     │ More tasks?    │           │ All done?      │            │
│     │ Loop again     │           │ RALPH_COMPLETE │            │
│     └────────────────┘           └────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

| File | Purpose |
|------|---------|
| `scripts/ralph/ralph.sh` | The loop orchestrator v1 (bash) |
| `scripts/ralph/ralph_v2.py` | The loop orchestrator v2 (python, enhanced) |
| `PROMPT.md` | Instructions Claude reads each iteration (create in project root) |
| `activity.md` | Auto-generated log of all iterations (v1 only) |
| `.claude/plans/inzone-prd.md` | The PRD with checklist items to implement |

## Setup

1. **Create your PROMPT.md** from the example:
   ```bash
   cp scripts/ralph/PROMPT.md.example PROMPT.md
   ```

2. **Review the PRD** to understand what will be built:
   ```bash
   cat .claude/plans/inzone-prd.md
   ```

3. **Run Ralph** (inside devcontainer for safety):

   **Using v2 (Python) - Recommended:**
   ```bash
   python scripts/ralph/ralph_v2.py [iterations] [options]

   # Examples:
   python scripts/ralph/ralph_v2.py 30                    # 30 iterations, auto-stop on RALPH_COMPLETE
   python scripts/ralph/ralph_v2.py 30 --verbose          # With debug output
   python scripts/ralph/ralph_v2.py 50 --no-stop-on-complete  # Run all 50 iterations
   python scripts/ralph/ralph_v2.py 10 -p custom.md       # Use custom prompt file
   ```

   **Using v1 (Bash):**
   ```bash
   ./scripts/ralph/ralph.sh [max_iterations] [completion_phrase]

   # Examples:
   ./scripts/ralph/ralph.sh              # Default: 10 iterations, "RALPH_COMPLETE"
   ./scripts/ralph/ralph.sh 20           # 20 iterations max
   ./scripts/ralph/ralph.sh 50 DONE      # 50 iterations, look for "DONE"
   ```

## The PROMPT.md Pattern

The `PROMPT.md` tells Claude what to do each iteration. For PRD-driven development:

```markdown
# Instructions for Claude

1. Read the PRD at `.claude/plans/inzone-prd.md`
2. Look at Section 11 "Feature Roadmap" > "Phase 1: MVP"
3. Find the first unchecked `[ ]` item
4. Implement that ONE item
5. Mark it as `[x]` in the PRD
6. Commit your changes

If ALL items are `[x]`, output: RALPH_COMPLETE
```

## PRD Checklist Format

The PRD uses markdown checkboxes that Ralph tracks:

```markdown
### Phase 1: MVP (Current Focus)
- [x] PRD and architecture design
- [ ] Project scaffolding (monorepo setup)    ← Claude works on this
- [ ] Database schema and migrations
- [ ] Backend API (boards, columns, todos)
- [ ] Frontend board view with drag-and-drop
...
```

Each iteration:
1. Claude reads the PRD
2. Finds the first `[ ]` item
3. Implements it
4. Changes `[ ]` to `[x]`
5. Commits the work
6. Ralph starts the next iteration

## Safety: Devcontainer Isolation

Ralph uses `--dangerously-skip-permissions` which is only safe inside the devcontainer:

- The devcontainer has **firewall isolation** blocking external network access
- Claude can only modify files within the project
- Use `docker compose` to run in isolation

**Never run `ralph.sh` directly on your host machine with skip-permissions.**

## Monitoring Progress

While Ralph runs:
```bash
# Watch the activity log
tail -f activity.md

# Check PRD progress
grep -E "^\s*- \[(x| )\]" .claude/plans/inzone-prd.md

# See git commits
git log --oneline
```

## Customizing the Loop

**Different completion phrases:**
```bash
./scripts/ralph/ralph.sh 10 "ALL_TASKS_DONE"
```

**Different PRD file:** Edit your `PROMPT.md` to point to a different PRD.

**Scope to specific phase:** Modify `PROMPT.md` to focus on a specific section:
```markdown
Focus ONLY on "Phase 2: Polish" items in the PRD.
Ignore Phase 1 even if items are unchecked.
```

## Ralph v2 Features

The Python version (`ralph_v2.py`) provides enhanced functionality:

### Real-time Output
- **Color-coded terminal output** - Easy to scan for errors, successes, and tool calls
- **Tool call visualization** - See which tools Claude is using (🔧 Bash, 📄 Read, etc.)
- **Streaming JSON parsing** - Real-time output as Claude works

### Statistics Tracking
- **Cost tracking** - See cost per iteration and total session cost
- **Token usage** - Input/output tokens per iteration
- **Duration** - Time spent per iteration and total

### Smart Completion
- **Auto-stop on RALPH_COMPLETE** - Stops early when all tasks are done
- **Graceful Ctrl+C handling** - Clean shutdown on interrupt

### Example Output
```
╔══════════════════════════════════════════════════════════╗
║           🤖 Ralph Loop Runner v2                        ║
╠══════════════════════════════════════════════════════════╣
║  Iterations: 30                                          ║
║  Prompt:     PROMPT.md                                   ║
║  Started:    2025-01-25 10:30:00                        ║
╚══════════════════════════════════════════════════════════╝

════════════════════════════════════════════════════════════
║                    Iteration 1/30                        ║
║               Started at 10:30:05                        ║
════════════════════════════════════════════════════════════

  🔧 Read
     📄 .claude/plans/inzone-prd.md

  🔧 Bash
     $ pnpm install playwright @cucumber/cucumber

  💰 $0.0234 | ⏱️  45.2s | 📊 12500→3200 tokens

── End of iteration 1 at 10:30:50 ✓ Completed ──
```

### Command Line Options

```bash
python scripts/ralph/ralph_v2.py --help

Options:
  iterations              Number of iterations to run (required)
  --prompt-file, -p      Path to prompt file (default: PROMPT.md)
  --verbose, -v          Show debug output including all tool results
  --stop-on-complete, -s Stop when RALPH_COMPLETE detected (default: True)
  --no-stop-on-complete  Run all iterations regardless of completion
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "PROMPT.md not found" | Create it: `cp scripts/ralph/PROMPT.md.example PROMPT.md` |
| Loop never completes | Check if Claude is outputting the completion phrase |
| Same task repeated | Ensure Claude is updating the PRD checkboxes |
| Errors in activity.md | Review the log to see what went wrong (v1) |
| No color output | Ensure terminal supports ANSI colors (v2) |
| Python not found | Use `python3` instead of `python` |
