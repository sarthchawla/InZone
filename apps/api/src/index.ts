import express from 'express';
import cors from 'cors';
import { boardsRouter } from './routes/boards.js';
import { columnsRouter } from './routes/columns.js';
import { todosRouter } from './routes/todos.js';
import { templatesRouter } from './routes/templates.js';
import { labelsRouter } from './routes/labels.js';
import { webhooksRouter } from './routes/webhooks.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check - available at both /health and /api/health for compatibility
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/boards', boardsRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/todos', todosRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/webhooks', webhooksRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`InZone API running on http://localhost:${PORT}`);
});
