import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "../../../../src/test/utils";
import { BoardList } from "../../../../src/components/board/BoardList";
import { server } from "../../../../src/test/mocks/server";
import { http, HttpResponse } from "msw";
import { createMockBoard, createMockColumn, createMockTodo } from "../../../../src/test/mocks/handlers";

describe("Feature: Board Navigation", () => {
  describe("Scenario: User sees skeleton loaders during fetch", () => {
    it("Given boards are loading, When the board list renders, Then skeleton loaders are displayed", () => {
      // Given: boards are loading (default MSW handler has network latency,
      // so the component starts in loading state on initial render)
      server.use(
        http.get(`/api/boards`, async () => {
          // Delay response to keep the loading state visible
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return HttpResponse.json([]);
        })
      );

      // When: the board list renders
      render(<BoardList />);

      // Then: skeleton loaders are displayed
      const skeletons = screen.getAllByTestId("board-card-skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });
  });

  describe("Scenario: User sees empty state when no boards exist", () => {
    it("Given the API returns empty boards array, When the board list renders, Then empty state message and inline create form appear", async () => {
      // Given: the API returns empty boards array
      server.use(
        http.get(`/api/boards`, () => {
          return HttpResponse.json([]);
        })
      );

      // When: the board list renders
      render(<BoardList />);

      // Then: "Create your first board" message appears
      await waitFor(() => {
        expect(screen.getByText("Create your first board")).toBeInTheDocument();
      });

      // Then: an inline create form is displayed with a board name input
      expect(screen.getByTestId("inline-create-form")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/board name/i)).toBeInTheDocument();

      // Then: helpful description text is shown
      expect(
        screen.getByText(/Organize your tasks into boards and columns/i)
      ).toBeInTheDocument();
    });
  });

  describe("Scenario: User sees board cards with task counts", () => {
    it("Given boards exist with columns and todos, When the board list renders, Then task count and column count are displayed", async () => {
      // Given: boards exist with columns and todos
      server.use(
        http.get(`/api/boards`, () => {
          return HttpResponse.json([
            createMockBoard({
              id: "board-bdd-1",
              name: "Sprint Board",
              description: "Current sprint tasks",
              todoCount: 7,
              columns: [
                createMockColumn({
                  id: "col-1",
                  name: "Backlog",
                  position: 0,
                  boardId: "board-bdd-1",
                  todos: [
                    createMockTodo({ id: "t1", title: "Task 1", position: 0 }),
                    createMockTodo({ id: "t2", title: "Task 2", position: 1 }),
                  ],
                }),
                createMockColumn({
                  id: "col-2",
                  name: "In Progress",
                  position: 1,
                  boardId: "board-bdd-1",
                  todos: [
                    createMockTodo({ id: "t3", title: "Task 3", position: 0 }),
                  ],
                }),
                createMockColumn({
                  id: "col-3",
                  name: "Done",
                  position: 2,
                  boardId: "board-bdd-1",
                  todos: [
                    createMockTodo({ id: "t4", title: "Task 4", position: 0 }),
                    createMockTodo({ id: "t5", title: "Task 5", position: 1 }),
                  ],
                }),
              ],
            }),
          ]);
        })
      );

      // When: the board list renders
      render(<BoardList />);

      // Then: the board name is visible
      await waitFor(() => {
        expect(screen.getByText("Sprint Board")).toBeInTheDocument();
      });

      // Then: column count is displayed
      expect(screen.getByText(/3 columns/)).toBeInTheDocument();

      // Then: task count is displayed
      expect(screen.getByText(/7 tasks/)).toBeInTheDocument();

      // Then: the todo-count section is present
      expect(screen.getByTestId("todo-count")).toBeInTheDocument();
    });
  });
});
