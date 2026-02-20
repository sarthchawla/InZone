import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import {
  runCommand,
  runCommandSafe,
  sanitizeBranchName,
  getRegistryDir,
  getRegistryPath,
  ensureDir,
  timestamp,
  pathExists,
  readJson,
  writeJson,
  readFile,
  writeFile,
} from '../../src/lib/utils.js';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');
vi.mock('os');

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/mock/home');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('runCommand', () => {
    it('executes command and returns output', () => {
      vi.mocked(childProcess.execFileSync).mockReturnValue('command output');

      const result = runCommand('echo', ['hello']);

      expect(result).toBe('command output');
      expect(childProcess.execFileSync).toHaveBeenCalledWith('echo', ['hello'], {
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
      });
    });

    it('throws error with details on failure', () => {
      const error = new Error('Command failed') as Error & {
        stdout: Buffer;
        stderr: Buffer;
        status: number;
      };
      error.stdout = Buffer.from('');
      error.stderr = Buffer.from('error message');
      error.status = 1;

      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw error;
      });

      expect(() => runCommand('bad-command', [])).toThrow('Command failed');
    });
  });

  describe('runCommandSafe', () => {
    it('returns output on success', () => {
      vi.mocked(childProcess.execFileSync).mockReturnValue('success');

      const result = runCommandSafe('echo', ['test']);

      expect(result).toBe('success');
    });

    it('returns null on failure', () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = runCommandSafe('bad-command', []);

      expect(result).toBeNull();
    });
  });

  describe('sanitizeBranchName', () => {
    it('converts branch name to valid ID', () => {
      expect(sanitizeBranchName('feature/auth-system')).toBe('feature-auth-system');
      expect(sanitizeBranchName('Feature/Auth')).toBe('feature-auth');
      expect(sanitizeBranchName('bug--fix')).toBe('bug-fix');
    });

    it('handles special characters', () => {
      expect(sanitizeBranchName('feature@test')).toBe('feature-test');
      expect(sanitizeBranchName('feat.test')).toBe('feat-test');
      expect(sanitizeBranchName('feat#123')).toBe('feat-123');
    });

    it('trims leading/trailing hyphens', () => {
      expect(sanitizeBranchName('-feature-')).toBe('feature');
      expect(sanitizeBranchName('--test--')).toBe('test');
    });
  });

  describe('getRegistryDir', () => {
    it('returns correct registry directory', () => {
      vi.mocked(childProcess.execFileSync).mockReturnValue('/mock/repo/.git\n');

      const dir = getRegistryDir();

      expect(dir).toMatch(/\.git[/\\]inzone$/);
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--git-common-dir'],
        expect.any(Object)
      );
    });
  });

  describe('getRegistryPath', () => {
    it('returns correct registry file path', () => {
      vi.mocked(childProcess.execFileSync).mockReturnValue('/mock/repo/.git\n');

      const filePath = getRegistryPath();

      expect(filePath).toMatch(/\.git[/\\]inzone[/\\]worktree\.json$/);
    });
  });

  describe('ensureDir', () => {
    it('creates directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      ensureDir('/path/to/dir');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true });
    });

    it('does nothing if directory exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      ensureDir('/path/to/dir');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('timestamp', () => {
    it('returns ISO formatted timestamp', () => {
      const ts = timestamp();
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('pathExists', () => {
    it('returns true when path exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(pathExists('/some/path')).toBe(true);
    });

    it('returns false when path does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(pathExists('/some/path')).toBe(false);
    });
  });

  describe('readJson', () => {
    it('reads and parses JSON file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{"key": "value"}');

      const data = readJson<{ key: string }>('/path/to/file.json');

      expect(data).toEqual({ key: 'value' });
    });
  });

  describe('writeJson', () => {
    it('writes JSON to file with formatting', () => {
      writeJson('/path/to/file.json', { key: 'value' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file.json',
        '{\n  "key": "value"\n}\n'
      );
    });
  });

  describe('readFile', () => {
    it('reads text file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('file content');

      const content = readFile('/path/to/file.txt');

      expect(content).toBe('file content');
    });
  });

  describe('writeFile', () => {
    it('writes text file', () => {
      writeFile('/path/to/file.txt', 'content');

      expect(fs.writeFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'content');
    });
  });
});
