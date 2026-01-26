# Create Pull Request with Smart Description

Create a GitHub pull request with a concise, reviewer-friendly description (max 10 bullet points).

## Context

- **Repository**: `sarthchawla/InZone`
- **Current branch**: `{{ git.currentBranch }}`
- **Platform**: GitHub

## Step 1: Branch Management

Ask the user about branch preference:
- Do they want to checkout a specific branch?
- Stay on the current branch?
- If they already mentioned a branch, use that

Current branch: `{{ git.currentBranch }}`

## Step 2: Check for Existing PR

Before creating a new PR, check if one already exists:

```bash
gh pr list --head {{ git.currentBranch }}
```

- If a PR exists and is:
  - **Open:** Inform the user and ask if they want to update the description
  - **Merged:** Inform the user that changes are already merged to main
  - **Closed:** Ask if they want to create a new PR or reopen
- If no PR exists, proceed to create a new one

## Step 3: Analyze Changes

Analyze git diff and commit messages to understand what changed:

```bash
git diff origin/master...HEAD
git log origin/master..HEAD --oneline
```

## Step 4: Generate Concise Description

Create a PR with the following format:

### Title Format
`[type]: Brief description`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Examples:
- `feat: Add board description with markdown support`
- `fix: Resolve task card click behavior`
- `test: Add BDD tests for column management`

### Description Format (MAX 10 BULLET POINTS)

```markdown
## Summary
Brief 1-2 sentence description of what this PR does.

## Changes Made
- [List 3-5 key changes with specific details]
- [Group by category if needed: Frontend, Backend, Database, Tests]
- [Be precise - avoid vague terms like "improved" or "fixed"]

## Technical Details (Optional - use ONE format if helpful)

**Option A - Before/After:**
- **Before:** Old behavior
- **After:** New behavior

**Option B - Table (for config/data changes):**
| Field | Before | After | Reason |
|-------|--------|-------|--------|
| ... | ... | ... | ... |

## Testing
- [ ] Unit tests pass (`pnpm test`)
- [ ] BDD tests pass (`pnpm test:bdd`)
- [ ] Manually verified with agent-browser CLI

## Related Links
- Issue: #123 (if applicable)
- Related PRs: #456 (if any)
```

**IMPORTANT:** Keep total bullet points under 10. Combine related items if needed.

## Step 5: Create the PR

Use GitHub CLI:

```bash
gh pr create \
  --title "[type]: Description" \
  --body "$(cat <<'EOF'
## Summary
...

## Changes Made
...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Or use the interactive mode:
```bash
gh pr create
```

## Step 6: Post-Creation Verification with Agent-Browser CLI

After creating the PR, optionally verify the changes visually:

```
browser_navigate → http://localhost:5173
browser_snapshot → Capture current state
browser_click → Test key features
browser_snapshot → Document final state
```

## Guidelines

1. **Be Precise:** Explain what and how, not just "fixed" or "improved"
2. **Use Visual Aids Sparingly:** Only if it significantly helps understanding
3. **Stay Concise:** Max 10 bullet points total across all sections
4. **Think Like a Reviewer:** What's the minimum info needed to review?

## Example PR Description

```markdown
## Summary
Add markdown-enabled descriptions to boards, swimlanes, and tasks with lazy-loading for performance.

## Changes Made
- Added `description` TEXT field to Board, Column, and Todo entities
- Implemented markdown editor component with toolbar (bold, italic, lists, code)
- Added lazy-loading for descriptions in list views (only fetch on detail view)
- Created API endpoints for description-only fetches (`GET /api/tasks/:id/description`)

## Technical Details
**Before:** No description fields on any entity
**After:** Full markdown support with GFM, lazy-loaded for performance

## Testing
- [x] Unit tests for markdown editor component
- [x] BDD tests for description CRUD operations
- [x] Manually verified with agent-browser CLI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Final Step

After creating the PR, provide:
- PR URL
- Brief summary
- Reminder to request reviewers if needed

## Useful Commands

```bash
# Create PR with current branch
gh pr create --fill

# Create PR and open in browser
gh pr create --web

# Create draft PR
gh pr create --draft

# View PR status
gh pr status
```
