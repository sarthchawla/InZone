import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncStatus } from './useSyncStatus';

// Mock useIsMutating from react-query
let mockMutatingCount = 0;
vi.mock('@tanstack/react-query', () => ({
  useIsMutating: () => mockMutatingCount,
}));

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMutatingCount = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useSyncStatus());
    expect(result.current.state).toBe('idle');
    expect(result.current.pendingCount).toBe(0);
  });

  it('transitions to syncing when mutations are in flight', () => {
    const { result, rerender } = renderHook(() => useSyncStatus());

    mockMutatingCount = 1;
    rerender();

    expect(result.current.state).toBe('syncing');
    expect(result.current.pendingCount).toBe(1);
  });

  it('transitions syncing → synced → idle when mutations complete', () => {
    const { result, rerender } = renderHook(() => useSyncStatus({ syncedDuration: 2000 }));

    // Start mutating
    mockMutatingCount = 1;
    rerender();
    expect(result.current.state).toBe('syncing');

    // Mutations complete
    mockMutatingCount = 0;
    rerender();
    expect(result.current.state).toBe('synced');

    // After syncedDuration, returns to idle
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.state).toBe('idle');
  });

  it('stays syncing when mutation count changes but remains > 0', () => {
    const { result, rerender } = renderHook(() => useSyncStatus());

    mockMutatingCount = 1;
    rerender();
    expect(result.current.state).toBe('syncing');

    mockMutatingCount = 3;
    rerender();
    expect(result.current.state).toBe('syncing');
    expect(result.current.pendingCount).toBe(3);
  });

  it('cancels synced timer when new mutation starts', () => {
    const { result, rerender } = renderHook(() => useSyncStatus({ syncedDuration: 2000 }));

    // syncing → synced
    mockMutatingCount = 1;
    rerender();
    mockMutatingCount = 0;
    rerender();
    expect(result.current.state).toBe('synced');

    // New mutation starts before timer fires
    mockMutatingCount = 1;
    rerender();
    expect(result.current.state).toBe('syncing');

    // Advance past old timer — should NOT go idle since we're syncing
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.state).toBe('syncing');
  });

  it('uses custom syncedDuration', () => {
    const { result, rerender } = renderHook(() => useSyncStatus({ syncedDuration: 500 }));

    mockMutatingCount = 1;
    rerender();
    mockMutatingCount = 0;
    rerender();
    expect(result.current.state).toBe('synced');

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.state).toBe('synced');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.state).toBe('idle');
  });

  it('stays idle when mutation count goes from 0 to 0', () => {
    const { result, rerender } = renderHook(() => useSyncStatus());

    mockMutatingCount = 0;
    rerender();
    expect(result.current.state).toBe('idle');
  });
});
