import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLabels, useCreateLabel } from '../../hooks';
import type { Label } from '../../types';

interface LabelSelectorProps {
  selectedLabels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  className?: string;
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

export function LabelSelector({ selectedLabels, onLabelsChange, className }: LabelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: labels = [] } = useLabels();
  const createLabel = useCreateLabel();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleLabel = (label: Label) => {
    const isSelected = selectedLabels.some((l) => l.id === label.id);
    if (isSelected) {
      onLabelsChange(selectedLabels.filter((l) => l.id !== label.id));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
  };

  const handleRemoveLabel = (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onLabelsChange(selectedLabels.filter((l) => l.id !== labelId));
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    try {
      const newLabel = await createLabel.mutateAsync({
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      onLabelsChange([...selectedLabels, newLabel]);
      setNewLabelName('');
      setNewLabelColor(PRESET_COLORS[0]);
      setShowCreateForm(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full min-h-[40px] px-3 py-2 rounded-md border border-border',
          'bg-card text-sm text-left',
          'hover:border-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">Select labels...</span>
          ) : (
            selectedLabels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                }}
              >
                {label.name}
                <button
                  type="button"
                  onClick={(e) => handleRemoveLabel(label.id, e)}
                  className="hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <div className="max-h-60 overflow-y-auto p-1">
            {labels.length === 0 && !showCreateForm && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No labels yet. Create one!</div>
            )}

            {labels.map((label) => {
              const isSelected = selectedLabels.some((l) => l.id === label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => handleToggleLabel(label)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded',
                    'hover:bg-muted',
                    isSelected && 'bg-primary/10'
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-foreground">{label.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border p-2">
            {showCreateForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name"
                  className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateLabel();
                    }
                    if (e.key === 'Escape') {
                      setShowCreateForm(false);
                      setNewLabelName('');
                    }
                  }}
                />
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      className={cn(
                        'h-6 w-6 rounded-full transition-transform',
                        newLabelColor === color && 'ring-2 ring-offset-1 ring-ring scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateLabel}
                    disabled={!newLabelName.trim() || createLabel.isPending}
                    className="flex-1 px-2 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {createLabel.isPending ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewLabelName('');
                    }}
                    className="px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded"
              >
                <Plus className="h-4 w-4" />
                Create new label
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
