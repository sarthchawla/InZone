import { useEffect, useCallback } from 'react';

interface ShortcutAction {
  key: string;
  handler: () => void;
  description: string;
  /** If true, only fires when no input/textarea/contenteditable is focused */
  global?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs, textareas, or contenteditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (e.key === shortcut.key && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (shortcut.global !== false && isInput) continue;
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const BOARD_SHORTCUTS = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'n', description: 'Add new card to first column' },
  { key: 'e', description: 'Edit last selected card' },
  { key: 'Delete', description: 'Delete card being edited' },
] as const;
