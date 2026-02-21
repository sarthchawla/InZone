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

// Create board mutation with optimistic update
export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (board: { name: string; description?: string; templateId?: string }) => {
      const { data } = await apiClient.post<Board>('/boards', board);
      return data;
    },
    onMutate: async (newBoard) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.all });
      const previous = queryClient.getQueryData<Board[]>(boardKeys.all);

      const optimisticBoard: Board = {
        id: `temp-${Date.now()}`,
        name: newBoard.name,
        description: newBoard.description || '',
        position: previous?.length ?? 0,
        userId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columns: [],
        todoCount: 0,
      };

      queryClient.setQueryData<Board[]>(boardKeys.all, (old) =>
        [...(old ?? []), optimisticBoard]
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Update board mutation with optimistic update
export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string }) => {
      const { data } = await apiClient.put<Board>(`/boards/${id}`, updates);
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: boardKeys.all });

      const previousDetail = queryClient.getQueryData<Board>(boardKeys.detail(id));
      const previousAll = queryClient.getQueryData<Board[]>(boardKeys.all);

      if (previousDetail) {
        queryClient.setQueryData<Board>(boardKeys.detail(id), {
          ...previousDetail,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      queryClient.setQueryData<Board[]>(boardKeys.all, (old) =>
        (old ?? []).map((b) => b.id === id ? { ...b, ...updates } : b)
      );

      return { previousDetail, previousAll };
    },
    onError: (_err, vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(boardKeys.detail(vars.id), context.previousDetail);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(boardKeys.all, context.previousAll);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(vars.id) });
    },
  });
}

// Delete board mutation with optimistic update
export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/boards/${id}`);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.all });
      const previous = queryClient.getQueryData<Board[]>(boardKeys.all);

      queryClient.setQueryData<Board[]>(boardKeys.all, (old) =>
        (old ?? []).filter((b) => b.id !== deletedId)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
