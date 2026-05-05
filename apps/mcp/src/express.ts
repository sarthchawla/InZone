import { Router, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authenticateMcpToken, extractBearerToken } from './tokens.js';
import { createInZoneMcpServer } from './server.js';

function methodNotAllowed(res: Response): void {
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed.',
    },
    id: null,
  });
}

export function createMcpRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const bearerToken = extractBearerToken(req.headers.authorization);
    const auth = await authenticateMcpToken(prisma, bearerToken);

    if (!auth) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized',
        },
        id: null,
      });
      return;
    }

    const server = createInZoneMcpServer(prisma, auth.userId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('Error handling MCP request:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    } finally {
      await transport.close();
      await server.close();
    }
  });

  router.get('/', (_req, res) => methodNotAllowed(res));
  router.delete('/', (_req, res) => methodNotAllowed(res));

  return router;
}
