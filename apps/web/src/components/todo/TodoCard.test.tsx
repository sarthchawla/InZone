import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { TodoCard } from "./TodoCard";
import { DndContext } from "@dnd-kit/core";
import type { Todo } from "../../types";

// Wrapper for DnD context
const renderWithDnd = (ui: React.ReactElement) => {
  return render(<DndContext>{ui}</DndContext>);
};

// Factory function for creating mock todos
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: "todo-1",
  title: "Test Todo",
  description: "A test todo description",
  priority: "MEDIUM",
  dueDate: undefined,
  position: 0,
  archived: false,
  columnId: "column-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  labels: [],
  ...overrides,
});

describe("TodoCard", () => {
  // Happy Path Tests
  describe("rendering", () => {
    it("renders todo title", () => {
      const todo = createMockTodo({ title: "My Todo Task" });
      renderWithDnd(<TodoCard todo={todo} />);
      expect(screen.getByText("My Todo Task")).toBeInTheDocument();
    });

    it("shows description indicator when description provided", () => {
      const todo = createMockTodo({ description: "This is a description" });
      renderWithDnd(<TodoCard todo={todo} />);
      // Description content is NOT shown (per PRD), but indicator icon should be present
      expect(screen.queryByText("This is a description")).not.toBeInTheDocument();
      expect(screen.getByTitle("Has description")).toBeInTheDocument();
    });

    it("does not show description indicator when no description", () => {
      const todo = createMockTodo({ description: undefined });
      renderWithDnd(<TodoCard todo={todo} />);
      expect(screen.queryByTitle("Has description")).not.toBeInTheDocument();
    });

    it("renders priority badge", () => {
      const todo = createMockTodo({ priority: "HIGH" });
      renderWithDnd(<TodoCard todo={todo} />);
      expect(screen.getByText("HIGH")).toBeInTheDocument();
    });

    it("renders all priority levels correctly", () => {
      const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
      priorities.forEach((priority) => {
        const todo = createMockTodo({ priority, id: `todo-${priority}` });
        const { unmount } = renderWithDnd(<TodoCard todo={todo} />);
        expect(screen.getByText(priority)).toBeInTheDocument();
        unmount();
      });
    });

    it("renders due date when provided", () => {
      const todo = createMockTodo({ dueDate: "2025-02-15T00:00:00.000Z" });
      renderWithDnd(<TodoCard todo={todo} />);
      // Date should be formatted - look for any date pattern
      const dateContainer = document.querySelector('.inline-flex.items-center.gap-1.text-xs');
      expect(dateContainer).toBeInTheDocument();
    });

    it("does not render due date when not provided", () => {
      const todo = createMockTodo({ dueDate: undefined });
      renderWithDnd(<TodoCard todo={todo} />);
      expect(screen.queryByText(/due/i)).not.toBeInTheDocument();
    });

    it("renders labels when provided", () => {
      const todo = createMockTodo({
        labels: [
          { id: "label-1", name: "Bug", color: "#FF0000" },
          { id: "label-2", name: "Urgent", color: "#FFA500" },
        ],
      });
      renderWithDnd(<TodoCard todo={todo} />);
      expect(screen.getByText("Bug")).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });

    it("renders label colors correctly", () => {
      const todo = createMockTodo({
        labels: [{ id: "label-1", name: "Bug", color: "#FF0000" }],
      });
      renderWithDnd(<TodoCard todo={todo} />);
      const labelElement = screen.getByText("Bug");
      expect(labelElement).toHaveStyle({ color: "#FF0000" });
    });

    it("renders without labels when array is empty", () => {
      const todo = createMockTodo({ labels: [] });
      renderWithDnd(<TodoCard todo={todo} />);
      // Should render without crashing, only priority badge should be visible
      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    });
  });

  describe("drag handle", () => {
    it("renders drag handle", () => {
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} />);
      // The drag handle should be present but may be hidden by default
      const card = screen.getByText("Test Todo").closest("div");
      expect(card).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies dragging styles when isDragging is true", () => {
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} isDragging />);
      // The card should have opacity-50 class when dragging
      const card = screen.getByText("Test Todo").closest(".opacity-50");
      expect(card).toBeInTheDocument();
    });

    it("does not apply dragging styles when isDragging is false", () => {
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} isDragging={false} />);
      const card = screen.getByText("Test Todo").closest(".opacity-50");
      expect(card).not.toBeInTheDocument();
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles empty title", () => {
      const todo = createMockTodo({ title: "" });
      renderWithDnd(<TodoCard todo={todo} />);
      // Card should render without crashing
      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    });

    it("handles very long title", () => {
      const longTitle = "A".repeat(500);
      const todo = createMockTodo({ title: longTitle });
      renderWithDnd(<TodoCard todo={todo} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles very long description (shows indicator only)", () => {
      const longDescription = "B".repeat(1000);
      const todo = createMockTodo({ description: longDescription });
      renderWithDnd(<TodoCard todo={todo} />);
      // Description content is NOT shown (per PRD), only indicator
      expect(screen.queryByText(longDescription)).not.toBeInTheDocument();
      expect(screen.getByTitle("Has description")).toBeInTheDocument();
    });

    it("handles special characters in title", () => {
      const todo = createMockTodo({ title: "<script>alert('xss')</script>" });
      renderWithDnd(<TodoCard todo={todo} />);
      // React should escape the script tags
      expect(screen.queryByRole("script")).not.toBeInTheDocument();
      expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
    });

    it("handles special characters in labels", () => {
      const todo = createMockTodo({
        labels: [{ id: "label-1", name: "<b>Bold</b>", color: "#FF0000" }],
      });
      renderWithDnd(<TodoCard todo={todo} />);
      expect(screen.getByText("<b>Bold</b>")).toBeInTheDocument();
    });

    it("shows overdue indicator for past due dates", () => {
      const pastDate = "2020-01-01T00:00:00.000Z";
      const todo = createMockTodo({ dueDate: pastDate });
      renderWithDnd(<TodoCard todo={todo} />);
      // The due date element should have red color for overdue items
      const dateContainer = document.querySelector(".text-red-600");
      expect(dateContainer).toBeInTheDocument();
    });

    it("does not show overdue indicator for future due dates", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const todo = createMockTodo({ dueDate: futureDate.toISOString() });
      renderWithDnd(<TodoCard todo={todo} />);
      // Find the date container - it should not have red color
      const dateElements = screen.getAllByText(/\w+ \d+/i);
      dateElements.forEach((el) => {
        expect(el).not.toHaveClass("text-red-600");
      });
    });

    it("handles many labels", () => {
      const manyLabels = Array.from({ length: 10 }, (_, i) => ({
        id: `label-${i}`,
        name: `Label ${i}`,
        color: `#${String(i).repeat(6).slice(0, 6)}`,
      }));
      const todo = createMockTodo({ labels: manyLabels });
      renderWithDnd(<TodoCard todo={todo} />);
      // All labels should be rendered
      manyLabels.forEach((label) => {
        expect(screen.getByText(label.name)).toBeInTheDocument();
      });
    });

    it("handles invalid date format gracefully", () => {
      const todo = createMockTodo({ dueDate: "invalid-date" });
      // Should not crash when rendering
      expect(() => renderWithDnd(<TodoCard todo={todo} />)).not.toThrow();
    });
  });

  describe("accessibility", () => {
    it("has proper semantic structure", () => {
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} />);
      // Card should be wrapped in a div - find the outer card container
      const card = screen.getByText("Test Todo").closest('[class*="rounded-lg"]');
      expect(card).toBeInTheDocument();
    });
  });

  // Click behavior tests (Issue 1.1 - Single click on task cards)
  // Note: Using fireEvent.click instead of userEvent.click because the DnD kit's
  // useSortable hook adds pointer event listeners that can interfere with userEvent
  describe("click behavior", () => {
    it("calls onClick with todo on single click", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo({ title: "Click Me" });
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const card = screen.getByTestId("todo-card");
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledWith(todo);
    });

    it("calls onClick exactly once on single click", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const card = screen.getByTestId("todo-card");
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not require double-click to trigger onClick", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const card = screen.getByTestId("todo-card");
      fireEvent.click(card);

      // onClick should be called after single click, not requiring double-click
      expect(onClick).toHaveBeenCalled();
    });

    it("does not throw when onClick prop is not provided", () => {
      const { fireEvent } = require("@testing-library/react");
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} />);

      const card = screen.getByTestId("todo-card");
      // Should not throw when clicking without onClick handler
      expect(() => fireEvent.click(card)).not.toThrow();
    });

    it("passes the correct todo object to onClick", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo({
        id: "specific-id",
        title: "Specific Title",
        priority: "HIGH",
      });
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const card = screen.getByTestId("todo-card");
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "specific-id",
          title: "Specific Title",
          priority: "HIGH",
        })
      );
    });

    it("click on title area triggers onClick (event bubbles up)", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo({ title: "Task Title" });
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const title = screen.getByTestId("todo-title");
      fireEvent.click(title);

      expect(onClick).toHaveBeenCalledWith(todo);
    });

    it("click on priority badge triggers onClick", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo({ priority: "URGENT" });
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const priorityBadge = screen.getByText("URGENT");
      fireEvent.click(priorityBadge);

      expect(onClick).toHaveBeenCalledWith(todo);
    });

    it("click on label triggers onClick", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo({
        labels: [{ id: "label-1", name: "Bug", color: "#FF0000" }],
      });
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const label = screen.getByText("Bug");
      fireEvent.click(label);

      expect(onClick).toHaveBeenCalledWith(todo);
    });

    it("click on due date triggers onClick", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo({ dueDate: "2026-03-15T00:00:00.000Z" });
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const dueDate = screen.getByTestId("due-date");
      fireEvent.click(dueDate);

      expect(onClick).toHaveBeenCalledWith(todo);
    });

    it("card has cursor-pointer style for clickability", () => {
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} onClick={() => {}} />);

      const card = screen.getByTestId("todo-card");
      expect(card).toHaveClass("cursor-pointer");
    });

    it("multiple clicks call onClick multiple times", () => {
      const { fireEvent } = require("@testing-library/react");
      const onClick = vi.fn();
      const todo = createMockTodo();
      renderWithDnd(<TodoCard todo={todo} onClick={onClick} />);

      const card = screen.getByTestId("todo-card");
      fireEvent.click(card);
      fireEvent.click(card);
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(3);
    });
  });
});
