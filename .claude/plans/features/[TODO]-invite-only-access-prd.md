# PRD: Invite-Only App Access

**Status**: Draft
**Priority**: P1
**Created**: 2026-02-21
**Depends on**: [TODO]-email-password-username-auth-prd.md

## Problem

InZone is currently open to anyone who can authenticate. Since Google's OAuth "Testing" mode only shows a warning (not a hard block) to non-test users, and the upcoming email/password auth has no restrictions, any person can create an account and access the app. We need server-enforced invite-only access.

## Solution

Implement an invite system where:
1. Only users with a valid invite code can sign up (via any auth method)
2. Admins can generate and manage invite codes
3. Existing admin (you) is seeded as the first admin user
4. The app is fully closed to uninvited users at the server level

## Approach Options

### Option A: Lightweight Invite Codes (Recommended)

A simple `Invite` model with unique codes. Users must provide an invite code during sign-up. No Better Auth plugin overhead — uses `databaseHooks` to intercept user creation.

**Why this over the Organization plugin**: The Organization plugin is designed for multi-tenant apps with teams, roles, and org-scoped resources. InZone is a single-tenant personal productivity app — the Organization plugin adds significant schema and complexity for a feature that can be solved with a single table and a hook.

### Option B: Better Auth Admin Plugin + Allowlist

Use the `admin` plugin for roles (admin/user) and maintain an email allowlist. Admins can add emails to the allowlist. Simpler than invite codes but less flexible (requires knowing the email upfront).

### Option C: Better Auth Organization Plugin

Full org/invite system. Overkill for current needs — designed for multi-tenant SaaS. Would require significant schema additions (Organization, Member, Invitation, Team tables).

## Technical Design (Option A)

### Database Schema

```prisma
model Invite {
  id          String    @id @default(cuid())
  code        String    @unique
  email       String?                        // optional: lock invite to specific email
  usedBy      String?                        // userId who redeemed it
  usedAt      DateTime?
  createdBy   String                         // admin userId who created it
  expiresAt   DateTime?                      // optional expiry
  maxUses     Int       @default(1)          // how many times it can be used
  useCount    Int       @default(0)
  createdAt   DateTime  @default(now())

  @@map("invite")
}
```

Add `role` field to User model (or use Better Auth's admin plugin for this):
```prisma
model User {
  // ... existing fields
  role        String    @default("user")     // "admin" or "user"
}
```

### Backend: Block Uninvited Sign-Ups

**`apps/api/src/lib/auth.ts`** — Use Better Auth's `databaseHooks` to intercept user creation:

```typescript
databaseHooks: {
  user: {
    create: {
      before: async (user, ctx) => {
        // Allow the seeded admin (first user) through
        // Check if an invite exists for this email
        const invite = await prisma.invite.findFirst({
          where: {
            OR: [
              { email: user.email, usedBy: null },          // email-specific invite
              { email: null, useCount: { lt: prisma.invite.fields.maxUses } }, // open invite
            ],
            expiresAt: { gte: new Date() },  // not expired (or null = no expiry)
          },
        });

        if (!invite) {
          // Check request context for invite code
          // The invite code comes from a custom field in the sign-up request
          const inviteCode = ctx?.request?.headers?.get('x-invite-code')
            || ctx?.body?.inviteCode;

          if (!inviteCode) {
            throw new Error('INVITE_REQUIRED');
          }

          const codeInvite = await prisma.invite.findUnique({
            where: { code: inviteCode },
          });

          if (!codeInvite || codeInvite.useCount >= codeInvite.maxUses) {
            throw new Error('INVALID_INVITE_CODE');
          }

          if (codeInvite.expiresAt && codeInvite.expiresAt < new Date()) {
            throw new Error('INVITE_EXPIRED');
          }

          if (codeInvite.email && codeInvite.email !== user.email) {
            throw new Error('INVITE_EMAIL_MISMATCH');
          }

          // Mark invite as used
          await prisma.invite.update({
            where: { id: codeInvite.id },
            data: { usedBy: user.id, usedAt: new Date(), useCount: { increment: 1 } },
          });
        } else {
          // Auto-matched by email — mark as used
          await prisma.invite.update({
            where: { id: invite.id },
            data: { usedBy: user.id, usedAt: new Date(), useCount: { increment: 1 } },
          });
        }

        return { data: user };
      },
    },
  },
},
```

### Backend: Admin Invite Management API

New route: `apps/api/src/routes/invites.ts`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `POST /api/invites` | POST | Admin | Create invite (optional: email, maxUses, expiresAt) |
| `GET /api/invites` | GET | Admin | List all invites with usage stats |
| `DELETE /api/invites/:id` | DELETE | Admin | Revoke an invite |

```typescript
// POST /api/invites
// Body: { email?: string, maxUses?: number, expiresInDays?: number }
// Returns: { code: "abc123", inviteUrl: "https://app.com/signup?invite=abc123" }
```

Invite codes should be short, URL-safe strings (e.g., `nanoid(12)`).

### Frontend: Sign-Up with Invite Code

**Integration with the email/password/username auth PRD:**

The sign-up form (from the companion PRD) adds an **Invite Code** field:

```
┌─────────────────────────────────┐
│     Continue with Google        │  ← passes invite code via state param
├─────────── or ──────────────────┤
│  [Sign In]  [Sign Up]          │
│                                 │
│  Invite Code *                  │  ← required for sign-up
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│  Name *                         │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│  Email *                        │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│  Username (optional)            │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│  Password *                     │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  [Create Account]               │
└─────────────────────────────────┘
```

**Invite link flow**: When a user visits `/signup?invite=abc123`, the invite code field is pre-filled and read-only. This allows sharing invite links directly.

**Google OAuth with invite code**: The invite code is passed via the `state` parameter or stored in a cookie before redirect. On callback, the `databaseHooks.user.create.before` hook reads it from the cookie/header.

**Sign-in page**: No invite code needed — only sign-up requires it. The sign-in tab works normally for existing users.

### Frontend: Admin Invite Management

Add an admin section (accessible only to users with `role: "admin"`):

- **Generate Invite** button — creates a new invite code, shows it + a copyable link
- **Invite List** — table of all invites with: code, email (if scoped), created date, used by, status
- **Revoke** button per invite

This can be a simple page at `/admin/invites` or a section within a settings page.

### Seed Script

Update the database seed to:
1. Create the first admin user (you) with `role: "admin"`
2. Optionally create a few initial invite codes

```typescript
// prisma/seed.ts addition
const adminUser = await prisma.user.upsert({
  where: { email: 'sarth.chawla@gmail.com' },
  update: { role: 'admin' },
  create: { /* ... */ role: 'admin' },
});
```

## How Invite Codes Interact with Each Auth Method

| Auth Method | Invite Code Flow |
|-------------|-----------------|
| **Email/Password Sign-Up** | Invite code submitted as form field, validated in `databaseHooks.user.create.before` |
| **Username Sign-Up** | Same as email — invite code is a separate field, not tied to auth method |
| **Google OAuth (new user)** | Invite code stored in cookie before redirect. Hook reads cookie on user creation |
| **Google OAuth (existing user)** | No invite needed — user already exists, just creates a new session |
| **Sign-In (all methods)** | No invite needed — user already has an account |

## Security Considerations

- Invite validation happens server-side in `databaseHooks.user.create.before` — cannot be bypassed
- Invite codes are single-use by default (`maxUses: 1`)
- Optional expiry dates prevent stale invites from being used
- Email-scoped invites prevent code sharing (only the intended recipient can use them)
- Admin endpoints require `role: "admin"` check in middleware
- Rate limiting on sign-up already applies (`/api/auth/sign-up/*`: 3 per 60s)

## Files to Create/Modify

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add `Invite` model, add `role` field to User |
| `apps/api/src/lib/auth.ts` | Add invite validation in `databaseHooks.user.create.before` |
| `apps/api/src/routes/invites.ts` | New admin invite management routes |
| `apps/api/src/middleware/admin.ts` | New middleware to check `role: "admin"` |
| `apps/api/src/app.ts` | Register invite routes |
| `apps/api/prisma/seed.ts` | Seed admin user and initial invites |
| `apps/web/src/pages/LoginPage.tsx` | Add invite code field to sign-up form |
| `apps/web/src/pages/AdminInvitesPage.tsx` | New admin page for invite management |

## Migration Steps

1. Add `Invite` model and `role` field to Prisma schema
2. Run migration
3. Update seed script with admin user
4. Implement invite validation hook in `auth.ts`
5. Create invite management API routes
6. Update sign-up UI with invite code field
7. Build admin invite management page
8. Seed the database and test all auth flows with invite codes

## Acceptance Criteria

- [ ] Sign-up (all methods) requires a valid invite code
- [ ] Sign-in works without an invite code for existing users
- [ ] Invite codes are single-use by default
- [ ] Email-scoped invites only work for the intended email
- [ ] Expired invites are rejected
- [ ] Admins can create, list, and revoke invites
- [ ] Invite links (`/signup?invite=CODE`) pre-fill the code field
- [ ] Google OAuth sign-up validates invite code via cookie/state
- [ ] First user (sarth.chawla@gmail.com) is seeded as admin
- [ ] Non-admin users cannot access invite management endpoints
- [ ] Clear error messages for: missing invite, invalid code, expired code, email mismatch
