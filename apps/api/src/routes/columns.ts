import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const columnsRouter: RouterType = Router();

// Validation schemas
const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
});

const reorderColumnsSchema = z.object({
  boardId: z.string(),
  columns: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    })
  ),
});

// PUT /api/columns/:id - Update column
columnsRouter.put('/:id', async (req, res, next) => {
  try {
    const data = updateColumnSchema.parse(req.body);

    // Verify ownership through board
    const existing = await prisma.column.findUnique({
      where: { id: req.params.id },
      include: { board: { select: { userId: true } } },
    });

    if (!existing || existing.board.userId !== req.user!.id) {
      res.status(existing ? 403 : 404).json({ error: existing ? 'Forbidden' : 'Column not found' });
      return;
    }

    const column = await prisma.column.update({
      where: { id: req.params.id },
      data,
      include: {
        todos: {
          where: { archived: false },
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json(column);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/columns/:id - Delete column
columnsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { moveToColumnId } = req.query;

    // Get the column to be deleted with ownership check
    const columnToDelete = await prisma.column.findUnique({
      where: { id: req.params.id },
      include: { todos: true, board: { select: { userId: true } } },
    });

    if (!columnToDelete) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    if (columnToDelete.board.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // If there are todos and moveToColumnId is provided, move them
    if (columnToDelete.todos.length > 0 && moveToColumnId && typeof moveToColumnId === 'string') {
      // Verify target column exists and is in the same board
      const targetColumn = await prisma.column.findUnique({
        where: { id: moveToColumnId },
      });

      if (!targetColumn || targetColumn.boardId !== columnToDelete.boardId) {
        res.status(400).json({ error: 'Invalid target column' });
        return;
      }

      // Get max position in target column
      const maxPosition = await prisma.todo.aggregate({
        where: { columnId: moveToColumnId },
        _max: { position: true },
      });
      let nextPosition = (maxPosition._max.position ?? -1) + 1;

      // Move todos to target column
      await prisma.$transaction(
        columnToDelete.todos.map((todo) =>
          prisma.todo.update({
            where: { id: todo.id },
            data: {
              columnId: moveToColumnId,
              position: nextPosition++,
            },
          })
        )
      );
    }

    // Delete the column (cascade will delete todos if not moved)
    await prisma.column.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PATCH /api/columns/reorder - Reorder columns
columnsRouter.patch('/reorder', async (req, res, next) => {
  try {
    const data = reorderColumnsSchema.parse(req.body);

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: { id: data.boardId, userId: req.user!.id },
    });
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    // Verify all columns belong to the specified board
    const columns = await prisma.column.findMany({
      where: {
        id: { in: data.columns.map((c) => c.id) },
        boardId: data.boardId,
      },
    });

    if (columns.length !== data.columns.length) {
      res.status(400).json({ error: 'Invalid column IDs or board mismatch' });
      return;
    }

    // Update positions in a transaction
    await prisma.$transaction(
      data.columns.map((col) =>
        prisma.column.update({
          where: { id: col.id },
          data: { position: col.position },
        })
      )
    );

    // Fetch updated columns
    const updatedColumns = await prisma.column.findMany({
      where: { boardId: data.boardId },
      orderBy: { position: 'asc' },
      include: {
        todos: {
          where: { archived: false },
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json(updatedColumns);
  } catch (error) {
    next(error);
  }
});
