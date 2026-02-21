import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Board, Todo, Priority } from '../types';
import { boardKeys } from './useBoards';
import { labelKeys } from './useLabels';

// Create todo mutation with optimistic update
export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      columnId,
      boardId,
      title,
      description,
      priority,
      dueDate,
      labelIds,
    }: {
      columnId: string;
      boardId: string;
      title: string;
      description?: string;
      priority?: Priority;
      dueDate?: string;
      labelIds?: string[];
    }) => {
      const { data } = await apiClient.post<Todo>('/todos', {
        columnId,
        title,
        description,
        priority,
        dueDate,
        labelIds,
      });
      return { ...data, boardId };
    },
    onMutate: async ({ columnId, boardId, title, description, priority, dueDate }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,
        title,
        description,
        priority: priority ?? 'MEDIUM',
        dueDate,
        position: 9999,
        archived: false,
        columnId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        labels: [],
      };

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          todoCount: (old.todoCount ?? 0) + 1,
          columns: old.columns.map((col) =>
            col.id === columnId
              ? { ...col, todos: [...(col.todos ?? []), optimisticTodo] }
              : col
          ),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Update todo mutation with optimistic update
export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      boardId,
      ...updates
    }: {
      id: string;
      boardId: string;
      title?: string;
      description?: string;
      priority?: Priority;
      dueDate?: string | null;
      labelIds?: string[];
    }) => {
      const { data } = await apiClient.put<Todo>(`/todos/${id}`, updates);
      return { ...data, boardId, hadLabelUpdate: 'labelIds' in updates };
    },
    onMutate: async ({ id, boardId, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        // Convert null values to undefined to match Todo type
        const sanitized: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(updates)) {
          sanitized[k] = v === null ? undefined : v;
        }
        return {
          ...old,
          columns: old.columns.map((col) => ({
            ...col,
            todos: (col.todos ?? []).map((todo) =>
              todo.id === id
                ? { ...todo, ...sanitized, updatedAt: new Date().toISOString() }
                : todo
            ),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      if ('labelIds' in vars) {
        queryClient.invalidateQueries({ queryKey: labelKeys.all });
      }
    },
  });
}

// Delete todo mutation with optimistic update
export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      await apiClient.delete(`/todos/${id}`);
      return { id, boardId };
    },
    onMutate: async ({ id, boardId }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          todoCount: Math.max(0, (old.todoCount ?? 0) - 1),
          columns: old.columns.map((col) => ({
            ...col,
            todos: (col.todos ?? []).filter((t) => t.id !== id),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Move todo to different column with optimistic update
export function useMoveTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      boardId,
      columnId,
      position,
    }: {
      id: string;
      boardId: string;
      columnId: string;
      position: number;
    }) => {
      const { data } = await apiClient.patch<Todo>(`/todos/${id}/move`, { columnId, position });
      return { ...data, boardId };
    },
    onMutate: async ({ id, boardId, columnId, position }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;

        let movedTodo: Todo | undefined;
        const columnsWithRemoved = old.columns.map((col) => {
          const found = (col.todos ?? []).find((t) => t.id === id);
          if (found) movedTodo = { ...found, columnId, position };
          return { ...col, todos: (col.todos ?? []).filter((t) => t.id !== id) };
        });

        if (!movedTodo) return old;

        const columnsWithAdded = columnsWithRemoved.map((col) => {
          if (col.id !== columnId) return col;
          const newTodos = [...(col.todos ?? [])];
          newTodos.splice(position, 0, movedTodo!);
          return { ...col, todos: newTodos.map((t, i) => ({ ...t, position: i })) };
        });

        return { ...old, columns: columnsWithAdded };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
    },
  });
}

// Reorder todos within a column with optimistic update
export function useReorderTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, columnId, todoIds }: { boardId: string; columnId: string; todoIds: string[] }) => {
      const todos = todoIds.map((id, index) => ({ id, position: index }));
      await apiClient.patch('/todos/reorder', { columnId, todos });
      return boardId;
    },
    onMutate: async ({ boardId, columnId, todoIds }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map((col) => {
            if (col.id !== columnId) return col;
            const todoMap = new Map((col.todos ?? []).map((t) => [t.id, t]));
            const reordered = todoIds
              .map((id, index) => {
                const todo = todoMap.get(id);
                return todo ? { ...todo, position: index } : null;
              })
              .filter(Boolean) as Todo[];
            return { ...col, todos: reordered };
          }),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (boardId) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId!) });
    },
  });
}

// Archive/unarchive todo with optimistic update
export function useArchiveTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, archived }: { id: string; boardId: string; archived: boolean }) => {
      const { data } = await apiClient.patch<Todo>(`/todos/${id}/archive`, { archived });
      return { ...data, boardId };
    },
    onMutate: async ({ id, boardId, archived }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        if (archived) {
          // Remove from visible list when archiving
          return {
            ...old,
            todoCount: Math.max(0, (old.todoCount ?? 0) - 1),
            columns: old.columns.map((col) => ({
              ...col,
              todos: (col.todos ?? []).filter((t) => t.id !== id),
            })),
          };
        }
        // For unarchiving, just update the field (card will appear on refetch)
        return {
          ...old,
          columns: old.columns.map((col) => ({
            ...col,
            todos: (col.todos ?? []).map((t) =>
              t.id === id ? { ...t, archived } : t
            ),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(vars.boardId), context.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
