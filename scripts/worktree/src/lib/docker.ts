import { DB_CONFIG, CONTAINER_PREFIX } from '../types.js';
import { runCommand, runCommandSafe, sleep } from './utils.js';

/**
 * Get the database container name for a worktree
 */
export function getDbContainerName(worktreeId: string): string {
  return `${CONTAINER_PREFIX.db}${worktreeId}`;
}

/**
 * Get the app container name for a worktree (used in devcontainer)
 */
export function getAppContainerName(worktreeId: string): string {
  return `${CONTAINER_PREFIX.app}${worktreeId}`;
}

/**
 * Check if a container exists (running or stopped)
 */
export function containerExists(containerName: string): boolean {
  const result = runCommandSafe('docker', [
    'ps',
    '-a',
    '--filter',
    `name=^${containerName}$`,
    '--format',
    '{{.Names}}',
  ]);
  return result !== null && result.trim() === containerName;
}

/**
 * Check if a container is currently running
 */
export function isContainerRunning(containerName: string): boolean {
  const result = runCommandSafe('docker', [
    'ps',
    '--filter',
    `name=^${containerName}$`,
    '--filter',
    'status=running',
    '--format',
    '{{.Names}}',
  ]);
  return result !== null && result.trim() === containerName;
}

/**
 * Start an existing container
 */
export function startContainer(containerName: string): void {
  runCommand('docker', ['start', containerName]);
}

/**
 * Stop a running container
 */
export function stopContainer(containerName: string): void {
  runCommandSafe('docker', ['stop', containerName]);
}

/**
 * Remove a container
 */
export function removeContainer(containerName: string): void {
  runCommandSafe('docker', ['rm', '-f', containerName]);
}

/**
 * Remove a Docker volume
 */
export function removeVolume(volumeName: string): void {
  runCommandSafe('docker', ['volume', 'rm', '-f', volumeName]);
}

/**
 * Wait for database to be ready
 */
export async function waitForDatabase(
  containerName: string,
  maxAttempts: number = 30
): Promise<boolean> {
  console.log('Waiting for database to be ready...');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = runCommandSafe('docker', [
      'exec',
      containerName,
      'pg_isready',
      '-U',
      DB_CONFIG.user,
      '-d',
      DB_CONFIG.database,
    ]);

    if (result !== null) {
      console.log('Database is ready!');
      return true;
    }

    process.stdout.write('.');
    await sleep(1000);
  }

  console.log('\nDatabase failed to become ready');
  return false;
}

/**
 * Create and start a new database container on the host
 */
export async function startDatabase(worktreeId: string, port: number): Promise<string> {
  const containerName = getDbContainerName(worktreeId);
  const volumeName = containerName; // Use same name for volume

  console.log(`Starting database container: ${containerName} on port ${port}`);

  // Check if container already exists
  if (containerExists(containerName)) {
    console.log('Container already exists, starting it...');
    if (!isContainerRunning(containerName)) {
      startContainer(containerName);
    }
  } else {
    // Create new container
    runCommand('docker', [
      'run',
      '-d',
      '--name',
      containerName,
      '-p',
      `${port}:5432`,
      '-e',
      `POSTGRES_USER=${DB_CONFIG.user}`,
      '-e',
      `POSTGRES_PASSWORD=${DB_CONFIG.password}`,
      '-e',
      `POSTGRES_DB=${DB_CONFIG.database}`,
      '-v',
      `${volumeName}:/var/lib/postgresql/data`,
      '--health-cmd',
      `pg_isready -U ${DB_CONFIG.user} -d ${DB_CONFIG.database}`,
      '--health-interval',
      '5s',
      '--health-timeout',
      '5s',
      '--health-retries',
      '10',
      DB_CONFIG.image,
    ]);
  }

  // Wait for database to be ready
  const ready = await waitForDatabase(containerName);
  if (!ready) {
    throw new Error(`Database container ${containerName} failed to start`);
  }

  return containerName;
}

export type RemovalStatus = 'removed' | 'not_found' | 'error';

export interface RemovalResult {
  status: RemovalStatus;
  containerName: string;
  message?: string;
}

/**
 * Stop and remove a database container and its volume
 */
export function removeDatabase(worktreeId: string): RemovalResult {
  const containerName = getDbContainerName(worktreeId);
  const volumeName = containerName;

  try {
    const existed = containerExists(containerName);

    // Stop container if running
    if (isContainerRunning(containerName)) {
      stopContainer(containerName);
    }

    // Remove container if it exists
    if (existed) {
      removeContainer(containerName);
    }

    // Remove volume (may or may not exist)
    removeVolume(volumeName);

    return {
      status: existed ? 'removed' : 'not_found',
      containerName,
      message: existed ? undefined : 'Container was already removed',
    };
  } catch (error) {
    return {
      status: 'error',
      containerName,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Stop and remove a devcontainer (app container)
 */
export function removeDevcontainer(worktreeId: string): RemovalResult {
  const containerName = getAppContainerName(worktreeId);

  try {
    const existed = containerExists(containerName);

    // Stop container if running
    if (isContainerRunning(containerName)) {
      stopContainer(containerName);
    }

    // Remove container if it exists
    if (existed) {
      removeContainer(containerName);
    }

    return {
      status: existed ? 'removed' : 'not_found',
      containerName,
      message: existed ? undefined : 'Container was already removed',
    };
  } catch (error) {
    return {
      status: 'error',
      containerName,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * List all worktree database containers
 */
export function listDbContainers(): string[] {
  const result = runCommandSafe('docker', [
    'ps',
    '-a',
    '--filter',
    `name=${CONTAINER_PREFIX.db}`,
    '--format',
    '{{.Names}}',
  ]);

  if (!result) {
    return [];
  }

  return result
    .trim()
    .split('\n')
    .filter((name) => name.length > 0);
}

/**
 * Check if Docker is available
 */
export function isDockerAvailable(): boolean {
  const result = runCommandSafe('docker', ['info']);
  return result !== null;
}
