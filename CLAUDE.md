# InZone Project Guidelines

## Testing
- Frontend test coverage threshold is 80% (enforced in CI via `.github/workflows/ci-frontend.yml`). NEVER lower this threshold unless the user explicitly asks. Add more tests to meet coverage instead.
- Use `pnpm vitest run --coverage` in `apps/web/` to check coverage locally before pushing.
- Use `pnpm test:bdd` in `apps/web/` for E2E BDD tests.
- Use `fireEvent` instead of `userEvent.type()` for tests that set input values with special characters, long strings, or whitespace — `userEvent` can produce garbled input on Linux CI due to `autoFocus` interference.

## Package Manager
- Always use `pnpm` (not npm, npx, or yarn).

## Monorepo Structure
- `apps/web/` - React frontend (Vite + React + TypeScript)
- `apps/api/` - Backend API
- All frontend source is under `apps/web/src/`
- Tests are co-located with source files (e.g., `Component.test.tsx` next to `Component.tsx`)
- BDD tests are in `apps/web/tests/bdd/`
