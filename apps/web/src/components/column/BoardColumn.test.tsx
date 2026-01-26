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
      // The more options button should be present with aria-label
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

  describe("column options menu", () => {
    it("opens menu when options button is clicked", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/column options/i));

      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("closes menu when clicking outside", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/column options/i));
      expect(screen.getByText("Edit")).toBeInTheDocument();

      // Click outside the menu (on the column header)
      await user.click(screen.getByTestId("column-header"));

      await waitFor(() => {
        expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      });
    });

    it("opens edit modal when Edit is clicked", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit"));

      expect(screen.getByText("Edit Column")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });

    it("opens delete confirmation when Delete is clicked", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} onDeleteColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Delete"));

      expect(screen.getByText("Delete Column")).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  describe("edit column modal", () => {
    it("pre-fills current column name", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({ name: "Current Name" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onUpdateColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit"));

      expect(screen.getByLabelText("Name")).toHaveValue("Current Name");
    });

    it("pre-fills current column description", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({ description: "Current Description" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onUpdateColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit"));

      expect(screen.getByLabelText("Description")).toHaveValue("Current Description");
    });

    it("calls onUpdateColumn with new values when saved", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      const column = createMockColumn({ name: "Old Name", description: "Old Desc" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onUpdateColumn={onUpdateColumn} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit"));

      const nameInput = screen.getByLabelText("Name");
      await user.clear(nameInput);
      await user.type(nameInput, "New Name");

      const descInput = screen.getByLabelText("Description");
      await user.clear(descInput);
      await user.type(descInput, "New Description");

      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onUpdateColumn).toHaveBeenCalledWith("column-1", {
        name: "New Name",
        description: "New Description",
      });
    });

    it("does not call onUpdateColumn when no changes made", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit"));
      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onUpdateColumn).not.toHaveBeenCalled();
    });

    it("closes modal when Cancel is clicked", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit"));
      expect(screen.getByText("Edit Column")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText("Edit Column")).not.toBeInTheDocument();
      });
    });

    it("disables Save button when name is empty", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Edit"));

      const nameInput = screen.getByLabelText("Name");
      await user.clear(nameInput);

      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    });
  });

  describe("delete column modal", () => {
    it("calls onDeleteColumn when confirmed", async () => {
      const user = userEvent.setup();
      const onDeleteColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onDeleteColumn={onDeleteColumn} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Delete"));
      await user.click(screen.getByRole("button", { name: /^Delete$/i }));

      expect(onDeleteColumn).toHaveBeenCalledWith("column-1");
    });

    it("does not call onDeleteColumn when cancelled", async () => {
      const user = userEvent.setup();
      const onDeleteColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onDeleteColumn={onDeleteColumn} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Delete"));
      await user.click(screen.getByRole("button", { name: /Cancel/i }));

      expect(onDeleteColumn).not.toHaveBeenCalled();
    });

    it("shows task count warning when column has tasks", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({
        todos: [createMockTodo({ id: "1" }), createMockTodo({ id: "2" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onDeleteColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Delete"));

      expect(screen.getByText(/will also delete 2 tasks/i)).toBeInTheDocument();
    });

    it("uses correct grammar for single task", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({
        todos: [createMockTodo({ id: "1" })],
      });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} onDeleteColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Delete"));

      expect(screen.getByText(/will also delete 1 task\./i)).toBeInTheDocument();
    });

    it("closes modal after deletion", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} onDeleteColumn={vi.fn()} />);

      await user.click(screen.getByLabelText(/column options/i));
      await user.click(screen.getByText("Delete"));
      expect(screen.getByText("Delete Column")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^Delete$/i }));

      await waitFor(() => {
        expect(screen.queryByText("Delete Column")).not.toBeInTheDocument();
      });
    });
  });

  describe("inline title editing", () => {
    it("enters edit mode on double-click", async () => {
      const user = userEvent.setup();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={vi.fn()} />);

      const title = screen.getByText("Test Column");
      await user.dblClick(title);

      expect(screen.getByDisplayValue("Test Column")).toBeInTheDocument();
    });

    it("saves on blur", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.dblClick(title);

      const input = screen.getByDisplayValue("Test Column");
      await user.clear(input);
      await user.type(input, "New Column Name");
      await user.tab();

      expect(onUpdateColumn).toHaveBeenCalledWith("column-1", { name: "New Column Name" });
    });

    it("saves on Enter key", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.dblClick(title);

      const input = screen.getByDisplayValue("Test Column");
      await user.clear(input);
      await user.type(input, "Updated Name{Enter}");

      expect(onUpdateColumn).toHaveBeenCalledWith("column-1", { name: "Updated Name" });
    });

    it("cancels on Escape key", async () => {
      const user = userEvent.setup();
      const onUpdateColumn = vi.fn();
      renderWithDnd(<BoardColumn {...defaultProps} onUpdateColumn={onUpdateColumn} />);

      const title = screen.getByText("Test Column");
      await user.dblClick(title);

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
      await user.dblClick(title);

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
      await user.dblClick(title);

      const input = screen.getByDisplayValue("Test Column");
      await user.tab();

      expect(onUpdateColumn).not.toHaveBeenCalled();
    });
  });

  describe("description tooltip", () => {
    it("shows info icon when column has description", () => {
      const column = createMockColumn({ description: "Column description here" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} />);

      expect(screen.getByLabelText("View description")).toBeInTheDocument();
    });

    it("does not show info icon when no description", () => {
      const column = createMockColumn({ description: undefined });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} />);

      expect(screen.queryByLabelText("View description")).not.toBeInTheDocument();
    });

    it("shows tooltip on hover", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({ description: "Hover description" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} />);

      const infoButton = screen.getByLabelText("View description");
      await user.hover(infoButton);

      await waitFor(() => {
        expect(screen.getByText("Hover description")).toBeInTheDocument();
      });
    });

    it("hides tooltip on unhover", async () => {
      const user = userEvent.setup();
      const column = createMockColumn({ description: "Hover description" });
      renderWithDnd(<BoardColumn column={column} onAddTodo={vi.fn()} />);

      const infoButton = screen.getByLabelText("View description");
      await user.hover(infoButton);

      await waitFor(() => {
        expect(screen.getByText("Hover description")).toBeInTheDocument();
      });

      await user.unhover(infoButton);

      await waitFor(() => {
        expect(screen.queryByText("Hover description")).not.toBeInTheDocument();
      });
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
      expect(column).toHaveClass("opacity-50");
      expect(column).toHaveClass("rotate-3");
    });

    it("does not apply dragging styles when isDragging is false", () => {
      renderWithDnd(<BoardColumn {...defaultProps} isDragging={false} />);

      const column = screen.getByTestId("column");
      expect(column).not.toHaveClass("opacity-50");
    });
  });
});
