import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../src/test/utils";
import { BoardColumn } from "../../../../src/components/column/BoardColumn";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Column, Todo } from "../../../../src/types";

// Factory functions for creating mock data
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: `todo-${Math.random().toString(36).slice(2)}`,
  title: "Test Todo",
  description: "A test todo",
  priority: "MEDIUM",
  position: 0,
  archived: false,
  columnId: "column-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  labels: [],
  ...overrides,
});

const createMockColumn = (overrides: Partial<Column> = {}): Column => ({
  id: "column-1",
  name: "Test Column",
  position: 0,
  boardId: "board-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  todos: [],
  ...overrides,
});

// Helper to render BoardColumn inside required DnD context wrappers
function renderBoardColumn(props: {
  column: Column;
  onAddTodo: (columnId: string, title: string) => void;
  onUpdateColumn?: (id: string, updates: { name?: string; description?: string | null }) => void;
  onDeleteColumn?: (id: string) => void;
  onTodoClick?: (todo: Todo) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  activeTodoId?: string | null;
  overTodoId?: string | null;
}) {
  return render(
    <DndContext>
      <SortableContext
        items={[`column-${props.column.id}`]}
        strategy={verticalListSortingStrategy}
      >
        <BoardColumn {...props} />
      </SortableContext>
    </DndContext>
  );
}

describe("Feature: WIP Limits", () => {
  describe("Scenario: User sees amber warning at limit", () => {
    it("Given a column has a WIP limit of 3 and exactly 3 todos, When the column renders, Then an amber 'At limit' indicator is shown", () => {
      // Given: a column has a WIP limit of 3 and exactly 3 todos
      const column = createMockColumn({
        wipLimit: 3,
        todos: [
          createMockTodo({ id: "todo-1", title: "Task A", position: 0 }),
          createMockTodo({ id: "todo-2", title: "Task B", position: 1 }),
          createMockTodo({ id: "todo-3", title: "Task C", position: 2 }),
        ],
      });

      // When: the column renders
      renderBoardColumn({ column, onAddTodo: vi.fn() });

      // Then: an amber "At limit" indicator is shown
      const wipIndicator = screen.getByTestId("wip-indicator");
      expect(wipIndicator).toBeInTheDocument();
      expect(wipIndicator).toHaveTextContent("At limit");

      // Then: the indicator has amber styling
      expect(wipIndicator).toHaveClass("bg-amber-50");
      expect(wipIndicator).toHaveClass("text-amber-600");
    });
  });

  describe("Scenario: User sees red warning over limit", () => {
    it("Given a column has a WIP limit of 3 and 4 todos, When the column renders, Then a red 'Over limit' indicator is shown with animation", () => {
      // Given: a column has a WIP limit of 3 and 4 todos
      const column = createMockColumn({
        wipLimit: 3,
        todos: [
          createMockTodo({ id: "todo-1", title: "Task A", position: 0 }),
          createMockTodo({ id: "todo-2", title: "Task B", position: 1 }),
          createMockTodo({ id: "todo-3", title: "Task C", position: 2 }),
          createMockTodo({ id: "todo-4", title: "Task D", position: 3 }),
        ],
      });

      // When: the column renders
      renderBoardColumn({ column, onAddTodo: vi.fn() });

      // Then: a red "Over limit" indicator is shown
      const wipIndicator = screen.getByTestId("wip-indicator");
      expect(wipIndicator).toBeInTheDocument();
      expect(wipIndicator).toHaveTextContent("Over limit");

      // Then: the indicator has red styling
      expect(wipIndicator).toHaveClass("bg-red-50");
      expect(wipIndicator).toHaveClass("text-red-700");

      // Then: the indicator has a pulse animation
      expect(wipIndicator).toHaveClass("animate-pulse");
    });
  });
});
