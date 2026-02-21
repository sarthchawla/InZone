import chalk from 'chalk';
import * as path from 'path';
import { initRegistry, listWorktrees } from '../lib/registry.js';
import { startDatabase, isDockerAvailable } from '../lib/docker.js';

/**
 * db-start command - starts the database container for the current worktree.
 * Determines which worktree we're in by matching cwd against registered worktree paths.
 */
export async function dbStart(): Promise<void> {
  try {
    const cwd = process.cwd();

    if (!isDockerAvailable()) {
      throw new Error('Docker is not available. Please start Docker and try again.');
    }

    initRegistry();
    const worktrees = listWorktrees();

    // Find which worktree we're in by checking if cwd is inside a registered path
    const worktree = worktrees.find((wt) => cwd.startsWith(wt.path + path.sep) || cwd === wt.path);

    if (!worktree) {
      throw new Error(
        `Not inside a registered worktree. cwd: ${cwd}\n` +
          `Registered worktrees: ${worktrees.map((wt) => wt.path).join(', ') || 'none'}`
      );
    }

    console.log(chalk.blue(`Starting database for worktree '${worktree.id}'...`));
    await startDatabase(worktree.id, worktree.ports.database);
    console.log(
      chalk.green(`Database ready at localhost:${worktree.ports.database} (container: ${worktree.dbContainerName})`)
    );
  } catch (error) {
    console.error(chalk.red('Failed to start database:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
