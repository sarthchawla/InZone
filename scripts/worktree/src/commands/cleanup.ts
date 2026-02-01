import chalk from 'chalk';
import * as readline from 'readline';
import { Worktree } from '../types.js';
import {
  getWorktree,
  getWorktreeByBranch,
  removeWorktree,
  listWorktrees,
} from '../lib/registry.js';
import { removeDatabase, removeDevcontainer } from '../lib/docker.js';
import { removeWorktree as removeGitWorktree, pruneWorktrees } from '../lib/git.js';
import { sanitizeBranchName, pathExists } from '../lib/utils.js';

interface CleanupOptions {
  force?: boolean;
  all?: boolean;
  stale?: string;
  dryRun?: boolean;
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
 * Calculate days since last access
 */
function daysSinceAccess(worktree: Worktree): number {
  const lastAccess = new Date(worktree.lastAccessed);
  const now = new Date();
  const diffMs = now.getTime() - lastAccess.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Remove a single worktree and its resources
 */
async function removeSingleWorktree(
  worktree: Worktree,
  options: { dryRun?: boolean; verbose?: boolean }
): Promise<boolean> {
  if (options.dryRun) {
    console.log(chalk.dim(`  Would remove: ${worktree.id}`));
    return true;
  }

  try {
    // Remove database
    if (options.verbose) console.log('Stopping database container...');
    try {
      removeDatabase(worktree.id);
      if (options.verbose) console.log(chalk.green('  ✓ Database container removed'));
    } catch {
      if (options.verbose) console.log(chalk.yellow('  ⚠ Could not remove database'));
    }

    // Remove devcontainer
    if (options.verbose) console.log('Stopping devcontainer...');
    try {
      removeDevcontainer(worktree.id);
      if (options.verbose) console.log(chalk.green('  ✓ Devcontainer removed'));
    } catch {
      if (options.verbose) console.log(chalk.yellow('  ⚠ Could not remove devcontainer'));
    }

    // Remove git worktree
    if (options.verbose) console.log('Removing git worktree...');
    try {
      if (pathExists(worktree.path)) {
        removeGitWorktree(worktree.path);
        if (options.verbose) console.log(chalk.green('  ✓ Git worktree removed'));
      } else {
        if (options.verbose) console.log(chalk.yellow('  ⚠ Worktree path does not exist'));
      }
    } catch {
      if (options.verbose) console.log(chalk.yellow('  ⚠ Could not remove git worktree'));
    }

    // Remove from registry
    if (options.verbose) console.log('Removing from registry...');
    removeWorktree(worktree.id);
    if (options.verbose) console.log(chalk.green('  ✓ Registry entry removed'));

    if (!options.verbose) {
      console.log(chalk.green(`  ✓ Removed: ${worktree.id}`));
    }
    return true;
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed: ${worktree.id} - ${error}`));
    return false;
  }
}

/**
 * Cleanup a specific worktree by ID or branch name
 */
async function cleanupSingle(target: string, options: CleanupOptions): Promise<void> {
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

  await removeSingleWorktree(worktree, { verbose: true });

  // Prune git worktrees
  pruneWorktrees();

  // Print summary
  console.log(chalk.green(`\n✓ Worktree '${worktree.id}' removed successfully!\n`));
  console.log('Freed resources:');
  console.log(`  - Frontend port: ${worktree.ports.frontend}`);
  console.log(`  - Backend port:  ${worktree.ports.backend}`);
  console.log(`  - Database port: ${worktree.ports.database}`);
  console.log(`\nNote: Branch '${worktree.branch}' was not deleted. Delete manually if needed:`);
  console.log(chalk.dim(`  git branch -D ${worktree.branch}`));
}

/**
 * Cleanup multiple worktrees (interactive or via flags)
 */
async function cleanupMultiple(options: CleanupOptions): Promise<void> {
  const allWorktrees = listWorktrees();

  if (allWorktrees.length === 0) {
    console.log(chalk.yellow('No worktrees registered.'));
    return;
  }

  let worktreesToRemove: Worktree[] = [];

  // Determine which worktrees to remove
  if (options.all) {
    worktreesToRemove = allWorktrees;
  } else if (options.stale) {
    const staleDays = parseInt(options.stale, 10);
    if (isNaN(staleDays) || staleDays < 1) {
      console.error(chalk.red('Invalid --stale value. Use a positive number of days.'));
      process.exit(1);
    }
    worktreesToRemove = allWorktrees.filter((wt) => daysSinceAccess(wt) >= staleDays);

    if (worktreesToRemove.length === 0) {
      console.log(chalk.green(`No worktrees inactive for ${staleDays}+ days.`));
      return;
    }
  } else {
    // Interactive mode - show all and let user choose
    console.log(chalk.bold('\nSelect worktrees to remove:\n'));
    console.log(
      '┌────┬────────────────────┬──────────────────────────┬──────────────────┐'
    );
    console.log(
      '│ #  │ ID                 │ Branch                   │ Last Access      │'
    );
    console.log(
      '├────┼────────────────────┼──────────────────────────┼──────────────────┤'
    );

    allWorktrees.forEach((wt, index) => {
      const days = daysSinceAccess(wt);
      const lastAccess = days === 0 ? 'today' : `${days} days ago`;
      console.log(
        `│ ${String(index + 1).padStart(2)} │ ${wt.id.substring(0, 18).padEnd(18)} │ ${wt.branch.substring(0, 24).padEnd(24)} │ ${lastAccess.padEnd(16)} │`
      );
    });

    console.log(
      '└────┴────────────────────┴──────────────────────────┴──────────────────┘'
    );

    console.log('\nEnter numbers to remove (e.g., "1,3" or "1-3"), "all", or "cancel":');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('> ', (ans) => {
        rl.close();
        resolve(ans.trim().toLowerCase());
      });
    });

    if (answer === 'cancel' || answer === '') {
      console.log('Cancelled.');
      return;
    }

    if (answer === 'all') {
      worktreesToRemove = allWorktrees;
    } else {
      // Parse selection (e.g., "1,3,5" or "1-3")
      const indices = new Set<number>();
      const parts = answer.split(',');

      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
          for (let i = start; i <= end; i++) {
            indices.add(i);
          }
        } else {
          indices.add(parseInt(part.trim(), 10));
        }
      }

      worktreesToRemove = allWorktrees.filter((_, i) => indices.has(i + 1));
    }
  }

  if (worktreesToRemove.length === 0) {
    console.log(chalk.yellow('No worktrees selected.'));
    return;
  }

  // Show what will be removed
  console.log(chalk.bold(`\n${options.dryRun ? '[DRY RUN] ' : ''}Worktrees to remove:\n`));
  for (const wt of worktreesToRemove) {
    console.log(`  - ${wt.id} (${wt.branch})`);
    console.log(chalk.dim(`    Ports: ${wt.ports.frontend}/${wt.ports.backend}/${wt.ports.database}`));
  }

  // Confirm unless --force or --dry-run
  if (!options.force && !options.dryRun) {
    const confirmed = await confirm(
      chalk.yellow(`\nRemove ${worktreesToRemove.length} worktree(s)?`)
    );
    if (!confirmed) {
      console.log('Cancelled.');
      return;
    }
  }

  // Remove worktrees
  console.log(chalk.blue('\nRemoving worktrees...\n'));
  let successCount = 0;
  let failCount = 0;

  for (const wt of worktreesToRemove) {
    const success = await removeSingleWorktree(wt, { dryRun: options.dryRun });
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Prune git worktrees
  if (!options.dryRun) {
    pruneWorktrees();
  }

  // Print summary
  if (options.dryRun) {
    console.log(chalk.blue(`\n[DRY RUN] Would remove ${successCount} worktree(s)`));
  } else {
    console.log(chalk.green(`\n✓ Removed ${successCount} worktree(s)`));
    if (failCount > 0) {
      console.log(chalk.yellow(`⚠ Failed to remove ${failCount} worktree(s)`));
    }
  }
}

/**
 * Unified cleanup command - handles both single and multiple worktrees
 *
 * Usage:
 *   cleanup <id>           - Remove specific worktree
 *   cleanup                - Interactive selection
 *   cleanup --all          - Remove all worktrees
 *   cleanup --stale 30     - Remove worktrees inactive for 30+ days
 */
export async function cleanup(target: string | undefined, options: CleanupOptions): Promise<void> {
  try {
    if (target) {
      // Single worktree cleanup
      await cleanupSingle(target, options);
    } else {
      // Multiple worktree cleanup (interactive or via flags)
      await cleanupMultiple(options);
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Cleanup failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
