import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../apps/api/src/lib/auth.js';
import { requireAuth } from '../apps/api/src/middleware/auth.js';
import { boardsRouter } from '../apps/api/src/routes/boards.js';
import { columnsRouter } from '../apps/api/src/routes/columns.js';
import { todosRouter } from '../apps/api/src/routes/todos.js';
import { templatesRouter } from '../apps/api/src/routes/templates.js';
import { labelsRouter } from '../apps/api/src/routes/labels.js';
import { errorHandler } from '../apps/api/src/middleware/errorHandler.js';

const app = express();

// CORS - must allow credentials for session cookies
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Better Auth handler - MUST be before express.json() (needs raw body)
app.all('/api/auth/*', toNodeHandler(auth));

// Body parsing - after auth handler
app.use(express.json());

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected API Routes
app.use('/api/boards', requireAuth, boardsRouter);
app.use('/api/columns', requireAuth, columnsRouter);
app.use('/api/todos', requireAuth, todosRouter);
app.use('/api/templates', requireAuth, templatesRouter);
app.use('/api/labels', requireAuth, labelsRouter);

// Error handling
app.use(errorHandler);

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
