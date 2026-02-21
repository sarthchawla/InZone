# Claude Code Automation Recommendations for InZone

**Date**: 2026-02-22
**Branch**: future-roadmap
**Analysis scope**: Full monorepo (apps/web, apps/api, packages/shared, scripts, CI/CD)

---

## 1. Current Setup Assessment

### What Already Exists

| Category | Item | Status |
|----------|------|--------|
| **Commands** | 10 custom slash commands (fix-ci, create-mr, worktree, etc.) | Well-developed |
| **Skills** | 15 custom skills (auth, testing, DB, frontend patterns, etc.) | Extensive |
| **Plugins** | 10 official plugins enabled (code-review, security, frontend-design, etc.) | Good coverage |
| **Instructions** | env-setup.md, CLAUDE.md with project rules | Solid |
| **Ralph** | Autonomous PRD-driven dev loop (v1 bash + v2 python) | Mature |
| **Agent Teams** | Experimental flag enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | Enabled but no agents defined |
| **MCP Servers** | No `.mcp.json` found | Missing |
| **Hooks** | No `.claude/hooks/` directory | Missing |
| **Git Hooks** | No husky/lint-staged/pre-commit hooks | Missing |
| **Prettier Config** | No `.prettierrc` (format script exists but no config file) | Gap |

### Strengths
- Comprehensive slash commands covering CI fixing, MR creation, worktree management
- Deep skill library for auth, testing, and domain patterns
- Autonomous development loop (Ralph) for PRD-driven work
- Strong CI pipeline with coverage thresholds (80%) and architecture tests
- Well-structured monorepo with Turborepo

### Gaps
- **No hooks** to catch mistakes before they happen (wrong package manager, missing tests, etc.)
- **No MCP servers** for database inspection, CI monitoring, or Vercel status
- **No custom agents** despite agent teams being enabled
- **No automated formatting** on file save/edit
- **No pre-commit validation** to catch issues before push

---

## 2. Recommendations

### HIGH Priority

---

#### H1: PreToolUse Hook -- Package Manager Enforcement

**What**: Block any `Bash` command containing `npm `, `npx `, or `yarn ` and suggest `pnpm` instead.

**Why**: CLAUDE.md already instructs to use pnpm, but hooks provide a hard enforcement layer that prevents mistakes even when instructions are overlooked. This is especially important during Ralph autonomous runs where there is no human review.

**Implementation**: Create `.claude/hooks/enforce-pnpm.js`

```js
// .claude/hooks/enforce-pnpm.js
export default {
  name: "enforce-pnpm",
  event: "PreToolUse",
  hooks: [
    {
      matcher: { tool: "Bash" },
      handler: async ({ input }) => {
        const cmd = input.command || "";
        if (/\b(npm|npx|yarn)\s/.test(cmd) && !/pnpm/.test(cmd)) {
          return {
            decision: "block",
            reason: "Use pnpm instead of npm/npx/yarn. This project requires pnpm as the package manager."
          };
        }
        return { decision: "allow" };
      }
    }
  ]
};
```

---

#### H2: PreToolUse Hook -- Prevent Coverage Threshold Lowering

**What**: Block edits to CI workflow files or vitest config files that lower coverage thresholds.

**Why**: Both CLAUDE.md and the global instructions explicitly state "NEVER lower test coverage thresholds." A hook makes this impossible rather than relying on instruction compliance.

**Implementation**: Create `.claude/hooks/protect-coverage.js`

```js
// .claude/hooks/protect-coverage.js
export default {
  name: "protect-coverage",
  event: "PreToolUse",
  hooks: [
    {
      matcher: { tool: "Edit" },
      handler: async ({ input }) => {
        const file = input.file_path || "";
        const isCI = file.includes("ci-frontend.yml") || file.includes("ci-backend.yml");
        const isVitestConfig = file.includes("vitest.config");

        if ((isCI || isVitestConfig) && input.new_string) {
          if (file.includes(".yml") && input.old_string?.includes("< 80") && !input.new_string.includes("< 80")) {
            return {
              decision: "block",
              reason: "Cannot lower coverage threshold. Add more tests to meet the 80% threshold instead."
            };
          }
        }
        return { decision: "allow" };
      }
    }
  ]
};
```

---

#### H3: PostToolUse Hook -- Auto-Lint After Edits

**What**: After editing a `.ts`, `.tsx`, `.js`, or `.jsx` file, automatically run ESLint on the changed file.

**Why**: Catches lint issues immediately rather than discovering them at CI time or during `pnpm lint`. Reduces fix-ci iterations.

**Implementation**: Create `.claude/hooks/auto-lint.js`

```js
// .claude/hooks/auto-lint.js
import { execFileSync } from "child_process";

export default {
  name: "auto-lint",
  event: "PostToolUse",
  hooks: [
    {
      matcher: { tool: "Edit" },
      handler: async ({ input }) => {
        const file = input.file_path || "";
        if (!/\.(ts|tsx|js|jsx)$/.test(file)) return;

        try {
          let filter = "";
          if (file.includes("apps/web/")) filter = "web";
          else if (file.includes("apps/api/")) filter = "api";
          else return;

          execFileSync("pnpm", ["--filter", filter, "eslint", "--fix", file], {
            cwd: process.env.PROJECT_ROOT || ".",
            timeout: 15000,
            stdio: "pipe"
          });
        } catch (e) {
          return {
            message: `Lint issues found in ${file}. Consider fixing them before committing.`
          };
        }
      }
    }
  ]
};
```

---

#### H4: Custom Agent -- Test Runner Agent

**What**: A dedicated agent that analyzes code changes and runs only the relevant tests, reports coverage delta, and suggests missing test cases.

**Why**: With 39+ test files in apps/web alone, knowing which tests to run after a change is non-trivial. This agent understands the dependency graph and runs targeted tests.

**Implementation**: Create `.claude/agents/test-runner.md`

```markdown
# Test Runner Agent

You are a specialized test runner for the InZone monorepo.

## Your responsibilities:

1. **Analyze changed files** by running `git diff --name-only HEAD~1` or comparing against the base branch
2. **Map changes to test files**:
   - If `apps/web/src/components/board/BoardView.tsx` changed, run `apps/web/src/components/board/BoardView.test.tsx`
   - If a hook changed, run its corresponding `.test.ts`
   - If a shared utility changed, run ALL tests in both apps
   - If API routes changed, run both unit tests and BDD tests
3. **Run targeted tests**:
   - Frontend: `pnpm --filter web vitest run <specific-test-files>`
   - Backend: `pnpm --filter api vitest run <specific-test-files>`
4. **Check coverage** after tests pass:
   - Run `pnpm --filter web vitest run --coverage` and compare against 80% threshold
   - Report any lines/branches that dropped below threshold
5. **Suggest missing tests** if new source files have no corresponding test file

## Tools you may use:
- Bash (for running tests and git commands)
- Read (for analyzing source files)
- Grep (for finding imports and dependencies)
- Glob (for finding test files)

## Important rules:
- Always use `pnpm`, never npm/npx/yarn
- Use `fireEvent` instead of `userEvent.type()` for tests with special characters (per CLAUDE.md)
- Frontend coverage threshold is 80% -- never suggest lowering it
```

---

#### H5: MCP Server -- PostgreSQL / Prisma Database Access

**What**: Add an MCP server for direct database introspection, allowing Claude to query the schema, inspect migration history, and verify data during development.

**Why**: The project uses Prisma with PostgreSQL. Being able to inspect the actual database state (not just the schema file) helps with debugging, migration verification, and seed data validation. The current skills for DB migrations would benefit from live DB access.

**Implementation**: Add to `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "pnpm",
      "args": [
        "dlx",
        "@modelcontextprotocol/server-postgres",
        "postgresql://inzone:inzone_dev@localhost:5432/inzone"
      ]
    }
  }
}
```

---

### MEDIUM Priority

---

#### M1: PreToolUse Hook -- Prevent Dangerous Git Operations

**What**: Block `git push --force`, `git reset --hard`, `git clean -f`, and `git checkout .` unless explicitly confirmed.

**Why**: With Ralph running autonomously and agent teams enabled, preventing destructive git operations adds a critical safety layer. Especially important in a worktree-based workflow where force pushes could affect shared branches.

**Implementation**: Create `.claude/hooks/git-safety.js`

```js
// .claude/hooks/git-safety.js
export default {
  name: "git-safety",
  event: "PreToolUse",
  hooks: [
    {
      matcher: { tool: "Bash" },
      handler: async ({ input }) => {
        const cmd = input.command || "";
        const dangerous = [
          /git\s+push\s+.*--force/,
          /git\s+reset\s+--hard/,
          /git\s+clean\s+-[fd]/,
          /git\s+checkout\s+\./,
          /git\s+restore\s+\./,
          /rm\s+-rf\s+\//
        ];

        for (const pattern of dangerous) {
          if (pattern.test(cmd)) {
            return {
              decision: "block",
              reason: `Blocked dangerous command matching pattern. Use targeted operations instead or ask the user for explicit confirmation.`
            };
          }
        }
        return { decision: "allow" };
      }
    }
  ]
};
```

---

#### M2: Custom Agent -- Database Migration Agent

**What**: A specialized agent for creating and validating Prisma migrations, with knowledge of the existing schema and migration best practices.

**Why**: The project already has a "DB migrations and schema changes" skill, but a full agent can orchestrate the entire migration workflow: schema change -> generate migration -> validate -> test -> update seed.

**Implementation**: Create `.claude/agents/db-migration.md`

```markdown
# Database Migration Agent

You are a specialized database migration agent for the InZone project.

## Your workflow:

1. **Understand the change**: Read the current schema at `apps/api/prisma/schema.prisma`
2. **Apply schema changes**: Edit the Prisma schema file
3. **Generate migration**: Run `pnpm --filter api db:migrate:dev --name <descriptive-name>`
4. **Verify migration SQL**: Read the generated migration file in `apps/api/prisma/migrations/`
5. **Update seed data** if needed: Edit `apps/api/prisma/seed.ts`
6. **Generate client**: Run `pnpm --filter api db:generate`
7. **Validate**: Run `pnpm --filter api build` to ensure types are correct
8. **Update tests**: Check if any tests reference the changed models and update them

## Rules:
- Never use `createdb` -- use `psql -c "CREATE DATABASE dbname;"` instead
- Always use `pnpm`, never npm/npx/yarn
- Include both `up` and consider rollback implications in migration naming
- Add appropriate indexes for foreign keys and frequently queried columns
- Use soft deletes (isDeleted + deletedAt pattern) consistent with existing models
- Always add `@@map()` to match the existing snake_case table naming convention

## Available tools:
- Bash, Read, Edit, Glob, Grep
```

---

#### M3: Custom Agent -- Vercel Deployment Agent

**What**: An agent that monitors Vercel deployments, diagnoses build/runtime failures, and fixes issues.

**Why**: The project already has `fix-vercel-deployment.md` and `vercel-logs.md` commands, but a dedicated agent can combine these into a more autonomous workflow that also handles Vercel-specific configuration in `vercel.json`.

**Implementation**: Create `.claude/agents/vercel-deploy.md`

```markdown
# Vercel Deployment Agent

You are a deployment specialist for the InZone project deployed on Vercel.

## Your capabilities:

1. **Check deployment status**: Use `vercel ls` or `vercel inspect <url>`
2. **Fetch build logs**: Use `vercel logs <deployment-url>`
3. **Diagnose common issues**:
   - Missing environment variables
   - Build failures (check `vercel.json` config, `outputDirectory`, `buildCommand`)
   - API function timeouts (check `functions` config in `vercel.json`)
   - Rewrite/routing issues (check `rewrites` in `vercel.json`)
4. **Fix issues**: Edit source code, configs, or environment setup
5. **Verify fixes**: Push and monitor the next deployment

## Project-specific knowledge:
- Frontend: Vite React app built to `apps/web/dist`
- Backend: Vercel serverless function at `api/index.ts`
- API rewrites: `/api/auth/:path*` and `/api/:path*` -> `/api`
- Function config: 1024MB memory, 10s max duration

## Tools: Bash, Read, Edit, Glob, Grep
```

---

#### M4: Stop Hook -- Post-Session Summary

**What**: When Claude Code stops, automatically generate a summary of changes made during the session and suggest next steps.

**Why**: Useful for continuity between sessions, especially in a worktree-based workflow where multiple parallel development threads exist. Helps the user quickly orient when resuming work.

**Implementation**: Create `.claude/hooks/session-summary.js`

```js
// .claude/hooks/session-summary.js
export default {
  name: "session-summary",
  event: "Stop",
  hooks: [
    {
      handler: async () => {
        return {
          message: "Session ending. Consider running `git status` and `pnpm test` to verify the current state before your next session."
        };
      }
    }
  ]
};
```

---

#### M5: MCP Server -- GitHub Actions Monitoring

**What**: Add a GitHub MCP server for richer CI/CD interaction beyond what `gh` CLI provides.

**Why**: While the `fix-ci` command uses `gh run` commands, an MCP server could provide structured access to workflow runs, job logs, and annotations. This is particularly valuable during Ralph autonomous runs.

**Implementation**: Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "pnpm",
      "args": ["dlx", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>"
      }
    }
  }
}
```

---

#### M6: New Skill -- Monorepo Change Impact Analysis

**What**: A skill that understands the InZone monorepo dependency graph and can determine which apps/packages are affected by a change.

**Why**: With `apps/web`, `apps/api`, and `packages/shared`, changes in shared code affect both apps. This skill helps Claude understand blast radius before making changes.

**Implementation**: Create `.claude/skills/monorepo-impact/SKILL.md`

```markdown
# Monorepo Change Impact Analysis

## Dependency Graph
- `apps/web` depends on `packages/shared`
- `apps/api` depends on `packages/shared`
- `apps/web` -> `apps/api` (via HTTP API at runtime)

## When shared code changes:
- Run tests in BOTH `apps/web` and `apps/api`
- Build shared first: `pnpm --filter shared build`
- Then build dependents: `pnpm --filter web build && pnpm --filter api build`

## When only frontend changes:
- Run: `pnpm --filter web test:coverage`
- Build: `pnpm --filter web build`
- BDD: `pnpm --filter web test:bdd` (if UI behavior changed)

## When only backend changes:
- Run: `pnpm --filter api test:coverage`
- Build: `pnpm --filter api build`
- BDD: `pnpm --filter api test:bdd` (if API behavior changed)

## When Prisma schema changes:
- Generate: `pnpm --filter api db:generate`
- Migrate: `pnpm --filter api db:migrate:dev --name <name>`
- Both apps may need type updates
- Run ALL tests in both apps

## Turbo tasks:
- Build respects dependencies via `turbo.json` (`dependsOn: ["^build"]`)
- Use `turbo run test --filter=...[HEAD~1]` to run only affected tests
```

---

### LOW Priority

---

#### L1: PreToolUse Hook -- Warn on Large File Reads

**What**: Warn when attempting to read files over a certain size threshold (e.g., the 64KB UX simplification PRD).

**Why**: Large files consume significant context window. A warning helps Claude decide whether to read specific sections instead.

**Implementation**: Create `.claude/hooks/large-file-warn.js` using `statSync` from the `fs` module to check file size before reading.

---

#### L2: New Command -- Run Architecture Tests

**What**: A slash command to run architecture tests and report violations.

**Why**: The project has architecture tests (cycles, layers, naming, metrics) but no dedicated command to run them and interpret results.

**Implementation**: Create `.claude/commands/arch-tests.md`

```markdown
# Run Architecture Tests

Run architecture tests for the project and analyze any violations.

## Steps

1. Run frontend architecture tests:
   ```bash
   pnpm --filter web test:arch
   ```

2. Run backend architecture tests:
   ```bash
   pnpm --filter api test:arch
   ```

3. If any tests fail, analyze the violations and suggest specific fixes.
4. If all pass, report the clean architecture status.
```

---

#### L3: New Skill -- Worktree Best Practices

**What**: A skill documenting worktree conventions, port allocation, and isolation patterns for this project.

**Why**: The project has extensive worktree tooling (scripts, commands, docker compose) but no single skill that teaches Claude the conventions.

**Implementation**: Create `.claude/skills/worktree-conventions/SKILL.md` with content extracted from existing worktree commands and scripts.

---

#### L4: PostToolUse Hook -- Track Edited Files for Test Reminder

**What**: Accumulate a list of edited source files during a session and, before committing, remind to run tests for those files.

**Why**: It is easy to edit multiple files and forget to run tests before committing, especially during multi-file refactors.

**Implementation**: A simpler version could be a Stop hook that lists all uncommitted changes and whether corresponding tests exist.

---

## 3. Summary

### Quick Wins (implement in < 30 minutes each)

| # | Recommendation | Impact |
|---|---------------|--------|
| H1 | pnpm enforcement hook | Prevents wrong package manager during autonomous runs |
| H2 | Coverage threshold protection hook | Prevents accidental threshold lowering |
| M1 | Dangerous git operation blocker | Safety net for autonomous workflows |
| L2 | Architecture test command | Makes arch tests easily discoverable |

### Medium-Term (1-2 hours each)

| # | Recommendation | Impact |
|---|---------------|--------|
| H3 | Auto-lint after edits hook | Catches lint issues before CI |
| H4 | Test runner agent | Smarter, targeted test execution |
| M2 | Database migration agent | End-to-end migration workflow |
| M6 | Monorepo impact analysis skill | Better change impact understanding |

### Longer-Term (half day+)

| # | Recommendation | Impact |
|---|---------------|--------|
| H5 | PostgreSQL MCP server | Live database introspection |
| M3 | Vercel deployment agent | Autonomous deployment diagnosis |
| M5 | GitHub Actions MCP server | Richer CI/CD interaction |
| M4 | Session summary hook | Better continuity between sessions |

### Implementation Order (Recommended)

1. **H1** (pnpm hook) -- simplest, highest frequency of prevention
2. **M1** (git safety hook) -- critical for Ralph autonomous runs
3. **H2** (coverage protection hook) -- prevents a specific, documented concern
4. **H4** (test runner agent) -- leverages the enabled agent teams feature
5. **M2** (DB migration agent) -- supports upcoming integration work (Jira, Slack, Teams, Outlook per roadmap)
6. **H5** (PostgreSQL MCP) -- enhances DB workflow once migration agent is in place
7. **M6** (monorepo impact skill) -- improves all subsequent development
8. **H3** (auto-lint hook) -- reduces CI iteration cycles
9. **M3** (Vercel deployment agent) -- helps with deployment issues
10. Everything else as needed

---

## 4. Configuration File Templates

### `.mcp.json` (create at project root)

```json
{
  "mcpServers": {
    "postgres": {
      "command": "pnpm",
      "args": [
        "dlx",
        "@modelcontextprotocol/server-postgres",
        "postgresql://inzone:inzone_dev@localhost:5432/inzone"
      ]
    }
  }
}
```

### Updated `.claude/settings.json`

```json
{
  "enabledPlugins": {
    "code-review@claude-plugins-official": true,
    "security-guidance@claude-plugins-official": true,
    "frontend-design@claude-plugins-official": true,
    "code-simplifier@claude-plugins-official": true,
    "feature-dev@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true,
    "plugin-dev@claude-plugins-official": true,
    "commit-commands@claude-plugins-official": true,
    "pr-review-toolkit@claude-plugins-official": true,
    "agent-sdk-dev@claude-plugins-official": true
  },
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "hooks": {
    "PreToolUse": [
      ".claude/hooks/enforce-pnpm.js",
      ".claude/hooks/protect-coverage.js",
      ".claude/hooks/git-safety.js"
    ],
    "PostToolUse": [
      ".claude/hooks/auto-lint.js"
    ]
  }
}
```

### New Directories to Create

```
.claude/
  agents/
    test-runner.md
    db-migration.md
    vercel-deploy.md
  hooks/
    enforce-pnpm.js
    protect-coverage.js
    git-safety.js
    auto-lint.js
```
