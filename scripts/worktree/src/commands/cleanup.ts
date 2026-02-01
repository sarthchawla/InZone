import chalk from 'chalk';
import * as readline from 'readline';
import { getWorktree, getWorktreeByBranch, removeWorktree } from '../lib/registry.js';
import { removeDatabase } from '../lib/docker.js';
import { removeWorktree as removeGitWorktree, pruneWorktrees } from '../lib/git.js';
import { sanitizeBranchName, pathExists } from '../lib/utils.js';

interface CleanupOptions {
  force?: boolean;
}

/**
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Cleanup command - removes a worktree and frees its resources
 */
export async function cleanup(target: string, options: CleanupOptions): Promise<void> {
  try {
    // Try to find worktree by ID first, then by branch name
    let worktree = getWorktree(target);
    if (!worktree) {
      worktree = getWorktreeByBranch(target);
    }
    if (!worktree) {
      // Try sanitizing the input as a branch name
      const sanitized = sanitizeBranchName(target);
      worktree = getWorktree(sanitized);
    }

    if (!worktree) {
      console.error(chalk.red(`Worktree '${target}' not found.`));
      console.log('Use /worktree-list to see all registered worktrees.');
      process.exit(1);
    }

    console.log(chalk.blue(`\nPreparing to remove worktree: ${worktree.id}\n`));
    console.log(`  Branch:   ${worktree.branch}`);
    console.log(`  Path:     ${worktree.path}`);
    console.log(`  Ports:    ${worktree.ports.frontend}/${worktree.ports.backend}/${worktree.ports.database}`);
    console.log(`  Database: ${worktree.dbContainerName}`);

    // Confirm unless --force
    if (!options.force) {
      const confirmed = await confirm(
        chalk.yellow('\nThis will remove the worktree, database, and free allocated ports. Continue?')
      );
      if (!confirmed) {
        console.log('Cancelled.');
        return;
      }
    }

    console.log(chalk.blue('\nRemoving worktree resources...\n'));

    // Stop and remove database container
    console.log('Stopping database container...');
    try {
      removeDatabase(worktree.id);
      console.log(chalk.green('  ✓ Database container removed'));
    } catch (error) {
      console.log(chalk.yellow(`  ⚠ Could not remove database: ${error}`));
    }

    // Remove git worktree
    console.log('Removing git worktree...');
    try {
      if (pathExists(worktree.path)) {
        removeGitWorktree(worktree.path);
        console.log(chalk.green('  ✓ Git worktree removed'));
      } else {
        console.log(chalk.yellow('  ⚠ Worktree path does not exist, skipping'));
        pruneWorktrees();
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠ Could not remove git worktree: ${error}`));
      pruneWorktrees();
    }

    // Optionally delete the branch
    // Note: We don't delete the branch by default as the user may want to keep it

    // Remove from registry
    console.log('Removing from registry...');
    removeWorktree(worktree.id);
    console.log(chalk.green('  ✓ Registry entry removed'));

    // Print summary
    console.log(chalk.green(`\n✓ Worktree '${worktree.id}' removed successfully!\n`));
    console.log('Freed resources:');
    console.log(`  - Frontend port: ${worktree.ports.frontend}`);
    console.log(`  - Backend port:  ${worktree.ports.backend}`);
    console.log(`  - Database port: ${worktree.ports.database}`);
    console.log(`\nNote: Branch '${worktree.branch}' was not deleted. Delete manually if needed:`);
    console.log(chalk.dim(`  git branch -D ${worktree.branch}`));
  } catch (error) {
    console.error(chalk.red('\n✗ Cleanup failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
