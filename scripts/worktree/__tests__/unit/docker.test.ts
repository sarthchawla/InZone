import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDbContainerName,
  getAppContainerName,
  containerExists,
  isContainerRunning,
  isDockerAvailable,
  listDbContainers,
  removeDatabase,
} from '../../src/lib/docker.js';
import * as utils from '../../src/lib/utils.js';

// Mock dependencies
vi.mock('../../src/lib/utils.js');

describe('docker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getDbContainerName', () => {
    it('returns correct container name for worktree', () => {
      const name = getDbContainerName('feature-auth');
      expect(name).toBe('inzone-db-wt-feature-auth');
    });

    it('handles worktree IDs with hyphens', () => {
      const name = getDbContainerName('feature-user-management');
      expect(name).toBe('inzone-db-wt-feature-user-management');
    });
  });

  describe('getAppContainerName', () => {
    it('returns correct app container name', () => {
      const name = getAppContainerName('feature-auth');
      expect(name).toBe('inzone-wt-feature-auth');
    });
  });

  describe('containerExists', () => {
    it('returns true when container is found', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue('inzone-db-wt-test');

      const result = containerExists('inzone-db-wt-test');

      expect(result).toBe(true);
      expect(utils.runCommandSafe).toHaveBeenCalledWith('docker', [
        'ps',
        '-a',
        '--filter',
        'name=^inzone-db-wt-test$',
        '--format',
        '{{.Names}}',
      ]);
    });

    it('returns false when container not found', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const result = containerExists('non-existent');

      expect(result).toBe(false);
    });

    it('returns false when output does not match container name', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue('different-container');

      const result = containerExists('inzone-db-wt-test');

      expect(result).toBe(false);
    });
  });

  describe('isContainerRunning', () => {
    it('returns true when container is running', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue('inzone-db-wt-test');

      const result = isContainerRunning('inzone-db-wt-test');

      expect(result).toBe(true);
      expect(utils.runCommandSafe).toHaveBeenCalledWith('docker', [
        'ps',
        '--filter',
        'name=^inzone-db-wt-test$',
        '--filter',
        'status=running',
        '--format',
        '{{.Names}}',
      ]);
    });

    it('returns false when container is not running', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const result = isContainerRunning('inzone-db-wt-test');

      expect(result).toBe(false);
    });
  });

  describe('isDockerAvailable', () => {
    it('returns true when docker is available', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue('docker info output');

      const result = isDockerAvailable();

      expect(result).toBe(true);
      expect(utils.runCommandSafe).toHaveBeenCalledWith('docker', ['info']);
    });

    it('returns false when docker is not available', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const result = isDockerAvailable();

      expect(result).toBe(false);
    });
  });

  describe('listDbContainers', () => {
    it('returns list of database containers', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue(
        'inzone-db-wt-auth\ninzone-db-wt-api\ninzone-db-wt-ui'
      );

      const containers = listDbContainers();

      expect(containers).toEqual(['inzone-db-wt-auth', 'inzone-db-wt-api', 'inzone-db-wt-ui']);
    });

    it('returns empty array when no containers', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue('');

      const containers = listDbContainers();

      expect(containers).toEqual([]);
    });

    it('returns empty array when docker command fails', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const containers = listDbContainers();

      expect(containers).toEqual([]);
    });
  });

  describe('removeDatabase', () => {
    it('stops and removes container and volume', () => {
      // Container is running
      vi.mocked(utils.runCommandSafe).mockImplementation((cmd, args) => {
        if (cmd === 'docker' && args[0] === 'ps' && args.includes('status=running')) {
          return 'inzone-db-wt-test';
        }
        if (cmd === 'docker' && args[0] === 'ps' && args.includes('-a')) {
          return 'inzone-db-wt-test';
        }
        return null;
      });

      removeDatabase('test');

      // Verify stop was called
      expect(utils.runCommandSafe).toHaveBeenCalledWith('docker', ['stop', 'inzone-db-wt-test']);
      // Verify rm was called
      expect(utils.runCommandSafe).toHaveBeenCalledWith('docker', [
        'rm',
        '-f',
        'inzone-db-wt-test',
      ]);
      // Verify volume rm was called
      expect(utils.runCommandSafe).toHaveBeenCalledWith('docker', [
        'volume',
        'rm',
        '-f',
        'inzone-db-wt-test',
      ]);
    });
  });
});
