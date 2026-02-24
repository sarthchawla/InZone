import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useBoardFilters } from './useBoardFilters';

describe('useBoardFilters', () => {
  it('starts with empty filters', () => {
    const { result } = renderHook(() => useBoardFilters());
    expect(result.current.filters).toEqual({ search: '', priorities: [], labelIds: [] });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('sets search text', () => {
    const { result } = renderHook(() => useBoardFilters());
    act(() => result.current.setSearch('test'));
    expect(result.current.filters.search).toBe('test');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('toggles priority on and off', () => {
    const { result } = renderHook(() => useBoardFilters());
    act(() => result.current.togglePriority('HIGH'));
    expect(result.current.filters.priorities).toEqual(['HIGH']);
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.togglePriority('HIGH'));
    expect(result.current.filters.priorities).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('toggles multiple priorities', () => {
    const { result } = renderHook(() => useBoardFilters());
    act(() => result.current.togglePriority('HIGH'));
    act(() => result.current.togglePriority('LOW'));
    expect(result.current.filters.priorities).toEqual(['HIGH', 'LOW']);
  });

  it('toggles label on and off', () => {
    const { result } = renderHook(() => useBoardFilters());
    act(() => result.current.toggleLabel('label-1'));
    expect(result.current.filters.labelIds).toEqual(['label-1']);
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.toggleLabel('label-1'));
    expect(result.current.filters.labelIds).toEqual([]);
  });

  it('clears all filters', () => {
    const { result } = renderHook(() => useBoardFilters());
    act(() => {
      result.current.setSearch('test');
      result.current.togglePriority('HIGH');
      result.current.toggleLabel('label-1');
    });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilters());
    expect(result.current.filters).toEqual({ search: '', priorities: [], labelIds: [] });
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
