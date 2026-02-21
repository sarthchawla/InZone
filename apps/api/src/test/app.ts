import express, { Express } from "express";
import cors from "cors";
import { boardsRouter } from "../routes/boards.js";
import { columnsRouter } from "../routes/columns.js";
import { todosRouter } from "../routes/todos.js";
import { templatesRouter } from "../routes/templates.js";
import { labelsRouter } from "../routes/labels.js";
import { errorHandler } from "../middleware/errorHandler.js";

export const TEST_USER = {
  id: "test-user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

/**
 * Create an Express app instance for testing.
 * This is similar to the main app but doesn't start a server.
 */
export function createTestApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Mock auth — inject test user on all requests
  app.use((req, _res, next) => {
    req.user = TEST_USER;
    next();
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use("/api/boards", boardsRouter);
  app.use("/api/columns", columnsRouter);
  app.use("/api/todos", todosRouter);
  app.use("/api/templates", templatesRouter);
  app.use("/api/labels", labelsRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
