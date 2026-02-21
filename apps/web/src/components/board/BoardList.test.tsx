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

    it("renders New Board ghost card button", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByTestId("ghost-card")).toBeInTheDocument();
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
        expect(screen.getByText("Start by creating your first board")).toBeInTheDocument();
      });
      expect(screen.getByText(/Boards help you organise tasks into columns/)).toBeInTheDocument();
    });

    it("shows inline create form in empty state", async () => {
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByTestId("inline-create-form")).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText(/board name/i)).toBeInTheDocument();
    });
  });

  describe("inline board creation", () => {
    it("opens inline form when ghost card is clicked", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("ghost-card"));

      expect(screen.getByTestId("inline-create-form")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/board name/i)).toBeInTheDocument();
    });

    it("closes inline form when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("ghost-card"));
      expect(screen.getByTestId("inline-create-form")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByTestId("inline-create-form")).not.toBeInTheDocument();
      });
    });

    it("creates board when form is submitted", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("ghost-card"));

      const nameInput = screen.getByPlaceholderText(/board name/i);
      await user.type(nameInput, "New Test Board");

      await user.click(screen.getByRole("button", { name: /^create$/i }));

      // Form should close after successful creation
      await waitFor(() => {
        expect(screen.queryByTestId("ghost-card-form")).not.toBeInTheDocument();
      });
    });

    it("disables create button when name is empty", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("ghost-card"));

      const createButton = screen.getByRole("button", { name: /^create$/i });
      expect(createButton).toBeDisabled();
    });

    it("enables create button when name is entered", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("ghost-card"));

      const nameInput = screen.getByPlaceholderText(/board name/i);
      await user.type(nameInput, "New Board");

      const createButton = screen.getByRole("button", { name: /^create$/i });
      expect(createButton).not.toBeDisabled();
    });

    it("shows template chips in create form", async () => {
      const user = userEvent.setup();
      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("ghost-card"));

      // The inline form shows template chips including "Empty board" default
      expect(screen.getByRole("button", { name: /empty board/i })).toBeInTheDocument();
    });
  });

  describe("delete board", () => {
    it("shows dropdown menu when actions button is clicked", async () => {
      const user = userEvent.setup();

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Find the actions button for Project Alpha
      const actionsButton = screen.getByLabelText("Actions for Project Alpha");
      await user.click(actionsButton);

      // Check that the dropdown menu appears with Rename and Delete options
      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });
      expect(screen.getByText("Rename")).toBeInTheDocument();
    });

    it("deletes board directly when Delete is clicked from dropdown", async () => {
      const user = userEvent.setup();

      let deleteWasCalled = false;
      server.use(
        http.delete("/api/boards/:id", () => {
          deleteWasCalled = true;
          return new HttpResponse(null, { status: 204 });
        })
      );

      render(<BoardList />);

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      const actionsButton = screen.getByLabelText("Actions for Project Alpha");
      await user.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Delete"));

      // Delete API should have been called and toast should appear
      await waitFor(() => {
        expect(deleteWasCalled).toBe(true);
      });
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

      await user.click(screen.getByTestId("ghost-card"));

      const nameInput = screen.getByPlaceholderText(/board name/i);
      await user.type(nameInput, "Duplicate Board");

      await user.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() => {
        expect(screen.getByText("Board name already exists")).toBeInTheDocument();
      });
    });

    it("clears error when form is closed and reopened", async () => {
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

      // Open form and trigger error
      await user.click(screen.getByTestId("ghost-card"));
      const nameInput = screen.getByPlaceholderText(/board name/i);
      await user.type(nameInput, "Duplicate Board");
      await user.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() => {
        expect(screen.getByText("Board name already exists")).toBeInTheDocument();
      });

      // Close form
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Reopen form
      await waitFor(() => {
        expect(screen.getByTestId("ghost-card")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("ghost-card"));

      // Error should be cleared (new form instance)
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

      await user.click(screen.getByTestId("ghost-card"));

      const nameInput = screen.getByPlaceholderText(/board name/i);
      await user.type(nameInput, "   ");

      const createButton = screen.getByRole("button", { name: /^create$/i });
      expect(createButton).toBeDisabled();
    });
  });
});
