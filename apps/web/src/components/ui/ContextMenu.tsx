import { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

function MenuItemRow({
  item,
  onClose,
  isMobile,
}: {
  item: ContextMenuItem;
  onClose: () => void;
  isMobile: boolean;
}) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isSeparator = item.label === '---';

  if (isSeparator) {
    return <div className="h-px bg-stone-200 my-1" />;
  }

  const hasSubmenu = item.submenu && item.submenu.length > 0;

  const handleClick = () => {
    if (item.disabled) return;
    if (hasSubmenu) {
      if (isMobile) {
        setSubmenuOpen((prev) => !prev);
      }
      return;
    }
    item.onClick?.();
    onClose();
  };

  const handleMouseEnter = () => {
    if (isMobile || !hasSubmenu) return;
    clearTimeout(timeoutRef.current);
    setSubmenuOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile || !hasSubmenu) return;
    timeoutRef.current = setTimeout(() => setSubmenuOpen(false), 150);
  };

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        disabled={item.disabled}
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left',
          item.disabled && 'opacity-40 cursor-not-allowed',
          !item.disabled && !item.danger && 'hover:bg-accent-light text-stone-700 hover:text-accent',
          !item.disabled && item.danger && 'hover:bg-red-50 text-red-600'
        )}
      >
        {item.icon && <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>}
        <span className="flex-1">{item.label}</span>
        {item.shortcut && (
          <span className="text-xs text-stone-400 ml-4">{item.shortcut}</span>
        )}
        {hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-stone-400 ml-2" />}
      </button>

      {hasSubmenu && submenuOpen && (
        <div
          className={cn(
            isMobile
              ? 'pl-4 border-l border-stone-200 ml-3 mt-1'
              : 'absolute left-full top-0 ml-1 min-w-[180px] bg-white rounded-xl shadow-2xl border border-stone-200 p-1.5 animate-fade-in'
          )}
        >
          {item.submenu!.map((sub, i) => (
            <MenuItemRow
              key={`${sub.label}-${i}`}
              item={sub}
              onClose={onClose}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  );
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
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-2 pb-[env(safe-area-inset-bottom)] animate-fade-in"
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2 mb-1">
            <div className="w-10 h-1 bg-stone-300 rounded-full" />
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
      className="fixed z-50 min-w-[200px] bg-white rounded-xl shadow-2xl border border-stone-200 p-1.5 animate-fade-in"
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
