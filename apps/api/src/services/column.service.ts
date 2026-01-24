import { PrismaClient, Column, Todo } from "@prisma/client";

export type ColumnWithTodos = Column & {
  todos: Todo[];
};

export type UpdateColumnInput = {
  name?: string;
  wipLimit?: number | null;
};

export class ColumnService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get a column by ID with its todos
   */
  async getColumnById(id: string): Promise<ColumnWithTodos | null> {
    return this.prisma.column.findUnique({
      where: { id },
      include: {
        todos: {
          where: { archived: false },
          orderBy: { position: "asc" },
        },
      },
    });
  }

  /**
   * Update a column
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
          where: { archived: false },
          orderBy: { position: "asc" },
        },
      },
    });
  }

  /**
   * Delete a column, optionally moving its todos to another column
   */
  async deleteColumn(id: string, moveToColumnId?: string): Promise<void> {
    // Get the column to be deleted
    const columnToDelete = await this.prisma.column.findUnique({
      where: { id },
      include: { todos: true },
    });

    if (!columnToDelete) {
      throw new Error("Column not found");
    }

    // If there are todos and moveToColumnId is provided, move them
    if (columnToDelete.todos.length > 0 && moveToColumnId) {
      // Verify target column exists and is in the same board
      const targetColumn = await this.prisma.column.findUnique({
        where: { id: moveToColumnId },
      });

      if (!targetColumn) {
        throw new Error("Target column not found");
      }

      if (targetColumn.boardId !== columnToDelete.boardId) {
        throw new Error("Target column must be in the same board");
      }

      // Get max position in target column
      const maxPosition = await this.prisma.todo.aggregate({
        where: { columnId: moveToColumnId },
        _max: { position: true },
      });
      let nextPosition = (maxPosition._max.position ?? -1) + 1;

      // Move todos to target column
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

    // Delete the column (cascade will delete todos if not moved)
    await this.prisma.column.delete({
      where: { id },
    });
  }

  /**
   * Reorder columns within a board
   */
  async reorderColumns(
    boardId: string,
    columns: { id: string; position: number }[]
  ): Promise<ColumnWithTodos[]> {
    // Verify all columns belong to the specified board
    const existingColumns = await this.prisma.column.findMany({
      where: {
        id: { in: columns.map((c) => c.id) },
        boardId,
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

    // Fetch updated columns
    return this.prisma.column.findMany({
      where: { boardId },
      orderBy: { position: "asc" },
      include: {
        todos: {
          where: { archived: false },
          orderBy: { position: "asc" },
        },
      },
    });
  }
}
