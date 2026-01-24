# Plan: Prepare InZone Project for Claude Code + Ralph Automation

## Goal
Configure the devcontainer and project structure to:
1. Run Claude Code inside the devcontainer (with `--dangerously-skip-permissions` for unattended mode)
2. Enable Ralph Wiggum autonomous automation via bash scripting
3. Integrate Playwright MCP for browser automation
4. Create structure ready to accept a PRD

---

## Current State
- **Devcontainer**: Node.js 20, Claude Code CLI, firewall rules, zsh (based on official Anthropic reference)
- **Permissions**: Basic `.claude/settings.local.json` (only gh commands)
- **Missing**: MCP config, Playwright, Ralph infrastructure, PRD template

**Key Insight**: The devcontainer's firewall isolation enables `--dangerously-skip-permissions` flag, allowing Claude to run unattended without permission prompts - essential for Ralph automation.

---

## Implementation Plan

### 1. Update Dockerfile for Playwright Support
**File**: `.devcontainer/Dockerfile`

Add Playwright and browser dependencies:
- Install Playwright globally via npm
- Install Chromium browser dependencies (via `npx playwright install-deps chromium`)
- Update WORKDIR from `/workspace` to `/InZone-App`

### 2. Update Firewall for Playwright + Custom Domains
**File**: `.devcontainer/init-firewall.sh`

Add domains to allowlist:
- `playwright.azureedge.net` (browser downloads)
- `playwright-cdn.azureedge.net`
- `genai-gateway.agoda.is` (Agoda GenAI gateway for Claude)

### 3. Create MCP Configuration
**File**: `.mcp.json` (new)

Configure Playwright MCP server:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-playwright", "--headless"]
    }
  }
}
```

### 4. Update Claude Sandbox Settings
**File**: `.claude/settings.local.json`

Expand permissions for Ralph automation:
- File read/write operations
- Bash commands for git, npm, server operations
- MCP server access
- Deny sensitive paths (.env, credentials)

### 5. Create Ralph Infrastructure (Bash Loop Method)
**New Files**:

| File | Purpose |
|------|---------|
| `ralph.sh` | Bash loop script calling `claude --dangerously-skip-permissions` iteratively |
| `PROMPT.md` | Instructions for each Claude iteration (references @docs/PRD.md, @docs/plan.md) |
| `docs/PRD.md` | Template for Product Requirements Document |
| `docs/plan.md` | Task tracking with pass/fail states (JSON format) |
| `activity.md` | Session log (auto-populated by Claude) |
| `screenshots/` | Directory for Playwright screenshots |

**Ralph Script Key Features**:
- Fresh context per iteration (prevents hallucination buildup)
- Configurable max iterations (e.g., `./ralph.sh 20`)
- Completion phrase detection to exit loop early
- Uses `--dangerously-skip-permissions` for unattended operation

### 6. Update .gitignore
**File**: `.gitignore`

Add entries:
- `screenshots/` (large binary files)
- `activity.md` (session-specific logs)
- `.claude/` (local settings, not project-level)

---

## Files Modified/Created

| Action | File |
|--------|------|
| Modified | `.devcontainer/Dockerfile` |
| Modified | `.devcontainer/init-firewall.sh` |
| Modified | `.claude/settings.local.json` |
| Modified | `.gitignore` |
| Created | `.mcp.json` |
| Created | `ralph.sh` |
| Created | `PROMPT.md` |
| Created | `docs/PRD.md` (template) |
| Created | `docs/plan.md` (template) |
| Created | `activity.md` |
| Created | `screenshots/.gitkeep` |
| Created | `.claude/plans/` directory |

---

## Verification Steps

1. **Rebuild devcontainer**: Ensure it builds without errors
2. **Test Playwright**: Run `npx playwright --version` inside container
3. **Test MCP**: Verify Claude recognizes the Playwright MCP server
4. **Test firewall**: Confirm Playwright domains are accessible
5. **Dry run Ralph**: Execute `./ralph.sh 1` for single iteration test

---

## Decisions Made

| Question | Answer |
|----------|--------|
| PRD/plan location | `docs/` folder |
| Ralph method | Bash loop (fresh context per iteration) |
| Custom firewall domains | `genai-gateway.agoda.is` |

---

## Status: IMPLEMENTED
Date: 2026-01-24
