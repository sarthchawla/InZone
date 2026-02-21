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
  it("renders heading 'User Management'", async () => {
    render(<UsersPage />);
    expect(
      screen.getByRole("heading", { name: /user management/i })
    ).toBeInTheDocument();
  });

  it("renders user list with name and email", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("Regular User")).toBeInTheDocument();
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });
  });

  it("shows '(you)' badge for current user", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("you")).toBeInTheDocument();
    });
  });

  it("hides action buttons for current user", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Regular User")).toBeInTheDocument();
    });

    // The other user should have Make Admin button, but the admin (self) should not
    const makeAdminButtons = screen.getAllByText("Make Admin");
    expect(makeAdminButtons).toHaveLength(1); // Only for user-2, not admin-1
  });

  it("shows Make Admin/Make User toggle", async () => {
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
      // user-2 has role "user" -> shows "Make Admin"
      expect(screen.getByText("Make Admin")).toBeInTheDocument();
      // user-3 has role "admin" -> shows "Make User"
      expect(screen.getByText("Make User")).toBeInTheDocument();
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
      expect(screen.getByText("Ban")).toBeInTheDocument();
      // user-3 is banned -> shows "Unban"
      expect(screen.getByText("Unban")).toBeInTheDocument();
    });
  });

  it("calls setRole on Make Admin click", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });
    mockSetRole.mockResolvedValue({});

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Make Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Make Admin"));

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
      expect(screen.getByText("Ban")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Ban"));

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
      expect(screen.getByText("Unban")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Unban"));

    await waitFor(() => {
      expect(mockUnbanUser).toHaveBeenCalledWith({ userId: "user-2" });
    });
  });

  it("calls removeUser when clicking Remove and confirming", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });
    mockRemoveUser.mockResolvedValue({});
    window.confirm = vi.fn(() => true);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Remove"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockRemoveUser).toHaveBeenCalledWith({ userId: "user-2" });
    });
  });

  it("does not call removeUser when clicking Remove and cancelling", async () => {
    mockListUsers.mockResolvedValue({ data: { users: usersData } });
    window.confirm = vi.fn(() => false);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Remove"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
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
      expect(screen.getByText("Make Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Make Admin"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Permission denied");
    });
  });
});
