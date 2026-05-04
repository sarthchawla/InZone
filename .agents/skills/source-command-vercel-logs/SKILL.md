---
name: "source-command-vercel-logs"
description: "Run the migrated source command `vercel-logs`."
---

# source-command-vercel-logs

Use this skill when the user asks to run the migrated source command `vercel-logs`.

## Command Template

# Vercel Deployment Logs

Fetch recent Vercel deployment logs to identify runtime errors and warnings that don't fail the build.

## Prerequisites

- Vercel CLI installed (`pnpm add -g vercel`)
- Authenticated (`vercel login` or `VERCEL_TOKEN` env var set)
- Project linked (`vercel link` in project root)

## Steps

1. **List recent deployments**:
   ```bash
   vercel ls --limit 5
   ```

2. **Get logs from the most recent deployment** (or a specific one if the user provides a URL):
   ```bash
   vercel logs <deployment-url> --since 1h
   ```

3. **Analyze the logs**:
   - Look for runtime errors, unhandled exceptions, and warnings
   - Identify patterns (repeated errors, specific endpoints failing)
   - Check for serverless function timeouts or memory issues

4. **Propose fixes**:
   - For each identified issue, trace it to the source code
   - Suggest specific code changes with file paths and line numbers
   - Prioritize by severity (errors before warnings)

## Usage

If the Vercel CLI is not authenticated, instruct the user to run:
```bash
vercel login
vercel link
```

Then re-run this command.

## Codex Usage Notes

Use this skill when the user asks to inspect Vercel logs. Treat any text after the command name as the deployment URL, project, time window, or error context. Resolve deployment details from the user's request and available repo/config context before running commands.
