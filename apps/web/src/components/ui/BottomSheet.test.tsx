import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { BottomSheet } from './BottomSheet';

// Mock framer-motion to render children synchronously
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      onClick,
      className,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div onClick={onClick} className={className} data-testid={rest['data-testid'] as string}>
        {children}
      </div>
    ),
  },
}));

describe('BottomSheet', () => {
  const onClose = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('renders nothing when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={onClose}>
        <p>Content</p>
      </BottomSheet>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <p>Sheet content</p>
      </BottomSheet>
    );
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('shows title when provided', () => {
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="My Title">
        <p>Content</p>
      </BottomSheet>
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('does not render title when not provided', () => {
    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <p>Content</p>
      </BottomSheet>
    );
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <p>Content</p>
      </BottomSheet>
    );
    // The backdrop is the first child div inside the fixed wrapper
    const backdrop = container.querySelector('.fixed > div');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <p>Content</p>
      </BottomSheet>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });
});
