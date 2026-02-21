import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test/utils";
import { RequestAccessPage } from "./RequestAccessPage";

vi.mock("../api/client", () => ({
  apiClient: { post: vi.fn() },
  getErrorMessage: (err: any) => err?.response?.data?.error || "Error",
}));

import { apiClient } from "../api/client";

const mockedApiClient = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RequestAccessPage", () => {
  it("renders request form with name and email fields", () => {
    render(<RequestAccessPage />);
    expect(
      screen.getByRole("heading", { name: /request access to inzone/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Name *")).toBeInTheDocument();
    expect(screen.getByText("Email *")).toBeInTheDocument();
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

  it("shows success state after submission", async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RequestAccessPage />);

    const nameLabel = screen.getByText("Name *");
    const nameInput = nameLabel.parentElement!.querySelector("input")!;
    const emailLabel = screen.getByText("Email *");
    const emailInput = emailLabel.parentElement!.querySelector("input")!;

    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

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
    });
  });

  it("shows Back to Sign In link on success", async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<RequestAccessPage />);

    const nameLabel = screen.getByText("Name *");
    const nameInput = nameLabel.parentElement!.querySelector("input")!;
    const emailLabel = screen.getByText("Email *");
    const emailInput = emailLabel.parentElement!.querySelector("input")!;

    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

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

    const nameLabel = screen.getByText("Name *");
    const nameInput = nameLabel.parentElement!.querySelector("input")!;
    const emailLabel = screen.getByText("Email *");
    const emailInput = emailLabel.parentElement!.querySelector("input")!;

    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

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
