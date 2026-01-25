import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PriorityBadge } from '../ui/Badge';
import type { Todo } from '../../types';

interface TodoCardProps {
  todo: Todo;
  isDragging?: boolean;
  onClick?: (todo: Todo) => void;
}

export function TodoCard({ todo, isDragging, onClick }: TodoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isBeingDragged = isDragging || isSortableDragging;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date();

  const handleClick = (e: React.MouseEvent) => {
    // Only open edit modal if this is a genuine click, not after a drag
    // The PointerSensor has an 8px activation constraint, so if we get here
    // it means the pointer didn't move enough to start a drag
    e.stopPropagation();
    onClick?.(todo);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      data-testid="todo-card"
      className={cn(
        'group relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm',
        'hover:border-gray-300 hover:shadow-md transition-all',
        'cursor-pointer',
        isBeingDragged && 'opacity-50 shadow-lg ring-2 ring-blue-400 rotate-2 cursor-grabbing'
      )}
    >
      <div>
        <div className="flex items-start gap-2 mb-2">
          <h4 data-testid="todo-title" className="text-sm font-medium text-gray-900 flex-1">{todo.title}</h4>
          {/* Description indicator */}
          {todo.description && (
            <span className="text-gray-400 flex-shrink-0" title="Has description">
              <FileText className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={todo.priority} />

          {todo.labels.map((label) => (
            <span
              key={label.id}
              data-testid="label"
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}

          {todo.dueDate && (
            <span
              data-testid="due-date"
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                isOverdue ? 'text-red-600' : 'text-gray-500'
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(todo.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
