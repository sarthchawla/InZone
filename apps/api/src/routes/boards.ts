import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const boardsRouter: RouterType = Router();

// Validation schemas
const createBoardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  templateId: z.string().optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  position: z.number().int().min(0).optional(),
});

// GET /api/boards - List all boards
boardsRouter.get('/', async (_req, res, next) => {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { position: 'asc' },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { todos: { where: { archived: false } } },
            },
          },
        },
      },
    });

    // Calculate total todo count per board
    const boardsWithCounts = boards.map((board) => ({
      ...board,
      todoCount: board.columns.reduce((sum, col) => sum + col._count.todos, 0),
    }));

    res.json(boardsWithCounts);
  } catch (error) {
    next(error);
  }
});

// POST /api/boards - Create board
boardsRouter.post('/', async (req, res, next) => {
  try {
    const data = createBoardSchema.parse(req.body);

    // Get max position for new board
    const maxPosition = await prisma.board.aggregate({
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    // If templateId is provided, get template columns
    let columnsToCreate: { name: string; position: number; wipLimit?: number }[] = [];
    if (data.templateId) {
      const template = await prisma.boardTemplate.findUnique({
        where: { id: data.templateId },
      });
      if (template && Array.isArray(template.columns)) {
        columnsToCreate = (template.columns as { name: string; wipLimit?: number }[]).map(
          (col, index) => ({
            name: col.name,
            position: index,
            wipLimit: col.wipLimit,
          })
        );
      }
    }

    const board = await prisma.board.create({
      data: {
        name: data.name,
        description: data.description,
        templateId: data.templateId,
        position: newPosition,
        columns: {
          create: columnsToCreate,
        },
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.status(201).json(board);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    next(error);
  }
});

// GET /api/boards/:id - Get board with columns/todos
boardsRouter.get('/:id', async (req, res, next) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            todos: {
              where: { archived: false },
              orderBy: { position: 'asc' },
              include: {
                labels: true,
              },
            },
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.json(board);
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:id - Update board
boardsRouter.put('/:id', async (req, res, next) => {
  try {
    const data = updateBoardSchema.parse(req.body);

    const board = await prisma.board.update({
      where: { id: req.params.id },
      data,
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json(board);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    next(error);
  }
});

// DELETE /api/boards/:id - Delete board
boardsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.board.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    next(error);
  }
});

// POST /api/boards/:id/duplicate - Duplicate board
boardsRouter.post('/:id/duplicate', async (req, res, next) => {
  try {
    const sourceBoard = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            todos: {
              where: { archived: false },
              orderBy: { position: 'asc' },
              include: {
                labels: true,
              },
            },
          },
        },
      },
    });

    if (!sourceBoard) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    // Get max position
    const maxPosition = await prisma.board.aggregate({
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    // Create duplicated board with columns and todos
    const duplicatedBoard = await prisma.board.create({
      data: {
        name: `${sourceBoard.name} (Copy)`,
        description: sourceBoard.description,
        templateId: sourceBoard.templateId,
        position: newPosition,
        columns: {
          create: sourceBoard.columns.map((column) => ({
            name: column.name,
            position: column.position,
            wipLimit: column.wipLimit,
            todos: {
              create: column.todos.map((todo) => ({
                title: todo.title,
                description: todo.description,
                priority: todo.priority,
                dueDate: todo.dueDate,
                position: todo.position,
                labels: {
                  connect: todo.labels.map((label) => ({ id: label.id })),
                },
              })),
            },
          })),
        },
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            todos: {
              orderBy: { position: 'asc' },
              include: {
                labels: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(duplicatedBoard);
  } catch (error) {
    next(error);
  }
});

// POST /api/boards/:boardId/columns - Add column to board
boardsRouter.post('/:boardId/columns', async (req, res, next) => {
  try {
    const columnSchema = z.object({
      name: z.string().min(1, 'Name is required').max(100),
      wipLimit: z.number().int().min(1).optional(),
    });

    const data = columnSchema.parse(req.body);

    // Verify board exists
    const board = await prisma.board.findUnique({
      where: { id: req.params.boardId },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    // Get max position for new column
    const maxPosition = await prisma.column.aggregate({
      where: { boardId: req.params.boardId },
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    const column = await prisma.column.create({
      data: {
        name: data.name,
        wipLimit: data.wipLimit,
        position: newPosition,
        boardId: req.params.boardId,
      },
    });

    res.status(201).json(column);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }
    next(error);
  }
});
