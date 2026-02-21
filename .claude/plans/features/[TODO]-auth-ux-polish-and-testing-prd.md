# PRD: Auth UX/UI Polish, Design Consistency & Test Coverage

**Status**: TODO
**Priority**: P1
**Created**: 2026-02-22
**Depends on**: `[TODO]-auth-and-invite-system-prd.md` (implementation complete on `more-auths` branch)

## Problem

The auth features on the `more-auths` branch were implemented functionally but the frontend pages:
1. **Don't match the design system** — all auth pages use `blue-600` while the app's UI revamp established `accent` (indigo #6366f1) as the primary color
2. **Don't reuse the component library** — inline `className` buttons/inputs instead of the existing `Button`, `Input` components
3. **Have accessibility gaps** — missing ARIA labels, no `role="alert"` on errors, no screen reader support for password strength indicators
4. **Have no test coverage** — 0 tests for the 3 new API route files, minimal tests for frontend auth pages
5. **Break existing coverage thresholds** — new untested code will drop below the enforced minimums

### Coverage Targets That Must Be Met

| Package | Branches | Functions | Lines | Statements |
|---------|----------|-----------|-------|------------|
| `apps/web` | 75% | 80% | 80% | 80% |
| `apps/api` | 80% | 80% | 80% | 80% |

These thresholds are enforced in `vitest.config.ts` and **must not be lowered**. All new code from this branch must have sufficient tests to keep coverage above these targets.

## Scope

This PRD covers three areas for the auth branch changes:

1. **UX/UI Polish** — fix design consistency, improve UX flows
2. **Testing** — unit tests, BDD tests, architecture tests
3. **Verification** — ensure everything still works per the auth PRD

---

## Part 1: UX/UI Polish

### 1.1 Color System — Replace `blue-600` with Design System Accent

Every auth page currently uses hardcoded `blue-600`/`blue-500` for primary actions, links, and focus rings. The design system uses:

- **Primary action**: `bg-accent hover:bg-accent-hover` (indigo #6366f1 / #4f46e5)
- **Focus ring**: `ring-accent/50`
- **Light bg**: `bg-accent-light` (#eef2ff)
- **Muted**: `text-accent-muted` (#c7d2fe)
- **Surface palette**: `stone-*` (not `gray-*`)

**Files to update** (every `blue-600`, `blue-500`, `blue-700`, `gray-*` surface reference):

| File | Changes |
|------|---------|
| `LoginPage.tsx` | Buttons → `bg-accent`, links → `text-accent`, focus → `ring-accent/50`, surfaces → `stone-*` |
| `SignUpPage.tsx` | Same as above, plus password strength indicator colors |
| `RequestAccessPage.tsx` | Button and link colors |
| `ResetPasswordPage.tsx` | Button, link, step indicator colors |
| `SettingsPage.tsx` | Save/action button colors, section borders |
| `admin/InvitesPage.tsx` | Create button, link text, action buttons |
| `admin/RequestsPage.tsx` | Approve button, role selector focus |
| `admin/UsersPage.tsx` | Action links, role badge stays purple (intentional differentiation) |
| `App.tsx` | Verify header uses `text-accent` (already fixed during rebase) |

### 1.2 Component Reuse — Use Existing `Button` and `Input` Components

The codebase has reusable components with built-in variants, focus states, and accessibility:

- `Button` — variants: `default`, `primary`, `ghost`, `danger` / sizes: `sm`, `md`, `lg`
- `Input` — 44px min-height, consistent focus ring, stone borders

**What to do**:
- Replace all inline `<button className="...">` in auth pages with `<Button variant="primary">`, `<Button variant="ghost">`, etc.
- Replace all inline `<input className="...">` with the `<Input>` component
- Replace all inline `<select className="...">` with consistent select styling (or create a `Select` component if one doesn't exist)
- Keep the Google OAuth button as custom-styled (brand guidelines require specific styling)

### 1.3 Accessibility Fixes

| Issue | Fix |
|-------|-----|
| Error messages lack `role="alert"` | Add `role="alert"` to all error `<div>`s so screen readers announce them |
| Success messages lack `role="status"` | Add `role="status"` to success confirmations |
| `GoogleIcon.tsx` has no a11y attributes | Add `aria-hidden="true"` (decorative, button text provides context) |
| Password strength indicators use ✓/✗ unicode | Keep visual but add `aria-label` on each requirement row (e.g., `aria-label="8 or more characters: met"`) |
| Security question `<select>` elements | Ensure `aria-label="Security question 1"` etc. |
| Loading spinners | Add `aria-label="Loading"` and `role="status"` |
| Form validation errors | Associate with inputs via `aria-describedby` |
| Step progress in ResetPasswordPage | Add `aria-current="step"` and `aria-label` for step indicators |

### 1.4 UX Flow Improvements

#### 1.4.1 ResetPasswordPage — Add Step Progress Indicator
Currently no visual indication of which step the user is on. Add a 3-step progress bar:
```
Step 1: Identify  →  Step 2: Verify  →  Step 3: Reset
   ●──────────────────○──────────────────○
```
Use accent color for completed/current steps, `stone-300` for upcoming.

#### 1.4.2 SignUpPage — Improve Dense Layout on Mobile
The sign-up form has many fields (email, name, username, password, confirm, 3 security questions). On mobile:
- Group into collapsible sections: "Account Details" and "Security Questions"
- Or use a 2-step flow: account info first, security questions second
- Add section headers with clear visual separation

#### 1.4.3 Admin Pages — Add Loading & Empty States
- Add skeleton loading states while data fetches (use existing `Skeleton` component)
- Add empty state illustrations/messages ("No pending invites", "No access requests")
- Add pagination if lists grow beyond 20 items (future-proof)

#### 1.4.4 Settings Page — Responsive Max Width
- Add `max-w-2xl mx-auto` container on desktop to prevent overly wide forms
- Match the content width of the board views

#### 1.4.5 Admin UsersPage — Mobile-Friendly Layout
- On mobile (`< md`), switch from table to card layout
- Each user becomes a card with name, email, role badge, and action buttons stacked vertically

#### 1.4.6 Error State Persistence
- `RequestAccessPage`: Show error message for 5 seconds on submission failure, with dismiss button
- `SignUpPage`: Token validation failure should show error message and redirect to `/request-access` after 3 seconds
- All forms: Keep error messages visible until user modifies the related field

### 1.5 Animation Consistency

The app uses Framer Motion for page transitions (via `AnimatedRoutes`). The auth pages (public routes) currently have no transitions. Add:
- Fade-in on initial render for login/signup/request-access/reset-password pages
- Step transitions within ResetPasswordPage (slide left/right between steps)
- Use same easing: `[0.25, 0.1, 0.25, 1]` and duration: `0.2s` as existing `AnimatedRoutes`

---

## Part 2: Testing

### 2.1 API Unit Tests

All new API routes need unit tests following the existing pattern (Vitest, mocked Prisma, mocked auth session).

#### `apps/api/src/routes/invites.test.ts`

| Test | Description |
|------|-------------|
| **POST /api/invites** | |
| Creates invite with valid email and role | Happy path — returns invite with token and link |
| Rejects if caller is not admin | Returns 403 |
| Rejects if email already registered | Returns 400 |
| Rejects if pending invite already exists for email | Returns 400 |
| Creates new invite even if previous invite was revoked/expired | Happy path |
| Validates role is "admin" or "user" | Returns 400 for invalid role |
| Sets 7-day expiration | Verify `expiresAt` is ~7 days from now |
| **GET /api/invites** | |
| Returns all invites for admin | Happy path with mixed statuses |
| Returns 403 for non-admin | Authorization check |
| **DELETE /api/invites/:id** | |
| Revokes pending invite (soft delete) | Sets status to 'revoked' |
| Returns 404 for non-existent invite | |
| Cannot revoke already-accepted invite | Returns 400 |
| Returns 403 for non-admin | |
| **GET /api/invites/validate** | |
| Returns valid=true for valid pending token | |
| Returns valid=false for expired token | Also updates status to 'expired' |
| Returns valid=false for revoked token | |
| Returns valid=false for non-existent token | |
| **POST /api/invites/set-token** | |
| Sets httpOnly cookie with invite token | Verify cookie attributes |
| Returns 400 if no token provided | |

#### `apps/api/src/routes/access-requests.test.ts`

| Test | Description |
|------|-------------|
| **POST /api/access-requests** | |
| Creates request with name, email, reason | Happy path |
| Creates request without reason (optional) | Happy path |
| Rejects if email already registered | Returns 400 |
| Rejects if pending request already exists | Returns 400 |
| Validates email format | Returns 400 |
| **GET /api/access-requests** | |
| Returns all requests for admin | Happy path |
| Filters by status query param | Returns only matching status |
| Returns 403 for non-admin | |
| **POST /api/access-requests/:id/approve** | |
| Approves pending request with default role 'user' | |
| Approves with specified role | |
| Returns 404 for non-existent request | |
| Returns 400 for already-reviewed request | |
| Returns 403 for non-admin | |
| **POST /api/access-requests/:id/reject** | |
| Rejects pending request | Sets status to 'rejected' |
| Returns 404 for non-existent request | |
| Returns 400 for already-reviewed request | |
| Returns 403 for non-admin | |

#### `apps/api/src/routes/security-questions.test.ts`

| Test | Description |
|------|-------------|
| **POST /api/security-questions/setup** | |
| Sets up 3 security questions for authenticated user | Happy path |
| Replaces existing questions (update flow) | |
| Rejects if not authenticated | Returns 401 |
| Rejects if fewer than 3 questions | Returns 400 |
| Rejects if duplicate questions selected | Returns 400 |
| Rejects if answers too short (< 2 chars) | Returns 400 |
| Rejects if question not in predefined pool | Returns 400 |
| Hashes answers with bcrypt | Verify stored value is not plaintext |
| **GET /api/security-questions/status** | |
| Returns true if user has questions configured | |
| Returns false if no questions set | |
| Returns 401 if not authenticated | |
| **POST /api/security-questions/questions** | |
| Returns 3 questions for valid identifier (email) | |
| Returns 3 questions for valid identifier (username) | |
| Returns 3 fake questions for non-existent user | Anti-enumeration |
| Always returns exactly 3 questions | |
| **POST /api/security-questions/verify** | |
| Returns reset token when all 3 answers correct | |
| Normalizes answers (trim + lowercase) before comparing | |
| Returns error when any answer is wrong | Generic message, no hint which one |
| Returns error for non-existent user | Same generic message |
| Rate limits after 3 failed attempts | Returns 429 |

#### `apps/api/src/middleware/requireAdmin.test.ts`

| Test | Description |
|------|-------------|
| Allows admin user through | Sets req.session, calls next() |
| Blocks non-admin user | Returns 403 |
| Blocks unauthenticated request | Returns 401 |

#### `apps/api/src/lib/password-validation.test.ts`

| Test | Description |
|------|-------------|
| Accepts valid password meeting all rules | |
| Rejects password shorter than 8 chars | |
| Rejects password without uppercase | |
| Rejects password without lowercase | |
| Rejects password without number | |
| Rejects password without special character | |
| Returns first failing rule message | |

### 2.2 Frontend Unit Tests

#### `apps/web/src/pages/LoginPage.test.tsx`

Existing test is minimal (just renders). Expand:

| Test | Description |
|------|-------------|
| Renders login form with email and password fields | |
| Renders Google OAuth button | |
| Shows "Request Access" link | |
| Shows "Forgot password?" link | |
| Disables submit button when fields are empty | |
| Calls signIn.email when input contains @ | |
| Calls signIn.username when input has no @ | |
| Shows error message on failed login | |
| Redirects to / on successful login | |

#### `apps/web/src/pages/SignUpPage.test.tsx` (new)

| Test | Description |
|------|-------------|
| Renders sign-up form | |
| Pre-fills and disables email when invite token is valid | |
| Shows editable email when no token | |
| Validates password strength rules (all 5 rules) | |
| Shows password match validation | |
| Requires all 3 security questions to be different | |
| Requires answers to be at least 2 characters | |
| Disables submit until all validation passes | |
| Submits form successfully with valid data | |
| Shows error on invalid invite token | |
| Google OAuth button sets invite cookie when token present | |

#### `apps/web/src/pages/RequestAccessPage.test.tsx` (new)

| Test | Description |
|------|-------------|
| Renders request form with name, email, reason fields | |
| Reason field is optional | |
| Shows success state after submission | |
| Shows "Back to Sign In" link on success | |
| Shows error on duplicate email | |
| Shows error on already-registered email | |

#### `apps/web/src/pages/ResetPasswordPage.test.tsx` (new)

| Test | Description |
|------|-------------|
| Renders step 1 — identifier input | |
| Advances to step 2 showing security questions | |
| Shows 3 question fields in step 2 | |
| Shows error on wrong answers | |
| Advances to step 3 — new password form | |
| Validates new password strength | |
| Shows success message after reset | |
| Shows step progress indicator | |

#### `apps/web/src/pages/SettingsPage.test.tsx` (new)

| Test | Description |
|------|-------------|
| Renders profile section with user info | |
| Email field is read-only | |
| Saves name changes | |
| Change password section validates strength | |
| Update security questions requires current password | |
| Sign out all devices button works | |

#### `apps/web/src/pages/admin/InvitesPage.test.tsx` (new)

| Test | Description |
|------|-------------|
| Renders create invite form | |
| Creates invite and shows link | |
| Copy link button copies to clipboard | |
| Shows pending invites list | |
| Revoke button changes invite status | |
| Shows invite history (accepted/revoked) | |

#### `apps/web/src/pages/admin/RequestsPage.test.tsx` (new)

| Test | Description |
|------|-------------|
| Renders pending requests | |
| Shows reason when provided | |
| Role selector defaults to "user" | |
| Approve button approves with selected role | |
| Reject button rejects request | |
| Shows reviewed history | |

#### `apps/web/src/pages/admin/UsersPage.test.tsx` (new)

| Test | Description |
|------|-------------|
| Renders user list with roles and status | |
| Shows "(you)" badge for current user | |
| Hides action buttons for current user | |
| Ban button bans user | |
| Unban button unbans user | |
| Make Admin/User toggles role | |
| Remove button deletes user | |

### 2.3 BDD Tests — API (Gherkin + Step Definitions)

Follow the existing pattern in `apps/api/tests/bdd/`. Create `.feature` files with `@happy-path` and `@unhappy-path` tags.

#### `apps/api/tests/bdd/features/auth/invites-api.feature`

```gherkin
@invites @api
Feature: Invites API
  As an admin
  I want to manage invite links
  So that I can control who joins InZone

  Background:
    Given an admin user exists

  # Happy paths
  @happy-path
  Scenario: Create an invite
    When I POST to /api/invites with:
      | email | jane@example.com |
      | role  | user             |
    Then the response status should be 201
    And the response should contain an invite link
    And the invite should have status "pending"

  @happy-path
  Scenario: List all invites
    Given an invite for "jane@example.com" exists
    And an invite for "bob@example.com" exists
    When I GET /api/invites
    Then the response status should be 200
    And the response should contain 2 invites

  @happy-path
  Scenario: Revoke a pending invite
    Given an invite for "jane@example.com" exists
    When I DELETE the invite
    Then the response status should be 200
    And the invite should have status "revoked"

  @happy-path
  Scenario: Validate a valid invite token
    Given an invite for "jane@example.com" exists
    When I GET /api/invites/validate with the token
    Then the response status should be 200
    And the response should contain valid true
    And the response should contain the email "jane@example.com"

  @happy-path
  Scenario: Re-invite after revoked invite
    Given a revoked invite for "jane@example.com" exists
    When I POST to /api/invites with:
      | email | jane@example.com |
      | role  | user             |
    Then the response status should be 201
    And a new invite token should be generated

  # Unhappy paths
  @unhappy-path
  Scenario: Non-admin cannot create invite
    Given a regular user is authenticated
    When I POST to /api/invites with:
      | email | jane@example.com |
      | role  | user             |
    Then the response status should be 403

  @unhappy-path
  Scenario: Cannot invite already registered email
    Given a user with email "jane@example.com" exists
    When I POST to /api/invites with:
      | email | jane@example.com |
      | role  | user             |
    Then the response status should be 400
    And the response should contain error "already registered"

  @unhappy-path
  Scenario: Cannot create duplicate pending invite
    Given a pending invite for "jane@example.com" exists
    When I POST to /api/invites with:
      | email | jane@example.com |
      | role  | user             |
    Then the response status should be 400

  @unhappy-path
  Scenario: Validate expired token
    Given an expired invite for "jane@example.com" exists
    When I GET /api/invites/validate with the token
    Then the response status should be 200
    And the response should contain valid false
```

#### `apps/api/tests/bdd/features/auth/access-requests-api.feature`

```gherkin
@access-requests @api
Feature: Access Requests API
  As a user wanting to join InZone
  I want to request access
  So that an admin can approve me

  # Happy paths
  @happy-path
  Scenario: Submit access request
    When I POST to /api/access-requests with:
      | name   | Jane Doe         |
      | email  | jane@example.com |
      | reason | Working with the team |
    Then the response status should be 201
    And the response should contain status "pending"

  @happy-path
  Scenario: Submit access request without reason
    When I POST to /api/access-requests with:
      | name  | Jane Doe         |
      | email | jane@example.com |
    Then the response status should be 201

  @happy-path
  Scenario: Admin approves access request
    Given an admin user exists
    And a pending access request from "jane@example.com" exists
    When I POST to approve the access request with role "user"
    Then the response status should be 200
    And the request should have status "approved"

  @happy-path
  Scenario: Admin rejects access request
    Given an admin user exists
    And a pending access request from "jane@example.com" exists
    When I POST to reject the access request
    Then the response status should be 200
    And the request should have status "rejected"

  @happy-path
  Scenario: Admin lists requests filtered by status
    Given an admin user exists
    And a pending access request from "jane@example.com" exists
    And an approved access request from "bob@example.com" exists
    When I GET /api/access-requests?status=pending
    Then the response status should be 200
    And the response should contain 1 request

  # Unhappy paths
  @unhappy-path
  Scenario: Cannot request access with already registered email
    Given a user with email "jane@example.com" exists
    When I POST to /api/access-requests with:
      | name  | Jane Doe         |
      | email | jane@example.com |
    Then the response status should be 400
    And the response should contain error "already have an account"

  @unhappy-path
  Scenario: Cannot submit duplicate pending request
    Given a pending access request from "jane@example.com" exists
    When I POST to /api/access-requests with:
      | name  | Jane Doe         |
      | email | jane@example.com |
    Then the response status should be 400

  @unhappy-path
  Scenario: Non-admin cannot approve requests
    Given a regular user is authenticated
    And a pending access request exists
    When I POST to approve the access request
    Then the response status should be 403
```

#### `apps/api/tests/bdd/features/auth/security-questions-api.feature`

```gherkin
@security-questions @api
Feature: Security Questions API
  As a user
  I want to set up and use security questions
  So that I can reset my password without email

  # Happy paths
  @happy-path
  Scenario: Set up security questions during registration
    Given I am authenticated
    When I POST to /api/security-questions/setup with 3 unique questions and answers
    Then the response status should be 200
    And I should have 3 security questions configured

  @happy-path
  Scenario: Check security question status — configured
    Given I am authenticated
    And I have security questions set up
    When I GET /api/security-questions/status
    Then the response status should be 200
    And the response should contain configured true

  @happy-path
  Scenario: Retrieve questions for password reset
    Given a user "jane@example.com" has security questions
    When I POST to /api/security-questions/questions with identifier "jane@example.com"
    Then the response status should be 200
    And the response should contain 3 questions

  @happy-path
  Scenario: Verify correct answers returns reset token
    Given a user "jane@example.com" has security questions
    When I POST to /api/security-questions/verify with correct answers
    Then the response status should be 200
    And the response should contain a reset token

  @happy-path
  Scenario: Answer matching is case-insensitive and trim-insensitive
    Given a user set answer "  New York  " for question 1
    When I verify with answer "new york"
    Then the answer should match

  # Unhappy paths
  @unhappy-path
  Scenario: Verify with wrong answers
    Given a user "jane@example.com" has security questions
    When I POST to /api/security-questions/verify with wrong answers
    Then the response status should be 400
    And the response should contain error "Incorrect answers"

  @unhappy-path
  Scenario: Questions for non-existent user returns fake questions
    When I POST to /api/security-questions/questions with identifier "nobody@example.com"
    Then the response status should be 200
    And the response should contain 3 questions

  @unhappy-path
  Scenario: Rate limited after 3 failed attempts
    Given a user "jane@example.com" has security questions
    And I have failed verification 3 times
    When I POST to /api/security-questions/verify
    Then the response status should be 429

  @unhappy-path
  Scenario: Cannot set up questions without authentication
    When I POST to /api/security-questions/setup without auth
    Then the response status should be 401

  @unhappy-path
  Scenario: Cannot set up duplicate questions
    Given I am authenticated
    When I POST to /api/security-questions/setup with duplicate questions
    Then the response status should be 400
```

### 2.4 BDD Tests — Frontend (Component-Level)

Follow the existing pattern in `apps/web/tests/bdd/`. These are component-level BDD tests with Gherkin features.

#### `apps/web/tests/bdd/features/auth/login.feature`

```gherkin
Feature: Login Page
  As a user with an account
  I want to sign in to InZone
  So that I can access my boards

  Scenario: Sign in with email and password
    Given I am on the login page
    When I enter "jane@example.com" as the identifier
    And I enter "Password123!" as the password
    And I click "Sign In"
    Then I should be redirected to the dashboard

  Scenario: Sign in with username
    Given I am on the login page
    When I enter "janedoe" as the identifier
    And I enter "Password123!" as the password
    And I click "Sign In"
    Then signIn.username should be called

  Scenario: Show error on invalid credentials
    Given I am on the login page
    And the server will reject credentials
    When I enter "jane@example.com" as the identifier
    And I enter "wrong" as the password
    And I click "Sign In"
    Then I should see an error message

  Scenario: Navigate to request access
    Given I am on the login page
    When I click "Request Access"
    Then I should be navigated to "/request-access"

  Scenario: Navigate to forgot password
    Given I am on the login page
    When I click "Forgot password?"
    Then I should be navigated to "/reset-password"
```

#### `apps/web/tests/bdd/features/auth/signup.feature`

```gherkin
Feature: Sign Up Page
  As an invited user
  I want to create my InZone account
  So that I can start using the app

  Scenario: Sign up with invite token
    Given I am on the signup page with a valid invite token
    And the token validates for "jane@example.com"
    Then the email field should be pre-filled with "jane@example.com"
    And the email field should be read-only

  Scenario: Sign up without token (approved request)
    Given I am on the signup page without a token
    Then the email field should be editable

  Scenario: Password validation feedback
    Given I am on the signup page
    When I enter "abc" as the password
    Then I should see "8+ characters" as not met
    And I should see "uppercase letter" as not met
    When I enter "Abcdefgh1!" as the password
    Then all password requirements should be met

  Scenario: Security questions must be unique
    Given I am on the signup page
    When I select "What was the name of your first pet?" for question 1
    And I select "What was the name of your first pet?" for question 2
    Then I should see a validation error about duplicate questions
```

#### `apps/web/tests/bdd/features/auth/request-access.feature`

```gherkin
Feature: Request Access Page
  As someone who wants to use InZone
  I want to request access
  So that an admin can approve my request

  Scenario: Submit access request successfully
    Given I am on the request access page
    When I enter "Jane Doe" as the name
    And I enter "jane@example.com" as the email
    And I enter "Working with the team" as the reason
    And I click "Submit Request"
    Then I should see a success message
    And I should see a "Back to Sign In" link

  Scenario: Submit without reason (optional)
    Given I am on the request access page
    When I enter "Jane Doe" as the name
    And I enter "jane@example.com" as the email
    And I click "Submit Request"
    Then I should see a success message
```

#### `apps/web/tests/bdd/features/admin/invites-management.feature`

```gherkin
Feature: Admin Invite Management
  As an admin
  I want to manage invites
  So that I can control who joins InZone

  Background:
    Given I am an admin user
    And I am on the invites management page

  Scenario: Create an invite and copy link
    When I enter "jane@example.com" in the email field
    And I select "user" as the role
    And I click "Create Invite"
    Then I should see an invite link
    And I should see a "Copy Link" button

  Scenario: Revoke a pending invite
    Given a pending invite for "jane@example.com" exists
    When I click "Revoke" for the invite
    Then the invite should move to the history section
    And the invite should show status "revoked"
```

### 2.5 Architecture Tests

Add arch tests for the new auth modules to enforce layer boundaries.

#### `apps/api/src/architecture/layers.arch.test.ts` — Add:

```typescript
describe("Auth Routes Layer", () => {
  it("auth routes should not import from other route files", async () => {
    const rule = projectFiles()
      .inFolder("src/routes/invites*")
      .shouldNot()
      .dependOnFiles()
      .inFolder("src/routes/access-requests*");
    await expect(rule).toPassAsync();
  });

  it("requireAdmin middleware should not depend on routes", async () => {
    const rule = projectFiles()
      .inFolder("src/middleware/requireAdmin*")
      .shouldNot()
      .dependOnFiles()
      .inFolder("src/routes/**");
    await expect(rule).toPassAsync();
  });

  it("password-validation should be a pure utility (no route/middleware deps)", async () => {
    const rule = projectFiles()
      .matchingPattern("src/lib/password-validation*")
      .shouldNot()
      .dependOnFiles()
      .inFolder("src/routes/**");
    await expect(rule).toPassAsync();
  });
});
```

#### `apps/web/src/architecture/layers.arch.test.ts` — Add:

```typescript
describe("Auth Pages Layer", () => {
  it("auth pages should not import admin pages", async () => {
    const rule = projectFiles()
      .matchingPattern("src/pages/LoginPage*")
      .shouldNot()
      .dependOnFiles()
      .inFolder("src/pages/admin/**");
    await expect(rule).toPassAsync();
  });

  it("admin pages should not import auth pages", async () => {
    const rule = projectFiles()
      .inFolder("src/pages/admin/**")
      .shouldNot()
      .dependOnFiles()
      .matchingPattern("src/pages/LoginPage*");
    await expect(rule).toPassAsync();
  });
});
```

#### `apps/web/src/architecture/naming.arch.test.ts` — Verify:

The existing naming convention tests should already validate that:
- Pages are PascalCase and end with `Page`
- Admin pages are in `admin/` subfolder
- Components are PascalCase

Verify the new files pass existing naming rules. If not, add rules for:
- `src/pages/admin/**` files must end with `Page.tsx`

### 2.6 Test File Summary

| File (new) | Type | Location |
|-----------|------|----------|
| `invites.test.ts` | Unit | `apps/api/src/routes/` |
| `access-requests.test.ts` | Unit | `apps/api/src/routes/` |
| `security-questions.test.ts` | Unit | `apps/api/src/routes/` |
| `requireAdmin.test.ts` | Unit | `apps/api/src/middleware/` |
| `password-validation.test.ts` | Unit | `apps/api/src/lib/` |
| `LoginPage.test.tsx` | Unit (expand) | `apps/web/src/pages/` |
| `SignUpPage.test.tsx` | Unit | `apps/web/src/pages/` |
| `RequestAccessPage.test.tsx` | Unit | `apps/web/src/pages/` |
| `ResetPasswordPage.test.tsx` | Unit | `apps/web/src/pages/` |
| `SettingsPage.test.tsx` | Unit | `apps/web/src/pages/` |
| `InvitesPage.test.tsx` | Unit | `apps/web/src/pages/admin/` |
| `RequestsPage.test.tsx` | Unit | `apps/web/src/pages/admin/` |
| `UsersPage.test.tsx` | Unit | `apps/web/src/pages/admin/` |
| `invites-api.feature` | BDD | `apps/api/tests/bdd/features/auth/` |
| `access-requests-api.feature` | BDD | `apps/api/tests/bdd/features/auth/` |
| `security-questions-api.feature` | BDD | `apps/api/tests/bdd/features/auth/` |
| `invites.steps.ts` | BDD steps | `apps/api/tests/bdd/step-definitions/` |
| `access-requests.steps.ts` | BDD steps | `apps/api/tests/bdd/step-definitions/` |
| `security-questions.steps.ts` | BDD steps | `apps/api/tests/bdd/step-definitions/` |
| `login.feature` | BDD | `apps/web/tests/bdd/features/auth/` |
| `signup.feature` | BDD | `apps/web/tests/bdd/features/auth/` |
| `request-access.feature` | BDD | `apps/web/tests/bdd/features/auth/` |
| `invites-management.feature` | BDD | `apps/web/tests/bdd/features/admin/` |
| `auth.steps.ts` | BDD steps | `apps/web/tests/bdd/steps/` |
| `admin.steps.ts` | BDD steps | `apps/web/tests/bdd/steps/` |
| `layers.arch.test.ts` | Arch (extend) | Both `apps/api` and `apps/web` |

---

## Part 3: Verification Against Auth PRD

After the UX polish and tests are complete, verify every acceptance criterion from the auth PRD still works. This is a manual + automated check:

### Acceptance Criteria Checklist

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | Sign-up requires valid invite OR approved access request | BDD: invites-api, access-requests-api |
| 2 | Sign-in works for existing users without invite | BDD: login.feature |
| 3 | Invite tokens are single-use, email-locked, 7-day expiry | Unit: invites.test.ts |
| 4 | Admin can create invites and copy-paste link | BDD: invites-management.feature |
| 5 | Admin can list, copy link for, revoke pending invites | Unit + BDD |
| 6 | Revoke is soft delete — history preserved | Unit: invites.test.ts |
| 7 | Admin can re-invite after expired/revoked | BDD: invites-api.feature |
| 8 | Users can request access at /request-access | BDD: request-access.feature |
| 9 | Admin can approve/reject with role selection | BDD: access-requests-api.feature |
| 10 | Approved users can sign up at /signup | BDD: signup.feature |
| 11 | "Adding a reason helps admins approve faster" hint shown | Unit: RequestAccessPage.test.tsx |
| 12 | Duplicate access requests blocked | Unit + BDD |
| 13 | Security questions required during sign-up | Unit: SignUpPage.test.tsx |
| 14 | Password reset via security questions works | BDD: security-questions-api.feature |
| 15 | Security question verification doesn't leak user existence | Unit: security-questions.test.ts |
| 16 | Rate limiting: 3 attempts/hour, 1-hour lockout | Unit test |
| 17 | All sessions revoked after password reset | Unit test |
| 18 | Security questions updatable from settings | Unit: SettingsPage.test.tsx |
| 19 | Google OAuth sign-up works with invite token (cookie) | Unit: auth.ts hooks |
| 20 | Google OAuth sign-up works with approved request | Unit: auth.ts hooks |
| 21 | New Google user without approval sees error | Unit test |
| 22 | First admin bootstrapped via ADMIN_EMAIL | Unit: auth.ts hooks |
| 23 | Admin can invite both roles | Unit + BDD |
| 24 | Admin user management: list, ban, unban, role, remove | Unit: UsersPage.test.tsx |
| 25 | Admin cannot ban/remove themselves | Unit: UsersPage.test.tsx |
| 26 | Non-admin blocked from admin endpoints | Unit: requireAdmin.test.ts |
| 27 | Password strength enforced server-side | Unit: password-validation.test.ts |
| 28 | Settings page works (profile, password, security Q, linked accounts) | Unit: SettingsPage.test.tsx |
| 29 | Password strength indicator on sign-up | Unit: SignUpPage.test.tsx |
| 30 | All custom endpoints rate-limited | Unit tests |

---

## Implementation Order

1. **Run current tests** — establish baseline coverage numbers
2. **Write API unit tests** — invites, access-requests, security-questions, requireAdmin, password-validation
3. **Write API BDD tests** — feature files + step definitions
4. **Write API architecture tests** — layer boundary rules
5. **Run API coverage** — verify meets 80/80/80/80 thresholds
6. **UX Polish — color system** — replace all `blue-*` / `gray-*` with accent / stone
7. **UX Polish — component reuse** — replace inline buttons/inputs with `Button`/`Input` components
8. **UX Polish — accessibility** — ARIA labels, roles, describedby
9. **UX Polish — flow improvements** — step indicator, loading states, mobile layouts
10. **UX Polish — animations** — fade-in for public pages, step transitions
11. **Write frontend unit tests** — all 8 page test files
12. **Write frontend BDD tests** — feature files + step definitions
13. **Write frontend architecture tests** — layer boundary rules
14. **Run frontend coverage** — verify meets 75/80/80/80 thresholds
15. **Full verification pass** — walk through all 30 acceptance criteria
16. **Visual review** — compare auth pages side-by-side with board pages for consistency

## What's NOT in this PRD

- **Functional changes to auth logic** — this PRD only polishes UI and adds tests; auth behavior stays as-is
- **New features** — no new auth capabilities added
- **E2E tests (Playwright/Cypress)** — deferred until E2E framework is set up
- **Performance testing** — not in scope
