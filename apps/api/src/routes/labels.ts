import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const labelsRouter: RouterType = Router();

// Validation schemas
const createLabelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format'),
});

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').optional(),
});

// GET /api/labels - List labels
labelsRouter.get('/', async (_req, res, next) => {
  try {
    const labels = await prisma.label.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { todos: true },
        },
      },
    });

    res.json(labels);
  } catch (error) {
    next(error);
  }
});

// POST /api/labels - Create label
labelsRouter.post('/', async (req, res, next) => {
  try {
    const data = createLabelSchema.parse(req.body);

    const label = await prisma.label.create({
      data: {
        name: data.name,
        color: data.color,
      },
    });

    res.status(201).json(label);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    next(error);
  }
});

// GET /api/labels/:id - Get label by ID
labelsRouter.get('/:id', async (req, res, next) => {
  try {
    const label = await prisma.label.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { todos: true },
        },
      },
    });

    if (!label) {
      res.status(404).json({ error: 'Label not found' });
      return;
    }

    res.json(label);
  } catch (error) {
    next(error);
  }
});

// PUT /api/labels/:id - Update label
labelsRouter.put('/:id', async (req, res, next) => {
  try {
    const data = updateLabelSchema.parse(req.body);

    const label = await prisma.label.update({
      where: { id: req.params.id },
      data,
    });

    res.json(label);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'Label not found' });
      return;
    }
    next(error);
  }
});

// DELETE /api/labels/:id - Delete label
labelsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.label.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'Label not found' });
      return;
    }
    next(error);
  }
});
