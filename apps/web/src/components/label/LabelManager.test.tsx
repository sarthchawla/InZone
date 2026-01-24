import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { LabelManager } from "./LabelManager";
import { server } from "../../test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockLabels, createMockLabel } from "../../test/mocks/handlers";

describe("LabelManager", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders when isOpen is true", async () => {
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Manage Labels")).toBeInTheDocument();
      });
    });

    it("does not render when isOpen is false", () => {
      render(<LabelManager isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText("Manage Labels")).not.toBeInTheDocument();
    });

    it("renders existing labels", async () => {
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });
      expect(screen.getByText("Feature")).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });

    it("shows label colors", async () => {
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Color indicators should be present as span elements with background color
      const colorIndicators = document.querySelectorAll(
        'span[style*="background-color"]'
      );
      expect(colorIndicators.length).toBeGreaterThan(0);
    });

    it("shows create new label button", async () => {
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });
    });

    it("shows loading state", () => {
      // Delay the API response
      server.use(
        http.get("/api/labels", async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(mockLabels);
        })
      );

      render(<LabelManager {...defaultProps} />);
      expect(screen.getByText("Loading labels...")).toBeInTheDocument();
    });
  });

  describe("create label", () => {
    it("shows create form when Create New Label is clicked", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));

      expect(screen.getByPlaceholderText("Label name")).toBeInTheDocument();
    });

    it("shows color picker in create form", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));

      // Should show multiple color swatches
      const colorButtons = document.querySelectorAll('button[style*="background-color"]');
      expect(colorButtons.length).toBeGreaterThanOrEqual(10);
    });

    it("creates label successfully", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "New Test Label");

      await user.click(screen.getByRole("button", { name: /^create label$/i }));

      // Form should close after successful creation
      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Label name")).not.toBeInTheDocument();
      });
    });

    it("cancels create form when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));
      expect(screen.getByPlaceholderText("Label name")).toBeInTheDocument();

      // Find and click cancel button in the create form
      const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
      await user.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Label name")).not.toBeInTheDocument();
      });
    });

    it("cancels create form on Escape key", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));
      expect(screen.getByPlaceholderText("Label name")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Label name")).not.toBeInTheDocument();
      });
    });

    it("submits on Enter key", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "Enter Key Label{Enter}");

      // Form should close after successful creation
      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Label name")).not.toBeInTheDocument();
      });
    });
  });

  describe("edit label", () => {
    it("shows edit form when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Find and click the edit button for Bug label
      const bugRow = screen.getByText("Bug").closest("div");
      const editButton = bugRow?.querySelector('button:first-of-type');

      if (editButton) {
        await user.click(editButton);
      }

      // Input should appear with the label name
      const input = screen.getByDisplayValue("Bug");
      expect(input).toBeInTheDocument();
    });

    it("saves edited label on check button click", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Enter edit mode
      const bugRow = screen.getByText("Bug").closest("div");
      const editButton = bugRow?.querySelector('button:first-of-type');

      if (editButton) {
        await user.click(editButton);
      }

      // Change the name
      const input = screen.getByDisplayValue("Bug");
      await user.clear(input);
      await user.type(input, "Bug Fixed");

      // Find and click the save button (check icon)
      const saveButton = screen.getAllByRole("button").find((btn) =>
        btn.querySelector('svg.text-green-600')
      );

      if (saveButton) {
        await user.click(saveButton);
      }
    });

    it("cancels edit on X button click", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Enter edit mode
      const bugRow = screen.getByText("Bug").closest("div");
      const editButton = bugRow?.querySelector('button:first-of-type');

      if (editButton) {
        await user.click(editButton);
      }

      // Find and click the cancel button (X icon)
      const cancelButton = screen.getAllByRole("button").find((btn) =>
        btn.querySelector('svg.text-gray-500')
      );

      if (cancelButton) {
        await user.click(cancelButton);
      }

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryByDisplayValue("Bug")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Bug")).toBeInTheDocument();
    });

    it("cancels edit on Escape key", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Enter edit mode
      const bugRow = screen.getByText("Bug").closest("div");
      const editButton = bugRow?.querySelector('button:first-of-type');

      if (editButton) {
        await user.click(editButton);
      }

      await user.keyboard("{Escape}");

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryByDisplayValue("Bug")).not.toBeInTheDocument();
      });
    });
  });

  describe("delete label", () => {
    it("shows delete confirmation when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Find and click the delete button for Bug label
      const bugRow = screen.getByText("Bug").closest("div");
      const buttons = bugRow?.querySelectorAll("button");
      const deleteButton = buttons?.[buttons.length - 1];

      if (deleteButton) {
        await user.click(deleteButton);
      }

      // Should show delete confirmation
      expect(screen.getByText(/delete "bug"\?/i)).toBeInTheDocument();
      expect(screen.getByText(/this will remove the label from all todos/i)).toBeInTheDocument();
    });

    it("deletes label when confirmed", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Click delete button
      const bugRow = screen.getByText("Bug").closest("div");
      const buttons = bugRow?.querySelectorAll("button");
      const deleteButton = buttons?.[buttons.length - 1];

      if (deleteButton) {
        await user.click(deleteButton);
      }

      // Confirm deletion
      await user.click(screen.getByRole("button", { name: /^delete$/i }));
    });

    it("cancels deletion when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Click delete button
      const bugRow = screen.getByText("Bug").closest("div");
      const buttons = bugRow?.querySelectorAll("button");
      const deleteButton = buttons?.[buttons.length - 1];

      if (deleteButton) {
        await user.click(deleteButton);
      }

      // Cancel deletion
      const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
      await user.click(cancelButtons[cancelButtons.length - 1]);

      // Confirmation should disappear
      await waitFor(() => {
        expect(screen.queryByText(/delete "bug"\?/i)).not.toBeInTheDocument();
      });
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles empty labels list", async () => {
      server.use(
        http.get("/api/labels", () => {
          return HttpResponse.json([]);
        })
      );

      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No labels yet")).toBeInTheDocument();
      });
      expect(screen.getByText("Create labels to categorize your todos")).toBeInTheDocument();
    });

    it("disables create button when name is empty", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));

      const createButton = screen.getByRole("button", { name: /^create label$/i });
      expect(createButton).toBeDisabled();
    });

    it("disables create button for whitespace-only name", async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "   ");

      const createButton = screen.getByRole("button", { name: /^create label$/i });
      expect(createButton).toBeDisabled();
    });

    it("handles API error on create", async () => {
      server.use(
        http.post("/api/labels", () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        })
      );

      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Create New Label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create New Label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "Test Label");

      await user.click(screen.getByRole("button", { name: /^create label$/i }));

      // Form should remain open due to error
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Label name")).toBeInTheDocument();
      });
    });

    it("handles API error on update", async () => {
      server.use(
        http.put("/api/labels/:id", () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        })
      );

      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Enter edit mode
      const bugRow = screen.getByText("Bug").closest("div");
      const editButton = bugRow?.querySelector('button:first-of-type');

      if (editButton) {
        await user.click(editButton);
      }

      // Try to save
      const saveButton = screen.getAllByRole("button").find((btn) =>
        btn.querySelector('svg.text-green-600')
      );

      if (saveButton) {
        await user.click(saveButton);
      }

      // Edit mode should remain active due to error
      await waitFor(() => {
        expect(screen.getByDisplayValue("Bug")).toBeInTheDocument();
      });
    });

    it("handles API error on delete", async () => {
      server.use(
        http.delete("/api/labels/:id", () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        })
      );

      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Click delete button
      const bugRow = screen.getByText("Bug").closest("div");
      const buttons = bugRow?.querySelectorAll("button");
      const deleteButton = buttons?.[buttons.length - 1];

      if (deleteButton) {
        await user.click(deleteButton);
      }

      // Confirm deletion
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      // Confirmation should remain due to error
      await waitFor(() => {
        expect(screen.getByText(/delete "bug"\?/i)).toBeInTheDocument();
      });
    });
  });

  describe("modal behavior", () => {
    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<LabelManager isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Manage Labels")).toBeInTheDocument();
      });

      // Find the close button (X in modal header)
      const closeButton = screen.getByRole("button", { name: "" });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
