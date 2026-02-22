import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

describe("Modal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = "unset";
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders when isOpen is true", () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText("Modal Content")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Modal Content")).not.toBeInTheDocument();
    });

    it("renders title when provided", () => {
      render(<Modal {...defaultProps} title="Test Title" />);
      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("does not render title section when title is not provided", () => {
      render(<Modal {...defaultProps} title={undefined} />);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("renders close button in title section", () => {
      render(<Modal {...defaultProps} title="Title" />);
      const closeButton = screen.getByRole("button");
      expect(closeButton).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <Modal {...defaultProps}>
          <div data-testid="custom-content">Custom Content</div>
        </Modal>
      );
      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });

    it("renders backdrop overlay", () => {
      render(<Modal {...defaultProps} />);
      const backdrop = document.querySelector(".bg-black\\/40");
      expect(backdrop).toBeInTheDocument();
    });

    it("has proper dialog role", () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has aria-modal attribute", () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("styling", () => {
    it("applies default modal styles", () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("w-full");
      expect(dialog).toHaveClass("md:max-w-md");
      expect(dialog).toHaveClass("rounded-t-2xl");
      expect(dialog).toHaveClass("md:rounded-xl");
      expect(dialog).toHaveClass("bg-card");
      expect(dialog).toHaveClass("shadow-2xl");
    });

    it("applies custom className", () => {
      render(<Modal {...defaultProps} className="custom-modal" />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("custom-modal");
    });

    it("merges custom className with default styles", () => {
      render(<Modal {...defaultProps} className="max-w-lg" />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("max-w-lg");
      expect(dialog).toHaveClass("bg-card");
    });

    it("is centered on screen", () => {
      render(<Modal {...defaultProps} />);
      const container = document.querySelector(".fixed.inset-0");
      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("items-end");
      expect(container).toHaveClass("md:items-center");
      expect(container).toHaveClass("justify-center");
    });
  });

  describe("interactions", () => {
    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} title="Title" onClose={onClose} />);

      await user.click(screen.getByRole("button"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector(".bg-black\\/40");
      if (backdrop) {
        await user.click(backdrop);
      }
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape key is pressed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when clicking inside modal content", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText("Modal Content"));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("body scroll lock", () => {
    it("sets body overflow to hidden when open", () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("resets body overflow when closed", () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe("unset");
    });

    it("cleans up body overflow on unmount", () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("unset");
    });
  });

  describe("keyboard navigation", () => {
    it("registers escape key listener when open", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalled();
    });

    it("does not register escape key listener when closed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} isOpen={false} onClose={onClose} />);

      await user.keyboard("{Escape}");
      expect(onClose).not.toHaveBeenCalled();
    });

    it("removes escape key listener on unmount", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const { unmount } = render(<Modal {...defaultProps} onClose={onClose} />);

      unmount();

      // Create a new modal to test the listener was removed
      await user.keyboard("{Escape}");
      // Should not trigger the unmounted modal's onClose
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles rapidly toggling open/close", async () => {
      const onClose = vi.fn();
      const { rerender } = render(<Modal {...defaultProps} onClose={onClose} />);

      for (let i = 0; i < 5; i++) {
        rerender(<Modal {...defaultProps} isOpen={false} onClose={onClose} />);
        rerender(<Modal {...defaultProps} isOpen={true} onClose={onClose} />);
      }

      expect(screen.getByText("Modal Content")).toBeInTheDocument();
    });

    it("handles empty children", () => {
      render(<Modal {...defaultProps}>{null}</Modal>);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("handles multiple children", () => {
      render(
        <Modal {...defaultProps}>
          <div>First</div>
          <div>Second</div>
          <div>Third</div>
        </Modal>
      );
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
      expect(screen.getByText("Third")).toBeInTheDocument();
    });

    it("handles very long title", () => {
      const longTitle = "A".repeat(200);
      render(<Modal {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles title with special characters", () => {
      render(<Modal {...defaultProps} title="<script>alert('xss')</script>" />);
      expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
      expect(screen.queryByRole("script")).not.toBeInTheDocument();
    });

    it("maintains z-index above other content", () => {
      render(
        <>
          <div style={{ position: "fixed", zIndex: 40 }}>Background</div>
          <Modal {...defaultProps} />
        </>
      );
      const container = document.querySelector(".fixed.inset-0.z-50");
      expect(container).toBeInTheDocument();
    });

    it("handles onClose being called multiple times", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<Modal {...defaultProps} title="Title" onClose={onClose} />);

      // Click close button and press escape
      await user.click(screen.getByRole("button"));
      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe("accessibility", () => {
    it("backdrop has aria-hidden", () => {
      render(<Modal {...defaultProps} />);
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });

    it("title is rendered as h2", () => {
      render(<Modal {...defaultProps} title="Heading" />);
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Heading");
    });

    it("close button is focusable", async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} title="Title" />);

      // Tab into the modal
      await user.tab();

      // Close button should be focusable
      const closeButton = screen.getByRole("button");
      expect(document.activeElement).toBe(closeButton);
    });
  });
});
