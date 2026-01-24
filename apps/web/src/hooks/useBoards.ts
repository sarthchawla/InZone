import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Board, BoardTemplate } from '../types';

// Query keys
export const boardKeys = {
  all: ['boards'] as const,
  detail: (id: string) => ['boards', id] as const,
  templates: ['templates'] as const,
};

// Fetch all boards
export function useBoards() {
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Board[]>('/boards');
      return data;
    },
  });
}

// Fetch single board with columns and todos
export function useBoard(boardId: string | undefined) {
  return useQuery({
    queryKey: boardKeys.detail(boardId!),
    queryFn: async () => {
      const { data } = await apiClient.get<Board>(`/boards/${boardId}`);
      return data;
    },
    enabled: !!boardId,
  });
}

// Fetch board templates
export function useTemplates() {
  return useQuery({
    queryKey: boardKeys.templates,
    queryFn: async () => {
      const { data } = await apiClient.get<BoardTemplate[]>('/templates');
      return data;
    },
  });
}

// Create board mutation
export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (board: { name: string; description?: string; templateId?: string }) => {
      const { data } = await apiClient.post<Board>('/boards', board);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Update board mutation
export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string }) => {
      const { data } = await apiClient.put<Board>(`/boards/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(data.id) });
    },
  });
}

// Delete board mutation
export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/boards/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
