import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test/utils";
import { SettingsPage } from "./SettingsPage";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Test User", email: "test@example.com" },
  }),
}));

vi.mock("../lib/auth-client", () => ({
  authClient: {
    updateUser: vi.fn(),
    changePassword: vi.fn(),
    revokeOtherSessions: vi.fn(),
  },
}));

vi.mock("../api/client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { configured: true } }),
    post: vi.fn(),
  },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

import { authClient } from "../lib/auth-client";
import { apiClient } from "../api/client";

const mockUpdateUser = authClient.updateUser as ReturnType<typeof vi.fn>;
const mockChangePassword = authClient.changePassword as ReturnType<typeof vi.fn>;
const mockRevokeOtherSessions = authClient.revokeOtherSessions as ReturnType<typeof vi.fn>;
const mockApiPost = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SettingsPage", () => {
  it("renders profile section with user name", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
  });

  it("shows email as read-only", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it("renders Settings heading", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("saves name changes on profile form submit", async () => {
    mockUpdateUser.mockResolvedValueOnce({});

    render(<SettingsPage />);

    const nameInput = screen.getByDisplayValue("Test User");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ name: "Updated Name" });
    });

    await waitFor(() => {
      expect(screen.getByText("Profile updated.")).toBeInTheDocument();
    });
  });

  it("shows Change Password section", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
  });

  it("shows Security Questions section with Configured status", async () => {
    render(<SettingsPage />);

    expect(screen.getByText("Security Questions")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Configured")).toBeInTheDocument();
    });
  });

  it("shows danger zone with Sign Out All button", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out all other devices/i })
    ).toBeInTheDocument();
  });

  it("calls revokeOtherSessions on sign out all click", async () => {
    mockRevokeOtherSessions.mockResolvedValueOnce({});

    render(<SettingsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign out all other devices/i })
    );

    await waitFor(() => {
      expect(mockRevokeOtherSessions).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("All other sessions revoked.")).toBeInTheDocument();
    });
  });

  it("changes password successfully", async () => {
    mockChangePassword.mockResolvedValueOnce({});

    render(<SettingsPage />);

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpass456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: "oldpass123",
        newPassword: "newpass456",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Password changed.")).toBeInTheDocument();
    });
  });

  it("shows error when change password fails", async () => {
    mockChangePassword.mockResolvedValueOnce({
      error: { message: "Wrong password" },
    });

    render(<SettingsPage />);

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "badpass" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpass456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Wrong password");
    });
  });

  it("shows security questions form when Update is clicked", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(screen.getByLabelText("Security question 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Security question 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Security question 3")).toBeInTheDocument();
    });
  });

  it("submits security questions form successfully", async () => {
    mockApiPost.mockResolvedValueOnce({});

    render(<SettingsPage />);

    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(screen.getByLabelText("Security question 1")).toBeInTheDocument();
    });

    const sq1 = screen.getByLabelText("Security question 1");
    const sq2 = screen.getByLabelText("Security question 2");
    const sq3 = screen.getByLabelText("Security question 3");

    fireEvent.change(sq1, {
      target: { value: "What was the name of your first pet?" },
    });
    fireEvent.change(sq2, {
      target: { value: "In what city were you born?" },
    });
    fireEvent.change(sq3, {
      target: { value: "What was the name of your first school?" },
    });

    const answerInputs = screen.getAllByPlaceholderText("Your answer");
    fireEvent.change(answerInputs[0], { target: { value: "Buddy" } });
    fireEvent.change(answerInputs[1], { target: { value: "Toronto" } });
    fireEvent.change(answerInputs[2], { target: { value: "Lincoln" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Update Questions" })
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Update Questions" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/security-questions/setup", {
        questions: [
          { question: "What was the name of your first pet?", answer: "Buddy" },
          { question: "In what city were you born?", answer: "Toronto" },
          { question: "What was the name of your first school?", answer: "Lincoln" },
        ],
      });
    });

    // After successful submission, the form hides and status shows "Configured"
    await waitFor(() => {
      expect(screen.queryByLabelText("Security question 1")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Configured")).toBeInTheDocument();
  });

  it("shows error when sign out all sessions fails", async () => {
    mockRevokeOtherSessions.mockRejectedValueOnce({
      response: { data: { error: "Session revoke failed" } },
    });

    render(<SettingsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign out all other devices/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Session revoke failed");
    });
  });

  it("disables Change Password button when fields are empty", () => {
    render(<SettingsPage />);

    const changeBtn = screen.getByRole("button", { name: "Change Password" });
    expect(changeBtn).toBeDisabled();
  });
});
