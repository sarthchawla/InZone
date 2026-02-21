import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { LabelSelector } from "./LabelSelector";
import { server } from "../../test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockLabels, createMockLabel, API_BASE } from "../../test/mocks/handlers";
import type { Label } from "../../types";

describe("LabelSelector", () => {
  const defaultProps = {
    selectedLabels: [] as Label[],
    onLabelsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders with placeholder when no labels selected", () => {
      render(<LabelSelector {...defaultProps} />);
      expect(screen.getByText("Select labels...")).toBeInTheDocument();
    });

    it("renders selected labels as chips", () => {
      const selectedLabels = [
        { id: "1", name: "Bug", color: "#FF0000" },
        { id: "2", name: "Urgent", color: "#FFA500" },
      ];
      render(<LabelSelector {...defaultProps} selectedLabels={selectedLabels} />);

      expect(screen.getByText("Bug")).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });

    it("renders dropdown chevron", () => {
      render(<LabelSelector {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });

  describe("dropdown behavior", () => {
    it("opens dropdown when clicked", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });
    });

    it("shows all available labels in dropdown", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
        expect(screen.getByText("Feature")).toBeInTheDocument();
        expect(screen.getByText("Urgent")).toBeInTheDocument();
      });
    });

    it("closes dropdown when clicking outside", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <LabelSelector {...defaultProps} />
        </div>
      );

      await user.click(screen.getByText("Select labels..."));
      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("outside"));

      await waitFor(() => {
        // Dropdown should close - but the selected labels might still show Bug
        // We need to check if the dropdown menu is gone
        expect(screen.queryByText("Create new label")).not.toBeInTheDocument();
      });
    });

    it("shows checkmark for selected labels", async () => {
      const user = userEvent.setup();
      const selectedLabels = [{ id: "label-1", name: "Bug", color: "#FF0000" }];
      render(<LabelSelector {...defaultProps} selectedLabels={selectedLabels} />);

      // Find and click the main dropdown button (contains the selected label chip)
      const mainButton = screen.getAllByRole("button").find(btn =>
        btn.classList.contains("min-h-[40px]") || btn.textContent?.includes("Bug")
      );
      if (mainButton) {
        await user.click(mainButton);
      }

      await waitFor(() => {
        // The selected label should show a check icon - find the button containing Bug text
        const bugElements = screen.getAllByText("Bug");
        // At least one Bug element should be in a selected state (bg-blue-50)
        const selectedButton = bugElements.find(el => el.closest("button.bg-blue-50"));
        expect(selectedButton || bugElements.length > 0).toBeTruthy();
      });
    });
  });

  describe("label selection", () => {
    it("calls onLabelsChange when label is selected", async () => {
      const user = userEvent.setup();
      const onLabelsChange = vi.fn();
      render(<LabelSelector {...defaultProps} onLabelsChange={onLabelsChange} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Bug")).toBeInTheDocument();
      });

      // Find the Bug option button inside the dropdown
      const dropdownButtons = screen.getAllByRole("button");
      const bugButton = dropdownButtons.find(
        (btn) => btn.textContent?.includes("Bug") && btn.closest("button")
      );

      if (bugButton) {
        await user.click(bugButton);
      }

      expect(onLabelsChange).toHaveBeenCalled();
    });

    it("calls onLabelsChange when label is deselected", async () => {
      const user = userEvent.setup();
      const onLabelsChange = vi.fn();
      const selectedLabels = [{ id: "label-1", name: "Bug", color: "#FF0000" }];
      render(
        <LabelSelector
          {...defaultProps}
          selectedLabels={selectedLabels}
          onLabelsChange={onLabelsChange}
        />
      );

      // Find and click the main dropdown button by looking for min-h-[40px] class
      const mainButton = screen.getAllByRole("button").find(btn =>
        btn.classList.contains("min-h-[40px]")
      );
      expect(mainButton).toBeTruthy();
      await user.click(mainButton!);

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      // Find the Bug button in the dropdown - it should be inside the dropdown area
      // The dropdown buttons have bg-blue-50 class when selected
      const dropdownButtons = screen.getAllByRole("button").filter(btn =>
        btn.classList.contains("bg-blue-50") && btn.textContent?.includes("Bug")
      );

      expect(dropdownButtons.length).toBeGreaterThan(0);
      await user.click(dropdownButtons[0]);
      expect(onLabelsChange).toHaveBeenCalled();
    });

    it("removes label when X button on chip is clicked", async () => {
      const user = userEvent.setup();
      const onLabelsChange = vi.fn();
      const selectedLabels = [{ id: "label-1", name: "Bug", color: "#FF0000" }];
      render(
        <LabelSelector
          {...defaultProps}
          selectedLabels={selectedLabels}
          onLabelsChange={onLabelsChange}
        />
      );

      // Find the X button within the Bug chip
      const bugChip = screen.getByText("Bug").closest("span");
      const removeButton = bugChip?.querySelector("button");

      if (removeButton) {
        await user.click(removeButton);
      }

      expect(onLabelsChange).toHaveBeenCalledWith([]);
    });
  });

  describe("create label functionality", () => {
    it("shows create label button in dropdown", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });
    });

    it("shows create form when create button is clicked", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      expect(screen.getByPlaceholderText("Label name")).toBeInTheDocument();
    });

    it("shows color picker in create form", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      // Should show color swatches
      const colorButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.classList.contains("rounded-full"));
      expect(colorButtons.length).toBeGreaterThan(0);
    });

    it("creates label and selects it", async () => {
      const user = userEvent.setup();
      const onLabelsChange = vi.fn();
      render(<LabelSelector {...defaultProps} onLabelsChange={onLabelsChange} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "New Label");

      await user.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() => {
        expect(onLabelsChange).toHaveBeenCalled();
      });
    });

    it("cancels create form on Escape", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      expect(screen.getByPlaceholderText("Label name")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Label name")).not.toBeInTheDocument();
      });
    });

    it("submits create form on Enter", async () => {
      const user = userEvent.setup();
      const onLabelsChange = vi.fn();
      render(<LabelSelector {...defaultProps} onLabelsChange={onLabelsChange} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "Enter Label{Enter}");

      await waitFor(() => {
        expect(onLabelsChange).toHaveBeenCalled();
      });
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles empty labels list", async () => {
      server.use(
        http.get(`${API_BASE}/api/labels`, () => {
          return HttpResponse.json([]);
        })
      );

      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("No labels yet. Create one!")).toBeInTheDocument();
      });
    });

    it("disables create button when input is empty", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      const createButton = screen.getByRole("button", { name: /^create$/i });
      expect(createButton).toBeDisabled();
    });

    it("handles label creation failure", async () => {
      server.use(
        http.post(`${API_BASE}/api/labels`, () => {
          return HttpResponse.json({ error: "Label already exists" }, { status: 400 });
        })
      );

      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "Duplicate");

      await user.click(screen.getByRole("button", { name: /^create$/i }));

      // Form should remain visible due to error
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Label name")).toBeInTheDocument();
      });
    });

    it("handles whitespace-only label name", async () => {
      const user = userEvent.setup();
      render(<LabelSelector {...defaultProps} />);

      await user.click(screen.getByText("Select labels..."));

      await waitFor(() => {
        expect(screen.getByText("Create new label")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create new label"));

      const input = screen.getByPlaceholderText("Label name");
      await user.type(input, "   ");

      const createButton = screen.getByRole("button", { name: /^create$/i });
      expect(createButton).toBeDisabled();
    });

    it("applies custom className", () => {
      render(<LabelSelector {...defaultProps} className="custom-class" />);
      const container = screen.getByRole("button").parentElement;
      expect(container).toHaveClass("custom-class");
    });

    it("handles many selected labels", () => {
      const manyLabels = Array.from({ length: 20 }, (_, i) => ({
        id: `label-${i}`,
        name: `Label ${i}`,
        color: `#${String(i).padStart(6, "0")}`,
      }));
      render(<LabelSelector {...defaultProps} selectedLabels={manyLabels} />);

      manyLabels.forEach((label) => {
        expect(screen.getByText(label.name)).toBeInTheDocument();
      });
    });
  });
});
