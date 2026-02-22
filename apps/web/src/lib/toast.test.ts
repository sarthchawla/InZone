import { describe, it, expect, vi } from 'vitest';

// Mock sonner before importing toast
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

import { toast, undoToast } from './toast';
import { toast as sonnerToast } from 'sonner';

describe('toast wrapper', () => {
  it('calls sonnerToast.success for success type', () => {
    toast.success('Done!');
    expect(sonnerToast.success).toHaveBeenCalledWith('Done!');
  });

  it('calls sonnerToast.error with infinite duration for error type', () => {
    toast.error('Failed!');
    expect(sonnerToast.error).toHaveBeenCalledWith('Failed!', { duration: Infinity });
  });

  it('calls sonnerToast.warning for warning type', () => {
    toast.warning('Watch out!');
    expect(sonnerToast.warning).toHaveBeenCalledWith('Watch out!');
  });

  it('calls sonnerToast for info type', () => {
    toast.info('FYI');
    expect(sonnerToast).toHaveBeenCalledWith('FYI');
  });
});

describe('undoToast', () => {
  it('calls sonnerToast with action containing undo callback', () => {
    const onUndo = vi.fn();
    undoToast('Deleted', onUndo, 3000);
    expect(sonnerToast).toHaveBeenCalledWith('Deleted', {
      duration: 3000,
      action: { label: 'Undo', onClick: onUndo },
    });
  });
});
