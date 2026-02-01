import chalk from 'chalk';
import { Worktree } from '../types.js';
import { listWorktrees } from '../lib/registry.js';
import { isContainerRunning } from '../lib/docker.js';
import { pathExists } from '../lib/utils.js';

interface ListOptions {
  json?: boolean;
  verbose?: boolean;
}

/**
 * Format a date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Get the actual status of a worktree
 */
function getActualStatus(worktree: Worktree): string {
  // Check if path exists
  if (!pathExists(worktree.path)) {
    return chalk.red('missing');
  }

  // Check if DB container is running
  if (isContainerRunning(worktree.dbContainerName)) {
    return chalk.green('active');
  }

  return chalk.yellow('stopped');
}

/**
 * List command - shows all registered worktrees
 */
export async function list(options: ListOptions): Promise<void> {
  const worktrees = listWorktrees();

  if (worktrees.length === 0) {
    console.log(chalk.yellow('No worktrees registered.'));
    console.log('Use /worktree to create a new worktree.');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(worktrees, null, 2));
    return;
  }

  // Table header
  console.log(chalk.bold('\nRegistered Worktrees:\n'));
  console.log(
    '┌────────────────────┬──────────────────────────┬──────────────────────┬──────────┬──────────────┐'
  );
  console.log(
    '│ ' +
      chalk.bold('ID'.padEnd(18)) +
      ' │ ' +
      chalk.bold('Branch'.padEnd(24)) +
      ' │ ' +
      chalk.bold('Ports (F/B/D)'.padEnd(20)) +
      ' │ ' +
      chalk.bold('Status'.padEnd(8)) +
      ' │ ' +
      chalk.bold('Last Access'.padEnd(12)) +
      ' │'
  );
  console.log(
    '├────────────────────┼──────────────────────────┼──────────────────────┼──────────┼──────────────┤'
  );

  for (const wt of worktrees) {
    const ports = `${wt.ports.frontend}/${wt.ports.backend}/${wt.ports.database}`;
    const status = getActualStatus(wt);
    const lastAccess = formatDate(wt.lastAccessed);

    console.log(
      '│ ' +
        wt.id.substring(0, 18).padEnd(18) +
        ' │ ' +
        wt.branch.substring(0, 24).padEnd(24) +
        ' │ ' +
        ports.padEnd(20) +
        ' │ ' +
        status.padEnd(17) + // Extra padding for ANSI codes
        ' │ ' +
        lastAccess.padEnd(12) +
        ' │'
    );

    if (options.verbose) {
      console.log(
        '│   ' +
          chalk.dim(`Path: ${wt.path}`.substring(0, 90).padEnd(90)) +
          '   │'
      );
    }
  }

  console.log(
    '└────────────────────┴──────────────────────────┴──────────────────────┴──────────┴──────────────┘'
  );
  console.log(`\nTotal: ${worktrees.length} worktree(s)`);
}
