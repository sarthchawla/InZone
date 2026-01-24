# InZone

A Trello-like todo board application with customizable boards and swimlanes.

## Quick Start

```bash
./scripts/start.sh
```

This single command will:
- Start PostgreSQL if not running
- Create the database if needed (using your local user)
- Create `.env` with correct DATABASE_URL
- Install dependencies
- Run migrations and seed data
- Launch both API and Web servers

Once running:
- **Web UI:** http://localhost:5173
- **API:** http://localhost:3001

## Prerequisites

- Node.js >= 20.0.0
- pnpm 9.15.4
- PostgreSQL

```bash
# Install pnpm if needed
corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install PostgreSQL on macOS (if not installed)
brew install postgresql@14
brew services start postgresql@14
```

## Manual Setup

If you prefer to set up manually:

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Setup

```bash
# Start PostgreSQL
brew services start postgresql@14

# Create database (using psql)
psql -d postgres -c "CREATE DATABASE inzone;"

# Configure environment (uses your local username, no password needed)
echo 'DATABASE_URL="postgresql://$(whoami)@localhost:5432/inzone?schema=public"' > apps/api/.env
echo 'PORT=3001' >> apps/api/.env
echo 'NODE_ENV=development' >> apps/api/.env

# Run migrations
pnpm db:migrate:dev

# Seed sample data (optional)
pnpm db:seed
```

### 3. Run the Application

```bash
# Run everything
pnpm dev

# Or run services individually
pnpm --filter api dev    # Backend only (port 3001)
pnpm --filter web dev    # Frontend only (port 5173)
```

## Available Commands

| Command | Description |
|---------|-------------|
| `./scripts/start.sh` | Full setup and launch (recommended) |
| `pnpm dev` | Start all services |
| `pnpm build` | Build for production |
| `pnpm lint` | Run linting |
| `pnpm format` | Format code with Prettier |
| `pnpm db:migrate:dev` | Run database migrations |
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
