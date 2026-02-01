---
name: worktree-cleanup
description: Remove worktree(s) - by ID, interactively, or via flags
arguments:
  - name: target
    description: Branch name or worktree ID (optional - omit for interactive mode)
    required: false
  - name: flags
    description: Optional flags like --all, --stale 30, --dry-run, --force
    required: false
---

# Worktree Cleanup Command

This unified command removes git worktrees and frees their associated resources including Docker containers, volumes, and allocated ports.

## Usage

```
/worktree-cleanup                    → Interactive: show list, select one or more
/worktree-cleanup <id>               → Remove specific worktree
/worktree-cleanup --all              → Remove all worktrees
/worktree-cleanup --stale 30         → Remove worktrees inactive for 30+ days
/worktree-cleanup --dry-run          → Preview what would be removed
```

## Behavior

### Mode 1: Remove Specific Worktree

If a `target` is provided (ID or branch name):

```bash
pnpm worktree:cleanup "$TARGET"
```

### Mode 2: Interactive Selection

If no target is provided and no flags:

```bash
pnpm worktree:cleanup
```

This shows a numbered list and lets the user select which to remove using:
- Numbers (e.g., "1,3" or "1-3")
- "all" - Remove all worktrees
- "cancel" - Exit without changes

### Mode 3: Remove All

```bash
pnpm worktree:cleanup --all
```

### Mode 4: Remove Stale

```bash
pnpm worktree:cleanup --stale 30
```

Removes worktrees not accessed in 30+ days.

### Mode 5: Dry Run (Preview)

Add `--dry-run` to any command to preview without making changes:

```bash
pnpm worktree:cleanup --all --dry-run
```

### Skip Confirmation

Add `--force` or `-f` to skip confirmation prompts:

```bash
pnpm worktree:cleanup feature-auth --force
```

## What Gets Removed

For each worktree:
- ✓ Git worktree directory
- ✓ Database container (`inzone-db-wt-<id>`)
- ✓ Devcontainer (`inzone-wt-<id>`)
- ✓ Database volume
- ✓ Registry entry (frees allocated ports)
- ✗ Git branch (preserved - delete manually if needed)

## Examples

**Interactive mode:**
```
User: /worktree-cleanup

Claude: [runs pnpm worktree:cleanup]

Select worktrees to remove:

┌────┬────────────────────┬──────────────────────────┬──────────────────┐
│ #  │ ID                 │ Branch                   │ Last Access      │
├────┼────────────────────┼──────────────────────────┼──────────────────┤
│  1 │ feature-auth       │ feature/auth             │ today            │
│  2 │ bugfix-123         │ bugfix/issue-123         │ 15 days ago      │
└────┴────────────────────┴──────────────────────────┴──────────────────┘

Enter numbers to remove (e.g., "1,3" or "1-3"), "all", or "cancel":
> 2

✓ Removed: bugfix-123
✓ Removed 1 worktree(s)
```

**Remove specific worktree:**
```
User: /worktree-cleanup feature-auth

Claude: [runs pnpm worktree:cleanup feature-auth]
...confirmation and removal...
```

**Remove all worktrees:**
```
User: /worktree-cleanup --all --force

Claude: [runs pnpm worktree:cleanup --all --force]
✓ Removed 3 worktree(s)
```

**Remove stale worktrees:**
```
User: /worktree-cleanup --stale 7

Claude: Found 2 worktrees inactive for 7+ days...
```

## Related Commands

- `/worktree` - Create a new worktree
- `/worktree-list` - List all worktrees
- `/worktree-sync` - Sync registry with filesystem
