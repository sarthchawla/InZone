import { ServiceType, Ports, DEFAULT_PORT_RANGES } from '../types.js';
import { getUsedPorts, getPortRange } from './registry.js';
import { runCommandSafe } from './utils.js';

/**
 * Check if a port is currently in use by the system
 * Uses multiple methods for cross-platform compatibility
 */
export function isPortInUse(port: number): boolean {
  // Try ss (Linux, modern)
  const ssResult = runCommandSafe('ss', ['-tuln']);
  if (ssResult && ssResult.includes(`:${port}`)) {
    return true;
  }

  // Try lsof (macOS, Linux)
  const lsofResult = runCommandSafe('lsof', ['-i', `:${port}`, '-P', '-n']);
  if (lsofResult && lsofResult.trim().length > 0) {
    return true;
  }

  // Try netstat (fallback)
  const netstatResult = runCommandSafe('netstat', ['-tuln']);
  if (netstatResult && netstatResult.includes(`:${port}`)) {
    return true;
  }

  return false;
}

/**
 * Find the first available port in a range
 */
export function findFreePort(serviceType: ServiceType): number {
  const range = getPortRange(serviceType);
  const usedPorts = new Set(getUsedPorts(serviceType));

  for (let port = range.min; port <= range.max; port++) {
    // Skip if reserved in registry
    if (usedPorts.has(port)) {
      continue;
    }

    // Skip if in use by system
    if (isPortInUse(port)) {
      continue;
    }

    return port;
  }

  throw new Error(
    `No free ports available for ${serviceType} in range ${range.min}-${range.max}. ` +
      `Use /worktree-cleanup to free unused worktrees.`
  );
}

/**
 * Allocate all ports for a new worktree
 */
export function findAllPorts(): Ports {
  return {
    frontend: findFreePort('frontend'),
    backend: findFreePort('backend'),
    database: findFreePort('database'),
  };
}

/**
 * Validate that ports are still available (not taken since allocation)
 */
export function validatePorts(ports: Ports): boolean {
  const usedFrontend = new Set(getUsedPorts('frontend'));
  const usedBackend = new Set(getUsedPorts('backend'));
  const usedDatabase = new Set(getUsedPorts('database'));

  if (usedFrontend.has(ports.frontend) || isPortInUse(ports.frontend)) {
    return false;
  }
  if (usedBackend.has(ports.backend) || isPortInUse(ports.backend)) {
    return false;
  }
  if (usedDatabase.has(ports.database) || isPortInUse(ports.database)) {
    return false;
  }

  return true;
}

/**
 * Get the default port ranges
 */
export function getDefaultPortRanges(): typeof DEFAULT_PORT_RANGES {
  return DEFAULT_PORT_RANGES;
}
