import { motion } from 'framer-motion';
import { Button } from '../ui';

interface UnsavedNavigationDialogProps {
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedNavigationDialog({ onStay, onLeave }: UnsavedNavigationDialogProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-navigation-title"
        aria-describedby="unsaved-navigation-description"
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-xl"
        initial={{ scale: 0.98, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 8 }}
      >
        <h2 id="unsaved-navigation-title" className="text-base font-semibold text-stone-900">
          Unsaved changes
        </h2>
        <p id="unsaved-navigation-description" className="mt-2 text-sm text-stone-600">
          Save or discard your board changes before leaving, or those edits will be lost.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onStay}>
            Stay
          </Button>
          <Button variant="primary" onClick={onLeave}>
            Leave without saving
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
