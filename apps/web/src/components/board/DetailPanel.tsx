import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Trash2, Calendar, Plus, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUpdateTodo, useDeleteTodo } from '../../hooks/useTodos';
import { useLabels } from '../../hooks/useLabels';
import { RichTextEditor } from '../ui/RichTextEditor';
import type { Todo, Column, Priority } from '../../types';

export interface DetailPanelProps {
  todo: Todo | null;
  boardId: string;
  columns: Column[];
  onClose: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const PRIORITY_CONFIG: { value: Priority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' },
  { value: 'MEDIUM', label: 'Med', color: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' },
];

const PRIORITY_ACTIVE: Record<Priority, string> = {
  LOW: 'bg-emerald-500 text-white border-emerald-500',
  MEDIUM: 'bg-amber-500 text-white border-amber-500',
  HIGH: 'bg-orange-500 text-white border-orange-500',
  URGENT: 'bg-red-500 text-white border-red-500',
};

export function DetailPanel({ todo, boardId, columns, onClose }: DetailPanelProps) {
  const isMobile = useIsMobile();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const { data: allLabels } = useLabels();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(400);
  const isResizingRef = useRef(false);

  // Sync state when todo changes
  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setPriority(todo.priority);
      setDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
      setDescription(todo.description ?? '');
      setSelectedLabelIds(todo.labels.map((l) => l.id));
      setSaveStatus('idle');
    }
  }, [todo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save
  const saveField = useCallback(
    (updates: Record<string, unknown>) => {
      if (!todo) return;
      clearTimeout(debounceRef.current);
      clearTimeout(savedTimerRef.current);

      debounceRef.current = setTimeout(() => {
        setSaveStatus('saving');
        updateTodo.mutate(
          { id: todo.id, boardId, ...updates },
          {
            onSuccess: () => {
              setSaveStatus('saved');
              savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
            },
            onError: () => {
              setSaveStatus('idle');
            },
          }
        );
      }, 800);
    },
    [todo, boardId, updateTodo]
  );

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 320), 700);
      setPanelWidth(newWidth);
    };

    const handleUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [panelWidth]);

  const handleDelete = () => {
    if (!todo) return;
    deleteTodo.mutate({ id: todo.id, boardId });
    onClose();
  };

  const handlePriorityChange = (p: Priority) => {
    setPriority(p);
    saveField({ priority: p });
  };

  const handleLabelToggle = (labelId: string) => {
    const next = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    setSelectedLabelIds(next);
    saveField({ labelIds: next });
  };

  const currentColumn = columns.find((c) => c.id === todo?.columnId);

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-stone-500"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </motion.div>
            )}
            {saveStatus === 'saved' && (
              <motion.div
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-emerald-600"
              >
                <Check className="w-3.5 h-3.5" />
                Saved
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Column indicator */}
        {currentColumn && (
          <div className="text-xs text-stone-500 font-medium uppercase tracking-wide">
            {currentColumn.name}
          </div>
        )}

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== todo?.title) {
              saveField({ title: title.trim() });
            }
          }}
          className="w-full text-lg font-semibold text-stone-900 border-0 border-b border-transparent focus:border-accent outline-none bg-transparent pb-1 transition-colors placeholder:text-stone-400"
          placeholder="Task title"
        />

        {/* Priority */}
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2 block">
            Priority
          </label>
          <div className="flex gap-2">
            {PRIORITY_CONFIG.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePriorityChange(p.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                  priority === p.value ? PRIORITY_ACTIVE[p.value] : p.color
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2 block">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => {
              const val = e.target.value;
              setDueDate(val);
              saveField({ dueDate: val ? new Date(val + 'T00:00:00.000Z').toISOString() : null });
            }}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors bg-white"
          />
        </div>

        {/* Labels */}
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2 block">
            <Tag className="w-3.5 h-3.5 inline mr-1" />
            Labels
          </label>
          <div className="flex flex-wrap gap-1.5">
            {selectedLabelIds.map((id) => {
              const label = allLabels?.find((l) => l.id === id) ?? todo?.labels.find((l) => l.id === id);
              if (!label) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleLabelToggle(id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: `${label.color}20`,
                    borderColor: `${label.color}40`,
                    color: label.color,
                  }}
                >
                  {label.name}
                  <X className="w-3 h-3" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowLabelPicker((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
          {/* Label picker dropdown */}
          <AnimatePresence>
            {showLabelPicker && allLabels && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="border border-stone-200 rounded-lg p-2 bg-white shadow-sm max-h-40 overflow-y-auto">
                  {allLabels.length === 0 && (
                    <p className="text-xs text-stone-400 py-1 px-2">No labels available</p>
                  )}
                  {allLabels.map((label) => {
                    const isSelected = selectedLabelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => handleLabelToggle(label.id)}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md transition-colors',
                          isSelected ? 'bg-accent-light text-accent' : 'hover:bg-stone-100 text-stone-700'
                        )}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 text-left">{label.name}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2 block">
            Description
          </label>
          <RichTextEditor
            content={description}
            onChange={(value) => {
              setDescription(value);
              saveField({ description: value });
            }}
            placeholder="Add a description..."
            className="min-h-[150px]"
          />
        </div>
      </div>

      {/* Footer with delete */}
      <div className="px-5 py-4 border-t border-stone-200 flex-shrink-0">
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full justify-center"
        >
          <Trash2 className="w-4 h-4" />
          Delete task
        </button>
      </div>
    </div>
  );

  if (!todo) return null;

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            role="dialog"
            aria-label="Task details"
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col safe-bottom"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>
            {panelContent}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // Desktop: inline side panel (Jira-like, non-blocking)
  return (
    <motion.div
      ref={panelRef}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: panelWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      role="dialog"
      aria-label="Task details"
      className="flex-shrink-0 bg-white border-l border-stone-200 flex flex-col h-full overflow-hidden relative"
    >
      {/* Resize handle */}
      <div
        onPointerDown={handleResizeStart}
        className="group/resize absolute top-0 left-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/20 active:bg-accent/30 transition-colors z-10 flex items-center justify-center"
      >
        <div className="w-0.5 h-8 bg-stone-300 rounded-full group-hover/resize:bg-accent group-active/resize:bg-accent transition-colors" />
      </div>
      {panelContent}
    </motion.div>
  );
}
