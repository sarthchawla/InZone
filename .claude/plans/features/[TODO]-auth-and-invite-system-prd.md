# PRD: Authentication & Invite-Only Access System

**Status**: Draft
**Priority**: P1
**Created**: 2026-02-22
**Replaces**: `[TODO]-email-password-username-auth-prd.md`, `[TODO]-invite-only-access-prd.md`

## Problem

InZone currently only supports Google OAuth with no access control. Anyone who completes Google sign-in can access the app. We need:
1. Email/password and username auth options (Google OAuth alone is limiting)
2. Invite-only access — no one can sign up without admin approval
3. Two user roles: **admin** (can manage users and invites) and **user** (regular access)

## Solution Overview

- **Better Auth admin plugin** for roles (`admin`/`user`), user management
- **Better Auth username plugin** for optional username sign-in
- **Two ways to get access**:
  1. **Admin-initiated invite** — admin generates a link, copy-pastes it to the person
  2. **User-initiated request** — user submits interest on a public page, admin approves, user can then sign up
- **Password reset via security questions** (no email dependency)
- **No email service required** — Resend integration deferred to a future PRD

## User Flow Diagrams

### Flow 1: First Admin Bootstrap

The very first user to sign up. No invite or approval needed — matched by `ADMIN_EMAIL` env var.

```
┌──────────────┐
│  Admin opens  │
│  /signup or   │
│  /login       │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│ Sign up via           │     │ Sign up via           │
│ email/password form   │     │ "Continue with Google" │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           ▼                            ▼
    ┌──────────────────────────────────────────┐
    │         databaseHooks.user.create.before │
    │                                          │
    │  1. user.email === ADMIN_EMAIL?          │
    │  2. No existing admin in DB?             │
    │                                          │
    │  Both YES → set role: 'admin' → allow    │
    └──────────────────┬───────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Admin account  │
              │  created with   │
              │  role: 'admin'  │
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  Redirected to  │
              │  app dashboard  │
              └────────────────┘
```

---

### Flow 2: Admin Creates Invite → User Signs Up (Email/Password)

```
 ADMIN SIDE                                    USER SIDE
 ──────────                                    ─────────

┌──────────────────┐
│ Admin goes to     │
│ /admin/invites    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enters email +    │
│ selects role      │
│ → clicks "Create" │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Server creates    │
│ Invite record     │
│ (nanoid(32) token,│
│  7-day expiry)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Invite link shown │
│ on screen         │
│ [Copy Link]       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Admin copies link │
│ and sends it to   │
│ user manually     │─────────────────────────┐
│ (chat, text, etc.)│                          │
└──────────────────┘                          ▼
                                    ┌──────────────────┐
                                    │ User clicks link   │
                                    │ /signup?token=xxx  │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────────┐
                                    │ GET /api/invites/     │
                                    │ validate?token=xxx    │
                                    │                       │
                                    │ Returns { valid, email}│
                                    └────────┬─────────────┘
                                             │
                                             ▼
                                    ┌──────────────────────┐
                                    │ Sign-up form shown    │
                                    │ • Email pre-filled    │
                                    │   (read-only)         │
                                    │ • Name, Username      │
                                    │ • Password + Confirm  │
                                    │ • 3 Security Questions│
                                    └────────┬─────────────┘
                                             │
                                             ▼
                                    ┌──────────────────────┐
                                    │ User fills form →     │
                                    │ clicks "Create Account"│
                                    └────────┬─────────────┘
                                             │
                                             ▼
                                    ┌──────────────────────┐
                                    │ hooks.before:         │
                                    │ 1. Validate password  │
                                    │    strength           │
                                    │ 2. Validate invite    │
                                    │    token (email match, │
                                    │    not expired, pending)│
                                    │ 3. Store inviteId +   │
                                    │    inviteRole in ctx  │
                                    └────────┬─────────────┘
                                             │
                                             ▼
                                    ┌──────────────────────┐
                                    │ databaseHooks:        │
                                    │ 1. Not first admin    │
                                    │ 2. Found inviteId     │
                                    │    in ctx → mark      │
                                    │    invite 'accepted'  │
                                    │ 3. Set role from      │
                                    │    invite             │
                                    └────────┬─────────────┘
                                             │
                                             ▼
                                    ┌──────────────────────┐
                                    │ POST /api/security-   │
                                    │ questions/setup       │
                                    │ (3 Q&A pairs, bcrypt  │
                                    │  hashed answers)      │
                                    └────────┬─────────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ Account created!  │
                                    │ Redirected to app │
                                    └──────────────────┘
```

---

### Flow 3: Admin Creates Invite → User Signs Up (Google OAuth)

```
 ADMIN SIDE                                    USER SIDE
 ──────────                                    ─────────

  (Same as Flow 2 — admin creates
   invite and sends link manually)
         │
         └─────────────────────────────────────┐
                                               ▼
                                     ┌──────────────────┐
                                     │ User clicks link   │
                                     │ /signup?token=xxx  │
                                     └────────┬─────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ Token validated via   │
                                     │ GET /api/invites/     │
                                     │ validate              │
                                     └────────┬─────────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ User clicks           │
                                     │ "Continue with Google" │
                                     └────────┬─────────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ Frontend calls        │
                                     │ POST /api/invites/    │
                                     │ set-token             │
                                     │                       │
                                     │ Server sets httpOnly   │
                                     │ cookie:               │
                                     │ __invite_token=xxx    │
                                     │ (10 min, secure, lax) │
                                     └────────┬─────────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ Google OAuth redirect  │
                                     │ → Google consent       │
                                     │ → callback to server   │
                                     └────────┬─────────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ hooks.before          │
                                     │ (callback path):      │
                                     │ Reads __invite_token  │
                                     │ from cookie → stores  │
                                     │ in ctx.context        │
                                     └────────┬─────────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ databaseHooks:        │
                                     │ 1. New user (Google)  │
                                     │ 2. Found oauth invite │
                                     │    token in ctx       │
                                     │ 3. Validate: email    │
                                     │    match, not expired, │
                                     │    pending            │
                                     │ 4. Mark 'accepted'    │
                                     │ 5. Set role from      │
                                     │    invite             │
                                     └────────┬─────────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ Account created!       │
                                     │ Redirect to /setup-    │
                                     │ security-questions     │
                                     │ (required before       │
                                     │  using the app)        │
                                     └────────┬─────────────┘
                                              │
                                              ▼
                                     ┌──────────────────────┐
                                     │ User sets up 3         │
                                     │ security questions     │
                                     │ → redirected to app    │
                                     └──────────────────────┘
```

---

### Flow 4: User Requests Access → Admin Approves → User Signs Up

```
 USER SIDE                                     ADMIN SIDE
 ─────────                                     ──────────

┌──────────────────┐
│ User visits        │
│ /request-access    │
│ (from login page   │
│  or direct link)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Fills in:             │
│ • Name *              │
│ • Email *             │
│ • Reason (optional)   │
│   "helps admin approve│
│    faster"            │
│                       │
│ → clicks "Submit"     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ POST /api/access-     │
│ requests              │
│                       │
│ Checks:               │
│ • Email not already   │
│   registered          │
│ • No pending request  │
│   for this email      │
│                       │
│ Creates AccessRequest │
│ status: 'pending'     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ "Your request has     │
│  been submitted.      │
│  Once approved, come  │
│  back and sign up."   │
└──────────────────────┘

         ┌─────── (time passes) ───────┐
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │ Admin visits           │
                              │ /admin/requests        │
                              └────────┬─────────────┘
                                       │
                                       ▼
                              ┌──────────────────────┐
                              │ Sees pending requests: │
                              │ • Name, email, reason  │
                              │ • Role selector        │
                              │ • [Approve] [Reject]   │
                              └────────┬─────────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                              ▼                 ▼
                     ┌──────────────┐  ┌──────────────┐
                     │   Approve     │  │   Reject      │
                     │   Sets:       │  │   Sets:       │
                     │   status:     │  │   status:     │
                     │   'approved'  │  │   'rejected'  │
                     │   reviewedBy  │  │   reviewedBy  │
                     │   reviewedAt  │  │   reviewedAt  │
                     │   role        │  │               │
                     └──────┬───────┘  └──────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ Admin tells user  │
                   │ manually (for now)│
                   │ "You're approved" │
                   └──────────────────┘

         ┌─────── (user is notified) ──┐
         │
         ▼
┌──────────────────┐
│ User visits /signup│
│ (no token needed) │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Fills in:             │
│ • Email (editable)    │
│ • Name, Username      │
│ • Password + Confirm  │
│ • 3 Security Questions│
│                       │
│ OR clicks "Continue   │
│ with Google"          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ databaseHooks:        │
│ 1. Not first admin    │
│ 2. No invite token    │
│ 3. Check approved     │
│    AccessRequest for  │
│    this email → FOUND │
│ 4. Set role from      │
│    approved request   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────┐
│ Account created!  │
│ Redirected to app │
└──────────────────┘
```

---

### Flow 5: Existing User Sign-In (Email/Password or Username)

```
┌──────────────────┐
│ User visits /login│
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Enters:               │
│ • Email or Username   │
│ • Password            │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Input contains "@"?   │
│                       │
│ YES → signIn.email()  │
│ NO  → signIn.username()│
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Better Auth validates: │
│ • Credentials match?  │
│ • User banned?        │
│ • Rate limit OK?      │
└────────┬─────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Success    Failure
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│Redirect│ │Show error:    │
│to app  │ │"Invalid       │
│dashboard│ │credentials"  │
└────────┘ └──────────────┘
```

---

### Flow 6: Existing User Sign-In (Google OAuth)

```
┌──────────────────┐
│ User visits /login│
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Clicks "Continue      │
│ with Google"          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Google OAuth redirect  │
│ → consent → callback  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────┐
│ User already in database? │
│                           │
│ YES → Create session      │
│       → redirect to app   │
│                           │
│ NO  → databaseHooks fires │
│       → no invite token   │
│       → no approved       │
│         request           │
│       → BLOCKED           │
└───────┬──────┬────────────┘
        │      │
        ▼      ▼
   ┌────────┐ ┌──────────────────────┐
   │Redirect│ │Error shown on frontend│
   │to app  │ │"You need an invite or │
   │        │ │ approved access       │
   │        │ │ request to create an  │
   │        │ │ account."             │
   └────────┘ │                       │
              │[Request Access] link  │
              └──────────────────────┘
```

---

### Flow 7: Password Reset via Security Questions

```
┌──────────────────┐
│ User clicks        │
│ "Forgot password?" │
│ on /login          │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Step 1: Identify      │
│                       │
│ Enter email or        │
│ username              │
│ → [Continue]          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────┐
│ POST /api/security-questions/ │
│ questions                     │
│                               │
│ Body: { identifier }          │
│                               │
│ User found?                   │
│ YES → return their 3 questions│
│ NO  → return 3 fake questions │
│       (prevents enumeration)  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Step 2: Answer Questions  │
│                           │
│ Shows 3 security questions│
│ User types answers        │
│ → [Verify]                │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ POST /api/security-questions/ │
│ verify                        │
│                               │
│ Body: { identifier, answers[] }│
│                               │
│ Normalize answers:            │
│   answer.trim().toLowerCase() │
│ Compare bcrypt hashes         │
│ All 3 must match              │
└────────┬─────────────────────┘
         │
    ┌────┴────────┐
    │             │
    ▼             ▼
 All correct    Any wrong
    │             │
    ▼             ▼
┌──────────┐  ┌──────────────────────┐
│ Returns   │  │ "Incorrect answers"   │
│ short-    │  │ (generic error)       │
│ lived     │  │                       │
│ reset     │  │ After 3 failures:     │
│ token     │  │ locked for 1 hour     │
│ (15 min)  │  └──────────────────────┘
└────┬─────┘
     │
     ▼
┌──────────────────────────┐
│ Step 3: Set New Password  │
│                           │
│ New password              │
│ (strength indicator)      │
│ Confirm password          │
│ → [Reset Password]        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ hooks.before validates        │
│ password strength             │
│                               │
│ Better Auth resets password   │
│ using the reset token         │
│                               │
│ All existing sessions revoked │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────┐
│ "Password reset!  │
│  Please sign in." │
│  → redirect /login│
└──────────────────┘
```

---

### Flow 8: Admin Invite Management (Revoke & Re-Invite)

```
┌──────────────────┐
│ Admin visits       │
│ /admin/invites     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Sees list of all invites: │
│ • Pending (active)        │
│ • Accepted (history)      │
│ • Revoked (history)       │
│ • Expired (history)       │
└────────┬─────────────────┘
         │
    ┌────┴──────────────────────┐
    │                           │
    ▼                           ▼
┌──────────────┐      ┌─────────────────────┐
│ Revoke a      │      │ Re-invite same email │
│ pending invite│      │ (after revoked/      │
│               │      │  expired invite)     │
│ DELETE /api/  │      │                      │
│ invites/:id   │      │ POST /api/invites    │
│               │      │ { email, role }      │
│ Sets status   │      │                      │
│ = 'revoked'   │      │ Creates NEW invite   │
│ (soft delete) │      │ with new token       │
│               │      │ (old one stays in    │
│ Old link      │      │  history)            │
│ stops working │      │                      │
└──────────────┘      │ New link shown →     │
                      │ [Copy Link]          │
                      └─────────────────────┘
```

---

### Flow 9: Admin User Management

```
┌──────────────────┐
│ Admin visits       │
│ /admin/users       │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│ User list with actions:           │
│                                   │
│ For each user (except self):      │
│ ┌───────────────────────────────┐│
│ │ Name | Email | Role | Status  ││
│ │ [Make Admin/User] [Ban] [Remove]│
│ └───────────────────────────────┘│
└────────┬─────────────────────────┘
         │
    ┌────┼────────────┬──────────────┐
    │    │            │              │
    ▼    ▼            ▼              ▼
┌──────┐┌──────┐ ┌────────┐  ┌──────────┐
│Change ││ Ban  │ │ Unban  │  │  Remove   │
│Role   ││      │ │        │  │           │
│       ││Sets  │ │Clears  │  │Permanently│
│admin  ││banned│ │banned  │  │deletes    │
│↔ user ││=true │ │=false  │  │user and   │
│       ││      │ │        │  │all related│
│Uses   ││Uses  │ │Uses    │  │data       │
│Better ││Better│ │Better  │  │           │
│Auth   ││Auth  │ │Auth    │  │Uses Better│
│admin  ││admin │ │admin   │  │Auth admin │
│plugin ││plugin│ │plugin  │  │plugin     │
│setRole││banUser│ │unbanUser│ │removeUser│
└──────┘└──────┘ └────────┘  └──────────┘

Note: Admin cannot ban/remove themselves.
Self row shows "(you)" badge with no action buttons.
```

---

### Flow 10: Complete Sign-Up Decision Tree (Server-Side)

This shows the full server-side logic that decides whether a sign-up is allowed:

```
                    ┌────────────────────┐
                    │  New user sign-up   │
                    │  (any method)       │
                    └────────┬───────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │ databaseHooks.user.create   │
                │ .before fires               │
                └────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ 1. Is user.email ===          │
              │    ADMIN_EMAIL                │
              │    AND no admin exists yet?   │
              └──────┬──────────────┬────────┘
                     │              │
                  YES│              │NO
                     ▼              ▼
          ┌──────────────┐  ┌──────────────────────┐
          │ Allow sign-up │  │ 2. Is there a valid   │
          │ role: 'admin' │  │    invite token?       │
          └──────────────┘  │    (form field OR      │
                            │     httpOnly cookie)   │
                            └──────┬──────────┬─────┘
                                   │          │
                                YES│          │NO
                                   ▼          ▼
                        ┌──────────────┐ ┌──────────────────┐
                        │ Validate:     │ │ 3. Is there an    │
                        │ • email match │ │    approved        │
                        │ • not expired │ │    AccessRequest   │
                        │ • status:     │ │    for this email? │
                        │   pending     │ └──────┬──────┬─────┘
                        └──────┬───────┘        │      │
                               │             YES│      │NO
                               ▼                ▼      ▼
                     ┌──────────────┐ ┌────────────┐ ┌─────────┐
                     │ Mark invite   │ │ Allow       │ │ BLOCK   │
                     │ 'accepted'    │ │ sign-up     │ │ sign-up │
                     │ Allow sign-up │ │ role from   │ │         │
                     │ role from     │ │ approved    │ │ Error:  │
                     │ invite        │ │ request     │ │ "Invite │
                     └──────────────┘ └────────────┘ │ or      │
                                                      │ approval│
                                                      │ required│
                                                      │ "       │
                                                      └─────────┘
```

---

### Flow 11: Security Questions Setup (During Sign-Up)

```
┌──────────────────────────────┐
│ User completes sign-up form   │
│ (email/password or Google)    │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ Security Questions section    │
│ (part of sign-up form for     │
│  email/password; separate     │
│  page for Google OAuth)       │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ User selects 3 different          │
│ questions from predefined pool:   │
│                                   │
│ Q1: [Select a question ▾]        │
│     → types answer                │
│ Q2: [Select a question ▾]        │
│     → types answer                │
│ Q3: [Select a question ▾]        │
│     → types answer                │
│                                   │
│ Validation:                       │
│ • All 3 questions must differ     │
│ • Each answer ≥ 2 characters      │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ POST /api/security-questions/setup│
│                                   │
│ For each Q&A:                     │
│ 1. Normalize: answer.trim()      │
│    .toLowerCase()                 │
│ 2. Hash: bcrypt(normalized)       │
│ 3. Store: SecurityQuestion record │
│    { userId, question, hash,      │
│      order: 1|2|3 }              │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────┐
│ Setup complete →      │
│ redirect to app       │
└──────────────────────┘
```

---

### Flow 12: Update Security Questions (Settings Page)

```
┌──────────────────┐
│ User visits        │
│ /settings          │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Clicks [Update]       │
│ next to "Security     │
│ Questions"            │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Modal / expanded form │
│                       │
│ Enter current password│
│ (required for verify) │
│                       │
│ New Q1 + Answer       │
│ New Q2 + Answer       │
│ New Q3 + Answer       │
│                       │
│ → [Update Questions]  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ POST /api/security-questions/setup│
│ (requires auth + password verify) │
│                                   │
│ Replaces all 3 SecurityQuestion   │
│ records for this user             │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────┐
│ "Security questions   │
│  updated."            │
└──────────────────────┘
```

## User Roles

| Role | Can do |
|------|--------|
| **admin** | Invite users, approve/reject access requests, manage users (ban, remove, change role), all regular user actions |
| **user** | Use the app (boards, todos, etc.) — no admin access |

### First Admin Bootstrapping

The first admin is bootstrapped via an **email-based exemption** in `databaseHooks.user.create.before`. If the user's email matches `ADMIN_EMAIL` env var and no admin user exists yet, the user is created with `role: 'admin'` without needing an invite.

```
ADMIN_EMAIL=sarth.chawla@gmail.com
```

## Two Paths to Sign Up

### Path 1: Admin-Initiated Invite (link-based)

1. Admin goes to `/admin/invites` → enters email + selects role → clicks "Create Invite"
2. System generates invite with unique token → shows the invite link on screen
3. Admin copies the link and sends it to the person manually (chat, text, etc.)
4. Person clicks link → `/signup?token=<TOKEN>` → email pre-filled and read-only → completes sign-up

### Path 2: User-Initiated Request (approval-based)

1. Person visits `/request-access` → fills in name, email, and optional reason
2. System creates an `AccessRequest` record (status: `pending`)
3. Admin sees pending requests in `/admin/requests` → approves or rejects
4. On approval: the email is whitelisted — user can now go to `/signup` and create their account
5. User needs to be told they're approved (manually for now — email notification deferred)

### How the server decides who can sign up

In `databaseHooks.user.create.before`, the check order is:

```
1. Is this the first admin? (ADMIN_EMAIL exemption) → allow, set role: admin
2. Is there a valid invite token? (from form field or httpOnly cookie) → allow, set role from invite
3. Is there an approved AccessRequest for this email? → allow, set role: user
4. None of the above → block sign-up
```

## Technical Design

### Better Auth Plugins

```typescript
// apps/api/src/lib/auth.ts
import { admin } from 'better-auth/plugins/admin';
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
    admin({
      defaultRole: 'user',
    }),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
});
```

### Database Schema Changes

```prisma
// Changes to existing User model (added by admin + username plugins)
model User {
  id              String    @id
  name            String
  email           String    @unique
  emailVerified   Boolean
  image           String?
  createdAt       DateTime
  updatedAt       DateTime
  // Added by admin plugin:
  role            String?
  banned          Boolean?
  banReason       String?
  banExpires      DateTime?
  // Added by username plugin:
  username        String?   @unique
  displayUsername String?

  sessions           Session[]
  accounts           Account[]
  boards             Board[]
  invitesCreated     Invite[]           @relation("InviteCreator")
  securityQuestions  SecurityQuestion[]

  @@map("user")
}

// Session gets: impersonatedBy String? (admin plugin)

// Invite model — for admin-initiated invites
model Invite {
  id          String    @id @default(cuid())
  email       String                          // invite is email-specific
  token       String    @unique               // unique URL-safe token (nanoid(32))
  role        String    @default("user")      // "admin" or "user"
  status      String    @default("pending")   // "pending", "accepted", "expired", "revoked"
  usedAt      DateTime?
  expiresAt   DateTime                        // default: 7 days from creation
  createdBy   String                          // admin userId
  createdAt   DateTime  @default(now())

  creator     User      @relation("InviteCreator", fields: [createdBy], references: [id])

  @@index([email])
  @@index([status])
  @@map("invite")
}

// Access Request model — for user-initiated interest
model AccessRequest {
  id          String    @id @default(cuid())
  email       String
  name        String
  reason      String?                         // optional — "helps admin approve faster"
  status      String    @default("pending")   // "pending", "approved", "rejected"
  role        String    @default("user")      // role to assign on approval (admin sets this)
  reviewedBy  String?                         // admin userId who reviewed
  reviewedAt  DateTime?
  createdAt   DateTime  @default(now())

  @@index([email])
  @@index([status])
  @@map("access_request")
}

// Security Questions — for password reset
model SecurityQuestion {
  id         String   @id @default(cuid())
  userId     String
  question   String                           // selected from predefined pool
  answer     String                           // stored as bcrypt hash
  order      Int                              // 1, 2, or 3
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, order])
  @@map("security_question")
}
```

**Database-level constraints** (add via raw SQL migration):
```sql
ALTER TABLE invite ADD CONSTRAINT invite_role_check CHECK (role IN ('admin', 'user'));
ALTER TABLE access_request ADD CONSTRAINT access_request_role_check CHECK (role IN ('admin', 'user'));
ALTER TABLE access_request ADD CONSTRAINT access_request_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE invite ADD CONSTRAINT invite_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));
```

### Backend: Password Strength Validation

Better Auth only enforces length. We enforce character-class rules in `hooks.before`:

```typescript
// apps/api/src/lib/password-validation.ts
const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, message: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), message: 'At least one uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), message: 'At least one lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), message: 'At least one number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), message: 'At least one special character' },
];

export function validatePasswordStrength(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.message;
  }
  return null;
}
```

### Backend: Block Uninvited Sign-Ups

```typescript
// apps/api/src/lib/auth.ts
import { createAuthMiddleware } from 'better-auth/api';
import { validatePasswordStrength } from './password-validation.js';

hooks: {
  before: createAuthMiddleware(async (ctx) => {
    // Password strength validation on all password-setting paths
    if (['/sign-up/email', '/change-password', '/reset-password'].includes(ctx.path)) {
      const password = ctx.body?.password || ctx.body?.newPassword;
      if (password) {
        const error = validatePasswordStrength(password);
        if (error) {
          throw new APIError('BAD_REQUEST', { message: `Password too weak: ${error}` });
        }
      }
    }

    // Intercept email/password sign-up
    if (ctx.path === '/sign-up/email') {
      const inviteToken = ctx.body?.inviteToken;

      if (inviteToken) {
        // Validate invite token
        const invite = await prisma.invite.findUnique({
          where: { token: inviteToken },
        });

        if (!invite || invite.status !== 'pending') {
          throw new APIError('FORBIDDEN', { message: 'Invalid or already used invite.' });
        }
        if (invite.expiresAt < new Date()) {
          await prisma.invite.update({ where: { id: invite.id }, data: { status: 'expired' } });
          throw new APIError('FORBIDDEN', { message: 'This invite has expired.' });
        }
        if (invite.email.toLowerCase() !== ctx.body?.email?.toLowerCase()) {
          throw new APIError('FORBIDDEN', { message: 'This invite is for a different email address.' });
        }

        ctx.context.inviteId = invite.id;
        ctx.context.inviteRole = invite.role;
      }
      // If no invite token, we'll check for approved access request in databaseHooks
    }

    // Intercept OAuth callback (Google sign-up)
    if (ctx.path.startsWith('/callback/')) {
      const cookies = ctx.request?.headers.get('cookie') || '';
      const inviteToken = cookies
        .split(';')
        .find(c => c.trim().startsWith('__invite_token='))
        ?.split('=')[1]
        ?.trim();

      if (inviteToken) {
        ctx.context.oauthInviteToken = inviteToken;
      }
    }
  }),
},

databaseHooks: {
  user: {
    create: {
      before: async (user, ctx) => {
        // 1. First admin bootstrapping
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase()) {
          const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
          if (!existingAdmin) {
            return { data: { ...user, role: 'admin' } };
          }
        }

        // 2. Invite token (OAuth path — from cookie)
        const oauthInviteToken = ctx?.context?.oauthInviteToken;
        if (oauthInviteToken) {
          const invite = await prisma.invite.findUnique({ where: { token: oauthInviteToken } });

          if (!invite || invite.status !== 'pending') throw new Error('Invalid or already used invite.');
          if (invite.expiresAt < new Date()) {
            await prisma.invite.update({ where: { id: invite.id }, data: { status: 'expired' } });
            throw new Error('This invite has expired.');
          }
          if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
            throw new Error('This invite is for a different email address.');
          }

          await prisma.invite.update({
            where: { id: invite.id },
            data: { status: 'accepted', usedAt: new Date() },
          });
          return { data: { ...user, role: invite.role } };
        }

        // 3. Invite token (email sign-up path — validated in hooks.before)
        const inviteId = ctx?.context?.inviteId;
        const inviteRole = ctx?.context?.inviteRole;
        if (inviteId) {
          await prisma.invite.update({
            where: { id: inviteId },
            data: { status: 'accepted', usedAt: new Date() },
          });
          return { data: { ...user, role: inviteRole || 'user' } };
        }

        // 4. Approved access request
        const approvedRequest = await prisma.accessRequest.findFirst({
          where: {
            email: { equals: user.email, mode: 'insensitive' },
            status: 'approved',
          },
        });
        if (approvedRequest) {
          // Mark request as consumed (update status to prevent re-use)
          await prisma.accessRequest.update({
            where: { id: approvedRequest.id },
            data: { status: 'approved' }, // stays approved — user reference is the User record
          });
          return { data: { ...user, role: approvedRequest.role } };
        }

        // 5. No valid path — block
        throw new Error('An invite or approved access request is required to sign up.');
      },
    },
  },
},
```

### Backend: Security Questions

**Predefined question pool** (user picks 3 during sign-up):
1. What was the name of your first pet?
2. In what city were you born?
3. What was the name of your first school?
4. What is your mother's maiden name?
5. What was the make of your first car?
6. What is the name of the street you grew up on?
7. What was your childhood nickname?
8. What is your favorite book?

**Answer handling**:
- Answers normalized before hashing: `answer.trim().toLowerCase()`
- Stored as bcrypt hashes — never plaintext
- All 3 must be correct for reset (all-or-nothing)

**API routes** (`apps/api/src/routes/security-questions.ts`):

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `POST /api/security-questions/setup` | POST | Authenticated | Set/update 3 security questions + answers (requires current password) |
| `GET /api/security-questions/status` | GET | Authenticated | Check if user has questions configured |
| `POST /api/security-questions/verify` | POST | Public | Verify answers → returns short-lived reset token |
| `POST /api/security-questions/questions` | POST | Public | Given email/username, return the 3 questions (not answers) |

**Security for verification**:
- Rate limit: max 3 attempts per email per hour; after 3 failures, lock for 1 hour
- Reset token is single-use, expires in 15 minutes
- After password reset, revoke all existing sessions
- Step 1 (`/questions`) always returns a consistent response to avoid leaking whether user exists — if user not found, return 3 generic fake questions

### Backend: Invite Management API

`apps/api/src/routes/invites.ts`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `POST /api/invites` | POST | Admin only | Create invite → returns invite with link |
| `GET /api/invites` | GET | Admin only | List all invites with status |
| `DELETE /api/invites/:id` | DELETE | Admin only | Revoke (soft delete — sets status='revoked') |
| `GET /api/invites/validate` | GET | Public | Validate token → returns `{ valid, email }` |
| `POST /api/invites/set-token` | POST | Public | Set `__invite_token` httpOnly cookie for OAuth flow |

```typescript
// POST /api/invites
// Body: { email: string, role: "admin" | "user" }
// Returns: { id, email, role, expiresAt, status, inviteLink }
//
// The inviteLink is: ${FRONTEND_URL}/signup?token=<TOKEN>
// Admin copies this link and sends it manually.
//
// 1. Validates role is "admin" or "user"
// 2. Checks if email is already registered → error
// 3. Checks if a pending invite already exists for this email → error
//    (expired/revoked invites for same email are fine — new invite can be created)
// 4. Creates Invite record with token (nanoid(32)) and expiresAt (7 days)
// 5. Returns invite with the link (no email sent)
```

```typescript
// DELETE /api/invites/:id
// Sets status = 'revoked' (soft delete — keeps history)
// Only works on pending invites; accepted invites cannot be revoked
```

### Backend: Access Request API

`apps/api/src/routes/access-requests.ts`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `POST /api/access-requests` | POST | Public | Submit an access request |
| `GET /api/access-requests` | GET | Admin only | List all requests (filterable by status) |
| `POST /api/access-requests/:id/approve` | POST | Admin only | Approve → whitelist email for sign-up |
| `POST /api/access-requests/:id/reject` | POST | Admin only | Reject with optional reason |

```typescript
// POST /api/access-requests
// Body: { email: string, name: string, reason?: string }
// Returns: { id, status: "pending", message: "Your request has been submitted." }
//
// 1. Validates email format
// 2. Checks if email is already registered → "You already have an account. Try signing in."
// 3. Checks if a pending request already exists → "You've already submitted a request."
// 4. Creates AccessRequest record
// 5. Returns confirmation

// POST /api/access-requests/:id/approve
// Body: { role?: "admin" | "user" } — defaults to "user"
// Sets status = 'approved', reviewedBy, reviewedAt, role
// Returns the updated request
//
// The user can now sign up at /signup with their email.
// For now, admin tells the user manually. Later, we add email notification.
```

### Backend: Admin Middleware

```typescript
// apps/api/src/middleware/requireAdmin.ts
import type { RequestHandler } from 'express';

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const session = req.session;
  if (!session?.user || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

### Rate Limiting

```typescript
// Better Auth rate limits
rateLimit: {
  customRules: {
    '/api/auth/sign-in/*': { window: 60, max: 5 },
    '/api/auth/sign-up/*': { window: 60, max: 3 },
    '/api/auth/callback/*': { window: 60, max: 10 },
    '/api/auth/change-password': { window: 60, max: 3 },
  },
},
```

**Express middleware rate limits** (for custom routes):
```
POST /api/invites:                    max 10 per hour per admin
POST /api/access-requests:            max 3 per hour per IP
POST /api/security-questions/verify:  max 3 per hour per IP (lockout after 3 failures)
POST /api/security-questions/questions: max 10 per hour per IP
GET  /api/invites/validate:           max 20 per minute per IP
```

### Frontend: Auth Client

```typescript
// apps/web/src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';

const baseURL = import.meta.env.PROD
  ? window.location.origin
  : import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient(), adminClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

### Frontend: Sign-Up Page (`/signup`)

Two modes depending on whether a token is in the URL:

**With invite token** (`/signup?token=<TOKEN>`):
- Email pre-filled from invite, read-only

**Without token** (`/signup` — for approved access requests):
- Email field is editable — user types their email
- Server validates on submit that an approved request exists for that email

```
┌─────────────────────────────────────────┐
│  Create your InZone account             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Continue with Google            │   │  ← sets invite cookie if token present
│  └─────────────────────────────────┘   │
│                                         │
│  ──────────── or ─────────────────     │
│                                         │
│  Email *  (read-only if from invite)    │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  Name *                                 │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  Username (optional)                    │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  Password *                             │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  ✗ 8+ characters                       │
│  ✗ Uppercase · Lowercase · Number      │
│  ✗ Special character                   │
│  Confirm Password *                     │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── Security Questions ──               │
│  (Required — used to reset password)    │
│                                         │
│  Question 1  ┌──────────────────────┐  │
│              │ Select a question  ▾ │  │
│              └──────────────────────┘  │
│  Answer      ┌──────────────────────┐  │
│              │                      │  │
│              └──────────────────────┘  │
│                                         │
│  Question 2  ┌──────────────────────┐  │
│              │ Select a question  ▾ │  │
│              └──────────────────────┘  │
│  Answer      ┌──────────────────────┐  │
│              │                      │  │
│              └──────────────────────┘  │
│                                         │
│  Question 3  ┌──────────────────────┐  │
│              │ Select a question  ▾ │  │
│              └──────────────────────┘  │
│  Answer      ┌──────────────────────┐  │
│              │                      │  │
│              └──────────────────────┘  │
│                                         │
│  [Create Account]                       │
└─────────────────────────────────────────┘
```

**Validation:**
- All 3 questions must be different
- Each answer must be at least 2 characters
- Passwords must match and pass all strength rules
- Submit button disabled until all validation passes

### Frontend: Sign-In Page (`/login`)

```
┌─────────────────────────────────────┐
│  Sign in to InZone                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Continue with Google        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ──────────── or ───────────────   │
│                                     │
│  Email or Username                  │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  └─────────────────────────────┘   │
│  Password                           │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Sign In]          Forgot password?│
│                                     │
│  Don't have an account?             │
│  [Request Access]                   │
└─────────────────────────────────────┘
```

- If input contains `@` → `signIn.email({ email, password })`
- Otherwise → `signIn.username({ username, password })`
- "Forgot password?" → `/reset-password`
- "Request Access" → `/request-access`
- **Google OAuth on login page**: only signs in existing users. New Google users without an invite/approved request see: "You need an invite or approved access request to create an account."

### Frontend: Request Access Page (`/request-access`)

Public page — anyone can visit.

```
┌─────────────────────────────────────────┐
│  Request Access to InZone               │
│                                         │
│  Name *                                 │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  Email *                                │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  Why do you want access? (optional)     │
│  Adding a reason helps admins approve   │
│  your request faster.                   │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Submit Request]                       │
│                                         │
│  Already have an account? [Sign in]     │
└─────────────────────────────────────────┘
```

**After submission:**
```
┌─────────────────────────────────────────┐
│  Request Submitted                       │
│                                         │
│  Your request has been sent to the      │
│  admin team. You'll be notified when    │
│  it's approved.                         │
│                                         │
│  Once approved, come back to InZone     │
│  and sign up with your email.           │
│                                         │
│  [Back to Sign In]                      │
└─────────────────────────────────────────┘
```

### Frontend: Reset Password Page (`/reset-password`)

Multi-step flow using security questions (no email needed):

```
Step 1: Identify
┌────────────────────────────────────┐
│  Reset Your Password               │
│                                    │
│  Email or Username                 │
│  ┌────────────────────────────┐   │
│  │                            │   │
│  └────────────────────────────┘   │
│                                    │
│  [Continue]                        │
└────────────────────────────────────┘

Step 2: Answer Security Questions
┌────────────────────────────────────────┐
│  Answer Your Security Questions        │
│                                        │
│  What was the name of your first pet? │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
│  In what city were you born?          │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
│  What was your childhood nickname?    │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
│  [Verify]                              │
└────────────────────────────────────────┘

Step 3: Set New Password
┌────────────────────────────────────┐
│  Set New Password                  │
│                                    │
│  New Password                      │
│  ┌────────────────────────────┐   │
│  │                            │   │
│  └────────────────────────────┘   │
│  (strength indicator)              │
│                                    │
│  Confirm Password                  │
│  ┌────────────────────────────┐   │
│  │                            │   │
│  └────────────────────────────┘   │
│                                    │
│  [Reset Password]                  │
└────────────────────────────────────┘
```

**Note on step 1**: Whether or not the user exists, step 2 always shows 3 questions. If the user doesn't exist, show 3 fake questions — verification will fail generically with "Incorrect answers" to prevent user enumeration.

### Frontend: Admin Invite Management (`/admin/invites`)

```
┌────────────────────────────────────────────────────────────┐
│  Invite Management                                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Email               Role           [Create Invite]   │ │
│  │  ┌────────────┐    ┌──────────┐                      │ │
│  │  │            │    │ User   ▾ │                      │ │
│  │  └────────────┘    └──────────┘                      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ✉ Invite link created!                                │ │
│  │ https://inzone.vercel.app/signup?token=abc123...      │ │
│  │                                          [Copy Link]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Pending Invites                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ jane@example.com    user    Expires Feb 28            │ │
│  │                     [Copy Link]  [Revoke]             │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ bob@example.com     admin   Expires Mar 1             │ │
│  │                     [Copy Link]  [Revoke]             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  History (accepted/revoked)                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ alice@example.com   user    Accepted Feb 20           │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Key change**: After creating an invite, the link is shown on screen with a "Copy Link" button. No email sent. Admin copies and sends manually.

### Frontend: Admin Access Requests (`/admin/requests`)

```
┌────────────────────────────────────────────────────────────┐
│  Access Requests                                            │
│                                                             │
│  Pending                                                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Jane Doe   jane@example.com   Feb 22                  │ │
│  │ "I work with Sarth and need task tracking"            │ │
│  │                                                       │ │
│  │ Role: ┌──────────┐  [Approve]  [Reject]              │ │
│  │       │ User   ▾ │                                    │ │
│  │       └──────────┘                                    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ Bob Smith   bob@example.com   Feb 22                  │ │
│  │ (no reason provided)                                  │ │
│  │                                                       │ │
│  │ Role: ┌──────────┐  [Approve]  [Reject]              │ │
│  │       │ User   ▾ │                                    │ │
│  │       └──────────┘                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Reviewed                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Alice W.   alice@ex.com   ✓ Approved   Feb 21        │ │
│  │ Eve M.     eve@ex.com     ✗ Rejected   Feb 20        │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Frontend: Admin User Management (`/admin/users`)

```
┌──────────────────────────────────────────────────────────────┐
│  User Management                                              │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Name           Email                Role    Status    │   │
│  ├───────────────────────────────────────────────────────┤   │
│  │ Sarth Chawla   sarth@gmail.com      admin   Active    │   │
│  │                                              (you)    │   │
│  ├───────────────────────────────────────────────────────┤   │
│  │ Jane Doe       jane@example.com     user    Active    │   │
│  │                                     [Make Admin]      │   │
│  │                                     [Ban] [Remove]    │   │
│  ├───────────────────────────────────────────────────────┤   │
│  │ Bob Smith      bob@example.com      user    Banned    │   │
│  │                                     [Unban] [Remove]  │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Admin cannot ban/remove themselves.

### Frontend: Settings Page (`/settings`)

```
┌─────────────────────────────────────────────────┐
│  Settings                                        │
│                                                   │
│  Profile                                          │
│  ┌────────────────────────────────────────────┐  │
│  │  Name    ┌──────────────────────┐          │  │
│  │          │ John Doe             │          │  │
│  │          └──────────────────────┘          │  │
│  │  Email   john@example.com  (read-only)     │  │
│  │  Username┌──────────────────────┐          │  │
│  │          │ johndoe              │          │  │
│  │          └──────────────────────┘          │  │
│  │                         [Save Changes]     │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  Security                                         │
│  ┌────────────────────────────────────────────┐  │
│  │  Change Password              [Change]     │  │
│  │  Security Questions           [Update]     │  │
│  │  Linked Accounts                           │  │
│  │    Google  ✓ Connected        [Unlink]     │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  Danger Zone                                      │
│  ┌────────────────────────────────────────────┐  │
│  │  Sign out of all devices   [Sign Out All]  │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## How Sign-Up Access Works for Each Auth Method

| Scenario | What happens |
|----------|-------------|
| **Email sign-up with invite token** | Token validated in `hooks.before`, consumed in `databaseHooks`, role set from invite |
| **Email sign-up with approved request** | No token needed — `databaseHooks` finds approved AccessRequest for the email |
| **Google OAuth from `/signup?token=xxx`** | Token set as httpOnly cookie via `POST /api/invites/set-token`, validated in `databaseHooks` |
| **Google OAuth from `/signup` (approved request)** | No cookie needed — `databaseHooks` finds approved AccessRequest for Google email |
| **Google OAuth from `/login` (existing user)** | No invite needed — user exists, just creates session |
| **Google OAuth from `/login` (new user, no approval)** | Blocked — frontend shows "you need an invite or approval" |
| **Email/username sign-in** | No invite needed — user already has an account |
| **First admin sign-up** | `ADMIN_EMAIL` exemption — no invite or request needed |

## Security Considerations

- All sign-up validation happens server-side in `hooks.before` + `databaseHooks` — cannot be bypassed
- Invite tokens are 32-character nanoid strings — cryptographically random, URL-safe
- Each invite is locked to a specific email — prevents sharing
- Invites expire after 7 days
- Once used, invite status becomes `accepted` — cannot be reused
- Revoke is soft delete (keeps history)
- Admin endpoints check `role === 'admin'` via middleware
- Rate limiting on all auth endpoints + custom routes
- Password strength enforced server-side via `validatePasswordStrength()` in `hooks.before`
- Client-side password validation for UX feedback; server re-validates
- Secure cookies in production (`useSecureCookies: true`)
- CSRF protection enabled (Better Auth default)
- Account linking enabled — Google users can add a password, email users can link Google
- The `__invite_token` cookie is `httpOnly` (set via server endpoint), `secure` (prod), `sameSite: lax`, expires in 10 minutes
- Security question answers normalized (`trim + lowercase`) before hashing to reduce false negatives
- Security question answers stored as bcrypt hashes — never plaintext
- Security question verification does not leak whether user exists (shows fake questions for unknown users)
- Security question rate limit: 3 attempts per hour, then 1-hour lockout
- Password reset token (from security questions) is single-use, expires in 15 minutes
- All sessions revoked after password reset
- Access request submission rate limited to prevent spam (3 per hour per IP)

## Environment Variables

```
# Existing (already set)
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DATABASE_URL=...

# New
ADMIN_EMAIL=sarth.chawla@gmail.com
FRONTEND_URL=https://inzone.vercel.app   # for building invite links
```

No Resend API key needed for this version.

## Files to Create/Modify

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add `Invite`, `AccessRequest`, `SecurityQuestion` models; add admin + username plugin fields to User |
| `apps/api/src/lib/auth.ts` | Enable emailAndPassword, add admin + username plugins, add hooks.before + databaseHooks |
| `apps/api/src/lib/password-validation.ts` | **New** — Password strength validation |
| `apps/api/src/routes/invites.ts` | **New** — Admin invite CRUD + public validate + set-token |
| `apps/api/src/routes/access-requests.ts` | **New** — Public request submission + admin review |
| `apps/api/src/routes/security-questions.ts` | **New** — Setup, verify, question retrieval |
| `apps/api/src/middleware/requireAdmin.ts` | **New** — Admin role check |
| `apps/api/src/app.ts` | Register new routes |
| `apps/web/src/lib/auth-client.ts` | Add usernameClient + adminClient plugins |
| `apps/web/src/pages/SignUpPage.tsx` | **New** — Sign-up with invite token or approved request, includes security questions |
| `apps/web/src/pages/LoginPage.tsx` | Rework to sign-in only, add "Request Access" link |
| `apps/web/src/pages/RequestAccessPage.tsx` | **New** — Public access request form |
| `apps/web/src/pages/ResetPasswordPage.tsx` | **New** — Security question-based password reset |
| `apps/web/src/pages/SettingsPage.tsx` | **New** — Profile, change password, update security questions, linked accounts |
| `apps/web/src/pages/admin/InvitesPage.tsx` | **New** — Admin invite management with copy-paste links |
| `apps/web/src/pages/admin/RequestsPage.tsx` | **New** — Admin access request review (approve/reject) |
| `apps/web/src/pages/admin/UsersPage.tsx` | **New** — Admin user management |
| `apps/web/src/App.tsx` | Add routes: `/signup`, `/login`, `/request-access`, `/reset-password`, `/settings`, `/admin/invites`, `/admin/requests`, `/admin/users` |

## Migration Steps

1. Update Prisma schema (Invite, AccessRequest, SecurityQuestion models; admin + username plugin fields)
2. Run `pnpm --filter api exec npx @better-auth/cli generate` to sync plugin schema
3. Run `pnpm --filter api db:migrate:dev` to apply migration
4. Add raw SQL migration for CHECK constraints
5. Install dependencies: `pnpm --filter api add nanoid bcrypt` + types
6. Add environment variables (`ADMIN_EMAIL`, `FRONTEND_URL`)
7. Create password validation utility
8. Update `auth.ts` — enable emailAndPassword, add plugins, add hooks
9. Create security questions routes
10. Create invite routes + set-token endpoint
11. Create access request routes
12. Create admin middleware
13. Update frontend auth client with plugins
14. Build sign-up page (with security questions, invite token support)
15. Rework login page
16. Build request access page
17. Build reset password page (security questions)
18. Build settings page
19. Build admin pages (invites, requests, users)
20. Add routes and navigation
21. First admin signs up via Google or email/password (ADMIN_EMAIL exemption)

## What's NOT in this PRD (deferred)

- **Email service (Resend)** — deferred until custom domain acquired. Will add: invite email delivery, access request approval notifications, password reset via email OTP
- **Two-factor authentication (2FA)** — can be added later via Better Auth's `twoFactor` plugin
- **Email verification** — not needed; invite/approval flow validates email ownership
- **Email-based password reset (OTP)** — using security questions for now; email OTP added with Resend later

## Acceptance Criteria

- [ ] Sign-up requires a valid invite OR an approved access request
- [ ] Sign-in works without any of that for existing users
- [ ] Invite tokens are single-use, email-locked, and expire after 7 days
- [ ] Admin can create invites and copy-paste the link (no email sent)
- [ ] Admin can list, copy link for, and revoke pending invites
- [ ] Revoke is soft delete — history preserved
- [ ] Admin can re-invite same email after expired/revoked invite
- [ ] Users can request access on `/request-access` (name + email + optional reason)
- [ ] Admin can approve/reject access requests with role selection
- [ ] Approved users can sign up at `/signup` with their email
- [ ] Access request form shows hint: "Adding a reason helps admins approve faster"
- [ ] Duplicate access requests for same email blocked
- [ ] Security questions required during sign-up (3 questions, 3 answers)
- [ ] Password reset works via security questions (no email needed)
- [ ] Security question verification doesn't leak user existence
- [ ] Security question rate limiting: 3 attempts/hour, then 1-hour lockout
- [ ] All sessions revoked after password reset
- [ ] Security questions can be updated from settings (requires current password)
- [ ] Google OAuth sign-up works with invite token (via httpOnly cookie)
- [ ] Google OAuth sign-up works with approved access request (no token needed)
- [ ] New Google user from login page (no invite/approval) sees helpful error
- [ ] First admin bootstrapped via ADMIN_EMAIL env var
- [ ] Admin can invite both `admin` and `user` roles
- [ ] Admin user management page: list, ban, unban, change role, remove
- [ ] Admin cannot ban/remove themselves
- [ ] Non-admin users cannot access admin endpoints
- [ ] Password strength validated server-side (length + character classes)
- [ ] Settings page: profile editing, change password, update security questions, linked accounts
- [ ] Sign-up page shows password strength indicator and confirm password field
- [ ] All custom endpoints rate-limited appropriately
