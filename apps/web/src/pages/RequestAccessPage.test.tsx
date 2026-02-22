import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test/utils";
import { RequestAccessPage } from "./RequestAccessPage";

vi.mock("../api/client", () => ({
  apiClient: { post: vi.fn() },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

import { apiClient } from "../api/client";

const mockedApiClient = vi.mocked(apiClient);

const VALID_PASSWORD = "Password1!";

function fillRequiredFields() {
  const nameInput = screen.getByText("Name *").parentElement!.querySelector("input")!;
  const emailInput = screen.getByText("Email *").parentElement!.querySelector("input")!;
  const passwordInput = screen.getByText("Password *").parentElement!.querySelector("input")!;
  const confirmInput = screen.getByText("Confirm Password *").parentElement!.querySelector("input")!;

  fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
  fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
  fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
  fireEvent.change(confirmInput, { target: { value: VALID_PASSWORD } });

  return { nameInput, emailInput, passwordInput, confirmInput };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RequestAccessPage", () => {
  it("renders request form with name, email, password, and confirm password fields", () => {
    render(<RequestAccessPage />);
    expect(
      screen.getByRole("heading", { name: /request access to inzone/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Name *")).toBeInTheDocument();
    expect(screen.getByText("Email *")).toBeInTheDocument();
    expect(screen.getByText("Password *")).toBeInTheDocument();
    expect(screen.getByText("Confirm Password *")).toBeInTheDocument();
  });

  it("shows reason field with optional label", () => {
    render(<RequestAccessPage />);
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(
      screen.getByText(/why do you want access/i)
    ).toBeInTheDocument();
  });

  it("shows hint text about adding a reason", () => {
    render(<RequestAccessPage />);
    expect(
      screen.getByText(/adding a reason helps admins approve your request faster/i)
    ).toBeInTheDocument();
  });

  it("disables submit when name or email is empty", () => {
    render(<RequestAccessPage />);
    const submitButton = screen.getByRole("button", {
      name: /submit request/i,
    });
    expect(submitButton).toBeDisabled();

    // Fill only name - should still be disabled
    const nameLabel = screen.getByText("Name *");
    const nameInput = nameLabel.parentElement!.querySelector("input")!;
    fireEvent.change(nameInput, { target: { value: "Jane" } });
    expect(submitButton).toBeDisabled();
  });

  it("disables submit when password is weak", () => {
    render(<RequestAccessPage />);

    const nameInput = screen.getByText("Name *").parentElement!.querySelector("input")!;
    const emailInput = screen.getByText("Email *").parentElement!.querySelector("input")!;
    const passwordInput = screen.getByText("Password *").parentElement!.querySelector("input")!;
    const confirmInput = screen.getByText("Confirm Password *").parentElement!.querySelector("input")!;

    fireEvent.change(nameInput, { target: { value: "Jane" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    fireEvent.change(confirmInput, { target: { value: "weak" } });

    const submitButton = screen.getByRole("button", { name: /submit request/i });
    expect(submitButton).toBeDisabled();
  });

  it("disables submit when passwords do not match", () => {
    render(<RequestAccessPage />);

    const nameInput = screen.getByText("Name *").parentElement!.querySelector("input")!;
    const emailInput = screen.getByText("Email *").parentElement!.querySelector("input")!;
    const passwordInput = screen.getByText("Password *").parentElement!.querySelector("input")!;
    const confirmInput = screen.getByText("Confirm Password *").parentElement!.querySelector("input")!;

    fireEvent.change(nameInput, { target: { value: "Jane" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
    fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
    fireEvent.change(confirmInput, { target: { value: "Different1!" } });

    const submitButton = screen.getByRole("button", { name: /submit request/i });
    expect(submitButton).toBeDisabled();
  });

  it("shows password mismatch message", () => {
    render(<RequestAccessPage />);

    const passwordInput = screen.getByText("Password *").parentElement!.querySelector("input")!;
    const confirmInput = screen.getByText("Confirm Password *").parentElement!.querySelector("input")!;

    fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
    fireEvent.change(confirmInput, { target: { value: "Different1!" } });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("shows password strength indicator when typing", () => {
    render(<RequestAccessPage />);

    const passwordInput = screen.getByText("Password *").parentElement!.querySelector("input")!;
    fireEvent.change(passwordInput, { target: { value: "a" } });

    const requirements = screen.getByLabelText("Password requirements");
    expect(requirements).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("At least one uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("At least one number")).toBeInTheDocument();
    expect(screen.getByText("At least one special character")).toBeInTheDocument();
  });

  it("marks passing password rules as green", () => {
    render(<RequestAccessPage />);

    const passwordInput = screen.getByText("Password *").parentElement!.querySelector("input")!;
    fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });

    const requirements = screen.getByLabelText("Password requirements");
    const items = requirements.querySelectorAll("li");
    items.forEach((item) => {
      expect(item.className).toContain("text-green-600");
    });
  });

  it("shows success state after submission", async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RequestAccessPage />);
    fillRequiredFields();

    const submitButton = screen.getByRole("button", {
      name: /submit request/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Request Submitted")).toBeInTheDocument();
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith("/access-requests", {
      email: "jane@example.com",
      name: "Jane Doe",
      reason: undefined,
      password: VALID_PASSWORD,
    });
  });

  it("shows updated success message about logging in with email and password", async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RequestAccessPage />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/once approved, you can log in with your email and password/i)
      ).toBeInTheDocument();
    });
  });

  it("shows Back to Sign In link on success", async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RequestAccessPage />);
    fillRequiredFields();

    fireEvent.click(
      screen.getByRole("button", { name: /submit request/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Back to Sign In")).toBeInTheDocument();
    });

    const backLink = screen.getByText("Back to Sign In");
    expect(backLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("shows error on submission failure", async () => {
    mockedApiClient.post.mockRejectedValueOnce({
      response: { data: { error: "Email already has a pending request" } },
    });

    render(<RequestAccessPage />);
    fillRequiredFields();

    fireEvent.click(
      screen.getByRole("button", { name: /submit request/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Email already has a pending request")
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
