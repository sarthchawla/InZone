---
description: Run all repo tests with a team of agents, then fix failures
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, Task, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage
---

You are the orchestrator for a full test suite run across the InZone monorepo. Your job is to launch a team of agents that run every test type in parallel, then fix any failures found.

## Test Types to Cover

There are 9 test categories across 3 packages:

| # | Name | Command | Working Dir | Setup Required |
|---|------|---------|-------------|----------------|
| 1 | Frontend Unit Tests | `pnpm run test:coverage` | `apps/web` | None |
| 2 | Backend Unit Tests | `pnpm run test:coverage` | `apps/api` | None |
| 3 | Frontend Lint | `pnpm run lint` | `apps/web` | None |
| 4 | Backend Lint | `pnpm run lint` | `apps/api` | None |
| 5 | Frontend Arch Tests | `pnpm run test:arch` | `apps/web` | None |
| 6 | Backend Arch Tests | `pnpm run test:arch` | `apps/api` | None |
| 7 | Shared Arch Tests | `pnpm run test:arch` | `packages/shared` | None |
| 8 | Frontend BDD Tests | `pnpm run test:bdd` | `apps/web` | Dev servers + DB |
| 9 | Backend BDD Tests | `pnpm run test:bdd` | `apps/api` | Dev servers + DB |

## Execution Strategy

### Phase 1: Create Team and Tasks

1. Create a team called `test-fixers`.
2. Create one task per test type (9 tasks total). Each task description must include:
   - The exact command to run
   - The working directory (absolute path based on repo root)
   - Instructions to: run the test, analyze failures, fix issues, re-run to verify fixes
   - Reminder to use `pnpm` (never npm/npx/yarn)
   - Reminder to use `fireEvent` instead of `userEvent.type()` for inputs with special chars (frontend only)
   - Reminder to NEVER lower coverage thresholds — add tests instead

### Phase 2: Spawn Agents

Spawn **up to 4 agents at a time** (to avoid resource exhaustion) using the Task tool with `subagent_type: "general-purpose"` and `team_name: "test-fixers"`. Name them descriptively (e.g., `web-unit`, `api-unit`, `web-lint`, `api-lint`, `web-arch`, `api-arch`, `shared-arch`, `web-bdd`, `api-bdd`).

Each agent's prompt should be:

```
You are a test-fixer agent on the "test-fixers" team. Your job:

1. Read your assigned task from the task list using TaskGet
2. Mark it as in_progress
3. Run the test command using Bash
4. If tests PASS: mark task completed and report success
5. If tests FAIL:
   a. Analyze the failure output carefully
   b. Read the failing source/test files
   c. Fix the root cause (prefer fixing source code; fix tests only if the test itself is wrong)
   d. Re-run the test command to verify the fix
   e. If still failing, iterate (max 3 attempts)
   f. Mark task completed when fixed, or leave in_progress with a message if unable to fix

Rules:
- Use pnpm, never npm/npx/yarn
- NEVER lower coverage thresholds — add more tests to meet coverage instead
- For frontend input tests, use fireEvent instead of userEvent.type() for special chars
- Show the user what you changed before finishing
- Do not commit any changes
```

### Phase 3: Monitor and Report

- Wait for all agents to finish.
- Collect results from the task list.
- Present a summary table to the user:

```
| Test Type | Status | Issues Found | Fixed? |
|-----------|--------|-------------|--------|
| ...       | ...    | ...         | ...    |
```

- If any tests remain unfixed, explain what went wrong and suggest next steps.
- Shut down all teammates and clean up the team when done.

## BDD Test Setup

BDD tests require running dev servers and a database. The BDD agents must handle setup before running tests:

### Frontend BDD (web-bdd agent):
1. Ensure PostgreSQL is running (check with `pg_isready` or `psql -c "SELECT 1;"`)
2. Start the backend API in the background: `cd apps/api && pnpm run dev &` (PORT 3000)
3. Wait for the API to be ready (poll `http://localhost:3000` until it responds)
4. Run `pnpm run test:bdd` from `apps/web` (this starts Vite dev server automatically via playwright config)
5. After tests complete, kill the background API process
6. Frontend BDD uses Playwright with playwright-bdd. Feature files are in `tests/bdd/features/`, steps in `tests/bdd/steps/`
7. Tests tagged `@wip` are excluded automatically

### Backend BDD (api-bdd agent):
1. Ensure PostgreSQL is running
2. Run `pnpm run test:db:setup` from `apps/api` to initialize the test database
3. Start the backend API in the background: `cd apps/api && PORT=3001 pnpm run dev &` (use PORT 3001 to avoid conflicts)
4. Wait for the API to be ready (poll `http://localhost:3001`)
5. Run `pnpm run test:bdd` from `apps/api`
6. After tests complete, kill the background API process
7. Backend BDD uses Cucumber.js. Feature files in `tests/bdd/features/`, step definitions in `tests/bdd/step-definitions/`
8. Tests tagged `@wip` are excluded automatically

### BDD Agent Scheduling:
- BDD agents must run **sequentially, not in parallel**, because they share the same PostgreSQL database and concurrent test runs will cause data conflicts (truncations, inserts, and assertions colliding)
- Spawn the **backend BDD agent first** (in the last batch, after unit/lint/arch agents finish). Wait for it to complete before spawning the frontend BDD agent.
- The backend BDD task should **block** the frontend BDD task (use `addBlockedBy` when creating tasks) so the orchestrator respects the ordering automatically
- If the database is not available, the BDD agent should report this clearly and skip (do not fail silently)

## Important Notes

- Launch the first batch of agents immediately — do NOT wait for user confirmation between phases.
- If a test type requires building first, the agent should handle that.
- Shared package has no unit tests, only architecture tests.
- Schedule BDD agents in the last batch after lighter tests finish, and run them **sequentially** (not in parallel) since they share the same database.
