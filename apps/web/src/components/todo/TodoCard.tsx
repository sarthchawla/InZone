import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PriorityBadge } from '../ui/Badge';
import type { Todo } from '../../types';

interface TodoCardProps {
  todo: Todo;
  isDragging?: boolean;
}

export function TodoCard({ todo, isDragging }: TodoCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm',
        'hover:border-gray-300 hover:shadow-md transition-all cursor-pointer',
        isBeingDragged && 'opacity-50 shadow-lg ring-2 ring-blue-400'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="pl-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">{todo.title}</h4>

        {todo.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{todo.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={todo.priority} />

          {todo.labels.map((label) => (
            <span
              key={label.id}
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
