import { useCallback, useState } from 'react';
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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import { useBoard } from '../../hooks/useBoards';
import { useCreateTodo, useMoveTodo, useReorderTodos } from '../../hooks/useTodos';
import { BoardColumn } from '../column/BoardColumn';
import { TodoCard } from '../todo/TodoCard';
import { Button } from '../ui';
import type { Todo, Column } from '../../types';

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading, error } = useBoard(boardId);
  const createTodo = useCreateTodo();
  const moveTodo = useMoveTodo();
  const reorderTodos = useReorderTodos();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);

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
        const todo = column.todos.find((t) => t.id === id);
        if (todo) return { todo, column };
      }
      return null;
    },
    [board]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const result = findTodo(active.id as string);
    if (result) {
      setActiveTodo(result.todo);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // This is handled in dragEnd for simplicity
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTodo(null);

    if (!over || !board || !boardId) return;

    const activeResult = findTodo(active.id as string);
    if (!activeResult) return;

    const { todo: activeTodoItem, column: sourceColumn } = activeResult;

    // Find target column
    let targetColumn: Column | undefined;
    let newPosition = 0;

    // Check if dropped on a column directly
    targetColumn = board.columns.find((c) => c.id === over.id);

    if (!targetColumn) {
      // Check if dropped on another todo
      const overResult = findTodo(over.id as string);
      if (overResult) {
        targetColumn = overResult.column;
        const overTodo = overResult.todo;
        newPosition = overTodo.position;
      }
    } else {
      // Dropped on empty column
      newPosition = targetColumn.todos.length;
    }

    if (!targetColumn) return;

    // Same column reordering
    if (sourceColumn.id === targetColumn.id) {
      const sortedTodos = [...sourceColumn.todos].sort((a, b) => a.position - b.position);
      const oldIndex = sortedTodos.findIndex((t) => t.id === activeTodoItem.id);
      const overTodoResult = findTodo(over.id as string);

      if (overTodoResult && overTodoResult.column.id === sourceColumn.id) {
        const newIndex = sortedTodos.findIndex((t) => t.id === over.id);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Board not found</p>
        <Link to="/">
          <Button variant="primary">Back to Boards</Button>
        </Link>
      </div>
    );
  }

  const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
            {board.description && (
              <p className="text-sm text-gray-500">{board.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {sortedColumns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onAddTodo={handleAddTodo}
              />
            ))}

            {/* Add column button */}
            <button className="flex items-center gap-2 w-72 min-w-72 h-fit p-3 rounded-lg bg-gray-200/50 hover:bg-gray-200 text-gray-600 transition-colors">
              <Plus className="h-5 w-5" />
              Add column
            </button>
          </div>

          <DragOverlay>
            {activeId && activeTodo ? (
              <TodoCard todo={activeTodo} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
