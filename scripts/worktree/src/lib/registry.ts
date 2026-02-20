import {
  WorktreeRegistry,
  Worktree,
  RegistrySettings,
  DEFAULT_SETTINGS,
  ServiceType,
} from '../types.js';
import {
  getRegistryPath,
  getRegistryDir,
  ensureDir,
  pathExists,
  readJson,
  writeJson,
  timestamp,
} from './utils.js';

/**
 * Initialize the registry if it doesn't exist
 */
export function initRegistry(): WorktreeRegistry {
  const registryPath = getRegistryPath();
  const registryDir = getRegistryDir();

  ensureDir(registryDir);

  if (!pathExists(registryPath)) {
    const registry: WorktreeRegistry = {
      worktrees: [],
      settings: DEFAULT_SETTINGS,
    };
    writeJson(registryPath, registry);
    return registry;
  }

  return loadRegistry();
}

/**
 * Load the registry from disk
 */
export function loadRegistry(): WorktreeRegistry {
  const registryPath = getRegistryPath();

  if (!pathExists(registryPath)) {
    return initRegistry();
  }

  const registry = readJson<WorktreeRegistry>(registryPath);

  // Ensure settings have all required fields (migration support)
  if (!registry.settings) {
    registry.settings = DEFAULT_SETTINGS;
  }
  if (!registry.settings.portRanges) {
    registry.settings.portRanges = DEFAULT_SETTINGS.portRanges;
  }
  // Update database port range if still using old range
  if (registry.settings.portRanges.database.min === 5435) {
    registry.settings.portRanges.database = DEFAULT_SETTINGS.portRanges.database;
  }

  return registry;
}

/**
 * Save the registry to disk
 */
export function saveRegistry(registry: WorktreeRegistry): void {
  const registryPath = getRegistryPath();
  writeJson(registryPath, registry);
}

/**
 * Get a worktree by ID
 */
export function getWorktree(id: string): Worktree | undefined {
  const registry = loadRegistry();
  return registry.worktrees.find((w) => w.id === id);
}

/**
 * Get a worktree by branch name
 */
export function getWorktreeByBranch(branch: string): Worktree | undefined {
  const registry = loadRegistry();
  return registry.worktrees.find((w) => w.branch === branch);
}

/**
 * Add a new worktree to the registry
 */
export function addWorktree(worktree: Omit<Worktree, 'createdAt' | 'lastAccessed'>): Worktree {
  const registry = loadRegistry();

  // Check for duplicates
  if (registry.worktrees.some((w) => w.id === worktree.id)) {
    throw new Error(`Worktree with ID '${worktree.id}' already exists`);
  }
  if (registry.worktrees.some((w) => w.branch === worktree.branch)) {
    throw new Error(`Worktree for branch '${worktree.branch}' already exists`);
  }

  const now = timestamp();
  const newWorktree: Worktree = {
    ...worktree,
    createdAt: now,
    lastAccessed: now,
  };

  registry.worktrees.push(newWorktree);
  saveRegistry(registry);

  return newWorktree;
}

/**
 * Update a worktree in the registry
 */
export function updateWorktree(id: string, updates: Partial<Worktree>): Worktree {
  const registry = loadRegistry();
  const index = registry.worktrees.findIndex((w) => w.id === id);

  if (index === -1) {
    throw new Error(`Worktree with ID '${id}' not found`);
  }

  registry.worktrees[index] = {
    ...registry.worktrees[index],
    ...updates,
    lastAccessed: timestamp(),
  };

  saveRegistry(registry);
  return registry.worktrees[index];
}

/**
 * Remove a worktree from the registry
 */
export function removeWorktree(id: string): Worktree | undefined {
  const registry = loadRegistry();
  const index = registry.worktrees.findIndex((w) => w.id === id);

  if (index === -1) {
    return undefined;
  }

  const removed = registry.worktrees.splice(index, 1)[0];
  saveRegistry(registry);

  return removed;
}

/**
 * List all worktrees
 */
export function listWorktrees(): Worktree[] {
  const registry = loadRegistry();
  return registry.worktrees;
}

/**
 * Get all used ports for a service type
 */
export function getUsedPorts(serviceType: ServiceType): number[] {
  const registry = loadRegistry();
  return registry.worktrees.map((w) => w.ports[serviceType]);
}

/**
 * Get the port range for a service type
 */
export function getPortRange(serviceType: ServiceType): { min: number; max: number } {
  const registry = loadRegistry();
  return registry.settings.portRanges[serviceType];
}

/**
 * Get registry settings
 */
export function getSettings(): RegistrySettings {
  const registry = loadRegistry();
  return registry.settings;
}

/**
 * Update registry settings
 */
export function updateSettings(settings: Partial<RegistrySettings>): RegistrySettings {
  const registry = loadRegistry();
  registry.settings = {
    ...registry.settings,
    ...settings,
  };
  saveRegistry(registry);
  return registry.settings;
}

/**
 * Find worktrees that no longer exist on disk
 */
export function findOrphanedWorktrees(): Worktree[] {
  const registry = loadRegistry();
  return registry.worktrees.filter((w) => !pathExists(w.path));
}

/**
 * Remove all orphaned worktrees from registry
 */
export function pruneOrphanedWorktrees(): Worktree[] {
  const registry = loadRegistry();
  const orphaned = registry.worktrees.filter((w) => !pathExists(w.path));
  registry.worktrees = registry.worktrees.filter((w) => pathExists(w.path));
  saveRegistry(registry);
  return orphaned;
}
