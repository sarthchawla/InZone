---
name: worktree
description: Setup a new git worktree with isolated dev container and unique ports
arguments:
  - name: branch
    description: Branch name for the worktree
    required: false
  - name: source
    description: Source branch to create from
    required: false
---

# Worktree Setup Command

This command creates a new git worktree with an isolated development environment, unique port allocations, and devcontainer configuration.

## Behavior

Follow these steps to set up a new worktree:

### Step 1: Gather Branch Name

If the `branch` argument is not provided or is empty, ask the user:

"What branch name would you like for this worktree?"

Provide these options:
- Let them type a custom branch name
- Suggest common patterns like `feature/[name]` or `bugfix/[name]`

Validate the branch name:
- Must only contain alphanumeric characters, `-`, `_`, or `/`
- Cannot have consecutive slashes
- Cannot start or end with `/`

### Step 2: Gather Source Branch

If the `source` argument is not provided or is empty, ask the user:

"What source branch should I create this from?"

Provide these options:
- `master` (main development branch) - Recommended
- Current branch (run `git rev-parse --abbrev-ref HEAD` to get it)
- Let them specify another branch

### Step 3: Execute Setup Command

Once you have both branch and source, run the setup command:

```bash
pnpm worktree:setup --branch "$BRANCH" --source "$SOURCE"
```

Replace `$BRANCH` and `$SOURCE` with the actual values.

### Step 4: Report Results

After successful execution, format the output as a clear summary:

**Worktree Setup Complete!**

| Resource  | Value                              |
|-----------|-----------------------------------|
| Path      | [worktree path]                   |
| Branch    | [branch name]                     |
| Source    | [source branch]                   |
| Frontend  | http://localhost:[port]           |
| Backend   | http://localhost:[port]           |
| Database  | localhost:[port]                  |

If the worktree is opening in Cursor, mention that.

### Error Handling

If the command fails, provide helpful guidance:

- **Invalid branch name**: Check the branch name format or if worktree already exists
- **Git operation failed**: The source branch may not exist, suggest `git fetch`
- **Port allocation failed**: No free ports available, suggest running `/worktree-cleanup-bulk`
- **Docker not available**: Docker is not running, start Docker and try again

## Examples

**Interactive mode (no arguments):**
```
User: /worktree

Claude: I'll help you set up a new worktree.

What branch name would you like for this worktree?

User: feature/user-authentication

Claude: What source branch should I create this from?
- master (Recommended)
- develop
- Current branch: add-tests

User: master

Claude: Setting up worktree for 'feature/user-authentication' from 'master'...
[runs pnpm worktree:setup]
...success output...
```

**With branch only:**
```
User: /worktree feature/payments

Claude: What source branch should I create 'feature/payments' from?
...
```

**With both arguments:**
```
User: /worktree feature/api-v2 master

Claude: Setting up worktree for 'feature/api-v2' from 'master'...
[runs command immediately]
```
