import { useCallback, useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Settings, Tags, ChevronDown, Pencil, FileText } from 'lucide-react';
import { useBoard, useUpdateBoard } from '../../hooks/useBoards';
import { useCreateTodo, useUpdateTodo, useDeleteTodo, useMoveTodo, useReorderTodos } from '../../hooks/useTodos';
import { useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns } from '../../hooks/useColumns';
import { BoardColumn } from '../column/BoardColumn';
import { TodoCard, TodoEditModal } from '../todo';
import { LabelManager } from '../label';
import { Button, Input, Modal } from '../ui';
import type { Todo, Column, Priority } from '../../types';

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading, error } = useBoard(boardId);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const moveTodo = useMoveTodo();
  const reorderTodos = useReorderTodos();
  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const reorderColumns = useReorderColumns();
  const updateBoard = useUpdateBoard();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Board editing state
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [editedBoardName, setEditedBoardName] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  const boardNameInputRef = useRef<HTMLInputElement>(null);

  // Focus board name input when editing starts
  useEffect(() => {
    if (isEditingBoardName && boardNameInputRef.current) {
      boardNameInputRef.current.focus();
      boardNameInputRef.current.select();
    }
  }, [isEditingBoardName]);

  // Sync edited values when board data changes
  useEffect(() => {
    if (board) {
      setEditedBoardName(board.name);
      setEditedDescription(board.description || '');
    }
  }, [board]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTodo = useCallback(
    (id: string): { todo: Todo; column: Column } | null => {
      if (!board) return null;
      for (const column of board.columns) {
        const todo = (column.todos ?? []).find((t) => t.id === id);
        if (todo) return { todo, column };
      }
      return null;
    },
    [board]
  );

  const findColumn = useCallback(
    (id: string): Column | null => {
      if (!board) return null;
      // Handle both "column-{id}" and raw "{id}" formats
      const columnId = id.startsWith('column-') ? id.replace('column-', '') : id;
      return board.columns.find((c) => c.id === columnId) ?? null;
    },
    [board]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id as string;
    setActiveId(activeIdStr);

    // Check if it's a column drag
    if (activeIdStr.startsWith('column-')) {
      const column = findColumn(activeIdStr);
      if (column) {
        setActiveColumn(column);
        setActiveTodo(null);
      }
    } else {
      // It's a todo drag
      const result = findTodo(activeIdStr);
      if (result) {
        setActiveTodo(result.todo);
        setActiveColumn(null);
      }
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // This is handled in dragEnd for simplicity
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTodo(null);
    setActiveColumn(null);

    if (!over || !board || !boardId) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Handle column reordering
    if (activeIdStr.startsWith('column-') && overIdStr.startsWith('column-')) {
      const activeColumnId = activeIdStr.replace('column-', '');
      const overColumnId = overIdStr.replace('column-', '');

      if (activeColumnId !== overColumnId) {
        const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);
        const activeIndex = sortedColumns.findIndex((c) => c.id === activeColumnId);
        const overIndex = sortedColumns.findIndex((c) => c.id === overColumnId);

        if (activeIndex !== -1 && overIndex !== -1) {
          const newOrder = [...sortedColumns];
          const [moved] = newOrder.splice(activeIndex, 1);
          newOrder.splice(overIndex, 0, moved);
          reorderColumns.mutate({ boardId, columnIds: newOrder.map((c) => c.id) });
        }
      }
      return;
    }

    // Handle todo drag-and-drop (existing logic)
    const activeResult = findTodo(activeIdStr);
    if (!activeResult) return;

    const { todo: activeTodoItem, column: sourceColumn } = activeResult;

    // Find target column
    let targetColumn: Column | undefined;
    let newPosition = 0;

    // Check if dropped on a column directly
    targetColumn = board.columns.find((c) => c.id === overIdStr);

    if (!targetColumn) {
      // Check if dropped on another todo
      const overResult = findTodo(overIdStr);
      if (overResult) {
        targetColumn = overResult.column;
        const overTodo = overResult.todo;
        newPosition = overTodo.position;
      }
    } else {
      // Dropped on empty column
      newPosition = (targetColumn.todos ?? []).length;
    }

    if (!targetColumn) return;

    // Same column reordering
    if (sourceColumn.id === targetColumn.id) {
      const sortedTodos = [...(sourceColumn.todos ?? [])].sort((a, b) => a.position - b.position);
      const oldIndex = sortedTodos.findIndex((t) => t.id === activeTodoItem.id);
      const overTodoResult = findTodo(overIdStr);

      if (overTodoResult && overTodoResult.column.id === sourceColumn.id) {
        const newIndex = sortedTodos.findIndex((t) => t.id === overIdStr);
        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
          const newOrder = [...sortedTodos];
          const [moved] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, moved);
          reorderTodos.mutate({ boardId, todoIds: newOrder.map((t) => t.id) });
        }
      }
    } else {
      // Moving to different column
      moveTodo.mutate({
        id: activeTodoItem.id,
        boardId,
        columnId: targetColumn.id,
        position: newPosition,
      });
    }
  };

  const handleAddTodo = (columnId: string, title: string) => {
    if (!boardId) return;
    createTodo.mutate({
      columnId,
      boardId,
      title,
    });
  };

  const handleUpdateColumn = (id: string, updates: { name?: string; description?: string | null }) => {
    if (!boardId) return;
    updateColumn.mutate({ id, boardId, ...updates });
  };

  const handleDeleteColumn = (id: string) => {
    if (!boardId) return;
    deleteColumn.mutate({ id, boardId });
  };

  const handleAddColumn = () => {
    if (!boardId || !newColumnName.trim()) return;
    createColumn.mutate(
      { boardId, name: newColumnName.trim() },
      {
        onSuccess: () => {
          setNewColumnName('');
          setIsAddingColumn(false);
        },
      }
    );
  };

  const handleColumnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddColumn();
    } else if (e.key === 'Escape') {
      setIsAddingColumn(false);
      setNewColumnName('');
    }
  };

  // Board name inline editing handlers
  const handleBoardNameDoubleClick = () => {
    if (board) {
      setEditedBoardName(board.name);
      setIsEditingBoardName(true);
    }
  };

  const handleBoardNameSave = () => {
    if (!boardId || !editedBoardName.trim()) {
      setIsEditingBoardName(false);
      return;
    }
    if (editedBoardName.trim() !== board?.name) {
      updateBoard.mutate({ id: boardId, name: editedBoardName.trim() });
    }
    setIsEditingBoardName(false);
  };

  const handleBoardNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBoardNameSave();
    } else if (e.key === 'Escape') {
      setEditedBoardName(board?.name || '');
      setIsEditingBoardName(false);
    }
  };

  // Board description modal handlers
  const handleOpenDescriptionModal = () => {
    setEditedDescription(board?.description || '');
    setShowDescriptionModal(true);
  };

  const handleDescriptionSave = () => {
    if (!boardId) return;
    const newDescription = editedDescription.trim();
    if (newDescription !== (board?.description || '')) {
      updateBoard.mutate({ id: boardId, description: newDescription || undefined });
    }
    setShowDescriptionModal(false);
  };

  const handleTodoDoubleClick = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleTodoSave = (updates: {
    title?: string;
    description?: string;
    priority?: Priority;
    dueDate?: string | null;
    labelIds?: string[];
  }) => {
    if (!editingTodo || !boardId) return;
    updateTodo.mutate(
      { id: editingTodo.id, boardId, ...updates },
      {
        onSuccess: () => setEditingTodo(null),
      }
    );
  };

  const handleTodoDelete = () => {
    if (!editingTodo || !boardId) return;
    deleteTodo.mutate(
      { id: editingTodo.id, boardId },
      {
        onSuccess: () => setEditingTodo(null),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" data-testid="board-not-found">
        <p className="text-gray-500">Board not found</p>
        <Link to="/">
          <Button variant="primary">Back to Boards</Button>
        </Link>
      </div>
    );
  }

  const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);
  const columnIds = sortedColumns.map((c) => `column-${c.id}`);

  return (
    <div className="flex flex-col h-full" data-testid="board-view">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              {/* Board name - editable on double-click */}
              {isEditingBoardName ? (
                <input
                  ref={boardNameInputRef}
                  type="text"
                  value={editedBoardName}
                  onChange={(e) => setEditedBoardName(e.target.value)}
                  onBlur={handleBoardNameSave}
                  onKeyDown={handleBoardNameKeyDown}
                  className="text-xl font-bold text-gray-900 bg-white border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
              ) : (
                <h1
                  className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                  onDoubleClick={handleBoardNameDoubleClick}
                  title="Double-click to edit"
                >
                  {board.name}
                </h1>
              )}
              {/* Description indicator */}
              {board.description && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                  title={isDescriptionExpanded ? 'Collapse description' : 'Expand description'}
                >
                  <FileText className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleOpenDescriptionModal}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Description
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowLabelManager(true)}>
              <Tags className="h-4 w-4 mr-2" />
              Labels
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Collapsible description section */}
        {board.description && isDescriptionExpanded && (
          <div className="mt-4 ml-14 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </span>
              <button
                onClick={() => setIsDescriptionExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
              {board.description}
            </div>
          </div>
        )}

        {/* Add description prompt when no description exists */}
        {!board.description && (
          <div className="mt-2 ml-14">
            <button
              onClick={handleOpenDescriptionModal}
              className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add a description to help your team understand this board...
            </button>
          </div>
        )}
      </div>

      <LabelManager isOpen={showLabelManager} onClose={() => setShowLabelManager(false)} />

      {/* Board content */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 h-full">
              {sortedColumns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  onAddTodo={handleAddTodo}
                  onUpdateColumn={handleUpdateColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onTodoDoubleClick={handleTodoDoubleClick}
                  isDragging={activeColumn?.id === column.id}
                />
              ))}

              {/* Add column button */}
              {isAddingColumn ? (
                <div className="flex flex-col gap-2 w-72 min-w-72 h-fit p-3 rounded-lg bg-gray-100">
                  <Input
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={handleColumnKeyDown}
                    placeholder="Enter column name..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleAddColumn}
                      disabled={createColumn.isPending}
                    >
                      {createColumn.isPending ? 'Adding...' : 'Add'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingColumn(false);
                        setNewColumnName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="flex items-center gap-2 w-72 min-w-72 h-fit p-3 rounded-lg bg-gray-200/50 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Add column
                </button>
              )}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId && activeTodo ? (
              <TodoCard todo={activeTodo} isDragging />
            ) : activeId && activeColumn ? (
              <div className="flex flex-col w-72 min-w-72 rounded-lg bg-gray-100 opacity-80 rotate-3 shadow-xl">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-700">{activeColumn.name}</h3>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                      {(activeColumn.todos ?? []).length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-2 min-h-[100px] opacity-50">
                  {/* Placeholder for todos */}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Todo Edit Modal */}
      <TodoEditModal
        todo={editingTodo}
        isOpen={!!editingTodo}
        onClose={() => setEditingTodo(null)}
        onSave={handleTodoSave}
        onDelete={handleTodoDelete}
        isLoading={updateTodo.isPending || deleteTodo.isPending}
      />

      {/* Board Description Modal */}
      <Modal
        isOpen={showDescriptionModal}
        onClose={() => setShowDescriptionModal(false)}
        title="Edit Board Description"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="boardDescription" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Description
              </span>
            </label>
            <textarea
              id="boardDescription"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Add a description for this board... (Markdown supported)"
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supports Markdown: **bold**, *italic*, `code`, - lists, ## headers, etc.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button variant="ghost" onClick={() => setShowDescriptionModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDescriptionSave}
              disabled={updateBoard.isPending}
            >
              {updateBoard.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
