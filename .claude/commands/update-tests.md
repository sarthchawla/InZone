---
description: Analyze branch changes vs main and update all affected tests (UI, API, BDD, architecture)
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Task
---

# Update Tests for Branch Changes

Analyze all changes on the current branch compared to the main branch, then identify and update all affected tests: UI (frontend unit), API (backend unit), BDD (behavior-driven), and architecture tests.

## Context

- **Repository**: `sarthchawla/InZone`
- **Current branch**: `{{ git.currentBranch }}`
- **Main branch**: `master`

## Project Structure

```
InZone/
├── apps/
│   ├── web/                          # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/           # UI components (*.test.tsx)
│   │   │   ├── hooks/                # Custom hooks (*.test.ts)
│   │   │   ├── api/                  # API client (*.test.ts)
│   │   │   ├── lib/                  # Utilities (*.test.ts)
│   │   │   └── architecture/         # Architecture tests (*.arch.test.ts)
│   │   └── tests/bdd/features/       # Playwright-BDD feature files
│   └── api/                          # Node.js backend (Express)
│       ├── src/
│       │   ├── routes/               # Route handlers (*.test.ts)
│       │   ├── services/             # Business logic (*.test.ts)
│       │   ├── middleware/            # Middleware (*.test.ts)
│       │   ├── validators/           # Input validators (*.test.ts)
│       │   └── architecture/         # Architecture tests (*.arch.test.ts)
│       └── tests/bdd/features/       # Cucumber-BDD feature files
└── packages/
    └── shared/                       # Shared types/utilities
```

## Test Categories

| Category | Location | Runner | Command |
|----------|----------|--------|---------|
| **UI Tests** | `apps/web/src/**/*.test.{ts,tsx}` | Vitest | `pnpm --filter web test` |
| **API Tests** | `apps/api/src/**/*.test.ts` | Vitest | `pnpm --filter api test` |
| **Web BDD** | `apps/web/tests/bdd/features/**/*.feature` | Playwright-BDD | `pnpm --filter web test:bdd` |
| **API BDD** | `apps/api/tests/bdd/features/**/*.feature` | Cucumber.js | `pnpm --filter api test:bdd` |
| **Web Arch** | `apps/web/src/architecture/*.arch.test.ts` | Vitest | `pnpm --filter web test:arch` |
| **API Arch** | `apps/api/src/architecture/*.arch.test.ts` | Vitest | `pnpm --filter api test:arch` |

## Step 1: Get Branch Changes

Get all files changed on this branch compared to master:

```bash
# Get the merge base
MERGE_BASE=$(git merge-base master HEAD)

# List all changed files with status
git diff --name-status $MERGE_BASE HEAD

# Get detailed diff for understanding changes
git diff $MERGE_BASE HEAD --stat
```

Categorize changes into:
- **Frontend source** (`apps/web/src/**` excluding test files)
- **Backend source** (`apps/api/src/**` excluding test files)
- **Shared packages** (`packages/**`)
- **Database/Prisma** (`apps/api/prisma/**`)
- **Config files** (eslint, tsconfig, vite, vitest configs)
- **Existing test files** (already modified tests)

## Step 2: Map Changes to Test Categories

For each changed source file, determine which test categories are affected:

### Frontend Source Changes → UI Tests + Web BDD + Web Arch
| Changed File Pattern | Affected Tests |
|---------------------|----------------|
| `apps/web/src/components/**` | Matching `*.test.tsx` + related BDD features |
| `apps/web/src/hooks/**` | Matching `*.test.ts` + related BDD features |
| `apps/web/src/api/**` | Matching `*.test.ts` + related BDD features |
| `apps/web/src/lib/**` | Matching `*.test.ts` |
| `apps/web/src/types/**` | All UI tests that import these types |
| New files in `apps/web/src/` | Web architecture tests (naming, layers, cycles, metrics) |

### Backend Source Changes → API Tests + API BDD + API Arch
| Changed File Pattern | Affected Tests |
|---------------------|----------------|
| `apps/api/src/routes/**` | Matching `*.test.ts` + related BDD features |
| `apps/api/src/services/**` | Matching `*.test.ts` + related BDD features |
| `apps/api/src/middleware/**` | Matching `*.test.ts` |
| `apps/api/src/validators/**` | Matching `*.test.ts` |
| New files in `apps/api/src/` | API architecture tests (naming, layers, cycles, metrics) |

### Shared/Config Changes
| Changed File Pattern | Affected Tests |
|---------------------|----------------|
| `packages/shared/**` | All test categories |
| `apps/api/prisma/schema.prisma` | API tests + API BDD + potentially UI tests |
| `tsconfig*.json` | Architecture tests |

## Step 3: Present Change Analysis

Present findings in this format:

```markdown
## Branch Change Analysis: `<branch>` vs `master`

### Changed Files Summary
- **Frontend source**: X files changed
- **Backend source**: X files changed
- **Shared/config**: X files changed
- **Test files already modified**: X files

### Test Impact Matrix

| Test Category | Status | Affected Tests | Reason |
|---------------|--------|----------------|--------|
| UI Tests | Needs Update / Up to Date | list of test files | brief reason |
| API Tests | Needs Update / Up to Date | list of test files | brief reason |
| Web BDD | Needs Update / Up to Date | list of feature files | brief reason |
| API BDD | Needs Update / Up to Date | list of feature files | brief reason |
| Web Arch | Needs Update / Up to Date | list of arch test files | brief reason |
| API Arch | Needs Update / Up to Date | list of arch test files | brief reason |

### New Test Files Needed
- `apps/web/src/components/NewComponent.test.tsx` - No test exists for new component
- `apps/api/src/routes/newRoute.test.ts` - No test exists for new route
```

## Step 4: Ask User for Scope

Ask the user which test categories to update:

1. **All** - Update all affected test categories
2. **UI Tests only** - Frontend unit tests
3. **API Tests only** - Backend unit tests
4. **BDD Tests only** - Behavior-driven tests (web + api)
5. **Arch Tests only** - Architecture tests (web + api)
6. **Custom selection** - Pick specific categories

## Step 5: Read and Understand Context

For each test file to update:

1. **Read the source file** that changed to understand what's different
2. **Read the existing test file** to understand current coverage
3. **Read the diff** for the source file to understand what specifically changed:
   ```bash
   git diff $(git merge-base master HEAD) HEAD -- <source-file>
   ```
4. **Identify gaps**: New functions/exports without tests, changed behavior not reflected in tests, removed code with stale tests

## Step 6: Update Tests

### For UI Tests (Vitest + React Testing Library)
- Update existing test cases to match changed component props, behavior, or API
- Add new test cases for new functionality
- Remove stale test cases for deleted functionality
- Ensure mocks match updated API contracts
- Follow existing test patterns in the file

### For API Tests (Vitest)
- Update route/service test cases for changed request/response shapes
- Update mocks for changed Prisma models or service dependencies
- Add tests for new routes, services, middleware, or validators
- Remove stale tests for deleted endpoints

### For BDD Tests (Feature Files + Step Definitions)
- **Web BDD** (Playwright-BDD):
  - Update `.feature` files in `apps/web/tests/bdd/features/`
  - Update step definitions if interaction patterns changed
  - Add new scenarios for new user-facing features
- **API BDD** (Cucumber.js):
  - Update `.feature` files in `apps/api/tests/bdd/features/`
  - Update step definitions in `apps/api/tests/bdd/steps/`
  - Add new scenarios for new API endpoints or changed behavior

### For Architecture Tests
- Update if new files/directories were added that should conform to naming conventions
- Update if layer boundaries changed
- Update if new dependencies were introduced
- Architecture tests enforce: naming conventions, layer boundaries, no circular dependencies, and metrics thresholds

## Step 7: Run Updated Tests

Run each updated test category to verify:

```bash
# UI Tests (specific files)
pnpm --filter web test run -- <test-file-paths>

# API Tests (specific files)
pnpm --filter api test run -- <test-file-paths>

# Web BDD Tests
pnpm --filter web test:bdd

# API BDD Tests
pnpm --filter api test:bdd

# Web Architecture Tests
pnpm --filter web test:arch

# API Architecture Tests
pnpm --filter api test:arch
```

## Step 8: Fix Failures

If any tests fail after updates:

1. Read the error output carefully
2. Determine if the test logic is wrong or the source code has an issue
3. Fix the test (or flag the source code issue to the user)
4. Re-run the specific failing test to confirm the fix

## Step 9: Present Summary

```markdown
## Test Update Summary

### Updated Tests
| File | Changes Made | Status |
|------|-------------|--------|
| `apps/web/src/components/Foo.test.tsx` | Updated mock, added 2 test cases | PASS |
| `apps/api/src/routes/bar.test.ts` | Updated response shape assertions | PASS |
| `apps/web/tests/bdd/features/foo.feature` | Added new scenario | PASS |

### New Tests Created
| File | Coverage | Status |
|------|----------|--------|
| `apps/web/src/components/NewThing.test.tsx` | 3 test cases | PASS |

### Removed/Cleaned Up
| File | Reason |
|------|--------|
| Removed stale mock in `Foo.test.tsx` | Source function was deleted |

### Test Results
- UI Tests: X passed, Y failed
- API Tests: X passed, Y failed
- Web BDD: X scenarios passed, Y failed
- API BDD: X scenarios passed, Y failed
- Web Arch: X passed, Y failed
- API Arch: X passed, Y failed
```

## Step 10: Ask for Next Action

Ask the user:
1. **Done** - All tests updated and passing
2. **Fix remaining failures** - Continue fixing any remaining test failures
3. **Show changes** - Show all test file changes made (git diff of test files)
4. **Commit** - Stage and commit the test updates

## Guidelines

- Always read source AND test files before making changes
- Follow existing test patterns and conventions in each file
- Do not over-test: focus on behavior changes, not implementation details
- For BDD: write scenarios in business language, not technical language
- For arch tests: only update if structural changes require it
- Keep mocks minimal and focused
- Preserve existing passing test cases unless they test removed functionality
- When creating new test files, follow the naming convention of adjacent test files

## Example Usage

User says: `/update-tests`

The assistant will:
1. Compare the current branch against master
2. Map all source changes to affected test categories
3. Present the impact analysis
4. Ask which categories to update
5. Update tests with proper coverage for the changes
6. Run tests to verify
7. Present results and ask for next steps
