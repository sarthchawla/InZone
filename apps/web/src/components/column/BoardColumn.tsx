import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, ChevronDown, Trash2, Pencil, Gauge } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TodoCard } from '../todo/TodoCard';
import { Button, Input, RichTextEditor } from '../ui';
import type { Column, Todo } from '../../types';

interface BoardColumnProps {
  column: Column;
  onAddTodo: (columnId: string, title: string) => void;
  onUpdateColumn?: (id: string, updates: { name?: string; description?: string | null; wipLimit?: number | null }) => void;
  onDeleteColumn?: (id: string) => void;
  onTodoClick?: (todo: Todo) => void;
  onTodoContextMenu?: (todo: Todo, event: React.MouseEvent) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  activeTodoId?: string | null;
  overTodoId?: string | null;
  isColumnDragActive?: boolean;
}

export function BoardColumn({
  column,
  onAddTodo,
  onUpdateColumn,
  onDeleteColumn,
  onTodoClick,
  onTodoContextMenu,
  isDragging,
  isDropTarget,
  activeTodoId,
  overTodoId,
  isColumnDragActive,
}: BoardColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(column.description || '');
  const [isSettingWipLimit, setIsSettingWipLimit] = useState(false);
  const [wipLimitValue, setWipLimitValue] = useState(column.wipLimit?.toString() || '');

  const menuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
  } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      column,
    },
  });

  const { setNodeRef: setDroppableRef, isOver: isOverRaw } = useDroppable({
    id: column.id,
    disabled: isColumnDragActive,
  });

  // Suppress drop indicators during column drags
  const isOver = isOverRaw && !isColumnDragActive;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || (transform ? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)' : undefined),
  };

  const todos = column.todos ?? [];
  const sortedTodos = [...todos].sort((a, b) => a.position - b.position);
  const todoIds = sortedTodos.map((t) => t.id);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

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

  const handleTitleClick = () => {
    setEditedTitle(column.name);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle.trim() !== column.name) {
      onUpdateColumn?.(column.id, { name: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(column.name);
      setIsEditingTitle(false);
    }
  };

  const handleEditDescriptionClick = () => {
    setShowMenu(false);
    setEditedDescription(column.description || '');
    setIsEditingDescription(true);
  };

  const handleDescriptionSave = () => {
    const newDesc = editedDescription.trim() || null;
    if (newDesc !== (column.description || null)) {
      onUpdateColumn?.(column.id, { description: newDesc });
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionCancel = () => {
    setEditedDescription(column.description || '');
    setIsEditingDescription(false);
  };

  const handleSetWipLimitClick = () => {
    setShowMenu(false);
    setWipLimitValue(column.wipLimit?.toString() || '');
    setIsSettingWipLimit(true);
  };

  const handleWipLimitSave = () => {
    const parsed = parseInt(wipLimitValue, 10);
    const newLimit = isNaN(parsed) || parsed <= 0 ? null : parsed;
    const currentLimit = column.wipLimit ?? null;
    if (newLimit !== currentLimit) {
      onUpdateColumn?.(column.id, { wipLimit: newLimit });
    }
    setIsSettingWipLimit(false);
  };

  const handleDeleteClick = () => {
    setShowMenu(false);
    onDeleteColumn?.(column.id);
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      data-testid="column"
      className={cn(
        'flex flex-col rounded-xl bg-stone-100 transition-all duration-200 column-snap-item',
        'w-full min-w-full md:w-72 md:min-w-72',
        (isOver || isDropTarget) && !isDragging && 'ring-2 ring-accent/40 bg-accent-light/30 shadow-lg',
        isDragging && 'opacity-30 scale-[0.98] border-2 border-dashed border-accent-muted bg-accent-light/20'
      )}
    >
      {/* Column header — entire header is drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col p-3 cursor-grab active:cursor-grabbing"
        data-testid="column-header"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Title — single-click to edit */}
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="uppercase tracking-wide text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-accent flex-1 min-w-0"
              />
            ) : (
              <h3
                className="uppercase tracking-wide text-xs font-semibold text-stone-500 truncate cursor-text hover:text-stone-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTitleClick();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {column.name}
              </h3>
            )}

            {/* Todo count badge */}
            <span
              data-testid="todo-count"
              className={cn(
                'rounded-full px-2 py-0.5 text-xs flex-shrink-0',
                column.wipLimit && todos.length > column.wipLimit
                  ? 'bg-red-50 text-red-700 font-semibold animate-pulse'
                  : column.wipLimit && todos.length === column.wipLimit
                    ? 'bg-amber-50 text-amber-600 font-medium'
                    : 'bg-stone-200 text-stone-500'
              )}
            >
              {todos.length}{column.wipLimit ? `/${column.wipLimit}` : ''}
            </span>

            {/* WIP limit indicator */}
            {column.wipLimit && todos.length > column.wipLimit && (
              <span data-testid="wip-indicator" className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 font-semibold flex-shrink-0 animate-pulse">
                Over limit
              </span>
            )}
            {column.wipLimit && todos.length === column.wipLimit && (
              <span data-testid="wip-indicator" className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600 font-medium flex-shrink-0">
                At limit
              </span>
            )}
          </div>

          {/* Dropdown menu trigger */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-2.5 md:p-1.5 text-stone-400 hover:bg-stone-200 rounded hover:text-stone-600 transition-colors"
              aria-label="Column options"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-stone-200 z-50 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditDescriptionClick();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 w-full px-3 py-2.5 md:py-2 text-sm text-stone-700 hover:bg-stone-100 text-left"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Description
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetWipLimitClick();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 w-full px-3 py-2.5 md:py-2 text-sm text-stone-700 hover:bg-stone-100 text-left"
                >
                  <Gauge className="h-4 w-4" />
                  Set WIP Limit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 w-full px-3 py-2.5 md:py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Column
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description — shown inline below title, truncated to 1 line */}
        {column.description && !isEditingDescription && (
          <p
            className="line-clamp-1 text-xs text-stone-400 mt-1 cursor-pointer hover:text-stone-500"
            onClick={(e) => {
              e.stopPropagation();
              handleEditDescriptionClick();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {column.description}
          </p>
        )}
      </div>

      {/* Inline description editor */}
      {isEditingDescription && (
        <div
          className="px-3 pb-2 space-y-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <RichTextEditor
            content={editedDescription}
            onChange={setEditedDescription}
            placeholder="Add a description for this column..."
          />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleDescriptionSave}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDescriptionCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Inline WIP limit editor */}
      {isSettingWipLimit && (
        <div
          className="px-3 pb-2 space-y-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <label className="block text-xs font-medium text-stone-500">
            WIP Limit (0 = no limit)
          </label>
          <Input
            type="number"
            min={0}
            value={wipLimitValue}
            onChange={(e) => setWipLimitValue(e.target.value)}
            placeholder="e.g. 5"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleWipLimitSave}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsSettingWipLimit(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Column content */}
      <div
        ref={setDroppableRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] transition-all duration-200 rounded-md',
          (isOver || isDropTarget) && !isDragging && 'bg-accent-light/30'
        )}
      >
        <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {sortedTodos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              >
                <TodoCard todo={todo} onClick={onTodoClick} onContextMenu={onTodoContextMenu} isDropTarget={overTodoId === todo.id} sortDisabled={isColumnDragActive} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Drop placeholder for empty columns when dragging over */}
        {(isOver || isDropTarget) && !isDragging && sortedTodos.filter(t => t.id !== activeTodoId).length === 0 && (
          <div className="border-2 border-dashed border-accent-muted rounded-lg p-6 text-center text-sm text-accent bg-accent-light/30 transition-all duration-200">
            <div className="flex flex-col items-center gap-1.5">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Drop here</span>
            </div>
          </div>
        )}

        {/* Empty column state (when not dragging) */}
        {sortedTodos.length === 0 && !activeTodoId && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="text-stone-300 mb-2">
              <Plus className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-xs text-stone-400">No cards yet</p>
          </div>
        )}
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
            className="flex items-center gap-1 w-full p-2.5 md:p-2 text-sm text-stone-500 hover:bg-stone-200 rounded-lg transition-colors"
            title="Add a new card"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}
