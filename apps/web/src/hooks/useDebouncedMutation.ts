import { useRef, useCallback, useEffect } from 'react';

interface DebouncedMutationOptions<TArgs> {
  /** The mutate function to debounce */
  mutate: (args: TArgs) => void;
  /** Function to derive a grouping key from the args */
  getKey: (args: TArgs) => string;
  /** Debounce delay in ms */
  delay?: number;
}

interface DebouncedMutationReturn<TArgs> {
  /** Debounced mutate — replaces pending call for same key */
  mutate: (args: TArgs) => void;
  /** Immediately fire all pending debounced mutations */
  flush: () => void;
}

export function useDebouncedMutation<TArgs>({
  mutate,
  getKey,
  delay = 500,
}: DebouncedMutationOptions<TArgs>): DebouncedMutationReturn<TArgs> {
  const pendingRef = useRef<Map<string, { args: TArgs; timer: ReturnType<typeof setTimeout> }>>(
    new Map()
  );
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    for (const [key, entry] of pending) {
      clearTimeout(entry.timer);
      mutateRef.current(entry.args);
      pending.delete(key);
    }
  }, []);

  const debouncedMutate = useCallback(
    (args: TArgs) => {
      const key = getKey(args);
      const pending = pendingRef.current;

      // Cancel existing pending call for this key
      const existing = pending.get(key);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(() => {
        pending.delete(key);
        mutateRef.current(args);
      }, delay);

      pending.set(key, { args, timer });
    },
    [getKey, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      for (const [, entry] of pending) {
        clearTimeout(entry.timer);
      }
      pending.clear();
    };
  }, []);

  return { mutate: debouncedMutate, flush };
}
