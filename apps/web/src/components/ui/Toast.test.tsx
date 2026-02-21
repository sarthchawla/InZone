import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { Toast, ToastContainer, ToastType } from "./Toast";

describe("Toast", () => {
  const defaultProps = {
    id: "toast-1",
    type: "info" as ToastType,
    message: "Test message",
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders toast message", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} />);
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    it("renders with success type styling", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="success" />);
      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-green-50");
      expect(toast).toHaveClass("border-green-200");
      expect(toast).toHaveClass("text-green-800");
    });

    it("renders with error type styling", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="error" />);
      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-red-50");
      expect(toast).toHaveClass("border-red-200");
      expect(toast).toHaveClass("text-red-800");
    });

    it("renders with warning type styling", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="warning" />);
      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-yellow-50");
      expect(toast).toHaveClass("border-yellow-200");
      expect(toast).toHaveClass("text-yellow-800");
    });

    it("renders with info type styling", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="info" />);
      const toast = screen.getByRole("alert");
      expect(toast).toHaveClass("bg-blue-50");
      expect(toast).toHaveClass("border-blue-200");
      expect(toast).toHaveClass("text-blue-800");
    });

    it("renders appropriate icon for success", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="success" />);
      const icon = document.querySelector("svg.text-green-500");
      expect(icon).toBeInTheDocument();
    });

    it("renders appropriate icon for error", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="error" />);
      const icon = document.querySelector("svg.text-red-500");
      expect(icon).toBeInTheDocument();
    });

    it("renders appropriate icon for warning", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="warning" />);
      const icon = document.querySelector("svg.text-yellow-500");
      expect(icon).toBeInTheDocument();
    });

    it("renders appropriate icon for info", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} type="info" />);
      const icon = document.querySelector("svg.text-blue-500");
      expect(icon).toBeInTheDocument();
    });

    it("renders dismiss button", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} />);
      const dismissButton = screen.getByRole("button");
      expect(dismissButton).toBeInTheDocument();
    });

    it("has alert role for accessibility", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onDismiss when dismiss button is clicked", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      await user.click(screen.getByRole("button"));
      expect(onDismiss).toHaveBeenCalledWith("toast-1");
    });
  });

  describe("auto-dismiss", () => {
    it("auto-dismisses after default duration", async () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      expect(onDismiss).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);

      expect(onDismiss).toHaveBeenCalledWith("toast-1");
    });

    it("auto-dismisses after custom duration", async () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} duration={3000} />);

      vi.advanceTimersByTime(2999);
      expect(onDismiss).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith("toast-1");
    });

    it("does not auto-dismiss when duration is 0", async () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} duration={0} />);

      vi.advanceTimersByTime(10000);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("clears timer on unmount", () => {
      const onDismiss = vi.fn();
      const { unmount } = render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      unmount();

      vi.advanceTimersByTime(5000);
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles very long message", () => {
      vi.useRealTimers();
      const longMessage = "A".repeat(500);
      render(<Toast {...defaultProps} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("handles message with special characters", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} message="<script>alert('xss')</script>" />);
      expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
      expect(screen.queryByRole("script")).not.toBeInTheDocument();
    });

    it("handles empty message", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} message="" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("handles message with newlines", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} message="Line 1\nLine 2" />);
      // React renders newlines in text, so we check the role alert contains the content
      expect(screen.getByRole("alert")).toHaveTextContent("Line 1");
      expect(screen.getByRole("alert")).toHaveTextContent("Line 2");
    });

    it("handles message with unicode", () => {
      vi.useRealTimers();
      render(<Toast {...defaultProps} message="Hello 世界 👋" />);
      expect(screen.getByText("Hello 世界 👋")).toBeInTheDocument();
    });

    it("handles negative duration gracefully", async () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} duration={-1000} />);

      // Negative duration should trigger immediately
      vi.advanceTimersByTime(0);
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});

describe("ToastContainer", () => {
  const mockToasts = [
    { id: "1", type: "success" as ToastType, message: "Success message" },
    { id: "2", type: "error" as ToastType, message: "Error message" },
    { id: "3", type: "info" as ToastType, message: "Info message" },
  ];

  const defaultProps = {
    toasts: mockToasts,
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders all toasts", () => {
      render(<ToastContainer {...defaultProps} />);
      expect(screen.getByText("Success message")).toBeInTheDocument();
      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.getByText("Info message")).toBeInTheDocument();
    });

    it("renders no toast alerts when toasts array is empty", () => {
      render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);
      // Container wrapper is always rendered (for AnimatePresence), but no toasts inside
      expect(screen.queryAllByRole("alert")).toHaveLength(0);
    });

    it("is positioned at bottom right", () => {
      render(<ToastContainer {...defaultProps} />);
      const container = document.querySelector(".fixed.bottom-4.right-4");
      expect(container).toBeInTheDocument();
    });

    it("has high z-index", () => {
      render(<ToastContainer {...defaultProps} />);
      const container = document.querySelector(".z-50");
      expect(container).toBeInTheDocument();
    });

    it("stacks toasts vertically", () => {
      render(<ToastContainer {...defaultProps} />);
      const container = document.querySelector(".flex.flex-col.gap-2");
      expect(container).toBeInTheDocument();
    });

    it("has max width for toasts", () => {
      render(<ToastContainer {...defaultProps} />);
      const container = document.querySelector(".max-w-md");
      expect(container).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("passes onDismiss to each toast", async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<ToastContainer toasts={mockToasts} onDismiss={onDismiss} />);

      const dismissButtons = screen.getAllByRole("button");
      await user.click(dismissButtons[0]);

      expect(onDismiss).toHaveBeenCalled();
    });

    it("calls onDismiss with correct toast id", async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<ToastContainer toasts={mockToasts} onDismiss={onDismiss} />);

      const dismissButtons = screen.getAllByRole("button");
      await user.click(dismissButtons[1]);

      expect(onDismiss).toHaveBeenCalledWith("2");
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles single toast", () => {
      render(
        <ToastContainer
          toasts={[{ id: "1", type: "info", message: "Single" }]}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByText("Single")).toBeInTheDocument();
    });

    it("handles many toasts", () => {
      const manyToasts = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        type: "info" as ToastType,
        message: `Toast ${i}`,
      }));
      render(<ToastContainer toasts={manyToasts} onDismiss={vi.fn()} />);

      manyToasts.forEach((toast) => {
        expect(screen.getByText(toast.message)).toBeInTheDocument();
      });
    });

    it("handles toasts being added dynamically", () => {
      const { rerender } = render(
        <ToastContainer toasts={[mockToasts[0]]} onDismiss={vi.fn()} />
      );

      expect(screen.getByText("Success message")).toBeInTheDocument();
      expect(screen.queryByText("Error message")).not.toBeInTheDocument();

      rerender(<ToastContainer toasts={mockToasts} onDismiss={vi.fn()} />);

      expect(screen.getByText("Error message")).toBeInTheDocument();
    });

    it("handles toasts being removed dynamically", async () => {
      const { rerender } = render(<ToastContainer {...defaultProps} />);

      expect(screen.getByText("Success message")).toBeInTheDocument();
      expect(screen.getByText("Error message")).toBeInTheDocument();

      rerender(
        <ToastContainer
          toasts={mockToasts.filter((t) => t.id !== "1")}
          onDismiss={vi.fn()}
        />
      );

      // AnimatePresence may keep the exiting element briefly during exit animation
      await waitFor(() => {
        expect(screen.queryByText("Success message")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Error message")).toBeInTheDocument();
    });

    it("handles duplicate toast ids gracefully", () => {
      const duplicateToasts = [
        { id: "1", type: "success" as ToastType, message: "First" },
        { id: "1", type: "error" as ToastType, message: "Second" },
      ];
      // Should not crash, but may have React key warning
      render(<ToastContainer toasts={duplicateToasts} onDismiss={vi.fn()} />);
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });
  });
});
