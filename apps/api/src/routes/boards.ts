import { Router } from 'express';

export const boardsRouter = Router();

// GET /api/boards - List all boards
boardsRouter.get('/', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.json({ boards: [], message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// POST /api/boards - Create board
boardsRouter.post('/', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// GET /api/boards/:id - Get board with columns/todos
boardsRouter.get('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:id - Update board
boardsRouter.put('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/boards/:id - Delete board
boardsRouter.delete('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// POST /api/boards/:id/duplicate - Duplicate board
boardsRouter.post('/:id/duplicate', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});
