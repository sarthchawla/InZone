import { Router, type Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';

export const templatesRouter: RouterType = Router();

// GET /api/templates - List built-in templates
templatesRouter.get('/', async (_req, res, next) => {
  try {
    const templates = await prisma.boardTemplate.findMany({
      where: { isBuiltIn: true },
      orderBy: { name: 'asc' },
    });

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// GET /api/templates/:id - Get template by ID
templatesRouter.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.boardTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});
