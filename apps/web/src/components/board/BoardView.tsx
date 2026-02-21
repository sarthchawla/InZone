import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Tags, Columns } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useDebouncedMutation } from '../../hooks/useDebouncedMutation';
import { useBoard, useUpdateBoard } from '../../hooks/useBoards';
import { useCreateTodo, useUpdateTodo, useDeleteTodo, useMoveTodo, useReorderTodos } from '../../hooks/useTodos';
import { useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns } from '../../hooks/useColumns';
import { useKeyboardShortcuts, BOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { useBoardDnD } from '../../hooks/useBoardDnD';
import { useBoardActions } from '../../hooks/useBoardActions';
import { BoardColumn } from '../column/BoardColumn';
import { TodoCard } from '../todo';
import { LabelManager } from '../label';
import {
  Button,
  Input,
  RichTextEditor,
  ColumnSkeleton,
  KeyboardShortcutsHelp,
  ContextMenu,
  UndoToast,
  SyncStatusIndicator,
} from '../ui';
import { DetailPanel } from './DetailPanel';
import type { Todo } from '../../types';

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
  const { state: syncState, pendingCount } = useSyncStatus();

  const debouncedReorderTodos = useDebouncedMutation({
    mutate: reorderTodos.mutate,
    getKey: (args: { boardId: string; columnId: string; todoIds: string[] }) => args.columnId,
  });

  const debouncedReorderColumns = useDebouncedMutation({
    mutate: reorderColumns.mutate,
    getKey: (args: { boardId: string; columnIds: string[] }) => args.boardId,
  });

  // Flush pending debounced mutations before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      debouncedReorderTodos.flush();
      debouncedReorderColumns.flush();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [debouncedReorderTodos, debouncedReorderColumns]);

  const {
    activeId,
    activeTodo,
    activeColumn,
    overColumnId,
    overTodoId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useBoardDnD({
    board,
    boardId,
    reorderColumns: { mutate: debouncedReorderColumns.mutate },
    moveTodo,
    reorderTodos: { mutate: debouncedReorderTodos.mutate },
  });

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

  const { handleTodoDeleteWithUndo, getContextMenuItems } = useBoardActions({
    boardId,
    columns: board?.columns,
    selectedTodo,
    setSelectedTodo,
    setContextMenuPosition,
    setContextMenuTodo,
    setUndoState,
    deleteTodo,
    createTodo,
    updateTodo,
    moveTodo,
  });

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

  // Track active column index on mobile for dot indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isMobile) return;

    const handleScroll = () => {
      if (container.clientWidth > 0) {
        const index = Math.round(container.scrollLeft / container.clientWidth);
        setActiveColumnIndex(index);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

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

  const handleAddTodo = (columnId: string, title: string) => {
    if (!boardId) return;
    createTodo.mutate({ columnId, boardId, title });
  };

  const handleUpdateColumn = (id: string, updates: { name?: string; description?: string | null; wipLimit?: number | null }) => {
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

  // Todo click -> open detail panel
  const handleTodoClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setLastClickedTodo(todo);
  };

  // Context menu on right-click or button
  const handleTodoContextMenu = (todo: Todo, event: React.MouseEvent) => {
    setContextMenuTodo(todo);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
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
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Link
              to="/"
              data-testid="back-to-boards"
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg flex-shrink-0 transition-colors"
              title="Back to boards"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
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
              {/* Inline description — click to edit, auto-save on blur */}
              {isEditingDescription ? (
                <div
                  className="max-w-xl"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      handleDescriptionBlur();
                    }
                  }}
                >
                  <RichTextEditor
                    content={editedDescription}
                    onChange={setEditedDescription}
                    placeholder="Add a description..."
                    compact
                  />
                </div>
              ) : (
                <p
                  className="text-xs text-stone-400 truncate cursor-pointer hover:text-stone-600 transition-colors max-w-xl"
                  onClick={() => {
                    setEditedDescription(board.description || '');
                    setIsEditingDescription(true);
                  }}
                  title={board.description || 'Click to add description'}
                >
                  {board.description || 'Add a description...'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <SyncStatusIndicator state={syncState} pendingCount={pendingCount} />
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
      </div>

      <LabelManager isOpen={showLabelManager} onClose={() => setShowLabelManager(false)} />

      {/* Board content + Detail panel row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Board content — shrinks when detail panel is open */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6 min-w-0',
          isMobile && 'column-scroll-container'
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
                      isColumnDragActive={activeColumn !== null}
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

      {/* Detail Panel — inline side panel (Jira-like) */}
      <AnimatePresence>
        {selectedTodo && boardId && (
          <DetailPanel
            todo={selectedTodo}
            boardId={boardId}
            columns={board.columns}
            onClose={() => setSelectedTodo(null)}
          />
        )}
      </AnimatePresence>
      </div>{/* End board content + detail panel row */}

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
