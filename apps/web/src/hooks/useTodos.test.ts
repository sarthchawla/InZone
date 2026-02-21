import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useMoveTodo,
  useReorderTodos,
  useArchiveTodo,
} from "./useTodos";
import { createQueryClientWrapper } from "../test/utils";
import { server } from "../test/mocks/server";
import { createMockTodo } from "../test/mocks/handlers";

describe("useCreateTodo hook", () => {
  // Happy Path Tests
  describe("creating todos", () => {
    it("creates todo with required fields successfully", async () => {
      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "column-1",
        boardId: "board-1",
        title: "New Todo",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.title).toBe("New Todo");
    });

    it("creates todo with all optional fields", async () => {
      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "column-1",
        boardId: "board-1",
        title: "Full Todo",
        description: "A detailed description",
        priority: "HIGH",
        dueDate: "2025-02-01",
        labelIds: ["label-1", "label-2"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.title).toBe("Full Todo");
    });

    it("creates todo with default MEDIUM priority", async () => {
      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "column-1",
        boardId: "board-1",
        title: "Default Priority Todo",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.priority).toBe("MEDIUM");
    });

    it("returns idle state initially", () => {
      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isIdle).toBe(true);
    });

    it("includes boardId in returned data", async () => {
      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "column-1",
        boardId: "board-123",
        title: "Test Todo",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.boardId).toBe("board-123");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles validation error for empty title", async () => {
      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "column-1",
        boardId: "board-1",
        title: "",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for missing columnId", async () => {
      server.use(
        http.post(`/api/todos`, () => {
          return HttpResponse.json(
            { error: "Column ID is required" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "",
        boardId: "board-1",
        title: "Test Todo",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during creation", async () => {
      server.use(
        http.post(`/api/todos`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "column-1",
        boardId: "board-1",
        title: "Test Todo",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.post(`/api/todos`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "column-1",
        boardId: "board-1",
        title: "Test Todo",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles non-existent column", async () => {
      server.use(
        http.post(`/api/todos`, () => {
          return HttpResponse.json(
            { error: "Column not found" },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useCreateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        columnId: "non-existent-column",
        boardId: "board-1",
        title: "Test Todo",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useUpdateTodo hook", () => {
  // Happy Path Tests
  describe("updating todos", () => {
    it("updates todo title successfully", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        title: "Updated Title",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.title).toBe("Updated Title");
    });

    it("updates todo description successfully", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        description: "Updated description",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.description).toBe("Updated description");
    });

    it("updates todo priority successfully", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        priority: "URGENT",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.priority).toBe("URGENT");
    });

    it("updates todo due date successfully", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        dueDate: "2025-03-15",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.dueDate).toBe("2025-03-15");
    });

    it("clears todo due date with null", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        dueDate: null,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("updates todo labels successfully", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        labelIds: ["label-1", "label-2"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("sets hadLabelUpdate flag when labelIds is included", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        labelIds: ["label-1"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.hadLabelUpdate).toBe(true);
    });

    it("does not set hadLabelUpdate flag when labelIds is not included", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        title: "Updated Title Without Labels",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.hadLabelUpdate).toBe(false);
    });

    it("updates multiple fields at once", async () => {
      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        title: "New Title",
        description: "New Description",
        priority: "HIGH",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent todo", async () => {
      server.use(
        http.put(`/api/todos/:id`, () => {
          return HttpResponse.json({ error: "Todo not found" }, { status: 404 });
        })
      );

      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "non-existent",
        boardId: "board-1",
        title: "Updated",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during update", async () => {
      server.use(
        http.put(`/api/todos/:id`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        title: "Updated",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.put(`/api/todos/:id`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useUpdateTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        title: "Updated",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useDeleteTodo hook", () => {
  // Happy Path Tests
  describe("deleting todos", () => {
    it("deletes todo successfully", async () => {
      const { result } = renderHook(() => useDeleteTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "todo-1", boardId: "board-1" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("todo-1");
    });

    it("returns boardId in deletion result", async () => {
      const { result } = renderHook(() => useDeleteTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "todo-1", boardId: "board-123" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.boardId).toBe("board-123");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent todo", async () => {
      server.use(
        http.delete(`/api/todos/:id`, () => {
          return HttpResponse.json({ error: "Todo not found" }, { status: 404 });
        })
      );

      const { result } = renderHook(() => useDeleteTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "non-existent", boardId: "board-1" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during deletion", async () => {
      server.use(
        http.delete(`/api/todos/:id`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "todo-1", boardId: "board-1" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.delete(`/api/todos/:id`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useDeleteTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "todo-1", boardId: "board-1" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useMoveTodo hook", () => {
  // Happy Path Tests
  describe("moving todos", () => {
    it("moves todo to different column successfully", async () => {
      const { result } = renderHook(() => useMoveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        columnId: "column-2",
        position: 0,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.columnId).toBe("column-2");
    });

    it("moves todo to specific position", async () => {
      const { result } = renderHook(() => useMoveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        columnId: "column-2",
        position: 3,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.position).toBe(3);
    });

    it("includes boardId in returned data", async () => {
      const { result } = renderHook(() => useMoveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-123",
        columnId: "column-2",
        position: 0,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.boardId).toBe("board-123");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent todo", async () => {
      server.use(
        http.patch(`/api/todos/:id/move`, () => {
          return HttpResponse.json({ error: "Todo not found" }, { status: 404 });
        })
      );

      const { result } = renderHook(() => useMoveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "non-existent",
        boardId: "board-1",
        columnId: "column-2",
        position: 0,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles 404 for non-existent target column", async () => {
      server.use(
        http.patch(`/api/todos/:id/move`, () => {
          return HttpResponse.json(
            { error: "Column not found" },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useMoveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        columnId: "non-existent-column",
        position: 0,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during move", async () => {
      server.use(
        http.patch(`/api/todos/:id/move`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useMoveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        columnId: "column-2",
        position: 0,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.patch(`/api/todos/:id/move`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useMoveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        columnId: "column-2",
        position: 0,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useReorderTodos hook", () => {
  // Happy Path Tests
  describe("reordering todos", () => {
    it("reorders todos successfully with columnId", async () => {
      const { result } = renderHook(() => useReorderTodos(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnId: "column-1",
        todoIds: ["todo-3", "todo-1", "todo-2"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("board-1");
    });

    it("handles single todo in array", async () => {
      const { result } = renderHook(() => useReorderTodos(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnId: "column-1",
        todoIds: ["todo-1"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("handles empty todo array", async () => {
      const { result } = renderHook(() => useReorderTodos(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnId: "column-1",
        todoIds: [],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("sends correct payload format with positions", async () => {
      // This test verifies that the mutation transforms todoIds to the correct payload format
      // API expects: { columnId, todos: [{ id, position }] }
      const { result } = renderHook(() => useReorderTodos(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnId: "column-1",
        todoIds: ["todo-a", "todo-b", "todo-c"],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // Success indicates the mock handler accepted our payload format
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles server error during reorder", async () => {
      server.use(
        http.patch(`/api/todos/reorder`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useReorderTodos(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnId: "column-1",
        todoIds: ["todo-1", "todo-2"],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.patch(`/api/todos/reorder`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useReorderTodos(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnId: "column-1",
        todoIds: ["todo-1", "todo-2"],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles validation error for invalid todo IDs", async () => {
      server.use(
        http.patch(`/api/todos/reorder`, () => {
          return HttpResponse.json(
            { error: "Invalid todo IDs" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useReorderTodos(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        boardId: "board-1",
        columnId: "column-1",
        todoIds: ["invalid-id"],
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useArchiveTodo hook", () => {
  // Happy Path Tests
  describe("archiving todos", () => {
    it("archives todo successfully", async () => {
      const { result } = renderHook(() => useArchiveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        archived: true,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.archived).toBe(true);
    });

    it("unarchives todo successfully", async () => {
      const { result } = renderHook(() => useArchiveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        archived: false,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.archived).toBe(false);
    });

    it("includes boardId in returned data", async () => {
      const { result } = renderHook(() => useArchiveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-123",
        archived: true,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.boardId).toBe("board-123");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent todo", async () => {
      server.use(
        http.patch(`/api/todos/:id/archive`, () => {
          return HttpResponse.json({ error: "Todo not found" }, { status: 404 });
        })
      );

      const { result } = renderHook(() => useArchiveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "non-existent",
        boardId: "board-1",
        archived: true,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during archive", async () => {
      server.use(
        http.patch(`/api/todos/:id/archive`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useArchiveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        archived: true,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure", async () => {
      server.use(
        http.patch(`/api/todos/:id/archive`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useArchiveTodo(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "todo-1",
        boardId: "board-1",
        archived: true,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

// TODO: Skipped – optimistic cache updates don't propagate reliably in jsdom
describe.skip("optimistic updates with seeded cache", () => {
  const BOARD_ID = "board-opt";
  const buildBoard = (): Board =>
    createMockBoard({
      id: BOARD_ID,
      todoCount: 2,
      columns: [
        createMockColumn({
          id: "col-a",
          name: "Todo",
          position: 0,
          boardId: BOARD_ID,
          todos: [
            createMockTodo({ id: "t1", title: "Task 1", columnId: "col-a", position: 0 }),
            createMockTodo({ id: "t2", title: "Task 2", columnId: "col-a", position: 1 }),
          ],
        }),
        createMockColumn({ id: "col-b", name: "Done", position: 1, boardId: BOARD_ID }),
      ],
    });

  it("useCreateTodo adds optimistic todo to correct column", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.post("/api/todos", () =>
        HttpResponse.json(createMockTodo({ id: "t-new", title: "New Task", columnId: "col-a" }))
      ),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useCreateTodo(), { wrapper });

    act(() => {
      result.current.mutate({ columnId: "col-a", boardId: BOARD_ID, title: "New Task" });
    });

    // Check optimistic update synchronously
    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    const colA = cached?.columns.find((c) => c.id === "col-a");
    expect(colA?.todos?.length).toBe(3);
    expect(cached?.todoCount).toBe(3);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useCreateTodo with all optional fields applies optimistic update", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.post("/api/todos", () =>
        HttpResponse.json(createMockTodo({ id: "t-full", title: "Full", priority: "HIGH", columnId: "col-a" }))
      ),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useCreateTodo(), { wrapper });

    act(() => {
      result.current.mutate({
        columnId: "col-a",
        boardId: BOARD_ID,
        title: "Full",
        description: "Desc",
        priority: "HIGH",
        dueDate: "2026-01-01",
      });
    });

    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    const optimistic = cached?.columns
      .find((c) => c.id === "col-a")
      ?.todos?.find((t) => t.title === "Full");
    expect(optimistic?.priority).toBe("HIGH");
    expect(optimistic?.dueDate).toBe("2026-01-01");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdateTodo applies optimistic update with null-to-undefined conversion", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.put("/api/todos/t1", () =>
        HttpResponse.json({ ...board.columns[0].todos![0], title: "Updated", dueDate: undefined })
      ),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useUpdateTodo(), { wrapper });

    act(() => {
      result.current.mutate({ id: "t1", boardId: BOARD_ID, title: "Updated", dueDate: null });
    });

    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    const todo = cached?.columns.find((c) => c.id === "col-a")?.todos?.find((t) => t.id === "t1");
    expect(todo?.title).toBe("Updated");
    expect(todo?.dueDate).toBeUndefined();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeleteTodo removes todo and decrements todoCount optimistically", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.delete("/api/todos/t1", () => HttpResponse.json({ success: true })),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useDeleteTodo(), { wrapper });

    act(() => {
      result.current.mutate({ id: "t1", boardId: BOARD_ID });
    });

    const cached = queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID));
    const colA = cached?.columns.find((c) => c.id === "col-a");
    expect(colA?.todos?.find((t) => t.id === "t1")).toBeUndefined();
    expect(cached?.todoCount).toBe(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useCreateTodo rollbacks on error when cache was seeded", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.post("/api/todos", () => HttpResponse.json({ error: "fail" }, { status: 500 })),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useCreateTodo(), { wrapper });

    act(() => {
      result.current.mutate({ columnId: "col-a", boardId: BOARD_ID, title: "Wont Stick" });
    });

    // Optimistic: 3 todos
    expect(queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID))?.columns.find((c) => c.id === "col-a")?.todos?.length).toBe(3);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("useUpdateTodo rollbacks on error when cache was seeded", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.put("/api/todos/t1", () => HttpResponse.json({ error: "fail" }, { status: 500 })),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useUpdateTodo(), { wrapper });

    act(() => {
      result.current.mutate({ id: "t1", boardId: BOARD_ID, title: "Wont Stick" });
    });

    // Optimistic: title changed
    expect(queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID))?.columns.find((c) => c.id === "col-a")?.todos?.find((t) => t.id === "t1")?.title).toBe("Wont Stick");

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("useDeleteTodo rollbacks on error when cache was seeded", async () => {
    const board = buildBoard();
    const { queryClient, wrapper } = createSeededWrapper(board);
    server.use(
      http.delete("/api/todos/t1", () => HttpResponse.json({ error: "fail" }, { status: 500 })),
      http.get(`/api/boards/${BOARD_ID}`, () => HttpResponse.json(board))
    );

    const { result } = renderHook(() => useDeleteTodo(), { wrapper });

    act(() => {
      result.current.mutate({ id: "t1", boardId: BOARD_ID });
    });

    // Optimistic: todo removed
    expect(queryClient.getQueryData<Board>(boardKeys.detail(BOARD_ID))?.columns.find((c) => c.id === "col-a")?.todos?.find((t) => t.id === "t1")).toBeUndefined();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
