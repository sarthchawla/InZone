# Fix CI Failures

Fetch failed GitHub Actions workflow logs, analyze the issues, propose fixes, and optionally apply them.

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
    ├── lint-build.yml # Linting and build checks
    ├── unit-tests.yml # Vitest unit tests
    ├── bdd-tests.yml  # Playwright-BDD E2E tests
    └── devcontainer.yml
```

## Step 1: Get Workflow Status

1. Ask the user if they want to check:
   - The latest failed workflow for the current branch
   - A specific workflow run ID they provide

2. Use `gh` CLI to get workflow runs:
```bash
gh run list --branch <branch> --limit 5
```

## Step 2: Get Failed Jobs

1. Get failed workflow details:
```bash
gh run view <run-id>
```

2. Get failed job logs:
```bash
gh run view <run-id> --log-failed
```

3. If no failed jobs found, inform the user that all workflows passed and exit.

## Step 3: Analyze Each Failed Job

For each failed job, analyze the logs to identify issue type:

### Frontend Issues (apps/web)
- **TypeScript/Build Errors**: `error TS`, `Cannot find module`, type mismatches
- **Vitest Test Failures**: `FAIL`, `AssertionError`, `Expected`, `Received`
- **ESLint Errors**: ESLint rule violations
- **Playwright-BDD Failures**: `FAILED`, `Timeout`, `expect.toBeVisible`

### Backend Issues (apps/api)
- **TypeScript/Build Errors**: `error TS`, type errors
- **Vitest Test Failures**: `FAIL`, assertion errors
- **ESLint Errors**: Lint violations

### Common Issues
- **Dependency Errors**: `pnpm install` failures
- **Database Errors**: PostgreSQL connection issues
- **Timeout Errors**: Test or build timeouts

## Step 4: Present Analysis Summary

Present findings in this format:

```markdown
## CI Failure Analysis

### Workflow Run #<id> | Branch: `<branch-name>`

### Summary Table
| Workflow | Job | Failure Type | Files Affected |
|----------|-----|--------------|----------------|
| lint-build | lint | ESLint | apps/web/src/... |
| unit-tests | frontend | Vitest | apps/web/src/... |
| bdd-tests | e2e | Playwright | tests/... |

### Detailed Analysis

#### Workflow: <workflow-name>
**Job**: <job-name>
**Type**: <TypeScript/Test/Lint/Runtime Error>
**Root Cause**: <description>

**Issues Found**:
1. `apps/web/src/file.ts:42` - <issue description>
2. `apps/api/src/file.ts:15` - <issue description>

**Proposed Fix**:
<description of what needs to change>
```

## Step 5: Ask User for Action

Ask the user what they want to do:

1. **Fix Selection**:
   - Fix all issues
   - Fix specific issues (provide numbered list)
   - Just view analysis (no fixes)

2. **After Fixing** (if fixing):
   - Fix only (no commit)
   - Fix and commit
   - Fix, commit, and push

## Step 6: Apply Fixes

For each issue to fix:

1. Read the affected file
2. Apply the fix using the Edit tool
3. Show what was changed

## Step 7: Validate Fixes

Run appropriate validation based on failure type:

**For TypeScript/Build errors:**
```bash
pnpm build
```

**For Lint errors:**
```bash
pnpm lint
# Or fix automatically:
pnpm lint:fix
```

**For Frontend Unit Test failures:**
```bash
pnpm --filter web test -- <test-file>
```

**For Backend Unit Test failures:**
```bash
pnpm --filter api test -- <test-file>
```

**For BDD Test failures:**
```bash
pnpm --filter web test:bdd
```

**For type checking:**
```bash
pnpm typecheck
```

## Step 8: Post-Fix Verification with Agent-Browser CLI

After fixing issues that affect the UI, use **agent-browser CLI** to verify:

```
browser_navigate → http://localhost:5173
browser_snapshot → Capture current state
browser_click → Test affected features
browser_snapshot → Verify fix works
```

## Step 9: Commit and Push (if requested)

If user chose to commit:

1. Stage changes: `git add <files>`
2. Commit with message:
   ```
   fix: resolve CI failures from workflow run #<id>

   - <brief description of fix 1>
   - <brief description of fix 2>

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
3. If push requested: `git push`

## Error Detection Patterns

### TypeScript Errors
- `error TS\d+:` - TypeScript compiler errors
- `Type '.*' is not assignable` - Type mismatch
- `Cannot find module` - Missing import
- `Property '.*' does not exist` - Missing property

### Vitest Test Failures
- `FAIL ` - Test failure
- `✕` or `✗` - Failed test case
- `AssertionError` - Assertion failure
- `Expected:` and `Received:` - Assertion mismatch
- `Timeout` - Test timeout

### Playwright-BDD Failures
- `FAILED` - Scenario failure
- `Timeout` - Step timeout
- `expect.toBeVisible` - Element visibility
- `locator.click` - Click failures

### ESLint Errors
- `error  ` with rule name - ESLint error
- `warning  ` with rule name - ESLint warning
- `@typescript-eslint/` - TypeScript-specific rules

### Prisma/Database Errors
- `PrismaClientKnownRequestError` - Database query error
- `P\d{4}` - Prisma error codes
- `Connection refused` - Database connection issue

## Guidelines

- Always read files before editing
- Run validation after fixes
- Never suppress lint errors - fix root cause
- For test failures, determine if test or code needs fixing
- Keep commit messages concise but descriptive
- Use agent-browser CLI to verify UI-related fixes

## Example Usage

User says: "fix ci" or "check ci failures"

The assistant will:
1. Find the latest failed workflow
2. Get failed job logs via `gh` CLI
3. Analyze and present issues
4. Ask what to fix
5. Apply fixes and validate
6. Optionally verify with agent-browser CLI
7. Commit and push if requested

## Useful Commands

```bash
# List recent workflow runs
gh run list --branch $(git branch --show-current) --limit 5

# View specific run
gh run view <run-id>

# Get failed logs
gh run view <run-id> --log-failed

# Rerun failed jobs
gh run rerun <run-id> --failed

# Watch a running workflow
gh run watch <run-id>
```
