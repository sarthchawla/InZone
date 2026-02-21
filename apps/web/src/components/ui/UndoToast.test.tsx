import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '../../test/utils';
import { UndoToast } from './UndoToast';

// Mock framer-motion to render children synchronously
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      className,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div className={className} data-testid={rest['data-testid'] as string}>
        {children}
      </div>
    ),
  },
}));

describe('UndoToast', () => {
  const defaultProps = {
    message: 'Item deleted',
    onUndo: vi.fn(),
    onExpire: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the message text', () => {
    render(<UndoToast {...defaultProps} />);
    expect(screen.getByText('Item deleted')).toBeInTheDocument();
  });

  it('calls onUndo and hides on Undo click', () => {
    render(<UndoToast {...defaultProps} />);
    fireEvent.click(screen.getByText('Undo'));
    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss and onExpire on dismiss click', () => {
    render(<UndoToast {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(defaultProps.onExpire).toHaveBeenCalledTimes(1);
  });

  it('calls onExpire after default timeout', () => {
    render(<UndoToast {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(defaultProps.onExpire).toHaveBeenCalledTimes(1);
  });

  it('calls onExpire after custom duration', () => {
    render(<UndoToast {...defaultProps} duration={3000} />);
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(defaultProps.onExpire).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(defaultProps.onExpire).toHaveBeenCalledTimes(1);
  });
});
