import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  createMcpToken,
  listMcpTokens,
  revealMcpToken,
  revokeMcpToken,
  tokenExpiryOptions,
} from '@inzone/mcp/tokens';

export const mcpTokensRouter: RouterType = Router();

const createMcpTokenSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name must be at most 80 characters'),
  expiresIn: z.enum(tokenExpiryOptions),
});

mcpTokensRouter.get('/', async (req, res, next) => {
  try {
    const tokens = await listMcpTokens(prisma, req.user!.id);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

mcpTokensRouter.post('/', async (req, res, next) => {
  try {
    const data = createMcpTokenSchema.parse(req.body);
    const token = await createMcpToken(prisma, {
      userId: req.user!.id,
      name: data.name,
      expiresIn: data.expiresIn,
    });

    res.status(201).json(token);
  } catch (error) {
    next(error);
  }
});

mcpTokensRouter.get('/:id', async (req, res, next) => {
  try {
    const token = await revealMcpToken(prisma, {
      userId: req.user!.id,
      tokenId: req.params.id,
    });

    if (!token) {
      res.status(404).json({ error: 'MCP token not found or cannot be revealed' });
      return;
    }

    res.json(token);
  } catch (error) {
    next(error);
  }
});

mcpTokensRouter.delete('/:id', async (req, res, next) => {
  try {
    const revoked = await revokeMcpToken(prisma, {
      userId: req.user!.id,
      tokenId: req.params.id,
    });

    if (!revoked) {
      res.status(404).json({ error: 'MCP token not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
