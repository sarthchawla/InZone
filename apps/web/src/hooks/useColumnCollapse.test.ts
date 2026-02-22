import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColumnCollapse } from './useColumnCollapse';

describe('useColumnCollapse', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no collapsed columns', () => {
    const { result } = renderHook(() => useColumnCollapse('board-1'));
    expect(result.current.collapsedColumns).toEqual([]);
    expect(result.current.isCollapsed('col-1')).toBe(false);
  });

  it('toggles a column to collapsed', () => {
    const { result } = renderHook(() => useColumnCollapse('board-1'));
    act(() => result.current.toggleCollapse('col-1'));
    expect(result.current.isCollapsed('col-1')).toBe(true);
    expect(result.current.collapsedColumns).toEqual(['col-1']);
  });

  it('toggles a column back to expanded', () => {
    const { result } = renderHook(() => useColumnCollapse('board-1'));
    act(() => result.current.toggleCollapse('col-1'));
    act(() => result.current.toggleCollapse('col-1'));
    expect(result.current.isCollapsed('col-1')).toBe(false);
    expect(result.current.collapsedColumns).toEqual([]);
  });

  it('persists collapsed state to localStorage', () => {
    const { result } = renderHook(() => useColumnCollapse('board-1'));
    act(() => result.current.toggleCollapse('col-1'));
    const stored = JSON.parse(localStorage.getItem('inzone-board-board-1-collapsed-columns') || '[]');
    expect(stored).toEqual(['col-1']);
  });

  it('reads initial state from localStorage', () => {
    localStorage.setItem('inzone-board-board-1-collapsed-columns', JSON.stringify(['col-2', 'col-3']));
    const { result } = renderHook(() => useColumnCollapse('board-1'));
    expect(result.current.collapsedColumns).toEqual(['col-2', 'col-3']);
    expect(result.current.isCollapsed('col-2')).toBe(true);
    expect(result.current.isCollapsed('col-3')).toBe(true);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('inzone-board-board-1-collapsed-columns', 'not-json');
    const { result } = renderHook(() => useColumnCollapse('board-1'));
    expect(result.current.collapsedColumns).toEqual([]);
  });

  it('supports multiple collapsed columns', () => {
    const { result } = renderHook(() => useColumnCollapse('board-1'));
    act(() => result.current.toggleCollapse('col-1'));
    act(() => result.current.toggleCollapse('col-2'));
    expect(result.current.isCollapsed('col-1')).toBe(true);
    expect(result.current.isCollapsed('col-2')).toBe(true);
    expect(result.current.collapsedColumns).toEqual(['col-1', 'col-2']);
  });
});
