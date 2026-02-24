import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { TodoEditModal } from "./TodoEditModal";
import { server } from "../../test/mocks/server";
import { http, HttpResponse } from "msw";
import { createMockTodo, mockLabels } from "../../test/mocks/handlers";
import type { Todo, Priority } from "../../types";

// Factory function for creating mock todos
const createTestTodo = (overrides: Partial<Todo> = {}): Todo => ({
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

describe("TodoEditModal", () => {
  beforeEach(() => {
    server.resetHandlers();
    server.use(
      http.get(`/api/labels`, () => {
        return HttpResponse.json(mockLabels);
      })
    );
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={false}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Edit Task")).toBeInTheDocument();
    });

    it("renders nothing when todo is null", () => {
      render(
        <TodoEditModal
          todo={null}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders title field with current value", () => {
      const todo = createTestTodo({ title: "My Task Title" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByLabelText("Title")).toHaveValue("My Task Title");
    });

    it("renders description field with current value", () => {
      const todo = createTestTodo({ description: "Task description here" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      // Description uses RichTextEditor (Tiptap), not a textarea
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Task description here")).toBeInTheDocument();
    });

    it("renders priority buttons", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByText("LOW")).toBeInTheDocument();
      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
      expect(screen.getByText("HIGH")).toBeInTheDocument();
      expect(screen.getByText("URGENT")).toBeInTheDocument();
    });

    it("renders due date field", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByLabelText("Due Date")).toBeInTheDocument();
    });

    it("renders due date with pre-filled value when set", () => {
      const todo = createTestTodo({ dueDate: "2026-03-15T00:00:00.000Z" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByLabelText("Due Date")).toHaveValue("2026-03-15");
    });

    it("renders Save and Cancel buttons", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel/i })
      ).toBeInTheDocument();
    });

    it("renders Delete button when onDelete is provided", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
        />
      );
      expect(
        screen.getByRole("button", { name: /Delete/i })
      ).toBeInTheDocument();
    });

    it("does not render Delete button when onDelete is not provided", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(
        screen.queryByRole("button", { name: /Delete/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("editing fields", () => {
    it("updates title when typing", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo({ title: "Original Title" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      await user.clear(titleInput);
      await user.type(titleInput, "New Title");

      expect(titleInput).toHaveValue("New Title");
    });

    it("renders description editor as editable", () => {
      const todo = createTestTodo({ description: "" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      // Description uses RichTextEditor (Tiptap) with contenteditable
      const editor = screen.getByTestId("rich-text-editor");
      const contentEditable = editor.querySelector('[contenteditable="true"]');
      expect(contentEditable).toBeInTheDocument();
    });

    it("changes priority when clicking priority button", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo({ priority: "MEDIUM" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      // Click HIGH priority button
      const highButton = screen.getByText("HIGH").closest("button");
      await user.click(highButton!);

      // The HIGH button should now have selected styles
      expect(highButton).toHaveClass("border-primary");
    });

    it("updates due date when selected", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      const dateInput = screen.getByLabelText("Due Date");
      await user.type(dateInput, "2026-06-15");

      expect(dateInput).toHaveValue("2026-06-15");
    });

    it("clears due date when cleared", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo({ dueDate: "2026-03-15T00:00:00.000Z" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      const dateInput = screen.getByLabelText("Due Date");
      await user.clear(dateInput);

      expect(dateInput).toHaveValue("");
    });
  });

  describe("save functionality", () => {
    it("calls onSave with updated title", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const todo = createTestTodo({ title: "Original" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");
      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Updated Title" })
      );
    });

    it("renders description with pre-existing content", () => {
      const onSave = vi.fn();
      const todo = createTestTodo({ description: "Original desc" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      // RichTextEditor renders the markdown content as rich text
      expect(screen.getByText("Original desc")).toBeInTheDocument();
    });

    it("calls onSave with updated priority", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const todo = createTestTodo({ priority: "MEDIUM" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      await user.click(screen.getByText("URGENT").closest("button")!);
      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "URGENT" })
      );
    });

    it("converts date to ISO datetime format before saving", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const dateInput = screen.getByLabelText("Due Date");
      await user.type(dateInput, "2026-02-15");
      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        })
      );
    });

    it("sends null for cleared due date", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const todo = createTestTodo({ dueDate: "2026-03-15T00:00:00.000Z" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const dateInput = screen.getByLabelText("Due Date");
      await user.clear(dateInput);
      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ dueDate: null })
      );
    });

    it("calls onClose when no changes are made", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onClose = vi.fn();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it("does not call onSave with empty title", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const todo = createTestTodo({ title: "Original" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      await user.clear(titleInput);
      await user.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).not.toHaveBeenCalled();
    });

    it("disables Save button when title is empty", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo({ title: "Original" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      await user.clear(titleInput);

      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    });

    it("saves on Ctrl+Enter keyboard shortcut", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const todo = createTestTodo({ title: "Original" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated");
      await user.keyboard("{Control>}{Enter}{/Control}");

      expect(onSave).toHaveBeenCalled();
    });
  });

  describe("cancel functionality", () => {
    it("calls onClose when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={onClose}
          onSave={() => {}}
        />
      );

      await user.click(screen.getByRole("button", { name: /Cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("delete functionality", () => {
    it("shows confirmation dialog when Delete is clicked", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
        />
      );

      await user.click(screen.getByRole("button", { name: /Delete/i }));

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("shows Confirm Delete and Cancel buttons in confirmation", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
        />
      );

      await user.click(screen.getByRole("button", { name: /Delete/i }));

      expect(
        screen.getByRole("button", { name: /Confirm Delete/i })
      ).toBeInTheDocument();
      // There should be a Cancel button in the confirmation
      const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("does not call onDelete when Cancel is clicked in confirmation", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /Delete/i }));
      // Find the Cancel button in the confirmation dialog (the one inside the red background)
      const confirmationCancel = screen
        .getByText(/are you sure/i)
        .closest("div")!
        .querySelector('button:first-of-type');
      await user.click(confirmationCancel!);

      expect(onDelete).not.toHaveBeenCalled();
    });

    it("calls onDelete when Confirm Delete is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /Delete/i }));
      await user.click(screen.getByRole("button", { name: /Confirm Delete/i }));

      expect(onDelete).toHaveBeenCalled();
    });

    it("hides Delete button while confirmation is shown", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
        />
      );

      await user.click(screen.getByRole("button", { name: /Delete/i }));

      // The original Delete button should be hidden
      expect(
        screen.queryByRole("button", { name: /^Delete$/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("displays error message when error prop is set", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          error="Something went wrong"
        />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("does not display error when error prop is null", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          error={null}
        />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps modal open when there is an error", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          error="API Error"
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows Saving... text when isLoading is true", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          isLoading={true}
        />
      );

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("disables Save button when isLoading is true", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          isLoading={true}
        />
      );

      expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
    });

    it("disables Cancel button when isLoading is true", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          isLoading={true}
        />
      );

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
    });

    it("shows Deleting... text during delete loading", async () => {
      const user = userEvent.setup();
      const todo = createTestTodo();
      const { rerender } = render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
          isLoading={false}
        />
      );

      // First click Delete to show confirmation
      await user.click(screen.getByRole("button", { name: /Delete/i }));

      // Now rerender with isLoading=true to simulate delete in progress
      rerender(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
          isLoading={true}
        />
      );

      expect(screen.getByText("Deleting...")).toBeInTheDocument();
    });
  });

  describe("state synchronization", () => {
    it("resets form when todo prop changes", async () => {
      const todo1 = createTestTodo({ id: "1", title: "First Todo" });
      const todo2 = createTestTodo({ id: "2", title: "Second Todo" });

      const { rerender } = render(
        <TodoEditModal
          todo={todo1}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByLabelText("Title")).toHaveValue("First Todo");

      rerender(
        <TodoEditModal
          todo={todo2}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByLabelText("Title")).toHaveValue("Second Todo");
    });

    it("resets delete confirmation when todo changes", async () => {
      const user = userEvent.setup();
      const todo1 = createTestTodo({ id: "1", title: "First Todo" });
      const todo2 = createTestTodo({ id: "2", title: "Second Todo" });

      const { rerender } = render(
        <TodoEditModal
          todo={todo1}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
        />
      );

      await user.click(screen.getByRole("button", { name: /Delete/i }));
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      rerender(
        <TodoEditModal
          todo={todo2}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          onDelete={() => {}}
        />
      );

      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles empty description", () => {
      const todo = createTestTodo({ description: "" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      // RichTextEditor renders with empty content - just verify it's present
      const editor = screen.getByTestId("rich-text-editor");
      expect(editor).toBeInTheDocument();
    });

    it("handles undefined description", () => {
      const todo = createTestTodo({ description: undefined });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      // RichTextEditor renders with empty content - just verify it's present
      const editor = screen.getByTestId("rich-text-editor");
      expect(editor).toBeInTheDocument();
    });

    it("handles very long title", () => {
      const longTitle = "A".repeat(500);
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: longTitle } });

      expect(titleInput).toHaveValue(longTitle);
    });

    it("handles special characters in title", () => {
      const onSave = vi.fn();
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: "<script>alert('xss')</script>" } });
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "<script>alert('xss')</script>",
        })
      );
    });

    it("handles whitespace-only title", () => {
      const onSave = vi.fn();
      const todo = createTestTodo({ title: "Original" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: "   " } });
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).not.toHaveBeenCalled();
    });

    it("handles todo with labels", async () => {
      const todo = createTestTodo({
        labels: [
          { id: "label-1", name: "Bug", color: "#FF0000" },
          { id: "label-2", name: "Feature", color: "#00FF00" },
        ],
      });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      // Labels section should be rendered
      expect(screen.getByText("Labels")).toBeInTheDocument();
    });

    it("trims whitespace from title before saving", () => {
      const onSave = vi.fn();
      const todo = createTestTodo({ title: "Original" });
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByLabelText("Title");
      fireEvent.change(titleInput, { target: { value: "  Trimmed Title  " } });
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Trimmed Title" })
      );
    });
  });

  describe("accessibility", () => {
    it("has dialog role", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has proper form labels", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByLabelText("Title")).toBeInTheDocument();
      // Description uses RichTextEditor (Tiptap) which doesn't have a label association
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
      expect(screen.getByLabelText("Due Date")).toBeInTheDocument();
    });

    it("error alert has alert role", () => {
      const todo = createTestTodo();
      render(
        <TodoEditModal
          todo={todo}
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          error="Test error"
        />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
