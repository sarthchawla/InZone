# InZone Deployment PRD - Vercel + Neon

## Executive Summary

Deploy InZone to production using **Vercel** (frontend + backend) and **Neon** (PostgreSQL database) for a truly free, always-on deployment accessible from any device.

**Goal**: Zero-cost production deployment with no sleep mode, accessible globally.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   Static Frontend   │    │    Serverless API Functions     │ │
│  │   (React + Vite)    │    │    (Express via @vercel/node)   │ │
│  │                     │    │                                 │ │
│  │   /                 │───▶│   /api/boards                   │ │
│  │   /boards/:id       │    │   /api/columns                  │ │
│  │   Global CDN        │    │   /api/todos                    │ │
│  └─────────────────────┘    │   /api/templates                │ │
│                             │   /api/labels                   │ │
│                             └───────────────┬─────────────────┘ │
└─────────────────────────────────────────────┼───────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │           NEON                │
                              │   Serverless PostgreSQL       │
                              │   (0.5GB free tier)           │
                              │   Auto-scales to zero         │
                              └───────────────────────────────┘
```

---

## Platform Selection Rationale

### Why Vercel + Neon?

| Criteria | Vercel + Neon | Alternatives |
|----------|---------------|--------------|
| **Truly Free** | Yes | Railway ($1/mo), Render (DB expires) |
| **Never Sleeps** | Yes | HF Spaces (48hr), Supabase (1 week) |
| **PostgreSQL** | Yes (Neon) | Cloudflare (SQLite only) |
| **Prisma Compatible** | Yes | Cloudflare Workers (no) |
| **Code Changes** | Minimal | Cloudflare (major rewrite) |
| **Git Integration** | Excellent | - |
| **Custom Domains** | Free | - |

### Free Tier Limits

| Service | Limit | Sufficient for InZone? |
|---------|-------|------------------------|
| **Vercel Frontend** | Unlimited bandwidth | Yes |
| **Vercel Functions** | 100GB-hrs/month, 100k invocations | Yes |
| **Neon Database** | 0.5GB storage, 100 CU-hours/month | Yes (thousands of todos) |
| **Neon Branches** | 10 per project | Yes |

---

## Deployment Strategy

### Option A: Monorepo Single Deploy (Recommended)

Deploy both frontend and API from the same Vercel project using Vercel's monorepo support.

**Pros:**
- Single deployment pipeline
- Shared environment variables
- Automatic preview deployments for PRs

**Cons:**
- Requires restructuring API for serverless

### Option B: Two Separate Vercel Projects

Deploy frontend and API as separate Vercel projects.

**Pros:**
- Independent scaling
- Clearer separation

**Cons:**
- More complex setup
- CORS configuration needed
- Two deployment pipelines

**Decision: Option A** - Simpler, better DX, native monorepo support.

---

## Implementation Phases

### Phase 1: Account Setup (Manual - User)
### Phase 2: Database Setup (Manual - User + Claude)
### Phase 3: Code Restructuring (Claude)
### Phase 4: Vercel Configuration (Claude)
### Phase 5: CI/CD Pipeline Updates (Claude)
### Phase 6: Test Suite Updates (Claude)
### Phase 7: Deployment & Verification (Manual - User + Claude)

---

## Phase 1: Account Setup

### Manual Checklist (User)

- [ ] **1.1 Create Vercel Account**
  - Go to [vercel.com](https://vercel.com)
  - Sign up with GitHub (recommended for automatic repo access)
  - Select "Hobby" plan (free)
  - Verify email

- [ ] **1.2 Create Neon Account**
  - Go to [neon.tech](https://neon.tech) (redirects to neon.com)
  - Sign up with GitHub (same account as Vercel)
  - Select "Free" tier
  - Verify email

- [ ] **1.3 Connect GitHub Repository**
  - Ensure InZone repo is pushed to GitHub
  - Note the repository URL for later

---

## Phase 2: Database Setup

### Manual Steps (User)

- [ ] **2.1 Create Neon Project**
  - In Neon dashboard, click "New Project"
  - Project name: `inzone-prod`
  - Region: Select closest to your users (e.g., `us-east-1` for US)
  - PostgreSQL version: `16` (matches local dev)
  - Click "Create Project"

- [ ] **2.2 Get Connection String**
  - In project dashboard, go to "Connection Details"
  - Copy the connection string (pooled recommended for serverless):
    ```
    postgresql://[user]:[password]@[host]/[database]?sslmode=require
    ```
  - Save this securely - needed for Vercel environment variables

- [ ] **2.3 Create Production Branch** (Optional but recommended)
  - In Neon, create a branch named `production`
  - This allows separate dev/prod databases

### Claude Tasks

- [ ] **2.4 Update Prisma Schema for Neon**
  - Add connection pooling configuration
  - Update datasource for serverless compatibility

- [ ] **2.5 Create Database Migration Script**
  - Script to run migrations on Neon
  - Seed data script for production

---

## Phase 3: Code Restructuring

### Claude Tasks

All code changes required to make the Express API work as Vercel Serverless Functions.

- [ ] **3.1 Create Vercel API Handler**
  - Create `/api/index.ts` as serverless entry point
  - Wrap Express app for Vercel serverless runtime
  - File: `apps/api/api/index.ts`

- [ ] **3.2 Update Prisma Client for Serverless**
  - Implement connection pooling
  - Add PrismaClient singleton pattern for serverless
  - Prevent connection exhaustion

- [ ] **3.3 Update Frontend API Client**
  - Update base URL configuration for production
  - Handle environment-based URL switching
  - File: `apps/web/src/api/client.ts`

- [ ] **3.4 Add Environment Variable Handling**
  - Create `.env.example` files
  - Document required variables
  - Add runtime validation

- [ ] **3.5 Update Build Scripts**
  - Ensure Prisma client generates during build
  - Update `package.json` scripts for Vercel

---

## Phase 4: Vercel Configuration

### Claude Tasks

- [ ] **4.1 Create `vercel.json`**
  - Configure monorepo settings
  - Set up API routes
  - Configure build commands
  - Set output directory

  ```json
  {
    "buildCommand": "pnpm run build",
    "outputDirectory": "apps/web/dist",
    "framework": "vite",
    "rewrites": [
      { "source": "/api/:path*", "destination": "/api" }
    ],
    "functions": {
      "api/index.ts": {
        "memory": 1024,
        "maxDuration": 10
      }
    }
  }
  ```

- [ ] **4.2 Create Environment Variables Template**
  - Document all required env vars
  - Create secure variable list for Vercel

  | Variable | Description | Where to Set |
  |----------|-------------|--------------|
  | `DATABASE_URL` | Neon connection string | Vercel Dashboard |
  | `DIRECT_URL` | Neon direct connection | Vercel Dashboard |
  | `NODE_ENV` | `production` | Vercel Dashboard |

- [ ] **4.3 Update `.gitignore`**
  - Ensure `.env` files are ignored
  - Add Vercel-specific ignores

- [ ] **4.4 Create Build Configuration**
  - `apps/api/tsconfig.build.json` for production builds
  - Optimize for serverless bundle size

---

## Phase 5: CI/CD Pipeline Updates

### Claude Tasks

Update GitHub Actions workflows to support Vercel deployment and test the new API structure.

- [ ] **5.1 Create Vercel Deployment Workflow**
  - Add `.github/workflows/vercel-deploy.yml`
  - Trigger on push to main/master
  - Run tests before deploying
  - Deploy to Vercel via CLI

- [ ] **5.2 Update lint-build.yml for Vercel**
  - Add Vercel API handler build step
  - Verify serverless bundle compiles
  - Test Prisma client generation for serverless

- [ ] **5.3 Add Preview Deployment Workflow**
  - Deploy preview for PRs
  - Comment PR with preview URL
  - Run smoke tests against preview

- [ ] **5.4 Update Environment Variable Handling**
  - Add secrets for Vercel token
  - Add Neon database URL for CI testing
  - Document required GitHub Secrets

  | Secret | Description | Required |
  |--------|-------------|----------|
  | `VERCEL_TOKEN` | Vercel API token | Yes |
  | `VERCEL_ORG_ID` | Vercel organization ID | Yes |
  | `VERCEL_PROJECT_ID` | Vercel project ID | Yes |
  | `NEON_DATABASE_URL` | Neon connection for CI tests | Optional |

---

## Phase 6: Test Suite Updates

### Claude Tasks

Update unit tests and BDD tests to work with the new Vercel serverless API structure.

#### 6.1 Backend Unit Test Updates

- [ ] **6.1.1 Create Vercel Handler Tests**
  - Test the serverless API handler wrapper
  - Verify Express app integration
  - Test request/response handling
  - File: `api/__tests__/handler.test.ts`

- [ ] **6.1.2 Update Service Tests for Serverless**
  - Test Prisma client singleton pattern
  - Verify connection pooling behavior
  - Mock serverless environment variables

- [ ] **6.1.3 Add Integration Tests**
  - Test full API handler with real routes
  - Verify middleware chain works in serverless
  - Test error handling in serverless context

#### 6.2 Frontend Unit Test Updates

- [ ] **6.2.1 Update API Client Tests**
  - Test production URL configuration
  - Test environment-based URL switching
  - Mock different environment scenarios

- [ ] **6.2.2 Add Environment Detection Tests**
  - Test `import.meta.env.PROD` handling
  - Test `VITE_API_URL` fallback

#### 6.3 BDD Test Updates

- [ ] **6.3.1 Update Backend BDD Configuration**
  - Support testing against Vercel serverless handler
  - Add test mode for serverless vs standalone
  - Update `cucumber.config.cjs` for both modes

- [ ] **6.3.2 Update Frontend BDD Configuration**
  - Support testing against Vercel preview deployments
  - Add environment variable for deployment URL
  - Update Playwright config for CI deployments

- [ ] **6.3.3 Add Deployment Smoke Tests**
  - Create minimal BDD scenarios for deployment verification
  - Test critical paths: board creation, todo management
  - File: `apps/web/tests/bdd/features/deployment-smoke.feature`

  ```gherkin
  @smoke @deployment
  Feature: Deployment Smoke Tests
    Verify core functionality works after deployment

    Scenario: Application loads successfully
      Given I navigate to the application
      Then I should see the homepage
      And the page should load within 3 seconds

    Scenario: Can create and view a board
      Given I am on the homepage
      When I create a new board named "Smoke Test Board"
      Then I should see "Smoke Test Board" in the board list

    Scenario: API health check passes
      When I check the API health endpoint
      Then I should receive a successful response
  ```

- [ ] **6.3.4 Update BDD CI Workflow**
  - Add job to run smoke tests against preview deployments
  - Add conditional execution based on deployment success
  - Update `bdd-tests.yml` with deployment testing

#### 6.4 CI Workflow File Updates

- [ ] **6.4.1 Update `unit-tests.yml`**
  - Add Vercel handler unit tests
  - Update coverage paths
  - Add serverless-specific test job

- [ ] **6.4.2 Update `bdd-tests.yml`**
  - Add deployment smoke test job
  - Support preview URL testing
  - Add conditional PR preview testing

- [ ] **6.4.3 Update `lint-build.yml`**
  - Add Vercel build verification
  - Test serverless bundle creation
  - Verify API handler compiles

---

## Phase 7: Deployment & Verification

### Manual Steps (User)

- [ ] **7.1 Import Project to Vercel**
  - Go to Vercel Dashboard → "Add New Project"
  - Select GitHub repository: `InZone`
  - Framework Preset: `Vite`
  - Root Directory: `.` (monorepo root)
  - Build Command: `pnpm run build`
  - Output Directory: `apps/web/dist`

- [ ] **7.2 Configure Environment Variables in Vercel**
  - Go to Project Settings → Environment Variables
  - Add each variable from Phase 4.2
  - Set for Production, Preview, and Development

  | Variable | Value |
  |----------|-------|
  | `DATABASE_URL` | (from Neon - pooled connection) |
  | `DIRECT_URL` | (from Neon - direct connection) |
  | `NODE_ENV` | `production` |

- [ ] **7.3 Install Neon Integration** (Optional - easier env var management)
  - Go to Vercel Marketplace
  - Search for "Neon"
  - Install and connect to your Neon project
  - This auto-populates DATABASE_URL

- [ ] **7.4 Configure GitHub Secrets for CI**
  - Go to GitHub repo → Settings → Secrets and variables → Actions
  - Add the following secrets:

  | Secret | How to Get |
  |--------|------------|
  | `VERCEL_TOKEN` | Vercel → Settings → Tokens → Create |
  | `VERCEL_ORG_ID` | Vercel → Settings → General → "Vercel ID" |
  | `VERCEL_PROJECT_ID` | Project Settings → General → "Project ID" |

- [ ] **7.5 Trigger First Deployment**
  - Click "Deploy" in Vercel
  - Wait for build to complete
  - Note deployment URL

### Claude Tasks

- [ ] **7.6 Run Database Migrations**
  - Provide commands to run migrations against Neon
  - Verify schema is created

- [ ] **7.7 Seed Production Database**
  - Run seed script for templates
  - Verify data exists

### Manual Verification (User)

- [ ] **7.8 Verify Deployment**
  - Visit deployment URL
  - Check homepage loads
  - Create a test board
  - Add a todo
  - Verify drag-and-drop works

- [ ] **7.9 Verify CI Pipeline**
  - Create a test PR
  - Verify preview deployment is created
  - Verify smoke tests pass against preview
  - Merge PR and verify production deployment

- [ ] **7.10 Configure Custom Domain** (Optional)
  - Go to Project Settings → Domains
  - Add custom domain (if you have one)
  - Configure DNS records as instructed

---

## Detailed Implementation Guide

### 3.1 Vercel API Handler

Create a new file that wraps Express for serverless:

**File: `api/index.ts`** (at repo root)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { boardsRouter } from '../apps/api/src/routes/boards.js';
import { columnsRouter } from '../apps/api/src/routes/columns.js';
import { todosRouter } from '../apps/api/src/routes/todos.js';
import { templatesRouter } from '../apps/api/src/routes/templates.js';
import { labelsRouter } from '../apps/api/src/routes/labels.js';
import { errorHandler } from '../apps/api/src/middleware/errorHandler.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/boards', boardsRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/todos', todosRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/labels', labelsRouter);

// Error handling
app.use(errorHandler);

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
```

### 3.2 Prisma Serverless Configuration

**File: `apps/api/src/lib/prisma.ts`** (update)

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Log queries in development
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
};

// Prevent multiple instances in serverless environment
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
```

### 3.3 Frontend Environment Configuration

**File: `apps/web/src/api/client.ts`** (update)

```typescript
import axios from 'axios';

// In production on Vercel, API is at same origin
// In development, API is at localhost:3000
const baseURL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api');

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 5.1 Vercel Deployment Workflow

**File: `.github/workflows/vercel-deploy.yml`**

```yaml
name: Vercel Deploy

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    timeout-minutes: 20

    outputs:
      deployment-url: ${{ steps.deploy.outputs.url }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Vercel CLI
        run: pnpm add -g vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }} --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            URL=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          else
            URL=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          fi
          echo "url=$URL" >> $GITHUB_OUTPUT
          echo "Deployed to: $URL"

      - name: Comment PR with Preview URL
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Vercel Preview Deployment\n\nDeployed to: ${{ steps.deploy.outputs.url }}\n\nThis preview will be updated on each push to this PR.`
            })

  smoke-test:
    name: Smoke Test Deployment
    runs-on: ubuntu-latest
    needs: deploy
    if: needs.deploy.outputs.deployment-url != ''
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm --filter web exec playwright install --with-deps chromium

      - name: Wait for deployment to be ready
        run: |
          npx wait-on ${{ needs.deploy.outputs.deployment-url }} --timeout 60000

      - name: Run Smoke Tests
        run: pnpm --filter web exec playwright test --grep @smoke
        env:
          BASE_URL: ${{ needs.deploy.outputs.deployment-url }}
          CI: true

      - name: Upload smoke test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: smoke-test-results
          path: apps/web/test-results/
          retention-days: 7
```

### 6.1.1 Vercel Handler Tests

**File: `api/__tests__/handler.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock Prisma before importing handler
vi.mock('../apps/api/src/lib/prisma', () => ({
  prisma: {
    board: { findMany: vi.fn(), create: vi.fn() },
    column: { findMany: vi.fn() },
    todo: { findMany: vi.fn() },
    boardTemplate: { findMany: vi.fn() },
    label: { findMany: vi.fn() },
    $disconnect: vi.fn(),
  },
}));

import handler from '../index';

describe('Vercel API Handler', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/api/health',
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
  });

  it('should respond to health check', async () => {
    mockReq.url = '/api/health';

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok' })
    );
  });

  it('should handle CORS headers', async () => {
    mockReq.method = 'OPTIONS';

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockRes.setHeader).toHaveBeenCalled();
  });

  it('should route to boards API', async () => {
    mockReq.url = '/api/boards';

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    // Verify the request was processed
    expect(mockRes.json).toHaveBeenCalled();
  });
});
```

### 6.2.1 API Client Environment Tests

**File: `apps/web/src/api/__tests__/client.test.ts`** (update)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('API Client Environment Configuration', () => {
  const originalEnv = { ...import.meta.env };

  afterEach(() => {
    vi.resetModules();
    // Restore original env
    Object.assign(import.meta.env, originalEnv);
  });

  it('should use relative /api path in production', async () => {
    vi.stubGlobal('import.meta.env', { ...originalEnv, PROD: true });

    const { apiClient } = await import('../client');

    expect(apiClient.defaults.baseURL).toBe('/api');
  });

  it('should use localhost in development', async () => {
    vi.stubGlobal('import.meta.env', {
      ...originalEnv,
      PROD: false,
      VITE_API_URL: undefined
    });

    const { apiClient } = await import('../client');

    expect(apiClient.defaults.baseURL).toBe('http://localhost:3000/api');
  });

  it('should use VITE_API_URL when provided', async () => {
    vi.stubGlobal('import.meta.env', {
      ...originalEnv,
      PROD: false,
      VITE_API_URL: 'http://custom:4000'
    });

    const { apiClient } = await import('../client');

    expect(apiClient.defaults.baseURL).toBe('http://custom:4000/api');
  });
});
```

---

## Work Distribution Summary

### Manual Work (User Must Do)

| Task | Phase | Est. Effort |
|------|-------|-------------|
| Create Vercel account | 1.1 | 2 min |
| Create Neon account | 1.2 | 2 min |
| Push repo to GitHub | 1.3 | 1 min |
| Create Neon project | 2.1 | 3 min |
| Copy connection string | 2.2 | 1 min |
| Import project to Vercel | 7.1 | 5 min |
| Set environment variables | 7.2 | 3 min |
| Configure GitHub secrets | 7.4 | 5 min |
| Trigger deployment | 7.5 | 1 min |
| Verify deployment | 7.8 | 5 min |
| Verify CI pipeline | 7.9 | 5 min |
| **Total Manual Work** | | **~35 min** |

### Claude Work (Automated)

| Task | Phase | Description |
|------|-------|-------------|
| Update Prisma config | 2.4 | Serverless compatibility |
| Create migration script | 2.5 | Neon migration automation |
| Create API handler | 3.1 | Vercel serverless wrapper |
| Update Prisma client | 3.2 | Connection pooling |
| Update frontend client | 3.3 | Environment-based URLs |
| Add env handling | 3.4 | Validation & examples |
| Update build scripts | 3.5 | Vercel-compatible builds |
| Create vercel.json | 4.1 | Deployment configuration |
| Create env template | 4.2 | Documentation |
| Update .gitignore | 4.3 | Security |
| Build configuration | 4.4 | Production builds |
| **CI/CD (Phase 5)** | | |
| Vercel deploy workflow | 5.1 | GitHub Actions for Vercel |
| Update lint-build.yml | 5.2 | Vercel build verification |
| Preview deploy workflow | 5.3 | PR preview deployments |
| Env variable handling | 5.4 | CI secrets setup |
| **Testing (Phase 6)** | | |
| Vercel handler tests | 6.1.1 | Serverless unit tests |
| Service tests update | 6.1.2 | Prisma singleton tests |
| Integration tests | 6.1.3 | Full handler tests |
| API client tests | 6.2.1 | Environment config tests |
| Environment detection | 6.2.2 | PROD/DEV switching |
| Backend BDD config | 6.3.1 | Serverless test mode |
| Frontend BDD config | 6.3.2 | Preview URL testing |
| Smoke tests | 6.3.3 | Deployment verification |
| BDD CI workflow | 6.3.4 | Deployment smoke tests |
| unit-tests.yml update | 6.4.1 | Handler test coverage |
| bdd-tests.yml update | 6.4.2 | Smoke test job |
| lint-build.yml update | 6.4.3 | Serverless build verify |
| Migration commands | 7.6 | Database setup |
| Seed commands | 7.7 | Initial data |

---

## Post-Deployment

### Monitoring

Vercel provides built-in monitoring:
- Function invocations and duration
- Error rates and logs
- Bandwidth usage

Neon provides:
- Query performance
- Storage usage
- Connection metrics

### CI/CD

After initial deployment, every push to `main` will:
1. Trigger Vercel build
2. Run build checks
3. Deploy to production automatically

PRs will get preview deployments automatically.

### Rollback

If issues arise:
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot find module" | Missing dependency | Run `pnpm install` before deploy |
| "Database connection failed" | Wrong DATABASE_URL | Verify Neon connection string |
| "Function timeout" | Query too slow | Add database indexes |
| "CORS error" | Missing cors config | Check cors middleware |
| Prisma Client not found | Build order issue | Add `prisma generate` to build |

### Debug Commands

```bash
# View Vercel logs
vercel logs [deployment-url]

# Test locally with Vercel CLI
vercel dev

# Check Neon connection
psql $DATABASE_URL -c "SELECT 1"
```

---

## Security Considerations

- [ ] Never commit `.env` files
- [ ] Use Vercel's encrypted environment variables
- [ ] Enable Neon's IP allowlist (optional)
- [ ] Review CORS origins for production
- [ ] Consider adding rate limiting (future)

---

## Cost Projection

| Service | Free Tier | Overage Cost |
|---------|-----------|--------------|
| Vercel | 100GB-hrs, 100k functions | $0.18/GB-hr |
| Neon | 0.5GB, 100 CU-hrs | $0.102/GB, $0.16/CU-hr |

**Estimated monthly cost for personal use: $0**

To exceed free tier, you'd need:
- 100,000+ API calls/month (Vercel)
- 500MB+ of data (Neon)
- 100+ compute hours (Neon)

---

## Next Steps After Deployment

1. **Custom Domain** - Add your own domain in Vercel settings
2. **Analytics** - Enable Vercel Analytics (free tier available)
3. **Authentication** - Add user auth when ready (future PRD)
4. **Monitoring** - Set up alerts in Neon dashboard

---

*Document Version: 1.0*
*Created: 2026-01-26*
*Status: Ready for Implementation*
