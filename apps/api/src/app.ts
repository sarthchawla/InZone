import express, { type Express } from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { allowedOrigins } from './lib/origins.js';
import { requireAuth } from './middleware/auth.js';
import { boardsRouter } from './routes/boards.js';
import { columnsRouter } from './routes/columns.js';
import { todosRouter } from './routes/todos.js';
import { templatesRouter } from './routes/templates.js';
import { labelsRouter } from './routes/labels.js';
import { invitesRouter } from './routes/invites.js';
import { accessRequestsRouter } from './routes/access-requests.js';
import { securityQuestionsRouter } from './routes/security-questions.js';
import { errorHandler } from './middleware/errorHandler.js';

const app: Express = express();

// CORS must be before all handlers (including auth) for preflight requests
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Intercept Better Auth error page and redirect to frontend
app.get('/api/auth/error', (req, res) => {
  const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const errorCode = req.query.error as string || 'oauth_error';

  if (errorCode === 'unable_to_create_user') {
    res.redirect(`${frontendUrl}/request-access?error=no_access`);
  } else {
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorCode)}`);
  }
});

// Set password for OAuth-only users (server-only Better Auth API)
app.post('/api/auth/set-password', express.json(), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'newPassword is required.' });
      return;
    }

    // Forward session cookies to Better Auth's server-side API
    const headers = new Headers();
    if (req.headers.cookie) headers.set('cookie', req.headers.cookie);

    await auth.api.setPassword({
      body: { newPassword },
      headers,
    });

    res.json({ success: true });
  } catch (err: any) {
    const message = err?.message || 'Failed to set password.';
    const status = message.includes('already') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// Better Auth handler - must be BEFORE express.json()
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Health check - available at both /health and /api/health for compatibility
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public API Routes (no auth required — auth handled per-route)
app.use('/api/invites', invitesRouter);
app.use('/api/access-requests', accessRequestsRouter);
app.use('/api/security-questions', securityQuestionsRouter);

// API Routes (protected)
app.use('/api/boards', requireAuth, boardsRouter);
app.use('/api/columns', requireAuth, columnsRouter);
app.use('/api/todos', requireAuth, todosRouter);
app.use('/api/templates', requireAuth, templatesRouter);
app.use('/api/labels', requireAuth, labelsRouter);

// Error handling
app.use(errorHandler);

export { app };
