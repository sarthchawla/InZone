import { Router } from 'express';

export const todosRouter = Router();

// GET /api/todos - List todos (with filters)
todosRouter.get('/', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.json({ todos: [], message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// POST /api/todos - Create todo
todosRouter.post('/', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// GET /api/todos/:id - Get todo details
todosRouter.get('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/todos/:id - Update todo
todosRouter.put('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/todos/:id - Delete todo
todosRouter.delete('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/todos/:id/move - Move todo to column
todosRouter.patch('/:id/move', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/todos/reorder - Reorder todos
todosRouter.patch('/reorder', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/todos/:id/archive - Archive todo
todosRouter.patch('/:id/archive', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});
