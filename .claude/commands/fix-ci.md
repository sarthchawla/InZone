# Fix CI Failures (Autonomous)

Automatically fetch failed GitHub Actions workflow logs, analyze issues, fix them, validate, commit, push, and repeat until CI is green. **No user input required** — runs fully autonomously.

## Context

- **Repository**: `sarthchawla/InZone`
- **Current branch**: `{{ git.currentBranch }}`
- **CI Platform**: GitHub Actions

## Project Structure

```
InZone/
├── apps/
│   ├── web/           # React frontend (Vite)
│   └── api/           # Node.js backend (Express)
├── packages/
│   └── shared/        # Shared types/utilities
└── .github/workflows/
    ├── ci-backend.yml    # Backend lint + build + unit tests
    ├── ci-frontend.yml   # Frontend lint + build + unit tests
    ├── bdd-backend.yml   # Cucumber BDD API tests
    ├── bdd-frontend.yml  # Playwright-BDD E2E tests
    ├── architecture-tests.yml
    └── worktree-scripts.yml
```

## Autonomous Loop

**Repeat the following loop until all workflows pass or you've completed 5 iterations:**

### Step 1: Get Latest Workflow Runs

```bash
gh run list --branch <current-branch> --limit 10
```

Find the most recent set of workflow runs (same timestamp group). If all are `success`, report success and stop.

### Step 2: Get Failed Job Logs

For each failed workflow run:

```bash
gh run view <run-id> --log-failed
```

If no failed jobs, all workflows passed — report success and stop.

### Step 3: Analyze Failures

For each failed job, identify the issue type:

**Error Detection Patterns:**

| Pattern | Type |
|---------|------|
| `error TS\d+:` | TypeScript compiler error |
| `Type '.*' is not assignable` | Type mismatch |
| `Cannot find module` | Missing import |
| `Property '.*' does not exist` | Missing property |
| `FAIL`, `AssertionError`, `Expected:`, `Received:` | Vitest test failure |
| `FAILED`, `Timeout`, `expect.toBeVisible`, `locator.click` | Playwright-BDD failure |
| `error  ` with rule name | ESLint error |
| `PrismaClientKnownRequestError`, `P\d{4}` | Prisma/Database error |
| `Connection refused` | Database connection issue |

### Step 4: Present Analysis Summary

Show a brief summary table:

```markdown
## CI Failure Analysis (Iteration N)

| Workflow | Job | Failure Type | Files Affected |
|----------|-----|--------------|----------------|
| ... | ... | ... | ... |
```

### Step 5: Apply Fixes

**Do not ask the user** — automatically fix all issues:

1. Read each affected file
2. Apply the fix using the Edit tool
3. Briefly describe what was changed

**Fix Priority:**
- TypeScript/build errors first (they block everything)
- ESLint errors second
- Test assertion mismatches third (update test expectations or fix source code)
- Workflow/config issues fourth

### Step 6: Validate Fixes Locally

Run appropriate validation based on failure type:

```bash
# TypeScript/Build errors
pnpm --filter <package> build

# Lint errors
pnpm --filter <package> lint

# Frontend Unit Test failures
pnpm --filter web test run -- <test-file>

# Backend Unit Test failures
pnpm --filter api test run -- <test-file>

# Type checking
pnpm --filter <package> typecheck
```

If local validation fails, fix and re-validate before proceeding.

### Step 7: Commit and Push

**Automatically** stage, commit, and push:

1. Stage only the changed files: `git add <specific-files>`
2. Commit with descriptive message:
   ```
   fix: resolve CI failures from workflow run #<id>

   - <brief description of fix 1>
   - <brief description of fix 2>

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
3. Push: `git push`

### Step 8: Watch CI

Poll workflow runs until all complete:

```bash
# Poll every 20 seconds until no in_progress runs remain
gh run list --branch <branch> --limit 10 --json status,name,conclusion,databaseId
```

### Step 9: Check Results

- If **all workflows pass**: Report success and stop
- If **any workflow fails**: Go back to Step 2 (next iteration)
- If **5 iterations reached**: Report remaining failures and stop

## Guidelines

- Always read files before editing
- Run local validation after fixes before pushing
- Never suppress lint errors — fix root cause
- For test failures, determine if test or code needs fixing
- Keep commit messages concise but descriptive
- Each iteration should make a single focused commit
- Do NOT ask the user any questions — make reasonable decisions autonomously

## Useful Commands

```bash
# List recent workflow runs
gh run list --branch $(git branch --show-current) --limit 10

# View specific run
gh run view <run-id>

# Get failed logs
gh run view <run-id> --log-failed

# Rerun failed jobs
gh run rerun <run-id> --failed

# Watch a running workflow
gh run watch <run-id>
```
