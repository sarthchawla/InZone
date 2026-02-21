import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, X } from 'lucide-react';

export interface UndoToastProps {
  message: string;
  duration?: number;
  onUndo: () => void;
  onExpire: () => void;
  onDismiss: () => void;
}

export function UndoToast({
  message,
  duration = 5000,
  onUndo,
  onExpire,
  onDismiss,
}: UndoToastProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        setVisible(false);
        onExpire();
      }
    }, duration);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [duration, onExpire]);

  const handleUndo = () => {
    clearTimeout(timerRef.current);
    hasExpiredRef.current = true;
    setVisible(false);
    onUndo();
  };

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    if (!hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpire();
    }
    setVisible(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-stone-900 text-white rounded-xl shadow-2xl px-4 py-3 min-w-[280px] max-w-[400px]">
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm">{message}</p>
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-accent bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 text-stone-400 hover:text-white transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Countdown bar */}
            <div className="mt-2 h-0.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="bg-accent h-0.5 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
