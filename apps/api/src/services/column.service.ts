import { PrismaClient, Column, Todo } from "@prisma/client";

export type ColumnWithTodos = Column & {
  todos: Todo[];
};

export type UpdateColumnInput = {
  name?: string;
  description?: string | null;
  wipLimit?: number | null;
};

export class ColumnService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get a column by ID with its todos
   * Excludes soft-deleted columns and todos
   */
  async getColumnById(id: string): Promise<ColumnWithTodos | null> {
    return this.prisma.column.findFirst({
      where: { id, isDeleted: false },
      include: {
        todos: {
          where: { archived: false, isDeleted: false },
          orderBy: { position: "asc" },
        },
      },
    });
  }

  /**
   * Update a column
   * Returns todos excluding soft-deleted ones
   */
  async updateColumn(
    id: string,
    input: UpdateColumnInput
  ): Promise<ColumnWithTodos> {
    return this.prisma.column.update({
      where: { id },
      data: input,
      include: {
        todos: {
          where: { archived: false, isDeleted: false },
          orderBy: { position: "asc" },
        },
      },
    });
  }

  /**
   * Soft-delete a column, optionally moving its todos to another column
   * Sets deletedAt and isDeleted on the column
   */
  async deleteColumn(id: string, moveToColumnId?: string): Promise<void> {
    // Get the column to be deleted (excluding already soft-deleted)
    const columnToDelete = await this.prisma.column.findFirst({
      where: { id, isDeleted: false },
      include: { todos: { where: { isDeleted: false } } },
    });

    if (!columnToDelete) {
      throw new Error("Column not found");
    }

    // If there are active todos and moveToColumnId is provided, move them
    if (columnToDelete.todos.length > 0 && moveToColumnId) {
      // Verify target column exists, is not soft-deleted, and is in the same board
      const targetColumn = await this.prisma.column.findFirst({
        where: { id: moveToColumnId, isDeleted: false },
      });

      if (!targetColumn) {
        throw new Error("Target column not found");
      }

      if (targetColumn.boardId !== columnToDelete.boardId) {
        throw new Error("Target column must be in the same board");
      }

      // Get max position in target column (excluding soft-deleted)
      const maxPosition = await this.prisma.todo.aggregate({
        where: { columnId: moveToColumnId, isDeleted: false },
        _max: { position: true },
      });
      let nextPosition = (maxPosition._max.position ?? -1) + 1;

      // Move active todos to target column
      await this.prisma.$transaction(
        columnToDelete.todos.map((todo) =>
          this.prisma.todo.update({
            where: { id: todo.id },
            data: {
              columnId: moveToColumnId,
              position: nextPosition++,
            },
          })
        )
      );
    }

    // Soft-delete the column (associated todos remain but column is marked deleted)
    await this.prisma.column.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDeleted: true,
      },
    });
  }

  /**
   * Reorder columns within a board
   * Excludes soft-deleted columns
   */
  async reorderColumns(
    boardId: string,
    columns: { id: string; position: number }[]
  ): Promise<ColumnWithTodos[]> {
    // Verify all columns belong to the specified board and are not soft-deleted
    const existingColumns = await this.prisma.column.findMany({
      where: {
        id: { in: columns.map((c) => c.id) },
        boardId,
        isDeleted: false,
      },
    });

    if (existingColumns.length !== columns.length) {
      throw new Error("Invalid column IDs or board mismatch");
    }

    // Update positions in a transaction
    await this.prisma.$transaction(
      columns.map((col) =>
        this.prisma.column.update({
          where: { id: col.id },
          data: { position: col.position },
        })
      )
    );

    // Fetch updated columns (excluding soft-deleted)
    return this.prisma.column.findMany({
      where: { boardId, isDeleted: false },
      orderBy: { position: "asc" },
      include: {
        todos: {
          where: { archived: false, isDeleted: false },
          orderBy: { position: "asc" },
        },
      },
    });
  }
}
