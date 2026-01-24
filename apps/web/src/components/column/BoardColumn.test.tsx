import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { BoardColumn } from "./BoardColumn";
import { DndContext } from "@dnd-kit/core";
import type { Column, Todo } from "../../types";

// Wrapper for DnD context
const renderWithDnd = (ui: React.ReactElement) => {
  return render(<DndContext>{ui}</DndContext>);
};

// Factory functions for creating mock data
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: `todo-${Date.now()}-${Math.random()}`,
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

describe("BoardColumn", () => {
  const defaultProps = {
    column: createMockColumn(),
    onAddTodo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders column name", () => {
      renderWithDnd(<BoardColumn {...defaultProps} />);
      expect(screen.getByText("Test Column")).toBeInTheDocument();
    });

    it("renders todo count badge", () => {
      const column = createMockColumn({
        todos: [createMockTodo({ id: "1" }), createMockTodo({ id: "2" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("renders zero count when no todos", () => {
      renderWithDnd(<BoardColumn {...defaultProps} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("renders all todos in the column", () => {
      const column = createMockColumn({
        todos: [
          createMockTodo({ id: "1", title: "First Todo" }),
          createMockTodo({ id: "2", title: "Second Todo" }),
          createMockTodo({ id: "3", title: "Third Todo" }),
        ],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);

      expect(screen.getByText("First Todo")).toBeInTheDocument();
      expect(screen.getByText("Second Todo")).toBeInTheDocument();
      expect(screen.getByText("Third Todo")).toBeInTheDocument();
    });

    it("renders add card button", () => {
      renderWithDnd(<BoardColumn {...defaultProps} />);
      expect(screen.getByText("Add a card")).toBeInTheDocument();
    });

    it("renders column options button", () => {
      renderWithDnd(<BoardColumn {...defaultProps} />);
      // The more options button should be present
      const optionsButton = screen.getByRole("button", { name: "" });
      expect(optionsButton).toBeInTheDocument();
    });
  });

  describe("WIP limit indicator", () => {
    it("shows WIP indicator when at limit", () => {
      const column = createMockColumn({
        wipLimit: 2,
        todos: [createMockTodo({ id: "1" }), createMockTodo({ id: "2" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByText("WIP")).toBeInTheDocument();
    });

    it("shows WIP indicator when over limit", () => {
      const column = createMockColumn({
        wipLimit: 2,
        todos: [
          createMockTodo({ id: "1" }),
          createMockTodo({ id: "2" }),
          createMockTodo({ id: "3" }),
        ],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByText("WIP")).toBeInTheDocument();
    });

    it("does not show WIP indicator when under limit", () => {
      const column = createMockColumn({
        wipLimit: 5,
        todos: [createMockTodo({ id: "1" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.queryByText("WIP")).not.toBeInTheDocument();
    });

    it("does not show WIP indicator when no limit set", () => {
      const column = createMockColumn({
        wipLimit: undefined,
        todos: [createMockTodo({ id: "1" }), createMockTodo({ id: "2" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.queryByText("WIP")).not.toBeInTheDocument();
    });
  });

  describe("add todo functionality", () => {
    it("shows input form when add card button is clicked", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} />);

      await user.click(screen.getByText("Add a card"));

      expect(screen.getByPlaceholderText(/enter todo title/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("calls onAddTodo when form is submitted", async () => {
      const user = userEvent.setup();
      const onAddTodo = vi.fn();
      renderWithDnd(<BoardColumn column={defaultProps.column} onAddTodo={onAddTodo} />);

      await user.click(screen.getByText("Add a card"));

      const input = screen.getByPlaceholderText(/enter todo title/i);
      await user.type(input, "New Todo Item");

      await user.click(screen.getByRole("button", { name: /^add$/i }));

      expect(onAddTodo).toHaveBeenCalledWith("column-1", "New Todo Item");
    });

    it("clears input and hides form after submission", async () => {
      const user = userEvent.setup();
      const onAddTodo = vi.fn();
      renderWithDnd(<BoardColumn column={defaultProps.column} onAddTodo={onAddTodo} />);

      await user.click(screen.getByText("Add a card"));
      const input = screen.getByPlaceholderText(/enter todo title/i);
      await user.type(input, "New Todo Item");
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Form should be hidden
      expect(screen.queryByPlaceholderText(/enter todo title/i)).not.toBeInTheDocument();
      // Add a card button should be visible again
      expect(screen.getByText("Add a card")).toBeInTheDocument();
    });

    it("submits on Enter key press", async () => {
      const user = userEvent.setup();
      const onAddTodo = vi.fn();
      renderWithDnd(<BoardColumn column={defaultProps.column} onAddTodo={onAddTodo} />);

      await user.click(screen.getByText("Add a card"));

      const input = screen.getByPlaceholderText(/enter todo title/i);
      await user.type(input, "Enter Key Todo{Enter}");

      expect(onAddTodo).toHaveBeenCalledWith("column-1", "Enter Key Todo");
    });

    it("cancels on Escape key press", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} />);

      await user.click(screen.getByText("Add a card"));
      expect(screen.getByPlaceholderText(/enter todo title/i)).toBeInTheDocument();

      await user.keyboard("{Escape}");

      // Form should be hidden
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter todo title/i)).not.toBeInTheDocument();
      });
    });

    it("cancels when cancel button is clicked", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} />);

      await user.click(screen.getByText("Add a card"));
      expect(screen.getByPlaceholderText(/enter todo title/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Form should be hidden
      expect(screen.queryByPlaceholderText(/enter todo title/i)).not.toBeInTheDocument();
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("does not call onAddTodo for empty input", async () => {
      const user = userEvent.setup();
      const onAddTodo = vi.fn();
      renderWithDnd(<BoardColumn column={defaultProps.column} onAddTodo={onAddTodo} />);

      await user.click(screen.getByText("Add a card"));
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      expect(onAddTodo).not.toHaveBeenCalled();
    });

    it("does not call onAddTodo for whitespace-only input", async () => {
      const user = userEvent.setup();
      const onAddTodo = vi.fn();
      renderWithDnd(<BoardColumn column={defaultProps.column} onAddTodo={onAddTodo} />);

      await user.click(screen.getByText("Add a card"));
      const input = screen.getByPlaceholderText(/enter todo title/i);
      await user.type(input, "   ");
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      expect(onAddTodo).not.toHaveBeenCalled();
    });

    it("trims whitespace from todo title", async () => {
      const user = userEvent.setup();
      const onAddTodo = vi.fn();
      renderWithDnd(<BoardColumn column={defaultProps.column} onAddTodo={onAddTodo} />);

      await user.click(screen.getByText("Add a card"));
      const input = screen.getByPlaceholderText(/enter todo title/i);
      await user.type(input, "  Trimmed Title  ");
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      expect(onAddTodo).toHaveBeenCalledWith("column-1", "Trimmed Title");
    });

    it("handles empty column name", () => {
      const column = createMockColumn({ name: "" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      // Should render without crashing
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles very long column name", () => {
      const longName = "A".repeat(100);
      const column = createMockColumn({ name: longName });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("handles column with null todos", () => {
      const column = createMockColumn({ todos: undefined });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles column with many todos", () => {
      const manyTodos = Array.from({ length: 50 }, (_, i) =>
        createMockTodo({ id: `todo-${i}`, title: `Todo ${i}`, position: i })
      );
      const column = createMockColumn({ todos: manyTodos });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("sorts todos by position", () => {
      const todos = [
        createMockTodo({ id: "3", title: "Third", position: 2 }),
        createMockTodo({ id: "1", title: "First", position: 0 }),
        createMockTodo({ id: "2", title: "Second", position: 1 }),
      ];
      const column = createMockColumn({ todos });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);

      const todoElements = screen.getAllByText(/First|Second|Third/);
      expect(todoElements[0]).toHaveTextContent("First");
      expect(todoElements[1]).toHaveTextContent("Second");
      expect(todoElements[2]).toHaveTextContent("Third");
    });
  });

  describe("drop target highlighting", () => {
    it("renders as a valid drop target", () => {
      renderWithDnd(<BoardColumn {...defaultProps} />);
      // The column should be wrapped in a div that can receive drops
      const columnContainer = screen.getByText("Test Column").closest("div");
      expect(columnContainer).toBeInTheDocument();
    });
  });
});
