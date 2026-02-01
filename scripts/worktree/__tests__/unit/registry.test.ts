import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  initRegistry,
  loadRegistry,
  saveRegistry,
  addWorktree,
  getWorktree,
  removeWorktree,
  listWorktrees,
  getUsedPorts,
} from '../../src/lib/registry.js';
import { DEFAULT_SETTINGS } from '../../src/types.js';

// Mock fs and os modules
vi.mock('fs');
vi.mock('os');

describe('registry', () => {
  const mockRegistryDir = '/mock/home/.inzone';
  const mockRegistryPath = '/mock/home/.inzone/worktree.json';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/mock/home');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initRegistry', () => {
    it('creates registry file if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ worktrees: [], settings: DEFAULT_SETTINGS })
      );

      const registry = initRegistry();

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockRegistryDir, { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(registry.worktrees).toEqual([]);
    });

    it('loads existing registry if it exists', () => {
      const existingRegistry = {
        worktrees: [
          {
            id: 'test-worktree',
            branch: 'test/worktree',
            sourceBranch: 'master',
            path: '/path/to/worktree',
            ports: { frontend: 5174, backend: 3002, database: 7433 },
            dbContainerName: 'inzone-db-wt-test-worktree',
            appContainerName: 'inzone-wt-test-worktree',
            status: 'active',
            createdAt: '2026-02-01T00:00:00Z',
            lastAccessed: '2026-02-01T00:00:00Z',
          },
        ],
        settings: DEFAULT_SETTINGS,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingRegistry));

      const registry = initRegistry();

      expect(registry.worktrees).toHaveLength(1);
      expect(registry.worktrees[0].id).toBe('test-worktree');
    });
  });

  describe('addWorktree', () => {
    it('adds a new worktree to the registry', () => {
      const existingRegistry = { worktrees: [], settings: DEFAULT_SETTINGS };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingRegistry));
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const newWorktree = {
        id: 'new-worktree',
        branch: 'feature/new',
        sourceBranch: 'master',
        path: '/path/to/new',
        ports: { frontend: 5174, backend: 3002, database: 7433 },
        dbContainerName: 'inzone-db-wt-new-worktree',
        appContainerName: 'inzone-wt-new-worktree',
        status: 'active' as const,
      };

      const result = addWorktree(newWorktree);

      expect(result.id).toBe('new-worktree');
      expect(result.createdAt).toBeDefined();
      expect(result.lastAccessed).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('throws error if worktree with same ID already exists', () => {
      const existingRegistry = {
        worktrees: [
          {
            id: 'existing',
            branch: 'existing-branch',
            sourceBranch: 'master',
            path: '/path',
            ports: { frontend: 5174, backend: 3002, database: 7433 },
            dbContainerName: 'db',
            appContainerName: 'app',
            status: 'active',
            createdAt: '2026-02-01T00:00:00Z',
            lastAccessed: '2026-02-01T00:00:00Z',
          },
        ],
        settings: DEFAULT_SETTINGS,
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingRegistry));

      expect(() =>
        addWorktree({
          id: 'existing',
          branch: 'another-branch',
          sourceBranch: 'master',
          path: '/another/path',
          ports: { frontend: 5175, backend: 3003, database: 7434 },
          dbContainerName: 'db2',
          appContainerName: 'app2',
          status: 'active',
        })
      ).toThrow("Worktree with ID 'existing' already exists");
    });
  });

  describe('getUsedPorts', () => {
    it('returns all used ports for a service type', () => {
      const existingRegistry = {
        worktrees: [
          {
            id: 'wt1',
            branch: 'branch1',
            sourceBranch: 'master',
            path: '/path1',
            ports: { frontend: 5174, backend: 3002, database: 7433 },
            dbContainerName: 'db1',
            appContainerName: 'app1',
            status: 'active',
            createdAt: '2026-02-01T00:00:00Z',
            lastAccessed: '2026-02-01T00:00:00Z',
          },
          {
            id: 'wt2',
            branch: 'branch2',
            sourceBranch: 'master',
            path: '/path2',
            ports: { frontend: 5175, backend: 3003, database: 7434 },
            dbContainerName: 'db2',
            appContainerName: 'app2',
            status: 'active',
            createdAt: '2026-02-01T00:00:00Z',
            lastAccessed: '2026-02-01T00:00:00Z',
          },
        ],
        settings: DEFAULT_SETTINGS,
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingRegistry));

      const frontendPorts = getUsedPorts('frontend');
      const databasePorts = getUsedPorts('database');

      expect(frontendPorts).toEqual([5174, 5175]);
      expect(databasePorts).toEqual([7433, 7434]);
    });
  });

  describe('removeWorktree', () => {
    it('removes a worktree from the registry', () => {
      const existingRegistry = {
        worktrees: [
          {
            id: 'to-remove',
            branch: 'branch',
            sourceBranch: 'master',
            path: '/path',
            ports: { frontend: 5174, backend: 3002, database: 7433 },
            dbContainerName: 'db',
            appContainerName: 'app',
            status: 'active',
            createdAt: '2026-02-01T00:00:00Z',
            lastAccessed: '2026-02-01T00:00:00Z',
          },
        ],
        settings: DEFAULT_SETTINGS,
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingRegistry));
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const removed = removeWorktree('to-remove');

      expect(removed?.id).toBe('to-remove');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('returns undefined if worktree not found', () => {
      const existingRegistry = { worktrees: [], settings: DEFAULT_SETTINGS };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingRegistry));

      const removed = removeWorktree('non-existent');

      expect(removed).toBeUndefined();
    });
  });
});
