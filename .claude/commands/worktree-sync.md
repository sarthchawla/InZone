---
name: worktree-sync
description: Sync the worktree registry with the actual filesystem (remove orphaned entries)
arguments:
  - name: mode
    description: Operation mode - "dry-run" to preview without changes
    required: false
---

# Worktree Registry Sync Command

This command synchronizes the worktree registry with the actual filesystem. It identifies and removes orphaned registry entries - entries for worktrees that no longer exist on disk or are not recognized by git.

Use this command when:
- You manually deleted a worktree directory
- You used `git worktree remove` directly instead of `/worktree-cleanup`
- The registry seems out of sync with actual worktrees
- You want to free up port allocations from defunct worktrees

## Behavior

Follow these steps to sync the registry:

### Step 1: Run Registry Scan

Execute the sync command in dry-run mode first to see what would be cleaned:

```bash
pnpm worktree:sync --dry-run --verbose
```

### Step 2: Present Report to User

Show the user the sync report in a formatted way:

**Registry Sync Report**

| Category          | Count |
|-------------------|-------|
| Valid worktrees   | X     |
| Orphaned entries  | Y     |
| Stale containers  | Z     |

If orphaned entries are found, show them in a table:

| ID           | Branch              | Ports              | Reason                    |
|--------------|---------------------|--------------------|---------------------------|
| feature-old  | feature/old-feature | 5175/3003/7434     | Path does not exist       |
| bugfix-gone  | bugfix/deleted      | 5176/3004/7435     | Not in git worktree list  |

If stale containers are found, list them:
- inzone-db-wt-feature-old
- inzone-db-wt-bugfix-gone

### Step 3: Handle User Decision

**If `mode` is "dry-run":**
- Only show the report, don't make any changes
- Inform user: "Dry run complete. No changes were made."

**If no issues found:**
- Report: "All worktrees are valid. No cleanup needed."
- Exit without prompting

**If issues found and not in dry-run mode:**
Ask the user what to do:
- "Clean" - Remove orphaned entries and free ports
- "Cancel" - Keep registry as-is

### Step 4: Execute Cleanup

If user chooses to clean, run:

```bash
pnpm worktree:sync --force
```

### Step 5: Report Results

After cleanup, format the output as:

**Cleanup Complete!**

| Action                    | Result                          |
|---------------------------|---------------------------------|
| Orphaned entries removed  | X                               |
| Stale containers stopped  | Y                               |
| Ports freed               | 5175, 5176, 3003, 3004, ...     |
| Remaining valid worktrees | Z                               |

### Error Handling

- **Registry not found**: No worktrees have been created yet
- **Registry error**: Registry file corrupted - suggest creating new worktree to initialize
- **Docker errors**: Some containers may already be removed

## Examples

**Standard sync (interactive):**
```
User: /worktree-sync

Claude: Scanning registry for orphaned entries...

Registry Sync Report
════════════════════

| Category          | Count |
|-------------------|-------|
| Valid worktrees   | 2     |
| Orphaned entries  | 2     |
| Stale containers  | 1     |

Orphaned entries found:

| ID           | Branch              | Ports              | Reason                    |
|--------------|---------------------|--------------------|---------------------------|
| feature-old  | feature/old-feature | 5175/3003/7434     | Path does not exist       |
| bugfix-gone  | bugfix/deleted      | 5176/3004/7435     | Not in git worktree list  |

Stale containers found:
- inzone-db-wt-feature-old

Would you like to clean up these orphaned entries?
- Clean - Remove orphaned entries and free ports
- Cancel - Keep registry as-is

User: Clean

Claude: Cleaning up orphaned entries...

Cleanup Complete!
- Removed 2 orphaned registry entries
- Stopped 1 stale container
- Freed ports: 5175, 5176, 3003, 3004, 7434, 7435
- Remaining worktrees: 2
```

**Dry run (preview only):**
```
User: /worktree-sync dry-run

Claude: Running registry sync in preview mode...

Registry Sync Report
════════════════════

Valid worktrees: 2
Orphaned entries: 1

Orphaned entries:

| ID           | Branch          | Ports              | Reason              |
|--------------|-----------------|--------------------| --------------------|
| feature-old  | feature/old     | 5175/3003/7434     | Path does not exist |

Dry run complete. No changes were made.

To clean up these entries, run `/worktree-sync` without the dry-run option.
```

**All valid (no issues):**
```
User: /worktree-sync

Claude: Scanning registry for orphaned entries...

Registry Sync Report
════════════════════

Valid worktrees: 3
Orphaned entries: 0
Stale containers: 0

All worktrees are valid. No cleanup needed.
```

**Empty registry:**
```
User: /worktree-sync

Claude: Scanning registry...

No worktrees registered yet.

To create a new worktree, use `/worktree`.
```

## When to Use This Command

Use `/worktree-sync` when:

1. **Manual cleanup was done** - You deleted a worktree directory manually or used `git worktree remove` directly
2. **Registry seems stale** - `/worktree-list` shows worktrees that no longer exist
3. **Port conflicts** - You're getting port allocation errors but believe ports should be free
4. **After system crash** - Container or worktree state may be inconsistent
5. **Periodic maintenance** - Run occasionally to keep registry clean

## Related Commands

- `/worktree` - Create a new worktree
- `/worktree-list` - List all worktrees
- `/worktree-cleanup <id>` - Remove a single worktree (preferred method)
- `/worktree-cleanup-bulk` - Remove multiple worktrees at once
