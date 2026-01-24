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

// Create label mutation
export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label: { name: string; color: string }) => {
      const { data } = await apiClient.post<Label>('/labels', label);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
    },
  });
}

// Update label mutation
export function useUpdateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      const { data } = await apiClient.put<Label>(`/labels/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
      queryClient.invalidateQueries({ queryKey: labelKeys.detail(data.id) });
    },
  });
}

// Delete label mutation
export function useDeleteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/labels/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
    },
  });
}
