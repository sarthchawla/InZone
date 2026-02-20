# InZone

A Trello-like todo board application with customizable boards and swimlanes.

## Quick Start

```bash
pnpm install
pnpm dev
```

This will:
- Start PostgreSQL in Docker (port 7432)
- Wait for database to be ready
- Run migrations automatically
- Launch both API and Web servers

Once running:
- **Web UI:** http://localhost:5173
- **API:** http://localhost:3001

## Prerequisites

- Node.js >= 20.0.0
- pnpm 9.15.4
- Docker (for database)

```bash
# Install pnpm if needed
corepack enable && corepack prepare pnpm@9.15.4 --activate
```

## Database Management

The database runs in Docker with a unified configuration that works identically in local development and DevContainer environments.

```bash
# Start database (auto-runs migrations)
pnpm db:start

# Stop database (data preserved)
pnpm db:stop

# View database logs
pnpm db:logs

# Reset database (destroy + recreate + seed)
pnpm db:reset

# Open Prisma Studio (database GUI)
pnpm db:studio
```

**Database URL:** `postgresql://inzone:inzone_dev@localhost:7432/inzone`

## Git Worktrees (Parallel Development)

Work on multiple branches simultaneously with isolated environments. Each worktree gets its own database container running on the host, enabling both direct development and DevContainer workflows.

```bash
# Create a new worktree with isolated environment
pnpm worktree:setup --branch feature/my-feature

# List all worktrees with their port configurations
pnpm worktree:list

# Remove a worktree (frees ports and database)
pnpm worktree:cleanup feature-my-feature

# Remove multiple worktrees interactively
pnpm worktree:cleanup-bulk

# Sync registry with filesystem (remove orphaned entries)
pnpm worktree:sync
```

**What `worktree:setup` does:**
1. Creates a git worktree for the branch
2. Allocates unique ports (frontend, backend, database)
3. Starts an isolated PostgreSQL container on the host
4. Generates `.env` and DevContainer configuration files
5. Runs database migrations

**Port Ranges:**
- Frontend: 5173-5199
- Backend: 3001-3099
- Database: 7432-7499

**Two Development Flows:**
- **Direct:** `cd /path/to/worktree && pnpm dev` (uses localhost)
- **DevContainer:** Open in VS Code/Cursor and "Reopen in Container" (uses host.docker.internal)

| Command | Description |
|---------|-------------|
| `pnpm worktree:setup --branch <name>` | Create new worktree with isolated environment |
| `pnpm worktree:list` | List all worktrees with ports and status |
| `pnpm worktree:cleanup <id>` | Remove worktree and free resources |
| `pnpm worktree:cleanup-bulk` | Interactive bulk removal of worktrees |
| `pnpm worktree:sync` | Sync registry with actual filesystem |

## Running the Application

```bash
# Start everything (database + app)
pnpm dev

# Start app only (assumes database is running)
pnpm dev:app

# Run services individually
pnpm --filter api dev    # Backend only (port 3001)
pnpm --filter web dev    # Frontend only (port 5173)
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start database + all services (recommended) |
| `pnpm dev:app` | Start app only (assumes DB running) |
| `pnpm build` | Build for production |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run linting |
| `pnpm format` | Format code with Prettier |
| `pnpm clean` | Clean build artifacts and node_modules |
| `pnpm db:start` | Start database container + run migrations |
| `pnpm db:stop` | Stop database container (data preserved) |
| `pnpm db:reset` | Reset database (destroy + recreate + seed) |
| `pnpm db:logs` | Stream database container logs |
| `pnpm db:migrate:dev` | Create new migration |
| `pnpm db:migrate:deploy` | Run pending migrations (for CI/production) |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |

## Ralph - Autonomous Development

This project includes **Ralph**, an autonomous development loop that uses Claude Code to work through PRD tasks automatically.

```bash
# Create your prompt file
cp scripts/ralph/PROMPT.md.example PROMPT.md

# Run Ralph (inside devcontainer for safety)
./scripts/ralph/ralph.sh
```

See [Ralph Documentation](scripts/ralph/RALPH.md) for details.

## Documentation

- [Product Requirements Document](.claude/plans/inzone-prd.md)
- [Ralph Loop - Autonomous Development](scripts/ralph/RALPH.md)
