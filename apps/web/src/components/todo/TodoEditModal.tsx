import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { LabelSelector } from '../label';
import { PriorityBadge } from '../ui/Badge';
import type { Todo, Priority, Label } from '../../types';

interface TodoEditModalProps {
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    description?: string;
    priority?: Priority;
    dueDate?: string | null;
    labelIds?: string[];
  }) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TodoEditModal({
  todo,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isLoading,
}: TodoEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);

  // Sync state when todo changes
  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description || '');
      setPriority(todo.priority);
      setDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
      setSelectedLabels(todo.labels || []);
    }
  }, [todo]);

  const handleSave = () => {
    if (!title.trim()) return;

    const updates: Parameters<typeof onSave>[0] = {};

    if (title.trim() !== todo?.title) {
      updates.title = title.trim();
    }
    if (description !== (todo?.description || '')) {
      updates.description = description;
    }
    if (priority !== todo?.priority) {
      updates.priority = priority;
    }
    const currentDueDate = todo?.dueDate ? todo.dueDate.split('T')[0] : '';
    if (dueDate !== currentDueDate) {
      updates.dueDate = dueDate || null;
    }
    const currentLabelIds = (todo?.labels || []).map((l) => l.id).sort();
    const newLabelIds = selectedLabels.map((l) => l.id).sort();
    if (JSON.stringify(currentLabelIds) !== JSON.stringify(newLabelIds)) {
      updates.labelIds = newLabelIds;
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  if (!todo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      className="max-w-lg"
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Title */}
        <div>
          <label htmlFor="todoTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <Input
            id="todoTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="todoDescription" className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Description
            </span>
          </label>
          <textarea
            id="todoDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a more detailed description... (Markdown supported)"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm font-mono"
          />
          <p className="mt-1 text-xs text-gray-500">
            Supports Markdown: **bold**, *italic*, `code`, - lists, etc.
          </p>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  priority === p
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <PriorityBadge priority={p} />
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="todoDueDate" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            id="todoDueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Labels */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Labels
          </label>
          <LabelSelector
            selectedLabels={selectedLabels}
            onLabelsChange={setSelectedLabels}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {onDelete && (
              <Button variant="danger" onClick={onDelete} disabled={isLoading}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isLoading || !title.trim()}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
