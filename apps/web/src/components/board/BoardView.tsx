import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
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
import { ArrowLeft, Plus, Tags, Columns, Loader2, RotateCcw, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useBoard, useUpdateBoard, boardKeys } from '../../hooks/useBoards';
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
import type { Board, Column, Priority, Todo } from '../../types';

interface UndoState {
  message: string;
  onUndo: () => void;
}

type ColumnUpdates = { name?: string; description?: string | null; wipLimit?: number | null };
type TodoUpdates = { priority?: Priority };

function normalizeDescription(description: string | undefined | null) {
  return description || '';
}

function sortedColumnsForBoard(board: Board | undefined) {
  return [...(board?.columns ?? [])].sort((a, b) => a.position - b.position);
}

function sortedTodosForColumn(column: Column | undefined) {
  return [...(column?.todos ?? [])].sort((a, b) => a.position - b.position);
}

function findTodoInBoard(board: Board | undefined, todoId: string | null) {
  if (!board || !todoId) return null;
  for (const column of board.columns) {
    const todo = (column.todos ?? []).find((item) => item.id === todoId);
    if (todo) return todo;
  }
  return null;
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasDraftBoardChanges(
  serverBoard: Board | undefined,
  draftBoard: Board | undefined,
  dirtyColumnIds: Set<string>,
  dirtyTodoIds: Set<string>
) {
  if (!serverBoard || !draftBoard) return false;

  if (serverBoard.name !== draftBoard.name) return true;
  if (normalizeDescription(serverBoard.description) !== normalizeDescription(draftBoard.description)) return true;
  if (dirtyColumnIds.size > 0) return true;
  if (dirtyTodoIds.size > 0) return true;

  const serverColumns = sortedColumnsForBoard(serverBoard);
  const draftColumns = sortedColumnsForBoard(draftBoard);
  if (!arraysEqual(serverColumns.map((column) => column.id), draftColumns.map((column) => column.id))) return true;

  for (const draftColumn of draftColumns) {
    const serverColumn = serverColumns.find((column) => column.id === draftColumn.id);
    if (!serverColumn) return true;
    if (!arraysEqual(
      sortedTodosForColumn(serverColumn).map((todo) => todo.id),
      sortedTodosForColumn(draftColumn).map((todo) => todo.id)
    )) {
      return true;
    }
    for (const draftTodo of draftColumn.todos ?? []) {
      const serverTodo = findTodoInBoard(serverBoard, draftTodo.id);
      if (serverTodo?.columnId !== draftTodo.columnId) return true;
    }
  }

  return false;
}

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
  const isBoardInteractionDisabled = isSavingBoardDraft || isSavingImmediateAction || hasUnsavedBoardChanges;

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
    board: draftBoard,
    boardId,
    reorderColumns: { mutate: stageColumnReorder },
    moveTodo: { mutate: stageTodoMove },
    reorderTodos: { mutate: stageTodoReorder },
    disabled: isSavingBoardDraft,
  });

  const [showLabelManager, setShowLabelManager] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Detail panel state (replaces TodoEditModal)
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const selectedTodo = useMemo(() => findTodoInBoard(draftBoard, selectedTodoId), [draftBoard, selectedTodoId]);
  const setSelectedTodo = useCallback((todo: Todo | null) => {
    setSelectedTodoId(todo?.id ?? null);
  }, []);

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

  // Mobile column pagination
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
    if (isBoardInteractionDisabled) return;

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
  }, [deleteTodo, isBoardInteractionDisabled, refetchLatestBoard]);

  const handleRestoreTodoFromUndo = useCallback(async (args: {
    columnId: string;
    boardId: string;
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: string;
    labelIds?: string[];
  }) => {
    if (isBoardInteractionDisabled) return;

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
  }, [createTodo, isBoardInteractionDisabled, refetchLatestBoard]);

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
    disabled: isBoardInteractionDisabled,
  });

  // Focus board name input when editing starts
  useEffect(() => {
    if (isEditingBoardName && boardNameInputRef.current) {
      boardNameInputRef.current.focus();
      boardNameInputRef.current.select();
    }
  }, [isEditingBoardName]);

  // Sync edited values when server data changes and no local draft is pending
  useEffect(() => {
    if (board && !hasBoardChanges) {
      setEditedBoardName(board.name);
      setEditedDescription(board.description || '');
    }
  }, [board, hasBoardChanges]);

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

  const handleAddTodo = async (columnId: string, title: string) => {
    if (!boardId || isBoardInteractionDisabled) return;

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
    if (!boardId || isBoardInteractionDisabled) return;

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
    if (!boardId || !newColumnName.trim() || isBoardInteractionDisabled) return;
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

  // Board name inline editing
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

  // Inline board description editing (stage on blur, save from header)
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

  const handleSaveBoardChanges = useCallback(async () => {
    if (!boardId || !board || !draftBoard || !hasBoardChanges || isSavingBoardDraft) return;

    setIsSavingBoardDraft(true);
    setBoardSaveError(null);

    try {
      const draftColumns = sortedColumnsForBoard(draftBoard);
      const serverColumns = sortedColumnsForBoard(board);

      const boardUpdates: { name?: string; description?: string | null } = {};
      if (draftBoard.name !== board.name) boardUpdates.name = draftBoard.name;
      if (normalizeDescription(draftBoard.description) !== normalizeDescription(board.description)) {
        boardUpdates.description = draftBoard.description || null;
      }
      if (Object.keys(boardUpdates).length > 0) {
        await updateBoard.mutateAsync({ id: boardId, ...boardUpdates });
      }

      for (const columnId of dirtyColumnIds) {
        const draftColumn = draftColumns.find((column) => column.id === columnId);
        const serverColumn = serverColumns.find((column) => column.id === columnId);
        if (!draftColumn || !serverColumn) continue;

        const updates: ColumnUpdates = {};
        if (draftColumn.name !== serverColumn.name) updates.name = draftColumn.name;
        if (normalizeDescription(draftColumn.description) !== normalizeDescription(serverColumn.description)) {
          updates.description = draftColumn.description || null;
        }
        if ((draftColumn.wipLimit ?? null) !== (serverColumn.wipLimit ?? null)) {
          updates.wipLimit = draftColumn.wipLimit ?? null;
        }
        if (Object.keys(updates).length > 0) {
          await updateColumn.mutateAsync({ id: columnId, boardId, ...updates });
        }
      }

      for (const todoId of dirtyTodoIds) {
        const draftTodo = findTodoInBoard(draftBoard, todoId);
        const serverTodo = findTodoInBoard(board, todoId);
        if (!draftTodo || !serverTodo) continue;

        const updates: TodoUpdates = {};
        if (draftTodo.priority !== serverTodo.priority) updates.priority = draftTodo.priority;
        if (Object.keys(updates).length > 0) {
          await updateTodo.mutateAsync({ id: todoId, boardId, ...updates });
        }
      }

      const serverColumnIds = serverColumns.map((column) => column.id);
      const draftColumnIds = draftColumns.map((column) => column.id);
      if (!arraysEqual(serverColumnIds, draftColumnIds)) {
        await reorderColumns.mutateAsync({ boardId, columnIds: draftColumnIds });
      }

      const movedTodoIds = new Set<string>();
      for (const draftColumn of draftColumns) {
        const draftTodos = sortedTodosForColumn(draftColumn);
        for (const [position, draftTodo] of draftTodos.entries()) {
          const serverTodo = findTodoInBoard(board, draftTodo.id);
          if (serverTodo && serverTodo.columnId !== draftColumn.id) {
            movedTodoIds.add(draftTodo.id);
            await moveTodo.mutateAsync({
              id: draftTodo.id,
              boardId,
              columnId: draftColumn.id,
              position,
            });
          }
        }
      }

      for (const draftColumn of draftColumns) {
        const draftTodoIds = sortedTodosForColumn(draftColumn).map((todo) => todo.id);
        const serverColumn = serverColumns.find((column) => column.id === draftColumn.id);
        const serverTodoIds = sortedTodosForColumn(serverColumn).map((todo) => todo.id);
        const columnHasMovedTodo = draftTodoIds.some((id) => movedTodoIds.has(id)) ||
          serverTodoIds.some((id) => movedTodoIds.has(id));
        if (draftTodoIds.length > 0 && (!arraysEqual(draftTodoIds, serverTodoIds) || columnHasMovedTodo)) {
          await reorderTodos.mutateAsync({ boardId, columnId: draftColumn.id, todoIds: draftTodoIds });
        }
      }

      await queryClient.refetchQueries({ queryKey: boardKeys.detail(boardId), type: 'active' });
      await queryClient.refetchQueries({ queryKey: boardKeys.all, type: 'active' });
      const latestBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));
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

  // Todo click -> open detail panel
  const handleTodoClick = (todo: Todo) => {
    setSelectedTodoId(todo.id);
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

  const activeBoard = draftBoard ?? board;
  const sortedColumns = sortedColumnsForBoard(activeBoard);
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
                    disabled={isSavingBoardDraft}
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
                    {activeBoard.name}
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
                    editable={!isSavingBoardDraft}
                    compact
                  />
                </div>
              ) : (
                <p
                  className="text-xs text-stone-400 truncate cursor-pointer hover:text-stone-600 transition-colors max-w-xl"
                  onClick={() => {
                    setEditedDescription(activeBoard.description || '');
                    setIsEditingDescription(true);
                  }}
                  title={activeBoard.description || 'Click to add description'}
                >
                  {activeBoard.description || 'Add a description...'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <SyncStatusIndicator state={syncState} pendingCount={pendingCount} />
            <AnimatePresence>
              {hasBoardChanges && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDiscardBoardChanges}
                    disabled={isSavingBoardDraft}
                    aria-label="Discard changes"
                    title="Discard changes"
                  >
                    <RotateCcw className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Discard</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveBoardChanges}
                    disabled={isSavingBoardDraft}
                    aria-busy={isSavingBoardDraft}
                    aria-label={isSavingBoardDraft ? 'Saving changes' : 'Save changes'}
                    title={isSavingBoardDraft ? 'Saving changes' : 'Save changes'}
                  >
                    {isSavingBoardDraft ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    <span>
                      {isSavingBoardDraft ? 'Saving...' : 'Save changes'}
                    </span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLabelManager(true)}
              disabled={isSavingBoardDraft}
              aria-label="Labels"
              title="Manage labels"
            >
              <Tags className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Labels</span>
            </Button>
          </div>
        </div>
        {boardSaveError && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {boardSaveError}
          </p>
        )}
      </div>

      <LabelManager isOpen={showLabelManager} onClose={() => setShowLabelManager(false)} />

      {/* Board content + Detail panel row */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
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
                    data-column-id={column.id}
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
                      disabled={isBoardInteractionDisabled}
                      isAddingTodo={addingTodoColumnIds.has(column.id)}
                      isDeleting={deletingColumnIds.has(column.id)}
                      deletingTodoIds={deletingTodoIds}
                    />
                  </motion.div>
                ))}

                {/* Add column button */}
                {!isMobile && (
                <div>
                  {isAddingColumn ? (
                    <div className="flex flex-col gap-2 w-full md:w-72 md:min-w-72 h-fit p-3 rounded-xl bg-stone-100">
                      <Input
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        onKeyDown={handleColumnKeyDown}
                        placeholder="Enter column name..."
                        disabled={isBoardInteractionDisabled}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleAddColumn}
                          disabled={isBoardInteractionDisabled}
                          aria-busy={isSavingNewColumn}
                        >
                          {isSavingNewColumn ? 'Adding...' : 'Add'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isBoardInteractionDisabled}
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
                      disabled={isBoardInteractionDisabled}
                      className="flex items-center gap-2 w-full md:w-72 md:min-w-72 h-fit p-3 rounded-xl bg-stone-200/50 hover:bg-stone-200 text-stone-500 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      Add column
                    </button>
                  )}
                </div>
                )}
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

      {isMobile && (
        <div className="border-t border-stone-100 bg-white p-3">
          {isAddingColumn ? (
            <div className="flex flex-col gap-2 rounded-xl bg-stone-100 p-3">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={handleColumnKeyDown}
                placeholder="Enter column name..."
                disabled={isBoardInteractionDisabled}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAddColumn}
                  disabled={isBoardInteractionDisabled}
                  aria-busy={isSavingNewColumn}
                >
                  {isSavingNewColumn ? 'Adding...' : 'Add'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isBoardInteractionDisabled}
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
              disabled={isBoardInteractionDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-100 px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add column
            </button>
          )}
        </div>
      )}

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
            columns={activeBoard.columns}
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
