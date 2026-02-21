import { useCallback, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Board, Todo, Column } from '../types';
import { computeColumnReorder, computeTodoDrop } from '../lib/board-dnd-utils';

interface UseBoardDnDParams {
  board: Board | undefined;
  boardId: string | undefined;
  reorderColumns: { mutate: (args: { boardId: string; columnIds: string[] }) => void };
  moveTodo: { mutate: (args: { id: string; boardId: string; columnId: string; position: number }) => void };
  reorderTodos: { mutate: (args: { boardId: string; columnId: string; todoIds: string[] }) => void };
}

export function useBoardDnD({ board, boardId, reorderColumns, moveTodo, reorderTodos }: UseBoardDnDParams) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [overTodoId, setOverTodoId] = useState<string | null>(null);

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

    if (activeIdStr.startsWith('column-')) {
      const result = computeColumnReorder(board, boardId, activeIdStr, overIdStr, findTodo);
      if (result) reorderColumns.mutate(result);
      return;
    }

    const result = computeTodoDrop(board, boardId, activeIdStr, overIdStr, findTodo);
    if (result) {
      if (result.type === 'move') {
        moveTodo.mutate({ id: result.id, boardId: result.boardId, columnId: result.columnId, position: result.position });
      } else {
        reorderTodos.mutate({ boardId: result.boardId, columnId: result.columnId, todoIds: result.todoIds });
      }
    }
  };

  return {
    activeId,
    activeTodo,
    activeColumn,
    overColumnId,
    overTodoId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
