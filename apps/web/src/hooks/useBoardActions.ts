import type { Todo, Column, Priority } from '../types';
import type { ContextMenuItem } from '../components/ui';

interface UndoState {
  message: string;
  onUndo: () => void;
}

interface UseBoardActionsParams {
  boardId: string | undefined;
  columns: Column[] | undefined;
  selectedTodo: Todo | null;
  setSelectedTodo: (todo: Todo | null) => void;
  setContextMenuPosition: (pos: { x: number; y: number } | null) => void;
  setContextMenuTodo: (todo: Todo | null) => void;
  setUndoState: (state: UndoState | null) => void;
  deleteTodo: { mutate: (args: { id: string; boardId: string }) => void };
  createTodo: { mutate: (args: {
    columnId: string;
    boardId: string;
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: string;
    labelIds?: string[];
  }) => void };
  updateTodo: { mutate: (args: { id: string; boardId: string; priority: Priority }) => void };
  moveTodo: { mutate: (args: { id: string; boardId: string; columnId: string; position: number }) => void };
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
}: UseBoardActionsParams) {
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

  const getContextMenuItems = (todo: Todo): ContextMenuItem[] => {
    const priorityItems: ContextMenuItem[] = (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => ({
      label: p.charAt(0) + p.slice(1).toLowerCase(),
      onClick: () => {
        if (!boardId) return;
        updateTodo.mutate({ id: todo.id, boardId, priority: p });
      },
    }));

    const moveToItems: ContextMenuItem[] = (columns ?? [])
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

  return {
    handleTodoDeleteWithUndo,
    getContextMenuItems,
  };
}
