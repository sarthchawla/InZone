# Authentication & Authorization Plan — Better Auth + Google OAuth

## Context

InZone is a Kanban board app with no auth. Before cloud deployment, we need multi-user support so each user sees only their own boards/tasks. We're using **Better Auth** — a self-hosted, TypeScript-first auth library with Prisma adapter and Google OAuth support.

---

## Phase 1: Install Dependencies & Environment Setup

### 1.1 Install `better-auth`
```bash
pnpm --filter api add better-auth
pnpm --filter web add better-auth
```

### 1.2 Environment Variables

**`apps/api/.env`** — add:
```env
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
CORS_ORIGIN=http://localhost:5173
```

**`apps/web/.env`** — add:
```env
VITE_API_URL=http://localhost:3001
```

Google OAuth callback URL to register: `http://localhost:3001/api/auth/callback/google`

---

## Phase 2: Database Schema Changes

**File:** `apps/api/prisma/schema.prisma`

### 2.1 Add Better Auth tables (User, Session, Account, Verification)

```prisma
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]
  boards        Board[]
  @@map("user")
}

model Session {
  id        String   @id
  token     String   @unique
  userId    String
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("session")
}

model Account {
  id                    String    @id
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@map("verification")
}
```

### 2.2 Add `userId` FK to Board model

```prisma
model Board {
  ...existing fields...
  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

### 2.3 Run migration
```bash
cd apps/api
pnpm prisma migrate dev --name add_auth_tables_and_board_userid
pnpm prisma generate
```

Since there's no production data, we can add `userId` as NOT NULL directly. After migration, run `pnpm db:reset` to start clean.

**Labels and Templates**: Kept global (no userId). Labels are shared tags, templates are built-in. No change needed.

---

## Phase 3: Backend — Better Auth Server Setup

### 3.1 Create auth config
**New file:** `apps/api/src/lib/auth.ts`

- Initialize `betterAuth()` with Prisma adapter (reusing existing `prisma` singleton from `apps/api/src/lib/prisma.ts`)
- Configure Google social provider
- Session settings: 7-day expiry, daily refresh, 5-min cookie cache

### 3.2 Create auth middleware
**New file:** `apps/api/src/middleware/auth.ts`

- `requireAuth` middleware that calls `auth.api.getSession()` with `fromNodeHeaders()`
- Attaches `req.user` (id, name, email, image) for downstream handlers
- Returns 401 JSON if no valid session
- Extends Express `Request` type globally

### 3.3 Update Express entry point
**Modify:** `apps/api/src/index.ts`

Critical changes:
1. Mount `toNodeHandler(auth)` at `/api/auth/*` **BEFORE** `express.json()` (Better Auth needs raw bodies)
2. Update `cors()` to `cors({ origin: process.env.CORS_ORIGIN, credentials: true })` (required for cookies)
3. Apply `requireAuth` middleware to all protected route groups (`/api/boards`, `/api/columns`, `/api/todos`, `/api/templates`, `/api/labels`)
4. Health check remains public

---

## Phase 4: Backend — Data Scoping by User

### 4.1 Board routes (`apps/api/src/routes/boards.ts`)
- `GET /` — add `where: { userId: req.user!.id }` to `findMany`
- `POST /` — add `userId: req.user!.id` to `create` data
- `GET /:id` — change `findUnique` to `findFirst` with `{ id, userId: req.user!.id }`
- `PUT /:id` — verify ownership before update (fetch board, check userId)
- `DELETE /:id` — verify ownership before delete
- `POST /:id/duplicate` — verify source ownership, assign new board to user
- `POST /:boardId/columns` — verify board ownership before creating column

### 4.2 Column routes (`apps/api/src/routes/columns.ts`)
- All mutations: fetch column with `include: { board: { select: { userId: true } } }`, verify `board.userId === req.user!.id`

### 4.3 Todo routes (`apps/api/src/routes/todos.ts`)
- All operations: verify ownership through column → board chain
- For queries: add `column: { board: { userId: req.user!.id } }` to where clause

### 4.4 Labels & Templates — no changes (global resources)

---

## Phase 5: Frontend Auth

### 5.1 Auth client
**New file:** `apps/web/src/lib/auth-client.ts`
- `createAuthClient()` — baseURL can be empty since Vite proxy at `/api` already forwards to backend

### 5.2 Update Axios client
**Modify:** `apps/web/src/api/client.ts`
- Add `withCredentials: true` to Axios instance (sends session cookies)
- Add 401 response interceptor to redirect to `/login`

### 5.3 Login page
**New file:** `apps/web/src/pages/LoginPage.tsx`
- Google OAuth button calling `signIn.social({ provider: 'google', callbackURL: '/' })`
- Clean, centered card layout using existing Tailwind styles

### 5.4 Auth guard
**New file:** `apps/web/src/contexts/AuthContext.tsx`
- `AuthGuard` component using Better Auth's `useSession()` hook
- Shows loading spinner while session is pending
- Renders `LoginPage` if no session
- Renders children if authenticated

### 5.5 Update App.tsx
**Modify:** `apps/web/src/App.tsx`
- Wrap main content in `AuthGuard`
- Add `/login` route
- Add `UserMenu` component in header (avatar, name, sign-out button)

### 5.6 Update types
**Modify:** `apps/web/src/types/index.ts`
- Add `userId: string` to `Board` interface

---

## Files Summary

### New Files (7)
| File | Purpose |
|------|---------|
| `apps/api/src/lib/auth.ts` | Better Auth server config with Prisma adapter + Google OAuth |
| `apps/api/src/middleware/auth.ts` | `requireAuth` Express middleware |
| `apps/web/src/lib/auth-client.ts` | Better Auth React client |
| `apps/web/src/pages/LoginPage.tsx` | Google OAuth login page |
| `apps/web/src/contexts/AuthContext.tsx` | AuthGuard wrapper component |
| `apps/api/.env` | Backend env vars (update existing) |
| `apps/web/.env` | Frontend env vars (update existing) |

### Modified Files (6)
| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add 4 auth models + userId on Board |
| `apps/api/src/index.ts` | Mount auth handler, CORS credentials, requireAuth middleware |
| `apps/api/src/routes/boards.ts` | userId scoping on all queries/mutations |
| `apps/api/src/routes/columns.ts` | Board ownership verification |
| `apps/api/src/routes/todos.ts` | Board ownership verification through chain |
| `apps/web/src/api/client.ts` | `withCredentials: true` + 401 redirect |
| `apps/web/src/App.tsx` | AuthGuard, UserMenu, /login route |
| `apps/web/src/types/index.ts` | Add userId to Board type |

---

## Verification

1. **Start the app**: `pnpm dev` from root
2. **Visit** `http://localhost:5173` — should redirect to login page
3. **Click "Continue with Google"** — should redirect to Google OAuth, then back to board list
4. **Create a board** — should be owned by your user
5. **Check DB**: `SELECT * FROM "user";` should show your Google account
6. **Check DB**: `SELECT id, name, "userId" FROM boards;` should have your userId
7. **Sign out** — should return to login page
8. **API without session**: `curl http://localhost:3001/api/boards` should return 401
9. **Health check**: `curl http://localhost:3001/health` should still return 200

---

## Key Technical Notes

- Better Auth's `toNodeHandler` **must** be mounted before `express.json()` or auth endpoints will hang
- CORS must use explicit origin (not `*`) when `credentials: true`
- Vite proxy at `/api` already covers `/api/auth/*` — no proxy changes needed
- Session is cookie-based (`better-auth.session_token`), httpOnly, secure in production
- Existing tests will need `req.user` mocked — update after main implementation
