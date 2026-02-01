---
name: worktree-cleanup
description: Remove a single worktree and free its resources
arguments:
  - name: target
    description: Branch name (e.g., feature/auth) or worktree ID (e.g., feature-auth)
    required: false
---

# Worktree Cleanup Command

This command removes a single git worktree and frees all its associated resources including Docker containers, volumes, and allocated ports.

## Behavior

Follow these steps to clean up a worktree:

### Step 1: Identify Worktree to Remove

If the `target` argument is not provided or is empty, first list available worktrees by running:

```bash
pnpm worktree:list
```

Then ask the user which worktree to remove, showing them the list with IDs and branches.

### Step 2: Confirm Cleanup

Before executing cleanup, confirm with the user what will be removed:

- Git worktree directory
- Docker database container
- Docker volume (database data)
- Registry entry (frees allocated ports)

Note: The git branch is NOT deleted by default. The user can delete it manually if needed.

### Step 3: Execute Cleanup Command

Run the cleanup command:

```bash
pnpm worktree:cleanup "$TARGET"
```

If user wants to skip confirmation, add `--force`:

```bash
pnpm worktree:cleanup --force "$TARGET"
```

Replace `$TARGET` with the worktree ID or branch name.

### Step 4: Report Results

After successful cleanup, format the output as:

**Worktree Cleanup Complete!**

| Resource       | Action                        |
|----------------|-------------------------------|
| Worktree       | Removed                       |
| Database       | Container removed             |
| Frontend port  | [port] freed                  |
| Backend port   | [port] freed                  |
| Database port  | [port] freed                  |

Mention: The git branch was preserved. Delete manually with `git branch -D <branch>` if needed.

### Error Handling

If the command fails, provide helpful guidance:

- **Worktree not found**: Check the worktree ID or branch name, suggest `/worktree-list` to see available
- **Docker error**: Container may already be removed, proceed with registry cleanup
- **Git error**: Git worktree may have issues, suggest manual cleanup

## Examples

**Interactive mode (no target):**
```
User: /worktree-cleanup

Claude: Here are your current worktrees:

| ID           | Branch              | Ports (F/B/D)      |
|--------------|---------------------|--------------------|
| feature-auth | feature/auth        | 5174/3002/7433     |
| bugfix-123   | bugfix/issue-123    | 5175/3003/7434     |

Which worktree would you like to remove?

User: feature-auth

Claude: This will remove:
- Worktree at ../InZone-App-worktrees/feature-auth
- Database container and volume
- Ports 5174, 3002, 7433

Proceed? (The git branch will be preserved)

User: Yes

Claude: Cleaning up worktree 'feature-auth'...
[runs pnpm worktree:cleanup]
...success output...
```

**With target argument:**
```
User: /worktree-cleanup feature-auth

Claude: This will remove worktree 'feature-auth' and free its resources. Proceed?

User: Yes

Claude: Cleaning up...
[runs command]
```

**Using branch name:**
```
User: /worktree-cleanup feature/auth

Claude: Found worktree with branch 'feature/auth' (ID: feature-auth)
...continues with confirmation...
```

## Related Commands

- `/worktree` - Create a new worktree
- `/worktree-list` - List all worktrees
- `/worktree-cleanup-bulk` - Remove multiple worktrees at once
- `/worktree-sync` - Sync registry with filesystem
