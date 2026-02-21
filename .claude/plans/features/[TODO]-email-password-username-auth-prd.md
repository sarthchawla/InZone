# PRD: Enable Email/Password & Username Sign-In/Sign-Up

**Status**: Draft
**Priority**: P1
**Created**: 2026-02-21

## Problem

InZone currently only supports Google OAuth for authentication. This has limitations:
1. Users without Google accounts cannot use the app
2. Users who prefer not to use social login have no alternative
3. Vercel preview deployments can't use Google OAuth (dynamic URLs can't be pre-registered in Google Console) — email/password and username auth solve this as a side benefit

## Solution

Enable Better Auth's email/password authentication and the username plugin, giving users three ways to authenticate:
1. **Google OAuth** (existing)
2. **Email + Password** (new)
3. **Username + Password** (new)

## Technical Design

### Backend Changes

**`apps/api/src/lib/auth.ts`**:

```typescript
import { username } from 'better-auth/plugins/username';

export const auth = betterAuth({
  // ... existing config
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
});
```

**Better Auth provides these endpoints automatically:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/sign-up/email` | POST | Sign up with email + password + name |
| `/api/auth/sign-in/email` | POST | Sign in with email + password |
| `/api/auth/sign-in/username` | POST | Sign in with username + password (via plugin) |
| `/api/auth/is-username-available` | POST | Check username availability |

### Database Schema

The username plugin adds two fields to the `User` model. Add a Prisma migration:

```prisma
model User {
  // ... existing fields
  username        String?   @unique
  displayUsername String?
}
```

### Frontend Changes

**`apps/web/src/lib/auth-client.ts`**:
```typescript
import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

**Login page (`apps/web/src/pages/LoginPage.tsx` or equivalent)**:

The login page should support two modes with a tab or toggle:
- **Sign In** — email/username + password
- **Sign Up** — name + email + username (optional) + password

Layout:
```
┌─────────────────────────────────┐
│     Continue with Google        │  ← existing OAuth button
├─────────── or ──────────────────┤
│  [Sign In]  [Sign Up]          │  ← tab toggle
│                                 │
│  Email or Username              │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│  Password                       │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  [Sign In]                      │
└─────────────────────────────────┘
```

Sign-up form adds: Name, Email, Username (optional), Password, Confirm Password.

**Sign-in logic**:
- If input contains `@`, use `signIn.email({ email, password })`
- Otherwise, use `signIn.username({ username, password })`

### Rate Limiting

Already configured in `auth.ts`:
```typescript
rateLimit: {
  customRules: {
    '/api/auth/sign-in/*': { window: 60, max: 5 },
    '/api/auth/sign-up/*': { window: 60, max: 3 },
  },
},
```

These rules automatically apply to the new email and username endpoints.

## Security Considerations

- Better Auth handles password hashing (bcrypt) internally
- Minimum password length of 8 characters enforced server-side
- Username normalization (lowercase) enabled by default to prevent lookalike attacks
- Rate limiting already covers all sign-in/sign-up routes
- Secure cookies already enabled in production (`useSecureCookies: process.env.NODE_ENV === 'production'`)
- Account linking is enabled — users who sign up with email can later link their Google account (and vice versa)

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/lib/auth.ts` | Enable `emailAndPassword`, add `username` plugin |
| `apps/api/prisma/schema.prisma` | Add `username` and `displayUsername` fields to User model |
| `apps/web/src/lib/auth-client.ts` | Add `usernameClient` plugin |
| `apps/web/src/pages/LoginPage.tsx` | Add email/password + username sign-in/sign-up forms |

## Migration Steps

1. Update Prisma schema with new User fields
2. Run `pnpm --filter api db:migrate:dev` to generate migration
3. Update backend auth config
4. Update frontend auth client
5. Build login page UI
6. Remove `VITE_AUTH_BYPASS` from all environments

## Acceptance Criteria

- [ ] Users can sign up with email + password
- [ ] Users can sign up with an optional username
- [ ] Users can sign in with email + password
- [ ] Users can sign in with username + password
- [ ] Username availability check works in real-time on the sign-up form
- [ ] Google OAuth continues to work alongside email/password auth
- [ ] Account linking works (email user can link Google, Google user can set a password)
- [ ] Rate limiting applies to all new auth endpoints
- [ ] Login page shows all auth options (Google, email, username)
- [ ] Password validation (min 8 chars) with clear error messages
