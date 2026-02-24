import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  // Happy Path Tests
  describe("rendering", () => {
    it("renders input element", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders with placeholder", () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
    });

    it("renders with value", () => {
      render(<Input value="test value" onChange={() => {}} />);
      expect(screen.getByDisplayValue("test value")).toBeInTheDocument();
    });

    it("renders with default type (text)", () => {
      render(<Input />);
      // Input defaults to text type when no type is specified
      // The type attribute may not be explicitly set, but it functions as text
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      // Browser default is text, so either no type attribute or type="text"
      expect(input.getAttribute("type") || "text").toBe("text");
    });

    it("renders with specified type", () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it("applies base input styles", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("flex");
      expect(input).toHaveClass("min-h-[44px]");
      expect(input).toHaveClass("w-full");
      expect(input).toHaveClass("rounded-lg");
      expect(input).toHaveClass("border");
      expect(input).toHaveClass("border-border");
      expect(input).toHaveClass("bg-card");
      expect(input).toHaveClass("px-3");
      expect(input).toHaveClass("py-2");
      expect(input).toHaveClass("text-sm");
    });

    it("applies custom className", () => {
      render(<Input className="custom-input" />);
      expect(screen.getByRole("textbox")).toHaveClass("custom-input");
    });

    it("merges custom className with default styles", () => {
      render(<Input className="my-custom" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("my-custom");
      expect(input).toHaveClass("rounded-lg");
    });
  });

  describe("interactions", () => {
    it("calls onChange when value changes", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      await user.type(screen.getByRole("textbox"), "hello");
      expect(handleChange).toHaveBeenCalled();
    });

    it("updates value as user types", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "hello world");
      expect(input).toHaveValue("hello world");
    });

    it("calls onFocus when focused", async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      await user.click(screen.getByRole("textbox"));
      expect(handleFocus).toHaveBeenCalled();
    });

    it("calls onBlur when blurred", async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.tab();
      expect(handleBlur).toHaveBeenCalled();
    });

    it("calls onKeyDown when key is pressed", async () => {
      const user = userEvent.setup();
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "{Enter}");
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("renders as disabled when disabled prop is true", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("applies disabled styling", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("disabled:cursor-not-allowed");
      expect(input).toHaveClass("disabled:opacity-50");
    });

    it("does not call onChange when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input disabled onChange={handleChange} />);

      await user.type(screen.getByRole("textbox"), "hello");
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("focus styles", () => {
    it("has focus ring styles", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("focus-visible:outline-none");
      expect(input).toHaveClass("focus-visible:ring-2");
      expect(input).toHaveClass("focus-visible:ring-ring/30");
      expect(input).toHaveClass("focus-visible:border-primary");
    });

    it("can be focused", async () => {
      const user = userEvent.setup();
      render(<Input />);

      await user.tab();
      expect(screen.getByRole("textbox")).toHaveFocus();
    });
  });

  describe("placeholder styles", () => {
    it("has placeholder text color style", () => {
      render(<Input placeholder="Test" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("placeholder:text-muted-foreground");
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to input element", () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });

    it("allows imperative methods via ref", () => {
      let inputRef: HTMLInputElement | null = null;
      render(<Input ref={(el) => (inputRef = el)} />);

      expect(inputRef).not.toBeNull();
      expect(inputRef?.focus).toBeDefined();
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles very long input values", async () => {
      const user = userEvent.setup();
      const longValue = "a".repeat(1000);
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, longValue);
      expect(input).toHaveValue(longValue);
    });

    it("handles special characters", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "<script>alert('xss')</script>");
      expect(input).toHaveValue("<script>alert('xss')</script>");
    });

    it("handles unicode characters", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello 世界 👋");
      expect(input).toHaveValue("Hello 世界 👋");
    });

    it("handles pasting text", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.paste("pasted text");
      expect(input).toHaveValue("pasted text");
    });

    it("handles maxLength attribute", async () => {
      const user = userEvent.setup();
      render(<Input maxLength={5} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "1234567890");
      expect(input).toHaveValue("12345");
    });

    it("handles required attribute", () => {
      render(<Input required />);
      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("handles readOnly attribute", async () => {
      const user = userEvent.setup();
      render(<Input readOnly value="readonly" onChange={() => {}} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "more text");
      expect(input).toHaveValue("readonly");
    });

    it("handles autoFocus attribute", () => {
      render(<Input autoFocus />);
      expect(screen.getByRole("textbox")).toHaveFocus();
    });

    it("handles name attribute", () => {
      render(<Input name="test-input" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("name", "test-input");
    });

    it("handles id attribute", () => {
      render(<Input id="test-id" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("id", "test-id");
    });

    it("handles aria-label for accessibility", () => {
      render(<Input aria-label="Test input" />);
      expect(screen.getByLabelText("Test input")).toBeInTheDocument();
    });
  });
});
