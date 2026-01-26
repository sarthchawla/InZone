import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test/utils";
import userEvent from "@testing-library/user-event";
import { BoardList } from "./BoardList";
import { server } from "../../test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockBoards, mockTemplates, createMockBoard, createMockColumn } from "../../test/mocks/handlers";

describe("BoardList", () => {
  // Happy Path Tests
  describe("rendering", () => {
    it("renders header and eventually loads boards", async () => {
      render(<BoardList />);
      // Header should always be present
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /your boards/i })).toBeInTheDocument();
      });
    });

    it("renders boards list after loading", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });
      expect(screen.getByText("Personal Tasks")).toBeInTheDocument();
    });

    it("renders board descriptions", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Main project board")).toBeInTheDocument();
      });
      expect(screen.getByText("Personal task tracking")).toBeInTheDocument();
    });

    it("renders New Board button", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /new board/i })).toBeInTheDocument();
      });
    });

    it("displays column and task counts", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText(/3 columns/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/5 tasks/i)).toBeInTheDocument();
    });

    it("uses singular grammar for 1 column", async () => {
      server.use(
        http.get("/api/boards", () => {
          return HttpResponse.json([
            createMockBoard({
              id: "board-1",
              name: "Single Column Board",
              todoCount: 5,
              columns: [createMockColumn({ id: "col-1", name: "Todo" })],
            }),
          ]);
        })
      );

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText(/1 column/i)).toBeInTheDocument();
      });
    });

    it("uses singular grammar for 1 task", async () => {
      server.use(
        http.get("/api/boards", () => {
          return HttpResponse.json([
            createMockBoard({
              id: "board-1",
              name: "Single Task Board",
              todoCount: 1,
              columns: [createMockColumn({ id: "col-1", name: "Todo" })],
            }),
          ]);
        })
      );

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText(/1 task(?!s)/i)).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/boards", () => {
          return HttpResponse.json([]);
        })
      );
    });

    it("shows empty state when no boards exist", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("No boards yet")).toBeInTheDocument();
      });
      expect(screen.getByText("Create your first board to get started")).toBeInTheDocument();
    });

    it("shows Create Board button in empty state", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create board/i })).toBeInTheDocument();
      });
    });
  });

  describe("create board modal", () => {
    it("opens modal when New Board button is clicked", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));

      expect(screen.getByText("Create New Board")).toBeInTheDocument();
      // Check for the input with placeholder
      expect(screen.getByPlaceholderText(/enter board name/i)).toBeInTheDocument();
    });

    it("closes modal when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));
      expect(screen.getByText("Create New Board")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText("Create New Board")).not.toBeInTheDocument();
      });
    });

    it("creates board when form is submitted", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));

      const nameInput = screen.getByPlaceholderText(/enter board name/i);
      await user.type(nameInput, "New Test Board");

      await user.click(screen.getByRole("button", { name: /^create board$/i }));

      // Modal should close after successful creation
      await waitFor(() => {
        expect(screen.queryByText("Create New Board")).not.toBeInTheDocument();
      });
    });

    it("disables create button when name is empty", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));

      const createButton = screen.getByRole("button", { name: /^create board$/i });
      expect(createButton).toBeDisabled();
    });

    it("enables create button when name is entered", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));

      const nameInput = screen.getByPlaceholderText(/enter board name/i);
      await user.type(nameInput, "New Board");

      const createButton = screen.getByRole("button", { name: /^create board$/i });
      expect(createButton).not.toBeDisabled();
    });

    it("shows template selector in create modal", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));

      expect(screen.getByLabelText(/template/i)).toBeInTheDocument();
      expect(screen.getByText(/no template \(empty board\)/i)).toBeInTheDocument();
    });
  });

  describe("delete board", () => {
    it("shows confirmation modal when delete button is clicked", async () => {
      const user = userEvent.setup();

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Find the delete button for Project Alpha
      const boardCard = screen.getByText("Project Alpha").closest("a");
      const deleteButton = boardCard?.querySelector("button");

      expect(deleteButton).toBeTruthy();
      if (deleteButton) {
        await user.click(deleteButton);
      }

      // Check that the confirmation modal appears
      await waitFor(() => {
        expect(screen.getByText("Delete Board")).toBeInTheDocument();
      });
      expect(screen.getByText(/Are you sure you want to delete this board/)).toBeInTheDocument();
    });

    it("deletes board when confirmed", async () => {
      const user = userEvent.setup();

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      const boardCard = screen.getByText("Project Alpha").closest("a");
      const deleteButton = boardCard?.querySelector("button");

      if (deleteButton) {
        await user.click(deleteButton);
      }

      // Wait for confirmation modal
      await waitFor(() => {
        expect(screen.getByText("Delete Board")).toBeInTheDocument();
      });

      // Click confirm delete button
      await user.click(screen.getByRole("button", { name: /confirm delete/i }));

      // Modal should close after successful deletion
      await waitFor(() => {
        expect(screen.queryByText("Delete Board")).not.toBeInTheDocument();
      });
    });

    it("does not delete board when cancelled", async () => {
      const user = userEvent.setup();

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      const boardCard = screen.getByText("Project Alpha").closest("a");
      const deleteButton = boardCard?.querySelector("button");

      if (deleteButton) {
        await user.click(deleteButton);
      }

      // Wait for confirmation modal
      await waitFor(() => {
        expect(screen.getByText("Delete Board")).toBeInTheDocument();
      });

      // Click cancel button
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText("Delete Board")).not.toBeInTheDocument();
      });

      // Board should still be visible
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("shows error state when API fails", async () => {
      server.use(
        http.get("/api/boards", () => {
          return HttpResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          );
        })
      );

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load boards")).toBeInTheDocument();
      });
    });

    it("shows error message on create failure", async () => {
      server.use(
        http.post("/api/boards", () => {
          return HttpResponse.json(
            { error: "Board name already exists" },
            { status: 400 }
          );
        })
      );

      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));

      const nameInput = screen.getByPlaceholderText(/enter board name/i);
      await user.type(nameInput, "Duplicate Board");

      await user.click(screen.getByRole("button", { name: /^create board$/i }));

      await waitFor(() => {
        expect(screen.getByText("Board name already exists")).toBeInTheDocument();
      });
    });

    it("clears error when modal is closed and reopened", async () => {
      server.use(
        http.post("/api/boards", () => {
          return HttpResponse.json(
            { error: "Board name already exists" },
            { status: 400 }
          );
        })
      );

      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Open modal and trigger error
      await user.click(screen.getByRole("button", { name: /new board/i }));
      const nameInput = screen.getByPlaceholderText(/enter board name/i);
      await user.type(nameInput, "Duplicate Board");
      await user.click(screen.getByRole("button", { name: /^create board$/i }));

      await waitFor(() => {
        expect(screen.getByText("Board name already exists")).toBeInTheDocument();
      });

      // Close modal
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Reopen modal
      await user.click(screen.getByRole("button", { name: /new board/i }));

      // Error should be cleared
      expect(screen.queryByText("Board name already exists")).not.toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("boards are links to board view", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      const boardLink = screen.getByText("Project Alpha").closest("a");
      expect(boardLink).toHaveAttribute("href", "/board/board-1");
    });
  });

  describe("edge cases", () => {
    it("handles boards without columns", async () => {
      server.use(
        http.get("/api/boards", () => {
          return HttpResponse.json([
            createMockBoard({
              id: "board-no-columns",
              name: "Empty Board",
              columns: [],
            }),
          ]);
        })
      );

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Empty Board")).toBeInTheDocument();
      });
      expect(screen.getByText(/0 columns/i)).toBeInTheDocument();
    });

    it("handles boards without description", async () => {
      server.use(
        http.get("/api/boards", () => {
          return HttpResponse.json([
            createMockBoard({
              id: "board-no-desc",
              name: "No Description Board",
              description: undefined,
            }),
          ]);
        })
      );

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("No Description Board")).toBeInTheDocument();
      });
    });

    it("handles whitespace-only board name in create form", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new board/i }));

      const nameInput = screen.getByPlaceholderText(/enter board name/i);
      await user.type(nameInput, "   ");

      const createButton = screen.getByRole("button", { name: /^create board$/i });
      expect(createButton).toBeDisabled();
    });
  });
});
