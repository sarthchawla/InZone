import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardView } from "./BoardView";
import { server } from "../../test/mocks/server";
import { http, HttpResponse } from "msw";
import { createMockBoard, createMockColumn, createMockTodo, mockLabels } from "../../test/mocks/handlers";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock RichTextEditor since tiptap's useEditor does not work in jsdom
vi.mock("../ui/RichTextEditor", () => ({
  RichTextEditor: ({ content, onChange, placeholder }: { content: string; onChange: (v: string) => void; placeholder?: string }) => (
    <textarea
      data-testid="rich-text-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock window.matchMedia for useIsMobile / useMediaQuery
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Custom render for BoardView that sets up routing with boardId param
// Does NOT use the default wrapper since it includes BrowserRouter
function renderBoardView(boardId: string = "board-1") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/board/${boardId}`]}>
        <ToastProvider>
          <Routes>
            <Route path="/board/:boardId" element={<BoardView />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Mock board with full data
const mockBoardWithTodos = createMockBoard({
  id: "board-1",
  name: "Project Alpha",
  description: "Main project board",
  columns: [
    createMockColumn({
      id: "column-1",
      name: "Todo",
      position: 0,
      boardId: "board-1",
      todos: [
        createMockTodo({
          id: "todo-1",
          title: "First Task",
          description: "Task description",
          priority: "HIGH",
          position: 0,
          columnId: "column-1",
        }),
        createMockTodo({
          id: "todo-2",
          title: "Second Task",
          priority: "MEDIUM",
          position: 1,
          columnId: "column-1",
        }),
      ],
    }),
    createMockColumn({
      id: "column-2",
      name: "In Progress",
      position: 1,
      boardId: "board-1",
      todos: [
        createMockTodo({
          id: "todo-3",
          title: "Active Task",
          priority: "URGENT",
          position: 0,
          columnId: "column-2",
        }),
      ],
    }),
    createMockColumn({
      id: "column-3",
      name: "Done",
      position: 2,
      boardId: "board-1",
      todos: [],
    }),
  ],
});

describe("BoardView", () => {
  beforeEach(() => {
    // Reset handlers to default
    server.resetHandlers();
    // Set up default handler for board-1
    server.use(
      http.get(`/api/boards/:id`, ({ params }) => {
        if (params.id === "board-1") {
          return HttpResponse.json(mockBoardWithTodos);
        }
        return HttpResponse.json({ error: "Board not found" }, { status: 404 });
      })
    );
  });

  // Happy Path Tests
  describe("rendering", () => {
    it("renders loading state initially", () => {
      renderBoardView();
      // Loading state uses skeleton loaders with animate-pulse
      expect(screen.getByTestId("board-view-loading")).toBeInTheDocument();
    });

    it("renders board name after loading", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });
    });

    it("renders board description inline when description exists", async () => {
      renderBoardView();

      // Wait for board to load
      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Description is shown inline as plain text (click to edit)
      expect(screen.getByText("Main project board")).toBeInTheDocument();
    });

    it("renders all columns", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Todo")).toBeInTheDocument();
      });
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("renders todos in their columns", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("First Task")).toBeInTheDocument();
      });
      expect(screen.getByText("Second Task")).toBeInTheDocument();
      expect(screen.getByText("Active Task")).toBeInTheDocument();
    });

    it("renders back button/link", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      const backLink = document.querySelector('a[href="/"]');
      expect(backLink).toBeInTheDocument();
    });

    it("renders Labels button", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Labels")).toBeInTheDocument();
      });
    });

    // Settings button is intentionally not implemented (see PRD issue 1.2)
    // This test is skipped until Settings feature is added

    it("renders Add column button", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });
    });
  });

  describe("label manager", () => {
    beforeEach(() => {
      server.use(
        http.get(`/api/labels`, () => {
          return HttpResponse.json(mockLabels);
        })
      );
    });

    it("opens label manager when Labels button is clicked", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Labels")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Labels"));

      await waitFor(() => {
        expect(screen.getByText("Manage Labels")).toBeInTheDocument();
      });
    });

    it("closes label manager when close button is clicked", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Labels")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Labels"));

      await waitFor(() => {
        expect(screen.getByText("Manage Labels")).toBeInTheDocument();
      });

      // Find and click close button (X button in modal)
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find(btn => btn.querySelector(".lucide-x"));
      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText("Manage Labels")).not.toBeInTheDocument();
      });
    });
  });

  describe("add column functionality", () => {
    it("shows column input form when Add column is clicked", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add column"));

      expect(screen.getByPlaceholderText(/enter column name/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("creates column when form is submitted", async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`/api/boards/:boardId/columns`, async ({ request }) => {
          const body = await request.json() as { name: string };
          return HttpResponse.json(
            createMockColumn({ name: body.name, boardId: "board-1" }),
            { status: 201 }
          );
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add column"));

      const input = screen.getByPlaceholderText(/enter column name/i);
      await user.type(input, "New Column");

      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Form should close after submission
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter column name/i)).not.toBeInTheDocument();
      });
    });

    it("cancels column creation when cancel is clicked", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add column"));
      expect(screen.getByPlaceholderText(/enter column name/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByPlaceholderText(/enter column name/i)).not.toBeInTheDocument();
      expect(screen.getByText("Add column")).toBeInTheDocument();
    });

    it("cancels column creation on Escape key", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add column"));
      expect(screen.getByPlaceholderText(/enter column name/i)).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter column name/i)).not.toBeInTheDocument();
      });
    });

    it("submits column on Enter key", async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`/api/boards/:boardId/columns`, async ({ request }) => {
          const body = await request.json() as { name: string };
          return HttpResponse.json(
            createMockColumn({ name: body.name, boardId: "board-1" }),
            { status: 201 }
          );
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add column"));

      const input = screen.getByPlaceholderText(/enter column name/i);
      await user.type(input, "Enter Column{Enter}");

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter column name/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("add todo functionality", () => {
    it("shows todo input form when Add a card is clicked", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getAllByText("Add a card")[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText("Add a card")[0]);

      expect(screen.getByPlaceholderText(/enter todo title/i)).toBeInTheDocument();
    });

    it("creates todo when form is submitted", async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`/api/todos`, async ({ request }) => {
          const body = await request.json() as { title: string; columnId: string };
          return HttpResponse.json(
            createMockTodo({ title: body.title, columnId: body.columnId }),
            { status: 201 }
          );
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getAllByText("Add a card")[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText("Add a card")[0]);

      const input = screen.getByPlaceholderText(/enter todo title/i);
      await user.type(input, "New Todo");

      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Form should close
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter todo title/i)).not.toBeInTheDocument();
      });
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("shows board not found when board does not exist", async () => {
      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json({ error: "Board not found" }, { status: 404 });
        })
      );

      renderBoardView("non-existent");

      await waitFor(() => {
        expect(screen.getByText("Board not found")).toBeInTheDocument();
      });
    });

    it("shows back to boards button on error", async () => {
      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json({ error: "Board not found" }, { status: 404 });
        })
      );

      renderBoardView("non-existent");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back to boards/i })).toBeInTheDocument();
      });
    });

    it("shows error state when API fails", async () => {
      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          );
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Board not found")).toBeInTheDocument();
      });
    });

    it("does not create column with empty name", async () => {
      const user = userEvent.setup();
      const columnCreateHandler = vi.fn();

      server.use(
        http.post(`/api/boards/:boardId/columns`, async ({ request }) => {
          const body = await request.json() as { name: string };
          columnCreateHandler(body);
          if (!body.name || !body.name.trim()) {
            return HttpResponse.json(
              { error: "Name is required" },
              { status: 400 }
            );
          }
          return HttpResponse.json(
            createMockColumn({ name: body.name, boardId: "board-1" }),
            { status: 201 }
          );
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add column"));

      // Try to submit empty form
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Form should still be visible (validation failed)
      expect(screen.getByPlaceholderText(/enter column name/i)).toBeInTheDocument();
      expect(columnCreateHandler).not.toHaveBeenCalled();
    });

    it("does not create column with whitespace-only name", async () => {
      const user = userEvent.setup();
      const columnCreateHandler = vi.fn();

      server.use(
        http.post(`/api/boards/:boardId/columns`, async ({ request }) => {
          const body = await request.json() as { name: string };
          columnCreateHandler(body);
          return HttpResponse.json(
            createMockColumn({ name: body.name, boardId: "board-1" }),
            { status: 201 }
          );
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add column")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add column"));

      const input = screen.getByPlaceholderText(/enter column name/i);
      await user.type(input, "   ");

      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Should not call API with whitespace-only name
      expect(columnCreateHandler).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles board with no columns", async () => {
      const emptyBoard = createMockBoard({
        id: "board-1",
        name: "Empty Board",
        columns: [],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(emptyBoard);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Empty Board")).toBeInTheDocument();
      });

      // Should show onboarding message with "Add your first column" button
      expect(screen.getByText("Get started with your board")).toBeInTheDocument();
      expect(screen.getByText("Add your first column")).toBeInTheDocument();
    });

    it("handles board without description", async () => {
      const boardWithoutDesc = createMockBoard({
        id: "board-1",
        name: "No Description Board",
        description: undefined,
        columns: [],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithoutDesc);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("No Description Board")).toBeInTheDocument();
      });

      // Should show "Add a description..." link
      expect(screen.getByText("Add a description...")).toBeInTheDocument();
    });

    it("handles columns with empty todos array", async () => {
      const boardWithEmptyColumns = createMockBoard({
        id: "board-1",
        name: "Test Board",
        columns: [
          createMockColumn({
            id: "column-1",
            name: "Empty Column",
            position: 0,
            boardId: "board-1",
            todos: [],
          }),
        ],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithEmptyColumns);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Empty Column")).toBeInTheDocument();
      });
      expect(screen.getByText("0")).toBeInTheDocument(); // Todo count
    });

    it("handles columns with undefined todos", async () => {
      const boardWithUndefinedTodos = createMockBoard({
        id: "board-1",
        name: "Test Board",
        columns: [
          {
            ...createMockColumn({
              id: "column-1",
              name: "Undefined Todos Column",
              position: 0,
              boardId: "board-1",
            }),
            todos: undefined,
          } as any,
        ],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithUndefinedTodos);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Undefined Todos Column")).toBeInTheDocument();
      });
    });

    it("sorts columns by position", async () => {
      const boardWithUnorderedColumns = createMockBoard({
        id: "board-1",
        name: "Test Board",
        columns: [
          createMockColumn({
            id: "column-3",
            name: "Third",
            position: 2,
            boardId: "board-1",
          }),
          createMockColumn({
            id: "column-1",
            name: "First",
            position: 0,
            boardId: "board-1",
          }),
          createMockColumn({
            id: "column-2",
            name: "Second",
            position: 1,
            boardId: "board-1",
          }),
        ],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithUnorderedColumns);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("First")).toBeInTheDocument();
      });

      // Check order of columns
      const columnHeaders = screen.getAllByText(/First|Second|Third/);
      expect(columnHeaders[0]).toHaveTextContent("First");
      expect(columnHeaders[1]).toHaveTextContent("Second");
      expect(columnHeaders[2]).toHaveTextContent("Third");
    });

    it("handles very long board name", async () => {
      const longName = "A".repeat(200);
      const boardWithLongName = createMockBoard({
        id: "board-1",
        name: longName,
        columns: [],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithLongName);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
      });
    });

    it("handles special characters in board name", async () => {
      const boardWithSpecialChars = createMockBoard({
        id: "board-1",
        name: "<script>alert('xss')</script>",
        columns: [],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithSpecialChars);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
      });
      expect(screen.queryByRole("script")).not.toBeInTheDocument();
    });

    it("handles many columns", async () => {
      const manyColumns = Array.from({ length: 10 }, (_, i) =>
        createMockColumn({
          id: `column-${i}`,
          name: `Column ${i + 1}`,
          position: i,
          boardId: "board-1",
        })
      );

      const boardWithManyColumns = createMockBoard({
        id: "board-1",
        name: "Many Columns Board",
        columns: manyColumns,
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithManyColumns);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Column 1")).toBeInTheDocument();
      });

      // All columns should be rendered
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Column ${i}`)).toBeInTheDocument();
      }
    });

    it("handles column with many todos", async () => {
      const manyTodos = Array.from({ length: 50 }, (_, i) =>
        createMockTodo({
          id: `todo-${i}`,
          title: `Todo ${i + 1}`,
          position: i,
          columnId: "column-1",
        })
      );

      const boardWithManyTodos = createMockBoard({
        id: "board-1",
        name: "Many Todos Board",
        columns: [
          createMockColumn({
            id: "column-1",
            name: "Todos",
            position: 0,
            boardId: "board-1",
            todos: manyTodos,
          }),
        ],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithManyTodos);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Todo 1")).toBeInTheDocument();
      });
      expect(screen.getByText("50")).toBeInTheDocument(); // Todo count badge
    });
  });

  describe("accessibility", () => {
    it("has proper heading structure", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Project Alpha");
      });
    });

    it("back link is accessible", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      const backLink = document.querySelector('a[href="/"]');
      expect(backLink).toBeInTheDocument();
    });

    it("buttons are accessible", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Labels")).toBeInTheDocument();
      });

      const labelsButton = screen.getByText("Labels").closest("button");
      expect(labelsButton).toBeInTheDocument();

      // Settings button is intentionally not implemented (see PRD issue 1.2)
      // It will be tested when the Settings feature is added
    });
  });

  describe("board name editing (Issue 2.0.1)", () => {
    it("shows edit input when clicking board name", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Click on board name to edit
      await user.click(screen.getByRole("heading", { name: "Project Alpha" }));

      // Input should appear
      const input = screen.getByDisplayValue("Project Alpha");
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
    });

    it("saves board name on blur", async () => {
      const user = userEvent.setup();

      server.use(
        http.patch(`/api/boards/:id`, async ({ request }) => {
          const body = await request.json() as { name?: string };
          return HttpResponse.json({
            ...mockBoardWithTodos,
            name: body.name || mockBoardWithTodos.name,
          });
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Click on board name to edit
      await user.click(screen.getByRole("heading", { name: "Project Alpha" }));

      // Clear and type new name
      const input = screen.getByDisplayValue("Project Alpha");
      await user.clear(input);
      await user.type(input, "Updated Board Name");

      // Blur to save
      await user.tab();

      await waitFor(() => {
        // Input should no longer be visible
        expect(screen.queryByDisplayValue("Updated Board Name")).not.toBeInTheDocument();
      });
    });

    it("saves board name on Enter key", async () => {
      const user = userEvent.setup();

      server.use(
        http.patch(`/api/boards/:id`, async ({ request }) => {
          const body = await request.json() as { name?: string };
          return HttpResponse.json({
            ...mockBoardWithTodos,
            name: body.name || mockBoardWithTodos.name,
          });
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("heading", { name: "Project Alpha" }));
      const input = screen.getByDisplayValue("Project Alpha");
      await user.clear(input);
      await user.type(input, "New Name{Enter}");

      await waitFor(() => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      });
    });

    it("cancels editing on Escape key", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("heading", { name: "Project Alpha" }));
      const input = screen.getByDisplayValue("Project Alpha");
      await user.clear(input);
      await user.type(input, "Cancelled Name");
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });
    });

    it("does not save empty board name", async () => {
      const user = userEvent.setup();
      const patchHandler = vi.fn();

      server.use(
        http.patch(`/api/boards/:id`, async ({ request }) => {
          patchHandler(await request.json());
          return HttpResponse.json(mockBoardWithTodos);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("heading", { name: "Project Alpha" }));
      const input = screen.getByDisplayValue("Project Alpha");
      await user.clear(input);
      await user.tab();

      // Should not call API with empty name
      expect(patchHandler).not.toHaveBeenCalled();
    });
  });

  describe("inline board description editing", () => {
    it("shows inline description when board has description", async () => {
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Description is rendered as plain text (click to edit)
      expect(screen.getByText("Main project board")).toBeInTheDocument();
    });

    it("opens inline editor when clicking description", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Click on the description text to start editing
      await user.click(screen.getByText("Main project board"));

      // Should show the RichTextEditor textarea (mocked) for inline editing
      await waitFor(() => {
        expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
      });
    });

    it("shows editor with current description when entering edit mode", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Click description text to edit
      await user.click(screen.getByText("Main project board"));

      await waitFor(() => {
        const editor = screen.getByTestId("rich-text-editor") as HTMLTextAreaElement;
        expect(editor).toBeInTheDocument();
        expect(editor.value).toBe("Main project board");
      });
    });

    it("reverts to read-only mode after blur", async () => {
      const user = userEvent.setup();
      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      });

      // Click description text to edit
      await user.click(screen.getByText("Main project board"));

      await waitFor(() => {
        expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
      });

      // Click elsewhere to blur
      await user.click(screen.getByText("Project Alpha"));

      // Should revert to read-only description text
      await waitFor(() => {
        expect(screen.getByText("Main project board")).toBeInTheDocument();
      });
    });

    it("shows 'Add a description...' link when board has no description", async () => {
      const boardWithoutDesc = createMockBoard({
        id: "board-1",
        name: "No Description Board",
        description: undefined,
        columns: [],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithoutDesc);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add a description...")).toBeInTheDocument();
      });
    });

    it("opens inline editor when 'Add a description...' link is clicked", async () => {
      const user = userEvent.setup();
      const boardWithoutDesc = createMockBoard({
        id: "board-1",
        name: "No Description Board",
        description: undefined,
        columns: [],
      });

      server.use(
        http.get(`/api/boards/:id`, () => {
          return HttpResponse.json(boardWithoutDesc);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Add a description...")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add a description..."));

      // Should show inline editor (RichTextEditor)
      await waitFor(() => {
        expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
      });
    });
  });

  describe("detail panel (todo editing)", () => {
    it("opens detail panel when clicking on a todo", async () => {
      const user = userEvent.setup();

      server.use(
        http.get(`/api/labels`, () => {
          return HttpResponse.json(mockLabels);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("First Task")).toBeInTheDocument();
      });

      await user.click(screen.getByText("First Task"));

      // DetailPanel renders a close button with aria-label="Close panel"
      await waitFor(() => {
        expect(screen.getByLabelText("Close panel")).toBeInTheDocument();
      });
    });

    it("closes detail panel when close button is clicked", async () => {
      const user = userEvent.setup();

      server.use(
        http.get(`/api/labels`, () => {
          return HttpResponse.json(mockLabels);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("First Task")).toBeInTheDocument();
      });

      await user.click(screen.getByText("First Task"));

      await waitFor(() => {
        expect(screen.getByLabelText("Close panel")).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText("Close panel"));

      await waitFor(() => {
        expect(screen.queryByLabelText("Close panel")).not.toBeInTheDocument();
      });
    });

    it("shows todo title in detail panel", async () => {
      const user = userEvent.setup();

      server.use(
        http.get(`/api/labels`, () => {
          return HttpResponse.json(mockLabels);
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("First Task")).toBeInTheDocument();
      });

      await user.click(screen.getByText("First Task"));

      await waitFor(() => {
        expect(screen.getByLabelText("Close panel")).toBeInTheDocument();
      });

      // DetailPanel shows a title input with the todo's title
      const titleInput = screen.getByDisplayValue("First Task");
      expect(titleInput).toBeInTheDocument();
    });

    it("shows delete task button in detail panel", async () => {
      const user = userEvent.setup();

      server.use(
        http.get(`/api/labels`, () => {
          return HttpResponse.json(mockLabels);
        }),
        http.delete(`/api/todos/:id`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("First Task")).toBeInTheDocument();
      });

      await user.click(screen.getByText("First Task"));

      await waitFor(() => {
        expect(screen.getByLabelText("Close panel")).toBeInTheDocument();
      });

      // DetailPanel has a "Delete task" button in the footer
      expect(screen.getByText("Delete task")).toBeInTheDocument();
    });
  });

  describe("column management", () => {
    it("shows column options menu with Edit Description and Delete Column", async () => {
      const user = userEvent.setup();

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Todo")).toBeInTheDocument();
      });

      // Find and click column options menu
      const columnOptions = screen.getAllByLabelText("Column options")[0];
      await user.click(columnOptions);

      // Menu should show Edit Description and Delete Column options
      expect(screen.getByText("Edit Description")).toBeInTheDocument();
      expect(screen.getByText("Delete Column")).toBeInTheDocument();
    });

    it("deletes column when Delete Column is clicked", async () => {
      const user = userEvent.setup();

      server.use(
        http.delete(`/api/columns/:id`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      renderBoardView();

      await waitFor(() => {
        expect(screen.getByText("Done")).toBeInTheDocument();
      });

      // Find the Done column's options menu (3rd column, empty)
      const columnOptions = screen.getAllByLabelText("Column options")[2];
      await user.click(columnOptions);

      // Click Delete Column (immediate, no confirmation dialog)
      await user.click(screen.getByText("Delete Column"));

      // Menu should close after clicking
      await waitFor(() => {
        expect(screen.queryByText("Delete Column")).not.toBeInTheDocument();
      });
    });
  });
});
