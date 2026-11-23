import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useBoard, useUpdateBoard, boardKeys } from '../../hooks/useBoards';
import { useCreateTodo, useUpdateTodo, useDeleteTodo, useMoveTodo, useReorderTodos } from '../../hooks/useTodos';
import { useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns } from '../../hooks/useColumns';
import { useKeyboardShortcuts, BOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { useBoardDnD } from '../../hooks/useBoardDnD';
import { useBoardActions } from '../../hooks/useBoardActions';
import { useUnsavedBoardNavigation } from '../../hooks/useUnsavedBoardNavigation';
import { LabelManager } from '../label';
import {
  KeyboardShortcutsHelp,
  ContextMenu,
  UndoToast,
} from '../ui';
import { BoardHeader } from './BoardHeader';
import { BoardLoadingState, BoardNotFoundState } from './BoardStates';
import { BoardWorkspace } from './BoardWorkspace';
import { saveBoardDraft } from '../../lib/board-save-draft';
import { UnsavedNavigationDialog } from './UnsavedNavigationDialog';
import {
  findTodoInBoard,
  hasDraftBoardChanges,
  sortedColumnsForBoard,
} from '../../lib/board-draft-utils';
import type { Board, Column, Priority, Todo } from '../../types';

interface UndoState {
  message: string;
  onUndo: () => void;
}
const UNSAVED_CHANGES_MESSAGE = 'You have unsaved board changes. Save or discard them before leaving this board.';
export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading, error } = useBoard(boardId);
  const queryClient = useQueryClient();
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
  const [draftBoard, setDraftBoard] = useState<Board | undefined>();
  const [dirtyColumnIds, setDirtyColumnIds] = useState<Set<string>>(() => new Set());
  const [dirtyTodoIds, setDirtyTodoIds] = useState<Set<string>>(() => new Set());
  const [isSavingBoardDraft, setIsSavingBoardDraft] = useState(false);
  const [isSavingNewColumn, setIsSavingNewColumn] = useState(false);
  const [addingTodoColumnIds, setAddingTodoColumnIds] = useState<Set<string>>(() => new Set());
  const [deletingColumnIds, setDeletingColumnIds] = useState<Set<string>>(() => new Set());
  const [deletingTodoIds, setDeletingTodoIds] = useState<Set<string>>(() => new Set());
  const [boardSaveError, setBoardSaveError] = useState<string | null>(null);
  const hasUnsavedBoardChanges = useMemo(
    () => hasDraftBoardChanges(board, draftBoard, dirtyColumnIds, dirtyTodoIds),
    [board, dirtyColumnIds, dirtyTodoIds, draftBoard]
  );
  const isSavingImmediateAction =
    isSavingNewColumn || addingTodoColumnIds.size > 0 || deletingColumnIds.size > 0 || deletingTodoIds.size > 0;
  const hasBoardChanges = !isSavingImmediateAction && hasUnsavedBoardChanges;
  const isDraftInteractionDisabled = isSavingBoardDraft || isSavingImmediateAction;
  const isImmediateActionDisabled = isDraftInteractionDisabled || hasUnsavedBoardChanges;
  const { leaveWithoutSaving, pendingNavigationPath, stayOnBoard } = useUnsavedBoardNavigation({
    message: UNSAVED_CHANGES_MESSAGE,
    shouldWarn: hasBoardChanges && !isSavingBoardDraft,
  });
  useEffect(() => {
    if (board && !hasBoardChanges && !isSavingBoardDraft) {
      setDraftBoard(board);
    }
  }, [board, hasBoardChanges, isSavingBoardDraft]);

  const stageColumnReorder = useCallback((args: { boardId: string; columnIds: string[] }) => {
    setBoardSaveError(null);
    setDraftBoard((current) => {
      if (!current) return current;
      const columnMap = new Map(current.columns.map((column) => [column.id, column]));
      const reordered = args.columnIds
        .map((id, index) => {
          const column = columnMap.get(id);
          return column ? { ...column, position: index } : null;
        })
        .filter(Boolean) as Column[];
      return { ...current, columns: reordered };
    });
  }, []);

  const stageTodoReorder = useCallback((args: { boardId: string; columnId: string; todoIds: string[] }) => {
    setBoardSaveError(null);
    setDraftBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        columns: current.columns.map((column) => {
          if (column.id !== args.columnId) return column;
          const todoMap = new Map((column.todos ?? []).map((todo) => [todo.id, todo]));
          const reordered = args.todoIds
            .map((id, index) => {
              const todo = todoMap.get(id);
              return todo ? { ...todo, position: index } : null;
            })
            .filter(Boolean) as Todo[];
          return { ...column, todos: reordered };
        }),
      };
    });
  }, []);

  const stageTodoMove = useCallback((args: { id: string; boardId: string; columnId: string; position: number }) => {
    setBoardSaveError(null);
    setDraftBoard((current) => {
      if (!current) return current;

      let movedTodo: Todo | undefined;
      const columnsWithoutTodo = current.columns.map((column) => {
        const match = (column.todos ?? []).find((todo) => todo.id === args.id);
        if (match) movedTodo = { ...match, columnId: args.columnId, position: args.position };
        return { ...column, todos: (column.todos ?? []).filter((todo) => todo.id !== args.id) };
      });

      if (!movedTodo) return current;

      return {
        ...current,
        columns: columnsWithoutTodo.map((column) => {
          if (column.id !== args.columnId) return column;
          const todos = [...(column.todos ?? [])];
          todos.splice(args.position, 0, movedTodo!);
          return { ...column, todos: todos.map((todo, index) => ({ ...todo, position: index })) };
        }),
      };
    });
  }, []);

  const stageTodoPriority = useCallback((args: { id: string; boardId: string; priority: Priority }) => {
    setBoardSaveError(null);
    setDirtyTodoIds((current) => new Set(current).add(args.id));
    setDraftBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        columns: current.columns.map((column) => ({
          ...column,
          todos: (column.todos ?? []).map((todo) => (
            todo.id === args.id ? { ...todo, priority: args.priority } : todo
          )),
        })),
      };
    });
  }, []);

  const boardDnD = useBoardDnD({
    board: draftBoard,
    boardId,
    reorderColumns: { mutate: stageColumnReorder },
    moveTodo: { mutate: stageTodoMove },
    reorderTodos: { mutate: stageTodoReorder },
    disabled: isDraftInteractionDisabled,
  });
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const selectedTodo = useMemo(() => findTodoInBoard(draftBoard, selectedTodoId), [draftBoard, selectedTodoId]);
  const setSelectedTodo = useCallback((todo: Todo | null) => {
    setSelectedTodoId(todo?.id ?? null);
  }, []);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTodo, setContextMenuTodo] = useState<Todo | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [lastClickedTodo, setLastClickedTodo] = useState<Todo | null>(null);
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [editedBoardName, setEditedBoardName] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const boardNameInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const revealColumn = useCallback((columnId: string, nextBoard: Board) => {
    const columnIndex = sortedColumnsForBoard(nextBoard).findIndex((column) => column.id === columnId);
    if (columnIndex === -1) return;
    setActiveColumnIndex(columnIndex);
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (isMobile) {
        container.scrollTo({
          left: columnIndex * container.clientWidth,
          behavior: 'smooth',
        });
        return;
      }
      const columnElement = container.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`);
      if (typeof columnElement?.scrollIntoView === 'function') {
        columnElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    });
  }, [isMobile]);

  const refetchLatestBoard = useCallback(async () => {
    if (!boardId) return undefined;

    await Promise.all([
      queryClient.refetchQueries({ queryKey: boardKeys.detail(boardId), type: 'active' }),
      queryClient.refetchQueries({ queryKey: boardKeys.all, type: 'active' }),
    ]);

    const latestBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));
    if (latestBoard) {
      setDirtyColumnIds(new Set());
      setDirtyTodoIds(new Set());
      setDraftBoard(latestBoard);
    }
    return latestBoard;
  }, [boardId, queryClient]);

  const handleDeleteTodoFromMenu = useCallback(async (args: { id: string; boardId: string }) => {
    if (isImmediateActionDisabled) return;

    setBoardSaveError(null);
    setDeletingTodoIds((current) => new Set(current).add(args.id));
    try {
      await deleteTodo.mutateAsync(args);
      await refetchLatestBoard();
    } catch {
      setBoardSaveError('Unable to delete task. Please try again.');
      throw new Error('Unable to delete task');
    } finally {
      setDeletingTodoIds((current) => {
        const next = new Set(current);
        next.delete(args.id);
        return next;
      });
    }
  }, [deleteTodo, isImmediateActionDisabled, refetchLatestBoard]);

  const handleRestoreTodoFromUndo = useCallback(async (args: {
    columnId: string;
    boardId: string;
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: string;
    labelIds?: string[];
  }) => {
    if (isImmediateActionDisabled) return;

    setBoardSaveError(null);
    setAddingTodoColumnIds((current) => new Set(current).add(args.columnId));
    try {
      await createTodo.mutateAsync(args);
      await refetchLatestBoard();
    } catch {
      setBoardSaveError('Unable to restore task. Please try again.');
      throw new Error('Unable to restore task');
    } finally {
      setAddingTodoColumnIds((current) => {
        const next = new Set(current);
        next.delete(args.columnId);
        return next;
      });
    }
  }, [createTodo, isImmediateActionDisabled, refetchLatestBoard]);

  const { handleTodoDeleteWithUndo, getContextMenuItems } = useBoardActions({
    boardId,
    columns: draftBoard?.columns,
    selectedTodo,
    setSelectedTodo,
    setContextMenuPosition,
    setContextMenuTodo,
    setUndoState,
    deleteTodo: { mutate: handleDeleteTodoFromMenu },
    createTodo: { mutate: handleRestoreTodoFromUndo },
    updateTodo: { mutate: stageTodoPriority },
    moveTodo: { mutate: stageTodoMove },
    disabled: isDraftInteractionDisabled,
    immediateDisabled: isImmediateActionDisabled,
  });

  useEffect(() => {
    if (isEditingBoardName && boardNameInputRef.current) {
      boardNameInputRef.current.focus();
      boardNameInputRef.current.select();
    }
  }, [isEditingBoardName]);

  useEffect(() => {
    if (board && !hasBoardChanges) {
      setEditedBoardName(board.name);
      setEditedDescription(board.description || '');
    }
  }, [board, hasBoardChanges]);

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

  const handleAddTodo = async (columnId: string, title: string) => {
    if (!boardId || isImmediateActionDisabled) return;

    setBoardSaveError(null);
    setAddingTodoColumnIds((current) => new Set(current).add(columnId));
    try {
      await createTodo.mutateAsync({ columnId, boardId, title });
      await refetchLatestBoard();
    } catch {
      setBoardSaveError('Unable to add task. Please try again.');
      throw new Error('Unable to add task');
    } finally {
      setAddingTodoColumnIds((current) => {
        const next = new Set(current);
        next.delete(columnId);
        return next;
      });
    }
  };

  const handleUpdateColumn = (id: string, updates: { name?: string; description?: string | null; wipLimit?: number | null }) => {
    if (!boardId || isSavingBoardDraft) return;
    setBoardSaveError(null);
    setDirtyColumnIds((current) => new Set(current).add(id));
    setDraftBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        columns: current.columns.map((column) => (
          column.id === id
            ? {
                ...column,
                ...updates,
                description: updates.description === null ? undefined : updates.description ?? column.description,
                wipLimit: updates.wipLimit === null ? undefined : updates.wipLimit ?? column.wipLimit,
              }
            : column
        )),
      };
    });
  };

  const handleDeleteColumn = async (id: string) => {
    if (!boardId || isImmediateActionDisabled) return;

    setBoardSaveError(null);
    setDeletingColumnIds((current) => new Set(current).add(id));
    try {
      await deleteColumn.mutateAsync({ id, boardId });
      await refetchLatestBoard();
    } catch {
      setBoardSaveError('Unable to delete column. Please try again.');
      throw new Error('Unable to delete column');
    } finally {
      setDeletingColumnIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAddColumn = async () => {
    if (!boardId || !newColumnName.trim() || isImmediateActionDisabled) return;
    setBoardSaveError(null);
    setIsSavingNewColumn(true);

    try {
      const createdColumn = await createColumn.mutateAsync({ boardId, name: newColumnName.trim() });
      const latestBoard = await refetchLatestBoard();
      if (latestBoard) {
        revealColumn(createdColumn.id, latestBoard);
      }
      setNewColumnName('');
      setIsAddingColumn(false);
    } catch {
      setBoardSaveError('Unable to add column. Please try again.');
    } finally {
      setIsSavingNewColumn(false);
    }
  };

  const handleColumnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddColumn();
    } else if (e.key === 'Escape') {
      setIsAddingColumn(false);
      setNewColumnName('');
    }
  };

  const handleBoardNameClick = () => {
    if (draftBoard && !isSavingBoardDraft) {
      setEditedBoardName(draftBoard.name);
      setIsEditingBoardName(true);
    }
  };

  const handleBoardNameSave = () => {
    if (!boardId || !editedBoardName.trim() || isSavingBoardDraft) {
      setIsEditingBoardName(false);
      return;
    }
    const nextName = editedBoardName.trim();
    setBoardSaveError(null);
    setDraftBoard((current) => current ? { ...current, name: nextName } : current);
    setIsEditingBoardName(false);
  };

  const handleBoardNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBoardNameSave();
    } else if (e.key === 'Escape') {
      setEditedBoardName(draftBoard?.name || '');
      setIsEditingBoardName(false);
    }
  };

  const handleDescriptionBlur = () => {
    if (!boardId || isSavingBoardDraft) return;
    const newDescription = editedDescription.trim();
    setBoardSaveError(null);
    setDraftBoard((current) => current ? { ...current, description: newDescription || undefined } : current);
    setIsEditingDescription(false);
  };

  const handleDiscardBoardChanges = useCallback(() => {
    if (!board || isSavingBoardDraft) return;
    setDraftBoard(board);
    setDirtyColumnIds(new Set());
    setDirtyTodoIds(new Set());
    setBoardSaveError(null);
    setEditedBoardName(board.name);
    setEditedDescription(board.description || '');
    setIsEditingBoardName(false);
    setIsEditingDescription(false);
  }, [board, isSavingBoardDraft]);
  const handleImmediateBoardCommit = useCallback((latestBoard: Board | undefined) => {
    if (!latestBoard) return;
    setDraftBoard(latestBoard);
    setDirtyColumnIds(new Set());
    setDirtyTodoIds(new Set());
    setEditedBoardName(latestBoard.name);
    setEditedDescription(latestBoard.description || '');
  }, []);
  const handleSaveBoardChanges = useCallback(async () => {
    if (!boardId || !board || !draftBoard || !hasBoardChanges || isSavingBoardDraft) return;
    setIsSavingBoardDraft(true);
    setBoardSaveError(null);
    try {
      const latestBoard = await saveBoardDraft({
        board,
        boardId,
        dirtyColumnIds,
        dirtyTodoIds,
        draftBoard,
        moveTodo,
        queryClient,
        reorderColumns,
        reorderTodos,
        updateBoard,
        updateColumn,
        updateTodo,
      });
      setDraftBoard(latestBoard ?? draftBoard);
      setDirtyColumnIds(new Set());
      setDirtyTodoIds(new Set());
      setEditedBoardName((latestBoard ?? draftBoard).name);
      setEditedDescription((latestBoard ?? draftBoard).description || '');
      setIsEditingBoardName(false);
      setIsEditingDescription(false);
    } catch {
      setBoardSaveError('Could not save changes. Please try again.');
    } finally {
      setIsSavingBoardDraft(false);
    }
  }, [
    board,
    boardId,
    dirtyColumnIds,
    dirtyTodoIds,
    draftBoard,
    hasBoardChanges,
    isSavingBoardDraft,
    moveTodo,
    queryClient,
    reorderColumns,
    reorderTodos,
    updateBoard,
    updateColumn,
    updateTodo,
  ]);
  const handleTodoClick = (todo: Todo) => {
    if (isDraftInteractionDisabled) return;
    setSelectedTodoId(todo.id);
    setLastClickedTodo(todo);
  };
  const handleTodoContextMenu = (todo: Todo, event: React.MouseEvent) => {
    if (isDraftInteractionDisabled) return;
    setContextMenuTodo(todo);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };

  if (isLoading) {
    return <BoardLoadingState />;
  }

  if (error || !board) {
    return <BoardNotFoundState />;
  }
  const activeBoard = draftBoard ?? board;
  const sortedColumns = sortedColumnsForBoard(activeBoard);
  return (
    <div className="flex flex-col h-full" data-testid="board-view">
      <BoardHeader
        activeBoard={activeBoard}
        boardNameInputRef={boardNameInputRef}
        boardSaveError={boardSaveError}
        editedBoardName={editedBoardName}
        editedDescription={editedDescription}
        hasBoardChanges={hasBoardChanges}
        isEditingBoardName={isEditingBoardName}
        isEditingDescription={isEditingDescription}
        isSavingBoardDraft={isSavingBoardDraft}
        pendingCount={pendingCount}
        syncState={syncState}
        onBoardNameClick={handleBoardNameClick}
        onBoardNameKeyDown={handleBoardNameKeyDown}
        onBoardNameSave={handleBoardNameSave}
        onDescriptionBlur={handleDescriptionBlur}
        onDiscardBoardChanges={handleDiscardBoardChanges}
        onSaveBoardChanges={handleSaveBoardChanges}
        onSetEditedBoardName={setEditedBoardName}
        onSetEditedDescription={setEditedDescription}
        onSetEditingDescription={setIsEditingDescription}
        onShowLabelManager={() => setShowLabelManager(true)}
      />

      <LabelManager isOpen={showLabelManager} onClose={() => setShowLabelManager(false)} />

      <BoardWorkspace
        activeBoard={activeBoard}
        activeColumnIndex={activeColumnIndex}
        addingTodoColumnIds={addingTodoColumnIds}
        boardDnD={boardDnD}
        boardId={boardId}
        deletingColumnIds={deletingColumnIds}
        deletingTodoIds={deletingTodoIds}
        isAddingColumn={isAddingColumn}
        isDraftInteractionDisabled={isDraftInteractionDisabled}
        isImmediateActionDisabled={isImmediateActionDisabled}
        isMobile={isMobile}
        isSavingNewColumn={isSavingNewColumn}
        newColumnName={newColumnName}
        scrollContainerRef={scrollContainerRef}
        selectedTodo={selectedTodo}
        sortedColumns={sortedColumns}
        onAddColumn={handleAddColumn}
        onAddTodo={handleAddTodo}
        onColumnKeyDown={handleColumnKeyDown}
        onDeleteColumn={handleDeleteColumn}
        onImmediateBoardCommit={handleImmediateBoardCommit}
        onSetIsAddingColumn={setIsAddingColumn}
        onSetNewColumnName={setNewColumnName}
        onSetSelectedTodo={setSelectedTodo}
        onTodoClick={handleTodoClick}
        onTodoContextMenu={handleTodoContextMenu}
        onUpdateColumn={handleUpdateColumn}
      />

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

      <AnimatePresence>
        {pendingNavigationPath && (
          <UnsavedNavigationDialog
            onStay={stayOnBoard}
            onLeave={leaveWithoutSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
