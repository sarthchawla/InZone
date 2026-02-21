# InZone Project Guidelines

## Package Manager
- Always use `pnpm` (not npm, npx, or yarn).

## Quick Start (Local Dev)
```bash
pnpm install                    # Install all dependencies
pnpm run db:start               # Start PostgreSQL (Docker), run migrations, generate Prisma client, seed
pnpm run dev:app                # Start both frontend (port 5173) and API (port 3001) via Turborepo
```
- Full `pnpm run dev` also starts DB automatically (with worktree detection).
- PostgreSQL runs on **port 7432** (not default 5432) via `docker/docker-compose.db.yml`.
- Copy `apps/api/.env.example` -> `apps/api/.env` and `apps/web/.env.example` -> `apps/web/.env` for local config.
- Set `VITE_AUTH_BYPASS=true` in API `.env` to skip Google OAuth during local development.

## Monorepo Structure
- `apps/web/` - React frontend (Vite + React 18 + TypeScript + TailwindCSS + TanStack Query + dnd-kit + Tiptap + Framer Motion + Better Auth)
- `apps/api/` - Express backend (TypeScript + Prisma + PostgreSQL + Better Auth + Zod validation)
- All frontend source is under `apps/web/src/`
- All backend source is under `apps/api/src/`
- Tests are co-located with source files (e.g., `Component.test.tsx` next to `Component.tsx`)
- BDD tests: `apps/web/tests/bdd/` (Playwright + playwright-bdd) and `apps/api/tests/bdd/` (Cucumber.js + supertest)

### Frontend Source Layout (`apps/web/src/`)
- `components/` - React components organized by domain: `board/`, `column/`, `todo/`, `label/`, `richtext/`, `ui/`
- `hooks/` - Custom hooks (useBoards, useTodos, useColumns, useLabels, useBoardDnD, useAuth, etc.)
- `contexts/` - React contexts (AuthContext, ToastContext)
- `pages/` - Page-level components (LoginPage)
- `lib/` - Utilities (auth-client, board-dnd-utils, richtext-utils)
- `api/` - API client layer
- `test/` - Test utilities (MSW mock server, custom render wrapper with providers)
- `architecture/` - Architecture tests (archunit)
- `types/` - TypeScript type definitions

### Backend Source Layout (`apps/api/src/`)
- `routes/` - Express route handlers (boards, columns, todos, labels, templates)
- `services/` - Business logic services (board, column, todo, label, template)
- `middleware/` - Express middleware (auth, errorHandler, validation)
- `lib/` - Shared utilities (prisma client, auth config, CORS origins)
- `validators/` - Zod validation schemas
- `test/` - Test utilities (prismaMock with vitest-mock-extended, supertest app, factories)
- `architecture/` - Architecture tests (archunit)

### Database
- Prisma schema: `apps/api/prisma/schema.prisma`
- Domain models: User, Board, Column, Todo, Label, BoardTemplate
- Enums: Priority (LOW/MEDIUM/HIGH/URGENT), SourceType (JIRA/SLACK/TEAMS/OUTLOOK/MANUAL)
- Soft deletes via `isDeleted`/`deletedAt` fields on Board, Column, Todo

## Testing

### Coverage Thresholds
- **Frontend**: 80% line coverage (enforced in CI via `.github/workflows/ci-frontend.yml`). NEVER lower this threshold unless the user explicitly asks. Add more tests to meet coverage instead.
- **Backend**: 80% line coverage (enforced in CI via `.github/workflows/ci-backend.yml`). Same rule applies.

### Test Commands
```bash
# Frontend unit tests
cd apps/web && pnpm vitest run --coverage        # Run with coverage check
cd apps/web && pnpm vitest --watch                # Watch mode

# Backend unit tests
cd apps/api && pnpm vitest run --coverage         # Run with coverage check
cd apps/api && pnpm vitest --watch                # Watch mode

# BDD / E2E tests
cd apps/web && pnpm test:bdd                      # Frontend BDD (Playwright + playwright-bdd)
cd apps/api && pnpm test:bdd                      # Backend BDD (Cucumber.js)

# Architecture tests
pnpm run test:arch                                # Run all arch tests (both apps)
cd apps/web && pnpm test:arch                     # Frontend only
cd apps/api && pnpm test:arch                     # Backend only

# Full suite via Turborepo
pnpm run test                                     # All unit tests
pnpm run lint                                     # All linting
pnpm run build                                    # Build all (generates Prisma client first)
```

### Testing Patterns & Gotchas
- Use `fireEvent` instead of `userEvent.type()` for tests that set input values with special characters, long strings, or whitespace -- `userEvent` can produce garbled input on Linux CI due to `autoFocus` interference.
- Frontend tests use a custom `render` from `src/test/utils.tsx` that wraps components with QueryClientProvider, BrowserRouter, and ToastProvider. Always import `{ render }` from `../test/utils` (not `@testing-library/react` directly).
- Frontend API mocking uses MSW (Mock Service Worker). Handlers are in `src/test/mocks/handlers.ts`, server setup in `src/test/mocks/server.ts`.
- Backend tests mock Prisma via `vitest-mock-extended` -- import `prismaMock` from `src/test/prismaMock.ts`. Use factories from `src/test/factories.ts` for test data.
- Hook tests use `createQueryClientWrapper()` from `src/test/utils.tsx` with `renderHook`.

## Database Commands
```bash
pnpm run db:start              # Start Docker PostgreSQL + migrate + generate + seed
pnpm run db:stop               # Stop PostgreSQL container
pnpm run db:reset              # Destroy volume and recreate from scratch
pnpm run db:migrate:dev        # Create new migration (Prisma)
pnpm run db:migrate:deploy     # Apply pending migrations
pnpm run db:generate           # Regenerate Prisma client after schema changes
pnpm run db:seed               # Seed database
pnpm run db:studio             # Open Prisma Studio GUI
```

## CI Workflows
- `ci-frontend.yml` - Lint + Build + Unit tests with 80% coverage gate (triggers on `apps/web/**` changes)
- `ci-backend.yml` - Lint + Build + Unit tests with 80% coverage gate (triggers on `apps/api/**` changes)
- `architecture-tests.yml` - Architecture constraint tests (archunit)
- `bdd-frontend.yml` - Frontend E2E BDD tests (Playwright)
- `bdd-backend.yml` - Backend BDD tests (Cucumber.js)
- `vercel-deploy.yml` - Vercel deployment
- `neon-cleanup.yml` - Neon database branch cleanup

## Worktree Support
- This repo supports git worktrees for parallel development.
- Use `pnpm run worktree:setup` to create a new worktree with isolated Docker DB.
- Each worktree gets its own PostgreSQL container on a unique port via `.devcontainer/docker-compose.worktree.yml`.

## Deployment (Vercel + Neon)
- Frontend and API deploy as a single Vercel project (monorepo single deploy). Config in `vercel.json`.
- API runs as a Vercel serverless function at `api/index.ts` (repo root), wrapping Express.
- Better Auth handler **must** be mounted BEFORE `express.json()` middleware (it needs the raw request body).
- Vercel auto-provides `VERCEL_URL` env var for each deployment -- used for dynamic CORS/trusted origins on preview deploys.
- Prisma uses `DATABASE_URL` (pooled, Neon) and `DIRECT_URL` (direct, Neon) in schema. Both must be set everywhere Prisma runs.
- Production environment variables are managed in the Vercel Dashboard (see `.claude/plans/done/deployment-prd.md` for the full list).

## CI Gotchas & Patterns
- `DIRECT_URL` must be set in all CI workflows that run Prisma commands (same value as `DATABASE_URL` in CI since CI uses standard Postgres, not Neon pooler).
- `prisma generate` must run before `tsc` in the API build step. The `build` script already handles this: `"build": "prisma generate && tsc"`.
- `pnpm --filter shared build || true` is used in CI before frontend build/test steps (shared package may not always exist).
- Vitest `branches` coverage threshold is **75%** (not 80%) for frontend because drag-and-drop handlers in BoardView.tsx are complex integration-level code better tested by E2E. Lines/functions/statements remain at 80%.
- Frontend vitest config sets `VITE_AUTH_BYPASS=true` in test env to skip auth in unit tests.

## Plans Directory Structure (`.claude/plans/`)
- `features/` - Upcoming feature PRDs (prefixed with `[TODO]-`)
- `infrastructure/` - DevOps, deployment, CI/CD plans
- `integrations/` - External service integration PRDs (Jira, Slack, Teams, Outlook)
- `bug-fixes/` - Bug fix plans
- `done/` - Completed plans (moved here after implementation)
- Root-level files: `inzone-prd.md` (master PRD), `ux-overhaul-*.md`, `ux-simplification-prd.md`

## Custom Slash Commands (`.claude/commands/`)
- `/fix-ci` - Autonomous CI failure analysis, fix, commit, push, and retry loop (up to 5 iterations)
- `/update-tests` - Analyzes branch diff vs master and updates all affected tests (unit, BDD, arch) autonomously
- `/verify-feature` - Uses agent-browser CLI to visually verify a feature and generate an issues PRD
- `/vercel-logs` - Fetches recent Vercel deployment logs for runtime error debugging
- `/create-mr`, `/update-mr` - GitLab MR management
- `/worktree`, `/worktree-list`, `/worktree-cleanup` - Git worktree management

## Key Libraries & Patterns
- **State management**: TanStack Query for server state; query key factories in hooks (e.g., `boardKeys.all`, `boardKeys.detail(id)`)
- **DnD**: dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) with DragOverlay for visual feedback
- **Rich text**: Tiptap with StarterKit, Placeholder, Link, TaskList, TaskItem, Highlight, Typography extensions
- **Animations**: Framer Motion for page transitions, modal animations, card stagger entrance
- **Auth**: Better Auth v1.4.18 with Google OAuth, cookie-based sessions, Prisma adapter
- **Validation**: Zod schemas in `apps/api/src/validators/`
- **API client**: Axios with `withCredentials: true` for session cookies; 401 interceptor redirects to `/login`
- When invalidating React Query cache after mutations, invalidate both the detail query AND the list query (e.g., after creating a todo, invalidate `boardKeys.detail(boardId)` AND `boardKeys.all` so board list counts update)
