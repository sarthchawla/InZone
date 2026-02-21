import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test/utils";
import { SignUpPage } from "./SignUpPage";

vi.mock("../lib/auth-client", () => ({
  signUp: { email: vi.fn() },
  signIn: { social: vi.fn() },
}));

vi.mock("../api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

const mockSearchParams = new URLSearchParams();
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams],
    useNavigate: () => mockNavigate,
  };
});

import { apiClient } from "../api/client";
import { signUp, signIn } from "../lib/auth-client";

const mockedApiClient = vi.mocked(apiClient);
const mockedSignUp = vi.mocked(signUp);
const mockedSignIn = vi.mocked(signIn);

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams.delete("token");
});

describe("SignUpPage", () => {
  it("renders sign-up form with heading", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("heading", { name: /create your inzone account/i })
    ).toBeInTheDocument();
  });

  it("shows editable email field when no token is provided", () => {
    render(<SignUpPage />);
    const emailLabel = screen.getByText("Email *");
    const emailInput = emailLabel.parentElement!.querySelector("input")!;
    expect(emailInput).not.toHaveAttribute("readonly");
    expect(emailInput).toHaveValue("");
  });

  it("pre-fills and disables email when invite token is valid", async () => {
    mockSearchParams.set("token", "valid-token-123");
    mockedApiClient.get.mockResolvedValueOnce({
      data: { valid: true, email: "jane@example.com" },
    });

    render(<SignUpPage />);

    await waitFor(() => {
      expect(screen.getByText(/You've been invited as jane@example.com/)).toBeInTheDocument();
    });

    const emailLabel = screen.getByText("Email *");
    const emailInput = emailLabel.parentElement!.querySelector("input")!;
    expect(emailInput).toHaveAttribute("readonly");
    expect(emailInput).toHaveValue("jane@example.com");
  });

  it("shows password strength indicators", () => {
    render(<SignUpPage />);
    expect(screen.getByText("8+ characters")).toBeInTheDocument();
    expect(screen.getByText("Uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("Lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("Number")).toBeInTheDocument();
    expect(screen.getByText("Special character")).toBeInTheDocument();
  });

  it("shows unmet indicators for a weak password", () => {
    render(<SignUpPage />);
    const passwordLabel = screen.getByText("Password *");
    const passwordInput = passwordLabel.parentElement!.querySelector("input")!;

    fireEvent.change(passwordInput, { target: { value: "abc" } });

    // 8+ characters should be unmet
    expect(screen.getByLabelText("8+ characters: not met")).toBeInTheDocument();
    // Uppercase should be unmet
    expect(
      screen.getByLabelText("Uppercase letter: not met")
    ).toBeInTheDocument();
    // Lowercase should be met
    expect(
      screen.getByLabelText("Lowercase letter: met")
    ).toBeInTheDocument();
    // Number should be unmet
    expect(screen.getByLabelText("Number: not met")).toBeInTheDocument();
    // Special character should be unmet
    expect(
      screen.getByLabelText("Special character: not met")
    ).toBeInTheDocument();
  });

  it("shows all rules met for a strong password", () => {
    render(<SignUpPage />);
    const passwordLabel = screen.getByText("Password *");
    const passwordInput = passwordLabel.parentElement!.querySelector("input")!;

    fireEvent.change(passwordInput, { target: { value: "StrongP@ss1" } });

    expect(screen.getByLabelText("8+ characters: met")).toBeInTheDocument();
    expect(screen.getByLabelText("Uppercase letter: met")).toBeInTheDocument();
    expect(screen.getByLabelText("Lowercase letter: met")).toBeInTheDocument();
    expect(screen.getByLabelText("Number: met")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Special character: met")
    ).toBeInTheDocument();
  });

  it("shows password mismatch error", () => {
    render(<SignUpPage />);
    const passwordLabel = screen.getByText("Password *");
    const passwordInput = passwordLabel.parentElement!.querySelector("input")!;
    const confirmLabel = screen.getByText("Confirm Password *");
    const confirmInput = confirmLabel.parentElement!.querySelector("input")!;

    fireEvent.change(passwordInput, { target: { value: "StrongP@ss1" } });
    fireEvent.change(confirmInput, { target: { value: "different" } });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("disables submit button until all validation passes", () => {
    render(<SignUpPage />);
    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("shows error on invalid invite token", async () => {
    mockSearchParams.set("token", "bad-token");
    mockedApiClient.get.mockRejectedValueOnce(new Error("Invalid"));

    render(<SignUpPage />);

    await waitFor(() => {
      expect(screen.getByText("Invalid Invite")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /this invite link is invalid, expired, or has already been used/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Back to Sign In")).toBeInTheDocument();
  });

  it("submits the form successfully and navigates to home", async () => {
    mockedSignUp.email.mockResolvedValueOnce({ error: null } as any);
    mockedApiClient.post.mockResolvedValueOnce({ data: {} });

    render(<SignUpPage />);

    // Fill email
    const emailLabel = screen.getByText("Email *");
    const emailInput = emailLabel.parentElement!.querySelector("input")!;
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    // Fill name
    const nameLabel = screen.getByText("Name *");
    const nameInput = nameLabel.parentElement!.querySelector("input")!;
    fireEvent.change(nameInput, { target: { value: "Test User" } });

    // Fill password
    const passwordLabel = screen.getByText("Password *");
    const passwordInput = passwordLabel.parentElement!.querySelector("input")!;
    fireEvent.change(passwordInput, { target: { value: "StrongP@ss1" } });

    // Fill confirm password
    const confirmLabel = screen.getByText("Confirm Password *");
    const confirmInput = confirmLabel.parentElement!.querySelector("input")!;
    fireEvent.change(confirmInput, { target: { value: "StrongP@ss1" } });

    // Select 3 different security questions and fill answers
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], {
      target: { value: "What was the name of your first pet?" },
    });
    fireEvent.change(selects[1], {
      target: { value: "In what city were you born?" },
    });
    fireEvent.change(selects[2], {
      target: { value: "What was the name of your first school?" },
    });

    const answerInputs = screen.getAllByPlaceholderText("Your answer");
    fireEvent.change(answerInputs[0], { target: { value: "Buddy" } });
    fireEvent.change(answerInputs[1], { target: { value: "New York" } });
    fireEvent.change(answerInputs[2], { target: { value: "Lincoln" } });

    // Submit the form
    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedSignUp.email).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          password: "StrongP@ss1",
          name: "Test User",
        })
      );
    });

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        "/security-questions/setup",
        expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({
              question: "What was the name of your first pet?",
              answer: "Buddy",
            }),
          ]),
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error when sign-up returns an error", async () => {
    mockedSignUp.email.mockResolvedValueOnce({
      error: { message: "Email taken" },
    } as any);

    render(<SignUpPage />);

    // Fill all required fields
    const emailLabel = screen.getByText("Email *");
    const emailInput = emailLabel.parentElement!.querySelector("input")!;
    fireEvent.change(emailInput, { target: { value: "taken@example.com" } });

    const nameLabel = screen.getByText("Name *");
    const nameInput = nameLabel.parentElement!.querySelector("input")!;
    fireEvent.change(nameInput, { target: { value: "Test User" } });

    const passwordLabel = screen.getByText("Password *");
    const passwordInput = passwordLabel.parentElement!.querySelector("input")!;
    fireEvent.change(passwordInput, { target: { value: "StrongP@ss1" } });

    const confirmLabel = screen.getByText("Confirm Password *");
    const confirmInput = confirmLabel.parentElement!.querySelector("input")!;
    fireEvent.change(confirmInput, { target: { value: "StrongP@ss1" } });

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], {
      target: { value: "What was the name of your first pet?" },
    });
    fireEvent.change(selects[1], {
      target: { value: "In what city were you born?" },
    });
    fireEvent.change(selects[2], {
      target: { value: "What was the name of your first school?" },
    });

    const answerInputs = screen.getAllByPlaceholderText("Your answer");
    fireEvent.change(answerInputs[0], { target: { value: "Buddy" } });
    fireEvent.change(answerInputs[1], { target: { value: "New York" } });
    fireEvent.change(answerInputs[2], { target: { value: "Lincoln" } });

    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Email taken");
    });
  });

  it("calls signIn.social when Google button is clicked", () => {
    render(<SignUpPage />);

    const googleButton = screen.getByRole("button", {
      name: /continue with google/i,
    });
    fireEvent.click(googleButton);

    expect(mockedSignIn.social).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
      })
    );
  });

  it("sets invite token cookie before Google sign-in when token exists", async () => {
    mockSearchParams.set("token", "invite-token-456");
    mockedApiClient.get.mockResolvedValueOnce({
      data: { valid: true, email: "invited@example.com" },
    });
    mockedApiClient.post.mockResolvedValueOnce({ data: {} });

    render(<SignUpPage />);

    // Wait for token validation to complete so the form renders
    await waitFor(() => {
      expect(
        screen.getByText(/You've been invited as invited@example.com/)
      ).toBeInTheDocument();
    });

    const googleButton = screen.getByRole("button", {
      name: /continue with google/i,
    });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith("/invites/set-token", {
        token: "invite-token-456",
      });
    });

    await waitFor(() => {
      expect(mockedSignIn.social).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
        })
      );
    });
  });

  it("shows confirm password mismatch validation message", () => {
    render(<SignUpPage />);

    const passwordLabel = screen.getByText("Password *");
    const passwordInput = passwordLabel.parentElement!.querySelector("input")!;
    const confirmLabel = screen.getByText("Confirm Password *");
    const confirmInput = confirmLabel.parentElement!.querySelector("input")!;

    fireEvent.change(passwordInput, { target: { value: "StrongP@ss1" } });
    fireEvent.change(confirmInput, { target: { value: "DifferentP@ss2" } });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("shows loading spinner while validating invite token", () => {
    mockSearchParams.set("token", "pending-token");
    // Do not resolve the API call so tokenValid stays null
    mockedApiClient.get.mockReturnValueOnce(new Promise(() => {}) as any);

    render(<SignUpPage />);

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    // The form heading should NOT be present while loading
    expect(
      screen.queryByRole("heading", { name: /create your inzone account/i })
    ).not.toBeInTheDocument();
  });
});
