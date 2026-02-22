import { describe, it, expect } from "vitest";
import { render, screen } from "../../test/utils";
import {
  Skeleton,
  BoardCardSkeleton,
  ColumnSkeleton,
  TodoCardSkeleton,
} from "./Skeleton";

describe("Skeleton", () => {
  describe("rendering", () => {
    it("renders with default classes (animate-pulse, bg-muted)", () => {
      render(<Skeleton />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("animate-pulse");
      expect(skeleton).toHaveClass("bg-muted");
      expect(skeleton).toHaveClass("rounded-lg");
    });

    it("applies custom className", () => {
      render(<Skeleton className="h-10 w-full" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("h-10");
      expect(skeleton).toHaveClass("w-full");
      // Should still have default classes
      expect(skeleton).toHaveClass("animate-pulse");
      expect(skeleton).toHaveClass("bg-muted");
    });
  });
});

describe("BoardCardSkeleton", () => {
  describe("rendering", () => {
    it("renders with correct testid", () => {
      render(<BoardCardSkeleton />);
      expect(screen.getByTestId("board-card-skeleton")).toBeInTheDocument();
    });

    it("contains skeleton elements", () => {
      render(<BoardCardSkeleton />);
      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});

describe("ColumnSkeleton", () => {
  describe("rendering", () => {
    it("renders with correct testid", () => {
      render(<ColumnSkeleton />);
      expect(screen.getByTestId("column-skeleton")).toBeInTheDocument();
    });

    it("contains todo card skeletons", () => {
      render(<ColumnSkeleton />);
      const todoSkeletons = screen.getAllByTestId("todo-card-skeleton");
      // ColumnSkeleton renders 3 TodoCardSkeleton instances
      expect(todoSkeletons.length).toBe(3);
    });
  });
});

describe("TodoCardSkeleton", () => {
  describe("rendering", () => {
    it("renders with correct testid", () => {
      render(<TodoCardSkeleton />);
      expect(screen.getByTestId("todo-card-skeleton")).toBeInTheDocument();
    });
  });
});
