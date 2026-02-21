import chalk from 'chalk';
import { Worktree } from '../types.js';
import {
  sanitizeBranchName,
  getRepoRoot,
  runCommand,
  runCommandSafe,
} from '../lib/utils.js';
import {
  initRegistry,
  getWorktreeByBranch,
  addWorktree,
  getSettings,
} from '../lib/registry.js';
import { findAllPorts } from '../lib/port-allocator.js';
import { startDatabase, getAppContainerName, isDockerAvailable } from '../lib/docker.js';
import {
  branchExists,
  createBranch,
  getCurrentBranch,
  worktreeExistsForBranch,
  createWorktree,
  getWorktreePath,
  isValidBranchName,
} from '../lib/git.js';
import { generateAllConfigs } from '../lib/config-generator.js';

interface SetupOptions {
  branch?: string;
  source?: string;
  open?: boolean;
}

/**
 * Setup command - creates a new worktree with isolated environment
 */
export async function setup(options: SetupOptions): Promise<void> {
  try {
    console.log(chalk.blue('Setting up new worktree...\n'));

    // Check Docker is available
    if (!isDockerAvailable()) {
      throw new Error('Docker is not available. Please start Docker and try again.');
    }

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

    // Check if git worktree already exists
    if (worktreeExistsForBranch(branch)) {
      throw new Error(
        `Git worktree for branch '${branch}' already exists. ` +
          `Use 'git worktree list' to see all worktrees.`
      );
    }

    // Get source branch
    const sourceBranch = options.source || getCurrentBranch();
    console.log(`Creating worktree for '${branch}' from '${sourceBranch}'...`);

    // Create branch if it doesn't exist
    if (!branchExists(branch)) {
      console.log(`Creating branch '${branch}' from '${sourceBranch}'...`);
      createBranch(branch, sourceBranch);
    }

    // Generate worktree ID
    const worktreeId = sanitizeBranchName(branch);
    console.log(`Worktree ID: ${worktreeId}`);

    // Allocate ports
    console.log('Allocating ports...');
    const ports = findAllPorts();
    console.log(
      `  Frontend: ${ports.frontend}, Backend: ${ports.backend}, Database: ${ports.database}`
    );

    // Get paths
    const mainRepoPath = getRepoRoot();
    const worktreePath = getWorktreePath(settings.worktreeBaseDir, worktreeId);

    // Create git worktree
    console.log(`\nCreating git worktree at ${worktreePath}...`);
    createWorktree(worktreePath, branch);

    // Start database container on host
    console.log('\nStarting database container on host...');
    const dbContainerName = await startDatabase(worktreeId, ports.database);

    // Generate configuration files
    console.log('\nGenerating configuration files...');
    generateAllConfigs(worktreePath, worktreeId, ports, mainRepoPath);

    // Run migrations
    console.log('\nRunning database migrations...');
    try {
      runCommand('pnpm', ['install'], { stdio: 'inherit' });
      runCommand('pnpm', ['run', 'db:migrate:deploy'], { stdio: 'inherit' });
      runCommand('pnpm', ['run', 'db:seed'], { stdio: 'inherit' });
    } catch (error) {
      console.log(chalk.yellow('Warning: Could not run migrations/seed. Run them manually.'));
    }

    // Register worktree
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
    console.log(chalk.cyan(`  Option A (Direct): cd ${worktreePath} && pnpm dev`));
    console.log(chalk.cyan('  Option B (DevContainer): Click "Reopen in Container" in VS Code/Cursor'));
  } catch (error) {
    console.error(chalk.red('\n✗ Setup failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
