# Ralph Loop Prompt - Playwright-BDD Migration

**Goal:** Execute the migration from Cucumber.js to Playwright-BDD as defined in `.claude/plans/migrations/playwright-bdd-migration-prd.md`

## Migration Plan Reference

Full PRD: `.claude/plans/migrations/playwright-bdd-migration-prd.md`

## Current Phase

Track progress through these phases:
- [ ] **Phase 1: Foundation Setup** - Install playwright-bdd, create fixtures, update config
- [ ] **Phase 2: Step Definition Migration** - Convert all 6 step definition files
- [ ] **Phase 3: Validation & Testing** - Run all tests, compare results
- [ ] **Phase 4: CI/CD Cutover** - Update GitHub Actions workflow
- [ ] **Phase 5: Cleanup & Documentation** - Remove legacy files, update docs

## Instructions

1. **Read the PRD** - Review `.claude/plans/migrations/playwright-bdd-migration-prd.md` for full context
2. **Check Current Phase** - Determine which phase you're in based on what's been completed
3. **Execute Phase Tasks** - Complete all tasks for the current phase
4. **Verify Locally** - Run tests locally before committing:
   ```bash
   cd apps/web
   pnpm test:bdd:gen    # Generate spec files
   pnpm test:bdd:new    # Run all BDD tests
   ```
5. **Commit and Push** - Commit your changes and push:
   ```bash
   git add -A && git commit -m "Migration: <description>" && git push
   ```
6. **Monitor CI** - Wait for CI pipeline to pass:
   ```bash
   gh pr checks 2 --watch
   ```
7. **Proceed to Next Phase** - Only after local tests pass AND CI is green

## Phase-by-Phase Checklist

### Phase 1: Foundation Setup
- [ ] Install playwright-bdd package: `pnpm add -D playwright-bdd`
- [ ] Create `tests/bdd/fixtures.ts` with page object fixtures
- [ ] Update `playwright.config.ts` with BDD configuration
- [ ] Add `.features-gen/` to `.gitignore`
- [ ] Add pnpm scripts: `test:bdd:gen`, `test:bdd:new`, `test:bdd:new:ui`, `test:bdd:new:debug`

### Phase 2: Step Definition Migration
Convert files in this order (see PRD for conversion template):
- [ ] `common.steps.ts` → `steps/common.steps.ts`
- [ ] `board.steps.ts` → `steps/board.steps.ts`
- [ ] `column.steps.ts` → `steps/column.steps.ts`
- [ ] `todo.steps.ts` → `steps/todo.steps.ts`
- [ ] `label.steps.ts` → `steps/label.steps.ts`
- [ ] `search.steps.ts` → `steps/search.steps.ts`

### Phase 3: Validation & Testing
- [ ] Run all feature files with playwright-bdd
- [ ] Compare test results with Cucumber.js output
- [ ] Fix any discrepancies
- [ ] Validate trace viewer works for failures
- [ ] Test parallel execution with multiple workers

### Phase 4: CI/CD Cutover
- [ ] Update GitHub Actions workflow with sharding
- [ ] Remove Cucumber.js test job
- [ ] Add playwright-bdd generation step
- [ ] Configure test artifact collection

### Phase 5: Cleanup & Documentation
- [ ] Delete `cucumber.config.js`
- [ ] Delete `support/world.ts` and `support/hooks.ts`
- [ ] Delete `step-definitions/` directory
- [ ] Remove `@cucumber/cucumber` from package.json
- [ ] Update README and CLAUDE.md

## Useful Commands

```bash
# Generate BDD spec files
cd apps/web && pnpm test:bdd:gen

# Run new BDD tests
pnpm test:bdd:new

# Run with UI (debugging)
pnpm test:bdd:new:ui

# Run old Cucumber tests (for comparison)
pnpm test:bdd

# Check PR status
gh pr view 2 --json statusCheckRollup

# Watch CI checks
gh pr checks 2 --watch
```

## Completion Criteria

Keep iterating until ALL of the following are true:
- All 5 phases completed
- All BDD tests passing with playwright-bdd
- CI pipeline green with new test setup
- Legacy Cucumber.js files removed
- Documentation updated

**When migration is complete, output:** **RALPH_COMPLETE**

## Important Notes

- **Never push until local tests pass** - Always verify with `pnpm test:bdd:new`
- **One phase at a time** - Complete and verify each phase before proceeding
- **Keep old system running** - Until Phase 4, both systems should work
- **Refer to PRD** - The full migration plan has detailed code examples and templates
- **Track progress** - Update the phase checklist as you complete tasks
