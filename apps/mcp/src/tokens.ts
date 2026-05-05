import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const TOKEN_PREFIX = 'iz_mcp_';
const TOKEN_BYTES = 32;
const TOKEN_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const TOKEN_ENCRYPTION_VERSION = 'v1';

export const tokenExpiryOptions = ['30d', '90d', '1y', 'never'] as const;
export type TokenExpiryOption = (typeof tokenExpiryOptions)[number];

export interface CreatedMcpToken {
  id: string;
  name: string;
  token: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface McpTokenMetadata {
  id: string;
  name: string;
  canReveal: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevealedMcpToken {
  id: string;
  name: string;
  token: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AuthenticatedMcpToken {
  tokenId: string;
  userId: string;
}

export function generateMcpToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString('base64url')}`;
}

export function hashMcpToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getTokenEncryptionKey(): Buffer {
  const secret =
    process.env.MCP_TOKEN_ENCRYPTION_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    'inzone-local-mcp-token-encryption-secret';

  return createHash('sha256').update(secret).digest();
}

export function encryptMcpToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(TOKEN_ENCRYPTION_ALGORITHM, getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_ENCRYPTION_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptMcpToken(encryptedToken: string): string {
  const [version, iv, tag, encrypted] = encryptedToken.split('.');
  if (version !== TOKEN_ENCRYPTION_VERSION || !iv || !tag || !encrypted) {
    throw new Error('Unsupported MCP token encryption payload');
  }

  const decipher = createDecipheriv(
    TOKEN_ENCRYPTION_ALGORITHM,
    getTokenEncryptionKey(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function isLikelyMcpToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length > TOKEN_PREFIX.length + 20;
}

export function safeTokenHashEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function calculateExpiresAt(option: TokenExpiryOption, now = new Date()): Date | null {
  if (option === 'never') {
    return null;
  }

  const expiresAt = new Date(now);
  if (option === '30d') {
    expiresAt.setDate(expiresAt.getDate() + 30);
  } else if (option === '90d') {
    expiresAt.setDate(expiresAt.getDate() + 90);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }
  return expiresAt;
}

export async function createMcpToken(
  prisma: PrismaClient,
  input: { userId: string; name: string; expiresIn: TokenExpiryOption },
): Promise<CreatedMcpToken> {
  const token = generateMcpToken();
  const created = await prisma.mcpToken.create({
    data: {
      userId: input.userId,
      name: input.name,
      tokenHash: hashMcpToken(token),
      encryptedToken: encryptMcpToken(token),
      expiresAt: calculateExpiresAt(input.expiresIn),
    },
  });

  return {
    id: created.id,
    name: created.name,
    token,
    expiresAt: created.expiresAt,
    createdAt: created.createdAt,
  };
}

export async function listMcpTokens(
  prisma: PrismaClient,
  userId: string,
): Promise<McpTokenMetadata[]> {
  const tokens = await prisma.mcpToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      encryptedToken: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return tokens.map(({ encryptedToken, ...token }) => ({
    ...token,
    canReveal: Boolean(encryptedToken),
  }));
}

export async function revealMcpToken(
  prisma: PrismaClient,
  input: { userId: string; tokenId: string },
): Promise<RevealedMcpToken | null> {
  const token = await prisma.mcpToken.findFirst({
    where: {
      id: input.tokenId,
      userId: input.userId,
    },
    select: {
      id: true,
      name: true,
      encryptedToken: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  if (!token?.encryptedToken) {
    return null;
  }

  return {
    id: token.id,
    name: token.name,
    token: decryptMcpToken(token.encryptedToken),
    expiresAt: token.expiresAt,
    lastUsedAt: token.lastUsedAt,
    revokedAt: token.revokedAt,
    createdAt: token.createdAt,
  };
}

export async function revokeMcpToken(
  prisma: PrismaClient,
  input: { userId: string; tokenId: string },
): Promise<boolean> {
  const result = await prisma.mcpToken.updateMany({
    where: {
      id: input.tokenId,
      userId: input.userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

export async function authenticateMcpToken(
  prisma: PrismaClient,
  bearerToken: string | undefined,
): Promise<AuthenticatedMcpToken | null> {
  if (!bearerToken || !isLikelyMcpToken(bearerToken)) {
    return null;
  }

  const tokenHash = hashMcpToken(bearerToken);
  const now = new Date();
  const token = await prisma.mcpToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!token || token.revokedAt || (token.expiresAt && token.expiresAt <= now)) {
    return null;
  }

  if (!safeTokenHashEquals(token.tokenHash, tokenHash)) {
    return null;
  }

  await prisma.mcpToken.update({
    where: { id: token.id },
    data: { lastUsedAt: now },
  });

  return { tokenId: token.id, userId: token.userId };
}

export function extractBearerToken(authorization: string | string[] | undefined): string | undefined {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header) return undefined;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }

  return token;
}
