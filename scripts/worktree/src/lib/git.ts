import * as path from 'path';
import { runCommand, runCommandSafe, getRepoRoot, pathExists } from './utils.js';

/**
 * Check if a branch exists locally or remotely
 */
export function branchExists(branch: string): boolean {
  // Check local
  const localResult = runCommandSafe('git', ['rev-parse', '--verify', branch]);
  if (localResult !== null) {
    return true;
  }

  // Check remote
  const remoteResult = runCommandSafe('git', ['rev-parse', '--verify', `origin/${branch}`]);
  return remoteResult !== null;
}

/**
 * Create a new branch from a source branch
 */
export function createBranch(branch: string, sourceBranch: string): void {
  // Fetch latest from remote
  runCommandSafe('git', ['fetch', 'origin']);

  // Check if source branch exists
  const sourceRef = branchExists(sourceBranch) ? sourceBranch : `origin/${sourceBranch}`;

  // Create the branch
  runCommand('git', ['branch', branch, sourceRef]);
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(): string {
  const result = runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  return result.trim();
}

/**
 * List all git worktrees
 */
export function listGitWorktrees(): Array<{ path: string; branch: string }> {
  const result = runCommand('git', ['worktree', 'list', '--porcelain']);
  const worktrees: Array<{ path: string; branch: string }> = [];
  let currentWorktree: { path?: string; branch?: string } = {};

  for (const line of result.split('\n')) {
    if (line.startsWith('worktree ')) {
      currentWorktree.path = line.substring(9);
    } else if (line.startsWith('branch ')) {
      currentWorktree.branch = line.substring(7).replace('refs/heads/', '');
    } else if (line === '') {
      if (currentWorktree.path && currentWorktree.branch) {
        worktrees.push({
          path: currentWorktree.path,
          branch: currentWorktree.branch,
        });
      }
      currentWorktree = {};
    }
  }

  return worktrees;
}

/**
 * Check if a worktree exists for a branch
 */
export function worktreeExistsForBranch(branch: string): boolean {
  const worktrees = listGitWorktrees();
  return worktrees.some((w) => w.branch === branch);
}

/**
 * Create a new git worktree
 */
export function createWorktree(worktreePath: string, branch: string): void {
  // Ensure parent directory exists
  const parentDir = path.dirname(worktreePath);
  if (!pathExists(parentDir)) {
    runCommand('mkdir', ['-p', parentDir]);
  }

  // Create the worktree
  runCommand('git', ['worktree', 'add', worktreePath, branch]);
}

/**
 * Remove a git worktree
 */
export function removeWorktree(worktreePath: string): void {
  // Check if path exists in git worktree list
  const worktrees = listGitWorktrees();
  const exists = worktrees.some((w) => w.path === worktreePath);

  if (!exists) {
    console.log(`Worktree at ${worktreePath} not found in git, skipping removal`);
    return;
  }

  // Remove the worktree
  runCommand('git', ['worktree', 'remove', worktreePath, '--force']);
}

/**
 * Prune worktree references for deleted directories
 */
export function pruneWorktrees(): void {
  runCommand('git', ['worktree', 'prune']);
}

/**
 * Get the worktree base directory path
 */
export function getWorktreeBasePath(baseDir: string): string {
  const repoRoot = getRepoRoot();
  return path.resolve(repoRoot, baseDir);
}

/**
 * Generate worktree path for a given ID
 */
export function getWorktreePath(baseDir: string, worktreeId: string): string {
  const basePath = getWorktreeBasePath(baseDir);
  return path.join(basePath, worktreeId);
}

/**
 * Delete a branch (local only)
 */
export function deleteBranch(branch: string): void {
  runCommandSafe('git', ['branch', '-D', branch]);
}

/**
 * Validate branch name format
 */
export function isValidBranchName(branch: string): boolean {
  // Basic validation - no spaces, no special chars except / - _
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  return validPattern.test(branch);
}
