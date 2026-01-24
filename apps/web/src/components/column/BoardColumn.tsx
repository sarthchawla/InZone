import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TodoCard } from '../todo/TodoCard';
import { Button, Input } from '../ui';
import type { Column } from '../../types';

interface BoardColumnProps {
  column: Column;
  onAddTodo: (columnId: string, title: string) => void;
}

export function BoardColumn({ column, onAddTodo }: BoardColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const sortedTodos = [...column.todos].sort((a, b) => a.position - b.position);
  const todoIds = sortedTodos.map((t) => t.id);

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      onAddTodo(column.id, newTodoTitle.trim());
      setNewTodoTitle('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTodoTitle('');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col w-72 min-w-72 rounded-lg bg-gray-100',
        isOver && 'ring-2 ring-blue-400'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-700">{column.name}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
            {column.todos.length}
          </span>
          {column.wipLimit && column.todos.length >= column.wipLimit && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
              WIP
            </span>
          )}
        </div>
        <button className="p-1 text-gray-400 hover:bg-gray-200 rounded hover:text-gray-600">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Column content */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]"
      >
        <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
          {sortedTodos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} />
          ))}
        </SortableContext>
      </div>

      {/* Add todo */}
      <div className="p-2">
        {isAdding ? (
          <div className="space-y-2">
            <Input
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter todo title..."
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={handleAddTodo}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewTodoTitle('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 w-full p-2 text-sm text-gray-500 hover:bg-gray-200 rounded transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}
