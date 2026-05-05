import type { Todo, Column, Priority, ContextMenuItem } from '../types';

interface UndoState {
  message: string;
  onUndo: () => void | Promise<void>;
}

interface UseBoardActionsParams {
  boardId: string | undefined;
  columns: Column[] | undefined;
  selectedTodo: Todo | null;
  setSelectedTodo: (todo: Todo | null) => void;
  setContextMenuPosition: (pos: { x: number; y: number } | null) => void;
  setContextMenuTodo: (todo: Todo | null) => void;
  setUndoState: (state: UndoState | null) => void;
  deleteTodo: { mutate: (args: { id: string; boardId: string }) => void | Promise<void> };
  createTodo: { mutate: (args: {
    columnId: string;
    boardId: string;
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: string;
    labelIds?: string[];
  }) => void | Promise<void> };
  updateTodo: { mutate: (args: { id: string; boardId: string; priority: Priority }) => void };
  moveTodo: { mutate: (args: { id: string; boardId: string; columnId: string; position: number }) => void };
  disabled?: boolean;
}

export function useBoardActions({
  boardId,
  columns,
  selectedTodo,
  setSelectedTodo,
  setContextMenuPosition,
  setContextMenuTodo,
  setUndoState,
  deleteTodo,
  createTodo,
  updateTodo,
  moveTodo,
  disabled = false,
}: UseBoardActionsParams) {
  const handleTodoDeleteWithUndo = async (todo: Todo) => {
    if (!boardId || disabled) return;
    // Close detail panel if this todo is open
    if (selectedTodo?.id === todo.id) {
      setSelectedTodo(null);
    }
    // Close context menu
    setContextMenuPosition(null);
    setContextMenuTodo(null);

    try {
      await deleteTodo.mutate({ id: todo.id, boardId });
      setUndoState({
        message: `"${todo.title}" deleted`,
        onUndo: () => {
          // Re-create the todo (best-effort undo)
          return createTodo.mutate({
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
    } catch {
      // Parent handlers surface the user-facing error and loading cleanup.
    }
  };

  const getContextMenuItems = (todo: Todo): ContextMenuItem[] => {
    const priorityItems: ContextMenuItem[] = (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => ({
      label: p.charAt(0) + p.slice(1).toLowerCase(),
      onClick: () => {
        if (!boardId || disabled) return;
        updateTodo.mutate({ id: todo.id, boardId, priority: p });
      },
      disabled,
    }));

    const moveToItems: ContextMenuItem[] = (columns ?? [])
      .filter((c) => c.id !== todo.columnId)
      .map((c) => ({
        label: c.name,
        onClick: () => {
          if (!boardId || disabled) return;
          moveTodo.mutate({ id: todo.id, boardId, columnId: c.id, position: 0 });
        },
        disabled,
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
        disabled,
      },
      ...(moveToItems.length > 0
        ? [{ label: 'Move to', submenu: moveToItems }]
        : []),
      { label: '---' },
      {
        label: 'Delete',
        danger: true,
        disabled,
        onClick: () => handleTodoDeleteWithUndo(todo),
      },
    ];
  };

  return {
    handleTodoDeleteWithUndo,
    getContextMenuItems,
  };
}
