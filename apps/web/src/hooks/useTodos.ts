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

// Re-export action hooks from useTodoActions
export { useMoveTodo, useReorderTodos, useArchiveTodo } from './useTodoActions';
