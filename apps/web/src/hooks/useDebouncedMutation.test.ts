import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedMutation } from './useDebouncedMutation';

describe('useDebouncedMutation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires mutate after delay', () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedMutation({
        mutate,
        getKey: (args: { id: string }) => args.id,
        delay: 500,
      })
    );

    act(() => {
      result.current.mutate({ id: 'col-1' });
    });

    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ id: 'col-1' });
  });

  it('coalesces rapid calls with the same key (last-write-wins)', () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedMutation({
        mutate,
        getKey: (args: { id: string; data: string }) => args.id,
        delay: 500,
      })
    );

    act(() => {
      result.current.mutate({ id: 'col-1', data: 'first' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.mutate({ id: 'col-1', data: 'second' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.mutate({ id: 'col-1', data: 'third' });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ id: 'col-1', data: 'third' });
  });

  it('keeps separate keys independent', () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedMutation({
        mutate,
        getKey: (args: { id: string }) => args.id,
        delay: 500,
      })
    );

    act(() => {
      result.current.mutate({ id: 'col-1' });
      result.current.mutate({ id: 'col-2' });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate).toHaveBeenCalledWith({ id: 'col-1' });
    expect(mutate).toHaveBeenCalledWith({ id: 'col-2' });
  });

  it('flush fires all pending mutations immediately', () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedMutation({
        mutate,
        getKey: (args: { id: string }) => args.id,
        delay: 500,
      })
    );

    act(() => {
      result.current.mutate({ id: 'col-1' });
      result.current.mutate({ id: 'col-2' });
    });

    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      result.current.flush();
    });

    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it('flush does nothing when no pending mutations', () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedMutation({
        mutate,
        getKey: (args: { id: string }) => args.id,
        delay: 500,
      })
    );

    act(() => {
      result.current.flush();
    });

    expect(mutate).not.toHaveBeenCalled();
  });

  it('cleans up timers on unmount', () => {
    const mutate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedMutation({
        mutate,
        getKey: (args: { id: string }) => args.id,
        delay: 500,
      })
    );

    act(() => {
      result.current.mutate({ id: 'col-1' });
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mutate).not.toHaveBeenCalled();
  });

  it('uses default delay of 500ms', () => {
    const mutate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedMutation({
        mutate,
        getKey: (args: { id: string }) => args.id,
      })
    );

    act(() => {
      result.current.mutate({ id: 'col-1' });
    });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
