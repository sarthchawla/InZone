import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { Priority } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const todosRouter: RouterType = Router();

// Validation schemas
const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  columnId: z.string(),
  labelIds: z.array(z.string()).optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
});

const moveTodoSchema = z.object({
  columnId: z.string(),
  position: z.number().int().min(0).optional(),
});

const reorderTodosSchema = z.object({
  columnId: z.string(),
  todos: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    })
  ),
});

const archiveSchema = z.object({
  archived: z.boolean(),
});

// GET /api/todos - List todos (with filters)
todosRouter.get('/', async (req, res, next) => {
  try {
    const { columnId, boardId, archived, priority, labelId, search } = req.query;

    const where: {
      columnId?: string;
      column?: { boardId?: string; board?: { userId: string } };
      archived?: boolean;
      priority?: Priority;
      labels?: { some: { id: string } };
      title?: { contains: string; mode: 'insensitive' };
    } = {};

    // Always scope to current user's boards
    where.column = { board: { userId: req.user!.id } };

    if (columnId && typeof columnId === 'string') {
      where.columnId = columnId;
    }

    if (boardId && typeof boardId === 'string') {
      where.column = { ...where.column, boardId };
    }

    if (archived !== undefined) {
      where.archived = archived === 'true';
    } else {
      where.archived = false; // Default to non-archived
    }

    if (priority && typeof priority === 'string' && priority in Priority) {
      where.priority = priority as Priority;
    }

    if (labelId && typeof labelId === 'string') {
      where.labels = { some: { id: labelId } };
    }

    if (search && typeof search === 'string') {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const todos = await prisma.todo.findMany({
      where,
      orderBy: { position: 'asc' },
      include: {
        labels: true,
        column: {
          select: { id: true, name: true, boardId: true },
        },
      },
    });

    res.json(todos);
  } catch (error) {
    next(error);
  }
});

// POST /api/todos - Create todo
todosRouter.post('/', async (req, res, next) => {
  try {
    const data = createTodoSchema.parse(req.body);

    // Verify column exists and ownership through board
    const column = await prisma.column.findUnique({
      where: { id: data.columnId },
      include: { board: { select: { userId: true } } },
    });

    if (!column) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    if (column.board.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Get max position for new todo
    const maxPosition = await prisma.todo.aggregate({
      where: { columnId: data.columnId },
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    const todo = await prisma.todo.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        position: newPosition,
        columnId: data.columnId,
        labels: data.labelIds
          ? { connect: data.labelIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        labels: true,
      },
    });

    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
});

// GET /api/todos/:id - Get todo details
todosRouter.get('/:id', async (req, res, next) => {
  try {
    const todo = await prisma.todo.findUnique({
      where: { id: req.params.id },
      include: {
        labels: true,
        column: {
          select: { id: true, name: true, boardId: true, board: { select: { userId: true } } },
        },
      },
    });

    if (!todo || todo.column.board.userId !== req.user!.id) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    res.json(todo);
  } catch (error) {
    next(error);
  }
});

// PUT /api/todos/:id - Update todo
todosRouter.put('/:id', async (req, res, next) => {
  try {
    const data = updateTodoSchema.parse(req.body);

    // Prepare update data
    const updateData: {
      title?: string;
      description?: string | null;
      priority?: Priority;
      dueDate?: Date | null;
      labels?: { set: { id: string }[] };
    } = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.labelIds !== undefined) {
      updateData.labels = { set: data.labelIds.map((id) => ({ id })) };
    }

    // Verify ownership through chain
    const existing = await prisma.todo.findUnique({
      where: { id: req.params.id },
      include: { column: { select: { board: { select: { userId: true } } } } },
    });

    if (!existing || existing.column.board.userId !== req.user!.id) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        labels: true,
      },
    });

    res.json(todo);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/todos/:id - Delete todo
todosRouter.delete('/:id', async (req, res, next) => {
  try {
    // Verify ownership through chain
    const existing = await prisma.todo.findUnique({
      where: { id: req.params.id },
      include: { column: { select: { board: { select: { userId: true } } } } },
    });

    if (!existing || existing.column.board.userId !== req.user!.id) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    await prisma.todo.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PATCH /api/todos/:id/move - Move todo to column
todosRouter.patch('/:id/move', async (req, res, next) => {
  try {
    const data = moveTodoSchema.parse(req.body);

    // Verify target column exists and ownership
    const targetColumn = await prisma.column.findUnique({
      where: { id: data.columnId },
      include: { board: { select: { userId: true } } },
    });

    if (!targetColumn || targetColumn.board.userId !== req.user!.id) {
      res.status(404).json({ error: 'Target column not found' });
      return;
    }

    // Get the todo and verify ownership
    const existingTodo = await prisma.todo.findUnique({
      where: { id: req.params.id },
      include: { column: { select: { board: { select: { userId: true } } } } },
    });

    if (!existingTodo || existingTodo.column.board.userId !== req.user!.id) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    let newPosition = data.position;

    // If position not specified, add to end
    if (newPosition === undefined) {
      const maxPosition = await prisma.todo.aggregate({
        where: { columnId: data.columnId },
        _max: { position: true },
      });
      newPosition = (maxPosition._max.position ?? -1) + 1;
    } else {
      // Shift existing todos if inserting at specific position
      await prisma.todo.updateMany({
        where: {
          columnId: data.columnId,
          position: { gte: newPosition },
        },
        data: {
          position: { increment: 1 },
        },
      });
    }

    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: {
        columnId: data.columnId,
        position: newPosition,
      },
      include: {
        labels: true,
      },
    });

    res.json(todo);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/todos/reorder - Reorder todos within a column
todosRouter.patch('/reorder', async (req, res, next) => {
  try {
    const data = reorderTodosSchema.parse(req.body);

    // Verify column ownership through board
    const column = await prisma.column.findUnique({
      where: { id: data.columnId },
      include: { board: { select: { userId: true } } },
    });

    if (!column || column.board.userId !== req.user!.id) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    // Verify all todos belong to the specified column
    const todos = await prisma.todo.findMany({
      where: {
        id: { in: data.todos.map((t) => t.id) },
        columnId: data.columnId,
      },
    });

    if (todos.length !== data.todos.length) {
      res.status(400).json({ error: 'Invalid todo IDs or column mismatch' });
      return;
    }

    // Update positions in a transaction
    await prisma.$transaction(
      data.todos.map((todo) =>
        prisma.todo.update({
          where: { id: todo.id },
          data: { position: todo.position },
        })
      )
    );

    // Fetch updated todos
    const updatedTodos = await prisma.todo.findMany({
      where: { columnId: data.columnId, archived: false },
      orderBy: { position: 'asc' },
      include: {
        labels: true,
      },
    });

    res.json(updatedTodos);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/todos/:id/archive - Archive/unarchive todo
todosRouter.patch('/:id/archive', async (req, res, next) => {
  try {
    const data = archiveSchema.parse(req.body);

    // Verify ownership through chain
    const existing = await prisma.todo.findUnique({
      where: { id: req.params.id },
      include: { column: { select: { board: { select: { userId: true } } } } },
    });

    if (!existing || existing.column.board.userId !== req.user!.id) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: { archived: data.archived },
      include: {
        labels: true,
      },
    });

    res.json(todo);
  } catch (error) {
    next(error);
  }
});
