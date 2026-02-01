import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Column } from '../types';
import { boardKeys } from './useBoards';

// Create column mutation
export function useCreateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, name, wipLimit }: { boardId: string; name: string; wipLimit?: number }) => {
      const { data } = await apiClient.post<Column>(`/boards/${boardId}/columns`, { name, wipLimit });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(data.boardId) });
      // Also invalidate boards list so column counts update
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Update column mutation
export function useUpdateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, ...updates }: { id: string; boardId: string; name?: string; description?: string | null; wipLimit?: number | null }) => {
      const { data } = await apiClient.put<Column>(`/columns/${id}`, updates);
      return { ...data, boardId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
    },
  });
}

// Delete column mutation
export function useDeleteColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, moveToColumnId }: { id: string; boardId: string; moveToColumnId?: string }) => {
      await apiClient.delete(`/columns/${id}`, { data: { moveToColumnId } });
      return { id, boardId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
      // Also invalidate boards list so column counts update
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Reorder columns mutation
export function useReorderColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, columnIds }: { boardId: string; columnIds: string[] }) => {
      // API expects { boardId, columns: [{ id, position }] }
      const columns = columnIds.map((id, index) => ({ id, position: index }));
      await apiClient.patch('/columns/reorder', { boardId, columns });
      return boardId;
    },
    onSuccess: (boardId) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}
