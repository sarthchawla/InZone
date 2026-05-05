# InZone MCP CRUD Server + Self-Service Tokens Plan

## Summary

- Add an `apps/mcp` workspace package exposing Streamable HTTP MCP at `/api/mcp` for self-scoped `Users`, `Boards`, and `Todos`.
- Replace the single shared-token idea with per-user MCP tokens generated from the logged-in app UI.
- Save this plan in `.codex/plans/mcp-vercel-crud-plan.md`.

## Key Changes

- Add Prisma model `McpToken` with `id`, `userId`, `name`, hashed token, optional `expiresAt`, `lastUsedAt`, `revokedAt`, timestamps, and relation to `User`.
- Add authenticated REST endpoints under `/api/mcp-tokens`:
  - `GET /api/mcp-tokens` lists current user's token metadata only.
  - `POST /api/mcp-tokens` creates a token for the current user and returns the raw token once.
  - `DELETE /api/mcp-tokens/:id` revokes one of the current user's tokens.
- Add a Settings page "MCP Access" section:
  - Show current `MCP_IMPERSONATED_USER_ID` as the logged-in user id.
  - Let users create named tokens with configurable expiry: 30 days, 90 days, 1 year, or no expiry.
  - Show the generated token once with copy controls and a small MCP connection snippet.
  - List existing tokens with name, expiry, last used, and revoke action.
- Implement MCP auth by validating `Authorization: Bearer <token>` against hashed `McpToken` rows; derive the impersonated user from the token's `userId`, not from a client-supplied value.
- Implement MCP tools with Zod schemas and read/write/destructive annotations:
  - User: `get-current-user`, `update-current-user`, `delete-current-user`.
  - Boards: `list-boards`, `get-board`, `create-board`, `update-board`, `delete-board`.
  - Todos: `list-todos`, `get-todo`, `create-todo`, `update-todo`, `delete-todo`.
- Mount the MCP router through the existing Express/Vercel path so Vercel continues using the current root `api/index.ts` and `/api/:path*` rewrite.

## Testing

- Backend/API unit tests for token creation, one-time raw token response, hash storage, expiry validation, revocation, ownership, and auth failures.
- MCP unit tests for schema validation, user scoping, expired/revoked token rejection, `lastUsedAt` update, and safe cross-user denial.
- Frontend tests for Settings MCP section: list tokens, create token with each expiry option, copy/display once, revoke token, and error states.
- BDD tests:
  - Logged-in user generates and revokes MCP tokens.
  - Valid MCP token can manage only that user's boards and todos.
  - Expired, revoked, missing, and malformed tokens cannot call MCP tools.
  - Another user's board/todo is not accessible through a valid token.
- CI updates for `apps/mcp/**`, token routes, Prisma schema, frontend Settings changes, and lockfile changes. Keep existing coverage thresholds unchanged.

## Assumptions

- "Tasks" means the existing `Todo` model.
- MCP user operations are self-scoped; no admin-wide user CRUD in this phase.
- Columns, labels, templates, invites, sessions, and accounts remain out of scope.
- Tokens are stored hashed, shown only once, and revocation is immediate.
