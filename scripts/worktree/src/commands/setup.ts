import chalk from 'chalk';
import { existsSync, readdirSync, realpathSync, rmdirSync } from 'fs';
import * as path from 'path';
import { Worktree } from '../types.js';
import {
  sanitizeBranchName,
  getRepoRoot,
  runCommandSafe,
} from '../lib/utils.js';
import {
  initRegistry,
  getWorktreeByBranch,
  addWorktree,
  getSettings,
} from '../lib/registry.js';
import { findAllPorts } from '../lib/port-allocator.js';
import { getDbContainerName, getAppContainerName } from '../lib/docker.js';
import {
  branchExists,
  checkoutBranch,
  createBranch,
  getCurrentBranch,
  createWorktree,
  getWorktreePath,
  isLinkedWorktree,
  isValidBranchName,
  listGitWorktrees,
} from '../lib/git.js';
import { generateAllConfigs } from '../lib/config-generator.js';

interface SetupOptions {
  branch?: string;
  source?: string;
  path?: string;
  open?: boolean;
}

function normalizePathForComparison(targetPath: string): string {
  return existsSync(targetPath) ? realpathSync(targetPath) : path.resolve(targetPath);
}

function prepareCustomWorktreePath(worktreePath: string): void {
  if (!existsSync(worktreePath)) {
    return;
  }

  const entries = readdirSync(worktreePath);
  if (entries.length > 0) {
    throw new Error(
      `Target path already exists and is not empty: ${worktreePath}. ` +
        'Choose an empty Codex worktree path or clean it up before retrying.'
    );
  }

  rmdirSync(worktreePath);
}

/**
 * Setup command - creates a new worktree with isolated environment.
 * Only creates the git worktree, generates config files, and registers it.
 * Database startup, migrations, and seeding happen on first `pnpm dev`.
 */
export async function setup(options: SetupOptions): Promise<void> {
  try {
    console.log(chalk.blue('Setting up new worktree...\n'));

    // Initialize registry
    initRegistry();
    const settings = getSettings();

    // Get branch name
    const branch = options.branch;
    if (!branch) {
      throw new Error('Branch name is required. Use --branch <name>');
    }

    // Validate branch name
    if (!isValidBranchName(branch)) {
      throw new Error(
        `Invalid branch name: '${branch}'. Use alphanumeric characters, '/', '-', '_' only.`
      );
    }

    // Check if worktree already exists for this branch
    const existingWorktree = getWorktreeByBranch(branch);
    if (existingWorktree) {
      throw new Error(
        `Worktree for branch '${branch}' already exists at ${existingWorktree.path}. ` +
          `Use /worktree-list to see all worktrees.`
      );
    }

    // Get source branch
    const sourceBranch = options.source || getCurrentBranch();
    console.log(`Creating worktree for '${branch}' from '${sourceBranch}'...`);

    // Get paths
    const mainRepoPath = getRepoRoot();
    const worktreeId = sanitizeBranchName(branch);
    const worktreePath = options.path
      ? path.resolve(options.path)
      : getWorktreePath(settings.worktreeBaseDir, worktreeId);
    const normalizedWorktreePath = normalizePathForComparison(worktreePath);
    const normalizedMainRepoPath = normalizePathForComparison(mainRepoPath);
    const isCurrentCheckoutTarget = normalizedWorktreePath === normalizedMainRepoPath;

    if (options.path && isCurrentCheckoutTarget && !isLinkedWorktree()) {
      throw new Error(`Refusing to use main repository path as a worktree target: ${worktreePath}`);
    }

    const existingGitWorktree = listGitWorktrees().find((worktree) => worktree.branch === branch);
    if (
      existingGitWorktree &&
      (!isCurrentCheckoutTarget ||
        normalizePathForComparison(existingGitWorktree.path) !== normalizedWorktreePath)
    ) {
      throw new Error(
        `Git worktree for branch '${branch}' already exists at ${existingGitWorktree.path}. ` +
          `Use 'git worktree list' to see all worktrees.`
      );
    }

    // Create branch if it doesn't exist
    if (!branchExists(branch)) {
      console.log(`Creating branch '${branch}' from '${sourceBranch}'...`);
      createBranch(branch, sourceBranch);
    }

    // Generate worktree ID
    console.log(`Worktree ID: ${worktreeId}`);

    // Allocate ports
    console.log('Allocating ports...');
    const ports = findAllPorts();
    console.log(
      `  Frontend: ${ports.frontend}, Backend: ${ports.backend}, Database: ${ports.database}`
    );

    // Create git worktree
    if (isCurrentCheckoutTarget) {
      console.log(`\nUsing existing git worktree at ${worktreePath}...`);
      checkoutBranch(branch);
    } else {
      console.log(`\nCreating git worktree at ${worktreePath}...`);
      if (options.path) {
        prepareCustomWorktreePath(worktreePath);
      }
      createWorktree(worktreePath, branch);
    }

    // Generate configuration files
    console.log('\nGenerating configuration files...');
    generateAllConfigs(worktreePath, worktreeId, ports, mainRepoPath);

    // Register worktree
    const dbContainerName = getDbContainerName(worktreeId);
    console.log('\nRegistering worktree...');
    const worktreeEntry: Omit<Worktree, 'createdAt' | 'lastAccessed'> = {
      id: worktreeId,
      branch,
      sourceBranch,
      path: worktreePath,
      ports,
      dbContainerName,
      appContainerName: getAppContainerName(worktreeId),
      status: 'active',
    };
    addWorktree(worktreeEntry);

    // Open in editor
    if (options.open !== false) {
      console.log('\nOpening in editor...');
      runCommandSafe('cursor', [worktreePath]);
    }

    // Print success message
    console.log(chalk.green(`\n✓ Worktree '${branch}' is ready!\n`));
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log(`│ Path:      ${worktreePath.padEnd(45)} │`);
    console.log(`│ Frontend:  http://localhost:${String(ports.frontend).padEnd(29)} │`);
    console.log(`│ Backend:   http://localhost:${String(ports.backend).padEnd(29)} │`);
    console.log(`│ Database:  localhost:${String(ports.database).padEnd(35)} │`);
    console.log(`│ DB Container: ${dbContainerName.padEnd(42)} │`);
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('\nTo start developing:');
    console.log(chalk.cyan(`  cd ${worktreePath} && pnpm dev`));
    console.log(chalk.gray('\nNote: pnpm dev will start the DB, run migrations, and launch the app.'));
  } catch (error) {
    console.error(chalk.red('\n✗ Setup failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
