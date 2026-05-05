import { Priority, type PrismaClient } from '@prisma/client';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod/v4';
import { errorResult, jsonResult, messageResult } from './results.js';

export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const updateCurrentUserSchema = {
  name: z.string().min(1).max(100).optional().describe('Display name for the current user'),
  username: z.string().min(3).max(30).nullable().optional().describe('Optional username for the current user'),
  image: z.string().url().nullable().optional().describe('Optional avatar image URL'),
};

export const getBoardSchema = {
  id: z.string().min(1).describe('Board ID'),
};

export const createBoardSchema = {
  name: z.string().min(1).max(100).describe('Board name'),
  description: z.string().max(500).optional().describe('Optional board description'),
  templateId: z.string().optional().describe('Optional board template ID'),
};

export const updateBoardSchema = {
  id: z.string().min(1).describe('Board ID'),
  name: z.string().min(1).max(100).optional().describe('Board name'),
  description: z.string().max(500).nullable().optional().describe('Optional board description'),
  position: z.number().int().min(0).optional().describe('Board position'),
};

export const deleteBoardSchema = {
  id: z.string().min(1).describe('Board ID'),
};

export const listTodosSchema = {
  boardId: z.string().optional().describe('Optional board ID filter'),
  columnId: z.string().optional().describe('Optional column ID filter'),
  archived: z.boolean().optional().describe('Whether to include archived todos'),
  priority: prioritySchema.optional().describe('Optional priority filter'),
  search: z.string().optional().describe('Optional case-insensitive title search'),
};

export const getTodoSchema = {
  id: z.string().min(1).describe('Todo ID'),
};

export const createTodoSchema = {
  title: z.string().min(1).max(200).describe('Todo title'),
  description: z.string().max(5000).optional().describe('Optional todo description'),
  priority: prioritySchema.optional().describe('Todo priority'),
  dueDate: z.string().datetime().nullable().optional().describe('Optional ISO 8601 due date'),
  columnId: z.string().min(1).describe('Column ID that will contain the todo'),
};

export const updateTodoSchema = {
  id: z.string().min(1).describe('Todo ID'),
  title: z.string().min(1).max(200).optional().describe('Todo title'),
  description: z.string().max(5000).nullable().optional().describe('Optional todo description'),
  priority: prioritySchema.optional().describe('Todo priority'),
  dueDate: z.string().datetime().nullable().optional().describe('Optional ISO 8601 due date'),
};

export const deleteTodoSchema = {
  id: z.string().min(1).describe('Todo ID'),
};

export class InZoneMcpTools {
  constructor(
    private prisma: PrismaClient,
    private userId: string,
  ) {}

  async getCurrentUser(): Promise<CallToolResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: this.userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        username: true,
        displayUsername: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errorResult('Current user not found');
    }

    return jsonResult(user);
  }

  async updateCurrentUser(input: z.infer<z.ZodObject<typeof updateCurrentUserSchema>>): Promise<CallToolResult> {
    const data: {
      name?: string;
      username?: string | null;
      displayUsername?: string | null;
      image?: string | null;
    } = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.username !== undefined) {
      data.username = input.username;
      data.displayUsername = input.username;
    }
    if (input.image !== undefined) data.image = input.image;

    if (Object.keys(data).length === 0) {
      return errorResult('At least one field is required');
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: this.userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          username: true,
          displayUsername: true,
          updatedAt: true,
        },
      });
      return jsonResult(user);
    } catch {
      return errorResult('Failed to update current user');
    }
  }

  async deleteCurrentUser(): Promise<CallToolResult> {
    try {
      await this.prisma.user.delete({ where: { id: this.userId } });
      return messageResult('Current user deleted');
    } catch {
      return errorResult('Failed to delete current user');
    }
  }

  async listBoards(): Promise<CallToolResult> {
    const boards = await this.prisma.board.findMany({
      where: { userId: this.userId },
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

    return jsonResult(
      boards.map((board) => ({
        ...board,
        todoCount: board.columns.reduce((sum, column) => sum + column._count.todos, 0),
        columnCount: board.columns.length,
      })),
    );
  }

  async getBoard(input: z.infer<z.ZodObject<typeof getBoardSchema>>): Promise<CallToolResult> {
    const board = await this.prisma.board.findFirst({
      where: { id: input.id, userId: this.userId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            todos: {
              where: { archived: false },
              orderBy: { position: 'asc' },
              include: { labels: true },
            },
          },
        },
      },
    });

    if (!board) {
      return errorResult('Board not found');
    }

    return jsonResult(board);
  }

  async createBoard(input: z.infer<z.ZodObject<typeof createBoardSchema>>): Promise<CallToolResult> {
    const maxPosition = await this.prisma.board.aggregate({
      where: { userId: this.userId },
      _max: { position: true },
    });

    let columnsToCreate: { name: string; position: number; wipLimit?: number }[] = [];
    if (input.templateId) {
      const template = await this.prisma.boardTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template || !Array.isArray(template.columns)) {
        return errorResult('Template not found');
      }
      columnsToCreate = (template.columns as { name: string; wipLimit?: number }[]).map((column, index) => ({
        name: column.name,
        position: index,
        wipLimit: column.wipLimit,
      }));
    }

    const board = await this.prisma.board.create({
      data: {
        name: input.name,
        description: input.description,
        templateId: input.templateId,
        position: (maxPosition._max.position ?? -1) + 1,
        userId: this.userId,
        columns: { create: columnsToCreate },
      },
      include: { columns: { orderBy: { position: 'asc' } } },
    });

    return jsonResult(board);
  }

  async updateBoard(input: z.infer<z.ZodObject<typeof updateBoardSchema>>): Promise<CallToolResult> {
    const existing = await this.prisma.board.findFirst({
      where: { id: input.id, userId: this.userId },
      select: { id: true },
    });
    if (!existing) {
      return errorResult('Board not found');
    }

    const board = await this.prisma.board.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        position: input.position,
      },
      include: { columns: { orderBy: { position: 'asc' } } },
    });

    return jsonResult(board);
  }

  async deleteBoard(input: z.infer<z.ZodObject<typeof deleteBoardSchema>>): Promise<CallToolResult> {
    const existing = await this.prisma.board.findFirst({
      where: { id: input.id, userId: this.userId },
      select: { id: true },
    });
    if (!existing) {
      return errorResult('Board not found');
    }

    await this.prisma.board.delete({ where: { id: input.id } });
    return messageResult('Board deleted');
  }

  async listTodos(input: z.infer<z.ZodObject<typeof listTodosSchema>>): Promise<CallToolResult> {
    const where: {
      column?: { board?: { userId: string }; boardId?: string };
      columnId?: string;
      archived?: boolean;
      priority?: Priority;
      title?: { contains: string; mode: 'insensitive' };
    } = {
      column: { board: { userId: this.userId } },
    };

    if (input.boardId) where.column = { ...where.column, boardId: input.boardId };
    if (input.columnId) where.columnId = input.columnId;
    where.archived = input.archived ?? false;
    if (input.priority) where.priority = input.priority as Priority;
    if (input.search) where.title = { contains: input.search, mode: 'insensitive' };

    const todos = await this.prisma.todo.findMany({
      where,
      orderBy: { position: 'asc' },
      include: {
        labels: true,
        column: { select: { id: true, name: true, boardId: true } },
      },
    });

    return jsonResult(todos);
  }

  async getTodo(input: z.infer<z.ZodObject<typeof getTodoSchema>>): Promise<CallToolResult> {
    const todo = await this.prisma.todo.findUnique({
      where: { id: input.id },
      include: {
        labels: true,
        column: {
          select: { id: true, name: true, boardId: true, board: { select: { userId: true } } },
        },
      },
    });

    if (!todo || todo.column.board.userId !== this.userId) {
      return errorResult('Todo not found');
    }

    return jsonResult(todo);
  }

  async createTodo(input: z.infer<z.ZodObject<typeof createTodoSchema>>): Promise<CallToolResult> {
    const column = await this.prisma.column.findUnique({
      where: { id: input.columnId },
      include: { board: { select: { userId: true } } },
    });

    if (!column || column.board.userId !== this.userId) {
      return errorResult('Column not found');
    }

    const maxPosition = await this.prisma.todo.aggregate({
      where: { columnId: input.columnId },
      _max: { position: true },
    });

    const todo = await this.prisma.todo.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority as Priority | undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        columnId: input.columnId,
        position: (maxPosition._max.position ?? -1) + 1,
      },
      include: { labels: true },
    });

    return jsonResult(todo);
  }

  async updateTodo(input: z.infer<z.ZodObject<typeof updateTodoSchema>>): Promise<CallToolResult> {
    const existing = await this.prisma.todo.findUnique({
      where: { id: input.id },
      include: { column: { select: { board: { select: { userId: true } } } } },
    });

    if (!existing || existing.column.board.userId !== this.userId) {
      return errorResult('Todo not found');
    }

    const todo = await this.prisma.todo.update({
      where: { id: input.id },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority as Priority | undefined,
        dueDate: input.dueDate === undefined ? undefined : input.dueDate ? new Date(input.dueDate) : null,
      },
      include: { labels: true },
    });

    return jsonResult(todo);
  }

  async deleteTodo(input: z.infer<z.ZodObject<typeof deleteTodoSchema>>): Promise<CallToolResult> {
    const existing = await this.prisma.todo.findUnique({
      where: { id: input.id },
      include: { column: { select: { board: { select: { userId: true } } } } },
    });

    if (!existing || existing.column.board.userId !== this.userId) {
      return errorResult('Todo not found');
    }

    await this.prisma.todo.delete({ where: { id: input.id } });
    return messageResult('Todo deleted');
  }
}
