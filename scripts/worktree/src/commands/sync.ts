import chalk from 'chalk';
import * as readline from 'readline';
import { Worktree } from '../types.js';
import { listWorktrees, removeWorktree } from '../lib/registry.js';
import { listGitWorktrees, pruneWorktrees } from '../lib/git.js';
import { removeDatabase, listDbContainers, isContainerRunning, removeContainer } from '../lib/docker.js';
import { pathExists } from '../lib/utils.js';

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

interface OrphanedEntry {
  worktree: Worktree;
  reason: string;
}

interface StaleContainer {
  name: string;
  reason: string;
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
 * Verify a worktree entry
 */
function verifyEntry(worktree: Worktree, gitWorktrees: Array<{ path: string; branch: string }>): string | null {
  // Check if path exists
  if (!pathExists(worktree.path)) {
    return 'Path does not exist';
  }

  // Check if git recognizes it
  const inGit = gitWorktrees.some((gw) => gw.path === worktree.path);
  if (!inGit) {
    return 'Not in git worktree list';
  }

  return null; // Valid
}

/**
 * Sync command - synchronizes registry with filesystem
 */
export async function sync(options: SyncOptions): Promise<void> {
  try {
    console.log(chalk.blue('Scanning registry for orphaned entries...\n'));

    const registryWorktrees = listWorktrees();
    const gitWorktrees = listGitWorktrees();
    const dbContainers = listDbContainers();
    const registryIds = new Set(registryWorktrees.map((w) => w.id));

    // Find orphaned registry entries
    const orphanedEntries: OrphanedEntry[] = [];
    const validEntries: Worktree[] = [];

    for (const worktree of registryWorktrees) {
      const reason = verifyEntry(worktree, gitWorktrees);
      if (reason) {
        orphanedEntries.push({ worktree, reason });
      } else {
        validEntries.push(worktree);
      }
    }

    // Find stale containers (containers without registry entry)
    const staleContainers: StaleContainer[] = [];
    for (const container of dbContainers) {
      // Extract worktree ID from container name (inzone-db-wt-{id})
      const match = container.match(/^inzone-db-wt-(.+)$/);
      if (match) {
        const wtId = match[1];
        if (!registryIds.has(wtId)) {
          staleContainers.push({
            name: container,
            reason: 'No registry entry',
          });
        }
      }
    }

    // Print report
    console.log(chalk.bold('Registry Sync Report'));
    console.log('═════════════════════\n');
    console.log(`Valid worktrees:    ${validEntries.length}`);
    console.log(`Orphaned entries:   ${orphanedEntries.length}`);
    console.log(`Stale containers:   ${staleContainers.length}`);

    if (orphanedEntries.length === 0 && staleContainers.length === 0) {
      console.log(chalk.green('\n✓ Registry is in sync. No orphaned entries found.'));
      return;
    }

    // Show orphaned entries
    if (orphanedEntries.length > 0) {
      console.log(chalk.yellow('\nOrphaned entries found:\n'));
      console.log(
        '┌────────────────────┬──────────────────────────┬───────────────────────────┐'
      );
      console.log(
        '│ ID                 │ Branch                   │ Reason                    │'
      );
      console.log(
        '├────────────────────┼──────────────────────────┼───────────────────────────┤'
      );

      for (const { worktree, reason } of orphanedEntries) {
        console.log(
          `│ ${worktree.id.substring(0, 18).padEnd(18)} │ ${worktree.branch.substring(0, 24).padEnd(24)} │ ${reason.padEnd(25)} │`
        );
        if (options.verbose) {
          console.log(
            `│   ${chalk.dim(`Ports: ${worktree.ports.frontend}/${worktree.ports.backend}/${worktree.ports.database}`.padEnd(70))} │`
          );
        }
      }

      console.log(
        '└────────────────────┴──────────────────────────┴───────────────────────────┘'
      );
    }

    // Show stale containers
    if (staleContainers.length > 0) {
      console.log(chalk.yellow('\nStale containers found:\n'));
      for (const { name, reason } of staleContainers) {
        const running = isContainerRunning(name) ? chalk.green('running') : chalk.dim('stopped');
        console.log(`  - ${name} (${running}) - ${reason}`);
      }
    }

    // Dry run - just show what would happen
    if (options.dryRun) {
      console.log(chalk.blue('\n[DRY RUN] Would clean up the above entries.'));
      console.log('Run without --dry-run to actually remove them.');
      return;
    }

    // Confirm unless --force
    if (!options.force) {
      const confirmed = await confirm(
        chalk.yellow('\nRemove orphaned entries and stale containers?')
      );
      if (!confirmed) {
        console.log('Cancelled.');
        return;
      }
    }

    // Clean up orphaned entries
    console.log(chalk.blue('\nCleaning up...\n'));
    let freedPorts: number[] = [];

    for (const { worktree } of orphanedEntries) {
      console.log(`Removing orphaned entry: ${worktree.id}`);

      // Try to remove database container if it exists
      try {
        removeDatabase(worktree.id);
      } catch {
        // Ignore errors
      }

      // Remove from registry
      removeWorktree(worktree.id);
      freedPorts.push(worktree.ports.frontend, worktree.ports.backend, worktree.ports.database);

      console.log(chalk.green(`  ✓ Removed: ${worktree.id}`));
    }

    // Clean up stale containers
    for (const { name } of staleContainers) {
      console.log(`Removing stale container: ${name}`);
      try {
        removeContainer(name);
        console.log(chalk.green(`  ✓ Removed: ${name}`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not remove: ${name}`));
      }
    }

    // Prune git worktrees
    pruneWorktrees();

    // Print summary
    console.log(chalk.green(`\n✓ Cleanup complete!`));
    console.log(`  - Removed ${orphanedEntries.length} orphaned registry entries`);
    console.log(`  - Removed ${staleContainers.length} stale containers`);
    if (freedPorts.length > 0) {
      console.log(`  - Freed ${freedPorts.length} ports`);
    }
    console.log(`\nRegistry now has ${validEntries.length} valid worktree(s).`);
  } catch (error) {
    console.error(chalk.red('\n✗ Sync failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
