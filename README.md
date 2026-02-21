# InZone

A Trello-like kanban board application with customizable boards, swimlane columns, drag-and-drop cards, and rich text descriptions. Built as a pnpm monorepo with Turborepo.

## Features

- **Multiple boards** with customizable columns (kanban-style swimlanes)
- **Drag-and-drop** todo cards between columns using @dnd-kit
- **Rich text descriptions** powered by Tiptap editor
- **Labels and tags** for organizing todos
- **Board templates** for quick setup
- **Detail panel** -- Jira-like side panel for viewing/editing items
- **Context menus and keyboard shortcuts**
- **Mobile responsive** with bottom sheets and adaptive layouts
- **Toast notifications** with undo support
- **Authentication** via Better Auth

## Tech Stack

### Frontend (`apps/web/`)

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | TailwindCSS 3 |
| Server State | TanStack React Query |
| Drag & Drop | @dnd-kit |
| Rich Text | Tiptap |
| Animations | Framer Motion |
| Routing | React Router DOM v7 |
| Auth | Better Auth |
| Icons | Lucide React |
| Analytics | Vercel Analytics + Speed Insights |

### Backend (`apps/api/`)

| Category | Technology |
|----------|------------|
| Framework | Express 4 + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Docker local / Neon production) |
| Auth | Better Auth |
| Validation | Zod |

**API architecture:** routes -> services -> Prisma (layered)

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

## Testing

### Unit and Integration Tests

Both frontend and backend use **Vitest**. Frontend tests use **React Testing Library** and **MSW** for API mocking.

```bash
# Run all tests
pnpm test

# Frontend tests with coverage
cd apps/web && pnpm vitest run --coverage

# Backend tests
cd apps/api && pnpm test
```

**Frontend coverage threshold: 80%** (enforced in CI). Use `fireEvent` over `userEvent.type()` for inputs with special characters to avoid flaky CI behavior.

### BDD / E2E Tests

- **Frontend:** Playwright + playwright-bdd (`pnpm test:bdd` in `apps/web/`)
- **Backend:** Vitest + Supertest + Cucumber.js (`pnpm test:bdd` in `apps/api/`)

### Architecture Tests

Both apps include **archunit** architecture tests that enforce layering rules and dependency constraints.

## CI/CD

**GitHub Actions workflows:**

| Workflow | Purpose |
|----------|---------|
| `ci-frontend` | Lint, test, and coverage check (80% threshold) for `apps/web` |
| `ci-backend` | Lint and test for `apps/api` |
| `architecture-tests` | Enforce layering rules in both apps |
| `bdd-frontend` | Playwright BDD tests |
| `bdd-backend` | Backend BDD tests |
| `vercel-deploy` | Deploy to Vercel |
| `devcontainer` | Validate DevContainer builds |
| `neon-cleanup` | Clean up Neon preview branches |
| `worktree-scripts` | Validate worktree tooling |

**Deployment:** Vercel (frontend + serverless) with Neon Serverless Postgres for production database.

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

## Ralph - Autonomous Development

This project includes **Ralph**, an autonomous development loop that uses Claude Code to work through PRD tasks automatically.

```bash
# Create your prompt file
cp scripts/ralph/PROMPT.md.example PROMPT.md

# Run Ralph (inside devcontainer for safety)
./scripts/ralph/ralph.sh
```

See [Ralph Documentation](scripts/ralph/RALPH.md) for details.

## Future Vision: AI Agent Platform

InZone is evolving into an AI-powered autonomous task execution platform. The core idea: each board gets an AI agent that automatically picks up todos and executes them using connected tools (MCP servers), then delivers results back to the card and to notification channels like Telegram or Slack.

**How it works**: Create a todo on your Research board, and the agent searches the web, compares options, writes a structured report, updates your card, and sends you a Telegram summary -- all automatically.

See the full **[Roadmap](ROADMAP.md)** for development phases, architecture diagrams, and use case examples.

See the **[Architecture Document](.claude/plans/ai-agent-platform-architecture.md)** for technical details on the agent platform design.

## Documentation

- [Product Requirements Document](.claude/plans/inzone-prd.md)
- [Roadmap](ROADMAP.md)
- [Architecture Document](.claude/plans/ai-agent-platform-architecture.md)
- [Ralph Loop - Autonomous Development](scripts/ralph/RALPH.md)
- [Wiki](docs/wiki/Home.md)
