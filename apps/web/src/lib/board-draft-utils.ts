import type { Board, Column, Priority } from '../types';

export type ColumnUpdates = { name?: string; description?: string | null; wipLimit?: number | null };
export type TodoUpdates = { priority?: Priority };

export function normalizeDescription(description: string | undefined | null) {
  return description || '';
}

export function sortedColumnsForBoard(board: Board | undefined) {
  return [...(board?.columns ?? [])].sort((a, b) => a.position - b.position);
}

export function sortedTodosForColumn(column: Column | undefined) {
  return [...(column?.todos ?? [])].sort((a, b) => a.position - b.position);
}

export function findTodoInBoard(board: Board | undefined, todoId: string | null) {
  if (!board || !todoId) return null;
  for (const column of board.columns) {
    const todo = (column.todos ?? []).find((item) => item.id === todoId);
    if (todo) return todo;
  }
  return null;
}

export function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function hasDraftBoardChanges(
  serverBoard: Board | undefined,
  draftBoard: Board | undefined,
  dirtyColumnIds: Set<string>,
  dirtyTodoIds: Set<string>
) {
  if (!serverBoard || !draftBoard) return false;

  if (serverBoard.name !== draftBoard.name) return true;
  if (normalizeDescription(serverBoard.description) !== normalizeDescription(draftBoard.description)) return true;
  if (dirtyColumnIds.size > 0) return true;
  if (dirtyTodoIds.size > 0) return true;

  const serverColumns = sortedColumnsForBoard(serverBoard);
  const draftColumns = sortedColumnsForBoard(draftBoard);
  if (!arraysEqual(serverColumns.map((column) => column.id), draftColumns.map((column) => column.id))) return true;

  for (const draftColumn of draftColumns) {
    const serverColumn = serverColumns.find((column) => column.id === draftColumn.id);
    if (!serverColumn) return true;
    if (!arraysEqual(
      sortedTodosForColumn(serverColumn).map((todo) => todo.id),
      sortedTodosForColumn(draftColumn).map((todo) => todo.id)
    )) {
      return true;
    }
    for (const draftTodo of draftColumn.todos ?? []) {
      const serverTodo = findTodoInBoard(serverBoard, draftTodo.id);
      if (serverTodo?.columnId !== draftTodo.columnId) return true;
    }
  }

  return false;
}
