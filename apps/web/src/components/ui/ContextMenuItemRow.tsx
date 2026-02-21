import { useState, useRef } from 'react';
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

export function MenuItemRow({
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
