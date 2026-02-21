import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from '../../hooks';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface LabelManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export function LabelManager({ isOpen, onClose }: LabelManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: labels = [], isLoading } = useLabels();
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const handleStartEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      await updateLabel.mutateAsync({
        id: editingId,
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      await createLabel.mutateAsync({
        name: newName.trim(),
        color: newColor,
      });
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      setShowCreateForm(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLabel.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Labels" className="max-w-lg">
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-stone-500">Loading labels...</div>
        ) : labels.length === 0 && !showCreateForm ? (
          <div className="text-center py-8 text-stone-500">
            <p className="mb-2">No labels yet</p>
            <p className="text-sm">Create labels to categorize your todos</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {labels.map((label) => (
              <div
                key={label.id}
                className={cn(
                  'group flex items-center gap-3 p-3 rounded-lg border',
                  deleteConfirmId === label.id ? 'border-red-200 bg-red-50' : 'border-stone-200'
                )}
              >
                {editingId === label.id ? (
                  <>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <div className="flex gap-1 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className={cn(
                              'h-5 w-5 rounded-full',
                              editColor === color && 'ring-2 ring-offset-1 ring-stone-400'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={updateLabel.isPending}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-stone-500" />
                      </Button>
                    </div>
                  </>
                ) : deleteConfirmId === label.id ? (
                  <>
                    <span
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600">Delete "{label.name}"?</p>
                      <p className="text-xs text-red-500">
                        This will remove the label from all todos
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(label.id)}
                        disabled={deleteLabel.isPending}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-stone-900">{label.name}</span>
                      {label._count?.todos !== undefined && (
                        <span className="ml-2 text-xs text-stone-500">
                          ({label._count.todos} {label._count.todos === 1 ? 'todo' : 'todos'})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(label.id, label.name, label.color)}
                        className="h-7 w-7 p-0"
                        data-testid={`edit-label-${label.id}`}
                        aria-label={`Edit ${label.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-stone-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(label.id)}
                        className="h-7 w-7 p-0"
                        data-testid={`delete-label-${label.id}`}
                        aria-label={`Delete ${label.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-stone-500" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {showCreateForm ? (
          <div className="p-3 rounded-lg border border-accent-muted bg-accent-light space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Label name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setShowCreateForm(false);
                  setNewName('');
                }
              }}
            />
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={cn(
                    'h-6 w-6 rounded-full',
                    newColor === color && 'ring-2 ring-offset-1 ring-stone-400'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || createLabel.isPending}
              >
                {createLabel.isPending ? 'Creating...' : 'Create Label'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="default"
            onClick={() => setShowCreateForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Label
          </Button>
        )}
      </div>
    </Modal>
  );
}
