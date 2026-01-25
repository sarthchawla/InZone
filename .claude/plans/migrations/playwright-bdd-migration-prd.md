# PRD: Migration from Cucumber.js to Playwright-BDD

**Document Version:** 1.0
**Created:** 2026-01-25
**Status:** Draft
**Owner:** Engineering Team

---

## Executive Summary

This PRD outlines the migration plan from the current BDD testing setup (Cucumber.js + Playwright with custom integration) to the Playwright-BDD library. This migration will reduce maintenance overhead, improve debugging capabilities, and provide native access to Playwright's advanced features while preserving our Gherkin-based BDD workflow.

---

## Table of Contents

1. [Background & Current State](#background--current-state)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [Proposed Solution](#proposed-solution)
5. [Technical Architecture](#technical-architecture)
6. [Migration Strategy](#migration-strategy)
7. [Implementation Phases](#implementation-phases)
8. [Local Verification & CI Monitoring](#local-verification--ci-monitoring)
9. [Risk Assessment](#risk-assessment)
10. [Rollback Plan](#rollback-plan)
11. [Dependencies & Prerequisites](#dependencies--prerequisites)
12. [Timeline & Milestones](#timeline--milestones)
13. [Appendix](#appendix)

---

## Background & Current State

### Current Architecture

```
apps/web/tests/bdd/
├── cucumber.config.js          # Cucumber configuration
├── features/                   # 13 feature files (~1,552 lines)
│   ├── boards/                 # 3 features
│   ├── columns/                # 3 features
│   ├── labels/                 # 1 feature
│   ├── search/                 # 1 feature
│   └── todos/                  # 4 features
├── step-definitions/           # 6 step definition files (~98.6 KB)
│   ├── board.steps.ts
│   ├── column.steps.ts
│   ├── common.steps.ts
│   ├── label.steps.ts
│   ├── search.steps.ts
│   └── todo.steps.ts
└── support/
    ├── hooks.ts               # Custom lifecycle management
    ├── world.ts               # Custom Playwright-Cucumber bridge
    └── pages/                 # Page Object Models
        ├── board-list.page.ts
        ├── board-view.page.ts
        ├── todo-modal.page.ts
        └── index.ts
```

### Current Integration Pattern

The current setup uses a **custom integration layer** consisting of:

1. **CustomWorld** (`world.ts`): Extends Cucumber's World class to manage Playwright browser instances
2. **Hooks** (`hooks.ts`): Manually handles browser lifecycle, screenshots on failure
3. **Step Definitions**: Access Playwright via `this.page` from CustomWorld

### Pain Points with Current Setup

| Issue | Impact |
|-------|--------|
| Manual browser lifecycle management | ~50 lines of boilerplate code |
| Custom screenshot logic in After hooks | Duplicates Playwright's built-in capability |
| No trace viewer access | Debugging failures is harder |
| Two parallel systems to maintain | Cucumber config + Playwright config |
| Limited IDE integration | Step definitions not linked to test execution |
| Manual video recording setup | Feature exists in Playwright but requires extra wiring |

---

## Problem Statement

Our current BDD setup requires maintaining a custom integration layer between Cucumber.js and Playwright. This creates:

1. **Maintenance overhead**: CustomWorld and hooks require updates when either tool changes
2. **Debugging friction**: Cannot use Playwright's trace viewer or UI mode effectively
3. **Feature gap**: Missing native Playwright capabilities (auto-screenshots, video, retries)
4. **Knowledge fragmentation**: Developers must understand two different tool ecosystems

---

## Goals & Success Metrics

### Primary Goals

| Goal | Target |
|------|--------|
| Eliminate custom integration code | Remove world.ts and hooks.ts entirely |
| Enable trace viewer debugging | 100% of failed tests have trace files |
| Simplify configuration | Reduce config files from 2 to 1 |
| Maintain feature file compatibility | 100% of .feature files unchanged |
| Preserve page object architecture | All page objects remain functional |

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lines of integration code | ~200 | 0 |
| Config files for BDD | 2 (cucumber.config.js + playwright.config.ts) | 1 |
| Time to debug failing test | ~10 min avg | ~3 min avg |
| CI pipeline for BDD tests | Separate job | Unified with Playwright |
| Test execution parallelism | Basic (2 workers) | Advanced (worker-based isolation) |

### Non-Goals

- Rewriting feature files (Gherkin syntax stays the same)
- Changing step definition logic (only import/export patterns change)
- Modifying page object implementations
- Altering test coverage scope

---

## Proposed Solution

### Playwright-BDD Library

[Playwright-BDD](https://github.com/vitalets/playwright-bdd) is a library that bridges Gherkin feature files with Playwright Test, providing:

- Native Playwright test runner integration
- Automatic browser management via fixtures
- Built-in screenshot, video, and trace support
- Auto-generation of spec files from features
- Full access to Playwright's debugging tools

### New Architecture

```
apps/web/tests/bdd/
├── playwright.config.ts        # Single unified config
├── fixtures.ts                 # Playwright fixtures (replaces CustomWorld)
├── features/                   # UNCHANGED - all 13 feature files
│   └── ...
├── steps/                      # Renamed from step-definitions
│   ├── board.steps.ts          # Modified imports only
│   ├── column.steps.ts
│   ├── common.steps.ts
│   ├── label.steps.ts
│   ├── search.steps.ts
│   └── todo.steps.ts
├── pages/                      # UNCHANGED - moved up one level
│   ├── board-list.page.ts
│   ├── board-view.page.ts
│   ├── todo-modal.page.ts
│   └── index.ts
└── .features-gen/              # Auto-generated (gitignored)
    └── *.feature.spec.ts
```

---

## Technical Architecture

### Before vs After: Step Definition Pattern

**Current (Cucumber.js):**
```typescript
// step-definitions/board.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

Given('a board named {string} exists', async function (this: CustomWorld, boardName: string) {
  await this.page.route('**/api/boards', async (route) => {
    // ... mock implementation
  });
});
```

**After (Playwright-BDD):**
```typescript
// steps/board.steps.ts
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures';

const { Given, When, Then } = createBdd(test);

Given('a board named {string} exists', async ({ page }, boardName: string) => {
  await page.route('**/api/boards', async (route) => {
    // ... mock implementation (unchanged)
  });
});
```

### Fixtures File (Replaces CustomWorld)

```typescript
// fixtures.ts
import { test as base } from 'playwright-bdd';
import { BoardListPage } from './pages/board-list.page';
import { BoardViewPage } from './pages/board-view.page';
import { TodoModalPage } from './pages/todo-modal.page';

type Fixtures = {
  boardListPage: BoardListPage;
  boardViewPage: BoardViewPage;
  todoModalPage: TodoModalPage;
  baseUrl: string;
  apiUrl: string;
};

export const test = base.extend<Fixtures>({
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  boardListPage: async ({ page }, use) => {
    await use(new BoardListPage(page));
  },

  boardViewPage: async ({ page }, use) => {
    await use(new BoardViewPage(page));
  },

  todoModalPage: async ({ page }, use) => {
    await use(new TodoModalPage(page));
  },
});
```

### Configuration Changes

**New playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/bdd/features/**/*.feature',
  steps: 'tests/bdd/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/bdd-report.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Migration Strategy

### Approach: Parallel Run with Gradual Cutover

We will run both systems in parallel during migration to ensure no regression:

```
Phase 1: Setup         → Install playwright-bdd, create fixtures
Phase 2: Convert       → Migrate step definitions one file at a time
Phase 3: Validate      → Run both systems, compare results
Phase 4: Cutover       → Remove Cucumber.js, update CI
Phase 5: Cleanup       → Remove legacy files, update documentation
```

### File-by-File Migration Order

| Order | File | Complexity | Dependencies |
|-------|------|------------|--------------|
| 1 | common.steps.ts | Low | None |
| 2 | board.steps.ts | Medium | common |
| 3 | column.steps.ts | Medium | board |
| 4 | todo.steps.ts | High | board, column |
| 5 | label.steps.ts | Medium | board |
| 6 | search.steps.ts | Medium | board, todo |

---

## Implementation Phases

### Phase 1: Foundation Setup

**Tasks:**
- [ ] Install playwright-bdd package
- [ ] Create fixtures.ts with page object fixtures
- [ ] Update playwright.config.ts with BDD configuration
- [ ] Add .features-gen/ to .gitignore
- [ ] Create npm scripts for new test commands

**Commands to Add:**
```json
{
  "scripts": {
    "test:bdd:gen": "bddgen",
    "test:bdd:new": "bddgen && playwright test",
    "test:bdd:new:ui": "bddgen && playwright test --ui",
    "test:bdd:new:debug": "bddgen && playwright test --debug"
  }
}
```

**Deliverables:**
- fixtures.ts created
- playwright.config.ts updated
- Both test systems runnable

### Phase 2: Step Definition Migration

**Tasks:**
- [ ] Create steps/ directory (new location)
- [ ] Migrate common.steps.ts (template for others)
- [ ] Migrate board.steps.ts
- [ ] Migrate column.steps.ts
- [ ] Migrate todo.steps.ts
- [ ] Migrate label.steps.ts
- [ ] Migrate search.steps.ts

**Migration Template:**
```typescript
// Before (each file)
import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

// After (each file)
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures';
const { Given, When, Then } = createBdd(test);

// Change: this.page → { page }
// Change: this.baseUrl → { baseUrl }
// Change: function() → arrow function
```

**Deliverables:**
- All 6 step definition files migrated
- All tests passing with new system

### Phase 3: Validation & Testing

**Tasks:**
- [ ] Run all feature files with playwright-bdd
- [ ] Compare test results with Cucumber.js output
- [ ] Fix any discrepancies
- [ ] Validate trace viewer works for failures
- [ ] Confirm screenshot/video capture on failure
- [ ] Test parallel execution with multiple workers

**Validation Checklist:**
| Feature Area | Scenarios | Status |
|--------------|-----------|--------|
| Boards | 7 scenarios | ⬜ |
| Columns | 8 scenarios | ⬜ |
| Todos | 15 scenarios | ⬜ |
| Labels | 12 scenarios | ⬜ |
| Search | 10 scenarios | ⬜ |

**Deliverables:**
- All scenarios passing
- Test report comparison document

### Phase 4: CI/CD Cutover

**Tasks:**
- [ ] Update GitHub Actions workflow
- [ ] Remove Cucumber.js test job
- [ ] Add playwright-bdd generation step
- [ ] Configure test sharding for parallel execution
- [ ] Update artifact collection for traces
- [ ] Update PR check configuration

**New CI Workflow (with Sharding & Parallel Execution):**

```yaml
name: BDD Tests

on: [push, pull_request]

jobs:
  # ============================================
  # SHARDED TEST EXECUTION
  # Splits tests across multiple parallel runners
  # ============================================
  bdd-tests:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        # Number of shards - increase for more parallelism
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Generate BDD spec files
        run: npm run test:bdd:gen
        working-directory: apps/web

      - name: Run Playwright tests (Shard ${{ matrix.shardIndex }}/${{ matrix.shardTotal }})
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
        working-directory: apps/web
        env:
          CI: true

      - name: Upload blob report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: apps/web/blob-report/
          retention-days: 7

  # ============================================
  # MERGE REPORTS FROM ALL SHARDS
  # ============================================
  merge-reports:
    if: always()
    needs: [bdd-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Download all blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports
        working-directory: apps/web

      - name: Upload merged HTML report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 14

      - name: Upload test traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-traces
          path: apps/web/test-results/
          retention-days: 7
```

### Sharding & Parallelism Configuration

#### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLAYWRIGHT TEST SHARDING                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                         52 Total Test Scenarios
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Shard 1  │ │ Shard 2  │ │ Shard 3  │ │ Shard 4  │
              │ 13 tests │ │ 13 tests │ │ 13 tests │ │ 13 tests │
              └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │            │
                   │     (Run in parallel on separate CI runners)
                   │            │            │            │
                   ▼            ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Report 1 │ │ Report 2 │ │ Report 3 │ │ Report 4 │
              └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │            │
                   └────────────┴─────┬──────┴────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │ Merge Reports│
                              │ (Final HTML) │
                              └──────────────┘
```

#### Parallelism Levels

| Level | Configuration | Where |
|-------|---------------|-------|
| **Shard-level** | `--shard=X/Y` | CI matrix strategy |
| **Worker-level** | `workers: 4` | playwright.config.ts |
| **Test-level** | `fullyParallel: true` | playwright.config.ts |

#### Updated playwright.config.ts for Sharding

```typescript
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/bdd/features/**/*.feature',
  steps: 'tests/bdd/steps/**/*.ts',
});

export default defineConfig({
  testDir,

  // ===== PARALLELISM SETTINGS =====
  fullyParallel: true,              // Run tests in files in parallel
  workers: process.env.CI ? 4 : undefined,  // 4 workers per shard in CI

  // ===== SHARDING SUPPORT =====
  reporter: process.env.CI
    ? [['blob', { outputDir: 'blob-report' }]]  // For merging shards
    : [['html', { open: 'never' }]],            // Local HTML report

  // ===== RETRY & FAILURE HANDLING =====
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // ===== BROWSER & TRACE SETTINGS =====
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // ===== BROWSER PROJECTS =====
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for cross-browser testing (increases CI time)
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // ===== DEV SERVER =====
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

#### Shard Count Recommendations

| Test Count | Recommended Shards | Estimated Time |
|------------|-------------------|----------------|
| < 30 | 2 | ~2-3 min |
| 30-60 | 4 | ~2-3 min |
| 60-120 | 6 | ~3-4 min |
| > 120 | 8+ | ~4-5 min |

> **Current:** 52 scenarios → **4 shards recommended** (~13 tests per shard)

#### Local Sharding (for debugging)

```bash
# Run specific shard locally
npx playwright test --shard=1/4
npx playwright test --shard=2/4

# Run with specific worker count
npx playwright test --workers=4
```

**Deliverables:**
- CI pipeline with sharding configured
- Merged reports from all shards
- All checks passing
- Faster CI execution (~3x improvement)

### Phase 5: Cleanup & Documentation

**Tasks:**
- [ ] Delete cucumber.config.js
- [ ] Delete support/world.ts
- [ ] Delete support/hooks.ts
- [ ] Delete step-definitions/ directory (old location)
- [ ] Remove @cucumber/cucumber from package.json
- [ ] Remove tsx from package.json (if not used elsewhere)
- [ ] Update README with new test commands
- [ ] Update CLAUDE.md with testing instructions

**Files to Remove:**
```
tests/bdd/cucumber.config.js
tests/bdd/support/world.ts
tests/bdd/support/hooks.ts
tests/bdd/step-definitions/  (entire directory)
```

**Deliverables:**
- All legacy files removed
- Documentation updated
- Final PR merged

---

## Local Verification & CI Monitoring

> **CRITICAL:** Never push migration changes to GitLab until all tests pass locally. This section defines the verification workflow.

### Pre-Push Verification Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOCAL → CI VERIFICATION WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────┐
   │  Code Changes    │
   │  Complete        │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐     ┌─────────────────────────────────┐
   │  Run Local Tests │────▶│  npm run test:bdd:new           │
   │                  │     │  (all feature files)            │
   └────────┬─────────┘     └─────────────────────────────────┘
            │
            ▼
   ┌──────────────────┐
   │  All Tests Pass? │
   └────────┬─────────┘
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
   ┌────┐       ┌────┐
   │ NO │       │YES │
   └──┬─┘       └──┬─┘
      │            │
      ▼            ▼
   ┌──────────┐  ┌──────────────────┐
   │ Debug &  │  │ Commit Changes   │
   │ Fix      │  │ git add && commit│
   └────┬─────┘  └────────┬─────────┘
        │                 │
        │                 ▼
        │        ┌──────────────────┐
        │        │ Push to GitLab   │
        │        │ git push origin  │
        │        └────────┬─────────┘
        │                 │
        │                 ▼
        │        ┌──────────────────┐
        │        │ Monitor CI       │
        │        │ Pipeline         │
        │        └────────┬─────────┘
        │                 │
        │          ┌──────┴──────┐
        │          │             │
        │          ▼             ▼
        │       ┌────┐       ┌────┐
        │       │FAIL│       │PASS│
        │       └──┬─┘       └──┬─┘
        │          │            │
        │          ▼            ▼
        │   ┌────────────┐  ┌──────────────┐
        └──▶│ Pull logs, │  │ Migration    │
            │ fix locally│  │ Step Done ✓  │
            └────────────┘  └──────────────┘
```

### Local Verification Checklist

Execute these commands **before every push**:

```bash
# 1. Generate spec files from features
cd apps/web
npm run test:bdd:gen

# 2. Run all BDD tests locally
npm run test:bdd:new

# 3. If any failures, run with UI for debugging
npm run test:bdd:new:ui

# 4. Verify all tests pass (expected output)
# ✓ 52 passed (example)
# No failures allowed before push
```

### Per-Phase Local Verification

| Phase | Local Command | Expected Result | Push Allowed? |
|-------|---------------|-----------------|---------------|
| Phase 1 | `npm run test:bdd` (old) | All pass | ✅ Yes |
| Phase 2 (per file) | `npm run test:bdd:new -- --grep "board"` | Migrated tests pass | ✅ Yes (incremental) |
| Phase 3 | `npm run test:bdd:new` | 100% pass rate | ✅ Yes |
| Phase 4 | `npm run test:bdd:new` | 100% pass rate | ✅ Yes |
| Phase 5 | `npm run test:bdd:new` | 100% pass rate | ✅ Yes (final) |

### CI Monitoring Process

After pushing to GitLab:

#### Step 1: Watch Pipeline Status
```bash
# Check pipeline status via GitLab CLI or web UI
# GitLab project: check Pipelines tab

# Or use GitLab API
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/{id}/pipelines?ref=$(git branch --show-current)"
```

#### Step 2: If CI Fails - Debugging Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CI FAILURE DEBUGGING                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. IDENTIFY FAILURE
   └──▶ Check GitLab pipeline logs
   └──▶ Download test artifacts (traces, screenshots)
   └──▶ Identify which test(s) failed

2. REPRODUCE LOCALLY
   └──▶ npm run test:bdd:new -- --grep "failing test name"
   └──▶ npm run test:bdd:new:debug  (step through)

3. COMMON CI-SPECIFIC ISSUES
   ┌─────────────────────────┬────────────────────────────────────────┐
   │ Issue                   │ Solution                               │
   ├─────────────────────────┼────────────────────────────────────────┤
   │ Timeout failures        │ Increase timeout in playwright.config  │
   │ Browser not found       │ Add playwright install step in CI      │
   │ Port already in use     │ Use dynamic ports or wait-on           │
   │ Flaky element selectors │ Use more robust locators (data-testid) │
   │ Race conditions         │ Add proper waitFor conditions          │
   │ Missing env vars        │ Check CI secrets/variables             │
   └─────────────────────────┴────────────────────────────────────────┘

4. FIX AND VERIFY
   └──▶ Make fix locally
   └──▶ Run full test suite: npm run test:bdd:new
   └──▶ All pass? → Push again
   └──▶ Monitor CI again
```

#### Step 3: CI Success Criteria

| Check | Requirement |
|-------|-------------|
| All BDD tests | ✅ Pass |
| Test report generated | ✅ Artifacts uploaded |
| No skipped tests | ✅ All scenarios executed |
| Execution time | ⚠️ Not significantly slower than before |

### GitLab CI Monitoring Commands

```bash
# View recent pipelines
# Use GitLab web UI: Project → CI/CD → Pipelines

# Download artifacts from failed job (via web UI)
# 1. Go to failed pipeline
# 2. Click on failed job
# 3. Download artifacts (playwright-report, test-traces)

# View job logs
# 1. Click on job in pipeline view
# 2. Scroll through logs to find failure
```

### Mandatory Gates

> **DO NOT proceed to next phase until:**

| Gate | Verification |
|------|-------------|
| Local tests pass | `npm run test:bdd:new` exits with code 0 |
| CI pipeline passes | GitLab shows green checkmark ✅ |
| No test regressions | Same or better pass rate than before |
| Artifacts generated | HTML report and traces available |

### Emergency Procedures

If CI is blocked and cannot be fixed quickly:

1. **Revert the push:**
   ```bash
   git revert HEAD
   git push origin <branch>
   ```

2. **Or rollback to previous working state:**
   ```bash
   git reset --hard <last-good-commit>
   git push origin <branch> --force  # Use with caution
   ```

3. **Notify team** if CI is blocked for > 1 hour

### Verification Log Template

Track verification results for each migration step:

```markdown
## Migration Verification Log

### Phase X: [Phase Name]
- **Date:** YYYY-MM-DD
- **Branch:** feature/playwright-bdd-migration

#### Local Verification
- [ ] Tests generated: `npm run test:bdd:gen`
- [ ] Tests executed: `npm run test:bdd:new`
- [ ] Result: X passed, Y failed
- [ ] All failures resolved: Yes/No

#### CI Verification
- [ ] Pushed to GitLab: commit SHA
- [ ] Pipeline ID: #XXXX
- [ ] Pipeline status: ✅ Passed / ❌ Failed
- [ ] Failures fixed: Yes/N/A
- [ ] Final status: ✅ Ready for next phase

#### Notes
- [Any issues encountered and how they were resolved]
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Step definition syntax incompatibility | Medium | High | Convert one file at a time, validate each |
| Feature file parsing differences | Low | Medium | playwright-bdd uses same Gherkin parser |
| CI pipeline disruption | Medium | High | Run parallel pipelines during transition |
| Team learning curve | Low | Low | Playwright already familiar; only imports change |
| Page object refactoring needed | Low | Medium | Page objects are framework-agnostic |
| Performance regression | Low | Low | Playwright-BDD is generally faster |
| Cucumber-specific features missing | Medium | Medium | Document any gaps, find workarounds |

### Cucumber Features to Validate

| Feature | Cucumber.js | Playwright-BDD | Notes |
|---------|-------------|----------------|-------|
| Tags (@smoke, @slow) | ✅ | ✅ | Supported |
| Scenario Outlines | ✅ | ✅ | Supported |
| Data Tables | ✅ | ✅ | Supported |
| Doc Strings | ✅ | ✅ | Supported |
| Hooks (Before/After) | ✅ | ✅ | Use Playwright hooks |
| Background | ✅ | ✅ | Supported |
| Custom parameter types | ✅ | ✅ | Supported |
| Parallel execution | ✅ | ✅ | Better in Playwright |

---

## Rollback Plan

If critical issues arise during migration:

### Immediate Rollback (Phase 1-2)
1. Keep old step-definitions/ directory until Phase 5
2. Cucumber config remains until cutover
3. Run `npm run test:bdd` (old command) to verify

### Post-Cutover Rollback
1. Restore from git: `git checkout HEAD~1 -- tests/bdd/`
2. Reinstall Cucumber: `npm install @cucumber/cucumber tsx`
3. Restore CI workflow from git history

### Rollback Triggers
- More than 20% of tests failing after migration
- CI pipeline blocked for > 4 hours
- Critical debugging capability lost

---

## Dependencies & Prerequisites

### Package Changes

**Add:**
```json
{
  "devDependencies": {
    "playwright-bdd": "^7.0.0"
  }
}
```

**Remove (Phase 5):**
```json
{
  "devDependencies": {
    "@cucumber/cucumber": "remove",
    "tsx": "remove (if not used elsewhere)"
  }
}
```

### Prerequisites Checklist

- [ ] All current BDD tests passing
- [ ] No pending PRs modifying test infrastructure
- [ ] Team notified of migration timeline
- [ ] Backup of current test reports generated

---

## Timeline & Milestones

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Foundation | 1 day | Fixtures created, dual-system running |
| Phase 2: Migration | 2-3 days | All step definitions converted |
| Phase 3: Validation | 1 day | All tests passing, comparison complete |
| Phase 4: CI Cutover | 0.5 day | CI using playwright-bdd exclusively |
| Phase 5: Cleanup | 0.5 day | Legacy code removed, docs updated |

**Total Estimated Duration:** 5-6 days

---

## Appendix

### A. Command Reference

| Action | Old Command | New Command |
|--------|-------------|-------------|
| Run all BDD tests | `npm run test:bdd` | `npm run test:bdd:new` |
| Run with UI | N/A | `npm run test:bdd:new:ui` |
| Debug mode | N/A | `npm run test:bdd:new:debug` |
| Generate specs | N/A | `npm run test:bdd:gen` |
| View report | `open reports/bdd-report.html` | `npx playwright show-report` |

### B. Trace Viewer Usage

After migration, debug failing tests with:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

### C. Reference Links

- [Playwright-BDD Documentation](https://vitalets.github.io/playwright-bdd/)
- [Playwright-BDD GitHub](https://github.com/vitalets/playwright-bdd)
- [Playwright Test Documentation](https://playwright.dev/docs/test-intro)
- [Migration Examples](https://github.com/vitalets/playwright-bdd/tree/main/examples)

### D. Step Definition Conversion Cheatsheet

```typescript
// Pattern Replacements:

// 1. Imports
- import { Given, When, Then } from '@cucumber/cucumber';
- import { CustomWorld } from '../support/world';
+ import { createBdd } from 'playwright-bdd';
+ import { test } from '../fixtures';
+ const { Given, When, Then } = createBdd(test);

// 2. Function signatures
- Given('step', async function (this: CustomWorld, arg: string) {
+ Given('step', async ({ page, baseUrl }, arg: string) => {

// 3. Page access
- this.page
+ page

// 4. World parameters
- this.baseUrl
+ baseUrl

// 5. Page objects (use fixtures)
- const boardPage = new BoardListPage(this.page);
+ // Use fixture: { boardListPage }
```

---

## Sign-Off

| Role | Name | Date | Approval |
|------|------|------|----------|
| Engineering Lead | | | ⬜ |
| QA Lead | | | ⬜ |
| DevOps | | | ⬜ |

---

*This document will be updated as the migration progresses.*
