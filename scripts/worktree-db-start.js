#!/usr/bin/env node

/**
 * Standalone script to start the database container for the current worktree.
 * Plain JS — no compilation needed, so it works in git worktrees where dist/ doesn't exist.
 *
 * Reads the worktree registry to find the current worktree by matching cwd,
 * then starts its database container if not already running.
 */

import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, sep } from 'path';

function getRegistryPath() {
  const gitCommonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    encoding: 'utf-8',
  }).trim();
  return join(gitCommonDir, 'inzone', 'worktree.json');
}

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

function main() {
  const registryPath = getRegistryPath();

  if (!existsSync(registryPath)) {
    console.error('Worktree registry not found at', registryPath);
    process.exit(1);
  }

  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
  const cwd = process.cwd();

  const worktree = registry.worktrees.find(
    (wt) => cwd === wt.path || cwd.startsWith(wt.path + sep)
  );

  if (!worktree) {
    console.error('Not inside a registered worktree. cwd:', cwd);
    process.exit(1);
  }

  const containerName = worktree.dbContainerName;
  const port = worktree.ports.database;

  console.log(`Starting database for worktree '${worktree.id}'...`);

  // Check if container is already running
  const running = run('docker', [
    'ps', '--filter', `name=^${containerName}$`, '--filter', 'status=running', '--format', '{{.Names}}'
  ]);

  if (running === containerName) {
    console.log(`Database already running (${containerName} on port ${port})`);
    return;
  }

  // Check if container exists but is stopped
  const exists = run('docker', [
    'ps', '-a', '--filter', `name=^${containerName}$`, '--format', '{{.Names}}'
  ]);

  if (exists === containerName) {
    console.log('Container exists but stopped, starting...');
    run('docker', ['start', containerName]);
  } else {
    // Create new container
    console.log(`Creating database container: ${containerName} on port ${port}`);
    const result = run('docker', [
      'run', '-d',
      '--name', containerName,
      '-p', `${port}:5432`,
      '-e', 'POSTGRES_USER=inzone',
      '-e', 'POSTGRES_PASSWORD=inzone_dev',
      '-e', 'POSTGRES_DB=inzone',
      '-v', `${containerName}:/var/lib/postgresql/data`,
      '--health-cmd', 'pg_isready -U inzone -d inzone',
      '--health-interval', '5s',
      '--health-timeout', '5s',
      '--health-retries', '10',
      'postgres:16-alpine',
    ]);

    if (!result) {
      console.error('Failed to create database container');
      process.exit(1);
    }
  }

  // Wait for database to be ready
  console.log('Waiting for database to be ready...');
  for (let i = 0; i < 30; i++) {
    const ready = run('docker', ['exec', containerName, 'pg_isready', '-U', 'inzone', '-d', 'inzone']);
    if (ready !== null) {
      console.log(`Database ready at localhost:${port} (container: ${containerName})`);
      return;
    }
    execFileSync('sleep', ['1']);
    process.stdout.write('.');
  }

  console.error('\nDatabase failed to become ready');
  process.exit(1);
}

main();
