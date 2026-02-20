# Current Task: Architecture Testing with ArchUnitTS

## Goal
Implement architecture testing in the InZone monorepo using ArchUnitTS to enforce architectural boundaries, detect circular dependencies, validate naming conventions, and track code quality metrics.

## PRD Location
`.claude/plans/archunit-ts-implementation-prd.md`

## Status

| Phase | Status |
|-------|--------|
| Phase 1: Foundation (Install, Configure, Basic Cycle Detection) | ✅ Complete |
| Phase 2: Layer Rules (Backend, Frontend, Shared Package) | ✅ Complete |
| Phase 3: Conventions & Metrics (Naming, Code Metrics, Reports) | ✅ Complete |
| Phase 4: CI/CD & Documentation | ✅ Complete |

## Summary

Enforce architectural rules automatically via ArchUnitTS:
- **Backend (api):** Layer dependencies (routes→services→lib), no circular deps, naming conventions, code metrics
- **Frontend (web):** Component layer isolation (UI vs feature), hooks don't import components, API layer independence
- **Shared package:** No app-specific dependencies, no circular deps
- **CI/CD:** Run arch tests on every PR and master commit

## Commands

```bash
# Run architecture tests
pnpm test:arch

# Run architecture tests in watch mode
pnpm test:arch:watch

# Generate HTML report
pnpm test:arch:report
```

## Notes
- Uses ArchUnitTS (`archunit` npm package v2.1.63) with Vitest
- Test files located in `src/architecture/` directories per app
- CI integration via GitHub Actions (`.github/workflows/architecture-tests.yml`)
- Turbo task `test:arch` configured in `turbo.json`
