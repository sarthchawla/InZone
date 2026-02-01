---
name: worktree-cleanup-bulk
description: Remove multiple worktrees at once with interactive selection
arguments:
  - name: mode
    description: Selection mode - "all", "stale", or "select" (interactive)
    required: false
  - name: days
    description: For stale mode - number of days of inactivity
    required: false
---

# Worktree Bulk Cleanup Command

This command removes multiple git worktrees at once, freeing their associated resources including Docker containers, volumes, and allocated ports.

## Behavior

Follow these steps to bulk cleanup worktrees:

### Step 1: List Current Worktrees

First, get the list of current worktrees by running:

```bash
pnpm worktree:list
```

If no worktrees exist, inform the user: "No worktrees registered. Nothing to clean up."

### Step 2: Determine Selection Mode

Based on the `mode` argument or user interaction:

**If `mode` is "all":**
- Proceed to remove all worktrees (with confirmation)

**If `mode` is "stale":**
- Use the `days` argument (default to 30 if not provided)
- Remove worktrees not accessed in that many days

**If `mode` is "select" or not provided:**
- Show the user a numbered list of worktrees
- Ask them to select which to remove using options like:
  - Numbers (e.g., "1,3" or "1-3")
  - "stale" - Remove all inactive > 30 days
  - "all" - Remove all worktrees
  - "cancel" - Exit without changes

### Step 3: Confirm Selection

Before executing cleanup, show the user what will be removed:

- Number of worktrees to remove
- List of worktree IDs and branches
- Ports that will be freed (frontend, backend, database)
- Docker containers that will be stopped

Ask for confirmation: "Do you want to proceed with removing these worktrees?"

### Step 4: Execute Cleanup Command

Based on user selection, run the appropriate command:

**Remove all:**
```bash
pnpm worktree:cleanup-bulk --all --force
```

**Remove stale (N days):**
```bash
pnpm worktree:cleanup-bulk --stale $DAYS --force
```

**Interactive selection:**
```bash
pnpm worktree:cleanup-bulk
```

**Preview only (dry run):**
```bash
pnpm worktree:cleanup-bulk --dry-run
```

### Step 5: Report Results

After successful cleanup, format the output as:

**Bulk Cleanup Complete!**

| Metric           | Value                       |
|------------------|-----------------------------|
| Removed          | X worktrees                 |
| Frontend ports   | [ports] freed               |
| Backend ports    | [ports] freed               |
| Database ports   | [ports] freed               |
| Remaining        | Y worktrees                 |

### Error Handling

- **No worktrees found**: Registry is empty, nothing to clean
- **Partial success**: Some worktrees removed, others failed - show details
- **Docker errors**: Some containers may already be removed

## Examples

**Interactive mode (no arguments):**
```
User: /worktree-cleanup-bulk

Claude: Here are your current worktrees:

| # | ID           | Branch              | Ports (F/B/D)      | Last Accessed |
|---|--------------|---------------------|--------------------|---------------|
| 1 | feature-auth | feature/auth        | 5174/3002/7433     | 2 days ago    |
| 2 | bugfix-123   | bugfix/123          | 5175/3003/7434     | 15 days ago   |
| 3 | feature-old  | feature/old         | 5176/3004/7435     | 45 days ago   |

How would you like to select worktrees to remove?
- Enter numbers (e.g., "2,3" or "1-3")
- "stale" - Remove all inactive > 30 days
- "all" - Remove all worktrees
- "cancel" - Exit

User: 2,3

Claude: You've selected 2 worktrees to remove:
- bugfix-123 (bugfix/123)
- feature-old (feature/old)

This will free ports: 5175, 5176, 3003, 3004, 7434, 7435

Proceed with removal?

User: Yes

Claude: Removing 2 worktrees...

Bulk Cleanup Complete!
- Removed: 2 worktrees
- Freed ports: 5175, 5176, 3003, 3004, 7434, 7435
- Remaining: 1 worktree
```

**Remove stale worktrees:**
```
User: /worktree-cleanup-bulk stale 30

Claude: Found 1 worktree inactive for more than 30 days:

| ID           | Branch          | Last Accessed |
|--------------|-----------------|---------------|
| feature-old  | feature/old     | 45 days ago   |

Proceed with removal?
...
```

**Remove all worktrees:**
```
User: /worktree-cleanup-bulk all

Claude: WARNING: This will remove ALL 3 registered worktrees.

| ID           | Branch              | Ports (F/B/D)      |
|--------------|---------------------|--------------------|
| feature-auth | feature/auth        | 5174/3002/7433     |
| bugfix-123   | bugfix/123          | 5175/3003/7434     |
| feature-old  | feature/old         | 5176/3004/7435     |

Are you sure you want to remove all worktrees?
...
```

**Dry run (preview):**
```
User: I want to see what would be removed without actually removing anything

Claude: Let me show you a preview...

[runs pnpm worktree:cleanup-bulk --dry-run]

Preview complete. No changes were made.
```

## Related Commands

- `/worktree` - Create a new worktree
- `/worktree-list` - List all worktrees
- `/worktree-cleanup <id>` - Remove a single worktree
- `/worktree-sync` - Sync registry with filesystem (remove orphaned entries)
