import { Router } from 'express';

export const columnsRouter = Router();

// POST /api/boards/:boardId/columns - Add column (handled in boards router for nested route)
// This router handles /api/columns/* routes

// PUT /api/columns/:id - Update column
columnsRouter.put('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/columns/:id - Delete column
columnsRouter.delete('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/columns/reorder - Reorder columns
columnsRouter.patch('/reorder', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});
