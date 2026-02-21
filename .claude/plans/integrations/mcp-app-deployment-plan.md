# Plan: InZone MCP App Variant (Hybrid mcp-use + ext-apps)

## Context

InZone is a Trello-like kanban board deployed on Vercel as a monorepo (React+Vite frontend, Express.js API). The goal is to create a **second Vercel deployment** that exposes the same kanban functionality as an **MCP server** — enabling AI assistants (Claude Desktop, etc.) to manage boards, todos, and columns through MCP tools, with interactive React widgets for visual UI.

The hybrid approach uses:
- **mcp-use** — Hono-based MCP server backbone with tools, auth, widgets, and response helpers
- **@modelcontextprotocol/ext-apps** — Interactive single-file HTML UIs for rich in-host experiences (board kanban view, todo management)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP CLIENTS                                     │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│  Claude Desktop  │  Cursor (remote) │  Claude Code     │  Cursor (local)    │
│  (MCP App + UI)  │  (SSE)           │  (stdio)         │  (stdio)           │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴──────────┬─────────┘
         │ HTTP/SSE                  │ HTTP/SSE          │ stdio              │ stdio
         ▼                          ▼                   ▼                    ▼
┌─────────────────────────────────────────┐  ┌──────────────────────────────────┐
│     Vercel Serverless (apps/mcp)        │  │     Local Process (apps/mcp)      │
│  ┌───────────────────────────────────┐  │  │  ┌────────────────────────────┐   │
│  │  api/index.ts                     │  │  │  │  src/stdio.ts              │   │
│  │  (Hono/Vercel adapter)            │  │  │  │  (StdioServerTransport)    │   │
│  │  + initialization guard           │  │  │  │  + graceful shutdown       │   │
│  └──────────────┬────────────────────┘  │  │  └─────────────┬──────────────┘   │
│                 │                        │  │                │                  │
│  ┌──────────────▼────────────────────┐  │  │  ┌─────────────▼──────────────┐   │
│  │  src/index.ts                     │  │  │  │                            │   │
│  │  (HTTP/SSE entry)                 │  │  │  │                            │   │
│  └──────────────┬────────────────────┘  │  │  │                            │   │
└─────────────────┼────────────────────────┘  │  │                            │   │
                  │                           │  │                            │   │
                  ▼                           │  │                            │   │
┌─────────────────────────────────────────────┼──┼────────────────────────────┼───┤
│                 src/server.ts (SHARED CORE)  │  │                            │   │
│  ┌───────────────────────────────────────┐  │  │                            │   │
│  │  MCPServer (mcp-use / Hono)           │◄─┘  │       (same server)       │◄──┘
│  │  ├── name: inzone-mcp                 │     │                            │
│  │  ├── Global error handler             │     │                            │
│  │  └── Fail-fast startup checks         │     │                            │
│  └──────────────┬────────────────────────┘     │                            │
└─────────────────┼──────────────────────────────┴────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTH MIDDLEWARE (src/auth/middleware.ts)                  │
│  ┌────────────────┐  ┌───────────────────┐  ┌────────────────────────────┐  │
│  │ Dev Bypass      │  │ Session Cookie    │  │ Bearer Token Fallback      │  │
│  │ (non-prod only) │  │ (better-auth)     │  │ (CLI clients via SSE)      │  │
│  │ Finding #2 fix  │  │ Finding #1 fix    │  │ Finding #6 fix             │  │
│  └────────────────┘  └───────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ userId extracted
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MCP TOOLS (26 total)                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌───────┐ │
│  │  boards.ts   │ │  columns.ts  │ │  todos.ts    │ │labels.ts │ │templ. │ │
│  │  7 tools     │ │  4 tools     │ │  8 tools     │ │ 5 tools  │ │2 tools│ │
│  │  CRUD + dup  │ │  CRUD+reorder│ │  CRUD+move   │ │ CRUD     │ │ R/O   │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └────┬─────┘ └───┬───┘ │
│         │ withErrorBoundary() wrapper on all handlers     │           │      │
│         │ + mandatory null checks (Findings #3, #11)      │           │      │
└─────────┼────────────────┼────────────────┼───────────────┼───────────┼──────┘
          │                │                │               │           │
          ▼                ▼                ▼               ▼           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               RESPONSE LAYER                                                 │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────────────┐  │
│  │ text()  │  │ object() │  │ widget() │  │ error() │  │ ext-app HTML   │  │
│  │ (CLI)   │  │ (JSON)   │  │ (React)  │  │ (fail)  │  │ (interactive)  │  │
│  └─────────┘  └──────────┘  └─────┬────┘  └─────────┘  └───────┬────────┘  │
└────────────────────────────────────┼────────────────────────────┼────────────┘
                                     │                            │
                              ┌──────▼──────┐              ┌─────▼─────────┐
                              │  Widgets    │              │  ext-app/     │
                              │  (inline)   │              │  (fullscreen) │
                              ├─────────────┤              ├───────────────┤
                              │ BoardOverview│              │ App.tsx       │
                              │ BoardDetail │              │ KanbanBoard   │
                              │ TodoDetail  │              │ TodoEditor    │
                              └─────────────┘              │ BoardList     │
                                                           └───────────────┘
                                                              bundled via
                                                           vite-plugin-singlefile

          ┌───────────────────────────────────────────────────────┐
          │                                                       │
          ▼                                                       ▼
┌──────────────────────────────────┐    ┌──────────────────────────────────────┐
│  apps/api (EXISTING)             │    │  Neon PostgreSQL (SHARED)             │
│  ├── services/ (Step 0 refactor) │    │  ├── boards, columns, todos, labels  │
│  │   ├── board.service.ts        │◄───│  ├── users, sessions                 │
│  │   ├── todo.service.ts         │    │  └── connection_limit=5 per project  │
│  │   ├── column.service.ts       │    │       (Finding #7)                   │
│  │   ├── label.service.ts        │    └──────────────────────────────────────┘
│  │   └── template.service.ts     │               ▲
│  ├── lib/prisma.ts (shared)      │───────────────┘
│  ├── lib/auth.ts (shared)        │
│  │   + AUTH_COOKIE_DOMAIN        │
│  ├── lib/origins.ts              │
│  │   + MCP_ORIGIN                │
│  └── package.json                │
│      + exports map (Step 1)      │
└──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEPLOYMENT TOPOLOGY                                 │
│                                                                              │
│  ┌──────────────────────────┐      ┌──────────────────────────────────────┐  │
│  │  Vercel Project 1        │      │  Vercel Project 2 (NEW)              │  │
│  │  app.inzone.dev          │      │  mcp.inzone.dev                      │  │
│  │  ├── Root: /             │      │  ├── Root: apps/mcp                  │  │
│  │  ├── apps/web (React)    │      │  ├── api/index.ts (Hono/Vercel)     │  │
│  │  └── apps/api (Express)  │      │  ├── maxDuration: 30s (Finding #8)  │  │
│  │                          │      │  └── MCP endpoint: /mcp              │  │
│  └────────────┬─────────────┘      └──────────────────┬───────────────────┘  │
│               │                                        │                     │
│               └──── Shared cookie domain: .inzone.dev ─┘                     │
│                     (AUTH_COOKIE_DOMAIN)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
apps/mcp/                        # NEW workspace
├── api/index.ts                 # Vercel serverless handler (hono/vercel adapter)
├── src/
│   ├── server.ts                # MCPServer setup (mcp-use) — shared by both transports
│   ├── index.ts                 # HTTP/SSE entry (Vercel + local dev)
│   ├── stdio.ts                 # stdio entry (Cursor, Claude Code)
│   ├── auth/
│   │   └── middleware.ts        # Hono middleware bridging better-auth sessions
│   ├── tools/
│   │   ├── index.ts             # Register all tools
│   │   ├── boards.ts            # 7 board tools
│   │   ├── columns.ts           # 4 column tools
│   │   ├── todos.ts             # 8 todo tools
│   │   ├── labels.ts            # 5 label tools
│   │   └── templates.ts         # 2 template tools
│   ├── widgets/                 # mcp-use React widgets (inline with tool results)
│   │   ├── BoardOverview.tsx
│   │   ├── BoardDetail.tsx
│   │   └── TodoDetail.tsx
│   └── ext-app/                 # Single ext-apps interactive HTML UI
│       ├── App.tsx              # Main app with board + todo views
│       ├── components/          # Shared UI components (BoardView, TodoCard, etc.)
│       ├── main.tsx             # Entry point with useApp hook
│       └── index.html           # HTML shell for vite-plugin-singlefile
├── package.json
├── tsconfig.json
├── vite.config.ts               # Builds ext-apps as single-file HTML bundles
└── vercel.json                  # MCP-specific Vercel config
```

### Service Reuse Strategy

Import services directly from `apps/api` via workspace dependency rather than extracting to shared package. Services use constructor DI with PrismaClient, making this clean:

```typescript
import { prisma } from 'api/lib/prisma';
import { BoardService } from 'api/services';
const boardService = new BoardService(prisma);
```

Requires adding an `exports` map to `apps/api/package.json`.

---

## Review Findings (14 issues identified)

A thorough audit found 14 issues. The full audit is at `.claude/plans/hashed-mapping-mist-agent-a2ad6daaf993204ba.md`. Key blockers addressed below:

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 13 | **CRITICAL** | Services have no userId filtering — data leaks across users | **Step 0: Refactor services** |
| 2 | **CRITICAL** | `VITE_AUTH_BYPASS` has no production guard | Step 4: production guard in auth middleware |
| 3 | **CRITICAL** | No error boundary for tool handlers — service exceptions crash server | Step 3: global error handler + per-tool wrapper |
| 1 | **CRITICAL** | Bare catch in auth swallows DB failures as 401 | Step 4: proper error classification |
| 9 | HIGH | `MCP_BASE_URL` silently defaults to localhost in production | Step 3: fail-fast startup check |
| 6 | HIGH | Cross-origin cookies silently fail without `AUTH_COOKIE_DOMAIN` | Step 4: mandatory config + startup validation |
| 7 | HIGH | Prisma connection pool exhaustion across two Vercel projects | Step 0: `?connection_limit=5` in DATABASE_URL |
| 4 | HIGH | stdio transport has no disconnect/crash recovery | Step 3: signal handlers + prisma.$disconnect() |
| 8 | HIGH | 10s Vercel timeout insufficient for cold starts | Step 9: increase to 30s + tool-level timeouts |
| 5 | HIGH | SSE has no connection drop handling | Step 3: abort signal handling |
| 11 | MEDIUM | Services return null for not-found but plan ignores this | Step 5: mandatory null checks |
| 12 | MEDIUM | Inconsistent error signaling (throw vs null) in services | Step 0: normalize to return null + use error() |
| 10 | MEDIUM | `MCP_ORIGIN` silently omitted from CORS if env var missing | Step 10: startup warning |
| 14 | MEDIUM | Vercel handler has no initialization guard | Step 8: try-catch at module level |

---

## Implementation Steps

### Step 0: Refactor Service Layer for User Scoping (PREREQUISITE)

**Problem:** Services (`BoardService.getBoards()`, `getBoardById()`, `deleteBoard()`, etc.) have **no userId parameter**. The Express routes add `where: { userId: req.user!.id }` directly in Prisma queries, bypassing the service layer. This means MCP tools calling services directly would return ALL users' data.

**Fix:** Add `userId` parameter to all user-scoped service methods:

**Files to modify:**
- `apps/api/src/services/board.service.ts` — Add userId to `getBoards(userId)`, `getBoardById(id, userId)`, `updateBoard(id, input, userId)`, `deleteBoard(id, userId)`, `duplicateBoard(id, userId)` (already has it), `addColumn(boardId, ..., userId)`
- `apps/api/src/services/todo.service.ts` — Add userId to read/write methods (scope via board ownership)
- `apps/api/src/services/column.service.ts` — Add userId to methods (scope via board ownership)
- `apps/api/src/services/label.service.ts` — Add userId if labels are user-scoped
- `apps/api/src/routes/boards.ts` — Update to use refactored services instead of inline Prisma queries
- `apps/api/src/routes/todos.ts` — Same
- `apps/api/src/routes/columns.ts` — Same

**Pattern:**
```typescript
// Before (no user scoping):
async getBoards(): Promise<BoardWithColumns[]> {
  return this.prisma.board.findMany({ where: { isDeleted: false } });
}

// After (user-scoped):
async getBoards(userId: string): Promise<BoardWithColumns[]> {
  return this.prisma.board.findMany({ where: { userId, isDeleted: false } });
}
```

Also normalize error signaling: methods that currently throw for not-found should return `null` instead (or throw a typed `NotFoundError`). This makes MCP tool handlers simpler.

**This step must be done first** — it modifies the existing API code and needs its own tests.

### Step 1: Add exports map to `apps/api/package.json`

**File:** `apps/api/package.json`

Add `exports` field so MCP workspace can import sub-paths:
```json
"exports": {
  ".": { "types": "./src/app.ts", "default": "./dist/app.js" },
  "./services": { "types": "./src/services/index.ts", "default": "./dist/services/index.js" },
  "./lib/prisma": { "types": "./src/lib/prisma.ts", "default": "./dist/lib/prisma.js" },
  "./lib/auth": { "types": "./src/lib/auth.ts", "default": "./dist/lib/auth.js" }
}
```

### Step 2: Scaffold `apps/mcp` workspace

Create the workspace with:
- `package.json` — deps: `mcp-use`, `@modelcontextprotocol/ext-apps`, `@modelcontextprotocol/sdk`, `hono`, `@hono/node-server`, `zod`, `api: workspace:*`
- `tsconfig.json` — ESM, NodeNext, jsx: react-jsx
- `vite.config.ts` — `@vitejs/plugin-react` + `vite-plugin-singlefile` for ext-apps bundles

No changes needed to `pnpm-workspace.yaml` (already includes `apps/*`).

### Step 3: MCP Server Core (Dual Transport: HTTP/SSE + stdio)

The server supports **both transports** from the same tool definitions. Clients that support ext-apps (Claude Desktop) see interactive UI; CLI clients (Cursor, Claude Code) get text/JSON responses. All tools — including create, update, delete mutations — work identically across both transports.

**File:** `apps/mcp/src/server.ts` — Core server setup (shared by both transports)

```typescript
import { MCPServer, text, object, error } from 'mcp-use/server';
import { prisma } from 'api/lib/prisma';
import { registerAllTools } from './tools/index.js';

// Fail fast on missing required config in production (Finding 9)
const baseUrl = process.env.MCP_BASE_URL;
if (!baseUrl && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
  console.error('[mcp] FATAL: MCP_BASE_URL is required in production');
  process.exit(1);
}

const server = new MCPServer({
  name: 'inzone-mcp',
  title: 'InZone Kanban MCP',
  version: '0.1.0',
  baseUrl: baseUrl || 'http://localhost:3002',
});

// Global error handler (Finding 3)
server.app.onError((err, c) => {
  console.error('[mcp] Unhandled error:', err.constructor.name, err.message);
  if (err.code === 'P2025') return c.json({ error: 'Resource not found' }, 404);
  if (err.code === 'P2002') return c.json({ error: 'Duplicate resource' }, 409);
  return c.json({ error: 'Internal server error' }, 500);
});

// Eager DB connection check (Finding 7)
await prisma.$connect();

registerAllTools(server);
export { server };
```

**File:** `apps/mcp/src/index.ts` — HTTP/SSE entry (Vercel deployment + local dev):

```typescript
import { server } from './server.js';
server.listen(); // Hono HTTP server on port 3002
```

**File:** `apps/mcp/src/stdio.ts` — stdio entry with graceful shutdown (Finding 4):

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { prisma } from 'api/lib/prisma';
import { server } from './server.js';

async function main() {
  const transport = new StdioServerTransport();

  const shutdown = async () => {
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', async (err) => {
    console.error('[mcp-stdio] Uncaught:', err);
    await prisma.$disconnect();
    process.exit(1);
  });

  await server.nativeServer.connect(transport);
}
main();
```

**Client configuration:**

| Client | Transport | Config |
|--------|-----------|--------|
| Claude Desktop (MCP App + UI) | HTTP/SSE | `"url": "https://inzone-mcp.vercel.app/mcp"` |
| Cursor (remote) | SSE | `"url": "https://inzone-mcp.vercel.app/mcp"` |
| Claude Code (local) | stdio | `"command": "pnpm --filter mcp exec tsx src/stdio.ts"` |
| Cursor (local) | stdio | `"command": "pnpm --filter mcp exec tsx src/stdio.ts"` |

### Step 4: Auth — Login Once, Works Everywhere

The MCP server reuses the **same better-auth instance and database** as the web app. Users login once via Google OAuth and the session works across both deployments.

**How it works per transport:**

| Transport | Client | Auth Mechanism |
|-----------|--------|----------------|
| **HTTP/SSE** (deployed) | Claude Desktop, web MCP clients | Session cookie from better-auth (shared cookie domain) |
| **HTTP/SSE** (local dev) | MCP Inspector, any HTTP client | Dev bypass (`VITE_AUTH_BYPASS=true`) or local session cookie |
| **stdio** (local) | Cursor, Claude Code | API token header or dev bypass (no cookies in stdio) |

**File:** `apps/mcp/src/auth/middleware.ts` — Hono middleware with proper error handling:

```typescript
import { auth } from 'api/lib/auth';

const DEV_USER = { id: 'dev-user-000', name: 'Dev User', email: 'dev@localhost' };

export async function requireMcpAuth(c, next) {
  // Finding 2: Production guard on dev bypass
  if (process.env.VITE_AUTH_BYPASS === 'true') {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      console.error('[mcp-auth] SECURITY: VITE_AUTH_BYPASS=true in production. Ignoring.');
    } else {
      c.set('user', DEV_USER);
      return next();
    }
  }

  // Finding 1: Distinguish auth failures from infrastructure failures
  let session;
  try {
    session = await auth.api.getSession({ headers: c.req.raw.headers });
  } catch (err) {
    console.error('[mcp-auth] Session lookup failed:', err.constructor?.name, err.message);
    return c.json({ error: 'Authentication service unavailable' }, 503);
  }

  if (session) {
    c.set('user', { id: session.user.id, name: session.user.name, email: session.user.email });
    return next();
  }

  // Bearer token fallback for CLI MCP clients connecting via SSE
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const tokenSession = await auth.api.getSession({
        headers: new Headers({ cookie: `better-auth.session_token=${token}` })
      });
      if (tokenSession) {
        c.set('user', { id: tokenSession.user.id, name: tokenSession.user.name, email: tokenSession.user.email });
        return next();
      }
    } catch (err) {
      console.error('[mcp-auth] Bearer token validation failed:', err.message);
      return c.json({ error: 'Authentication service unavailable' }, 503);
    }
  }

  // Finding 6: Helpful error when cookies are missing (likely domain misconfiguration)
  const cookieHeader = c.req.header('Cookie');
  if (!cookieHeader || !cookieHeader.includes('better-auth.session_token')) {
    console.warn('[mcp-auth] No session cookie present. Check AUTH_COOKIE_DOMAIN config.');
  }

  return c.json({ error: 'Unauthorized' }, 401);
}
```

**Cookie domain setup (MANDATORY for cross-origin, Finding 6):**

Add `AUTH_COOKIE_DOMAIN` env var to `apps/api/src/lib/auth.ts`:
```typescript
advanced: {
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookieDomain: process.env.AUTH_COOKIE_DOMAIN, // e.g., '.inzone.dev'
},
```

Add startup validation in `apps/mcp/src/server.ts`:
```typescript
if (process.env.MCP_ORIGIN && !process.env.AUTH_COOKIE_DOMAIN) {
  console.error('[mcp] CONFIGURATION ERROR: MCP_ORIGIN set but AUTH_COOKIE_DOMAIN missing.');
}
```

Use custom domains sharing a parent domain (e.g., `app.inzone.dev` and `mcp.inzone.dev` with cookie domain `.inzone.dev`).

### Step 5: MCP Tools (26 tools — full CRUD including mutations)

All tools — reads AND mutations (create, update, delete) — work across both transports. An AI assistant in Cursor can create a board just like the web UI can.

All tools follow this pattern — import service, define Zod schema, call service method:

| File | Read Tools | Mutation Tools |
|------|-----------|----------------|
| `tools/boards.ts` | `list-boards`, `get-board` | `create-board`, `update-board`, `delete-board`, `duplicate-board`, `add-column-to-board` |
| `tools/columns.ts` | `get-column` | `update-column`, `delete-column`, `reorder-columns` |
| `tools/todos.ts` | `list-todos`, `get-todo` | `create-todo`, `update-todo`, `delete-todo`, `move-todo`, `reorder-todos`, `archive-todo` |
| `tools/labels.ts` | `list-labels`, `get-label` | `create-label`, `update-label`, `delete-label` |
| `tools/templates.ts` | `list-templates`, `get-template` | *(read-only — templates are built-in)* |

Key patterns:
- Use `text()`, `object()`, `widget()`, `error()` response helpers
- Add `.describe()` on every Zod schema field
- Set `annotations: { destructiveHint: true }` on delete tools — MCP clients will prompt for confirmation
- Set `annotations: { readOnlyHint: true }` on list/get tools
- Extract `userId` from auth context: `const userId = c.get('user').id`
- Mutations return the updated object so the AI has fresh data to work with
- **Mandatory null checks** (Finding 11): Every method that can return null must be checked
- **Error boundary wrapper** (Finding 3): All tool handlers use `withErrorBoundary()`:

```typescript
// Shared error boundary for all tool handlers
function withErrorBoundary(handler) {
  return async (params, ctx) => {
    try {
      return await handler(params, ctx);
    } catch (err) {
      console.error(`[mcp-tool] Failed:`, err.message);
      if (err.message?.includes('not found')) return error(`Not found: ${err.message}`);
      return error('An unexpected error occurred. Check server logs.');
    }
  };
}

// Example tool with null check + error boundary:
server.tool('get-board', { boardId: z.string().describe('Board ID') },
  withErrorBoundary(async ({ boardId }, ctx) => {
    const board = await boardService.getBoardById(boardId, ctx.user.id);
    if (!board) return error(`Board "${boardId}" not found`);
    return object(board);
  })
);
```

### Step 6: mcp-use Widgets (React)

Three widget components in `apps/mcp/src/widgets/`:

1. **BoardOverview.tsx** — Grid of board cards showing name, column counts, todo counts. Used by `list-boards` tool via `widget()` helper.
2. **BoardDetail.tsx** — Kanban column layout showing todos per column. Used by `get-board` tool.
3. **TodoDetail.tsx** — Todo card with priority badge, labels, due date. Used by `get-todo` tool.

### Step 7: ext-apps Interactive UI (Single App)

One unified interactive HTML app in `apps/mcp/src/ext-app/`:

**InZone App** — A single React application that combines the full kanban experience: board list overview, interactive board detail with columns and drag-and-drop todo management, inline todo editing with label assignment and priority changes. Uses internal routing/state to switch between views (board list -> board detail -> todo detail).

- `App.tsx` — Root component with view state management (board list, board detail, todo detail)
- `components/` — Shared components: `BoardList.tsx`, `KanbanBoard.tsx`, `TodoCard.tsx`, `TodoEditor.tsx`
- `main.tsx` — Entry point with `useApp` hook, `useHostStyles`, lifecycle handlers (`ontoolinput`, `ontoolresult`, `onhostcontextchanged`)
- `index.html` — HTML shell

Bundled via Vite + `vite-plugin-singlefile` into a single HTML file. Registered as one MCP resource with a corresponding tool to launch it.

### Step 8: Vercel Serverless Handler (Finding 14: initialization guard)

**File:** `apps/mcp/api/index.ts`

```typescript
import { handle } from 'hono/vercel';

let handler;
try {
  const { server } = await import('../src/server.js');
  handler = handle(server.app);
} catch (err) {
  console.error('[mcp-vercel] Server initialization failed:', err);
  handler = (_req, res) => {
    res.status(503).json({ error: 'MCP server failed to initialize. Check deployment logs.' });
  };
}

export default handler;
```

### Step 9: Vercel Deployment Config (Finding 8: increase timeout)

**File:** `apps/mcp/vercel.json`

```json
{
  "buildCommand": "cd ../.. && pnpm run db:generate && pnpm --filter api build && pnpm --filter mcp build",
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }],
  "functions": { "api/index.ts": { "memory": 1024, "maxDuration": 30 } }
}
```

Create a **second Vercel project** (`inzone-mcp`) from the same GitHub repo:
- **Root Directory**: `apps/mcp`
- **Environment Variables**: Same `DATABASE_URL` (with `?connection_limit=5`), `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_COOKIE_DOMAIN`, `MCP_BASE_URL`, `MCP_ORIGIN`

### Step 10: Update allowed origins

**File:** `apps/api/src/lib/origins.ts`

Add `MCP_ORIGIN` env var to the allowed origins array + startup warning (Finding 10):

```typescript
process.env.MCP_ORIGIN, // e.g., https://inzone-mcp.vercel.app
```

---

## Files to Modify (Existing)

| File | Change |
|------|--------|
| `apps/api/src/services/board.service.ts` | **Step 0:** Add userId params to all methods |
| `apps/api/src/services/todo.service.ts` | **Step 0:** Add userId params, normalize error signaling |
| `apps/api/src/services/column.service.ts` | **Step 0:** Add userId params via board ownership |
| `apps/api/src/services/label.service.ts` | **Step 0:** Add userId params if labels are user-scoped |
| `apps/api/src/routes/boards.ts` | **Step 0:** Update to use refactored service methods |
| `apps/api/src/routes/todos.ts` | **Step 0:** Update to use refactored service methods |
| `apps/api/src/routes/columns.ts` | **Step 0:** Update to use refactored service methods |
| `apps/api/src/middleware/auth.ts` | Fix bare catch (Finding 1) — proper error classification |
| `apps/api/package.json` | Add `exports` map for sub-path imports |
| `apps/api/src/lib/origins.ts` | Add `MCP_ORIGIN` to allowed origins + startup warning (Finding 10) |
| `apps/api/src/lib/auth.ts` | Add `AUTH_COOKIE_DOMAIN` env var support in `advanced` config |

## Files to Create (New)

| File | Purpose |
|------|---------|
| `apps/mcp/package.json` | Workspace config with mcp-use, ext-apps, hono deps |
| `apps/mcp/tsconfig.json` | TypeScript config |
| `apps/mcp/vite.config.ts` | Vite build for ext-apps single-file bundles |
| `apps/mcp/vercel.json` | Vercel deployment config |
| `apps/mcp/api/index.ts` | Vercel serverless handler |
| `apps/mcp/src/server.ts` | MCP server setup (shared core) |
| `apps/mcp/src/index.ts` | HTTP/SSE entry (Vercel + local dev) |
| `apps/mcp/src/stdio.ts` | stdio entry (Cursor, Claude Code) |
| `apps/mcp/src/auth/middleware.ts` | Auth bridge middleware |
| `apps/mcp/src/tools/*.ts` | MCP tool definitions (6 files) |
| `apps/mcp/src/widgets/*.tsx` | Widget components (3 files) |
| `apps/mcp/src/ext-app/*` | Unified interactive UI app (App.tsx, main.tsx, index.html, components/) |

---

## Verification

1. **Existing tests pass**: Run `pnpm test` after Step 0 service refactoring — all existing tests must still pass
2. **Local dev (HTTP)**: Run `pnpm --filter mcp dev`, confirm server starts on port 3002
3. **Local dev (stdio)**: Run `pnpm --filter mcp exec tsx src/stdio.ts` and verify MCP protocol on stdin/stdout
4. **Tool test**: Use MCP Inspector (`npx @modelcontextprotocol/inspector`) to connect to `http://localhost:3002/mcp` and verify all 26 tools list, call `list-boards`, `create-board`, `delete-board`
5. **Auth test**: Ensure unauthenticated requests get 401, DB failures get 503, authenticated requests succeed
6. **User scoping test**: Verify User A cannot see User B's boards through MCP tools
7. **Widget test**: Call `get-board` and verify widget HTML is returned with board data
8. **ext-apps test**: Use `basic-host` from ext-apps repo to test interactive board UI
9. **Vercel deploy**: Deploy to Vercel, verify MCP endpoint at `https://inzone-mcp.vercel.app/mcp`
10. **Cross-origin session**: Verify session cookies work across both deployments with custom domains
11. **Cursor/Claude Code test**: Configure stdio transport locally, verify read + write operations
