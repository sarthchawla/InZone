import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateEnvFile,
  generateDevcontainerJson,
  generateDockerComposeOverride,
  copyBaseDevcontainerFiles,
} from '../../src/lib/config-generator.js';
import * as utils from '../../src/lib/utils.js';

// Mock dependencies
vi.mock('fs');
vi.mock('../../src/lib/utils.js');

describe('config-generator', () => {
  const mockPorts = { frontend: 5174, backend: 3002, database: 7433 };
  const mockWorktreePath = '/path/to/worktree';
  const mockWorktreeId = 'feature-auth';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(utils.ensureDir).mockReturnValue(undefined);
    vi.mocked(utils.timestamp).mockReturnValue('2026-02-01T00:00:00.000Z');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('generateEnvFile', () => {
    it('generates .env file with correct content', () => {
      generateEnvFile(mockWorktreePath, mockPorts, mockWorktreeId);

      expect(utils.ensureDir).toHaveBeenCalledWith(
        path.join(mockWorktreePath, 'apps', 'api')
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      const [filePath, content] = vi.mocked(fs.writeFileSync).mock.calls[0];

      expect(filePath).toBe(path.join(mockWorktreePath, 'apps', 'api', '.env'));
      expect(content).toContain('VITE_DEV_PORT=5174');
      expect(content).toContain('API_PORT=3002');
      expect(content).toContain('DATABASE_URL=postgresql://inzone:inzone_dev@localhost:7433/inzone?schema=public');
      expect(content).toContain('feature-auth');
    });
  });

  describe('generateDevcontainerJson', () => {
    it('generates devcontainer.json with correct config', () => {
      generateDevcontainerJson(mockWorktreePath, mockWorktreeId, mockPorts);

      expect(utils.ensureDir).toHaveBeenCalledWith(
        path.join(mockWorktreePath, '.devcontainer')
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      const [filePath, content] = vi.mocked(fs.writeFileSync).mock.calls[0];

      expect(filePath).toBe(path.join(mockWorktreePath, '.devcontainer', 'devcontainer.json'));

      const config = JSON.parse(content as string);
      expect(config.name).toBe('InZone - feature-auth');
      expect(config.forwardPorts).toEqual([5174, 3002, 7433]);
      expect(config.containerEnv.VITE_DEV_PORT).toBe('5174');
      expect(config.containerEnv.API_PORT).toBe('3002');
      expect(config.containerEnv.DATABASE_URL).toContain('host.docker.internal:7433');
    });

    it('includes docker-compose files', () => {
      generateDevcontainerJson(mockWorktreePath, mockWorktreeId, mockPorts);

      const [, content] = vi.mocked(fs.writeFileSync).mock.calls[0];
      const config = JSON.parse(content as string);

      expect(config.dockerComposeFile).toEqual(['docker-compose.yml', 'docker-compose.worktree.yml']);
    });
  });

  describe('generateDockerComposeOverride', () => {
    it('generates docker-compose.worktree.yml with correct content', () => {
      generateDockerComposeOverride(mockWorktreePath, mockWorktreeId, mockPorts);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const [filePath, content] = vi.mocked(fs.writeFileSync).mock.calls[0];

      expect(filePath).toBe(
        path.join(mockWorktreePath, '.devcontainer', 'docker-compose.worktree.yml')
      );
      expect(content).toContain('container_name: inzone-wt-feature-auth');
      expect(content).toContain('VITE_DEV_PORT=5174');
      expect(content).toContain('API_PORT=3002');
      expect(content).toContain('host.docker.internal:7433');
      expect(content).toContain(`"5174:5174"`);
      expect(content).toContain(`"3002:3002"`);
      expect(content).toContain('host.docker.internal:host-gateway');
    });

    it('includes note about host database', () => {
      generateDockerComposeOverride(mockWorktreePath, mockWorktreeId, mockPorts);

      const [, content] = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(content).toContain('Database runs on HOST at port 7433');
      expect(content).toContain('inzone-db-wt-feature-auth');
    });
  });

  describe('copyBaseDevcontainerFiles', () => {
    const mainRepoPath = '/path/to/main';

    it('copies base devcontainer files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.copyFileSync).mockReturnValue(undefined);
      vi.mocked(fs.chmodSync).mockReturnValue(undefined);

      copyBaseDevcontainerFiles(mockWorktreePath, mainRepoPath);

      expect(utils.ensureDir).toHaveBeenCalledWith(
        path.join(mockWorktreePath, '.devcontainer')
      );

      // Should check for each file
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(mainRepoPath, '.devcontainer', 'Dockerfile')
      );
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(mainRepoPath, '.devcontainer', 'docker-compose.yml')
      );
    });

    it('sets executable permissions on shell scripts', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.copyFileSync).mockReturnValue(undefined);
      vi.mocked(fs.chmodSync).mockReturnValue(undefined);

      copyBaseDevcontainerFiles(mockWorktreePath, mainRepoPath);

      // Should chmod shell scripts
      expect(fs.chmodSync).toHaveBeenCalledWith(
        path.join(mockWorktreePath, '.devcontainer', 'fix-permissions.sh'),
        0o755
      );
      expect(fs.chmodSync).toHaveBeenCalledWith(
        path.join(mockWorktreePath, '.devcontainer', 'init-firewall.sh'),
        0o755
      );
    });

    it('skips files that do not exist in source', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      copyBaseDevcontainerFiles(mockWorktreePath, mainRepoPath);

      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });
  });
});
