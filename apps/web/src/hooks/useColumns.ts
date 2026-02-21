import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Board, Column } from '../types';
import { boardKeys } from './useBoards';

// Create column mutation with optimistic update
export function useCreateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, name, wipLimit }: { boardId: string; name: string; wipLimit?: number }) => {
      const { data } = await apiClient.post<Column>(`/boards/${boardId}/columns`, { name, wipLimit });
      return data;
    },
    onMutate: async ({ boardId, name, wipLimit }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      const optimisticColumn: Column = {
        id: `temp-${Date.now()}`,
        name,
        wipLimit,
        position: previousBoard?.columns.length ?? 0,
        boardId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        todos: [],
      };

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return { ...old, columns: [...old.columns, optimisticColumn] };
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

// Update column mutation with optimistic update
export function useUpdateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, ...updates }: { id: string; boardId: string; name?: string; description?: string | null; wipLimit?: number | null }) => {
      const { data } = await apiClient.put<Column>(`/columns/${id}`, updates);
      return { ...data, boardId };
    },
    onMutate: async ({ id, boardId, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        // Convert null values to undefined to match Column type
        const sanitized: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(updates)) {
          sanitized[k] = v === null ? undefined : v;
        }
        return {
          ...old,
          columns: old.columns.map((col) =>
            col.id === id ? { ...col, ...sanitized, updatedAt: new Date().toISOString() } : col
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
    },
  });
}

// Delete column mutation with optimistic update
export function useDeleteColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, moveToColumnId }: { id: string; boardId: string; moveToColumnId?: string }) => {
      await apiClient.delete(`/columns/${id}`, { data: { moveToColumnId } });
      return { id, boardId };
    },
    onMutate: async ({ id, boardId }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        return { ...old, columns: old.columns.filter((c) => c.id !== id) };
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

// Reorder columns mutation with optimistic update
export function useReorderColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, columnIds }: { boardId: string; columnIds: string[] }) => {
      const columns = columnIds.map((id, index) => ({ id, position: index }));
      await apiClient.patch('/columns/reorder', { boardId, columns });
      return boardId;
    },
    onMutate: async ({ boardId, columnIds }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));

      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) => {
        if (!old) return old;
        const colMap = new Map(old.columns.map((c) => [c.id, c]));
        const reordered = columnIds
          .map((id, index) => {
            const col = colMap.get(id);
            return col ? { ...col, position: index } : null;
          })
          .filter(Boolean) as Column[];
        return { ...old, columns: reordered };
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
