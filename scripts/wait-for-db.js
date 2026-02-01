#!/usr/bin/env node

/**
 * Wait for the PostgreSQL database container to be ready.
 * Uses execFileSync (safer than execSync - no shell injection risk).
 */

const { execFileSync } = require('child_process');

const MAX_RETRIES = 30;
const RETRY_INTERVAL_MS = 1000;
const CONTAINER_NAME = 'inzone-db';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkDockerRunning() {
  try {
    execFileSync('docker', ['info'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkContainerExists() {
  try {
    const result = execFileSync('docker', ['ps', '-a', '--format', '{{.Names}}'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.split('\n').includes(CONTAINER_NAME);
  } catch {
    return false;
  }
}

function checkDbReady() {
  try {
    execFileSync('docker', [
      'exec',
      CONTAINER_NAME,
      'pg_isready',
      '-U', 'inzone',
      '-d', 'inzone'
    ], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function waitForDb() {
  console.log('Checking database readiness...');

  // Check if Docker is running
  if (!checkDockerRunning()) {
    console.error('Error: Docker is not running. Please start Docker and try again.');
    process.exit(1);
  }

  // Check if container exists
  if (!checkContainerExists()) {
    console.error(`Error: Container "${CONTAINER_NAME}" not found.`);
    console.error('Run "pnpm run db:start" to start the database container.');
    process.exit(1);
  }

  console.log(`Waiting for ${CONTAINER_NAME} to be ready...`);

  for (let i = 0; i < MAX_RETRIES; i++) {
    if (checkDbReady()) {
      console.log('\nDatabase is ready!');
      process.exit(0);
    }
    process.stdout.write('.');
    await sleep(RETRY_INTERVAL_MS);
  }

  console.error(`\nDatabase failed to become ready after ${MAX_RETRIES} attempts.`);
  console.error('Check container logs with: pnpm run db:logs');
  process.exit(1);
}

waitForDb();
