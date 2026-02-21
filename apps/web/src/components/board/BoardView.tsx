import { useCallback, useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Tags, Columns } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBoard, useUpdateBoard } from '../../hooks/useBoards';
import { useCreateTodo, useUpdateTodo, useDeleteTodo, useMoveTodo, useReorderTodos } from '../../hooks/useTodos';
import { useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns } from '../../hooks/useColumns';
import { useKeyboardShortcuts, BOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { BoardColumn } from '../column/BoardColumn';
import { TodoCard } from '../todo';
import { LabelManager } from '../label';
import {
  Button,
  Input,
  RichTextEditor,
  ColumnSkeleton,
  KeyboardShortcutsHelp,
  DetailPanel,
  ContextMenu,
  UndoToast,
} from '../ui';
import type { ContextMenuItem } from '../ui';
import type { Todo, Column, Priority } from '../../types';

interface UndoState {
  message: string;
  onUndo: () => void;
}

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading, error } = useBoard(boardId);
  const isMobile = useIsMobile();
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
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [overTodoId, setOverTodoId] = useState<string | null>(null);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Detail panel state (replaces TodoEditModal)
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTodo, setContextMenuTodo] = useState<Todo | null>(null);

  // Undo toast state
  const [undoState, setUndoState] = useState<UndoState | null>(null);

  // Keyboard shortcuts state
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [lastClickedTodo, setLastClickedTodo] = useState<Todo | null>(null);

  // Board editing state
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [editedBoardName, setEditedBoardName] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  const boardNameInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);

  // Mobile column pagination
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);

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

  // Check for horizontal overflow and scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const hasHorizontalOverflow = container.scrollWidth > container.clientWidth;
      setHasOverflow(hasHorizontalOverflow);
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      setScrolledEnd(atEnd);
    };

    const handleScroll = () => {
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      setScrolledEnd(atEnd);

      // Track active column index on mobile
      if (isMobile && container.clientWidth > 0) {
        const index = Math.round(container.scrollLeft / container.clientWidth);
        setActiveColumnIndex(index);
      }
    };

    checkOverflow();
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkOverflow);

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkOverflow);
      observer.disconnect();
    };
  }, [board?.columns.length, isMobile]);

  // Wire up keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '?',
      description: BOARD_SHORTCUTS[0].description,
      handler: () => setShowShortcutsHelp(true),
    },
    {
      key: 'n',
      description: BOARD_SHORTCUTS[1].description,
      handler: () => {
        const addCardButtons = document.querySelectorAll('[data-testid="columns-container"] button');
        for (const btn of addCardButtons) {
          if (btn.textContent?.includes('Add a card')) {
            (btn as HTMLButtonElement).click();
            return;
          }
        }
      },
    },
    {
      key: 'e',
      description: BOARD_SHORTCUTS[2].description,
      handler: () => {
        if (lastClickedTodo && !selectedTodo) {
          setSelectedTodo(lastClickedTodo);
        }
      },
    },
    {
      key: 'Delete',
      description: BOARD_SHORTCUTS[3].description,
      handler: () => {
        if (selectedTodo) {
          handleTodoDeleteWithUndo(selectedTodo);
        }
      },
    },
    {
      key: 'Backspace',
      description: BOARD_SHORTCUTS[3].description,
      handler: () => {
        if (selectedTodo) {
          handleTodoDeleteWithUndo(selectedTodo);
        }
      },
    },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
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
      const columnId = id.startsWith('column-') ? id.replace('column-', '') : id;
      return board.columns.find((c) => c.id === columnId) ?? null;
    },
    [board]
  );

  // DnD handlers
  /* istanbul ignore next */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id as string;
    setActiveId(activeIdStr);

    if (activeIdStr.startsWith('column-')) {
      const column = findColumn(activeIdStr);
      if (column) {
        setActiveColumn(column);
        setActiveTodo(null);
      }
    } else {
      const result = findTodo(activeIdStr);
      if (result) {
        setActiveTodo(result.todo);
        setActiveColumn(null);
      }
    }
  };

  /* istanbul ignore next */
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over || !board) {
      setOverColumnId(null);
      setOverTodoId(null);
      return;
    }

    const overIdStr = over.id as string;

    // When dragging a column, only track column-level targets
    if (activeColumn) {
      if (overIdStr.startsWith('column-')) {
        setOverColumnId(overIdStr.replace('column-', ''));
      }
      setOverTodoId(null);
      return;
    }

    // Determine which column is being hovered (todo drag)
    if (overIdStr.startsWith('column-')) {
      setOverColumnId(overIdStr.replace('column-', ''));
      setOverTodoId(null);
    } else {
      const overResult = findTodo(overIdStr);
      if (overResult) {
        setOverColumnId(overResult.column.id);
        if (activeTodo) {
          setOverTodoId(overIdStr);
        } else {
          setOverTodoId(null);
        }
      } else {
        const col = board.columns.find((c) => c.id === overIdStr);
        if (col) {
          setOverColumnId(col.id);
        }
        setOverTodoId(null);
      }
    }
  };

  /* istanbul ignore next */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTodo(null);
    setActiveColumn(null);
    setOverColumnId(null);
    setOverTodoId(null);

    if (!over || !board || !boardId) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Handle column reordering
    if (activeIdStr.startsWith('column-')) {
      let targetColumnId: string | null = null;
      if (overIdStr.startsWith('column-')) {
        targetColumnId = overIdStr.replace('column-', '');
      } else {
        const overResult = findTodo(overIdStr);
        if (overResult) {
          targetColumnId = overResult.column.id;
        }
      }

      if (!targetColumnId) return;

      const activeColumnId = activeIdStr.replace('column-', '');
      if (activeColumnId !== targetColumnId) {
        const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);
        const activeIndex = sortedColumns.findIndex((c) => c.id === activeColumnId);
        const overIndex = sortedColumns.findIndex((c) => c.id === targetColumnId);

        if (activeIndex !== -1 && overIndex !== -1) {
          const newOrder = [...sortedColumns];
          const [moved] = newOrder.splice(activeIndex, 1);
          newOrder.splice(overIndex, 0, moved);
          reorderColumns.mutate({ boardId, columnIds: newOrder.map((c) => c.id) });
        }
      }
      return;
    }

    // Handle todo drag-and-drop
    const activeResult = findTodo(activeIdStr);
    if (!activeResult) return;

    const { todo: activeTodoItem, column: sourceColumn } = activeResult;

    let targetColumn: Column | undefined;
    let newPosition = 0;

    targetColumn = board.columns.find((c) => c.id === overIdStr);

    if (!targetColumn) {
      const overResult = findTodo(overIdStr);
      if (overResult) {
        targetColumn = overResult.column;
        const overTodo = overResult.todo;
        newPosition = overTodo.position;
      }
    } else {
      newPosition = (targetColumn.todos ?? []).length;
    }

    if (!targetColumn) return;

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
          reorderTodos.mutate({ boardId, columnId: sourceColumn.id, todoIds: newOrder.map((t) => t.id) });
        }
      }
    } else {
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
    createTodo.mutate({ columnId, boardId, title });
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

  // Board name inline editing
  const handleBoardNameClick = () => {
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

  // Inline board description editing (auto-save on blur)
  const handleDescriptionBlur = () => {
    if (!boardId) return;
    const newDescription = editedDescription.trim();
    if (newDescription !== (board?.description || '')) {
      updateBoard.mutate({ id: boardId, description: newDescription || undefined });
    }
    setIsEditingDescription(false);
  };

  // Todo click → open detail panel
  const handleTodoClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setLastClickedTodo(todo);
  };

  // Context menu on right-click or ⋯ button
  const handleTodoContextMenu = (todo: Todo, event: React.MouseEvent) => {
    setContextMenuTodo(todo);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };

  // Delete with undo toast
  const handleTodoDeleteWithUndo = (todo: Todo) => {
    if (!boardId) return;
    // Close detail panel if this todo is open
    if (selectedTodo?.id === todo.id) {
      setSelectedTodo(null);
    }
    // Close context menu
    setContextMenuPosition(null);
    setContextMenuTodo(null);

    deleteTodo.mutate({ id: todo.id, boardId });
    setUndoState({
      message: `"${todo.title}" deleted`,
      onUndo: () => {
        // Re-create the todo (best-effort undo)
        createTodo.mutate({
          columnId: todo.columnId,
          boardId,
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          dueDate: todo.dueDate,
          labelIds: todo.labels.map((l) => l.id),
        });
      },
    });
  };

  // Build context menu items for a todo
  const getContextMenuItems = (todo: Todo): ContextMenuItem[] => {
    const priorityItems: ContextMenuItem[] = (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => ({
      label: p.charAt(0) + p.slice(1).toLowerCase(),
      onClick: () => {
        if (!boardId) return;
        updateTodo.mutate({ id: todo.id, boardId, priority: p });
      },
    }));

    const moveToItems: ContextMenuItem[] = (board?.columns ?? [])
      .filter((c) => c.id !== todo.columnId)
      .map((c) => ({
        label: c.name,
        onClick: () => {
          if (!boardId) return;
          moveTodo.mutate({ id: todo.id, boardId, columnId: c.id, position: 0 });
        },
      }));

    return [
      {
        label: 'Edit',
        onClick: () => setSelectedTodo(todo),
      },
      { label: '---' },
      {
        label: 'Priority',
        submenu: priorityItems,
      },
      ...(moveToItems.length > 0
        ? [{ label: 'Move to', submenu: moveToItems }]
        : []),
      { label: '---' },
      {
        label: 'Delete',
        danger: true,
        onClick: () => handleTodoDeleteWithUndo(todo),
      },
    ];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full" data-testid="board-view-loading">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="h-5 w-5 bg-stone-200 rounded animate-pulse" />
            <div className="h-7 w-48 bg-stone-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 overflow-x-auto p-4 md:p-6">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <ColumnSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" data-testid="board-not-found">
        <p className="text-stone-500">Board not found</p>
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
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              to="/"
              data-testid="back-to-boards"
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg flex-shrink-0 transition-colors"
              title="Back to boards"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              {isEditingBoardName ? (
                <input
                  ref={boardNameInputRef}
                  type="text"
                  value={editedBoardName}
                  onChange={(e) => setEditedBoardName(e.target.value)}
                  onBlur={handleBoardNameSave}
                  onKeyDown={handleBoardNameKeyDown}
                  className="text-lg sm:text-xl font-bold text-stone-900 bg-white border border-accent rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-accent/30 min-w-[120px] sm:min-w-[200px] max-w-full"
                />
              ) : (
                <h1
                  className="text-lg sm:text-xl font-bold text-stone-900 cursor-pointer hover:text-accent truncate transition-colors"
                  onClick={handleBoardNameClick}
                  title="Click to edit"
                >
                  {board.name}
                </h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLabelManager(true)}
              aria-label="Labels"
              title="Manage labels"
            >
              <Tags className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Labels</span>
            </Button>
          </div>
        </div>

        {/* Inline description editing */}
        {isEditingDescription ? (
          <div className="mt-3 ml-0 sm:ml-11">
            <RichTextEditor
              content={editedDescription}
              onChange={setEditedDescription}
              placeholder="Add a description for this board..."
              className="min-h-[80px]"
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="primary" onClick={handleDescriptionBlur}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditedDescription(board.description || '');
                  setIsEditingDescription(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : board.description ? (
          <div
            className="mt-2 ml-0 sm:ml-11 text-sm text-stone-500 line-clamp-2 cursor-pointer hover:text-stone-700 transition-colors"
            onClick={() => {
              setEditedDescription(board.description || '');
              setIsEditingDescription(true);
            }}
          >
            <RichTextEditor
              content={board.description}
              onChange={() => {}}
              editable={false}
              className="border-0 bg-transparent pointer-events-none"
            />
          </div>
        ) : (
          <div className="mt-2 ml-0 sm:ml-11">
            <button
              onClick={() => {
                setEditedDescription('');
                setIsEditingDescription(true);
              }}
              className="text-sm text-stone-400 hover:text-accent flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add a description...
            </button>
          </div>
        )}
      </div>

      <LabelManager isOpen={showLabelManager} onClose={() => setShowLabelManager(false)} />

      {/* Board content */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex-1 overflow-x-auto p-4 md:p-6 scroll-shadow-container',
          isMobile && 'column-scroll-container',
          hasOverflow && 'has-overflow',
          scrolledEnd && 'scrolled-end'
        )}
        data-testid="columns-container"
      >
        {/* Empty board onboarding */}
        {sortedColumns.length === 0 && !isAddingColumn ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <Columns className="h-16 w-16 text-stone-300 mb-4" />
            <h3 className="text-xl font-medium text-stone-900 mb-2">Get started with your board</h3>
            <p className="text-stone-500 mb-6 max-w-md">
              Create your first column to begin organizing your tasks.
            </p>
            <Button variant="primary" onClick={() => setIsAddingColumn(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first column
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            measuring={{
              droppable: {
                strategy: MeasuringStrategy.Always,
              },
            }}
          >
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              <div className={cn(
                'flex gap-4 h-full',
                isMobile && 'snap-x snap-mandatory'
              )}>
                {sortedColumns.map((column, index) => (
                  <motion.div
                    key={column.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    className={cn(isMobile && 'snap-center flex-shrink-0 w-full')}
                  >
                    <BoardColumn
                      column={column}
                      onAddTodo={handleAddTodo}
                      onUpdateColumn={handleUpdateColumn}
                      onDeleteColumn={handleDeleteColumn}
                      onTodoClick={handleTodoClick}
                      onTodoContextMenu={handleTodoContextMenu}
                      isDragging={activeColumn?.id === column.id}
                      isDropTarget={overColumnId === column.id && activeTodo !== null}
                      activeTodoId={activeTodo?.id ?? null}
                      overTodoId={overColumnId === column.id ? overTodoId : null}
                    />
                  </motion.div>
                ))}

                {/* Add column button */}
                <div className={cn(isMobile && 'snap-center flex-shrink-0 w-full')}>
                  {isAddingColumn ? (
                    <div className="flex flex-col gap-2 w-full md:w-72 md:min-w-72 h-fit p-3 rounded-xl bg-stone-100">
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
                      className="flex items-center gap-2 w-full md:w-72 md:min-w-72 h-fit p-3 rounded-xl bg-stone-200/50 hover:bg-stone-200 text-stone-500 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      Add column
                    </button>
                  )}
                </div>
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
              duration: 250,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
              sideEffects({ active }) {
                active.node.style.opacity = '0';
                return () => {
                  active.node.style.opacity = '';
                };
              },
            }}>
              {activeId && activeTodo ? (
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: 1.04, rotate: 2, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <TodoCard todo={activeTodo} isOverlay />
                </motion.div>
              ) : activeId && activeColumn ? (
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: 1.02, rotate: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col w-72 min-w-72 rounded-xl bg-white/95 backdrop-blur-sm shadow-2xl ring-2 ring-accent/30 cursor-grabbing"
                >
                  <div className="flex items-center justify-between p-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-stone-700 uppercase tracking-wide text-xs">{activeColumn.name}</h3>
                      <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs text-accent font-medium">
                        {(activeColumn.todos ?? []).length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-2 min-h-[60px] space-y-1.5 bg-stone-50/50 rounded-b-xl">
                    {(activeColumn.todos ?? []).slice(0, 3).map((todo) => (
                      <div key={todo.id} className="rounded-lg bg-white border border-stone-200 p-2 text-xs text-stone-600 truncate shadow-sm">
                        {todo.title}
                      </div>
                    ))}
                    {(activeColumn.todos ?? []).length > 3 && (
                      <div className="text-xs text-stone-400 text-center py-1">
                        +{(activeColumn.todos ?? []).length - 3} more
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Mobile dot indicators */}
      {isMobile && sortedColumns.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2 bg-white border-t border-stone-100 safe-bottom">
          {sortedColumns.map((col, i) => (
            <button
              key={col.id}
              onClick={() => {
                scrollContainerRef.current?.scrollTo({
                  left: i * (scrollContainerRef.current?.clientWidth ?? 0),
                  behavior: 'smooth',
                });
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-200',
                i === activeColumnIndex
                  ? 'w-6 bg-accent'
                  : 'w-2 bg-stone-300 hover:bg-stone-400'
              )}
              aria-label={`Go to ${col.name}`}
            />
          ))}
        </div>
      )}

      {/* Detail Panel (replaces TodoEditModal) */}
      {selectedTodo && boardId && (
        <DetailPanel
          todo={selectedTodo}
          boardId={boardId}
          columns={board.columns}
          onClose={() => setSelectedTodo(null)}
        />
      )}

      {/* Context Menu */}
      {contextMenuTodo && (
        <ContextMenu
          items={getContextMenuItems(contextMenuTodo)}
          position={contextMenuPosition}
          onClose={() => {
            setContextMenuPosition(null);
            setContextMenuTodo(null);
          }}
        />
      )}

      {/* Undo Toast */}
      <AnimatePresence>
        {undoState && (
          <UndoToast
            message={undoState.message}
            onUndo={() => {
              undoState.onUndo();
              setUndoState(null);
            }}
            onExpire={() => setUndoState(null)}
            onDismiss={() => setUndoState(null)}
          />
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={[...BOARD_SHORTCUTS]}
      />

      {/* Label Manager */}
    </div>
  );
}
