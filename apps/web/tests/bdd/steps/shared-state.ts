/**
 * Shared test state for BDD steps.
 * This module provides a single source of truth for test data
 * that needs to be shared across multiple step definition files.
 */

export interface Column {
  id: string;
  name: string;
  position: number;
  wipLimit?: number;
  todos: Array<{
    id: string;
    title: string;
    position: number;
    priority?: string;
    description?: string;
    dueDate?: string | null;
    labels?: Array<{ id: string; name: string; color: string }>;
  }>;
}

export interface Todo {
  id: string;
  title: string;
  columnName: string;
  priority?: string;
  description?: string;
  dueDate?: string;
  labels?: Array<{ id: string; name: string; color: string }>;
  position?: number;
}

export interface TestState {
  boardId: string;
  columns: Column[];
  existingTodos: Todo[];
  columnWipLimits: Record<string, number>;
  columnCounts: Record<string, number>;
  deletedColumn?: string;
  initialTodoCount?: number;
}

/**
 * Global shared state for test scenarios.
 * This is reset at the start of each scenario via resetSharedState().
 * IMPORTANT: This object must never be reassigned - only its properties should be mutated.
 */
export const sharedState: TestState = {
  boardId: 'test-board',
  columns: [],
  existingTodos: [],
  columnWipLimits: {},
  columnCounts: {},
};

/**
 * Reset shared state. Call this at the start of each scenario.
 * IMPORTANT: This mutates the existing object instead of reassigning
 * to preserve references held by other modules.
 */
export function resetSharedState(): void {
  sharedState.boardId = 'test-board';
  sharedState.columns = [];
  sharedState.existingTodos = [];
  sharedState.columnWipLimits = {};
  sharedState.columnCounts = {};
  sharedState.deletedColumn = undefined;
  sharedState.initialTodoCount = undefined;
}

/**
 * Get column by name from shared state.
 */
export function getColumnByName(name: string): Column | undefined {
  return sharedState.columns.find(c => c.name === name);
}

/**
 * Get column name by ID from shared state.
 */
export function getColumnNameById(columnId: string): string {
  const column = sharedState.columns.find(c => c.id === columnId);
  return column?.name || 'Todo'; // Default to 'Todo' if not found
}

/**
 * Add a new column to shared state.
 */
export function addColumn(column: Column): void {
  sharedState.columns.push(column);
}

/**
 * Remove a column from shared state by ID.
 */
export function removeColumn(columnId: string): void {
  sharedState.columns = sharedState.columns.filter(c => c.id !== columnId);
}

/**
 * Add a new todo to shared state.
 */
export function addTodo(todo: Todo): void {
  sharedState.existingTodos.push(todo);
}

/**
 * Get todos for a specific column.
 */
export function getTodosForColumn(columnName: string): Todo[] {
  return sharedState.existingTodos.filter(t => t.columnName === columnName);
}

/**
 * Build columns with their todos for API response.
 */
export function buildColumnsWithTodos(): Column[] {
  return sharedState.columns.map(col => ({
    ...col,
    todos: sharedState.existingTodos
      .filter(t => t.columnName === col.name)
      .map((t, idx) => ({
        id: t.id,
        title: t.title,
        priority: t.priority || 'MEDIUM',
        description: t.description || '',
        dueDate: t.dueDate || null,
        position: t.position ?? idx,
        labels: t.labels || [],
      })),
  }));
}
