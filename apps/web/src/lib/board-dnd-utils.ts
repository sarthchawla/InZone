import type { Board, Column, Todo } from '../types';

type FindTodo = (id: string) => { todo: Todo; column: Column } | null;

export function computeColumnReorder(
  board: Board,
  boardId: string,
  activeIdStr: string,
  overIdStr: string,
  findTodo: FindTodo,
): { boardId: string; columnIds: string[] } | null {
  let targetColumnId: string | null = null;
  if (overIdStr.startsWith('column-')) {
    targetColumnId = overIdStr.replace('column-', '');
  } else {
    const overResult = findTodo(overIdStr);
    if (overResult) {
      targetColumnId = overResult.column.id;
    }
  }

  if (!targetColumnId) return null;

  const activeColumnId = activeIdStr.replace('column-', '');
  if (activeColumnId === targetColumnId) return null;

  const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);
  const activeIndex = sortedColumns.findIndex((c) => c.id === activeColumnId);
  const overIndex = sortedColumns.findIndex((c) => c.id === targetColumnId);

  if (activeIndex === -1 || overIndex === -1) return null;

  const newOrder = [...sortedColumns];
  const [moved] = newOrder.splice(activeIndex, 1);
  newOrder.splice(overIndex, 0, moved);
  return { boardId, columnIds: newOrder.map((c) => c.id) };
}

type TodoDropResult =
  | { type: 'move'; id: string; boardId: string; columnId: string; position: number }
  | { type: 'reorder'; boardId: string; columnId: string; todoIds: string[] };

export function computeTodoDrop(
  board: Board,
  boardId: string,
  activeIdStr: string,
  overIdStr: string,
  findTodo: FindTodo,
): TodoDropResult | null {
  const activeResult = findTodo(activeIdStr);
  if (!activeResult) return null;

  const { todo: activeTodoItem, column: sourceColumn } = activeResult;

  let targetColumn: Column | undefined;
  let newPosition = 0;

  targetColumn = board.columns.find((c) => c.id === overIdStr);

  if (!targetColumn) {
    const overResult = findTodo(overIdStr);
    if (overResult) {
      targetColumn = overResult.column;
      newPosition = overResult.todo.position;
    }
  } else {
    newPosition = (targetColumn.todos ?? []).length;
  }

  if (!targetColumn) return null;

  if (sourceColumn.id === targetColumn.id) {
    const sortedTodos = [...(sourceColumn.todos ?? [])].sort((a, b) => a.position - b.position);
    const oldIndex = sortedTodos.findIndex((t) => t.id === activeTodoItem.id);
    const overTodoResult = findTodo(overIdStr);

    if (overTodoResult && overTodoResult.column.id === sourceColumn.id) {
      const newIndex = sortedTodos.findIndex((t) => t.id === overIdStr);
      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...sortedTodos];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        return { type: 'reorder', boardId, columnId: sourceColumn.id, todoIds: newOrder.map((t) => t.id) };
      }
    }
    return null;
  } else {
    return {
      type: 'move',
      id: activeTodoItem.id,
      boardId,
      columnId: targetColumn.id,
      position: newPosition,
    };
  }
}
