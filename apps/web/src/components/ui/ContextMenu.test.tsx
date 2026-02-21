import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuItem } from '../../types';

describe('ContextMenu', () => {
  const onClose = vi.fn();

  const items: ContextMenuItem[] = [
    { label: 'Edit', onClick: vi.fn() },
    { label: 'Delete', danger: true, onClick: vi.fn() },
  ];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when position is null', () => {
    render(
      <ContextMenu items={items} position={null} onClose={onClose} />
    );
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('renders menu items when position is provided', () => {
    render(
      <ContextMenu items={items} position={{ x: 100, y: 100 }} onClose={onClose} />
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(
      <ContextMenu items={items} position={{ x: 100, y: 100 }} onClose={onClose} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on click outside', () => {
    render(
      <ContextMenu items={items} position={{ x: 100, y: 100 }} onClose={onClose} />
    );
    fireEvent.mouseDown(document);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders in mobile bottom sheet mode when window is narrow', () => {
    // Set narrow viewport
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });

    render(
      <ContextMenu items={items} position={{ x: 50, y: 50 }} onClose={onClose} />
    );

    // Mobile mode renders a backdrop with bg-black/40
    const backdrop = document.querySelector('.bg-black\\/40');
    expect(backdrop).toBeInTheDocument();

    // Restore
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });
});
