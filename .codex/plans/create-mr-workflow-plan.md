# Create MR Workflow Plan

## Scope

Create a GitHub pull request or GitLab merge request for the current branch using the migrated `$create-mr` workflow.

## Steps

1. Detect current branch, remote URL, hosting platform, and available CLI tooling.
2. Check whether an MR/PR already exists for the current branch.
3. Analyze changes against the detected default branch.
4. Generate a concise reviewer-friendly title and description.
5. Create the MR/PR if the branch is ready, or report the exact blocker.

## Guardrails

- Do not commit without user approval.
- Do not lower coverage thresholds.
- Keep the MR/PR description concise, with no more than 10 total bullet points.
