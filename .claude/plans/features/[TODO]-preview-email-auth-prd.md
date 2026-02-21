# PRD: Email/Password Auth for Preview Deployments

**Status**: Draft
**Priority**: P1
**Created**: 2026-02-21

## Problem

The InZone repo is public. Vercel preview deployments generate dynamic URLs that can't be pre-registered in Google OAuth Console. This means Google social login doesn't work on preview deployments.

We need an alternative authentication method for preview environments so that:
1. Reviewers can test the full app on preview deployments
2. No auth bypass is needed (the repo is public, so `VITE_AUTH_BYPASS=true` would be a security concern)
3. Google OAuth remains the primary auth method for production

## Solution

Enable Better Auth's email/password authentication, scoped to preview environments only.

### Approach

1. **Enable `emailAndPassword` in Better Auth config** — currently set to `{ enabled: false }` in `apps/api/src/lib/auth.ts:22`
2. **Make it environment-conditional** — only enable email/password when `ENABLE_EMAIL_AUTH=true` env var is set
3. **Add sign-up/sign-in UI for email/password** on the frontend login page, shown conditionally
4. **Set `ENABLE_EMAIL_AUTH=true`** as a Vercel environment variable scoped to "Preview" only
5. **Remove `VITE_AUTH_BYPASS`** from preview environments (no longer needed)

### Why Not Just Use Auth Bypass?

- The repo is public — anyone can see `VITE_AUTH_BYPASS=true` in CI workflows
- Auth bypass skips all session/cookie logic, so it doesn't test the real auth flow
- Email/password auth exercises the full Better Auth pipeline (session creation, cookies, middleware)

## Technical Design

### Backend Changes

**`apps/api/src/lib/auth.ts`**:
```typescript
emailAndPassword: {
  enabled: process.env.ENABLE_EMAIL_AUTH === 'true',
  minPasswordLength: 8,
},
```

### Frontend Changes

**`apps/web/src/components/LoginPage.tsx`** (or equivalent):
- Detect if email auth is available (call Better Auth's config endpoint or use a `VITE_ENABLE_EMAIL_AUTH` env var)
- If enabled, show email/password sign-up and sign-in forms below the Google OAuth button
- Keep Google OAuth as the primary/prominent option
- Email auth section should have a visual separator (e.g., "— or sign in with email —")

**`apps/web/src/lib/auth-client.ts`**:
- Export `signUp.email` and `signIn.email` methods from the auth client (already available from Better Auth, just not used)

### Environment Variables

| Variable | Scope | Value | Purpose |
|----------|-------|-------|---------|
| `ENABLE_EMAIL_AUTH` | Vercel Preview only | `true` | Enables email/password auth on backend |
| `VITE_ENABLE_EMAIL_AUTH` | Vercel Preview only | `true` | Shows email auth UI on frontend |

### Vercel Configuration

In Vercel Dashboard → Project Settings → Environment Variables:
- Add `ENABLE_EMAIL_AUTH=true` with scope "Preview"
- Add `VITE_ENABLE_EMAIL_AUTH=true` with scope "Preview"
- Remove `VITE_AUTH_BYPASS=true` from Preview scope (if set)

## Security Considerations

- Email/password is only enabled when explicitly opted in via env var
- Production deployments will NOT have `ENABLE_EMAIL_AUTH` set, so email auth stays disabled
- Password minimum length of 8 characters
- Better Auth handles password hashing (bcrypt) and secure session management
- Rate limiting already configured for `/api/auth/sign-in/*` and `/api/auth/sign-up/*`

## Out of Scope

- Email verification (not needed for preview testing)
- Password reset flow (not needed for preview testing)
- Migrating production auth away from Google OAuth

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/lib/auth.ts` | Conditionally enable `emailAndPassword` |
| `apps/web/src/pages/LoginPage.tsx` | Add email/password form (conditional) |
| `apps/web/src/lib/auth-client.ts` | Export email auth methods |
| Vercel Dashboard | Add env vars scoped to Preview |

## Acceptance Criteria

- [ ] Email/password sign-up works on preview deployments
- [ ] Email/password sign-in works on preview deployments
- [ ] Google OAuth remains the only auth option on production
- [ ] Login page shows both options on preview, only Google on production
- [ ] `VITE_AUTH_BYPASS` is removed from preview environments
- [ ] Rate limiting applies to email auth endpoints
