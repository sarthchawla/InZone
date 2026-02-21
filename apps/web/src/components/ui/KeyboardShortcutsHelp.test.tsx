import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";

const sampleShortcuts = [
  { key: "n", description: "Create new todo" },
  { key: "e", description: "Edit selected todo" },
  { key: "d", description: "Delete selected todo" },
  { key: "?", description: "Show keyboard shortcuts" },
];

describe("KeyboardShortcutsHelp", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    shortcuts: sampleShortcuts,
  };

  describe("rendering", () => {
    it("renders shortcuts when open", () => {
      render(<KeyboardShortcutsHelp {...defaultProps} />);
      expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      expect(screen.getByText("Create new todo")).toBeInTheDocument();
    });

    it("displays shortcut descriptions", () => {
      render(<KeyboardShortcutsHelp {...defaultProps} />);
      expect(screen.getByText("Create new todo")).toBeInTheDocument();
      expect(screen.getByText("Edit selected todo")).toBeInTheDocument();
      expect(screen.getByText("Delete selected todo")).toBeInTheDocument();
      expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
    });

    it("displays shortcut keys in kbd elements (uppercase)", () => {
      render(<KeyboardShortcutsHelp {...defaultProps} />);
      const kbdElements = document.querySelectorAll("kbd");
      expect(kbdElements.length).toBe(sampleShortcuts.length);

      // Non-? keys should be uppercased
      expect(screen.getByText("N")).toBeInTheDocument();
      expect(screen.getByText("E")).toBeInTheDocument();
      expect(screen.getByText("D")).toBeInTheDocument();
    });

    it("displays ? key as-is for ? shortcut", () => {
      render(<KeyboardShortcutsHelp {...defaultProps} />);
      // The ? shortcut should render as ? (not uppercased)
      const kbdElements = document.querySelectorAll("kbd");
      const questionKbd = Array.from(kbdElements).find(
        (el) => el.textContent === "?"
      );
      expect(questionKbd).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<KeyboardShortcutsHelp {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
      expect(screen.queryByText("Create new todo")).not.toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onClose when modal close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <KeyboardShortcutsHelp {...defaultProps} onClose={onClose} />
      );

      // The Modal renders a close button when a title is provided
      const closeButton = screen.getByRole("button");
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty shortcuts array", () => {
      render(
        <KeyboardShortcutsHelp {...defaultProps} shortcuts={[]} />
      );
      // Title should still render, but no shortcut rows
      expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      const kbdElements = document.querySelectorAll("kbd");
      expect(kbdElements.length).toBe(0);
    });
  });
});
