import { Router } from 'express';

export const templatesRouter = Router();

// GET /api/templates - List built-in templates
templatesRouter.get('/', async (_req, res, next) => {
  try {
    // TODO: Implement in API phase
    res.json({ templates: [], message: 'Not yet implemented' });
  } catch (error) {
    next(error);
  }
});
