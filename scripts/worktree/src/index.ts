#!/usr/bin/env node

import { Command } from 'commander';
import { setup } from './commands/setup.js';
import { cleanup } from './commands/cleanup.js';
import { cleanupBulk } from './commands/cleanup-bulk.js';
import { list } from './commands/list.js';
import { sync } from './commands/sync.js';

const program = new Command();

program
  .name('worktree')
  .description('Manage git worktrees with isolated development environments')
  .version('2.0.0');

program
  .command('setup')
  .description('Create a new worktree with isolated ports and database')
  .option('-b, --branch <branch>', 'Branch name for the worktree')
  .option('-s, --source <branch>', 'Source branch to create from (default: current branch)')
  .option('--no-open', 'Do not open in editor after setup')
  .action(setup);

program
  .command('cleanup <target>')
  .description('Remove a worktree and free its resources')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(cleanup);

program
  .command('cleanup-bulk')
  .description('Remove multiple worktrees at once')
  .option('-a, --all', 'Remove all worktrees')
  .option('--stale <days>', 'Remove worktrees not accessed in N days')
  .option('--dry-run', 'Show what would be removed without actually removing')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(cleanupBulk);

program
  .command('list')
  .description('List all registered worktrees')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show additional details')
  .action(list);

program
  .command('sync')
  .description('Sync registry with filesystem (remove orphaned entries)')
  .option('--dry-run', 'Show orphaned entries without removing')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('-v, --verbose', 'Show detailed verification for each entry')
  .action(sync);

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.help();
}
