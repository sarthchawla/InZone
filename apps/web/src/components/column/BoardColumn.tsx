import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, GripVertical, Pencil, Trash2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TodoCard } from '../todo/TodoCard';
import { Button, Input, Modal } from '../ui';
import type { Column } from '../../types';

interface BoardColumnProps {
  column: Column;
  onAddTodo: (columnId: string, title: string) => void;
  onUpdateColumn?: (id: string, updates: { name?: string; description?: string | null }) => void;
  onDeleteColumn?: (id: string) => void;
  isDragging?: boolean;
}

export function BoardColumn({
  column,
  onAddTodo,
  onUpdateColumn,
  onDeleteColumn,
  isDragging
}: BoardColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.name);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedDescription, setEditedDescription] = useState(column.description || '');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  const handleTitleDoubleClick = () => {
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

  const handleEditClick = () => {
    setShowMenu(false);
    setEditedDescription(column.description || '');
    setShowEditModal(true);
  };

  const handleDeleteClick = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleEditSave = () => {
    const updates: { name?: string; description?: string | null } = {};
    if (editedDescription !== (column.description || '')) {
      updates.description = editedDescription.trim() || null;
    }
    if (Object.keys(updates).length > 0) {
      onUpdateColumn?.(column.id, updates);
    }
    setShowEditModal(false);
  };

  const handleDeleteConfirm = () => {
    onDeleteColumn?.(column.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        ref={setSortableRef}
        style={style}
        className={cn(
          'flex flex-col w-72 min-w-72 rounded-lg bg-gray-100',
          isOver && 'ring-2 ring-blue-400',
          isDragging && 'opacity-50 rotate-3 shadow-xl'
        )}
      >
        {/* Column header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing"
              aria-label="Drag to reorder column"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Title - editable on double-click */}
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="font-semibold text-gray-700 bg-white border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
              />
            ) : (
              <h3
                className="font-semibold text-gray-700 truncate cursor-pointer hover:text-gray-900"
                onDoubleClick={handleTitleDoubleClick}
                title="Double-click to edit"
              >
                {column.name}
              </h3>
            )}

            {/* Todo count badge */}
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 flex-shrink-0">
              {todos.length}
            </span>

            {/* WIP limit indicator */}
            {column.wipLimit && todos.length >= column.wipLimit && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600 flex-shrink-0">
                WIP
              </span>
            )}

            {/* Info icon for description */}
            {column.description && (
              <div className="relative flex-shrink-0">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="p-0.5 text-blue-500 hover:text-blue-700 rounded"
                  aria-label="View description"
                >
                  <Info className="h-4 w-4" />
                </button>
                {showTooltip && (
                  <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-sm rounded shadow-lg">
                    <div className="whitespace-pre-wrap">{column.description}</div>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Three dots menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:bg-gray-200 rounded hover:text-gray-600"
              aria-label="Column options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Column content */}
        <div
          ref={setDroppableRef}
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

      {/* Edit Column Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Column"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="columnDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="columnDescription"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Add a description for this column..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Column"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete "{column.name}"?
            {todos.length > 0 && (
              <span className="text-red-600 font-medium">
                {' '}This will also delete {todos.length} task{todos.length === 1 ? '' : 's'}.
              </span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
