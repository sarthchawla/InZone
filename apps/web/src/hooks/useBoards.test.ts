import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  useBoards,
  useBoard,
  useTemplates,
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
  boardKeys,
} from "./useBoards";
import { createQueryClientWrapper } from "../test/utils";
import { server } from "../test/mocks/server";
import {
  mockBoards,
  mockTemplates,
  createMockBoard,
  API_BASE,
} from "../test/mocks/handlers";

describe("useBoards hook", () => {
  // Happy Path Tests
  describe("fetching boards", () => {
    it("fetches boards successfully", async () => {
      const { result } = renderHook(() => useBoards(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(mockBoards.length);
      expect(result.current.data?.[0].name).toBe("Project Alpha");
    });

    it("returns loading state initially", () => {
      const { result } = renderHook(() => useBoards(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("returns empty array when no boards exist", async () => {
      server.use(
        http.get(`${API_BASE}/api/boards`, () => {
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() => useBoards(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles network error", async () => {
      server.use(
        http.get(`${API_BASE}/api/boards`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useBoards(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it("handles network failure", async () => {
      server.use(
        http.get(`${API_BASE}/api/boards`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useBoards(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles service unavailable", async () => {
      server.use(
        http.get(`${API_BASE}/api/boards`, () => {
          return HttpResponse.json(
            { error: "Service Unavailable" },
            { status: 503 }
          );
        })
      );

      const { result } = renderHook(() => useBoards(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useBoard hook", () => {
  // Happy Path Tests
  describe("fetching single board", () => {
    it("fetches board by ID successfully", async () => {
      const { result } = renderHook(() => useBoard("board-1"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe("board-1");
      expect(result.current.data?.name).toBe("Project Alpha");
    });

    it("includes columns in board data", async () => {
      const { result } = renderHook(() => useBoard("board-1"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.columns).toBeDefined();
      expect(result.current.data?.columns.length).toBeGreaterThan(0);
    });

    it("does not fetch when boardId is undefined", () => {
      const { result } = renderHook(() => useBoard(undefined), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent board", async () => {
      const { result } = renderHook(() => useBoard("non-existent"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error when fetching board", async () => {
      server.use(
        http.get(`${API_BASE}/api/boards/:id`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useBoard("board-1"), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useTemplates hook", () => {
  // Happy Path Tests
  describe("fetching templates", () => {
    it("fetches templates successfully", async () => {
      const { result } = renderHook(() => useTemplates(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(mockTemplates.length);
      expect(result.current.data?.[0].name).toBe("Basic Kanban");
    });

    it("templates include column definitions", async () => {
      const { result } = renderHook(() => useTemplates(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const kanbanTemplate = result.current.data?.find(
        (t) => t.id === "kanban-basic"
      );
      expect(kanbanTemplate?.columns).toBeDefined();
      expect(kanbanTemplate?.columns.length).toBeGreaterThan(0);
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles server error when fetching templates", async () => {
      server.use(
        http.get(`${API_BASE}/api/templates`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useCreateBoard hook", () => {
  // Happy Path Tests
  describe("creating boards", () => {
    it("creates board successfully", async () => {
      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "New Board" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe("New Board");
    });

    it("creates board with description", async () => {
      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        name: "New Board",
        description: "A new board description",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.description).toBe("A new board description");
    });

    it("creates board from template", async () => {
      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        name: "Template Board",
        templateId: "kanban-basic",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("returns idle state initially", () => {
      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      expect(result.current.isIdle).toBe(true);
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles validation error for empty name", async () => {
      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during creation", async () => {
      server.use(
        http.post(`${API_BASE}/api/boards`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Test Board" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure during creation", async () => {
      server.use(
        http.post(`${API_BASE}/api/boards`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ name: "Test Board" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles invalid template ID", async () => {
      server.use(
        http.post(`${API_BASE}/api/boards`, () => {
          return HttpResponse.json(
            { error: "Template not found" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCreateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        name: "Test Board",
        templateId: "invalid-template",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useUpdateBoard hook", () => {
  // Happy Path Tests
  describe("updating boards", () => {
    it("updates board name successfully", async () => {
      const { result } = renderHook(() => useUpdateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "board-1", name: "Updated Name" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe("Updated Name");
    });

    it("updates board description successfully", async () => {
      const { result } = renderHook(() => useUpdateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "board-1",
        description: "Updated description",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.description).toBe("Updated description");
    });

    it("updates multiple fields at once", async () => {
      const { result } = renderHook(() => useUpdateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({
        id: "board-1",
        name: "New Name",
        description: "New Description",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent board", async () => {
      const { result } = renderHook(() => useUpdateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "non-existent", name: "New Name" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during update", async () => {
      server.use(
        http.put(`${API_BASE}/api/boards/:id`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "board-1", name: "New Name" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure during update", async () => {
      server.use(
        http.put(`${API_BASE}/api/boards/:id`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useUpdateBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate({ id: "board-1", name: "New Name" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("useDeleteBoard hook", () => {
  // Happy Path Tests
  describe("deleting boards", () => {
    it("deletes board successfully", async () => {
      const { result } = renderHook(() => useDeleteBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("board-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("board-1");
    });
  });

  // Unhappy Path Tests
  describe("error handling", () => {
    it("handles 404 for non-existent board", async () => {
      const { result } = renderHook(() => useDeleteBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("non-existent");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles server error during deletion", async () => {
      server.use(
        http.delete(`${API_BASE}/api/boards/:id`, () => {
          return HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("board-1");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles network failure during deletion", async () => {
      server.use(
        http.delete(`${API_BASE}/api/boards/:id`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useDeleteBoard(), {
        wrapper: createQueryClientWrapper(),
      });

      result.current.mutate("board-1");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});

describe("boardKeys", () => {
  it("generates correct query keys", () => {
    expect(boardKeys.all).toEqual(["boards"]);
    expect(boardKeys.detail("board-1")).toEqual(["boards", "board-1"]);
    expect(boardKeys.templates).toEqual(["templates"]);
  });

  it("generates unique keys for different board IDs", () => {
    const key1 = boardKeys.detail("board-1");
    const key2 = boardKeys.detail("board-2");

    expect(key1).not.toEqual(key2);
  });
});
