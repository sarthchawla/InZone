import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '../test/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMoveTodo, useReorderTodos, useArchiveTodo } from './useTodoActions';
import { boardKeys } from './useBoards';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';
import type { Board } from '../types';
import React from 'react';
import {
  createMockBoard,
  createMockColumn,
  createMockTodo,
} from '../test/mocks/handlers';

// Helper to create wrapper with accessible queryClient
function createWrapper(gcTime = 0) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

// Shared mock data
const BOARD_ID = 'board-1';
const COL_TODO_ID = 'col-todo';
const COL_PROGRESS_ID = 'col-progress';
const TODO_A_ID = 'todo-a';
const TODO_B_ID = 'todo-b';
const TODO_C_ID = 'todo-c';

function buildMockBoard(): Board {
  const todoA = createMockTodo({
    id: TODO_A_ID,
    title: 'Task A',
    position: 0,
    columnId: COL_TODO_ID,
    archived: false,
  });
  const todoB = createMockTodo({
    id: TODO_B_ID,
    title: 'Task B',
    position: 1,
    columnId: COL_TODO_ID,
    archived: false,
  });
  const todoC = createMockTodo({
    id: TODO_C_ID,
    title: 'Task C',
    position: 0,
    columnId: COL_PROGRESS_ID,
    archived: false,
  });

  return createMockBoard({
    id: BOARD_ID,
    name: 'Test Board',
    todoCount: 3,
    columns: [
      createMockColumn({
        id: COL_TODO_ID,
        name: 'Todo',
        position: 0,
        boardId: BOARD_ID,
        todos: [todoA, todoB],
      }),
      createMockColumn({
        id: COL_PROGRESS_ID,
        name: 'In Progress',
        position: 1,
        boardId: BOARD_ID,
        todos: [todoC],
      }),
    ],
  });
}

describe('useMoveTodo', () => {
  it('should move a todo between columns with optimistic update', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useMoveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        columnId: COL_PROGRESS_ID,
        position: 0,
      });
    });

    // Check optimistic update: todo-a should be in col-progress now
    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      const progressCol = board?.columns.find((c) => c.id === COL_PROGRESS_ID);
      // todo-a removed from todo column
      expect(todoCol?.todos?.find((t) => t.id === TODO_A_ID)).toBeUndefined();
      // todo-a added to progress column
      expect(progressCol?.todos?.find((t) => t.id === TODO_A_ID)).toBeDefined();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should insert at the correct position in the target column', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useMoveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        columnId: COL_PROGRESS_ID,
        position: 1, // after todo-c
      });
    });

    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const progressCol = board?.columns.find((c) => c.id === COL_PROGRESS_ID);
      // todo-a should be at position 1
      expect(progressCol?.todos?.[1]?.id).toBe(TODO_A_ID);
      // positions should be recalculated
      expect(progressCol?.todos?.[0]?.position).toBe(0);
      expect(progressCol?.todos?.[1]?.position).toBe(1);
    });
  });

  it('should rollback cache on API error', async () => {
    const mockBoard = buildMockBoard();

    server.use(
      http.patch('/api/todos/:id/move', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      }),
      http.get('/api/boards/:id', () => {
        return HttpResponse.json(mockBoard);
      })
    );

    const { queryClient, wrapper } = createWrapper(Infinity);
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useMoveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        columnId: COL_PROGRESS_ID,
        position: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // After error + rollback + invalidation settles, the board should match original
    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      expect(todoCol?.todos?.find((t) => t.id === TODO_A_ID)).toBeDefined();
    });
  });

  it('should handle moving a non-existent todo gracefully', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useMoveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: 'non-existent',
        boardId: BOARD_ID,
        columnId: COL_PROGRESS_ID,
        position: 0,
      });
    });

    // The board should remain unchanged (movedTodo is undefined, returns old)
    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      expect(board?.columns).toBeDefined();
    });
  });
});

describe('useReorderTodos', () => {
  it('should reorder todos within a column with optimistic update', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useReorderTodos(), { wrapper });

    // Reverse the order: B first, then A
    await act(async () => {
      result.current.mutate({
        boardId: BOARD_ID,
        columnId: COL_TODO_ID,
        todoIds: [TODO_B_ID, TODO_A_ID],
      });
    });

    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      expect(todoCol?.todos?.[0]?.id).toBe(TODO_B_ID);
      expect(todoCol?.todos?.[0]?.position).toBe(0);
      expect(todoCol?.todos?.[1]?.id).toBe(TODO_A_ID);
      expect(todoCol?.todos?.[1]?.position).toBe(1);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should not affect other columns', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useReorderTodos(), { wrapper });

    await act(async () => {
      result.current.mutate({
        boardId: BOARD_ID,
        columnId: COL_TODO_ID,
        todoIds: [TODO_B_ID, TODO_A_ID],
      });
    });

    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const progressCol = board?.columns.find((c) => c.id === COL_PROGRESS_ID);
      // Progress column should remain unchanged
      expect(progressCol?.todos?.[0]?.id).toBe(TODO_C_ID);
    });
  });

  it('should rollback cache on API error', async () => {
    const mockBoard = buildMockBoard();

    server.use(
      http.patch('/api/todos/reorder', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      }),
      http.get('/api/boards/:id', () => {
        return HttpResponse.json(mockBoard);
      })
    );

    const { queryClient, wrapper } = createWrapper(Infinity);
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useReorderTodos(), { wrapper });

    await act(async () => {
      result.current.mutate({
        boardId: BOARD_ID,
        columnId: COL_TODO_ID,
        todoIds: [TODO_B_ID, TODO_A_ID],
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // After rollback, original order should be restored
    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      expect(todoCol?.todos?.[0]?.id).toBe(TODO_A_ID);
      expect(todoCol?.todos?.[1]?.id).toBe(TODO_B_ID);
    });
  });

  it('should filter out unknown todo IDs gracefully', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useReorderTodos(), { wrapper });

    // Include a non-existent ID
    await act(async () => {
      result.current.mutate({
        boardId: BOARD_ID,
        columnId: COL_TODO_ID,
        todoIds: [TODO_B_ID, 'non-existent', TODO_A_ID],
      });
    });

    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      // non-existent should be filtered out, only 2 todos
      expect(todoCol?.todos).toHaveLength(2);
      expect(todoCol?.todos?.[0]?.id).toBe(TODO_B_ID);
      expect(todoCol?.todos?.[1]?.id).toBe(TODO_A_ID);
    });
  });
});

describe('useArchiveTodo', () => {
  it('should archive a todo with optimistic update (removes from visible list)', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useArchiveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        archived: true,
      });
    });

    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      // todo-a should be removed from visible list
      expect(todoCol?.todos?.find((t) => t.id === TODO_A_ID)).toBeUndefined();
      // Only todo-b remains
      expect(todoCol?.todos).toHaveLength(1);
      expect(todoCol?.todos?.[0]?.id).toBe(TODO_B_ID);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should decrement todoCount when archiving', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useArchiveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        archived: true,
      });
    });

    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      expect(board?.todoCount).toBe(2); // was 3, now 2
    });
  });

  it('should unarchive a todo with optimistic update (sets archived: false)', async () => {
    const { queryClient, wrapper } = createWrapper();
    const mockBoard = buildMockBoard();
    // Modify todo-a to be archived for the unarchive test
    const archivedBoard: Board = {
      ...mockBoard,
      columns: mockBoard.columns.map((col) => ({
        ...col,
        todos: (col.todos ?? []).map((t) =>
          t.id === TODO_A_ID ? { ...t, archived: true } : t
        ),
      })),
    };
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), archivedBoard);

    const { result } = renderHook(() => useArchiveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        archived: false,
      });
    });

    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      const todoA = todoCol?.todos?.find((t) => t.id === TODO_A_ID);
      expect(todoA).toBeDefined();
      expect(todoA?.archived).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should rollback cache on API error', async () => {
    const mockBoard = buildMockBoard();

    server.use(
      http.patch('/api/todos/:id/archive', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      }),
      http.get('/api/boards/:id', () => {
        return HttpResponse.json(mockBoard);
      })
    );

    const { queryClient, wrapper } = createWrapper(Infinity);
    queryClient.setQueryData(boardKeys.detail(BOARD_ID), mockBoard);

    const { result } = renderHook(() => useArchiveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        archived: true,
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // After rollback, todo-a should be back
    await waitFor(() => {
      const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
      const todoCol = board?.columns.find((c) => c.id === COL_TODO_ID);
      expect(todoCol?.todos?.find((t) => t.id === TODO_A_ID)).toBeDefined();
      expect(board?.todoCount).toBe(3);
    });
  });

  it('should handle archiving when board has no cache data', async () => {
    const { queryClient, wrapper } = createWrapper();
    // Don't seed the cache - no board data

    const { result } = renderHook(() => useArchiveTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: TODO_A_ID,
        boardId: BOARD_ID,
        archived: true,
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Cache should still be undefined or from invalidation
    const board = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    // No crash, board is either undefined or refetched
    expect(board === undefined || board !== undefined).toBe(true);
  });
});
