# Neon Branch-Per-PR Preview Databases

## Context

InZone is deployed to Vercel + Neon. PR preview deployments currently share the production database, which means preview testers can see/modify production data. We want each PR to get its own isolated Neon database branch so previews are fully independent.

Neon branches are lightweight (copy-on-write from parent) so this is fast and essentially free within the 10-branch limit.

## New GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `NEON_API_KEY` | Neon API token (Neon dashboard > Settings > API Keys) |
| `NEON_PROJECT_ID` | Neon project ID (visible in project dashboard URL) |

## Implementation

### 1. Modify `.github/workflows/vercel-deploy.yml`

Add a new `neon-branch` job that runs **before** `deploy` for PRs:

- Install `neonctl` CLI
- Check if branch `preview/pr-<N>` already exists (idempotent)
- If not, create it from the main branch
- Output pooled connection string (`db-url`) and direct connection string (`direct-url`)
- Mask connection strings in logs with `::add-mask::`

Update `deploy` job:
- Add `needs: [neon-branch]` dependency for PR deployments
- Pass branch DB URLs to Vercel preview via `vercel deploy --env DATABASE_URL=... --env DIRECT_URL=...`

Update `migrate` job:
- For PRs: use branch connection strings from `neon-branch` outputs
- For production pushes: keep using `NEON_DIRECT_URL` secret (unchanged)

Update PR comment to mention the Neon branch name.

### 2. Create `.github/workflows/neon-cleanup.yml`

New workflow triggered on `pull_request: types: [closed]`:
- Install `neonctl`
- Find and delete the `preview/pr-<N>` branch
- No-op if branch doesn't exist (safe for re-runs)

### Files Changed

| File | Action |
|------|--------|
| `.github/workflows/vercel-deploy.yml` | Modify - add neon-branch job, update deploy/migrate jobs |
| `.github/workflows/neon-cleanup.yml` | Create - PR close cleanup workflow |

### Flow

**PR opened/updated:**
1. `neon-branch` → create/reuse `preview/pr-N` Neon branch
2. `deploy` → build + deploy to Vercel with branch DB URLs
3. `migrate` → run migrations + seed on branch DB
4. `smoke-test` → verify health/frontend/auth

**PR closed:**
1. `neon-cleanup` → delete `preview/pr-N` branch

**Push to master (unchanged):**
1. `deploy` → production deploy
2. `migrate` → migrations on production DB
3. `smoke-test` → verify

### Free Tier Safety

Neon free tier allows 10 branches (1 is main = 9 available for PRs). With auto-cleanup on PR close, this is sufficient unless 9+ PRs are open simultaneously.

## Verification

1. Create a test PR → verify Neon branch is created and preview uses isolated DB
2. Add a board in preview → verify it doesn't appear in production
3. Close the PR → verify Neon branch is deleted
4. Push to master → verify production flow still works unchanged
