# Ralph Loop Prompt - Phase 2: Automated Testing

Read the PRD at `.claude/plans/inzone-prd.md` and continue implementing the InZone application's automated testing infrastructure.

## Instructions

1. **Read the PRD** - Start by reading `.claude/plans/inzone-prd.md` to understand the full context
2. **Check the Feature Roadmap** - Look at Section 11 "Feature Roadmap" > "Phase 2: Automated Testing"
3. **Read Testing PRDs** - Review the detailed specifications in:
   - `.claude/plans/testing/bdd-testing-prd.md` for BDD test requirements
   - `.claude/plans/testing/unit-testing-prd.md` for unit test requirements
4. **Find the next task** - Identify the first unchecked `[ ]` item in Phase 2
5. **Implement it** - Complete the task following the Testing PRD specifications
6. **Update the PRD** - Mark the item as `[x]` when done
7. **Commit your work** - Create a git commit with your changes

## Testing Implementation Guidelines

### For BDD Tests:
- Use Playwright + Cucumber.js for frontend E2E tests
- Use Supertest + Cucumber.js for backend API tests
- Write Gherkin feature files in `apps/*/tests/bdd/features/`
- Implement step definitions in `apps/*/tests/bdd/step-definitions/`
- **Include both happy path AND unhappy path scenarios**

### For Unit Tests:
- Use Vitest for both frontend and backend
- Use React Testing Library for component tests
- Use MSW for API mocking in frontend tests
- Use Prisma Mock for database mocking in backend tests
- **Include both happy path AND unhappy path test cases**
- Colocate test files with source files (e.g., `Component.tsx` → `Component.test.tsx`)

### For CI Updates:
- Create `.github/workflows/bdd-tests.yml` for BDD test job
- Create `.github/workflows/unit-tests.yml` for unit test job
- Configure test database for CI
- Add coverage reporting integration
- Set 80% coverage threshold

## Quality Requirements

- All tests must cover both success (happy) and failure (unhappy) scenarios
- Tests should be deterministic and not flaky
- Follow the test patterns specified in the Testing PRDs
- Ensure tests can run in CI environment

## Completion

- If you completed a task this iteration, end your response normally (Ralph will start another iteration)
- If ALL Phase 2 items are checked `[x]`, output: **RALPH_COMPLETE**

## Notes

- Keep changes focused on ONE checklist item per iteration
- Ensure the app builds and existing functionality still works after your changes
- Run tests locally to verify they pass before committing
