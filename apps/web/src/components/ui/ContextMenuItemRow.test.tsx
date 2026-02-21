import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { MenuItemRow } from './ContextMenuItemRow';
import type { ContextMenuItem } from '../../types';

describe('MenuItemRow', () => {
  const onClose = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a separator for "---" label', () => {
    const item: ContextMenuItem = { label: '---' };
    const { container } = render(
      <MenuItemRow item={item} onClose={onClose} isMobile={false} />
    );
    const separator = container.querySelector('.h-px');
    expect(separator).toBeInTheDocument();
  });

  it('renders the label text', () => {
    const item: ContextMenuItem = { label: 'Edit' };
    render(<MenuItemRow item={item} onClose={onClose} isMobile={false} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('calls onClick and onClose on click', () => {
    const onClick = vi.fn();
    const item: ContextMenuItem = { label: 'Delete', onClick };
    render(<MenuItemRow item={item} onClose={onClose} isMobile={false} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    const item: ContextMenuItem = { label: 'Disabled', onClick, disabled: true };
    render(<MenuItemRow item={item} onClose={onClose} isMobile={false} />);
    fireEvent.click(screen.getByText('Disabled'));
    expect(onClick).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the icon when provided', () => {
    const item: ContextMenuItem = {
      label: 'With Icon',
      icon: <span data-testid="test-icon">icon</span>,
    };
    render(<MenuItemRow item={item} onClose={onClose} isMobile={false} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('shows the shortcut when provided', () => {
    const item: ContextMenuItem = { label: 'Copy', shortcut: '⌘C' };
    render(<MenuItemRow item={item} onClose={onClose} isMobile={false} />);
    expect(screen.getByText('⌘C')).toBeInTheDocument();
  });

  it('opens submenu on hover for desktop', async () => {
    const submenuItem: ContextMenuItem = { label: 'Sub Item', onClick: vi.fn() };
    const item: ContextMenuItem = { label: 'More', submenu: [submenuItem] };
    const { container } = render(
      <MenuItemRow item={item} onClose={onClose} isMobile={false} />
    );

    // Hover over the parent
    fireEvent.mouseEnter(container.firstChild!);
    expect(screen.getByText('Sub Item')).toBeInTheDocument();
  });

  it('toggles submenu on click for mobile', () => {
    const submenuItem: ContextMenuItem = { label: 'Sub Mobile', onClick: vi.fn() };
    const item: ContextMenuItem = { label: 'More', submenu: [submenuItem] };
    render(<MenuItemRow item={item} onClose={onClose} isMobile={true} />);

    // Click to open submenu
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText('Sub Mobile')).toBeInTheDocument();

    // Click again to close submenu
    fireEvent.click(screen.getByText('More'));
    expect(screen.queryByText('Sub Mobile')).not.toBeInTheDocument();
  });
});
