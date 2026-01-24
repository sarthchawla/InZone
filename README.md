# InZone

A Trello-like todo board application with customizable boards and swimlanes.

See the full [Product Requirements Document](.claude/plans/inzone-prd.md) for details.

## Ralph Loop - Autonomous Development

This project uses **Ralph** (`ralph.sh`) for autonomous, PRD-driven development. Ralph runs Claude Code in a loop, working through the PRD checklist item by item.

### How the Ralph Loop Works

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

### Key Components

| File | Purpose |
|------|---------|
| `ralph.sh` | The loop orchestrator - runs Claude repeatedly |
| `PROMPT.md` | Instructions Claude reads each iteration (you create this) |
| `activity.md` | Auto-generated log of all iterations |
| `.claude/plans/inzone-prd.md` | The PRD with checklist items to implement |

### Setup

1. **Create your PROMPT.md** from the example:
   ```bash
   cp PROMPT.md.example PROMPT.md
   ```

2. **Review the PRD** to understand what will be built:
   ```bash
   cat .claude/plans/inzone-prd.md
   ```

3. **Run Ralph** (inside devcontainer for safety):
   ```bash
   ./ralph.sh [max_iterations] [completion_phrase]

   # Examples:
   ./ralph.sh              # Default: 10 iterations, "RALPH_COMPLETE"
   ./ralph.sh 20           # 20 iterations max
   ./ralph.sh 50 DONE      # 50 iterations, look for "DONE"
   ```

### The PROMPT.md Pattern

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

### PRD Checklist Format

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

### Safety: Devcontainer Isolation

Ralph uses `--dangerously-skip-permissions` which is only safe inside the devcontainer:

- The devcontainer has **firewall isolation** blocking external network access
- Claude can only modify files within the project
- Use `docker compose` to run in isolation

**Never run `ralph.sh` directly on your host machine with skip-permissions.**

### Monitoring Progress

While Ralph runs:
```bash
# Watch the activity log
tail -f activity.md

# Check PRD progress
grep -E "^\s*- \[(x| )\]" .claude/plans/inzone-prd.md

# See git commits
git log --oneline
```

### Customizing the Loop

**Different completion phrases:**
```bash
./ralph.sh 10 "ALL_TASKS_DONE"
```

**Different PRD file:** Edit your `PROMPT.md` to point to a different PRD.

**Scope to specific phase:** Modify `PROMPT.md` to focus on a specific section:
```markdown
Focus ONLY on "Phase 2: Polish" items in the PRD.
Ignore Phase 1 even if items are unchecked.
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "PROMPT.md not found" | Create it: `cp PROMPT.md.example PROMPT.md` |
| Loop never completes | Check if Claude is outputting the completion phrase |
| Same task repeated | Ensure Claude is updating the PRD checkboxes |
| Errors in activity.md | Review the log to see what went wrong |

---

## Manual Development

If not using Ralph, follow the Quick Start in the [PRD](.claude/plans/inzone-prd.md#quick-start-after-implementation).
