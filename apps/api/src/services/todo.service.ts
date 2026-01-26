import { PrismaClient, Todo, Label, Priority } from "@prisma/client";

export type TodoWithLabels = Todo & {
  labels: Label[];
};

export type TodoWithDetails = Todo & {
  labels: Label[];
  column: {
    id: string;
    name: string;
    boardId: string;
  };
};

export type CreateTodoInput = {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  columnId: string;
  labelIds?: string[];
};

export type UpdateTodoInput = {
  title?: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: string | null;
  labelIds?: string[];
};

export type TodoFilter = {
  columnId?: string;
  boardId?: string;
  archived?: boolean;
  priority?: Priority;
  labelId?: string;
  search?: string;
  includeDeleted?: boolean;
};

export class TodoService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get todos with filters
   * Excludes soft-deleted todos by default
   */
  async getTodos(filter: TodoFilter = {}): Promise<TodoWithDetails[]> {
    const where: {
      columnId?: string;
      column?: { boardId: string; isDeleted: boolean };
      archived?: boolean;
      isDeleted?: boolean;
      priority?: Priority;
      labels?: { some: { id: string } };
      title?: { contains: string; mode: "insensitive" };
    } = {};

    if (filter.columnId) {
      where.columnId = filter.columnId;
    }

    if (filter.boardId) {
      where.column = { boardId: filter.boardId, isDeleted: false };
    }

    if (filter.archived !== undefined) {
      where.archived = filter.archived;
    } else {
      where.archived = false; // Default to non-archived
    }

    // Filter out soft-deleted by default
    if (!filter.includeDeleted) {
      where.isDeleted = false;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.labelId) {
      where.labels = { some: { id: filter.labelId } };
    }

    if (filter.search) {
      where.title = { contains: filter.search, mode: "insensitive" };
    }

    return this.prisma.todo.findMany({
      where,
      orderBy: { position: "asc" },
      include: {
        labels: true,
        column: {
          select: { id: true, name: true, boardId: true },
        },
      },
    });
  }

  /**
   * Get a single todo by ID
   * Excludes soft-deleted todos
   */
  async getTodoById(id: string): Promise<TodoWithDetails | null> {
    return this.prisma.todo.findFirst({
      where: { id, isDeleted: false },
      include: {
        labels: true,
        column: {
          select: { id: true, name: true, boardId: true },
        },
      },
    });
  }

  /**
   * Create a new todo
   */
  async createTodo(input: CreateTodoInput): Promise<TodoWithLabels | null> {
    // Verify column exists and is not soft-deleted
    const column = await this.prisma.column.findFirst({
      where: { id: input.columnId, isDeleted: false },
    });

    if (!column) {
      return null;
    }

    // Get max position for new todo (excluding soft-deleted)
    const maxPosition = await this.prisma.todo.aggregate({
      where: { columnId: input.columnId, isDeleted: false },
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    return this.prisma.todo.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        position: newPosition,
        columnId: input.columnId,
        labels: input.labelIds
          ? { connect: input.labelIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        labels: true,
      },
    });
  }

  /**
   * Update a todo
   */
  async updateTodo(
    id: string,
    input: UpdateTodoInput
  ): Promise<TodoWithLabels> {
    // Prepare update data
    const updateData: {
      title?: string;
      description?: string | null;
      priority?: Priority;
      dueDate?: Date | null;
      labels?: { set: { id: string }[] };
    } = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.dueDate !== undefined) {
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.labelIds !== undefined) {
      updateData.labels = { set: input.labelIds.map((id) => ({ id })) };
    }

    return this.prisma.todo.update({
      where: { id },
      data: updateData,
      include: {
        labels: true,
      },
    });
  }

  /**
   * Soft-delete a todo (sets deletedAt and isDeleted)
   */
  async deleteTodo(id: string): Promise<void> {
    await this.prisma.todo.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDeleted: true,
      },
    });
  }

  /**
   * Move a todo to a different column
   * Excludes soft-deleted columns and todos
   */
  async moveTodo(
    id: string,
    columnId: string,
    position?: number
  ): Promise<TodoWithLabels | null> {
    // Verify target column exists and is not soft-deleted
    const targetColumn = await this.prisma.column.findFirst({
      where: { id: columnId, isDeleted: false },
    });

    if (!targetColumn) {
      throw new Error("Target column not found");
    }

    // Get the todo (excluding soft-deleted)
    const existingTodo = await this.prisma.todo.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingTodo) {
      return null;
    }

    let newPosition = position;

    // If position not specified, add to end (excluding soft-deleted)
    if (newPosition === undefined) {
      const maxPosition = await this.prisma.todo.aggregate({
        where: { columnId, isDeleted: false },
        _max: { position: true },
      });
      newPosition = (maxPosition._max.position ?? -1) + 1;
    } else {
      // Shift existing todos if inserting at specific position (excluding soft-deleted)
      await this.prisma.todo.updateMany({
        where: {
          columnId,
          isDeleted: false,
          position: { gte: newPosition },
        },
        data: {
          position: { increment: 1 },
        },
      });
    }

    return this.prisma.todo.update({
      where: { id },
      data: {
        columnId,
        position: newPosition,
      },
      include: {
        labels: true,
      },
    });
  }

  /**
   * Reorder todos within a column
   * Excludes soft-deleted todos
   */
  async reorderTodos(
    columnId: string,
    todos: { id: string; position: number }[]
  ): Promise<TodoWithLabels[]> {
    // Verify all todos belong to the specified column and are not soft-deleted
    const existingTodos = await this.prisma.todo.findMany({
      where: {
        id: { in: todos.map((t) => t.id) },
        columnId,
        isDeleted: false,
      },
    });

    if (existingTodos.length !== todos.length) {
      throw new Error("Invalid todo IDs or column mismatch");
    }

    // Update positions in a transaction
    await this.prisma.$transaction(
      todos.map((todo) =>
        this.prisma.todo.update({
          where: { id: todo.id },
          data: { position: todo.position },
        })
      )
    );

    // Fetch updated todos (excluding soft-deleted)
    return this.prisma.todo.findMany({
      where: { columnId, archived: false, isDeleted: false },
      orderBy: { position: "asc" },
      include: {
        labels: true,
      },
    });
  }

  /**
   * Archive or unarchive a todo
   */
  async archiveTodo(id: string, archived: boolean): Promise<TodoWithLabels> {
    return this.prisma.todo.update({
      where: { id },
      data: { archived },
      include: {
        labels: true,
      },
    });
  }
}
