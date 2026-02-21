import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../src/test/utils";
import userEvent from "@testing-library/user-event";
import { KeyboardShortcutsHelp } from "../../../../src/components/ui/KeyboardShortcutsHelp";

const boardShortcuts = [
  { key: "n", description: "Create new task" },
  { key: "b", description: "Create new board" },
  { key: "/", description: "Focus search" },
  { key: "?", description: "Show keyboard shortcuts" },
];

describe("Feature: Keyboard Shortcuts Help Dialog", () => {
  describe("Scenario: User opens keyboard shortcuts help", () => {
    it("Given the shortcuts help dialog is open with board shortcuts, When user views the dialog, Then all shortcut descriptions are visible and keys are displayed", () => {
      const onClose = vi.fn();

      render(
        <KeyboardShortcutsHelp
          isOpen={true}
          onClose={onClose}
          shortcuts={boardShortcuts}
        />
      );

      // Then: dialog title is visible
      expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

      // Then: all shortcut descriptions are visible
      expect(screen.getByText("Create new task")).toBeInTheDocument();
      expect(screen.getByText("Create new board")).toBeInTheDocument();
      expect(screen.getByText("Focus search")).toBeInTheDocument();
      expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();

      // Then: all shortcut keys are displayed (uppercased except ?)
      expect(screen.getByText("N")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
      expect(screen.getByText("/")).toBeInTheDocument();
      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  describe("Scenario: User closes keyboard shortcuts help", () => {
    it("Given the shortcuts help dialog is open, When user clicks the close button, Then the onClose callback is called", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <KeyboardShortcutsHelp
          isOpen={true}
          onClose={onClose}
          shortcuts={boardShortcuts}
        />
      );

      // The Modal component renders a close button (X icon)
      // Click the close button in the modal header
      const closeButton = screen.getByRole("dialog").querySelector("button");
      expect(closeButton).toBeTruthy();
      await user.click(closeButton!);

      // Then: the onClose callback is called
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given the shortcuts help dialog is open, When user presses Escape, Then the onClose callback is called", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <KeyboardShortcutsHelp
          isOpen={true}
          onClose={onClose}
          shortcuts={boardShortcuts}
        />
      );

      // When: user presses Escape
      await user.keyboard("{Escape}");

      // Then: the onClose callback is called
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
