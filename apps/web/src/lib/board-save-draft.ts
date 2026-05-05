import type { QueryClient } from '@tanstack/react-query';
import type { Board } from '../types';
import { boardKeys } from '../hooks/useBoards';
import {
  arraysEqual,
  findTodoInBoard,
  normalizeDescription,
  sortedColumnsForBoard,
  sortedTodosForColumn,
  type ColumnUpdates,
  type TodoUpdates,
} from './board-draft-utils';

interface SaveBoardDraftArgs {
  board: Board;
  boardId: string;
  dirtyColumnIds: Set<string>;
  dirtyTodoIds: Set<string>;
  draftBoard: Board;
  moveTodo: { mutateAsync: (args: { id: string; boardId: string; columnId: string; position: number }) => Promise<unknown> };
  queryClient: QueryClient;
  reorderColumns: { mutateAsync: (args: { boardId: string; columnIds: string[] }) => Promise<unknown> };
  reorderTodos: { mutateAsync: (args: { boardId: string; columnId: string; todoIds: string[] }) => Promise<unknown> };
  updateBoard: { mutateAsync: (args: { id: string; name?: string; description?: string | null }) => Promise<unknown> };
  updateColumn: { mutateAsync: (args: { id: string; boardId: string } & ColumnUpdates) => Promise<unknown> };
  updateTodo: { mutateAsync: (args: { id: string; boardId: string } & TodoUpdates) => Promise<unknown> };
}

export async function saveBoardDraft({
  board,
  boardId,
  dirtyColumnIds,
  dirtyTodoIds,
  draftBoard,
  moveTodo,
  queryClient,
  reorderColumns,
  reorderTodos,
  updateBoard,
  updateColumn,
  updateTodo,
}: SaveBoardDraftArgs) {
  const draftColumns = sortedColumnsForBoard(draftBoard);
  const serverColumns = sortedColumnsForBoard(board);

  const boardUpdates: { name?: string; description?: string | null } = {};
  if (draftBoard.name !== board.name) boardUpdates.name = draftBoard.name;
  if (normalizeDescription(draftBoard.description) !== normalizeDescription(board.description)) {
    boardUpdates.description = draftBoard.description || null;
  }
  if (Object.keys(boardUpdates).length > 0) {
    await updateBoard.mutateAsync({ id: boardId, ...boardUpdates });
  }

  for (const columnId of dirtyColumnIds) {
    const draftColumn = draftColumns.find((column) => column.id === columnId);
    const serverColumn = serverColumns.find((column) => column.id === columnId);
    if (!draftColumn || !serverColumn) continue;

    const updates: ColumnUpdates = {};
    if (draftColumn.name !== serverColumn.name) updates.name = draftColumn.name;
    if (normalizeDescription(draftColumn.description) !== normalizeDescription(serverColumn.description)) {
      updates.description = draftColumn.description || null;
    }
    if ((draftColumn.wipLimit ?? null) !== (serverColumn.wipLimit ?? null)) {
      updates.wipLimit = draftColumn.wipLimit ?? null;
    }
    if (Object.keys(updates).length > 0) {
      await updateColumn.mutateAsync({ id: columnId, boardId, ...updates });
    }
  }

  for (const todoId of dirtyTodoIds) {
    const draftTodo = findTodoInBoard(draftBoard, todoId);
    const serverTodo = findTodoInBoard(board, todoId);
    if (!draftTodo || !serverTodo) continue;

    const updates: TodoUpdates = {};
    if (draftTodo.priority !== serverTodo.priority) updates.priority = draftTodo.priority;
    if (Object.keys(updates).length > 0) {
      await updateTodo.mutateAsync({ id: todoId, boardId, ...updates });
    }
  }

  const serverColumnIds = serverColumns.map((column) => column.id);
  const draftColumnIds = draftColumns.map((column) => column.id);
  if (!arraysEqual(serverColumnIds, draftColumnIds)) {
    await reorderColumns.mutateAsync({ boardId, columnIds: draftColumnIds });
  }

  const movedTodoIds = new Set<string>();
  for (const draftColumn of draftColumns) {
    const draftTodos = sortedTodosForColumn(draftColumn);
    for (const [position, draftTodo] of draftTodos.entries()) {
      const serverTodo = findTodoInBoard(board, draftTodo.id);
      if (serverTodo && serverTodo.columnId !== draftColumn.id) {
        movedTodoIds.add(draftTodo.id);
        await moveTodo.mutateAsync({
          id: draftTodo.id,
          boardId,
          columnId: draftColumn.id,
          position,
        });
      }
    }
  }

  for (const draftColumn of draftColumns) {
    const draftTodoIds = sortedTodosForColumn(draftColumn).map((todo) => todo.id);
    const serverColumn = serverColumns.find((column) => column.id === draftColumn.id);
    const serverTodoIds = sortedTodosForColumn(serverColumn).map((todo) => todo.id);
    const columnHasMovedTodo = draftTodoIds.some((id) => movedTodoIds.has(id)) ||
      serverTodoIds.some((id) => movedTodoIds.has(id));
    if (draftTodoIds.length > 0 && (!arraysEqual(draftTodoIds, serverTodoIds) || columnHasMovedTodo)) {
      await reorderTodos.mutateAsync({ boardId, columnId: draftColumn.id, todoIds: draftTodoIds });
    }
  }

  await queryClient.refetchQueries({ queryKey: boardKeys.detail(boardId), type: 'active' });
  await queryClient.refetchQueries({ queryKey: boardKeys.all, type: 'active' });
  return queryClient.getQueryData<Board>(boardKeys.detail(boardId));
}
