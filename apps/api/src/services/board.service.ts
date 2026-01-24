import { PrismaClient, Board, Column, Todo, Label } from "@prisma/client";

export type BoardWithColumns = Board & {
  columns: (Column & {
    _count: { todos: number };
  })[];
  todoCount?: number;
};

export type BoardWithDetails = Board & {
  columns: (Column & {
    todos: (Todo & { labels: Label[] })[];
  })[];
};

export type CreateBoardInput = {
  name: string;
  description?: string;
  templateId?: string;
};

export type UpdateBoardInput = {
  name?: string;
  description?: string | null;
  position?: number;
};

export class BoardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all boards with their columns and todo counts
   */
  async getBoards(): Promise<BoardWithColumns[]> {
    const boards = await this.prisma.board.findMany({
      orderBy: { position: "asc" },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            _count: {
              select: { todos: { where: { archived: false } } },
            },
          },
        },
      },
    });

    // Calculate total todo count per board
    return boards.map((board) => ({
      ...board,
      todoCount: board.columns.reduce((sum, col) => sum + col._count.todos, 0),
    }));
  }

  /**
   * Get a single board by ID with all details
   */
  async getBoardById(id: string): Promise<BoardWithDetails | null> {
    return this.prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            todos: {
              where: { archived: false },
              orderBy: { position: "asc" },
              include: {
                labels: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new board, optionally from a template
   */
  async createBoard(
    input: CreateBoardInput
  ): Promise<Board & { columns: Column[] }> {
    // Get max position for new board
    const maxPosition = await this.prisma.board.aggregate({
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    // If templateId is provided, get template columns
    let columnsToCreate: { name: string; position: number; wipLimit?: number }[] =
      [];
    if (input.templateId) {
      const template = await this.prisma.boardTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template) {
        throw new Error("Template not found");
      }
      if (Array.isArray(template.columns)) {
        columnsToCreate = (
          template.columns as { name: string; wipLimit?: number }[]
        ).map((col, index) => ({
          name: col.name,
          position: index,
          wipLimit: col.wipLimit,
        }));
      }
    }

    return this.prisma.board.create({
      data: {
        name: input.name,
        description: input.description,
        templateId: input.templateId,
        position: newPosition,
        columns: {
          create: columnsToCreate,
        },
      },
      include: {
        columns: {
          orderBy: { position: "asc" },
        },
      },
    });
  }

  /**
   * Update a board
   */
  async updateBoard(
    id: string,
    input: UpdateBoardInput
  ): Promise<Board & { columns: Column[] }> {
    return this.prisma.board.update({
      where: { id },
      data: input,
      include: {
        columns: {
          orderBy: { position: "asc" },
        },
      },
    });
  }

  /**
   * Delete a board
   */
  async deleteBoard(id: string): Promise<void> {
    await this.prisma.board.delete({
      where: { id },
    });
  }

  /**
   * Duplicate a board with all its columns and todos
   */
  async duplicateBoard(
    id: string
  ): Promise<BoardWithDetails | null> {
    // Get source board with all details
    const sourceBoard = await this.prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            todos: {
              where: { archived: false },
              orderBy: { position: "asc" },
              include: {
                labels: true,
              },
            },
          },
        },
      },
    });

    if (!sourceBoard) {
      return null;
    }

    // Get max position
    const maxPosition = await this.prisma.board.aggregate({
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    // Create duplicated board with columns and todos
    return this.prisma.board.create({
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
          orderBy: { position: "asc" },
          include: {
            todos: {
              orderBy: { position: "asc" },
              include: {
                labels: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Add a column to a board
   */
  async addColumn(
    boardId: string,
    name: string,
    wipLimit?: number
  ): Promise<Column | null> {
    // Verify board exists
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return null;
    }

    // Get max position for new column
    const maxPosition = await this.prisma.column.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    return this.prisma.column.create({
      data: {
        name,
        wipLimit,
        position: newPosition,
        boardId,
      },
    });
  }
}
