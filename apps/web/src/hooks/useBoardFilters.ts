import { useState, useMemo, useCallback } from 'react';

export interface BoardFilters {
  search: string;
  priorities: string[];
  labelIds: string[];
}

export function useBoardFilters() {
  const [filters, setFilters] = useState<BoardFilters>({ search: '', priorities: [], labelIds: [] });

  const setSearch = useCallback((search: string) => setFilters(prev => ({ ...prev, search })), []);

  const togglePriority = useCallback((priority: string) => setFilters(prev => ({
    ...prev,
    priorities: prev.priorities.includes(priority)
      ? prev.priorities.filter(p => p !== priority)
      : [...prev.priorities, priority]
  })), []);

  const toggleLabel = useCallback((labelId: string) => setFilters(prev => ({
    ...prev,
    labelIds: prev.labelIds.includes(labelId)
      ? prev.labelIds.filter(l => l !== labelId)
      : [...prev.labelIds, labelId]
  })), []);

  const clearFilters = useCallback(() => setFilters({ search: '', priorities: [], labelIds: [] }), []);

  const hasActiveFilters = useMemo(
    () => filters.search !== '' || filters.priorities.length > 0 || filters.labelIds.length > 0,
    [filters]
  );

  return { filters, setSearch, togglePriority, toggleLabel, clearFilters, hasActiveFilters };
}
