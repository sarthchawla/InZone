# PRD: Architecture Testing with ArchUnitTS

## Document Information
- **Author:** Claude Code
- **Date:** 2026-02-06
- **Status:** Draft
- **Project:** InZone

---

## 1. Executive Summary

This PRD outlines the implementation of architecture testing in the InZone monorepo using [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS). The goal is to enforce architectural boundaries, detect circular dependencies, validate naming conventions, and maintain code quality metrics automatically through CI/CD pipelines.

---

## 2. Problem Statement

### Current State
- No automated architecture enforcement in the codebase
- Architectural decisions documented in CLAUDE.md but not automatically validated
- Risk of architectural drift as the codebase grows
- Circular dependencies can be introduced silently
- Layer violations (routes accessing database directly) may go unnoticed
- No metrics tracking for code complexity or cohesion

### Impact
- Technical debt accumulates without visibility
- New developers may inadvertently violate architectural patterns
- Code reviews must manually check for architecture violations
- No historical tracking of architectural compliance

---

## 3. Goals & Objectives

### Primary Goals
1. **Prevent Architectural Drift** - Automatically enforce layer boundaries
2. **Detect Circular Dependencies** - Fail builds when cycles are introduced
3. **Enforce Naming Conventions** - Ensure consistent file/class naming
4. **Track Code Metrics** - Monitor complexity and cohesion over time

### Success Metrics
| Metric | Target |
|--------|--------|
| Architecture test coverage | 100% of key patterns |
| Build failures on violations | < 5% false positives |
| Time to detect violations | At PR stage (pre-merge) |
| Developer adoption | All PRs pass arch tests |

---

## 4. Proposed Solution

### 4.1 Installation & Setup

```bash
# Install ArchUnitTS in root
pnpm add -D archunit -w

# Or per workspace if needed
pnpm add -D archunit --filter @inzone/api
pnpm add -D archunit --filter @inzone/web
```

**Vitest Configuration Update** (`vitest.config.ts`):
```typescript
export default defineConfig({
  test: {
    globals: true, // Required for ArchUnitTS toPassAsync() matcher
    // ... existing config
  }
});
```

### 4.2 Architecture Test Structure

```
apps/
├── api/
│   └── src/
│       └── architecture/
│           ├── layers.arch.test.ts      # Layer dependency rules
│           ├── cycles.arch.test.ts      # Circular dependency checks
│           ├── naming.arch.test.ts      # Naming conventions
│           └── metrics.arch.test.ts     # Code quality metrics
└── web/
    └── src/
        └── architecture/
            ├── layers.arch.test.ts      # Component layer rules
            ├── cycles.arch.test.ts      # Circular dependency checks
            ├── naming.arch.test.ts      # Naming conventions
            └── metrics.arch.test.ts     # Code quality metrics
```

---

## 5. Architecture Rules Specification

### 5.1 Backend (apps/api) Rules

#### 5.1.1 Layer Dependency Rules

```typescript
// apps/api/src/architecture/layers.arch.test.ts
import { projectFiles } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('API Layer Architecture', () => {
  describe('Routes Layer', () => {
    it('routes should not directly access Prisma', async () => {
      const rule = projectFiles()
        .inFolder('src/routes/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/lib/prisma.ts');

      await expect(rule).toPassAsync();
    });

    it('routes should only use services for business logic', async () => {
      const rule = projectFiles()
        .inFolder('src/routes/**')
        .should()
        .dependOnFiles()
        .inFolder('src/services/**');

      await expect(rule).toPassAsync();
    });
  });

  describe('Services Layer', () => {
    it('services should not depend on routes', async () => {
      const rule = projectFiles()
        .inFolder('src/services/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/routes/**');

      await expect(rule).toPassAsync();
    });

    it('services should not depend on middleware', async () => {
      const rule = projectFiles()
        .inFolder('src/services/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/middleware/**');

      await expect(rule).toPassAsync();
    });
  });

  describe('Validators Layer', () => {
    it('validators should not have external dependencies', async () => {
      const rule = projectFiles()
        .inFolder('src/validators/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/services/**');

      await expect(rule).toPassAsync();
    });
  });

  describe('Middleware Layer', () => {
    it('middleware should not depend on services', async () => {
      const rule = projectFiles()
        .inFolder('src/middleware/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/services/**');

      await expect(rule).toPassAsync();
    });
  });
});
```

**Layer Dependency Diagram:**
```
┌─────────────────────────────────────────────────────────┐
│                      Routes Layer                        │
│  (HTTP handling, request/response, calls services)      │
└─────────────────────┬───────────────────────────────────┘
                      │ depends on
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Services Layer                        │
│  (Business logic, data access via Prisma)               │
└─────────────────────┬───────────────────────────────────┘
                      │ depends on
                      ▼
┌─────────────────────────────────────────────────────────┐
│                      Lib Layer                           │
│  (Prisma client, utilities)                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Validators Layer                       │
│  (Zod schemas - no dependencies on other layers)        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Middleware Layer                       │
│  (Express middleware - no service dependencies)          │
└─────────────────────────────────────────────────────────┘
```

#### 5.1.2 Circular Dependency Rules

```typescript
// apps/api/src/architecture/cycles.arch.test.ts
import { projectFiles } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('API Circular Dependencies', () => {
  it('should have no circular dependencies in src folder', async () => {
    const rule = projectFiles()
      .inFolder('src/**')
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it('should have no circular dependencies between services', async () => {
    const rule = projectFiles()
      .inFolder('src/services/**')
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it('should have no circular dependencies between routes', async () => {
    const rule = projectFiles()
      .inFolder('src/routes/**')
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });
});
```

#### 5.1.3 Naming Convention Rules

```typescript
// apps/api/src/architecture/naming.arch.test.ts
import { projectFiles } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('API Naming Conventions', () => {
  it('service files should end with .service.ts', async () => {
    const rule = projectFiles()
      .inFolder('src/services/**')
      .should()
      .matchPattern('*.service.ts');

    await expect(rule).toPassAsync();
  });

  it('route files should be kebab-case', async () => {
    const rule = projectFiles()
      .inFolder('src/routes/**')
      .should()
      .matchPattern('[a-z-]+.ts');

    await expect(rule).toPassAsync();
  });

  it('test files should end with .test.ts or .spec.ts', async () => {
    const rule = projectFiles()
      .inFolder('src/**')
      .withNameMatching(/\.test\.ts$|\.spec\.ts$/)
      .should()
      .exist();

    await expect(rule).toPassAsync();
  });
});
```

#### 5.1.4 Code Metrics Rules

```typescript
// apps/api/src/architecture/metrics.arch.test.ts
import { metrics } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('API Code Metrics', () => {
  describe('File Size Limits', () => {
    it('service files should be under 500 lines', async () => {
      const rule = metrics()
        .forFiles('src/services/**/*.ts')
        .count()
        .linesOfCode()
        .shouldBeBelow(500);

      await expect(rule).toPassAsync();
    });

    it('route files should be under 300 lines', async () => {
      const rule = metrics()
        .forFiles('src/routes/**/*.ts')
        .count()
        .linesOfCode()
        .shouldBeBelow(300);

      await expect(rule).toPassAsync();
    });
  });

  describe('Cohesion Metrics', () => {
    it('services should have high cohesion (LCOM < 0.8)', async () => {
      const rule = metrics()
        .forFiles('src/services/**/*.ts')
        .calculate()
        .lackOfCohesion()
        .shouldBeBelow(0.8);

      await expect(rule).toPassAsync();
    });
  });

  describe('Method Count', () => {
    it('service classes should have at most 15 public methods', async () => {
      const rule = metrics()
        .forFiles('src/services/**/*.ts')
        .count()
        .methods()
        .shouldBeBelow(15);

      await expect(rule).toPassAsync();
    });
  });
});
```

---

### 5.2 Frontend (apps/web) Rules

#### 5.2.1 Component Layer Rules

```typescript
// apps/web/src/architecture/layers.arch.test.ts
import { projectFiles } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('Frontend Layer Architecture', () => {
  describe('UI Components', () => {
    it('UI components should not import feature components', async () => {
      const rule = projectFiles()
        .inFolder('src/components/ui/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/components/board/**')
        .and()
        .inFolder('src/components/column/**')
        .and()
        .inFolder('src/components/todo/**');

      await expect(rule).toPassAsync();
    });

    it('UI components should not use React Query directly', async () => {
      const rule = projectFiles()
        .inFolder('src/components/ui/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/hooks/**');

      await expect(rule).toPassAsync();
    });
  });

  describe('Hooks Layer', () => {
    it('hooks should not import components', async () => {
      const rule = projectFiles()
        .inFolder('src/hooks/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/components/**');

      await expect(rule).toPassAsync();
    });

    it('hooks should use api client for data fetching', async () => {
      const rule = projectFiles()
        .inFolder('src/hooks/**')
        .should()
        .dependOnFiles()
        .inFolder('src/api/**');

      await expect(rule).toPassAsync();
    });
  });

  describe('Feature Components', () => {
    it('feature components should use hooks for data', async () => {
      const rule = projectFiles()
        .inFolder('src/components/board/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/api/**');

      await expect(rule).toPassAsync();
    });
  });

  describe('API Layer', () => {
    it('API layer should not depend on components', async () => {
      const rule = projectFiles()
        .inFolder('src/api/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/components/**');

      await expect(rule).toPassAsync();
    });

    it('API layer should not depend on hooks', async () => {
      const rule = projectFiles()
        .inFolder('src/api/**')
        .shouldNot()
        .dependOnFiles()
        .inFolder('src/hooks/**');

      await expect(rule).toPassAsync();
    });
  });
});
```

**Frontend Layer Diagram:**
```
┌─────────────────────────────────────────────────────────┐
│              Feature Components                          │
│  (BoardList, BoardView, TodoItem, etc.)                 │
│  Uses: UI components, hooks                              │
└─────────────────────┬───────────────────────────────────┘
                      │ uses
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────────┐  ┌─────────────────────────────────┐
│   UI Components     │  │         Hooks Layer              │
│  (Button, Modal,    │  │  (useBoards, useTodos, etc.)    │
│   Input, Badge)     │  │  Uses: API client                │
│  No external deps   │  └─────────────────┬───────────────┘
└─────────────────────┘                    │ uses
                                           ▼
                       ┌─────────────────────────────────────┐
                       │           API Layer                  │
                       │  (Axios client, endpoints)          │
                       │  No component/hook dependencies     │
                       └─────────────────────────────────────┘
```

#### 5.2.2 Frontend Circular Dependencies

```typescript
// apps/web/src/architecture/cycles.arch.test.ts
import { projectFiles } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('Frontend Circular Dependencies', () => {
  it('should have no circular dependencies in src', async () => {
    const rule = projectFiles()
      .inFolder('src/**')
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it('should have no circular dependencies between hooks', async () => {
    const rule = projectFiles()
      .inFolder('src/hooks/**')
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it('should have no circular dependencies between components', async () => {
    const rule = projectFiles()
      .inFolder('src/components/**')
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });
});
```

#### 5.2.3 Frontend Naming Conventions

```typescript
// apps/web/src/architecture/naming.arch.test.ts
import { projectFiles } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('Frontend Naming Conventions', () => {
  it('React components should be PascalCase', async () => {
    const rule = projectFiles()
      .inFolder('src/components/**')
      .withExtension('.tsx')
      .should()
      .matchPattern('[A-Z][a-zA-Z]+.tsx');

    await expect(rule).toPassAsync();
  });

  it('hooks should start with use', async () => {
    const rule = projectFiles()
      .inFolder('src/hooks/**')
      .should()
      .matchPattern('use*.ts');

    await expect(rule).toPassAsync();
  });

  it('context files should end with Context.tsx', async () => {
    const rule = projectFiles()
      .inFolder('src/contexts/**')
      .should()
      .matchPattern('*Context.tsx');

    await expect(rule).toPassAsync();
  });
});
```

#### 5.2.4 Frontend Metrics

```typescript
// apps/web/src/architecture/metrics.arch.test.ts
import { metrics } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('Frontend Code Metrics', () => {
  it('components should be under 300 lines', async () => {
    const rule = metrics()
      .forFiles('src/components/**/*.tsx')
      .count()
      .linesOfCode()
      .shouldBeBelow(300);

    await expect(rule).toPassAsync();
  });

  it('hooks should be under 200 lines', async () => {
    const rule = metrics()
      .forFiles('src/hooks/**/*.ts')
      .count()
      .linesOfCode()
      .shouldBeBelow(200);

    await expect(rule).toPassAsync();
  });

  it('UI components should be small (under 150 lines)', async () => {
    const rule = metrics()
      .forFiles('src/components/ui/**/*.tsx')
      .count()
      .linesOfCode()
      .shouldBeBelow(150);

    await expect(rule).toPassAsync();
  });
});
```

---

### 5.3 Shared Package Rules

```typescript
// packages/shared/src/architecture/deps.arch.test.ts
import { projectFiles } from 'archunit';
import { describe, it, expect } from 'vitest';

describe('Shared Package Architecture', () => {
  it('shared package should have no external app dependencies', async () => {
    const rule = projectFiles()
      .inFolder('src/**')
      .shouldNot()
      .dependOnFiles()
      .inFolder('../../apps/**');

    await expect(rule).toPassAsync();
  });

  it('should have no circular dependencies', async () => {
    const rule = projectFiles()
      .inFolder('src/**')
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });
});
```

---

## 6. CI/CD Integration

### 6.1 Package.json Scripts

```json
{
  "scripts": {
    "test:arch": "vitest run --testPathPattern=architecture",
    "test:arch:watch": "vitest --testPathPattern=architecture",
    "test:arch:report": "vitest run --testPathPattern=architecture --reporter=html"
  }
}
```

### 6.2 Turbo Pipeline Update

```json
{
  "pipeline": {
    "test:arch": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**", "reports/**"]
    }
  }
}
```

### 6.3 GitLab CI Integration

```yaml
# .gitlab-ci.yml
architecture-tests:
  stage: test
  script:
    - pnpm install
    - pnpm test:arch
  artifacts:
    when: always
    paths:
      - apps/*/reports/
    reports:
      junit: apps/*/junit.xml
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "master"
```

---

## 7. Implementation Plan

### Phase 1: Foundation (Week 1)
| Task | Priority | Effort |
|------|----------|--------|
| Install ArchUnitTS in workspace | High | Low |
| Configure Vitest for arch tests | High | Low |
| Create test directory structure | High | Low |
| Implement basic cycle detection | High | Medium |

### Phase 2: Layer Rules (Week 2)
| Task | Priority | Effort |
|------|----------|--------|
| Backend layer dependency rules | High | Medium |
| Frontend layer dependency rules | High | Medium |
| Shared package isolation rules | Medium | Low |

### Phase 3: Conventions & Metrics (Week 3)
| Task | Priority | Effort |
|------|----------|--------|
| Naming convention rules | Medium | Low |
| Code metrics rules | Medium | Medium |
| HTML report generation | Low | Low |

### Phase 4: CI/CD & Documentation (Week 4)
| Task | Priority | Effort |
|------|----------|--------|
| CI pipeline integration | High | Medium |
| Developer documentation | Medium | Low |
| Baseline metrics capture | Medium | Low |

---

## 8. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| False positives block PRs | High | Medium | Start with warnings, gradually enforce |
| Performance impact on CI | Medium | Low | Run arch tests in parallel, cache results |
| Developer pushback | Medium | Medium | Document clear rationale, provide easy fixes |
| Library maintenance | Low | Low | MIT license, active development, can fork |

---

## 9. Future Enhancements

### 9.1 Custom Rules
- Domain-specific rules (e.g., soft-deletion validation)
- Integration with Prisma schema validation
- React Query cache invalidation patterns

### 9.2 Metrics Dashboard
- Historical trend tracking
- Team-based metrics comparison
- Architecture compliance score

### 9.3 IDE Integration
- VS Code extension for real-time feedback
- Pre-commit hooks for local validation

---

## 10. Acceptance Criteria

1. **Architecture tests pass** - All defined rules execute without errors
2. **CI integration complete** - Tests run on every PR and master commit
3. **No false positives** - Current codebase passes all tests
4. **Documentation complete** - README updated with arch test instructions
5. **Metrics baselined** - Initial metrics captured for comparison

---

## 11. Appendix

### A. ArchUnitTS API Reference

| API | Description |
|-----|-------------|
| `projectFiles()` | Entry point for file-based rules |
| `.inFolder(glob)` | Filter files by folder pattern |
| `.should()` / `.shouldNot()` | Define positive/negative assertions |
| `.dependOnFiles()` | Check import dependencies |
| `.haveNoCycles()` | Detect circular dependencies |
| `.matchPattern(glob)` | Validate naming conventions |
| `metrics()` | Entry point for code metrics |
| `.count().linesOfCode()` | Count lines of code |
| `.calculate().lackOfCohesion()` | Calculate LCOM score |
| `toPassAsync()` | Vitest matcher for async rules |

### B. Current Architecture Violations to Address

Based on codebase analysis, these patterns should be validated:

1. **Routes must not import Prisma directly** - All data access through services
2. **UI components must remain pure** - No data fetching or business logic
3. **Hooks must not import components** - Prevents circular dependencies
4. **Shared package must be independent** - No app-specific dependencies

### C. Related Documentation

- [ArchUnitTS GitHub](https://github.com/LukasNiessen/ArchUnitTS)
- [ArchUnit (Java) Documentation](https://www.archunit.org/userguide/html/000_Index.html)
- [InZone Architecture Documentation](./architecture-overview.md)
