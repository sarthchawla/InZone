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
   * Excludes soft-deleted boards and columns
   */
  async getBoards(): Promise<BoardWithColumns[]> {
    const boards = await this.prisma.board.findMany({
      where: { isDeleted: false },
      orderBy: { position: "asc" },
      include: {
        columns: {
          where: { isDeleted: false },
          orderBy: { position: "asc" },
          include: {
            _count: {
              select: { todos: { where: { archived: false, isDeleted: false } } },
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
   * Excludes soft-deleted items
   */
  async getBoardById(id: string): Promise<BoardWithDetails | null> {
    return this.prisma.board.findFirst({
      where: { id, isDeleted: false },
      include: {
        columns: {
          where: { isDeleted: false },
          orderBy: { position: "asc" },
          include: {
            todos: {
              where: { archived: false, isDeleted: false },
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
    // Get max position for new board (excluding soft-deleted)
    const maxPosition = await this.prisma.board.aggregate({
      where: { isDeleted: false },
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
   * Soft-delete a board (sets deletedAt and isDeleted)
   */
  async deleteBoard(id: string): Promise<void> {
    await this.prisma.board.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDeleted: true,
      },
    });
  }

  /**
   * Duplicate a board with all its columns and todos
   * Excludes soft-deleted items
   */
  async duplicateBoard(
    id: string
  ): Promise<BoardWithDetails | null> {
    // Get source board with all details (excluding soft-deleted)
    const sourceBoard = await this.prisma.board.findFirst({
      where: { id, isDeleted: false },
      include: {
        columns: {
          where: { isDeleted: false },
          orderBy: { position: "asc" },
          include: {
            todos: {
              where: { archived: false, isDeleted: false },
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

    // Get max position (excluding soft-deleted)
    const maxPosition = await this.prisma.board.aggregate({
      where: { isDeleted: false },
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
    wipLimit?: number,
    description?: string
  ): Promise<Column | null> {
    // Verify board exists and is not soft-deleted
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, isDeleted: false },
    });

    if (!board) {
      return null;
    }

    // Get max position for new column (excluding soft-deleted)
    const maxPosition = await this.prisma.column.aggregate({
      where: { boardId, isDeleted: false },
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    return this.prisma.column.create({
      data: {
        name,
        description,
        wipLimit,
        position: newPosition,
        boardId,
      },
    });
  }
}
