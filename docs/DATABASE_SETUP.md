# InZone Database Setup Guide

## Quick Reference: DATABASE_URL

| Environment | DATABASE_URL |
|-------------|--------------|
| Devcontainer | `postgresql://inzone:inzone_dev@db:5432/inzone?schema=public` |
| Local PostgreSQL | `postgresql://YOUR_USERNAME@localhost:5432/inzone?schema=public` |
| Docker Standalone | `postgresql://inzone:inzone_dev@localhost:5434/inzone?schema=public` |

## Setup Options

### Option 1: Devcontainer (Recommended)

The easiest way to get started. PostgreSQL runs alongside your dev environment.

1. Open project in VS Code
2. `Cmd+Shift+P` → "Dev Containers: Reopen in Container"
3. Wait for container to build
4. Run: `./scripts/start.sh`

The DATABASE_URL is automatically set via `devcontainer.json`.

### Option 2: Local PostgreSQL

For development without Docker.

**macOS:**
```bash
# Install
brew install postgresql@14

# Start
brew services start postgresql@14

# Run app (auto-creates database)
./scripts/start.sh
```

**Linux:**
```bash
# Install
sudo apt install postgresql postgresql-client

# Start
sudo systemctl start postgresql

# Run app
./scripts/start.sh
```

### Option 3: Docker Database Only

Use Docker for PostgreSQL but run the app locally.

```bash
# Start PostgreSQL container
docker compose -f docker/docker-compose.db.yml up -d

# Create apps/api/.env with:
DATABASE_URL="postgresql://inzone:inzone_dev@localhost:5434/inzone?schema=public"
PORT=3001
NODE_ENV=development

# Run app
pnpm dev
```

## Environment File Template

Create `apps/api/.env`:

```env
# Database connection string (choose one from Quick Reference above)
DATABASE_URL="postgresql://..."

# Server configuration
PORT=3001
NODE_ENV=development
```

## Database Commands

```bash
# Generate Prisma client
pnpm --filter api db:generate

# Run migrations
pnpm db:migrate:dev

# Seed database
pnpm db:seed

# Open Prisma Studio
pnpm --filter api db:studio
```

## Connecting with pgAdmin

| Field | Devcontainer | Local | Docker Standalone |
|-------|--------------|-------|-------------------|
| Host | `db` (or `localhost:5434` from host) | `localhost` | `localhost` |
| Port | `5432` | `5432` | `5434` |
| Database | `inzone` | `inzone` | `inzone` |
| Username | `inzone` | Your username | `inzone` |
| Password | `inzone_dev` | (none) | `inzone_dev` |
