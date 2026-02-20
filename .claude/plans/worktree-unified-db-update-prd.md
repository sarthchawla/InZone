# PRD: Worktree Setup - Per-Worktree Database on Host

**Version:** 2.1
**Date:** 2026-02-01
**Status:** Draft
**Author:** Claude Code
**Supersedes:** `.claude/plans/features/worktree-setup-prd.md`

---

## 1. Executive Summary

This PRD documents the updated worktree setup system that allocates isolated resources (frontend, backend, database) for each worktree. The key principle is that **databases run on the host machine** (not inside devcontainers), and the same ports work whether you open the worktree directly or inside a devcontainer.

---

## 2. Architecture Overview

### 2.1 Core Principles

1. **Per-worktree isolation**: Each worktree gets its own frontend, backend, and database ports
2. **Host-side databases**: All database containers run on the host, outside any devcontainer
3. **Environment agnostic**: Same ports work for direct development or devcontainer development
4. **DevContainers are mirrors**: DevContainers simply connect to the host-allocated resources

### 2.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOST MACHINE                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    DATABASE CONTAINERS (Host-side)                      │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │ │
│  │  │ inzone-db        │  │ inzone-db-wt-auth│  │ inzone-db-wt-fix │     │ │
│  │  │ Port: 7432       │  │ Port: 7433       │  │ Port: 7434       │     │ │
│  │  │ (main workspace) │  │ (feature/auth)   │  │ (bugfix/123)     │     │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                    │                   │                   │                 │
│                    ▼                   ▼                   ▼                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        WORKTREE ENVIRONMENTS                            │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  MAIN WORKSPACE          WORKTREE: feature/auth    WORKTREE: bugfix/123│ │
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │ │
│  │  │ Frontend: 5173   │    │ Frontend: 5174   │    │ Frontend: 5175   │  │ │
│  │  │ Backend:  3001   │    │ Backend:  3002   │    │ Backend:  3003   │  │ │
│  │  │ DB:       7432   │    │ DB:       7433   │    │ DB:       7434   │  │ │
│  │  │                  │    │                  │    │                  │  │ │
│  │  │ Can run:         │    │ Can run:         │    │ Can run:         │  │ │
│  │  │ - Directly       │    │ - Directly       │    │ - Directly       │  │ │
│  │  │ - In DevContainer│    │ - In DevContainer│    │ - In DevContainer│  │ │
│  │  └──────────────────┘    └──────────────────┘    └──────────────────┘  │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Two Usage Flows

### 3.1 Flow A: Direct Development (No DevContainer)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLOW A: DIRECT DEVELOPMENT (No DevContainer)                    │
└─────────────────────────────────────────────────────────────────────────────┘

   User runs: /worktree feature/auth --source master
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  1. SETUP-WORKTREE.SH                                    │
    ├──────────────────────────────────────────────────────────┤
    │  • Create git worktree                                   │
    │  • Allocate ports: 5174 (frontend), 3002 (backend),      │
    │    7433 (database)                                       │
    │  • Start database container on HOST:                     │
    │    docker run -d --name inzone-db-wt-feature-auth \      │
    │      -p 7433:5432 postgres:16-alpine                     │
    │  • Generate .env file with allocated ports               │
    │  • Register in worktree registry                         │
    └──────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  2. USER OPENS WORKTREE IN EDITOR (Cursor/VS Code)       │
    ├──────────────────────────────────────────────────────────┤
    │  • Opens folder: ../InZone-worktrees/feature-auth        │
    │  • Does NOT use devcontainer (opens directly)            │
    └──────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  3. USER RUNS APP                                        │
    ├──────────────────────────────────────────────────────────┤
    │  $ pnpm install                                          │
    │  $ pnpm dev                                               │
    │                                                          │
    │  .env is already configured:                             │
    │  ┌────────────────────────────────────────────────────┐  │
    │  │ VITE_DEV_PORT=5174                                 │  │
    │  │ API_PORT=3002                                      │  │
    │  │ DATABASE_URL=postgresql://inzone:inzone_dev@       │  │
    │  │              localhost:7433/inzone?schema=public   │  │
    │  └────────────────────────────────────────────────────┘  │
    └──────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  4. RESULT                                               │
    ├──────────────────────────────────────────────────────────┤
    │  • Frontend running at: http://localhost:5174            │
    │  • Backend running at:  http://localhost:3002            │
    │  • Database running at: localhost:7433                   │
    │  • All isolated from main workspace and other worktrees  │
    └──────────────────────────────────────────────────────────┘
```

### 3.2 Flow B: DevContainer Development

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLOW B: DEVCONTAINER DEVELOPMENT                                │
└─────────────────────────────────────────────────────────────────────────────┘

   User runs: /worktree feature/auth --source master
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  1. SETUP-WORKTREE.SH (Same as Flow A)                   │
    ├──────────────────────────────────────────────────────────┤
    │  • Create git worktree                                   │
    │  • Allocate ports: 5174, 3002, 7433                      │
    │  • Start database container on HOST (port 7433)          │
    │  • Generate .env file with allocated ports               │
    │  • Generate devcontainer config with same ports          │
    │  • Register in worktree registry                         │
    └──────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  2. USER OPENS WORKTREE IN DEVCONTAINER                  │
    ├──────────────────────────────────────────────────────────┤
    │  • Opens folder: ../InZone-worktrees/feature-auth        │
    │  • VS Code/Cursor prompts: "Reopen in Container"         │
    │  • User clicks "Reopen in Container"                     │
    └──────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  3. DEVCONTAINER STARTS                                  │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  ┌─────────────────────────────────────────────────┐     │
    │  │         DevContainer (app service only)         │     │
    │  ├─────────────────────────────────────────────────┤     │
    │  │  Container Environment:                         │     │
    │  │  • VITE_DEV_PORT=5174                          │     │
    │  │  • API_PORT=3002                               │     │
    │  │  • DATABASE_URL=postgresql://inzone:inzone_dev │     │
    │  │    @host.docker.internal:7433/inzone           │     │
    │  │         ▲                                      │     │
    │  │         │                                      │     │
    │  │    Connects to HOST database via               │     │
    │  │    host.docker.internal:7433                   │     │
    │  └─────────────────────────────────────────────────┘     │
    │                         │                                │
    │                         │ Port forwarding                │
    │                         ▼                                │
    │  ┌─────────────────────────────────────────────────┐     │
    │  │  Forwarded Ports:                               │     │
    │  │  • 5174 → localhost:5174 (frontend)            │     │
    │  │  • 3002 → localhost:3002 (backend)             │     │
    │  │  • 7433 → localhost:7433 (database - for tools)│     │
    │  └─────────────────────────────────────────────────┘     │
    └──────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  4. USER RUNS APP (Inside DevContainer)                  │
    ├──────────────────────────────────────────────────────────┤
    │  $ pnpm install                                          │
    │  $ pnpm dev                                               │
    │                                                          │
    │  App connects to database via host.docker.internal:7433  │
    │  (same database that was started on the host)            │
    └──────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────────┐
    │  5. RESULT (Same as Flow A!)                             │
    ├──────────────────────────────────────────────────────────┤
    │  • Frontend running at: http://localhost:5174            │
    │  • Backend running at:  http://localhost:3002            │
    │  • Database running at: localhost:7433 (on host)         │
    │  • All isolated from main workspace and other worktrees  │
    └──────────────────────────────────────────────────────────┘
```

### 3.3 Side-by-Side Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPARISON: Direct vs DevContainer                        │
├────────────────────────────────┬────────────────────────────────────────────┤
│         DIRECT (No Container)  │           DEVCONTAINER                      │
├────────────────────────────────┼────────────────────────────────────────────┤
│                                │                                            │
│  HOST MACHINE                  │  HOST MACHINE                              │
│  ┌──────────────────────────┐  │  ┌──────────────────────────┐              │
│  │ Database Container       │  │  │ Database Container       │              │
│  │ inzone-db-wt-feature-auth│  │  │ inzone-db-wt-feature-auth│              │
│  │ Port: 7433               │  │  │ Port: 7433               │  ◄── SAME DB │
│  └────────────┬─────────────┘  │  └────────────┬─────────────┘              │
│               │                │               │                            │
│               │ localhost:7433 │               │ host.docker.internal:7433  │
│               │                │               │                            │
│               ▼                │               ▼                            │
│  ┌──────────────────────────┐  │  ┌──────────────────────────────────────┐  │
│  │ App runs directly        │  │  │ DevContainer                         │  │
│  │                          │  │  │ ┌──────────────────────────────────┐ │  │
│  │ • Node.js process        │  │  │ │ App runs inside container       │ │  │
│  │ • Frontend: 5174         │  │  │ │                                  │ │  │
│  │ • Backend: 3002          │  │  │ │ • Node.js process               │ │  │
│  │                          │  │  │ │ • Frontend: 5174 (forwarded)    │ │  │
│  │ DATABASE_URL uses:       │  │  │ │ • Backend: 3002 (forwarded)     │ │  │
│  │ localhost:7433           │  │  │ │                                  │ │  │
│  │                          │  │  │ │ DATABASE_URL uses:              │ │  │
│  │                          │  │  │ │ host.docker.internal:7433       │ │  │
│  └──────────────────────────┘  │  │ └──────────────────────────────────┘ │  │
│                                │  └──────────────────────────────────────┘  │
│                                │                                            │
├────────────────────────────────┼────────────────────────────────────────────┤
│  SAME PORTS, SAME DATABASE     │  SAME PORTS, SAME DATABASE                 │
│  Just different DATABASE_URL   │  DevContainer is just a "wrapper"          │
│  host reference                │  around the same setup                     │
└────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 4. Port Allocation Strategy

### 4.1 Port Ranges

| Service   | Base Port | Range      | Example Allocations |
|-----------|-----------|------------|---------------------|
| Frontend  | 5173      | 5173-5199  | main: 5173, wt1: 5174, wt2: 5175 |
| Backend   | 3001      | 3001-3099  | main: 3001, wt1: 3002, wt2: 3003 |
| Database  | 7432      | 7432-7499  | main: 7432, wt1: 7433, wt2: 7434 |

### 4.2 Database Port Update

**Change from old PRD:**
- **Before:** 5435-5499 (old range)
- **After:** 7432-7499 (aligned with db-port-cleanup-prd.md)

The main workspace uses port 7432, worktrees use 7433+.

---

## 5. What setup-worktree.sh Does

### 5.1 Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SETUP-WORKTREE.SH RESPONSIBILITIES                        │
└─────────────────────────────────────────────────────────────────────────────┘

   /worktree feature/auth --source master
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  STEP 1: Git Operations                               │
    ├───────────────────────────────────────────────────────┤
    │  • git fetch origin                                   │
    │  • git branch feature/auth origin/master (if new)     │
    │  • git worktree add ../worktrees/feature-auth         │
    │    feature/auth                                       │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  STEP 2: Port Allocation                              │
    ├───────────────────────────────────────────────────────┤
    │  • Check registry for used ports                      │
    │  • Check system for ports in use                      │
    │  • Allocate:                                          │
    │    - Frontend: 5174 (first free in 5173-5199)        │
    │    - Backend:  3002 (first free in 3001-3099)        │
    │    - Database: 7433 (first free in 7432-7499)        │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  STEP 3: Start Database Container (ON HOST)          │
    ├───────────────────────────────────────────────────────┤
    │  docker run -d \                                      │
    │    --name inzone-db-wt-feature-auth \                 │
    │    -p 7433:5432 \                                     │
    │    -e POSTGRES_USER=inzone \                          │
    │    -e POSTGRES_PASSWORD=inzone_dev \                  │
    │    -e POSTGRES_DB=inzone \                            │
    │    -v inzone-db-wt-feature-auth:/var/lib/postgresql/data \
    │    postgres:16-alpine                                 │
    │                                                       │
    │  Wait for database to be ready (healthcheck)          │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  STEP 4: Generate Configuration Files                 │
    ├───────────────────────────────────────────────────────┤
    │                                                       │
    │  A) .env (for direct development)                     │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │ # Auto-generated by setup-worktree.sh          │  │
    │  │ VITE_DEV_PORT=5174                             │  │
    │  │ API_PORT=3002                                  │  │
    │  │ DATABASE_URL=postgresql://inzone:inzone_dev@  │  │
    │  │   localhost:7433/inzone?schema=public         │  │
    │  └─────────────────────────────────────────────────┘  │
    │                                                       │
    │  B) .devcontainer/devcontainer.json                   │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │ {                                              │  │
    │  │   "name": "InZone - feature-auth",            │  │
    │  │   "forwardPorts": [5174, 3002, 7433],         │  │
    │  │   "containerEnv": {                           │  │
    │  │     "VITE_DEV_PORT": "5174",                  │  │
    │  │     "API_PORT": "3002",                       │  │
    │  │     "DATABASE_URL": "postgresql://...@        │  │
    │  │       host.docker.internal:7433/inzone"      │  │
    │  │   }                                           │  │
    │  │ }                                             │  │
    │  └─────────────────────────────────────────────────┘  │
    │                                                       │
    │  C) .devcontainer/docker-compose.worktree.yml         │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │ services:                                      │  │
    │  │   app:                                         │  │
    │  │     container_name: inzone-wt-feature-auth    │  │
    │  │     environment:                              │  │
    │  │       - VITE_DEV_PORT=5174                    │  │
    │  │       - API_PORT=3002                         │  │
    │  │       - DATABASE_URL=postgresql://...@        │  │
    │  │         host.docker.internal:7433/inzone     │  │
    │  │     ports:                                    │  │
    │  │       - "5174:5174"                           │  │
    │  │       - "3002:3002"                           │  │
    │  │     extra_hosts:                              │  │
    │  │       - "host.docker.internal:host-gateway"  │  │
    │  └─────────────────────────────────────────────────┘  │
    │                                                       │
    │  Note: No db service in docker-compose!               │
    │  Database runs on host, devcontainer connects to it.  │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  STEP 5: Run Migrations                               │
    ├───────────────────────────────────────────────────────┤
    │  cd ../worktrees/feature-auth                         │
    │  pnpm install                                         │
    │  pnpm run db:migrate:deploy                           │
    │  (optional: pnpm run db:seed)                         │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  STEP 6: Register in Registry                         │
    ├───────────────────────────────────────────────────────┤
    │  ~/.inzone/worktree.json:                             │
    │  {                                                    │
    │    "id": "feature-auth",                              │
    │    "branch": "feature/auth",                          │
    │    "path": "/path/to/worktrees/feature-auth",         │
    │    "ports": {                                         │
    │      "frontend": 5174,                                │
    │      "backend": 3002,                                 │
    │      "database": 7433                                 │
    │    },                                                 │
    │    "dbContainerName": "inzone-db-wt-feature-auth",    │
    │    "appContainerName": "inzone-wt-feature-auth",      │
    │    "status": "active"                                 │
    │  }                                                    │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  STEP 7: Open in Editor                               │
    ├───────────────────────────────────────────────────────┤
    │  cursor ../worktrees/feature-auth                     │
    │                                                       │
    │  User can then:                                       │
    │  • Run directly: pnpm dev                             │
    │  • Or: Click "Reopen in Container" for devcontainer   │
    └───────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────┐
    │  OUTPUT                                               │
    ├───────────────────────────────────────────────────────┤
    │  Worktree 'feature/auth' is ready!                    │
    │                                                       │
    │  Path: ../InZone-worktrees/feature-auth               │
    │                                                       │
    │  Ports:                                               │
    │  • Frontend: http://localhost:5174                    │
    │  • Backend:  http://localhost:3002                    │
    │  • Database: localhost:7433                           │
    │                                                       │
    │  Database container: inzone-db-wt-feature-auth        │
    │  (running on host)                                    │
    │                                                       │
    │  To start the app:                                    │
    │    cd ../InZone-worktrees/feature-auth                │
    │    pnpm dev                                           │
    │                                                       │
    │  Or open in DevContainer for isolated environment.    │
    └───────────────────────────────────────────────────────┘
```

---

## 6. Files Generated by setup-worktree.sh

### 6.1 .env (for direct development)

```bash
# Auto-generated by setup-worktree.sh
# Worktree: feature/auth
# DO NOT COMMIT - use .env.example as template

# Server Ports
VITE_DEV_PORT=5174
API_PORT=3002

# Database (running on host)
DATABASE_URL=postgresql://inzone:inzone_dev@localhost:7433/inzone?schema=public

# Other settings inherited from .env.example
NODE_ENV=development
```

### 6.2 .devcontainer/devcontainer.json (for devcontainer)

```json
{
  "name": "InZone - feature-auth",
  "dockerComposeFile": ["docker-compose.yml", "docker-compose.worktree.yml"],
  "service": "app",
  "workspaceFolder": "/InZone-App",

  "forwardPorts": [5174, 3002, 7433],

  "containerEnv": {
    "VITE_DEV_PORT": "5174",
    "API_PORT": "3002",
    "DATABASE_URL": "postgresql://inzone:inzone_dev@host.docker.internal:7433/inzone?schema=public"
  },

  "postCreateCommand": "pnpm install && pnpm --filter api db:generate",
  "postStartCommand": "pnpm run db:migrate:deploy"
}
```

### 6.3 .devcontainer/docker-compose.worktree.yml (app service override)

```yaml
# Auto-generated by setup-worktree.sh
# Worktree: feature/auth
# DO NOT EDIT - regenerate with /worktree command

services:
  app:
    container_name: inzone-wt-feature-auth
    environment:
      - VITE_DEV_PORT=5174
      - API_PORT=3002
      - DATABASE_URL=postgresql://inzone:inzone_dev@host.docker.internal:7433/inzone?schema=public
    ports:
      - "5174:5174"
      - "3002:3002"
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Linux support

# NOTE: Database runs on HOST at port 7433
# Container name: inzone-db-wt-feature-auth
# Started by setup-worktree.sh, not by this compose file
```

---

## 7. Changes Required

### 7.1 What Needs to Change

| File | Change | Reason |
|------|--------|--------|
| `scripts/worktree/registry.sh` | Update database port range | 5435-5499 → 7432-7499 |
| `scripts/worktree/setup-worktree.sh` | Add host-side DB startup | Start DB container on host |
| `scripts/worktree/setup-worktree.sh` | Generate .env file | For direct development |
| `scripts/worktree/templates/docker-compose.worktree.template.yml` | Remove db service | DB runs on host, not in devcontainer |
| `scripts/worktree/templates/devcontainer.worktree.template.json` | Use host.docker.internal | Connect to host DB |
| `scripts/worktree/cleanup-worktree.sh` | Keep DB cleanup | Still need to remove per-worktree DB container |

### 7.2 What Stays the Same

| File | Reason |
|------|--------|
| `.devcontainer/devcontainer.json` (main) | Main workspace config unchanged |
| `.devcontainer/docker-compose.yml` (main) | Main workspace config unchanged |
| `scripts/worktree/find-free-port.sh` | Still allocates all 3 ports |
| `scripts/worktree/list-worktrees.sh` | Just reads registry |
| `scripts/worktree/sync-registry.sh` | Still cleans up per-worktree DB containers |

---

## 8. Detailed Implementation

### 8.1 registry.sh Updates

```bash
# BEFORE
DEFAULT_DATABASE_MIN=5435
DEFAULT_DATABASE_MAX=5499

# AFTER
DEFAULT_DATABASE_MIN=7432
DEFAULT_DATABASE_MAX=7499
```

### 8.2 setup-worktree.sh Updates

**Add function to start database container:**

```bash
start_worktree_database() {
  local worktree_id="$1"
  local db_port="$2"
  local container_name="inzone-db-wt-${worktree_id}"
  local volume_name="inzone-db-wt-${worktree_id}"

  echo "Starting database container: $container_name on port $db_port"

  # Check if container already exists
  if docker ps -a --filter "name=$container_name" --format '{{.Names}}' | grep -q "^${container_name}$"; then
    echo "Container already exists, starting it..."
    docker start "$container_name"
  else
    # Create new container
    docker run -d \
      --name "$container_name" \
      -p "${db_port}:5432" \
      -e POSTGRES_USER=inzone \
      -e POSTGRES_PASSWORD=inzone_dev \
      -e POSTGRES_DB=inzone \
      -v "${volume_name}:/var/lib/postgresql/data" \
      --health-cmd="pg_isready -U inzone -d inzone" \
      --health-interval=5s \
      --health-timeout=5s \
      --health-retries=10 \
      postgres:16-alpine
  fi

  # Wait for database to be ready
  echo "Waiting for database to be ready..."
  local max_attempts=30
  local attempt=0
  while [ $attempt -lt $max_attempts ]; do
    if docker exec "$container_name" pg_isready -U inzone -d inzone > /dev/null 2>&1; then
      echo "Database is ready!"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  echo "ERROR: Database failed to start"
  return 1
}
```

**Add function to generate .env file:**

```bash
generate_env_file() {
  local worktree_path="$1"
  local frontend_port="$2"
  local backend_port="$3"
  local database_port="$4"

  cat > "${worktree_path}/apps/api/.env" << EOF
# Auto-generated by setup-worktree.sh
# Worktree ID: ${WORKTREE_ID}
# Generated: $(date -Iseconds)

# Server Ports
VITE_DEV_PORT=${frontend_port}
API_PORT=${backend_port}

# Database (running on host at port ${database_port})
DATABASE_URL=postgresql://inzone:inzone_dev@localhost:${database_port}/inzone?schema=public

# Development settings
NODE_ENV=development
EOF

  echo "Generated .env file at ${worktree_path}/apps/api/.env"
}
```

### 8.3 Template Updates

**docker-compose.worktree.template.yml:**

```yaml
# Auto-generated by setup-worktree.sh
# Worktree: {{WORKTREE_ID}}

services:
  app:
    container_name: inzone-wt-{{WORKTREE_ID}}
    environment:
      - VITE_DEV_PORT={{FRONTEND_PORT}}
      - API_PORT={{BACKEND_PORT}}
      - DATABASE_URL=postgresql://inzone:inzone_dev@host.docker.internal:{{DATABASE_PORT}}/inzone?schema=public
    ports:
      - "{{FRONTEND_PORT}}:{{FRONTEND_PORT}}"
      - "{{BACKEND_PORT}}:{{BACKEND_PORT}}"
    extra_hosts:
      - "host.docker.internal:host-gateway"

# Database runs on HOST at port {{DATABASE_PORT}}
# Container: inzone-db-wt-{{WORKTREE_ID}}
# Managed by setup-worktree.sh, not this compose file
```

**devcontainer.worktree.template.json:**

```json
{
  "name": "InZone - {{WORKTREE_ID}}",
  "dockerComposeFile": ["docker-compose.yml", "docker-compose.worktree.yml"],
  "service": "app",
  "workspaceFolder": "/InZone-App",

  "forwardPorts": [{{FRONTEND_PORT}}, {{BACKEND_PORT}}, {{DATABASE_PORT}}],

  "containerEnv": {
    "VITE_DEV_PORT": "{{FRONTEND_PORT}}",
    "API_PORT": "{{BACKEND_PORT}}",
    "DATABASE_URL": "postgresql://inzone:inzone_dev@host.docker.internal:{{DATABASE_PORT}}/inzone?schema=public"
  },

  "postCreateCommand": "pnpm install && pnpm --filter api db:generate",
  "postStartCommand": "pnpm run db:migrate:deploy",

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "prisma.prisma"
      ]
    }
  }
}
```

---

## 9. Registry Schema (Updated)

```typescript
interface WorktreeRegistry {
  worktrees: Worktree[];
  settings: RegistrySettings;
}

interface Worktree {
  id: string;                  // Sanitized branch name (slug)
  branch: string;              // Full branch name
  sourceBranch: string;        // Branch it was created from
  path: string;                // Absolute path to worktree
  ports: {
    frontend: number;          // e.g., 5174
    backend: number;           // e.g., 3002
    database: number;          // e.g., 7433 (NEW: 7xxx range)
  };
  dbContainerName: string;     // e.g., "inzone-db-wt-feature-auth" (host container)
  appContainerName: string;    // e.g., "inzone-wt-feature-auth" (devcontainer app)
  status: 'active' | 'stopped' | 'error';
  createdAt: string;           // ISO timestamp
  lastAccessed: string;        // ISO timestamp
}

interface RegistrySettings {
  worktreeBaseDir: string;
  portRanges: {
    frontend: { min: 5173, max: 5199 };
    backend: { min: 3001, max: 3099 };
    database: { min: 7432, max: 7499 };  // UPDATED from 5435-5499
  };
}
```

---

## 10. Language Decision: TypeScript Rewrite

### 10.1 Decision

**Rewrite worktree scripts from Bash to TypeScript.**

### 10.2 Rationale

| Aspect | Bash (Current) | Python | **TypeScript (Chosen)** |
|--------|----------------|--------|-------------------------|
| **Project fit** | Okay | Poor - different ecosystem | **Excellent** - same as InZone |
| **JSON handling** | Hard (jq, error-prone) | Good | **Native** - registry is JSON |
| **Testing** | Poor (no real framework) | Good (pytest) | **Excellent** (Vitest already configured) |
| **Mocking** | Very hard | Good | **Excellent** (`vi.mock()`) |
| **Type safety** | None | Optional | **TypeScript interfaces** |
| **CI integration** | Separate setup | Separate setup | **Already configured** |
| **Dependencies** | None | pip, virtualenv | **pnpm (already used)** |

### 10.3 Key Benefits

1. **Project Consistency**
   - InZone is a Node.js/TypeScript monorepo
   - Adding Python would introduce: `requirements.txt`, `pyproject.toml`, virtual environments
   - TypeScript uses existing tooling: `pnpm`, `tsconfig.json`, same linting rules

2. **Native JSON Handling**
   ```typescript
   // TypeScript - clean and type-safe
   const registry: WorktreeRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
   registry.worktrees.push(newEntry);
   fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
   ```
   ```bash
   # Bash with jq - error-prone, hard to debug
   jq --argjson entry "$json_entry" '.worktrees += [$entry]' "$file" > tmp && mv tmp "$file"
   ```

3. **Testing Infrastructure Exists**
   - Vitest is already configured in the project
   - Same test runner for app code and scripts
   - `pnpm test` runs everything

4. **Easy Mocking**
   ```typescript
   vi.mock('child_process');
   vi.mocked(execFileSync).mockReturnValue(Buffer.from('container-id'));
   ```

5. **Precedent Exists**
   - `scripts/wait-for-db.js` already uses Node.js
   - Pattern is established in the codebase

### 10.4 Security Note

The implementation will use `execFileSync`/`execFile` (not `exec`) to prevent command injection:

```typescript
// Safe - uses execFile (no shell interpolation)
import { execFileSync } from 'child_process';
execFileSync('docker', ['run', '-d', '--name', containerName, ...]);

// Unsafe - avoid exec with interpolation
// exec(`docker run -d --name ${containerName}`); // DON'T DO THIS
```

---

## 11. TypeScript Project Structure

### 11.1 Directory Layout

```
scripts/worktree/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── types.ts                    # TypeScript interfaces
│   ├── lib/
│   │   ├── registry.ts             # Registry CRUD operations
│   │   ├── port-allocator.ts       # Port allocation logic
│   │   ├── docker.ts               # Docker container operations
│   │   ├── git.ts                  # Git worktree operations
│   │   ├── config-generator.ts     # .env and devcontainer generation
│   │   └── utils.ts                # Shared utilities
│   └── commands/
│       ├── setup.ts                # /worktree command
│       ├── cleanup.ts              # /worktree-cleanup command
│       ├── cleanup-bulk.ts         # /worktree-cleanup-bulk command
│       ├── list.ts                 # /worktree-list command
│       └── sync.ts                 # /worktree-sync command
├── __tests__/
│   ├── unit/
│   │   ├── registry.test.ts
│   │   ├── port-allocator.test.ts
│   │   ├── docker.test.ts
│   │   ├── git.test.ts
│   │   └── config-generator.test.ts
│   └── integration/
│       ├── setup.integration.test.ts
│       ├── cleanup.integration.test.ts
│       └── dual-flow.integration.test.ts
├── templates/
│   ├── docker-compose.worktree.template.yml
│   └── devcontainer.worktree.template.json
├── package.json                    # Script-specific deps (if any)
├── tsconfig.json                   # TypeScript config
└── vitest.config.ts                # Test config
```

### 11.2 Type Definitions

```typescript
// scripts/worktree/src/types.ts

export interface WorktreeRegistry {
  worktrees: Worktree[];
  settings: RegistrySettings;
}

export interface Worktree {
  id: string;
  branch: string;
  sourceBranch: string;
  path: string;
  ports: Ports;
  dbContainerName: string;
  appContainerName: string;
  status: WorktreeStatus;
  createdAt: string;
  lastAccessed: string;
}

export interface Ports {
  frontend: number;
  backend: number;
  database: number;
}

export interface RegistrySettings {
  worktreeBaseDir: string;
  portRanges: {
    frontend: PortRange;
    backend: PortRange;
    database: PortRange;
  };
}

export interface PortRange {
  min: number;
  max: number;
}

export type WorktreeStatus = 'active' | 'stopped' | 'error';

export type ServiceType = 'frontend' | 'backend' | 'database';
```

### 11.3 CLI Entry Point

```typescript
// scripts/worktree/src/index.ts

#!/usr/bin/env node
import { Command } from 'commander';
import { setup } from './commands/setup';
import { cleanup } from './commands/cleanup';
import { cleanupBulk } from './commands/cleanup-bulk';
import { list } from './commands/list';
import { sync } from './commands/sync';

const program = new Command();

program
  .name('worktree')
  .description('Manage git worktrees with isolated development environments')
  .version('2.0.0');

program
  .command('setup')
  .description('Create a new worktree with isolated ports and database')
  .option('-b, --branch <branch>', 'Branch name for the worktree')
  .option('-s, --source <branch>', 'Source branch to create from')
  .option('--no-open', 'Do not open in editor')
  .action(setup);

program
  .command('cleanup <id>')
  .description('Remove a worktree and free its resources')
  .option('-f, --force', 'Skip confirmation')
  .action(cleanup);

program
  .command('cleanup-bulk')
  .description('Remove multiple worktrees')
  .option('-a, --all', 'Remove all worktrees')
  .option('--stale <days>', 'Remove worktrees not accessed in N days')
  .option('--dry-run', 'Show what would be removed')
  .action(cleanupBulk);

program
  .command('list')
  .description('List all worktrees')
  .option('-j, --json', 'Output as JSON')
  .action(list);

program
  .command('sync')
  .description('Sync registry with filesystem')
  .option('--dry-run', 'Show orphaned entries without removing')
  .action(sync);

program.parse();
```

---

## 12. Test Strategy

### 12.1 Test Categories

| Category | Purpose | Mocking Level |
|----------|---------|---------------|
| **Unit Tests** | Test individual functions in isolation | Full mocking |
| **Integration Tests** | Test command flows end-to-end | Minimal mocking (real git, docker) |
| **Dual-Flow Tests** | Verify direct & devcontainer produce same config | No mocking |

### 12.2 Unit Test Examples

#### Port Allocator Tests

```typescript
// scripts/worktree/__tests__/unit/port-allocator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findFreePort, findAllPorts } from '../../src/lib/port-allocator';
import * as registry from '../../src/lib/registry';

vi.mock('child_process');
vi.mock('../../src/lib/registry');

describe('port-allocator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findFreePort', () => {
    it('returns base port when nothing is in use', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([]);
      // Mock execFileSync to return empty (no ports in use)

      const port = findFreePort('frontend');

      expect(port).toBe(5173);
    });

    it('skips ports reserved in registry', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([5173, 5174]);

      const port = findFreePort('frontend');

      expect(port).toBe(5175);
    });

    it('uses correct range for database (7432-7499)', () => {
      vi.mocked(registry.getUsedPorts).mockReturnValue([7432]); // main workspace

      const port = findFreePort('database');

      expect(port).toBe(7433);
    });

    it('throws when no ports available in range', () => {
      const allPorts = Array.from({ length: 27 }, (_, i) => 5173 + i);
      vi.mocked(registry.getUsedPorts).mockReturnValue(allPorts);

      expect(() => findFreePort('frontend')).toThrow('No free ports available');
    });
  });
});
```

#### Docker Operations Tests

```typescript
// scripts/worktree/__tests__/unit/docker.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startDatabase, isContainerRunning } from '../../src/lib/docker';
import { execFileSync } from 'child_process';

vi.mock('child_process');

describe('docker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startDatabase', () => {
    it('creates container with correct port mapping', async () => {
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

      await startDatabase('feature-auth', 7433);

      // Verify docker run was called with correct args
      expect(execFileSync).toHaveBeenCalledWith(
        'docker',
        expect.arrayContaining([
          'run', '-d',
          '--name', 'inzone-db-wt-feature-auth',
          '-p', '7433:5432',
        ]),
        expect.any(Object)
      );
    });
  });

  describe('isContainerRunning', () => {
    it('returns true when container is running', () => {
      vi.mocked(execFileSync).mockReturnValue(
        Buffer.from('inzone-db-wt-feature-auth\n')
      );

      expect(isContainerRunning('inzone-db-wt-feature-auth')).toBe(true);
    });

    it('returns false when container is not running', () => {
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

      expect(isContainerRunning('inzone-db-wt-feature-auth')).toBe(false);
    });
  });
});
```

#### Config Generator Tests

```typescript
// scripts/worktree/__tests__/unit/config-generator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEnvFile, generateDevcontainerConfig } from '../../src/lib/config-generator';
import fs from 'fs';

vi.mock('fs');

describe('config-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateEnvFile', () => {
    it('creates .env with localhost DATABASE_URL', () => {
      generateEnvFile('/path/to/worktree', {
        frontend: 5174,
        backend: 3002,
        database: 7433,
      });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/worktree/apps/api/.env',
        expect.stringContaining('DATABASE_URL=postgresql://inzone:inzone_dev@localhost:7433/inzone')
      );
    });

    it('includes all port environment variables', () => {
      generateEnvFile('/path/to/worktree', {
        frontend: 5174,
        backend: 3002,
        database: 7433,
      });

      const content = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      expect(content).toContain('VITE_DEV_PORT=5174');
      expect(content).toContain('API_PORT=3002');
    });
  });

  describe('generateDevcontainerConfig', () => {
    it('creates devcontainer.json with host.docker.internal', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{}');

      generateDevcontainerConfig('/path/to/worktree', 'feature-auth', {
        frontend: 5174,
        backend: 3002,
        database: 7433,
      });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        c => c[0].toString().includes('devcontainer.json')
      );
      const content = JSON.parse(writeCall![1] as string);

      expect(content.name).toBe('InZone - feature-auth');
      expect(content.forwardPorts).toEqual([5174, 3002, 7433]);
      expect(content.containerEnv.DATABASE_URL).toContain('host.docker.internal:7433');
    });

    it('creates docker-compose.worktree.yml without db service', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{}');

      generateDevcontainerConfig('/path/to/worktree', 'feature-auth', {
        frontend: 5174,
        backend: 3002,
        database: 7433,
      });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        c => c[0].toString().includes('docker-compose.worktree.yml')
      );
      const content = writeCall![1] as string;

      expect(content).toContain('app:');
      expect(content).not.toMatch(/^\s+db:/m);  // No db service
      expect(content).toContain('host.docker.internal:host-gateway');
    });
  });
});
```

### 12.3 Integration Tests

```typescript
// scripts/worktree/__tests__/integration/setup.integration.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('worktree setup integration', () => {
  const testBranch = `test/integration-${Date.now()}`;
  let worktreePath: string | null = null;

  afterAll(() => {
    // Cleanup
    if (worktreePath) {
      try {
        execFileSync('node', [
          'scripts/worktree/dist/index.js', 'cleanup', testBranch, '--force'
        ], { encoding: 'utf-8', stdio: 'pipe' });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('creates worktree with all resources', () => {
    const result = execFileSync('node', [
      'scripts/worktree/dist/index.js', 'setup',
      '--branch', testBranch,
      '--source', 'master',
      '--no-open'
    ], { encoding: 'utf-8' });

    // Extract worktree path
    const pathMatch = result.match(/Path:\s+(\S+)/);
    expect(pathMatch).toBeTruthy();
    worktreePath = pathMatch![1];

    // Verify git worktree created
    const gitWorktrees = execFileSync('git', ['worktree', 'list'], { encoding: 'utf-8' });
    expect(gitWorktrees).toContain(testBranch);

    // Verify .env file with localhost
    const envPath = path.join(worktreePath!, 'apps/api/.env');
    expect(fs.existsSync(envPath)).toBe(true);
    const envContent = fs.readFileSync(envPath, 'utf-8');
    expect(envContent).toContain('localhost:74'); // 7432-7499 range

    // Verify devcontainer.json with host.docker.internal
    const devcontainerPath = path.join(worktreePath!, '.devcontainer/devcontainer.json');
    expect(fs.existsSync(devcontainerPath)).toBe(true);
    const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
    expect(devcontainer.containerEnv.DATABASE_URL).toContain('host.docker.internal');

    // Verify database container on host
    const dockerPs = execFileSync('docker', [
      'ps', '--filter', 'name=inzone-db-wt-', '--format', '{{.Names}}'
    ], { encoding: 'utf-8' });
    expect(dockerPs).toContain('inzone-db-wt-');

    // Verify registry entry
    const registryPath = path.join(os.homedir(), '.inzone/worktree.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    const entry = registry.worktrees.find((w: any) => w.branch === testBranch);
    expect(entry).toBeDefined();
    expect(entry.ports.database).toBeGreaterThanOrEqual(7432);
  });
});
```

### 12.4 Dual-Flow Test

```typescript
// scripts/worktree/__tests__/integration/dual-flow.integration.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('dual development flow', () => {
  it('generates matching ports in .env and devcontainer', () => {
    const worktreePath = process.env.TEST_WORKTREE_PATH;
    if (!worktreePath) {
      console.log('Skipping: TEST_WORKTREE_PATH not set');
      return;
    }

    // Read .env (for direct development)
    const envContent = fs.readFileSync(
      path.join(worktreePath, 'apps/api/.env'),
      'utf-8'
    );
    const envDbPort = envContent.match(/localhost:(\d+)/)?.[1];

    // Read devcontainer.json (for container development)
    const devcontainer = JSON.parse(fs.readFileSync(
      path.join(worktreePath, '.devcontainer/devcontainer.json'),
      'utf-8'
    ));
    const containerDbPort = devcontainer.containerEnv.DATABASE_URL.match(/:(\d+)\//)?.[1];

    // Same port for both flows!
    expect(envDbPort).toBe(containerDbPort);

    // But different hosts
    expect(envContent).toContain('localhost');
    expect(devcontainer.containerEnv.DATABASE_URL).toContain('host.docker.internal');
  });
});
```

### 12.5 Test Commands

```bash
# Run all worktree tests
pnpm test scripts/worktree

# Run only unit tests
pnpm test scripts/worktree/__tests__/unit

# Run only integration tests (requires Docker)
pnpm test scripts/worktree/__tests__/integration

# Run with coverage
pnpm test scripts/worktree --coverage

# Run in watch mode
pnpm test scripts/worktree --watch
```

---

## 13. Implementation Checklist (Updated)

### Phase 0: TypeScript Setup (P0)

- [ ] Create `scripts/worktree/package.json`
  - [ ] Add dependencies: `commander`, `chalk` (optional)
  - [ ] Add devDependencies: `typescript`, `vitest`, `@types/node`
- [ ] Create `scripts/worktree/tsconfig.json`
- [ ] Create `scripts/worktree/vitest.config.ts`
- [ ] Create directory structure: `src/`, `src/lib/`, `src/commands/`, `__tests__/`
- [ ] Create `src/types.ts` with interfaces
- [ ] Add build script to root `package.json`

### Phase 1: Core Library (P0)

- [ ] Implement `src/lib/registry.ts`
  - [ ] `initRegistry()` - Create registry if not exists
  - [ ] `loadRegistry()` - Load and parse JSON
  - [ ] `saveRegistry()` - Write JSON to disk
  - [ ] `addWorktree()` - Add new entry
  - [ ] `removeWorktree()` - Remove entry by ID
  - [ ] `getWorktree()` - Get entry by ID
  - [ ] `getUsedPorts()` - Get all used ports by service type
  - [ ] Port ranges: database 7432-7499 (updated from 5435-5499)

- [ ] Implement `src/lib/port-allocator.ts`
  - [ ] `findFreePort(serviceType)` - Find first available port
  - [ ] `findAllPorts()` - Allocate frontend, backend, database ports
  - [ ] `isPortInUse(port)` - Check if port is in use by system
  - [ ] Use `execFileSync` for system port checks (safe)

- [ ] Implement `src/lib/docker.ts`
  - [ ] `startDatabase(worktreeId, port)` - Start DB container on host
  - [ ] `stopDatabase(worktreeId)` - Stop DB container
  - [ ] `removeDatabase(worktreeId)` - Remove container and volume
  - [ ] `isContainerRunning(name)` - Check container status
  - [ ] `waitForDatabase(containerName)` - Health check loop
  - [ ] Use `execFileSync` for docker commands (safe, no shell injection)

- [ ] Implement `src/lib/git.ts`
  - [ ] `createWorktree(path, branch)` - git worktree add
  - [ ] `removeWorktree(path)` - git worktree remove
  - [ ] `listWorktrees()` - git worktree list
  - [ ] `createBranch(name, source)` - git branch
  - [ ] Use `execFileSync` for git commands (safe)

- [ ] Implement `src/lib/config-generator.ts`
  - [ ] `generateEnvFile(path, ports)` - Create .env with localhost:PORT
  - [ ] `generateDevcontainerConfig(path, id, ports)` - Create devcontainer.json with host.docker.internal:PORT
  - [ ] `generateDockerComposeOverride(path, id, ports)` - Create docker-compose.worktree.yml (no db service)

### Phase 2: Commands (P0)

- [ ] Implement `src/commands/setup.ts`
  - [ ] Parse options (branch, source, no-open)
  - [ ] Validate branch name
  - [ ] Check for existing worktree
  - [ ] Create git worktree
  - [ ] Allocate ports
  - [ ] Start database on host
  - [ ] Generate .env file
  - [ ] Generate devcontainer config
  - [ ] Register in registry
  - [ ] Open in editor (unless --no-open)

- [ ] Implement `src/commands/list.ts`
  - [ ] Load registry
  - [ ] Format output (table or JSON)

- [ ] Implement `src/commands/cleanup.ts`
  - [ ] Resolve worktree by ID or branch
  - [ ] Confirm with user (unless --force)
  - [ ] Stop and remove database container
  - [ ] Remove git worktree
  - [ ] Remove from registry

- [ ] Implement `src/commands/cleanup-bulk.ts`
  - [ ] Support --all, --stale, --dry-run
  - [ ] Interactive selection
  - [ ] Batch cleanup

- [ ] Implement `src/commands/sync.ts`
  - [ ] Scan registry entries
  - [ ] Verify each entry exists on disk
  - [ ] Find orphaned entries
  - [ ] Remove orphaned entries (unless --dry-run)

### Phase 3: Templates (P0)

- [ ] Update `templates/docker-compose.worktree.template.yml`
  - [ ] Remove `db:` service
  - [ ] Use `host.docker.internal:{{DATABASE_PORT}}`
  - [ ] Add `extra_hosts` for Linux support

- [ ] Update `templates/devcontainer.worktree.template.json`
  - [ ] Use `host.docker.internal:{{DATABASE_PORT}}`
  - [ ] Include all ports in `forwardPorts`

### Phase 4: Unit Tests (P1)

- [ ] `__tests__/unit/registry.test.ts`
  - [ ] Test CRUD operations
  - [ ] Test port range queries
  - [ ] Test file creation/loading

- [ ] `__tests__/unit/port-allocator.test.ts`
  - [ ] Test base port allocation
  - [ ] Test skipping reserved ports
  - [ ] Test skipping system ports
  - [ ] Test database range 7432-7499
  - [ ] Test no ports available error

- [ ] `__tests__/unit/docker.test.ts`
  - [ ] Test container creation with correct port
  - [ ] Test starting existing container
  - [ ] Test health check waiting
  - [ ] Test container status check

- [ ] `__tests__/unit/config-generator.test.ts`
  - [ ] Test .env with localhost
  - [ ] Test devcontainer with host.docker.internal
  - [ ] Test no db service in docker-compose

### Phase 5: Integration Tests (P2)

- [ ] `__tests__/integration/setup.integration.test.ts`
  - [ ] Test full setup flow
  - [ ] Verify all resources created
  - [ ] Verify database on host
  - [ ] Verify registry entry

- [ ] `__tests__/integration/cleanup.integration.test.ts`
  - [ ] Test cleanup removes all resources
  - [ ] Test cleanup frees ports

- [ ] `__tests__/integration/dual-flow.integration.test.ts`
  - [ ] Verify .env and devcontainer have same ports
  - [ ] Verify different hosts (localhost vs host.docker.internal)

### Phase 6: Migration & Cleanup (P2)

- [ ] Delete old bash scripts (after TypeScript is working)
  - [ ] `scripts/worktree/setup-worktree.sh`
  - [ ] `scripts/worktree/registry.sh`
  - [ ] `scripts/worktree/find-free-port.sh`
  - [ ] `scripts/worktree/cleanup-worktree.sh`
  - [ ] `scripts/worktree/cleanup-bulk.sh`
  - [ ] `scripts/worktree/sync-registry.sh`
  - [ ] `scripts/worktree/list-worktrees.sh`

- [ ] Delete old bash tests
  - [ ] `tests/worktree/*.test.sh`

- [ ] Update Claude commands to use new TypeScript CLI
  - [ ] `.claude/commands/worktree.md`
  - [ ] `.claude/commands/worktree-list.md`
  - [ ] `.claude/commands/worktree-cleanup.md`
  - [ ] `.claude/commands/worktree-cleanup-bulk.md`
  - [ ] `.claude/commands/worktree-sync.md`

---

## 14. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| TypeScript rewrite complete | All commands work via `node scripts/worktree/dist/index.js` |
| Database ports in 7xxx range | All new worktrees use 7432-7499 |
| Host-side DB containers | `docker ps \| grep inzone-db-wt-` shows worktree DBs |
| Direct development works | `pnpm dev` in worktree connects to localhost:7433+ |
| DevContainer works | DevContainer connects to same host DB |
| Same ports both ways | Frontend/Backend/DB ports identical in both flows |
| .env generated | Each worktree has .env with correct ports |
| Unit test coverage | > 80% coverage on lib/ modules |
| Integration tests pass | All integration tests pass with real Docker |

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Host DB container name conflicts | DB won't start | Use unique names: `inzone-db-wt-{id}` |
| Port 7432 conflict with main workspace | Worktree can't allocate | Start allocating from 7433 for worktrees, reserve 7432 for main |
| Linux `host.docker.internal` not available | DevContainer can't reach host DB | Add `extra_hosts: host.docker.internal:host-gateway` |
| .env file committed accidentally | Credentials in git | Add to .gitignore, use .env.example |
| TypeScript migration breaks existing workflows | Users can't create worktrees | Keep bash scripts until TypeScript is fully tested |
| Command injection in shell commands | Security vulnerability | Use `execFileSync` instead of `exec` |

---

## 16. Example: Complete Worktree Session

```bash
# User creates a worktree
$ /worktree feature/authentication --source master

Creating worktree for 'feature/authentication' from 'master'...

✓ Created git worktree at ../InZone-worktrees/feature-authentication
✓ Allocated ports: Frontend=5174, Backend=3002, Database=7433
✓ Started database container: inzone-db-wt-feature-authentication (port 7433)
✓ Generated .env file
✓ Generated devcontainer config
✓ Registered worktree in registry
✓ Opening in Cursor...

Worktree 'feature/authentication' is ready!

┌─────────────────────────────────────────────────────────┐
│ Path:      ../InZone-worktrees/feature-authentication   │
│ Frontend:  http://localhost:5174                        │
│ Backend:   http://localhost:3002                        │
│ Database:  localhost:7433                               │
│ DB Container: inzone-db-wt-feature-authentication       │
└─────────────────────────────────────────────────────────┘

To start developing:
  Option A (Direct): cd ../InZone-worktrees/feature-authentication && pnpm dev
  Option B (DevContainer): Click "Reopen in Container" in VS Code/Cursor

# User can now work directly OR in devcontainer - both use same ports!
```

---

## Appendix A: Migration from Bash Scripts

### Current Bash Scripts → New TypeScript Modules

| Bash Script | TypeScript Module | Notes |
|-------------|-------------------|-------|
| `registry.sh` | `src/lib/registry.ts` | JSON handling much cleaner |
| `find-free-port.sh` | `src/lib/port-allocator.ts` | Type-safe port ranges |
| `setup-worktree.sh` | `src/commands/setup.ts` | Uses commander for CLI |
| `cleanup-worktree.sh` | `src/commands/cleanup.ts` | Same functionality |
| `cleanup-bulk.sh` | `src/commands/cleanup-bulk.ts` | Interactive selection via prompts |
| `sync-registry.sh` | `src/commands/sync.ts` | Orphan detection |
| `list-worktrees.sh` | `src/commands/list.ts` | Table/JSON output |

### Claude Command Updates

```markdown
<!-- .claude/commands/worktree.md (updated) -->
---
name: worktree
description: Setup a new git worktree with isolated dev container and unique ports
arguments:
  - name: branch
    required: false
  - name: source
    required: false
---

Execute: node scripts/worktree/dist/index.js setup --branch "$branch" --source "$source"
```

---

*Document Version: 2.1*
*Created: 2026-02-01*
*Updated: 2026-02-01 - Added TypeScript rewrite decision and test strategy*
*Supersedes: worktree-setup-prd.md v1.1*
