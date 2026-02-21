import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Execute a command safely using execFileSync (prevents shell injection)
 * This is the SAFE alternative - uses execFile, not exec
 */
export function runCommand(
  command: string,
  args: string[],
  options: { encoding?: BufferEncoding; stdio?: 'pipe' | 'inherit'; cwd?: string } = {}
): string {
  try {
    const result = execFileSync(command, args, {
      encoding: 'utf-8',
      stdio: options.stdio ?? 'pipe',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      ...(options.cwd && { cwd: options.cwd }),
    });
    return result;
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      const execError = error as Error & { stdout: Buffer; stderr: Buffer; status: number };
      throw new Error(
        `Command failed: ${command} ${args.join(' ')}\n` +
          `Exit code: ${execError.status}\n` +
          `stderr: ${execError.stderr?.toString() ?? ''}`
      );
    }
    throw error;
  }
}

/**
 * Execute a command and return null on failure instead of throwing
 * Uses execFileSync (safe, no shell injection)
 */
export function runCommandSafe(command: string, args: string[]): string | null {
  try {
    return runCommand(command, args);
  } catch {
    return null;
  }
}

/**
 * Sanitize a branch name to create a valid ID
 * e.g., "feature/auth-system" -> "feature-auth-system"
 */
export function sanitizeBranchName(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get the registry directory path (inside .git for sharing across worktrees)
 */
export function getRegistryDir(): string {
  const gitDir = runCommand('git', ['rev-parse', '--git-common-dir']).trim();
  return path.join(gitDir, 'inzone');
}

/**
 * Get the registry file path
 */
export function getRegistryPath(): string {
  return path.join(getRegistryDir(), 'worktree.json');
}

/**
 * Ensure a directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get the root directory of the main repository
 */
export function getRepoRoot(): string {
  const result = runCommand('git', ['rev-parse', '--show-toplevel']);
  return result.trim();
}

/**
 * Format a timestamp as ISO string
 */
export function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a path exists
 */
export function pathExists(p: string): boolean {
  return fs.existsSync(p);
}

/**
 * Read a JSON file
 */
export function readJson<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write a JSON file
 */
export function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Read a text file
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write a text file
 */
export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content);
}
