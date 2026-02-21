# Vercel Preview Auth + CI Failures: Analysis & Fix Plan

## Issue 1: INVALID_ORIGIN on Vercel Preview Deployments

### Problem

When a PR is deployed to Vercel as a preview, it gets a dynamic URL like:
```
https://inzone-git-deployment-to-cloud-sarthchawlas-projects.vercel.app
```

Hitting `/api/auth/sign-in/social` returns:
```json
{"code": "INVALID_ORIGIN", "message": "Invalid origin"}
```

### Root Cause

Better Auth validates the `Origin` header against `trustedOrigins`. The current config in `apps/api/src/lib/auth.ts:9` is:

```typescript
trustedOrigins: [process.env.CORS_ORIGIN || 'http://localhost:5173'],
```

`CORS_ORIGIN` is set to a single static URL. Every Vercel preview deployment generates a unique subdomain, so the origin never matches.

The same problem exists in CORS middleware (`apps/api/src/app.ts:17`):
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

### Proposed Fix

**Option A (Recommended): Use a dynamic origin matcher for Vercel previews**

Better Auth's `trustedOrigins` accepts a function. CORS `origin` also accepts a function. Use a callback that:
1. Allows the exact production URL
2. Allows any `*.vercel.app` subdomain matching your project pattern
3. Keeps localhost for development

```typescript
// apps/api/src/lib/auth.ts
const PRODUCTION_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const VERCEL_PROJECT_PATTERN = /^https:\/\/inzone(-[a-z0-9-]+)?\.vercel\.app$/;

function isAllowedOrigin(origin: string): boolean {
  if (origin === PRODUCTION_ORIGIN) return true;
  if (VERCEL_PROJECT_PATTERN.test(origin)) return true;
  return false;
}

// In betterAuth config:
trustedOrigins: [PRODUCTION_ORIGIN],  // static list for production
// OR use the function form if Better Auth supports it
```

Actually, the simplest and most correct approach: **set `CORS_ORIGIN` dynamically on Vercel using `VERCEL_URL`**.

Vercel automatically provides the `VERCEL_URL` environment variable (without protocol) for each deployment. The fix:

1. **In `auth.ts`**: Accept multiple origins or use a function
2. **In `app.ts`**: Same dynamic origin logic for CORS

```typescript
// Shared origin logic
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : null,
].filter(Boolean) as string[];

// auth.ts
trustedOrigins: allowedOrigins,

// app.ts CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

**Why this works**: Vercel sets `VERCEL_URL` to the exact deployment URL for each preview and production build. No wildcard needed, no regex — each deployment gets its own correct origin automatically.

**Option B: Wildcard approach (less secure but simpler)**

Set `CORS_ORIGIN` to a comma-separated list or use a Vercel-pattern regex. Less recommended because it opens up to any matching subdomain.

### Why Option A is preferred

- Each deployment gets exactly one trusted origin (its own URL)
- No wildcard patterns that could be overly permissive
- Works automatically for both preview and production deployments
- `VERCEL_URL` is a built-in Vercel env var — no manual configuration needed

---

## Issue 2: Connecting Claude Code to Vercel for Error Debugging

### Problem

Vercel shows runtime errors/warnings that don't fail the build but indicate issues. You want a way for Claude Code to access and help fix these.

### Proposed Approach: Custom Slash Command

Create a `/vercel-logs` slash command that uses the Vercel CLI to pull recent deployment logs and function errors. This requires:

1. **Vercel CLI authentication** — `vercel login` or a `VERCEL_TOKEN` in your environment
2. **A custom command** in `.claude/commands/` that:
   - Fetches recent deployments via `vercel ls`
   - Pulls logs from the latest deployment via `vercel logs <url>`
   - Presents errors for analysis

Example command structure:
```
.claude/commands/vercel-logs.md
```

The command would:
1. Run `vercel ls --limit 5` to get recent deployments
2. Run `vercel logs <deployment-url> --since 1h` to get recent logs
3. Filter for errors/warnings
4. Present them for analysis and fix suggestions

**Prerequisites**:
- Install Vercel CLI: `pnpm add -g vercel`
- Authenticate: `vercel login` (one-time) or set `VERCEL_TOKEN` env var
- Link project: `vercel link` (one-time in the project root)

---

## Issue 3: CI Pipeline Failures on GitHub Actions

### Failing Jobs

#### 3a. Vercel Deploy Job — Missing Secrets

**Error**: `No existing credentials found. Please run vercel login or pass "--token"`

**Root Cause**: The GitHub repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are not configured.

**Fix**: Add these three secrets in GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Where to find it |
|--------|-----------------|
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Vercel Dashboard → Settings → General → "Vercel ID" |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General → "Project ID" |

#### 3b. BDD Backend + BDD Frontend — Missing `DIRECT_URL` env var

**Error**: `Environment variable not found: DIRECT_URL` at `prisma/schema.prisma:10`

**Root Cause**: The Prisma schema has:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`directUrl` was added for Neon Postgres (which uses connection pooling and needs a separate direct connection URL). In CI, only `DATABASE_URL` is set. Prisma requires `DIRECT_URL` to be present since it's referenced in the schema.

**Fix**: Add `DIRECT_URL` to the CI workflow env vars, pointing to the same value as `DATABASE_URL` (since CI uses standard Postgres without a connection pooler):

In `.github/workflows/bdd-backend.yml` and `.github/workflows/bdd-frontend.yml`, add to the top-level `env`:
```yaml
env:
  NODE_ENV: test
  DATABASE_URL: postgresql://test:test@localhost:5432/inzone_test
  DIRECT_URL: postgresql://test:test@localhost:5432/inzone_test    # <-- add this
```

Also check `ci-backend.yml`, `architecture-tests.yml`, and any other workflow that runs Prisma commands.

#### 3c. BDD Frontend — Merge E2E Reports Failure

**Error**: `Directory does not exist: .../all-blob-reports`

**Root Cause**: Cascading failure. The E2E test shards failed (due to missing `DIRECT_URL`), so no blob reports were generated. The merge step then fails because there's nothing to merge.

**Fix**: Fixing issue 3b resolves this automatically.

---

## Summary of Changes Needed

| File | Change | Fixes |
|------|--------|-------|
| `apps/api/src/lib/auth.ts` | Support dynamic origins via `VERCEL_URL` | Issue 1 |
| `apps/api/src/app.ts` | Match CORS origin logic to auth config | Issue 1 |
| `.github/workflows/bdd-backend.yml` | Add `DIRECT_URL` env var | Issue 3b |
| `.github/workflows/bdd-frontend.yml` | Add `DIRECT_URL` env var | Issue 3b |
| Any other CI workflow with Prisma | Add `DIRECT_URL` env var | Issue 3b |
| GitHub repo secrets | Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Issue 3a |
| `.claude/commands/vercel-logs.md` (new) | Create custom command for Vercel log debugging | Issue 2 |

## Implementation Order

1. Fix `DIRECT_URL` in CI workflows (quick, unblocks all BDD tests)
2. Fix auth trusted origins for Vercel previews (unblocks preview testing)
3. Configure GitHub secrets for Vercel deploy job (manual step)
4. Create Vercel logs command (convenience improvement)
