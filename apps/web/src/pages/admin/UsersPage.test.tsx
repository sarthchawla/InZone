import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/utils";

vi.mock("../../lib/auth-client", () => ({
  authClient: {
    admin: {
      listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
      setRole: vi.fn().mockResolvedValue({}),
      banUser: vi.fn().mockResolvedValue({}),
      unbanUser: vi.fn().mockResolvedValue({}),
      removeUser: vi.fn().mockResolvedValue({}),
    },
  },
}));
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", name: "Admin", email: "admin@example.com" },
  }),
}));
vi.mock("../../api/client", () => ({
  getErrorMessage: (err: any) => err?.message || "Error",
}));

import { authClient } from "../../lib/auth-client";
import { UsersPage } from "./UsersPage";

const mockListUsers = authClient.admin.listUsers as ReturnType<typeof vi.fn>;
const mockSetRole = authClient.admin.setRole as ReturnType<typeof vi.fn>;
const mockBanUser = authClient.admin.banUser as ReturnType<typeof vi.fn>;
const mockUnbanUser = authClient.admin.unbanUser as ReturnType<typeof vi.fn>;
const mockRemoveUser = authClient.admin.removeUser as ReturnType<typeof vi.fn>;

const usersData = [
  {
    id: "admin-1",
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
    banned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "user-2",
    name: "Regular User",
    email: "user@example.com",
    role: "user",
    banned: false,
    createdAt: new Date("2026-01-15T00:00:00Z"),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockListUsers.mockResolvedValue({ data: { users: [] } });
});

describe("UsersPage", () => {
  it("renders heading 'Users'", async () => {
    render(<UsersPage />);
    expect(
      screen.getByRole("heading", { name: /users/i })
    ).toBeInTheDocument();
  });

  it("renders user list with name and email", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
      expect(screen.getAllByText("admin@example.com").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Regular User").length).toBeGreaterThan(0);
      expect(screen.getAllByText("user@example.com").length).toBeGreaterThan(0);
    });
  });

  it("shows 'you' badge for current user", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("you").length).toBeGreaterThan(0);
    });
  });

  it("hides action buttons for current user", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Regular User").length).toBeGreaterThan(0);
    });

    // Promote buttons should exist only for non-self users (desktop + mobile = 2)
    const promoteButtons = screen.getAllByText("Promote");
    expect(promoteButtons).toHaveLength(2); // desktop + mobile for user-2 only
  });

  it("shows Promote/Demote toggle", async () => {
    const mixedUsers = [
      ...usersData,
      {
        id: "user-3",
        name: "Another Admin",
        email: "admin2@example.com",
        role: "admin",
        banned: false,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ];
    mockListUsers.mockResolvedValue({ data: { users: mixedUsers } });

    render(<UsersPage />);

    await waitFor(() => {
      // user-2 has role "user" -> shows "Promote"
      expect(screen.getAllByText("Promote").length).toBeGreaterThan(0);
      // user-3 has role "admin" -> shows "Demote"
      expect(screen.getAllByText("Demote").length).toBeGreaterThan(0);
    });
  });

  it("shows Ban/Unban toggle based on ban status", async () => {
    const usersWithBanned = [
      ...usersData,
      {
        id: "user-3",
        name: "Banned User",
        email: "banned@example.com",
        role: "user",
        banned: true,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ];
    mockListUsers.mockResolvedValue({ data: { users: usersWithBanned } });

    render(<UsersPage />);

    await waitFor(() => {
      // user-2 is not banned -> shows "Ban"
      expect(screen.getAllByText("Ban").length).toBeGreaterThan(0);
      // user-3 is banned -> shows "Unban"
      expect(screen.getAllByText("Unban").length).toBeGreaterThan(0);
    });
  });

  it("calls setRole on Promote click", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });
    mockSetRole.mockResolvedValue({});

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Promote").length).toBeGreaterThan(0);
    });

    // Click the first Promote button (desktop table)
    fireEvent.click(screen.getAllByText("Promote")[0]);

    await waitFor(() => {
      expect(mockSetRole).toHaveBeenCalledWith({
        userId: "user-2",
        role: "admin",
      });
    });
  });

  it("calls banUser when clicking Ban on an active user", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });
    mockBanUser.mockResolvedValue({});

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Ban").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText("Ban")[0]);

    await waitFor(() => {
      expect(mockBanUser).toHaveBeenCalledWith({ userId: "user-2" });
    });
  });

  it("calls unbanUser when clicking Unban on a banned user", async () => {
    const usersWithBanned = [
      usersData[0],
      {
        id: "user-2",
        name: "Banned User",
        email: "banned@example.com",
        role: "user",
        banned: true,
        createdAt: new Date("2026-01-15T00:00:00Z"),
      },
    ];
    mockListUsers.mockResolvedValue({ data: { users: usersWithBanned } });
    mockUnbanUser.mockResolvedValue({});

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Unban").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText("Unban")[0]);

    await waitFor(() => {
      expect(mockUnbanUser).toHaveBeenCalledWith({ userId: "user-2" });
    });
  });

  it("calls removeUser when clicking Remove and confirming in dialog", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });
    mockRemoveUser.mockResolvedValue({});

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Remove").length).toBeGreaterThan(0);
    });

    // Click Remove button to open confirm dialog
    fireEvent.click(screen.getAllByText("Remove")[0]);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Remove User")).toBeInTheDocument();
    });

    // Click the confirm "Remove" button in the dialog
    const dialogRemoveBtn = screen.getByRole("button", { name: /^Remove$/ });
    fireEvent.click(dialogRemoveBtn);

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalledWith({ userId: "user-2" });
    });
  });

  it("does not call removeUser when clicking Cancel in confirm dialog", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Remove").length).toBeGreaterThan(0);
    });

    // Click Remove button to open confirm dialog
    fireEvent.click(screen.getAllByText("Remove")[0]);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Remove User")).toBeInTheDocument();
    });

    // Click Cancel
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should close and removeUser should not be called
    await waitFor(() => {
      expect(screen.queryByText("Remove User")).not.toBeInTheDocument();
    });
    expect(mockRemoveUser).not.toHaveBeenCalled();
  });

  it("shows error message when loadUsers fails", async () => {
    mockListUsers.mockRejectedValue(new Error("Network failure"));

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network failure");
    });
  });

  it("shows error message when setRole fails", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });
    mockSetRole.mockRejectedValue(new Error("Permission denied"));

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Promote").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText("Promote")[0]);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Permission denied");
    });
  });
});
