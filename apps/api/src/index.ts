import express from 'express';
import cors from 'cors';
import { boardsRouter } from './routes/boards.js';
import { columnsRouter } from './routes/columns.js';
import { todosRouter } from './routes/todos.js';
import { templatesRouter } from './routes/templates.js';
import { labelsRouter } from './routes/labels.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
// API_PORT is used for worktree setups with unique ports; falls back to PORT for compatibility
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/boards', boardsRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/todos', todosRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/labels', labelsRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`InZone API running on http://localhost:${PORT}`);
});
