# Update Pull Request Title and Description

Update an existing GitHub pull request with a concise title and reviewer-friendly description (max 10 bullet points).

## Context

- **Repository**: `sarthchawla/InZone`
- **Current branch**: `{{ git.currentBranch }}`
- **Platform**: GitHub

## Step 1: Identify the PR

Ask the user which PR to update:
- Use current branch to find PR automatically?
- Provide specific PR number?
- Search by title or branch name?

Current branch: `{{ git.currentBranch }}`

Use GitHub CLI to find the PR:

```bash
# Find PR for current branch
gh pr list --head {{ git.currentBranch }}

# Or view specific PR
gh pr view <number>
```

## Step 2: Analyze Changes

Analyze git diff and commit messages to understand what changed:

```bash
git diff origin/master...HEAD
git log origin/master..HEAD --oneline
```

Check existing PR description for any links/references to preserve:

```bash
gh pr view --json title,body
```

## Step 3: Generate Title

### Title Format
`[type]: Brief description`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Examples:
- `feat: Add board description with markdown support`
- `fix: Resolve task card click behavior`
- `test: Add BDD tests for column management`

**Guidelines:**
- Use conventional commit format
- Keep it concise and descriptive
- Focus on the main change or feature

## Step 4: Generate Concise Description

Create an updated description with the following format:

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

## Step 5: Update the PR

Use GitHub CLI:

```bash
# Update title only
gh pr edit <number> --title "[type]: New title"

# Update body only
gh pr edit <number> --body "$(cat <<'EOF'
## Summary
...

## Changes Made
...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# Update both
gh pr edit <number> --title "[type]: New title" --body "..."
```

## Step 6: Post-Update Verification with Agent-Browser CLI

After updating the PR, optionally verify the changes visually:

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
5. **Preserve Context:** Keep important links or references from original description

## Example Updated Description

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

After updating the PR, provide:
- PR URL
- Brief summary of what was updated
- Confirmation that both title and description follow the concise format

## Useful Commands

```bash
# View current PR details
gh pr view

# Edit PR interactively
gh pr edit

# Add reviewers
gh pr edit --add-reviewer username

# Add labels
gh pr edit --add-label "enhancement"

# Convert to ready (from draft)
gh pr ready
```
