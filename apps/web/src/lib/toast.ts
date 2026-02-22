import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message, { duration: Infinity }),
  warning: (message: string) => sonnerToast.warning(message),
  info: (message: string) => sonnerToast(message),
};

export function undoToast(message: string, onUndo: () => void, duration = 5000) {
  return sonnerToast(message, {
    duration,
    action: { label: 'Undo', onClick: onUndo },
  });
}
