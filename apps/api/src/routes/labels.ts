import { Router } from 'express';

export const labelsRouter = Router();

// GET /api/labels - List labels
labelsRouter.get('/', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.json({ labels: [], message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// POST /api/labels - Create label
labelsRouter.post('/', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/labels/:id - Update label
labelsRouter.put('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/labels/:id - Delete label
labelsRouter.delete('/:id', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.status(501).json({ message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});
