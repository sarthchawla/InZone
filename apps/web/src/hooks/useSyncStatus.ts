import { useState, useEffect, useRef } from 'react';
import { useIsMutating } from '@tanstack/react-query';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

interface UseSyncStatusOptions {
  /** How long to show "Saved" before returning to idle (ms) */
  syncedDuration?: number;
}

interface UseSyncStatusReturn {
  state: SyncState;
  pendingCount: number;
}

export function useSyncStatus(options: UseSyncStatusOptions = {}): UseSyncStatusReturn {
  const { syncedDuration = 2000 } = options;
  const mutatingCount = useIsMutating();
  const [state, setState] = useState<SyncState>('idle');
  const syncedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (mutatingCount > 0) {
      clearTimeout(syncedTimerRef.current);
      setState('syncing');
    } else if (prevCountRef.current > 0 && mutatingCount === 0) {
      // Mutations just finished — show "synced"
      setState('synced');
      syncedTimerRef.current = setTimeout(() => {
        setState('idle');
      }, syncedDuration);
    }

    prevCountRef.current = mutatingCount;

    return () => {
      clearTimeout(syncedTimerRef.current);
    };
  }, [mutatingCount, syncedDuration]);

  return { state, pendingCount: mutatingCount };
}
