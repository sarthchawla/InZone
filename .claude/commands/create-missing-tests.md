---
description: Find and create missing tests for current branch changes vs master
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, Task, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage
---

# Create Missing Tests for Branch Changes

Analyze all changes on the current branch compared to `master`, then create missing tests using a team of parallel agents.

## Context

- **Repository**: InZone monorepo
- **Current branch**: `{{ git.currentBranch }}`
- **Base branch**: `master`

## Project Structure

```
InZone/
├── apps/
│   ├── web/                              # React frontend (Vite + Vitest + RTL + Playwright-BDD)
│   │   ├── src/
│   │   │   ├── components/               # UI components
│   │   │   ├── hooks/                    # Custom hooks
│   │   │   ├── api/                      # API client
│   │   │   ├── lib/                      # Utilities
│   │   │   ├── pages/                    # Page components
│   │   │   └── architecture/             # Architecture tests (*.arch.test.ts)
│   │   └── tests/bdd/
│   │       ├── features/                 # Playwright-BDD feature files
│   │       └── steps/                    # Step definitions
│   └── api/                              # Backend API (Vitest + Cucumber.js BDD)
│       ├── src/
│       │   ├── routes/                   # Route handlers
│       │   ├── services/                 # Business logic
│       │   ├── middleware/               # Middleware
│       │   ├── validators/               # Input validators
│       │   └── architecture/             # Architecture tests (*.arch.test.ts)
│       └── tests/bdd/
│           ├── features/                 # Cucumber-BDD feature files
│           └── step-definitions/         # Step definitions
└── packages/
    └── shared/                           # Shared types/utilities
        └── src/
            └── architecture/             # Architecture tests
```

## Step 1: Analyze Branch Changes

Run the following to identify all changed/added files:

```bash
git diff master...HEAD --name-only --diff-filter=ACMR
```

Categorize the changed files into these buckets:
- **web-source**: Files in `apps/web/src/` that are NOT test files (`*.test.ts`, `*.test.tsx`, `*.arch.test.ts`)
- **api-source**: Files in `apps/api/src/` that are NOT test files
- **web-features**: New routes, pages, or components with user flows (candidates for BDD)
- **api-features**: New or changed API endpoints, services with business logic (candidates for BDD)
- **structural**: New directories, new modules, new patterns (candidates for arch tests)
- **shared**: Files in `packages/shared/`

Skip files that are already test files, config files, or documentation.

## Step 2: Create Team and Tasks

1. **Create a team** called `test-creators`.

2. **Create one task per agent type**, but only for categories that have relevant changes. Each task description should include:
   - The list of changed source files relevant to that agent
   - The full diff for those files (or instructions to read the diff)
   - What the agent should do (detailed below)

### Task Descriptions

#### Task: `web-unit-tests`
**Condition**: Only create if there are changed files in `apps/web/src/`

```
Analyze and create missing unit tests for changed frontend files.

Changed files:
<list the web-source files here>

Instructions:
1. For each changed source file, check if a corresponding test file exists:
   - Component files (*.tsx) -> *.test.tsx
   - Hook files (*.ts in hooks/) -> *.test.ts
   - Utility files (*.ts) -> *.test.ts
   - Files in architecture/ are excluded (handled by arch-tests agent)
2. Read the diff for each file: git diff master...HEAD -- <file>
3. Read existing test files nearby to understand patterns and conventions
4. If test file is MISSING: create it following existing patterns in the codebase
5. If test file EXISTS but doesn't cover the changes: add new test cases
6. Run tests to verify they pass: cd apps/web && pnpm vitest run --coverage <test-file>
7. Ensure coverage meets 80% threshold for the changed files
8. Report what was created/updated

Rules:
- Use pnpm (never npm/npx/yarn)
- NEVER lower coverage thresholds — add more tests instead
- Use fireEvent instead of userEvent.type() for inputs with special chars, long strings, or whitespace
- Follow existing test patterns in the codebase
- Do not commit any changes
```

#### Task: `api-unit-tests`
**Condition**: Only create if there are changed files in `apps/api/src/`

```
Analyze and create missing unit tests for changed backend files.

Changed files:
<list the api-source files here>

Instructions:
1. For each changed source file, check if a corresponding .test.ts file exists
   - Files in architecture/ are excluded (handled by arch-tests agent)
2. Read the diff for each file: git diff master...HEAD -- <file>
3. Read existing test files nearby to understand patterns and conventions
4. If test file is MISSING: create it following existing patterns
5. If test file EXISTS but doesn't cover the changes: add new test cases
6. Run tests to verify they pass: cd apps/api && pnpm vitest run --coverage <test-file>
7. Ensure coverage meets 80% threshold for the changed files
8. Report what was created/updated

Rules:
- Use pnpm (never npm/npx/yarn)
- NEVER lower coverage thresholds — add more tests instead
- Follow existing test patterns in the codebase
- Do not commit any changes
```

#### Task: `web-bdd-tests`
**Condition**: Only create if there are new routes, pages, or components with user-facing flows

```
Analyze and create missing BDD feature files for new frontend functionality.

Changed files with user flows:
<list the web-features files here>

Instructions:
1. Read the changed source files to understand the new user-facing functionality
2. Check existing BDD features in apps/web/tests/bdd/features/ for coverage
3. Read existing feature files and step definitions to understand patterns
4. If a new user flow is NOT covered by any existing feature:
   a. Create a new .feature file in apps/web/tests/bdd/features/
   b. Create corresponding step definitions in apps/web/tests/bdd/steps/
   c. Tag new scenarios with @wip
5. If an existing feature partially covers the flow: add new scenarios (tagged @wip)
6. Do NOT run BDD tests (they require dev servers) — just create the files
7. Report what was created/updated

Rules:
- Use pnpm (never npm/npx/yarn)
- Write scenarios in business language, not technical language
- Follow existing Playwright-BDD patterns in the codebase
- Tag all new features/scenarios as @wip
- Do not commit any changes
```

#### Task: `api-bdd-tests`
**Condition**: Only create if there are new/changed API endpoints or business logic

```
Analyze and create missing BDD feature files for new API functionality.

Changed files with API logic:
<list the api-features files here>

Instructions:
1. Read the changed source files to understand the new API functionality
2. Check existing BDD features in apps/api/tests/bdd/features/ for coverage
3. Read existing feature files and step definitions to understand patterns
4. If new API behavior is NOT covered by any existing feature:
   a. Create a new .feature file in apps/api/tests/bdd/features/
   b. Create corresponding step definitions in apps/api/tests/bdd/step-definitions/
   c. Tag new scenarios with @wip
5. If an existing feature partially covers the behavior: add new scenarios (tagged @wip)
6. Do NOT run BDD tests (they require dev servers + DB) — just create the files
7. Report what was created/updated

Rules:
- Use pnpm (never npm/npx/yarn)
- Write scenarios in business language, not technical language
- Follow existing Cucumber.js patterns in the codebase
- Tag all new features/scenarios as @wip
- Do not commit any changes
```

#### Task: `arch-tests`
**Condition**: Only create if there are structural changes (new modules, directories, patterns)

```
Analyze and update architecture tests for structural changes.

Structural changes:
<list the structural changes here>

Instructions:
1. Read the changed/added files to understand new structure
2. Check existing architecture tests:
   - apps/web/src/architecture/*.arch.test.ts
   - apps/api/src/architecture/*.arch.test.ts
   - packages/shared/src/architecture/*.arch.test.ts (if applicable)
3. Read existing arch test files to understand patterns and conventions
4. If new modules/directories/patterns are not covered by existing arch rules:
   a. Add new rules to existing arch test files
   b. Or create new arch test files if needed
5. Run arch tests to verify: cd <app-dir> && pnpm run test:arch
6. Report what was created/updated

Rules:
- Use pnpm (never npm/npx/yarn)
- Follow existing architecture test patterns
- Only add rules for genuinely new structural patterns
- Do not commit any changes
```

## Step 3: Spawn Agents

Spawn agents using the Task tool with `subagent_type: "general-purpose"` and `team_name: "test-creators"`.

### Batch 1 (up to 4 agents): Unit test and arch test agents
Spawn these in parallel:
- `web-unit-tests` agent (if task exists)
- `api-unit-tests` agent (if task exists)
- `arch-tests` agent (if task exists)

### Batch 2: BDD agents (after Batch 1 completes)
Spawn these in parallel:
- `web-bdd-tests` agent (if task exists)
- `api-bdd-tests` agent (if task exists)

BDD agents are spawned last because they depend on understanding what the unit test agents may have already created, and they are creating feature files that describe higher-level behavior.

## Step 4: Monitor and Collect Results

- Wait for each batch to complete before starting the next.
- Use TaskList and TaskGet to monitor progress.
- Collect results from all agents.

## Step 5: Present Final Summary

Present a summary table of all created/updated test files:

```markdown
## Test Creation Summary — `<branch>` vs `master`

### Created/Updated Test Files

| File | Type | Action | Status |
|------|------|--------|--------|
| apps/web/src/components/Foo.test.tsx | Unit | Created | PASS |
| apps/api/src/routes/bar.test.ts | Unit | Updated | PASS |
| apps/web/tests/bdd/features/login.feature | BDD | Created | @wip |
| apps/api/tests/bdd/features/auth.feature | BDD | Created | @wip |
| apps/web/src/architecture/naming.arch.test.ts | Arch | Updated | PASS |

### Summary
- Unit tests created: X
- Unit tests updated: X
- BDD features created: X
- BDD step definitions created: X
- Arch tests updated: X
- All unit/arch tests passing: YES/NO
```

After presenting the summary, clean up the team with TeamDelete.

## Important Notes

- Launch agents immediately — do NOT wait for user confirmation.
- Only create tasks for agent types that have relevant changes. If no files changed in `apps/api/`, do not create api-unit-tests or api-bdd-tests tasks.
- Each agent prompt MUST include the shared rules (pnpm, fireEvent, no coverage lowering, no commits).
- If there are no changes vs master, report that and exit early.
- Do not commit any changes — show the user what was created for review.
