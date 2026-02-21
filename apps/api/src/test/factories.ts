import { Board, Column, Todo, Label, BoardTemplate, Priority } from "@prisma/client";

/**
 * Factory functions for creating test data.
 * These help generate consistent test fixtures.
 */

let boardIdCounter = 1;
let columnIdCounter = 1;
let todoIdCounter = 1;
let labelIdCounter = 1;

/**
 * Reset all ID counters (call between test suites if needed)
 */
export function resetFactories() {
  boardIdCounter = 1;
  columnIdCounter = 1;
  todoIdCounter = 1;
  labelIdCounter = 1;
}

/**
 * Create a mock Board object
 */
export function createMockBoard(overrides: Partial<Board> = {}): Board {
  const id = `board-${boardIdCounter++}`;
  return {
    id,
    name: `Test Board ${id}`,
    description: "A test board description",
    position: 0,
    templateId: null,
    userId: "test-user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    isDeleted: false,
    ...overrides,
  };
}

/**
 * Create a mock Column object
 */
export function createMockColumn(overrides: Partial<Column> = {}): Column {
  const id = `column-${columnIdCounter++}`;
  return {
    id,
    name: `Test Column ${id}`,
    description: null,
    position: 0,
    wipLimit: null,
    boardId: "board-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    isDeleted: false,
    ...overrides,
  };
}

/**
 * Create a mock Todo object
 */
export function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  const id = `todo-${todoIdCounter++}`;
  return {
    id,
    title: `Test Todo ${id}`,
    description: "A test todo description",
    priority: Priority.MEDIUM,
    dueDate: null,
    position: 0,
    archived: false,
    sourceType: null,
    sourceId: null,
    sourceUrl: null,
    sourceMeta: null,
    columnId: "column-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    isDeleted: false,
    ...overrides,
  };
}

/**
 * Create a mock Label object
 */
export function createMockLabel(overrides: Partial<Label> = {}): Label {
  const id = `label-${labelIdCounter++}`;
  return {
    id,
    name: `Test Label ${id}`,
    color: "#FF5733",
    ...overrides,
  };
}

/**
 * Create a mock BoardTemplate object
 */
export function createMockTemplate(
  overrides: Partial<BoardTemplate> = {}
): BoardTemplate {
  return {
    id: "kanban-basic",
    name: "Basic Kanban",
    description: "Simple three-column Kanban board",
    columns: JSON.parse(
      JSON.stringify([
        { name: "Todo" },
        { name: "In Progress" },
        { name: "Done" },
      ])
    ),
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock Board with columns
 */
export function createMockBoardWithColumns(
  boardOverrides: Partial<Board> = {},
  columnCount = 3
): Board & { columns: Column[] } {
  const board = createMockBoard(boardOverrides);
  const columns: Column[] = [];

  for (let i = 0; i < columnCount; i++) {
    columns.push(
      createMockColumn({
        boardId: board.id,
        position: i,
        name: ["Todo", "In Progress", "Done"][i] || `Column ${i + 1}`,
      })
    );
  }

  return { ...board, columns };
}

/**
 * Create a mock Column with todos
 */
export function createMockColumnWithTodos(
  columnOverrides: Partial<Column> = {},
  todoCount = 3
): Column & { todos: Todo[] } {
  const column = createMockColumn(columnOverrides);
  const todos: Todo[] = [];

  for (let i = 0; i < todoCount; i++) {
    todos.push(
      createMockTodo({
        columnId: column.id,
        position: i,
      })
    );
  }

  return { ...column, todos };
}
