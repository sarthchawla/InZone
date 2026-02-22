import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check, FileText, GripVertical, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Todo, Priority } from '../../types';

interface TodoCardProps {
  todo: Todo;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick?: (todo: Todo) => void;
  onContextMenu?: (todo: Todo, event: React.MouseEvent) => void;
  isDropTarget?: boolean;
  isSelected?: boolean;
  sortDisabled?: boolean;
}

const priorityBarClass: Record<Priority, string> = {
  LOW: 'priority-bar-low',
  MEDIUM: 'priority-bar-medium',
  HIGH: 'priority-bar-high',
  URGENT: 'priority-bar-urgent',
};

const priorityDotColor: Record<Priority, string> = {
  LOW: 'bg-emerald-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-red-500',
};

const priorityLabel: Record<Priority, string> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export function TodoCard({
  todo,
  isDragging,
  isOverlay,
  onClick,
  onContextMenu,
  isDropTarget,
  isSelected,
  sortDisabled,
}: TodoCardProps) {
  const [isChecked, setIsChecked] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: todo.id, disabled: sortDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || (transform ? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)' : undefined),
  };

  const isBeingDragged = isDragging || isSortableDragging;
  const isOptimistic = todo.id.startsWith('temp-');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(todo);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(todo, e);
  };

  const handleActionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContextMenu?.(todo, e);
  };

  const visibleLabels = todo.labels.slice(0, 3);
  const extraLabelCount = todo.labels.length - 3;

  // Build metadata segments
  const metadataSegments: React.ReactNode[] = [];

  // Priority dot + text
  metadataSegments.push(
    <span key="priority" className="inline-flex items-center gap-1">
      <span className={cn('inline-block h-2 w-2 rounded-full', priorityDotColor[todo.priority])} />
      {priorityLabel[todo.priority]}
    </span>
  );

  // Due date
  if (todo.dueDate) {
    metadataSegments.push(
      <span
        key="due-date"
        data-testid="due-date"
        className={cn('inline-flex items-center gap-1', isOverdue && 'text-red-600')}
      >
        <Calendar className="h-3 w-3" />
        {formatDate(todo.dueDate)}
      </span>
    );
  }

  // Label count
  if (todo.labels.length > 0) {
    metadataSegments.push(
      <span key="label-count">
        {todo.labels.length} {todo.labels.length === 1 ? 'label' : 'labels'}
      </span>
    );
  }

  // Show a skeleton placeholder where the card was picked up from
  if (isBeingDragged && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        data-testid="todo-card"
        className="rounded-xl border-2 border-dashed border-accent-muted bg-indigo-50/30 p-3 h-[72px]"
      >
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-indigo-200/40 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-indigo-200/25 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      data-testid="todo-card"
      className={cn(
        'group relative rounded-xl border border-border bg-card shadow-sm',
        priorityBarClass[todo.priority],
        'hover:shadow-md hover:border-border hover:-translate-y-0.5',
        'active:scale-[0.98] active:shadow-sm',
        'transition-all duration-200 cursor-pointer',
        isOverlay && 'shadow-2xl ring-2 ring-ring/20 rotate-[1.5deg] cursor-grabbing z-50 bg-card',
        isDropTarget && 'ring-2 ring-accent/40 border-accent/30 shadow-md',
        isSelected && 'ring-2 ring-accent',
        isOptimistic && 'animate-pulse opacity-80',
      )}
    >
      {/* Drop insertion indicator above this card */}
      {isDropTarget && (
        <div className="absolute -top-1.5 left-0 right-0 flex items-center drop-insertion-line">
          <div className="h-2 w-2 rounded-full bg-accent -ml-1 flex-shrink-0" />
          <div className="flex-1 h-0.5 bg-accent" />
          <div className="h-2 w-2 rounded-full bg-accent -mr-1 flex-shrink-0" />
        </div>
      )}

      {/* Always-visible actions button */}
      <button
        data-testid="actions-button"
        onClick={handleActionsClick}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors z-10"
        title="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <div className="flex gap-2 p-3">
        {/* Drag handle - always visible on mobile, hover on desktop */}
        <div
          className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity -ml-1 mt-0.5"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Completion checkbox with touch-friendly target */}
        <div className="flex-shrink-0 p-2 -m-2">
          <button
            data-testid="todo-checkbox"
            onClick={(e) => {
              e.stopPropagation();
              setIsChecked(!isChecked);
            }}
            className={cn(
              'h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center transition-colors',
              isChecked
                ? 'bg-green-500 border-green-500'
                : 'border-border bg-card hover:border-muted-foreground'
            )}
            title={isChecked ? 'Mark as incomplete' : 'Mark as complete'}
          >
            <AnimatePresence>
              {isChecked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="flex-1 min-w-0 pr-6">
          {/* Title row */}
          <div className="flex items-start gap-2 mb-1.5">
            <h4
              data-testid="todo-title"
              className={cn(
                'text-sm font-medium flex-1',
                isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
              )}
            >
              {todo.title}
            </h4>
            {/* Description indicator */}
            {todo.description && (
              <span className="text-muted-foreground flex-shrink-0" title="Has description">
                <FileText className="h-4 w-4" />
              </span>
            )}
          </div>

          {/* Label chips */}
          {todo.labels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {visibleLabels.map((label) => (
                <span
                  key={label.id}
                  data-testid="label"
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {extraLabelCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{extraLabelCount} more
                </span>
              )}
            </div>
          )}

          {/* Metadata line: priority dot + text, due date, label count separated by middot */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {metadataSegments.map((segment, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/40 mx-0.5">&middot;</span>}
                {segment}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
