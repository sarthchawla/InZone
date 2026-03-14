# Versioning System - Release Flow

## Complete User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────┘

  Developer writes code and commits
         │
         ▼
  ┌──────────────┐    ✗ rejected     ┌─────────────────────────┐
  │  git commit   │──────────────────▶│  Fix commit message     │
  │  -m "message" │                   │  Must be: type: desc    │
  └──────┬───────┘                    │  e.g. feat: add search  │
         │                            └────────────┬────────────┘
         ▼                                         │
  ┌──────────────────┐                             │
  │  HUSKY commit-msg │◀───────────────────────────┘
  │  hook runs        │
  │  commitlint       │
  └──────┬───────────┘
         │ ✓ valid
         ▼
  Commit saved locally


┌─────────────────────────────────────────────────────────────────────┐
│                        PULL REQUEST PHASE                          │
└─────────────────────────────────────────────────────────────────────┘

  Developer pushes branch & opens PR to master
         │
         ▼
  ┌──────────────────────────────────────┐
  │  CI RUNS IN PARALLEL:                │
  │                                      │
  │  ✓ commitlint.yml (validates all     │
  │    PR commits are conventional)      │
  │  ✓ ci-frontend.yml (lint+test+build) │
  │  ✓ ci-backend.yml  (lint+test+build) │
  │  ✓ architecture-tests.yml            │
  │  ✓ bdd-frontend.yml                  │
  │  ✓ bdd-backend.yml                   │
  │  ✓ vercel-deploy.yml (preview)       │
  └──────────────┬───────────────────────┘
                 │ all pass
                 ▼
  ┌──────────────────────┐
  │  SQUASH & MERGE PR   │
  │  into master          │
  └──────────┬───────────┘
             │
             ▼

┌─────────────────────────────────────────────────────────────────────┐
│                  AFTER MERGE TO MASTER                              │
└─────────────────────────────────────────────────────────────────────┘

  Push to master triggers TWO workflows simultaneously:
             │
     ┌───────┴────────┐
     ▼                ▼
  ┌────────────┐  ┌──────────────────────────────────────────┐
  │ vercel-    │  │ release-please.yml                       │
  │ deploy.yml │  │                                          │
  │            │  │  Scans new commits since last release:   │
  │ Deploys    │  │                                          │
  │ current    │  │  feat: → bump MINOR (0.1.0 → 0.2.0)    │
  │ code to    │  │  fix:  → bump PATCH (0.1.0 → 0.1.1)    │
  │ Vercel     │  │  feat! → bump MAJOR (0.1.0 → 1.0.0)    │
  │ production │  │                                          │
  └────────────┘  │  Creates/updates a RELEASE PR:           │
                  │  "chore(master): release inzone 0.2.0"   │
                  └──────────────┬───────────────────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │  RELEASE PR (auto-generated)  │
                  │                                │
                  │  Contains:                     │
                  │  • Bumped version in:           │
                  │    - /package.json              │
                  │    - /apps/web/package.json     │
                  │    - /apps/api/package.json     │
                  │  • Updated CHANGELOG.md         │
                  │  • Updated manifest.json        │
                  │                                │
                  │  Accumulates! If you merge     │
                  │  3 feat PRs before merging      │
                  │  this, all 3 appear in the      │
                  │  changelog.                     │
                  └──────────────┬───────────────┘
                                 │
                     Team reviews & merges
                                 │
                                 ▼

┌─────────────────────────────────────────────────────────────────────┐
│                 AFTER MERGING RELEASE PR                            │
└─────────────────────────────────────────────────────────────────────┘

  Push to master triggers again:
             │
     ┌───────┴────────┐
     ▼                ▼
  ┌────────────┐  ┌──────────────────────────────────────────┐
  │ vercel-    │  │ release-please.yml                       │
  │ deploy.yml │  │                                          │
  │            │  │  Detects this is a RELEASE commit         │
  │ Deploys    │  │                                          │
  │ with NEW   │  │  Creates:                                │
  │ version    │  │  • GitHub Release (inzone-v0.2.0)        │
  │ baked in:  │  │  • Git tag (inzone-v0.2.0)               │
  │            │  │  • Changelog attached to release          │
  │ Footer:    │  │                                          │
  │ InZone     │  └──────────────────────────────────────────┘
  │  v0.2.0    │
  │            │
  │ /api/health│
  │ → version: │
  │   "0.2.0"  │
  └────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                        VERSION VISIBILITY                          │
└─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────┐
  │  Frontend (browser)              │
  │  ┌─────────────────────────┐    │
  │  │  InZone app content     │    │
  │  │                         │    │
  │  │                         │    │
  │  └─────────────────────────┘    │
  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
  │          InZone v0.2.0  ← footer│
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │  API health check               │
  │                                 │
  │  GET /api/health                │
  │  {                              │
  │    "status": "ok",              │
  │    "version": "0.2.0",          │
  │    "timestamp": "2026-..."      │
  │  }                              │
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │  GitHub Releases page           │
  │                                 │
  │  inzone: v0.2.0  (Latest)      │
  │  ├── CHANGELOG                  │
  │  │   • feat: add search         │
  │  │   • fix: resolve drag bug    │
  │  └── Tag: inzone-v0.2.0        │
  └─────────────────────────────────┘
```

## Key Takeaway

There are **two separate merge events** in the flow:

1. **Feature PR → master**: Deploys code + release-please *opens* a Release PR
2. **Release PR → master**: Deploys again with bumped version + release-please *creates* the GitHub Release & tag

You can let multiple feature PRs accumulate before merging the Release PR — the changelog will include all of them.
