import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, CloudOff } from 'lucide-react';
import type { SyncState } from '../../hooks/useSyncStatus';

interface SyncStatusIndicatorProps {
  state: SyncState;
  pendingCount: number;
}

export function SyncStatusIndicator({ state, pendingCount }: SyncStatusIndicatorProps) {
  if (state === 'idle') return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        role="status"
        aria-live="polite"
        data-testid="sync-status"
      >
        {state === 'syncing' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving{pendingCount > 1 ? ` (${pendingCount})` : '...'}
          </span>
        )}
        {state === 'synced' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
        {state === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
            <CloudOff className="h-3 w-3" />
            Sync failed
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
