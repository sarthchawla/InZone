---
name: worktree-list
description: List all active git worktrees with their port configurations
arguments: []
---

# Worktree List Command

This command displays all registered worktrees with their port allocations, status, and last access time.

## Behavior

Execute the list worktrees command and format the output:

```bash
pnpm worktree:list
```

For verbose output with more details:

```bash
pnpm worktree:list --verbose
```

## Output Formatting

Present the results as a formatted table:

**Active Worktrees**

| ID           | Branch          | Ports (F/B/D)      | Status | Last Access |
|--------------|-----------------|--------------------| -------|-------------|
| feature-auth | feature/auth    | 5174/3002/7433     | active | 2h ago      |
| bugfix-123   | bugfix/123      | 5175/3003/7434     | active | 3d ago      |

Include the legend:
- ● active - Worktree is currently running
- ○ stopped - Worktree exists but database is not running
- ✗ error - Worktree has an issue (path missing, etc.)

## Empty Registry

If no worktrees are registered, show:

"No worktrees registered yet. Create a new worktree with `/worktree`"

## Related Commands

Mention these related commands:
- `/worktree` - Create a new worktree
- `/worktree-cleanup <id>` - Remove a specific worktree
- `/worktree-cleanup-bulk` - Remove multiple worktrees
- `/worktree-sync` - Sync registry with filesystem

## Example Output

```
User: /worktree-list

Claude: Here are your active worktrees:

| ID           | Branch              | Ports (F/B/D)      | Status | Last Access |
|--------------|---------------------|--------------------|--------|-------------|
| feature-auth | feature/auth        | 5174/3002/7433     | active | 2 hours ago |
| bugfix-123   | bugfix/issue-123    | 5175/3003/7434     | active | 3 days ago  |

Total: 2 worktrees

Legend:
● active - Database container running
○ stopped - Database container not running
✗ error - Has issues

Related commands:
- /worktree - Create a new worktree
- /worktree-cleanup <id> - Remove a worktree
```
