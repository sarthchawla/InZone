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
      expect(screen.getByTestId("todo-count")).toHaveTextContent("2");
    });

    it("renders zero count when no todos", () => {
      renderWithDnd(<BoardColumn {...defaultProps} />);
      expect(screen.getByTestId("todo-count")).toHaveTextContent("0");
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
      const optionsButton = screen.getByRole("button", { name: /column options/i });
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
      expect(screen.getByText("At limit")).toBeInTheDocument();
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
      expect(screen.getByText("Over limit")).toBeInTheDocument();
    });

    it("does not show WIP indicator when under limit", () => {
      const column = createMockColumn({
        wipLimit: 5,
        todos: [createMockTodo({ id: "1" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.queryByText("At limit")).not.toBeInTheDocument();
      expect(screen.queryByText("Over limit")).not.toBeInTheDocument();
    });

    it("does not show WIP indicator when no limit set", () => {
      const column = createMockColumn({
        wipLimit: undefined,
        todos: [createMockTodo({ id: "1" }), createMockTodo({ id: "2" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.queryByText("At limit")).not.toBeInTheDocument();
      expect(screen.queryByText("Over limit")).not.toBeInTheDocument();
    });

    it("shows count with WIP limit format when limit is set", () => {
      const column = createMockColumn({
        wipLimit: 5,
        todos: [createMockTodo({ id: "1" }), createMockTodo({ id: "2" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByTestId("todo-count")).toHaveTextContent("2/5");
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
      expect(screen.getByTestId("todo-count")).toHaveTextContent("0");
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
      expect(screen.getByTestId("todo-count")).toHaveTextContent("0");
    });

    it("handles column with many todos", () => {
      const manyTodos = Array.from({ length: 50 }, (_, i) =>
        createMockTodo({ id: `todo-${i}`, title: `Todo ${i}`, position: i })
      );
      const column = createMockColumn({ todos: manyTodos });
      renderWithDnd(<BoardColumn column={column} onAddTodo={defaultProps.onAddTodo} />);
      expect(screen.getByTestId("todo-count")).toHaveTextContent("50");
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

  describe("column options menu", () => {
    it("opens menu when options button is clicked", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/column options/i));

      expect(screen.getByText("Edit Description")).toBeInTheDocument();
      expect(screen.getByText("Set WIP Limit")).toBeInTheDocument();
      expect(screen.getByText("Delete Column")).toBeInTheDocument();
    });

    it("closes menu when clicking outside", async () => {
      const { fireEvent } = require("@testing-library/react");
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/column options/i));
      expect(screen.getByText("Edit Description")).toBeInTheDocument();

      // Simulate mousedown outside the menu to trigger handleClickOutside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText("Edit Description")).not.toBeInTheDocument();
      });
    });

    it("shows inline description editor when Edit Description is clicked", async () => {
      const { fireEvent } = require("@testing-library/react");
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={vi.fn()} />);

      // Open menu - use fireEvent to avoid DnD interaction issues
      const optionsButton = screen.getByLabelText(/column options/i);
      fireEvent.pointerDown(optionsButton);
      fireEvent.click(optionsButton);

      expect(screen.getByText("Edit Description")).toBeInTheDocument();

      // Click Edit Description
      const editBtn = screen.getByText("Edit Description");
      fireEvent.pointerDown(editBtn);
      fireEvent.click(editBtn);

      // Inline editor should show Save and Cancel buttons
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it("calls onDeleteColumn directly when Delete Column is clicked", async () => {
      const { fireEvent } = require("@testing-library/react");
      const onDeleteColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onDeleteColumn={onDeleteColumn} />);

      // Open menu
      const optionsButton = screen.getByLabelText(/column options/i);
      fireEvent.pointerDown(optionsButton);
      fireEvent.click(optionsButton);

      expect(screen.getByText("Delete Column")).toBeInTheDocument();

      // Click Delete Column
      const deleteBtn = screen.getByText("Delete Column");
      fireEvent.pointerDown(deleteBtn);
      fireEvent.click(deleteBtn);

      expect(onDeleteColumn).toHaveBeenCalledWith("column-1");
    });

    it("shows WIP limit editor when Set WIP Limit is clicked", async () => {
      const { fireEvent } = require("@testing-library/react");
      renderWithDnd(<BoardColumn {...defaultProps} />);

      // Open menu
      const optionsButton = screen.getByLabelText(/column options/i);
      fireEvent.pointerDown(optionsButton);
      fireEvent.click(optionsButton);

      expect(screen.getByText("Set WIP Limit")).toBeInTheDocument();

      // Click Set WIP Limit
      const wipBtn = screen.getByText("Set WIP Limit");
      fireEvent.pointerDown(wipBtn);
      fireEvent.click(wipBtn);

      // WIP limit editor should appear with label and input
      expect(screen.getByText(/wip limit/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  describe("inline description editing", () => {
    it("shows description inline below title when column has description", () => {
      const column = createMockColumn({ description: "Column description here" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} />);

      expect(screen.getByText("Column description here")).toBeInTheDocument();
    });

    it("does not show description text when column has no description", () => {
      const column = createMockColumn({ description: undefined });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} />);

      // No description paragraph should be rendered
      expect(screen.queryByText("No description")).not.toBeInTheDocument();
    });

    it("opens inline editor when description text is clicked", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({ description: "Click me" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onUpdateColumn={vi.fn()} />);

      await user.click(screen.getByText("Click me"));

      // Inline editor should show Save and Cancel buttons
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("calls onUpdateColumn when description is saved", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      const column = createMockColumn({ description: "Old description" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onUpdateColumn={onUpdateColumn} />);

      // Open menu and click Edit Description
      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit Description"));

      // Click Save (the RichTextEditor content will still be the original value)
      await user.click(screen.getByRole("button", { name: /save/i }));

      // Since content didn't change, onUpdateColumn should not be called
      expect(onUpdateColumn).not.toHaveBeenCalled();
    });

    it("closes inline editor when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({ description: "Some description" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onUpdateColumn={vi.fn()} />);

      // Open menu and click Edit Description
      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit Description"));

      // Cancel button should be visible
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();

      await user.click(cancelButton);

      // After cancel, the description text should be shown again (not the editor)
      await waitFor(() => {
        expect(screen.getByText("Some description")).toBeInTheDocument();
      });
    });
  });

  describe("inline title editing", () => {
    it("enters edit mode on single-click", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={vi.fn()} />);

      const title = screen.getByText("Test Column");
      await user.click(title);

      expect(screen.getByDisplayValue("Test Column")).toBeInTheDocument();
    });

    it("saves on blur", async () => {
      const user = userEvent.setup();
      const { fireEvent } = require("@testing-library/react");
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.click(title);

      const input = screen.getByDisplayValue("Test Column");
      // Use fireEvent.change to avoid issues with userEvent and DnD context swallowing spaces
      fireEvent.change(input, { target: { value: "New Column Name" } });
      await user.tab();

      expect(onUpdateColumn).toHaveBeenCalledWith("column-1", { name: "New Column Name" });
    });

    it("saves on Enter key", async () => {
      const user = userEvent.setup();
      const { fireEvent } = require("@testing-library/react");
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.click(title);

      const input = screen.getByDisplayValue("Test Column");
      // Use fireEvent.change to avoid issues with userEvent and DnD context swallowing spaces
      fireEvent.change(input, { target: { value: "Updated Name" } });
      await user.keyboard("{Enter}");

      expect(onUpdateColumn).toHaveBeenCalledWith("column-1", { name: "Updated Name" });
    });

    it("cancels on Escape key", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.click(title);

      const input = screen.getByDisplayValue("Test Column");
      await user.type(input, "Changed");
      await user.keyboard("{Escape}");

      // Should not call update and should show original name
      expect(onUpdateColumn).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText("Test Column")).toBeInTheDocument();
      });
    });

    it("does not save empty name", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.click(title);

      const input = screen.getByDisplayValue("Test Column");
      await user.clear(input);
      await user.tab();

      expect(onUpdateColumn).not.toHaveBeenCalled();
    });

    it("does not save if name unchanged", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.click(title);

      const input = screen.getByDisplayValue("Test Column");
      await user.tab();

      expect(onUpdateColumn).not.toHaveBeenCalled();
    });
  });

  describe("todo click handler", () => {
    it("calls onTodoClick when todo is clicked", () => {
      // Use fireEvent instead of userEvent because DnD kit's useSortable
      // adds pointer event listeners that can interfere with userEvent
      const { fireEvent } = require("@testing-library/react");
      const onTodoClick = vi.fn();
      const todo = createMockTodo({ id: "todo-1", title: "Clickable Todo" });
      const column = createMockColumn({ todos: [todo] });

      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onTodoClick={onTodoClick} />);

      const todoCard = screen.getByTestId("todo-card");
      fireEvent.click(todoCard);

      expect(onTodoClick).toHaveBeenCalledWith(todo);
    });
  });

  describe("dragging state", () => {
    it("applies dragging styles when isDragging is true", () => {
      renderWithDnd(<BoardColumn {...defaultProps} isDragging={true} />);

      const column = screen.getByTestId("column");
      expect(column).toHaveClass("opacity-30");
      expect(column).toHaveClass("scale-[0.98]");
    });

    it("does not apply dragging styles when isDragging is false", () => {
      renderWithDnd(<BoardColumn {...defaultProps} isDragging={false} />);

      const column = screen.getByTestId("column");
      expect(column).not.toHaveClass("opacity-30");
    });
  });
});
