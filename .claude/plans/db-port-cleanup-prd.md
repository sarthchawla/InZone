# PRD: Database Port Cleanup & Unified Container Setup

**Version:** 1.0
**Date:** 2026-01-29
**Status:** Implemented
**Author:** Claude Code

---

## 1. Problem Statement

### 1.1 Current Pain Points

1. **Complex Local Setup:** Launching the app locally requires configuring the database, which is error-prone and time-consuming.

2. **Environment Drift:** DevContainer uses a different database configuration than local development:
   - DevContainer DB: `db:5432` (internal) → `localhost:5435` (forwarded)
   - Standalone Docker: `localhost:5434`
   - Local PostgreSQL: `localhost:5432`

3. **Forgotten .env Changes:** Developers must manually update `.env` when switching between local and DevContainer, leading to frequent forgotten changes and broken setups.

4. **Configuration Sprawl:** Multiple database configurations exist:
   - `.devcontainer/docker-compose.yml` (db service)
   - `docker/docker-compose.db.yml` (standalone db)
   - Multiple scripts: `start.sh`, `start-db-container.sh`, `create-local-db.sh`

### 1.2 Current Port Mapping

| Environment | Port | DATABASE_URL Host |
|------------|------|-------------------|
| Local PostgreSQL | 5432 | localhost:5432 |
| Standalone Docker | 5434 | localhost:5434 |
| DevContainer | 5435 | db:5432 (internal) |

---

## 2. Proposed Solution

### 2.1 Core Principles

1. **Single Source of Truth:** One Docker container configuration for the database
2. **Consistent Port:** Use port `7432` everywhere (7xxx range as specified)
3. **Zero Configuration:** Same `.env` works in local and DevContainer
4. **Simple Scripts:** Clear npm scripts for database and app management

### 2.2 Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Environments                  │
├─────────────────────────┬───────────────────────────────────┤
│      Local Machine      │         DevContainer              │
├─────────────────────────┼───────────────────────────────────┤
│                         │                                   │
│   npm run db:start      │    DB container auto-starts       │
│         │               │    via docker-compose.yml         │
│         ▼               │              │                    │
│  ┌──────────────────────┴──────────────┴─────────────────┐  │
│  │           PostgreSQL Docker Container                 │  │
│  │           Port: 7432 → 5432 (internal)                │  │
│  │           Name: inzone-db                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│            DATABASE_URL: localhost:7432                     │
│            (Same in both environments!)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Unified DATABASE_URL

```
DATABASE_URL=postgresql://inzone:inzone_dev@localhost:7432/inzone?schema=public
```

This URL works in:
- Local development (container exposed on localhost:7432)
- DevContainer (container network accessible on localhost:7432)

---

## 3. Detailed Implementation

### 3.1 New Docker Configuration

**File:** `docker/docker-compose.db.yml` (updated)

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: inzone-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: inzone
      POSTGRES_PASSWORD: inzone_dev
      POSTGRES_DB: inzone
    ports:
      - "7432:5432"
    volumes:
      - inzone-db-data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U inzone -d inzone"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  inzone-db-data:
    name: inzone-db-data
```

### 3.2 New NPM Scripts

**File:** `package.json` (root)

```json
{
  "scripts": {
    "db:start": "docker compose -f docker/docker-compose.db.yml up -d && pnpm run db:wait && pnpm run db:migrate:deploy",
    "db:stop": "docker compose -f docker/docker-compose.db.yml down",
    "db:wait": "node scripts/wait-for-db.js",
    "db:logs": "docker compose -f docker/docker-compose.db.yml logs -f",
    "db:reset": "docker compose -f docker/docker-compose.db.yml down -v && pnpm run db:start && pnpm run db:seed",
    "dev": "pnpm run db:start && turbo run dev",
    "dev:app": "turbo run dev"
  }
}
```

| Script | Description |
|--------|-------------|
| `db:start` | Start DB container + wait for ready + run migrations |
| `db:stop` | Stop DB container (data preserved) |
| `db:wait` | Wait for DB to be ready (health check) |
| `db:logs` | Stream DB container logs |
| `db:reset` | Destroy and recreate DB with fresh migrations + seed |
| `dev` | Start DB + app (full development start) |
| `dev:app` | Start app only (assumes DB is running) |

### 3.3 Database Wait Script

**File:** `scripts/wait-for-db.js`

```javascript
#!/usr/bin/env node

const { execFileSync } = require('child_process');
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForDb() {
  console.log('Waiting for database to be ready...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // Using execFileSync (safer than execSync - no shell injection risk)
      execFileSync('docker', [
        'exec',
        'inzone-db',
        'pg_isready',
        '-U', 'inzone',
        '-d', 'inzone'
      ], { stdio: 'pipe' });

      console.log('\nDatabase is ready!');
      process.exit(0);
    } catch {
      process.stdout.write('.');
      await sleep(RETRY_INTERVAL);
    }
  }

  console.error('\nDatabase failed to become ready after ' + MAX_RETRIES + ' attempts');
  process.exit(1);
}

waitForDb();
```

### 3.4 DevContainer Changes

**File:** `.devcontainer/devcontainer.json` (updated)

```json
{
  "name": "InZone Dev",
  "dockerComposeFile": ["docker-compose.yml", "../docker/docker-compose.db.yml"],
  "service": "app",
  "workspaceFolder": "/InZone-App",
  "remoteEnv": {
    "DATABASE_URL": "postgresql://inzone:inzone_dev@localhost:7432/inzone?schema=public"
  },
  "forwardPorts": [3001, 5173, 7432],
  "postCreateCommand": "...",
  "postStartCommand": "pnpm run db:wait && pnpm run db:migrate:deploy"
}
```

Key changes:
- Reference shared `docker-compose.db.yml` instead of embedded db service
- Use `localhost:7432` for DATABASE_URL (same as local)
- Forward port 7432

### 3.5 Updated .env.example

**File:** `apps/api/.env.example`

```env
# Database - Same URL works in local and DevContainer
DATABASE_URL=postgresql://inzone:inzone_dev@localhost:7432/inzone?schema=public

# Server
PORT=3001
NODE_ENV=development
```

---

## 4. Migration Strategy: Prisma on DB Start vs App Start

### 4.1 Recommendation: Run Prisma on DB Container Launch

**Decision:** Run migrations when the database container starts (via `db:start` script)

**Rationale:**

| Aspect | On DB Start | On App Start |
|--------|-------------|--------------|
| **Schema Ready** | DB is always in correct state | May have stale schema until app starts |
| **Multiple Apps** | All apps get correct schema immediately | Each app may race to migrate |
| **Container Restart** | Migrations run once on fresh start | N/A |
| **Fail Fast** | Migration errors caught early | Errors delayed until app start |
| **Dev Experience** | `db:start` = fully ready DB | Extra step or hidden migration |

**Implementation:**
- `db:start` runs `db:migrate:deploy` after container is healthy
- `db:reset` runs migrations + seed for fresh setup
- DevContainer `postStartCommand` ensures migrations on container start

### 4.2 Script Flow

```
pnpm run db:start
    │
    ├── docker compose up -d (start container)
    │
    ├── pnpm run db:wait (health check loop)
    │
    └── pnpm run db:migrate:deploy (apply migrations)
         │
         └── Database ready with current schema!

pnpm run dev
    │
    ├── pnpm run db:start (above flow)
    │
    └── turbo run dev (start API + Web)
```

---

## 5. Files to Remove/Update

### 5.1 Files to DELETE

| File | Reason |
|------|--------|
| `scripts/start.sh` | Replaced by npm scripts |
| `scripts/start-db-container.sh` | Replaced by `db:start` |
| `scripts/create-local-db.sh` | Not needed - container handles DB creation |

### 5.2 Files to UPDATE

| File | Changes |
|------|---------|
| `docker/docker-compose.db.yml` | Update port to 7432, add container name |
| `.devcontainer/docker-compose.yml` | Remove db service, reference shared file |
| `.devcontainer/devcontainer.json` | Update DATABASE_URL, ports, compose files |
| `apps/api/.env.example` | Update DATABASE_URL to localhost:7432 |
| `apps/api/.env` | Update DATABASE_URL to localhost:7432 |
| `package.json` (root) | Add new db scripts |

### 5.3 Files to CREATE

| File | Purpose |
|------|---------|
| `scripts/wait-for-db.js` | Node script to wait for DB health |

---

## 6. Developer Workflow (After Implementation)

### 6.1 First Time Setup

```bash
# Clone repo
git clone <repo>
cd InZone

# Install dependencies
pnpm install

# Start everything (DB + App)
pnpm run dev
```

### 6.2 Daily Development

```bash
# Start full stack
pnpm run dev

# Or start separately:
pnpm run db:start    # Start DB (if not running)
pnpm run dev:app     # Start app only
```

### 6.3 DevContainer

```bash
# Just open in DevContainer
# DB starts automatically via postStartCommand
# Same .env works - no changes needed!
```

### 6.4 Database Operations

```bash
pnpm run db:start    # Start DB container
pnpm run db:stop     # Stop DB container (data preserved)
pnpm run db:reset    # Nuke and recreate DB
pnpm run db:logs     # View DB logs
pnpm run db:studio   # Open Prisma Studio
pnpm run db:seed     # Seed data
```

---

## 7. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Single .env file | Same DATABASE_URL works in local and DevContainer |
| Zero config switching | No .env changes needed when switching environments |
| One-command start | `pnpm run dev` starts everything |
| Clear scripts | Each db:* script has single responsibility |
| Fast iteration | DB starts in < 10 seconds |
| Data persistence | DB data survives container restarts |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Port 7432 conflict | DB won't start | Check port availability in wait script |
| Docker not running | Scripts fail | Clear error message in wait script |
| Migration failures | App can't start | Fail fast on db:start, show clear error |
| Data loss on reset | Developer loses test data | `db:reset` requires explicit call, `db:stop` preserves data |

---

## 9. Implementation Checklist

- [x] Update `docker/docker-compose.db.yml` with port 7432
- [x] Create `scripts/wait-for-db.js`
- [x] Update root `package.json` with new scripts
- [x] Update `.devcontainer/docker-compose.yml` to remove db service
- [x] Update `.devcontainer/devcontainer.json` to reference shared compose
- [x] Update `apps/api/.env.example` with new DATABASE_URL
- [x] Update `apps/api/.env` with new DATABASE_URL
- [x] Delete `scripts/start.sh`
- [x] Delete `scripts/start-db-container.sh`
- [x] Delete `scripts/create-local-db.sh`
- [x] Test local development workflow
- [ ] Test DevContainer workflow (requires rebuild)
- [ ] Update README with new commands

---

## 10. Open Questions

1. **Volume naming:** Should we use a project-specific volume name (`inzone-db-data`) to avoid conflicts with other projects?
   - **Recommendation:** Yes, use `inzone-db-data`

2. **Seed on start:** Should `db:start` also run seed, or keep it separate?
   - **Recommendation:** Keep separate. Seed only on `db:reset` or explicit `db:seed`

3. **Health check in dev script:** Should `pnpm run dev` fail if DB health check fails?
   - **Recommendation:** Yes, fail fast with clear error message

---

## Appendix A: Port Selection Rationale

**Why 7432?**
- In 7xxx range as requested
- Mirrors PostgreSQL default (5432) for easy recognition (7**432**)
- Unlikely to conflict with common services
- Easy to remember: "7" for InZone + "432" from PostgreSQL

**Alternative Ports Considered:**
- 7000: Too generic
- 7432: Selected - memorable pattern
- 7543: No mnemonic value

---

## Appendix B: Current vs Proposed Comparison

| Aspect | Current | Proposed |
|--------|---------|----------|
| DB Configs | 3 (local, docker, devcontainer) | 1 (docker only) |
| Ports | 5432, 5434, 5435 | 7432 only |
| .env changes | Required when switching | Never |
| Start command | Complex `start.sh` | Simple `pnpm run dev` |
| Scripts | 3 shell scripts | 1 JS wait script |
| Compose files | 2 separate | 1 shared |
