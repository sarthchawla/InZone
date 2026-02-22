import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCardDensity } from './useCardDensity';

describe('useCardDensity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to comfortable', () => {
    const { result } = renderHook(() => useCardDensity());
    expect(result.current.density).toBe('comfortable');
  });

  it('toggles to compact', () => {
    const { result } = renderHook(() => useCardDensity());
    act(() => result.current.toggleDensity());
    expect(result.current.density).toBe('compact');
  });

  it('toggles back to comfortable', () => {
    const { result } = renderHook(() => useCardDensity());
    act(() => result.current.toggleDensity());
    act(() => result.current.toggleDensity());
    expect(result.current.density).toBe('comfortable');
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useCardDensity());
    act(() => result.current.toggleDensity());
    expect(localStorage.getItem('inzone-card-density')).toBe('compact');
  });

  it('reads initial state from localStorage', () => {
    localStorage.setItem('inzone-card-density', 'compact');
    const { result } = renderHook(() => useCardDensity());
    expect(result.current.density).toBe('compact');
  });
});
