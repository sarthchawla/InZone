import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { setup } from '../../src/commands/setup.js';
import * as registry from '../../src/lib/registry.js';
import * as portAllocator from '../../src/lib/port-allocator.js';
import * as docker from '../../src/lib/docker.js';
import * as git from '../../src/lib/git.js';
import * as configGenerator from '../../src/lib/config-generator.js';
import * as utils from '../../src/lib/utils.js';

vi.mock('../../src/lib/registry.js');
vi.mock('../../src/lib/port-allocator.js');
vi.mock('../../src/lib/docker.js');
vi.mock('../../src/lib/git.js');
vi.mock('../../src/lib/config-generator.js');
vi.mock('../../src/lib/utils.js');

describe('setup command', () => {
  const ports = { frontend: 5174, backend: 3002, database: 7433 };
  let tempDirs: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.mocked(registry.initRegistry).mockReturnValue({
      worktrees: [],
      settings: {
        worktreeBaseDir: '../InZone-worktrees',
        portRanges: {
          frontend: { min: 5173, max: 5199 },
          backend: { min: 3001, max: 3099 },
          database: { min: 7432, max: 7499 },
        },
      },
    });
    vi.mocked(registry.getSettings).mockReturnValue({
      worktreeBaseDir: '../InZone-worktrees',
      portRanges: {
        frontend: { min: 5173, max: 5199 },
        backend: { min: 3001, max: 3099 },
        database: { min: 7432, max: 7499 },
      },
    });
    vi.mocked(registry.getWorktreeByBranch).mockReturnValue(undefined);
    vi.mocked(registry.addWorktree).mockImplementation((worktree) => ({
      ...worktree,
      createdAt: '2026-05-05T00:00:00.000Z',
      lastAccessed: '2026-05-05T00:00:00.000Z',
    }));
    vi.mocked(portAllocator.findAllPorts).mockReturnValue(ports);
    vi.mocked(docker.getDbContainerName).mockReturnValue('inzone-db-wt-feature-auth');
    vi.mocked(docker.getAppContainerName).mockReturnValue('inzone-wt-feature-auth');
    vi.mocked(git.isValidBranchName).mockReturnValue(true);
    vi.mocked(git.listGitWorktrees).mockReturnValue([]);
    vi.mocked(git.isLinkedWorktree).mockReturnValue(false);
    vi.mocked(git.branchExists).mockReturnValue(true);
    vi.mocked(git.getCurrentBranch).mockReturnValue('master');
    vi.mocked(git.getWorktreePath).mockReturnValue('/repo/../InZone-worktrees/feature-auth');
    vi.mocked(utils.sanitizeBranchName).mockReturnValue('feature-auth');
    vi.mocked(utils.getRepoRoot).mockReturnValue('/repo/InZone');
    vi.mocked(utils.runCommandSafe).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const tempDir of tempDirs) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    tempDirs = [];
  });

  it('uses the configured default worktree path when no custom path is provided', async () => {
    await setup({ branch: 'feature/auth', source: 'master', open: false });

    expect(git.getWorktreePath).toHaveBeenCalledWith('../InZone-worktrees', 'feature-auth');
    expect(git.createWorktree).toHaveBeenCalledWith(
      '/repo/../InZone-worktrees/feature-auth',
      'feature/auth'
    );
    expect(configGenerator.generateAllConfigs).toHaveBeenCalledWith(
      '/repo/../InZone-worktrees/feature-auth',
      'feature-auth',
      ports,
      '/repo/InZone'
    );
  });

  it('uses a custom target path when provided', async () => {
    await setup({
      branch: 'feature/auth',
      source: 'master',
      path: '/tmp/codex/InZone',
      open: false,
    });

    expect(git.getWorktreePath).not.toHaveBeenCalled();
    expect(git.createWorktree).toHaveBeenCalledWith(
      path.resolve('/tmp/codex/InZone'),
      'feature/auth'
    );
    expect(configGenerator.generateAllConfigs).toHaveBeenCalledWith(
      path.resolve('/tmp/codex/InZone'),
      'feature-auth',
      ports,
      '/repo/InZone'
    );
    expect(registry.addWorktree).toHaveBeenCalledWith(
      expect.objectContaining({
        path: path.resolve('/tmp/codex/InZone'),
        ports,
      })
    );
  });

  it('allows an existing empty custom target path', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'inzone-worktree-'));
    tempDirs.push(tempRoot);
    const targetPath = path.join(tempRoot, 'InZone');
    mkdirSync(targetPath);

    await setup({
      branch: 'feature/auth',
      source: 'master',
      path: targetPath,
      open: false,
    });

    expect(existsSync(targetPath)).toBe(false);
    expect(git.createWorktree).toHaveBeenCalledWith(
      path.resolve(targetPath),
      'feature/auth'
    );
  });

  it('adopts the current linked worktree when the custom target is the current repo root', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'inzone-codex-worktree-'));
    tempDirs.push(tempRoot);
    const targetPath = path.join(tempRoot, 'InZone');
    mkdirSync(targetPath);
    vi.mocked(utils.getRepoRoot).mockReturnValue(targetPath);
    vi.mocked(git.isLinkedWorktree).mockReturnValue(true);

    await setup({
      branch: 'codex/52cf',
      source: 'master',
      path: targetPath,
      open: false,
    });

    expect(git.createWorktree).not.toHaveBeenCalled();
    expect(git.checkoutBranch).toHaveBeenCalledWith('codex/52cf');
    expect(configGenerator.generateAllConfigs).toHaveBeenCalledWith(
      path.resolve(targetPath),
      'feature-auth',
      ports,
      targetPath
    );
    expect(registry.addWorktree).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: 'codex/52cf',
        path: path.resolve(targetPath),
        ports,
      })
    );
  });
});
