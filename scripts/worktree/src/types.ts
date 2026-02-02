/**
 * Worktree Registry Types
 *
 * These types define the structure of the worktree registry stored at .git/inzone/worktree.json
 * Using .git directory ensures the registry is shared across all worktrees.
 */

export interface WorktreeRegistry {
  worktrees: Worktree[];
  settings: RegistrySettings;
}

export interface Worktree {
  /** Sanitized branch name used as identifier (e.g., "feature-auth") */
  id: string;
  /** Full git branch name (e.g., "feature/auth") */
  branch: string;
  /** Branch this worktree was created from */
  sourceBranch: string;
  /** Absolute path to the worktree directory */
  path: string;
  /** Allocated ports for this worktree */
  ports: Ports;
  /** Name of the database container running on host */
  dbContainerName: string;
  /** Name of the devcontainer app container */
  appContainerName: string;
  /** Current status of the worktree */
  status: WorktreeStatus;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last access */
  lastAccessed: string;
}

export interface Ports {
  /** Frontend port (Vite dev server) - range: 5173-5199 */
  frontend: number;
  /** Backend port (API server) - range: 3001-3099 */
  backend: number;
  /** Database port (PostgreSQL) - range: 7432-7499 */
  database: number;
}

export interface RegistrySettings {
  /** Base directory for worktrees relative to main repo */
  worktreeBaseDir: string;
  /** Port ranges for each service type */
  portRanges: {
    frontend: PortRange;
    backend: PortRange;
    database: PortRange;
  };
}

export interface PortRange {
  min: number;
  max: number;
}

export type WorktreeStatus = 'active' | 'stopped' | 'error';

export type ServiceType = 'frontend' | 'backend' | 'database';

/**
 * Default port ranges
 */
export const DEFAULT_PORT_RANGES: Record<ServiceType, PortRange> = {
  frontend: { min: 5173, max: 5199 },
  backend: { min: 3001, max: 3099 },
  database: { min: 7432, max: 7499 }, // Updated from 5435-5499
};

/**
 * Default registry settings
 */
export const DEFAULT_SETTINGS: RegistrySettings = {
  worktreeBaseDir: '../InZone-worktrees',
  portRanges: DEFAULT_PORT_RANGES,
};

/**
 * Database configuration
 */
export const DB_CONFIG = {
  user: 'inzone',
  password: 'inzone_dev',
  database: 'inzone',
  image: 'postgres:16-alpine',
} as const;

/**
 * Container naming conventions
 */
export const CONTAINER_PREFIX = {
  db: 'inzone-db-wt-',
  app: 'inzone-wt-',
} as const;
