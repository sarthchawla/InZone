# Git Worktree Setup System - PRD

## Executive Summary

A comprehensive worktree management system that enables parallel development across multiple branches, each running in isolated dev containers with unique port configurations. The system includes a worktree registry, dynamic port allocation, and a Claude Code command for seamless setup.

---

## 1. Problem Statement

When working on multiple features or bug fixes simultaneously:
- Switching branches disrupts the current dev environment
- Running multiple instances causes port conflicts (frontend: 5173, backend: 3001, db: 5435)
- Manual worktree setup is error-prone and time-consuming
- No easy way to track which ports are in use by which worktree

### Goal

Enable developers to spin up isolated development environments for each branch with a single command, automatically handling:
1. Branch creation (if needed)
2. Worktree setup
3. Port allocation (no conflicts)
4. Dev container launch in Cursor
5. Auto-start the application with correct ports

---

## 2. Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         /worktree Claude Command                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    scripts/worktree/setup-worktree.sh                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. Validate inputs (branch name, source branch)                      │    │
│  │ 2. Create branch if not exists (from source branch)                  │    │
│  │ 3. Create worktree directory                                         │    │
│  │ 4. Allocate ports (frontend, backend, db)                            │    │
│  │ 5. Register worktree in registry                                     │    │
│  │ 6. Generate devcontainer overrides                                   │    │
│  │ 7. Launch Cursor with devcontainer                                   │    │
│  │ 8. Auto-start app with new ports                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Port Allocator    │  │  Worktree Registry  │  │  DevContainer Gen   │
│  find-free-port.sh  │  │  worktree.json      │  │  Override generator │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Port Allocation Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         PORT ALLOCATION SYSTEM                              │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌──────────────────────────────────────────────────┐
│ Port Ranges     │     │              Allocation Logic                     │
├─────────────────┤     ├──────────────────────────────────────────────────┤
│ Frontend:       │     │  1. Read worktree registry (worktree.json)       │
│   5173-5199     │     │  2. Get all allocated ports per service type     │
│                 │     │  3. For each service (frontend, backend, db):    │
│ Backend:        │ ──▶ │     a. Start from base port in range             │
│   3001-3099     │     │     b. Check if port in use (netstat/lsof)       │
│                 │     │     c. Check if port in registry                 │
│ Database:       │     │     d. If free, allocate; else increment         │
│   5435-5499     │     │  4. Return port set {frontend, backend, db}      │
└─────────────────┘     └──────────────────────────────────────────────────┘

                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         WORKTREE REGISTRY                                   │
│                       ~/.inzone/worktree.json                               │
├────────────────────────────────────────────────────────────────────────────┤
│  {                                                                          │
│    "worktrees": [                                                           │
│      {                                                                      │
│        "id": "feature-auth",                                                │
│        "branch": "feature/authentication",                                  │
│        "sourceBranch": "master",                                            │
│        "path": "/path/to/InZone-App-worktrees/feature-auth",               │
│        "ports": {                                                           │
│          "frontend": 5174,                                                  │
│          "backend": 3002,                                                   │
│          "database": 5436                                                   │
│        },                                                                   │
│        "containerName": "inzone-worktree-feature-auth",                    │
│        "status": "active",                                                  │
│        "createdAt": "2025-01-24T10:00:00Z",                                │
│        "lastAccessed": "2025-01-24T15:30:00Z"                              │
│      }                                                                      │
│    ],                                                                       │
│    "settings": {                                                            │
│      "worktreeBaseDir": "../InZone-App-worktrees",                          │
│      "portRanges": {                                                        │
│        "frontend": { "min": 5173, "max": 5199 },                           │
│        "backend": { "min": 3001, "max": 3099 },                            │
│        "database": { "min": 5435, "max": 5499 }                            │
│      }                                                                      │
│    }                                                                        │
│  }                                                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

### DevContainer Generation Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    DEVCONTAINER OVERRIDE GENERATION                         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ Original Config    │     │   Port Allocation  │     │   Generated        │
│                    │     │                    │     │   Override         │
│ devcontainer.json  │ ──▶ │ Frontend: 5174     │ ──▶ │                    │
│ docker-compose.yml │     │ Backend:  3002     │     │ docker-compose.    │
│                    │     │ Database: 5436     │     │ worktree.yml       │
└────────────────────┘     └────────────────────┘     └────────────────────┘
                                                                │
                                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ docker-compose.worktree.yml (generated per worktree)                        │
├────────────────────────────────────────────────────────────────────────────┤
│ services:                                                                   │
│   app:                                                                      │
│     environment:                                                            │
│       - VITE_PORT=5174                                                      │
│       - API_PORT=3002                                                       │
│       - DATABASE_URL=postgresql://...@db:5432/inzone?schema=public         │
│     ports:                                                                  │
│       - "5174:5174"   # Frontend                                           │
│       - "3002:3002"   # Backend                                            │
│                                                                            │
│   db:                                                                       │
│     container_name: inzone-postgres-worktree-feature-auth                  │
│     ports:                                                                  │
│       - "5436:5432"   # Unique external port                               │
└────────────────────────────────────────────────────────────────────────────┘
```

### Complete Worktree Lifecycle

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        WORKTREE LIFECYCLE                                   │
└────────────────────────────────────────────────────────────────────────────┘

   User runs: /worktree feature/auth --source master
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 1: VALIDATION & SETUP                 │
    ├──────────────────────────────────────────────┤
    │  1. Parse arguments (branch, source)         │
    │  2. If missing, prompt user via Claude       │
    │  3. Validate branch name format              │
    │  4. Check if worktree already exists         │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 2: GIT OPERATIONS                     │
    ├──────────────────────────────────────────────┤
    │  1. Fetch latest from remote                 │
    │  2. Create branch if not exists              │
    │  3. git worktree add <path> <branch>         │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 3: PORT ALLOCATION                    │
    ├──────────────────────────────────────────────┤
    │  1. Load worktree registry                   │
    │  2. Find free ports in each range            │
    │  3. Verify ports not in use (system check)   │
    │  4. Reserve ports in registry                │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 4: DEVCONTAINER CONFIGURATION         │
    ├──────────────────────────────────────────────┤
    │  1. Copy base devcontainer config            │
    │  2. Generate docker-compose.worktree.yml     │
    │  3. Update devcontainer.json with overrides  │
    │  4. Set unique container names               │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 5: LAUNCH & START                     │
    ├──────────────────────────────────────────────┤
    │  1. Open worktree in Cursor                  │
    │  2. Cursor triggers devcontainer build       │
    │  3. PostStartCommand runs app startup        │
    │  4. Frontend/Backend auto-start on new ports │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 6: REGISTRY UPDATE                    │
    ├──────────────────────────────────────────────┤
    │  1. Update worktree status to "active"       │
    │  2. Record lastAccessed timestamp            │
    │  3. Save registry to disk                    │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  OUTPUT TO USER                              │
    ├──────────────────────────────────────────────┤
    │  Worktree 'feature/auth' is ready!           │
    │  - Path: ../InZone-App-worktrees/feature-auth│
    │  - Frontend: http://localhost:5174           │
    │  - Backend:  http://localhost:3002           │
    │  - Database: localhost:5436                  │
    └──────────────────────────────────────────────┘
```

---

## 3. Components Specification

### 3.1 Directory Structure

```
InZone-App/
├── scripts/
│   └── worktree/
│       ├── setup-worktree.sh       # Main orchestration script
│       ├── find-free-port.sh       # Port allocation utility
│       ├── registry.sh             # Registry management utilities
│       ├── cleanup-worktree.sh     # Remove single worktree and free ports
│       ├── cleanup-bulk.sh         # Remove multiple worktrees in bulk
│       ├── sync-registry.sh        # Sync registry with actual worktrees (prune orphans)
│       ├── list-worktrees.sh       # List all active worktrees
│       └── templates/
│           ├── docker-compose.worktree.template.yml
│           └── devcontainer.worktree.template.json
├── .claude/
│   └── commands/
│       ├── worktree.md             # Setup command
│       ├── worktree-list.md        # List command
│       ├── worktree-cleanup.md     # Single cleanup command
│       ├── worktree-cleanup-bulk.md # Bulk cleanup command
│       └── worktree-sync.md        # Registry sync/prune command
└── tests/
    └── worktree/
        ├── setup.sh                # Test setup/teardown utilities
        ├── setup-worktree.test.sh  # Integration tests
        ├── port-allocation.test.sh # Port allocation tests
        ├── registry.test.sh        # Registry tests
        ├── cleanup-bulk.test.sh    # Bulk cleanup tests
        └── sync-registry.test.sh   # Registry sync tests
```

### 3.2 Worktree Registry Schema

Location: `~/.inzone/worktree.json`

```typescript
interface WorktreeRegistry {
  worktrees: Worktree[];
  settings: RegistrySettings;
}

interface Worktree {
  id: string;              // Sanitized branch name (slug)
  branch: string;          // Full branch name
  sourceBranch: string;    // Branch it was created from
  path: string;            // Absolute path to worktree
  ports: {
    frontend: number;
    backend: number;
    database: number;
  };
  containerName: string;   // Docker container name
  dbContainerName: string; // Database container name
  status: 'active' | 'stopped' | 'error';
  createdAt: string;       // ISO timestamp
  lastAccessed: string;    // ISO timestamp
}

interface RegistrySettings {
  worktreeBaseDir: string;
  portRanges: {
    frontend: { min: number; max: number };
    backend: { min: number; max: number };
    database: { min: number; max: number };
  };
}
```

### 3.3 Port Allocation Strategy

| Service   | Base Port | Range      | Example Allocations |
|-----------|-----------|------------|---------------------|
| Frontend  | 5173      | 5173-5199  | main: 5173, wt1: 5174, wt2: 5175 |
| Backend   | 3001      | 3001-3099  | main: 3001, wt1: 3002, wt2: 3003 |
| Database  | 5435      | 5435-5499  | main: 5435, wt1: 5436, wt2: 5437 |

**Allocation Rules:**
1. Main workspace always uses base ports (5173, 3001, 5435)
2. Worktrees get next available port in range
3. Before allocation, verify port is:
   - Not in registry (reserved)
   - Not in use by system (`lsof -i :<port>` or `ss -tuln`)
4. Maximum 26 concurrent worktrees (configurable)

---

## 4. Script Specifications

### 4.1 setup-worktree.sh

```bash
#!/bin/bash
# Main worktree setup orchestrator

# Usage: setup-worktree.sh [OPTIONS]
# Options:
#   -b, --branch <name>     Branch name (required or prompted)
#   -s, --source <branch>   Source branch (default: current branch)
#   -n, --no-open           Don't open in Cursor
#   -h, --help              Show help

# Exit codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - Git operation failed
#   3 - Port allocation failed
#   4 - DevContainer generation failed
#   5 - Cursor launch failed
```

### 4.2 find-free-port.sh

```bash
#!/bin/bash
# Find an available port in the specified range

# Usage: find-free-port.sh <service_type>
# Service types: frontend, backend, database
# Returns: First available port number

# Algorithm:
# 1. Load port range from registry settings
# 2. Get all used ports from registry for service type
# 3. Iterate from min to max:
#    - Skip if in registry
#    - Check if port is in use: ss -tuln | grep :<port>
#    - Return first available
# 4. Exit with error if no ports available
```

### 4.3 registry.sh

```bash
#!/bin/bash
# Registry management utilities

# Functions:
# - init_registry()      - Create registry if not exists
# - get_worktree(id)     - Get worktree by ID
# - add_worktree(data)   - Add new worktree entry
# - update_worktree(id, data) - Update existing entry
# - remove_worktree(id)  - Remove worktree entry
# - list_worktrees()     - List all worktrees
# - get_used_ports(type) - Get all used ports for service type
# - get_orphaned_entries() - Find registry entries without actual worktrees
# - prune_orphans()      - Remove orphaned entries from registry
```

### 4.4 cleanup-bulk.sh

```bash
#!/bin/bash
# Bulk worktree cleanup - remove multiple worktrees at once

# Usage: cleanup-bulk.sh [OPTIONS]
# Options:
#   -i, --ids <id1,id2,...>  Comma-separated list of worktree IDs
#   -a, --all                Remove ALL worktrees (with confirmation)
#   -s, --stale <days>       Remove worktrees not accessed in N days
#   --dry-run                Show what would be removed without doing it
#   -f, --force              Skip confirmation prompts
#   -h, --help               Show help

# Exit codes:
#   0 - Success (all specified worktrees removed)
#   1 - Invalid arguments
#   2 - Some worktrees failed to remove (partial success)
#   3 - User cancelled operation
```

### 4.5 sync-registry.sh

```bash
#!/bin/bash
# Sync registry with actual git worktrees - clean up orphaned entries

# Usage: sync-registry.sh [OPTIONS]
# Options:
#   --dry-run                Show orphaned entries without removing
#   -f, --force              Skip confirmation prompts
#   -v, --verbose            Show detailed output
#   -h, --help               Show help

# Algorithm:
# 1. Load all entries from worktree registry
# 2. For each entry:
#    a. Check if worktree path exists on filesystem
#    b. Check if git recognizes it as a worktree (git worktree list)
#    c. Optionally check if containers are running
# 3. Identify orphaned entries (in registry but not on disk/git)
# 4. Report findings to user
# 5. If not --dry-run, remove orphaned entries and free ports

# Exit codes:
#   0 - Success (registry synced, orphans removed)
#   1 - Invalid arguments
#   2 - Registry file not found or corrupted
#   3 - User cancelled operation
```

### 4.6 Registry Sync Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      REGISTRY SYNC / PRUNE FLOW                             │
│                        /worktree-sync command                               │
└────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────┐
    │  PHASE 1: LOAD REGISTRY                      │
    ├──────────────────────────────────────────────┤
    │  1. Read ~/.inzone/worktree.json             │
    │  2. Parse all worktree entries               │
    │  3. Build list of registered worktrees       │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 2: VERIFY EACH ENTRY                  │
    ├──────────────────────────────────────────────┤
    │  For each registered worktree:               │
    │                                              │
    │  ┌─────────────────────────────────────┐     │
    │  │ Check 1: Path exists on filesystem? │     │
    │  │   ls -d <worktree_path>             │     │
    │  └─────────────────────────────────────┘     │
    │                   │                          │
    │                   ▼                          │
    │  ┌─────────────────────────────────────┐     │
    │  │ Check 2: Git recognizes worktree?   │     │
    │  │   git worktree list | grep <path>   │     │
    │  └─────────────────────────────────────┘     │
    │                   │                          │
    │                   ▼                          │
    │  ┌─────────────────────────────────────┐     │
    │  │ Check 3: Docker containers exist?   │     │
    │  │   docker ps -a --filter name=<name> │     │
    │  └─────────────────────────────────────┘     │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 3: CLASSIFY ENTRIES                   │
    ├──────────────────────────────────────────────┤
    │                                              │
    │  VALID: Path exists + Git recognizes         │
    │    → Keep in registry                        │
    │                                              │
    │  ORPHANED: In registry but NOT on disk/git   │
    │    → Mark for removal                        │
    │                                              │
    │  STALE CONTAINERS: Worktree gone, container  │
    │    remains → Mark container for cleanup      │
    │                                              │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 4: REPORT FINDINGS                    │
    ├──────────────────────────────────────────────┤
    │                                              │
    │  Registry Sync Report                        │
    │  ═══════════════════                         │
    │                                              │
    │  Valid worktrees: 3                          │
    │  Orphaned entries: 2                         │
    │  Stale containers: 1                         │
    │                                              │
    │  Orphaned entries to remove:                 │
    │  ┌──────────────────────────────────────┐    │
    │  │ ID: feature-old                      │    │
    │  │ Branch: feature/old-feature          │    │
    │  │ Ports: 5175/3003/5437                │    │
    │  │ Reason: Path does not exist          │    │
    │  └──────────────────────────────────────┘    │
    │  ┌──────────────────────────────────────┐    │
    │  │ ID: bugfix-deleted                   │    │
    │  │ Branch: bugfix/manually-deleted      │    │
    │  │ Ports: 5176/3004/5438                │    │
    │  │ Reason: Not in git worktree list     │    │
    │  └──────────────────────────────────────┘    │
    │                                              │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  PHASE 5: CLEANUP (if not --dry-run)         │
    ├──────────────────────────────────────────────┤
    │  1. Prompt user for confirmation             │
    │  2. For each orphaned entry:                 │
    │     a. Stop/remove stale containers          │
    │     b. Remove entry from registry            │
    │     c. Free allocated ports                  │
    │  3. Save updated registry                    │
    │  4. Report freed resources                   │
    └──────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  OUTPUT                                      │
    ├──────────────────────────────────────────────┤
    │  Cleanup complete!                           │
    │  - Removed 2 orphaned registry entries       │
    │  - Freed ports: 5175, 5176, 3003, 3004, ...  │
    │  - Stopped 1 stale container                 │
    └──────────────────────────────────────────────┘
```

---

## 5. Claude Command Specification

### 5.1 Command Definition

File: `.claude/commands/worktree.md`

```markdown
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

This command creates a new git worktree with an isolated development environment.

## Behavior

1. If `branch` is not provided, ask the user for the branch name
2. If `source` is not provided, ask the user for the source branch (default: current branch)
3. Execute the worktree setup script
4. Report the allocated ports and worktree path

## Execution

\`\`\`bash
/InZone-App/scripts/worktree/setup-worktree.sh --branch "$branch" --source "$source"
\`\`\`
```

### 5.2 User Interaction Flow

```
User: /worktree

Claude: I'll help you set up a new worktree.

What branch name would you like for this worktree?
Options:
- [Type branch name]
- feature/[name]
- bugfix/[name]

User: feature/authentication

Claude: What source branch should I create this from?
Options:
- master (Recommended - main development branch)
- develop
- [Current branch: add-tests]
- Other

User: master

Claude: Setting up worktree for 'feature/authentication' from 'master'...

[Executes setup-worktree.sh]

Worktree 'feature/authentication' is ready!

| Resource  | URL/Port                              |
|-----------|---------------------------------------|
| Path      | ../InZone-App-worktrees/feature-auth  |
| Frontend  | http://localhost:5174                 |
| Backend   | http://localhost:3002                 |
| Database  | localhost:5436                        |

Opening in Cursor...
```

---

## 6. DevContainer Configuration

### 6.1 Template: docker-compose.worktree.template.yml

```yaml
# Docker Compose override for worktree: {{WORKTREE_ID}}
# Generated by setup-worktree.sh - DO NOT EDIT MANUALLY

services:
  app:
    container_name: inzone-worktree-{{WORKTREE_ID}}
    environment:
      - VITE_DEV_PORT={{FRONTEND_PORT}}
      - API_PORT={{BACKEND_PORT}}
      - DATABASE_URL=postgresql://inzone:inzone_dev@db:5432/inzone?schema=public
    ports:
      - "{{FRONTEND_PORT}}:{{FRONTEND_PORT}}"
      - "{{BACKEND_PORT}}:{{BACKEND_PORT}}"

  db:
    container_name: inzone-postgres-worktree-{{WORKTREE_ID}}
    ports:
      - "{{DATABASE_PORT}}:5432"

volumes:
  postgres_data_{{WORKTREE_ID}}:
```

### 6.2 DevContainer Overrides

The worktree's `devcontainer.json` will be modified to:
1. Use a unique name: `InZone - {{WORKTREE_ID}}`
2. Reference the generated docker-compose override
3. Update `forwardPorts` with allocated ports
4. Add `postStartCommand` to launch the app

### 6.3 Auto-Start Application

The `postStartCommand` in the worktree's devcontainer will:

```bash
# In devcontainer.json postStartCommand
pnpm install && pnpm dev
```

The `pnpm dev` script will read environment variables:
- `VITE_DEV_PORT` - For frontend
- `API_PORT` - For backend

Both `apps/web/vite.config.ts` and `apps/api/src/index.ts` need to respect these environment variables.

---

## 7. Implementation Plan

### Phase 1: Core Scripts

| Task | Description | Priority |
|------|-------------|----------|
| Create `scripts/worktree/` directory | Setup script folder structure | P0 |
| Implement `registry.sh` | Registry CRUD operations | P0 |
| Implement `find-free-port.sh` | Port allocation logic | P0 |
| Implement `setup-worktree.sh` | Main orchestration | P0 |
| Create templates | Docker compose and devcontainer templates | P0 |

### Phase 2: Claude Command

| Task | Description | Priority |
|------|-------------|----------|
| Create `.claude/commands/worktree.md` | Command definition | P0 |
| Implement user prompting logic | For missing branch/source | P0 |
| Add output formatting | Clear status messages | P1 |

### Phase 3: App Port Configuration

| Task | Description | Priority |
|------|-------------|----------|
| Update `vite.config.ts` | Read VITE_DEV_PORT env var | P0 |
| Update `apps/api/src/index.ts` | Read API_PORT env var | P0 |
| Update `docker-compose.yml` | Support variable ports | P0 |

### Phase 4: Additional Utilities

| Task | Description | Priority |
|------|-------------|----------|
| Implement `cleanup-worktree.sh` | Remove single worktree, free ports | P1 |
| Implement `cleanup-bulk.sh` | Remove multiple worktrees at once | P1 |
| Implement `sync-registry.sh` | Prune orphaned registry entries | P1 |
| Implement `list-worktrees.sh` | Show all active worktrees | P1 |
| Create `/worktree-list` command | Claude command to list worktrees | P1 |
| Create `/worktree-cleanup` command | Claude command to cleanup single | P1 |
| Create `/worktree-cleanup-bulk` command | Claude command for bulk cleanup | P1 |
| Create `/worktree-sync` command | Claude command to sync registry | P1 |

### Phase 5: Testing

| Task | Description | Priority |
|------|-------------|----------|
| Port allocation tests | Verify port finding logic | P0 |
| Registry tests | CRUD operations | P0 |
| Integration tests | Full worktree lifecycle | P0 |
| DevContainer tests | Verify container builds | P1 |
| Bulk cleanup tests | Verify multi-worktree removal | P1 |
| Registry sync tests | Verify orphan detection and cleanup | P1 |

---

## 8. Test Specification

### 8.1 Test Structure

```
tests/
└── worktree/
    ├── setup.sh                    # Test setup/teardown utilities
    ├── port-allocation.test.sh     # Port allocation tests
    ├── registry.test.sh            # Registry tests
    ├── setup-worktree.test.sh      # Integration tests
    └── devcontainer.test.sh        # DevContainer tests
```

### 8.2 Test Cases

#### Port Allocation Tests

```bash
# port-allocation.test.sh

test_find_first_available_port() {
  # Given: Empty registry
  # When: Finding frontend port
  # Then: Returns 5173 (base port)
}

test_find_next_available_port() {
  # Given: Registry with frontend port 5173 used
  # When: Finding frontend port
  # Then: Returns 5174
}

test_skip_system_used_port() {
  # Given: Port 5174 in use by system (mock)
  # When: Finding frontend port
  # Then: Returns 5175
}

test_error_when_no_ports_available() {
  # Given: All ports in range used
  # When: Finding port
  # Then: Exit code 3, error message
}
```

#### Registry Tests

```bash
# registry.test.sh

test_init_creates_registry() {
  # Given: No registry file
  # When: init_registry called
  # Then: Registry file created with default settings
}

test_add_worktree() {
  # Given: Empty registry
  # When: add_worktree called
  # Then: Worktree entry added
}

test_get_used_ports() {
  # Given: Registry with 2 worktrees
  # When: get_used_ports("frontend") called
  # Then: Returns array of used frontend ports
}

test_remove_worktree() {
  # Given: Registry with worktree
  # When: remove_worktree called
  # Then: Entry removed, file updated
}
```

#### Integration Tests

```bash
# setup-worktree.test.sh

test_full_worktree_setup() {
  # Given: Clean state
  # When: setup-worktree.sh -b test-branch -s master
  # Then:
  #   - Branch created
  #   - Worktree directory exists
  #   - Ports allocated
  #   - Registry updated
  #   - DevContainer config generated
}

test_worktree_cleanup() {
  # Given: Active worktree
  # When: cleanup-worktree.sh test-branch
  # Then:
  #   - Worktree removed
  #   - Ports freed
  #   - Registry updated
  #   - Containers stopped
}

test_prevents_duplicate_worktree() {
  # Given: Worktree for branch exists
  # When: Trying to create same branch worktree
  # Then: Error with helpful message
}
```

#### DevContainer Tests

```bash
# devcontainer.test.sh

test_docker_compose_override_generated() {
  # Given: Setup worktree called
  # Then: docker-compose.worktree.yml exists
  # And: Contains correct port mappings
}

test_devcontainer_json_updated() {
  # Given: Setup worktree called
  # Then: devcontainer.json has correct name
  # And: forwardPorts match allocated ports
}

test_unique_container_names() {
  # Given: Two worktrees created
  # Then: Each has unique container names
  # And: No container name conflicts
}
```

#### Bulk Cleanup Tests

```bash
# cleanup-bulk.test.sh

test_bulk_cleanup_by_ids() {
  # Given: Registry with 3 worktrees (wt1, wt2, wt3)
  # When: cleanup-bulk.sh --ids wt1,wt2
  # Then:
  #   - wt1 and wt2 removed
  #   - wt3 remains
  #   - Ports for wt1, wt2 freed
}

test_bulk_cleanup_all() {
  # Given: Registry with 3 worktrees
  # When: cleanup-bulk.sh --all --force
  # Then:
  #   - All worktrees removed
  #   - All ports freed
  #   - Registry is empty
}

test_bulk_cleanup_stale() {
  # Given: Registry with worktrees, some not accessed in 30 days
  # When: cleanup-bulk.sh --stale 30
  # Then:
  #   - Only stale worktrees removed
  #   - Recent worktrees remain
}

test_bulk_cleanup_dry_run() {
  # Given: Registry with 3 worktrees
  # When: cleanup-bulk.sh --all --dry-run
  # Then:
  #   - Shows what would be removed
  #   - No actual changes made
  #   - All worktrees still exist
}

test_bulk_cleanup_partial_failure() {
  # Given: Registry with 2 worktrees, one has locked files
  # When: cleanup-bulk.sh --ids wt1,wt2
  # Then:
  #   - Exit code 2 (partial success)
  #   - Successful removal reported
  #   - Failed removal reported with reason
}
```

#### Registry Sync Tests

```bash
# sync-registry.test.sh

test_detect_orphaned_path_missing() {
  # Given: Registry entry for worktree that was manually deleted
  # When: sync-registry.sh --dry-run
  # Then:
  #   - Entry identified as orphaned
  #   - Reason: "Path does not exist"
}

test_detect_orphaned_not_in_git() {
  # Given: Registry entry, path exists but not in git worktree list
  # When: sync-registry.sh --dry-run
  # Then:
  #   - Entry identified as orphaned
  #   - Reason: "Not in git worktree list"
}

test_sync_removes_orphans() {
  # Given: Registry with 2 orphaned entries
  # When: sync-registry.sh --force
  # Then:
  #   - Orphaned entries removed
  #   - Ports freed
  #   - Valid entries preserved
}

test_sync_cleans_stale_containers() {
  # Given: Orphaned entry with lingering Docker container
  # When: sync-registry.sh --force
  # Then:
  #   - Container stopped and removed
  #   - Entry removed from registry
}

test_sync_dry_run_no_changes() {
  # Given: Registry with orphaned entries
  # When: sync-registry.sh --dry-run
  # Then:
  #   - Report shows orphans
  #   - No changes to registry
  #   - No containers stopped
}

test_sync_empty_registry() {
  # Given: Empty registry (no worktrees)
  # When: sync-registry.sh
  # Then:
  #   - Reports "No worktrees registered"
  #   - Exit code 0
}

test_sync_all_valid() {
  # Given: Registry with all valid worktrees
  # When: sync-registry.sh
  # Then:
  #   - Reports "All worktrees valid"
  #   - No changes made
}
```

### 8.3 Running Tests

```bash
# Run all worktree tests
./tests/worktree/run-all.sh

# Run specific test file
./tests/worktree/port-allocation.test.sh

# Run with verbose output
VERBOSE=1 ./tests/worktree/run-all.sh
```

---

## 9. Error Handling

| Error | Exit Code | User Message |
|-------|-----------|--------------|
| Invalid branch name | 1 | "Branch name contains invalid characters. Use alphanumeric, '-', '_', '/'." |
| Branch already has worktree | 1 | "Worktree for branch 'X' already exists at [path]. Use /worktree-list to see all." |
| Source branch not found | 2 | "Source branch 'X' not found. Run 'git fetch' or check branch name." |
| Git worktree failed | 2 | "Failed to create worktree: [git error]" |
| No free ports | 3 | "No free ports available in range. Run /worktree-cleanup to free unused worktrees." |
| Template not found | 4 | "DevContainer template not found. Ensure scripts/worktree/templates/ exists." |
| Cursor not installed | 5 | "Cursor not found. Install from https://cursor.sh or use --no-open flag." |

---

## 10. Future Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| Worktree sync | Sync common deps between worktrees | P2 |
| Auto-cleanup | Remove inactive worktrees after N days | P2 |
| Resource limits | Limit concurrent worktrees per system | P2 |
| Remote worktrees | Support SSH-based worktrees | P3 |
| VS Code support | Add VS Code launcher option | P2 |
| Dashboard | Web UI to manage worktrees | P3 |

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Worktree setup time | < 30 seconds |
| Port conflict rate | 0% |
| DevContainer build time | < 2 minutes |
| Test coverage | > 80% |

---

## 12. Dependencies

- **Git** >= 2.25 (worktree support)
- **Docker** >= 20.10
- **Cursor** (or VS Code with Remote Containers)
- **jq** (JSON processing in bash)
- **bash** >= 4.0

---

## 13. Appendix: Command Reference

### /worktree

Setup a new worktree.

```
/worktree [branch] [--source branch]

Examples:
  /worktree                           # Interactive mode
  /worktree feature/auth              # Create from current branch
  /worktree feature/auth -s master    # Create from master
```

### /worktree-list

List all active worktrees.

```
/worktree-list

Output:
| ID           | Branch          | Ports (F/B/D)    | Status |
|--------------|-----------------|------------------|--------|
| feature-auth | feature/auth    | 5174/3002/5436   | active |
| bugfix-123   | bugfix/123      | 5175/3003/5437   | active |
```

### /worktree-cleanup

Remove a single worktree and free its resources.

```
/worktree-cleanup <branch-or-id>

Examples:
  /worktree-cleanup feature-auth
  /worktree-cleanup feature/auth
```

### /worktree-cleanup-bulk

Remove multiple worktrees at once with interactive selection.

```
/worktree-cleanup-bulk [OPTIONS]

Options:
  --all              Remove all worktrees (with confirmation)
  --stale <days>     Remove worktrees not accessed in N days
  --dry-run          Preview what would be removed

Examples:
  /worktree-cleanup-bulk                    # Interactive selection
  /worktree-cleanup-bulk --stale 30         # Remove inactive > 30 days
  /worktree-cleanup-bulk --all --dry-run    # Preview removing all
```

**Interactive Flow:**

```
User: /worktree-cleanup-bulk

Claude: Select worktrees to remove:

| # | ID           | Branch          | Ports         | Last Accessed |
|---|--------------|-----------------|---------------|---------------|
| 1 | feature-auth | feature/auth    | 5174/3002/5436| 2 days ago    |
| 2 | bugfix-123   | bugfix/123      | 5175/3003/5437| 15 days ago   |
| 3 | feature-old  | feature/old     | 5176/3004/5438| 45 days ago   |

Options:
- Select by number (e.g., "1,3" or "1-3")
- "stale" - Remove all > 30 days inactive
- "all" - Remove all worktrees
- "cancel" - Exit without changes

User: 2,3

Claude: Removing 2 worktrees...

Removed:
  - bugfix-123 (freed ports: 5175, 3003, 5437)
  - feature-old (freed ports: 5176, 3004, 5438)

Remaining worktrees: 1
```

### /worktree-sync

Sync the worktree registry with the actual filesystem. Use this to clean up orphaned registry entries after manually deleting worktrees outside of Claude.

```
/worktree-sync [OPTIONS]

Options:
  --dry-run          Show what would be cleaned without making changes
  --verbose          Show detailed verification for each entry

Examples:
  /worktree-sync                # Sync registry, remove orphans
  /worktree-sync --dry-run      # Preview orphaned entries
```

**Example Flow:**

```
User: /worktree-sync

Claude: Scanning registry for orphaned entries...

Registry Sync Report
════════════════════

Valid worktrees: 2
Orphaned entries: 2
Stale containers: 1

Orphaned entries found:

| ID           | Branch              | Ports         | Reason                    |
|--------------|---------------------|---------------|---------------------------|
| feature-old  | feature/old-feature | 5175/3003/5437| Path does not exist       |
| bugfix-gone  | bugfix/deleted      | 5176/3004/5438| Not in git worktree list  |

Options:
- "clean" - Remove orphaned entries and free ports
- "dry-run" - Already showing preview
- "cancel" - Keep registry as-is

User: clean

Claude: Cleaning up orphaned entries...

Cleanup complete!
  - Removed 2 orphaned registry entries
  - Freed 6 ports (5175, 5176, 3003, 3004, 5437, 5438)
  - Stopped 1 stale container (inzone-postgres-worktree-feature-old)

Registry now has 2 valid worktrees.
```

---

*Document Version: 1.1*
*Created: 2025-01-24*
*Updated: 2025-01-24 - Added bulk cleanup and registry sync commands*
