import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Todo, Priority } from '../types';
import { boardKeys } from './useBoards';
import { labelKeys } from './useLabels';

// Create todo mutation
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
    onSuccess: (_, variables) => {
      // Invalidate board detail for the current board view
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
      // Also invalidate boards list so task counts update
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Update todo mutation
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
      // If labels were updated, invalidate labels query to refresh counts
      if (data.hadLabelUpdate) {
        queryClient.invalidateQueries({ queryKey: labelKeys.all });
      }
    },
  });
}

// Delete todo mutation
export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      await apiClient.delete(`/todos/${id}`);
      return { id, boardId };
    },
    onSuccess: (_, variables) => {
      // Invalidate board detail for the current board view
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
      // Also invalidate boards list so task counts update
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Move todo to different column
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
    },
  });
}

// Reorder todos within a column
export function useReorderTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, columnId, todoIds }: { boardId: string; columnId: string; todoIds: string[] }) => {
      // API expects { columnId, todos: [{ id, position }] }
      const todos = todoIds.map((id, index) => ({ id, position: index }));
      await apiClient.patch('/todos/reorder', { columnId, todos });
      return boardId;
    },
    onSuccess: (boardId) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Archive/unarchive todo
export function useArchiveTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, boardId, archived }: { id: string; boardId: string; archived: boolean }) => {
      const { data } = await apiClient.patch<Todo>(`/todos/${id}/archive`, { archived });
      return { ...data, boardId };
    },
    onSuccess: (_, variables) => {
      // Invalidate board detail for the current board view
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(variables.boardId) });
      // Also invalidate boards list so task counts update (archiving affects count)
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
