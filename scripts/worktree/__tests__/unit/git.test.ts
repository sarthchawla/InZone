import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  branchExists,
  getCurrentBranch,
  listGitWorktrees,
  worktreeExistsForBranch,
  isValidBranchName,
  getWorktreePath,
} from '../../src/lib/git.js';
import * as utils from '../../src/lib/utils.js';

// Mock dependencies
vi.mock('../../src/lib/utils.js');

describe('git', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('branchExists', () => {
    it('returns true when local branch exists', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValueOnce('abc123'); // local check

      const result = branchExists('feature/auth');

      expect(result).toBe(true);
    });

    it('returns true when remote branch exists', () => {
      vi.mocked(utils.runCommandSafe)
        .mockReturnValueOnce(null) // local check fails
        .mockReturnValueOnce('abc123'); // remote check succeeds

      const result = branchExists('feature/auth');

      expect(result).toBe(true);
    });

    it('returns false when branch does not exist', () => {
      vi.mocked(utils.runCommandSafe).mockReturnValue(null);

      const result = branchExists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('returns the current branch name', () => {
      vi.mocked(utils.runCommand).mockReturnValue('master\n');

      const branch = getCurrentBranch();

      expect(branch).toBe('master');
      expect(utils.runCommand).toHaveBeenCalledWith('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    });
  });

  describe('listGitWorktrees', () => {
    it('parses porcelain output correctly', () => {
      const porcelainOutput = `worktree /path/to/main
HEAD abc123
branch refs/heads/master

worktree /path/to/feature
HEAD def456
branch refs/heads/feature/auth

`;
      vi.mocked(utils.runCommand).mockReturnValue(porcelainOutput);

      const worktrees = listGitWorktrees();

      expect(worktrees).toEqual([
        { path: '/path/to/main', branch: 'master' },
        { path: '/path/to/feature', branch: 'feature/auth' },
      ]);
    });

    it('returns empty array when no worktrees', () => {
      vi.mocked(utils.runCommand).mockReturnValue('');

      const worktrees = listGitWorktrees();

      expect(worktrees).toEqual([]);
    });
  });

  describe('worktreeExistsForBranch', () => {
    it('returns true when worktree exists for branch', () => {
      const porcelainOutput = `worktree /path/to/main
HEAD abc123
branch refs/heads/master

`;
      vi.mocked(utils.runCommand).mockReturnValue(porcelainOutput);

      const exists = worktreeExistsForBranch('master');

      expect(exists).toBe(true);
    });

    it('returns false when no worktree for branch', () => {
      const porcelainOutput = `worktree /path/to/main
HEAD abc123
branch refs/heads/master

`;
      vi.mocked(utils.runCommand).mockReturnValue(porcelainOutput);

      const exists = worktreeExistsForBranch('feature/other');

      expect(exists).toBe(false);
    });
  });

  describe('isValidBranchName', () => {
    it('accepts valid branch names', () => {
      expect(isValidBranchName('feature/auth')).toBe(true);
      expect(isValidBranchName('feature-auth')).toBe(true);
      expect(isValidBranchName('feature_auth')).toBe(true);
      expect(isValidBranchName('master')).toBe(true);
      expect(isValidBranchName('main')).toBe(true);
      expect(isValidBranchName('v1')).toBe(true);
      expect(isValidBranchName('A')).toBe(true);
    });

    it('rejects invalid branch names', () => {
      expect(isValidBranchName('feature auth')).toBe(false); // space
      expect(isValidBranchName('feature..auth')).toBe(false); // double dot
      expect(isValidBranchName('')).toBe(false); // empty
      expect(isValidBranchName('-feature')).toBe(false); // starts with dash
      expect(isValidBranchName('feature-')).toBe(false); // ends with dash
    });
  });

  describe('getWorktreePath', () => {
    it('returns correct path for worktree', () => {
      vi.mocked(utils.getRepoRoot).mockReturnValue('/home/user/project');

      const path = getWorktreePath('../worktrees', 'feature-auth');

      expect(path).toContain('worktrees');
      expect(path).toContain('feature-auth');
    });
  });
});
