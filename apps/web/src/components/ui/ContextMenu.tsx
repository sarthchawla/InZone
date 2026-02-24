import { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { MenuItemRow } from './ContextMenuItemRow';
import type { ContextMenuItem } from '../../types';

export type { ContextMenuItem } from '../../types';

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, [position]);

  // Close on click outside
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!position) return;
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, handleClickOutside, handleKeyDown]);

  // Adjust position to stay within viewport
  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    if (!position || !menuRef.current || isMobile) return;
    const rect = menuRef.current.getBoundingClientRect();
    const x = position.x + rect.width > window.innerWidth
      ? window.innerWidth - rect.width - 8
      : position.x;
    const y = position.y + rect.height > window.innerHeight
      ? window.innerHeight - rect.height - 8
      : position.y;
    setAdjustedPos({ x: Math.max(8, x), y: Math.max(8, y) });
  }, [position, isMobile]);

  if (!position) return null;

  // Mobile: bottom sheet style
  if (isMobile) {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        {/* Bottom sheet */}
        <div
          ref={menuRef}
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl p-2 pb-[env(safe-area-inset-bottom)] animate-fade-in"
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2 mb-1">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {items.map((item, i) => (
            <MenuItemRow
              key={`${item.label}-${i}`}
              item={item}
              onClose={onClose}
              isMobile
            />
          ))}
        </div>
      </div>,
      document.body
    );
  }

  // Desktop: positioned context menu
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] bg-card rounded-xl shadow-2xl border border-border p-1.5 animate-fade-in"
      style={{
        left: adjustedPos?.x ?? position.x,
        top: adjustedPos?.y ?? position.y,
      }}
    >
      {items.map((item, i) => (
        <MenuItemRow
          key={`${item.label}-${i}`}
          item={item}
          onClose={onClose}
          isMobile={false}
        />
      ))}
    </div>,
    document.body
  );
}
