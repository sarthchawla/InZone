# Project Claude Plugin Migration Plan

## Scope

Migrate the selected current-project Claude settings from `/Users/schawla/Documents/PersonalCode/InZone/.claude` into Codex-side artifacts under `/Users/schawla/Documents/PersonalCode/InZone`, with emphasis on plugin-related migration report items and any generated Codex artifacts the migrator can safely produce.

## Steps

1. Read the migrate-to-codex skill and migration differences reference.
2. Refresh current Codex docs for config, MCP, plugins, skills, subagents, and hooks because the local reference predates today.
3. Run scan, plan, and doctor checks against `.claude` -> `.codex`.
4. Run a dry migration, then the real migration.
5. Inspect `.codex/migrate-to-codex-report.txt` and generated Codex artifacts.
6. Resolve actionable generated-artifact manual migration blocks without editing source `.claude` files.
7. Validate `.codex` and rerun checks/dry-run until no actionable generated-artifact fixes remain.
8. Report the remaining non-native migration work as the skill requires.

## Completion Notes

- Migrated project Claude skills and slash commands into Codex-facing skills under `.agents/skills/`.
- Rewrote generated `## MANUAL MIGRATION REQUIRED` blocks in Codex skill files into `## Codex Usage Notes`.
- Left source `.claude/` files unchanged.
- Validation passed for `.codex/config.toml`, `AGENTS.md`, and all generated skill frontmatter.
- Remaining validator warnings are size warnings for the copied `vercel-react-best-practices/AGENTS.md` reference file and its original Claude source counterpart.
- A future full migrator write would regenerate the source-derived manual caveats unless the source Claude command/skill metadata is changed or the generated Codex files are preserved.
