import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { requireAuth } from './middleware/auth.js';
import { boardsRouter } from './routes/boards.js';
import { columnsRouter } from './routes/columns.js';
import { todosRouter } from './routes/todos.js';
import { templatesRouter } from './routes/templates.js';
import { labelsRouter } from './routes/labels.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
// API_PORT is used for worktree setups with unique ports; falls back to PORT for compatibility
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);

// CORS must be before all handlers (including auth) for preflight requests
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Better Auth handler - must be BEFORE express.json()
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Health check - available at both /health and /api/health for compatibility
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes (protected)
app.use('/api/boards', requireAuth, boardsRouter);
app.use('/api/columns', requireAuth, columnsRouter);
app.use('/api/todos', requireAuth, todosRouter);
app.use('/api/templates', requireAuth, templatesRouter);
app.use('/api/labels', requireAuth, labelsRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`InZone API running on http://localhost:${PORT}`);
});
