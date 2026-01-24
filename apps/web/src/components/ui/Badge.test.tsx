import { describe, it, expect } from "vitest";
import { render, screen } from "../../test/utils";
import { Badge, PriorityBadge } from "./Badge";

describe("Badge", () => {
  // Happy Path Tests
  describe("rendering", () => {
    it("renders children text", () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText("Test Badge")).toBeInTheDocument();
    });

    it("renders with default variant styling", () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText("Default");
      expect(badge).toHaveClass("bg-gray-100");
      expect(badge).toHaveClass("text-gray-700");
    });

    it("renders with low variant styling", () => {
      render(<Badge variant="low">Low</Badge>);
      const badge = screen.getByText("Low");
      expect(badge).toHaveClass("bg-green-100");
      expect(badge).toHaveClass("text-green-700");
    });

    it("renders with medium variant styling", () => {
      render(<Badge variant="medium">Medium</Badge>);
      const badge = screen.getByText("Medium");
      expect(badge).toHaveClass("bg-yellow-100");
      expect(badge).toHaveClass("text-yellow-700");
    });

    it("renders with high variant styling", () => {
      render(<Badge variant="high">High</Badge>);
      const badge = screen.getByText("High");
      expect(badge).toHaveClass("bg-orange-100");
      expect(badge).toHaveClass("text-orange-700");
    });

    it("renders with urgent variant styling", () => {
      render(<Badge variant="urgent">Urgent</Badge>);
      const badge = screen.getByText("Urgent");
      expect(badge).toHaveClass("bg-red-100");
      expect(badge).toHaveClass("text-red-700");
    });

    it("applies base badge styles", () => {
      render(<Badge>Base</Badge>);
      const badge = screen.getByText("Base");
      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("items-center");
      expect(badge).toHaveClass("rounded-full");
      expect(badge).toHaveClass("px-2");
      expect(badge).toHaveClass("py-0.5");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("font-medium");
    });

    it("applies custom className", () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText("Custom");
      expect(badge).toHaveClass("custom-class");
    });

    it("merges custom className with default styles", () => {
      render(<Badge className="my-custom">Merged</Badge>);
      const badge = screen.getByText("Merged");
      expect(badge).toHaveClass("my-custom");
      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("bg-gray-100");
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("renders empty children", () => {
      render(<Badge>{""}</Badge>);
      // Should render without crashing
      const badge = document.querySelector("span.inline-flex");
      expect(badge).toBeInTheDocument();
    });

    it("renders complex children", () => {
      render(
        <Badge>
          <span>Icon</span> Text
        </Badge>
      );
      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("handles undefined variant", () => {
      render(<Badge variant={undefined}>Undefined</Badge>);
      const badge = screen.getByText("Undefined");
      expect(badge).toHaveClass("bg-gray-100");
    });

    it("renders with special characters", () => {
      render(<Badge>{"<script>alert('xss')</script>"}</Badge>);
      expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
      expect(screen.queryByRole("script")).not.toBeInTheDocument();
    });
  });
});

describe("PriorityBadge", () => {
  // Happy Path Tests
  describe("rendering", () => {
    it("renders LOW priority", () => {
      render(<PriorityBadge priority="LOW" />);
      const badge = screen.getByText("LOW");
      expect(badge).toHaveClass("bg-green-100");
      expect(badge).toHaveClass("text-green-700");
    });

    it("renders MEDIUM priority", () => {
      render(<PriorityBadge priority="MEDIUM" />);
      const badge = screen.getByText("MEDIUM");
      expect(badge).toHaveClass("bg-yellow-100");
      expect(badge).toHaveClass("text-yellow-700");
    });

    it("renders HIGH priority", () => {
      render(<PriorityBadge priority="HIGH" />);
      const badge = screen.getByText("HIGH");
      expect(badge).toHaveClass("bg-orange-100");
      expect(badge).toHaveClass("text-orange-700");
    });

    it("renders URGENT priority", () => {
      render(<PriorityBadge priority="URGENT" />);
      const badge = screen.getByText("URGENT");
      expect(badge).toHaveClass("bg-red-100");
      expect(badge).toHaveClass("text-red-700");
    });
  });

  // Unhappy Path Tests
  describe("edge cases", () => {
    it("handles lowercase priority", () => {
      render(<PriorityBadge priority="high" />);
      expect(screen.getByText("high")).toBeInTheDocument();
    });

    it("handles mixed case priority", () => {
      render(<PriorityBadge priority="High" />);
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("renders unknown priority gracefully", () => {
      // @ts-expect-error testing invalid priority
      render(<PriorityBadge priority="unknown" />);
      // Should render without crashing, even if variant doesn't match exactly
      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });
});
