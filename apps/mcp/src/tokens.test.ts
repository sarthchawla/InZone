import { describe, expect, it, vi } from 'vitest';
import {
  authenticateMcpToken,
  calculateExpiresAt,
  createMcpToken,
  decryptMcpToken,
  encryptMcpToken,
  extractBearerToken,
  hashMcpToken,
  revealMcpToken,
  revokeMcpToken,
} from './tokens.js';

describe('MCP token utilities', () => {
  it('calculates configurable expiry dates', () => {
    const now = new Date('2026-05-05T00:00:00.000Z');

    expect(calculateExpiresAt('never', now)).toBeNull();
    expect(calculateExpiresAt('30d', now)?.toISOString()).toBe('2026-06-04T00:00:00.000Z');
    expect(calculateExpiresAt('90d', now)?.toISOString()).toBe('2026-08-03T00:00:00.000Z');
    expect(calculateExpiresAt('1y', now)?.toISOString()).toBe('2027-05-05T00:00:00.000Z');
  });

  it('creates a raw token but stores only its hash', async () => {
    const prisma = {
      mcpToken: {
        create: vi.fn(async (args) => ({
          id: 'token-1',
          userId: args.data.userId,
          name: args.data.name,
          tokenHash: args.data.tokenHash,
          encryptedToken: args.data.encryptedToken,
          expiresAt: args.data.expiresAt,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date('2026-05-05T00:00:00.000Z'),
          updatedAt: new Date('2026-05-05T00:00:00.000Z'),
        })),
      },
    };

    const created = await createMcpToken(prisma as never, {
      userId: 'user-1',
      name: 'Claude',
      expiresIn: 'never',
    });

    expect(created.token).toMatch(/^iz_mcp_/);
    expect(prisma.mcpToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Claude',
        tokenHash: hashMcpToken(created.token),
        encryptedToken: expect.any(String),
        expiresAt: null,
      },
    });
    expect(prisma.mcpToken.create.mock.calls[0][0].data.encryptedToken).not.toContain(created.token);
  });

  it('encrypts and decrypts revealable tokens', () => {
    const rawToken = 'iz_mcp_test-token-that-is-long-enough';
    const encrypted = encryptMcpToken(rawToken);

    expect(encrypted).not.toContain(rawToken);
    expect(decryptMcpToken(encrypted)).toBe(rawToken);
  });

  it('reveals encrypted tokens for the current user', async () => {
    const rawToken = 'iz_mcp_test-token-that-is-long-enough';
    const encryptedToken = encryptMcpToken(rawToken);
    const createdAt = new Date('2026-05-05T00:00:00.000Z');
    const prisma = {
      mcpToken: {
        findFirst: vi.fn(async () => ({
          id: 'token-1',
          name: 'Claude',
          encryptedToken,
          expiresAt: null,
          lastUsedAt: null,
          revokedAt: null,
          createdAt,
        })),
      },
    };

    await expect(
      revealMcpToken(prisma as never, { userId: 'user-1', tokenId: 'token-1' }),
    ).resolves.toEqual({
      id: 'token-1',
      name: 'Claude',
      token: rawToken,
      expiresAt: null,
      lastUsedAt: null,
      revokedAt: null,
      createdAt,
    });
  });

  it('authenticates active tokens and updates lastUsedAt', async () => {
    const rawToken = 'iz_mcp_test-token-that-is-long-enough';
    const tokenHash = hashMcpToken(rawToken);
    const prisma = {
      mcpToken: {
        findUnique: vi.fn(async () => ({
          id: 'token-1',
          userId: 'user-1',
          tokenHash,
          expiresAt: null,
          revokedAt: null,
        })),
        update: vi.fn(),
      },
    };

    const result = await authenticateMcpToken(prisma as never, rawToken);

    expect(result).toEqual({ tokenId: 'token-1', userId: 'user-1' });
    expect(prisma.mcpToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it('rejects missing, expired, and revoked tokens', async () => {
    const rawToken = 'iz_mcp_test-token-that-is-long-enough';
    const tokenHash = hashMcpToken(rawToken);
    const prisma = {
      mcpToken: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    await expect(authenticateMcpToken(prisma as never, undefined)).resolves.toBeNull();

    prisma.mcpToken.findUnique.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      revokedAt: null,
    });
    await expect(authenticateMcpToken(prisma as never, rawToken)).resolves.toBeNull();

    prisma.mcpToken.findUnique.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: null,
      revokedAt: new Date(),
    });
    await expect(authenticateMcpToken(prisma as never, rawToken)).resolves.toBeNull();
    expect(prisma.mcpToken.update).not.toHaveBeenCalled();
  });

  it('revokes tokens by current user and extracts bearer values', async () => {
    const prisma = {
      mcpToken: {
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };

    await expect(
      revokeMcpToken(prisma as never, { userId: 'user-1', tokenId: 'token-1' }),
    ).resolves.toBe(true);
    expect(extractBearerToken('Bearer iz_mcp_secret')).toBe('iz_mcp_secret');
    expect(extractBearerToken('Basic nope')).toBeUndefined();
  });
});
