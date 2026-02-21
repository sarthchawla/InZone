import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Label } from '../types';

// Label with todo count from API response
export interface LabelWithCount extends Label {
  _count?: {
    todos: number;
  };
}

// Query keys
export const labelKeys = {
  all: ['labels'] as const,
  detail: (id: string) => ['labels', id] as const,
};

// Fetch all labels
export function useLabels() {
  return useQuery({
    queryKey: labelKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<LabelWithCount[]>('/labels');
      return data;
    },
  });
}

// Fetch single label
export function useLabel(labelId: string | undefined) {
  return useQuery({
    queryKey: labelKeys.detail(labelId!),
    queryFn: async () => {
      const { data } = await apiClient.get<LabelWithCount>(`/labels/${labelId}`);
      return data;
    },
    enabled: !!labelId,
  });
}

// Create label mutation with optimistic update
export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label: { name: string; color: string }) => {
      const { data } = await apiClient.post<Label>('/labels', label);
      return data;
    },
    onMutate: async (newLabel) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.all });
      const previous = queryClient.getQueryData<LabelWithCount[]>(labelKeys.all);

      const optimisticLabel: LabelWithCount = {
        id: `temp-${Date.now()}`,
        name: newLabel.name,
        color: newLabel.color,
        _count: { todos: 0 },
      };

      queryClient.setQueryData<LabelWithCount[]>(labelKeys.all, (old) =>
        [...(old ?? []), optimisticLabel]
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(labelKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
    },
  });
}

// Update label mutation with optimistic update
export function useUpdateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      const { data } = await apiClient.put<Label>(`/labels/${id}`, updates);
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.all });
      const previous = queryClient.getQueryData<LabelWithCount[]>(labelKeys.all);

      queryClient.setQueryData<LabelWithCount[]>(labelKeys.all, (old) =>
        (old ?? []).map((label) =>
          label.id === id ? { ...label, ...updates } : label
        )
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(labelKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
    },
  });
}

// Delete label mutation with optimistic update
export function useDeleteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/labels/${id}`);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.all });
      const previous = queryClient.getQueryData<LabelWithCount[]>(labelKeys.all);

      queryClient.setQueryData<LabelWithCount[]>(labelKeys.all, (old) =>
        (old ?? []).filter((label) => label.id !== deletedId)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(labelKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
    },
  });
}
