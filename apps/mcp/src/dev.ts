import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createMcpRouter } from './express.js';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 3002);

app.use(express.json());
app.use('/api/mcp', createMcpRouter(prisma));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
  console.log(`InZone MCP dev server listening on http://localhost:${port}/api/mcp`);
});
