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
/home/node/.cursor/worktrees/InZone-App__Container_InZone_-_Dev_container_for_Claude_Code__996f97e08845__/qek/scripts/worktree/list-worktrees.sh -v
```

Then ask the user which worktree to remove, showing them the list with IDs and branches.

### Step 2: Confirm Cleanup

Before executing cleanup, confirm with the user what will be removed:

- Git worktree directory
- Docker containers (app and database)
- Docker volumes (database data)
- Registry entry (frees allocated ports)
- Git branch (unless user wants to keep it)

Ask: "Do you want to keep the git branch, or delete everything?"

Options:
- "Delete everything" (default) - Remove worktree and delete branch
- "Keep branch" - Remove worktree but keep the git branch

### Step 3: Execute Cleanup Script

Run the cleanup script based on user choice:

**Delete everything (default):**
```bash
/home/node/.cursor/worktrees/InZone-App__Container_InZone_-_Dev_container_for_Claude_Code__996f97e08845__/qek/scripts/worktree/cleanup-worktree.sh --force "$TARGET"
```

**Keep the branch:**
```bash
/home/node/.cursor/worktrees/InZone-App__Container_InZone_-_Dev_container_for_Claude_Code__996f97e08845__/qek/scripts/worktree/cleanup-worktree.sh --force --keep-branch "$TARGET"
```

Replace `$TARGET` with the worktree ID or branch name.

### Step 4: Report Results

After successful cleanup, format the output as:

**Worktree Cleanup Complete!**

| Resource       | Action                        |
|----------------|-------------------------------|
| Worktree       | Removed                       |
| Branch         | Deleted / Kept                |
| Frontend port  | [port] freed                  |
| Backend port   | [port] freed                  |
| Database port  | [port] freed                  |

### Error Handling

If the script fails, provide helpful guidance:

- **Exit code 1 (Invalid arguments)**: Check the worktree ID format
- **Exit code 2 (Git operation failed)**: Git worktree may have issues, suggest manual cleanup
- **Exit code 3 (Not found)**: Worktree not in registry, suggest `/worktree-list` to see available
- **Exit code 4 (User cancelled)**: Operation was cancelled

## Examples

**Interactive mode (no target):**
```
User: /worktree-cleanup

Claude: Here are your current worktrees:

| ID           | Branch              | Ports (F/B/D)    |
|--------------|---------------------|------------------|
| feature-auth | feature/auth        | 5174/3002/5436   |
| bugfix-123   | bugfix/issue-123    | 5175/3003/5437   |

Which worktree would you like to remove?

User: feature-auth

Claude: This will remove:
- Worktree at ../InZone-App-worktrees/feature-auth
- Docker containers and volumes
- Ports 5174, 3002, 5436

Do you want to keep the git branch 'feature/auth', or delete everything?

User: Delete everything

Claude: Cleaning up worktree 'feature-auth'...
[runs script]
...success output...
```

**With target argument:**
```
User: /worktree-cleanup feature-auth

Claude: This will remove worktree 'feature-auth'. Delete branch too?
- Delete everything (recommended)
- Keep branch

User: Delete everything

Claude: Cleaning up...
[runs script]
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
