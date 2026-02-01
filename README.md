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
| `pnpm lint` | Run linting |
| `pnpm format` | Format code with Prettier |
| `pnpm db:start` | Start database container + run migrations |
| `pnpm db:stop` | Stop database container (data preserved) |
| `pnpm db:reset` | Reset database (destroy + recreate + seed) |
| `pnpm db:logs` | Stream database container logs |
| `pnpm db:migrate:dev` | Create new migration |
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
