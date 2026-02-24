import { Modal } from './Modal';

interface Shortcut {
  key: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

export function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-1">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center justify-between py-2">
            <span className="text-sm text-secondary-foreground">{shortcut.description}</span>
            <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-secondary border border-border rounded-lg text-xs font-mono font-medium text-secondary-foreground shadow-sm">
              {shortcut.key === '?' ? '?' : shortcut.key.toUpperCase()}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
