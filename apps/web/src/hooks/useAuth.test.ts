import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "../test/utils";

// Mock the auth-client module
vi.mock("../lib/auth-client", () => ({
  useSession: vi.fn(),
  DEV_USER: {
    id: "dev-user-000",
    name: "Dev User",
    email: "dev@localhost",
    image: null,
  },
}));

import { useAuth } from "./useAuth";
import { useSession } from "../lib/auth-client";

// NOTE: AUTH_BYPASS is evaluated at module load time from import.meta.env.VITE_AUTH_BYPASS.
// In the test environment (VITE_AUTH_BYPASS=true), useAuth always returns DEV_USER.
// vi.stubEnv cannot change the already-evaluated module-level constant.
// Tests below reflect the bypass behavior.

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns DEV_USER in bypass mode regardless of session", () => {
    const mockUser = { id: "1", name: "Test User", email: "test@test.com" };
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    } as never);

    const { result } = renderHook(() => useAuth());

    // In bypass mode, always returns DEV_USER
    expect(result.current.user).toEqual({
      id: "dev-user-000",
      name: "Dev User",
      email: "dev@localhost",
      image: null,
    });
    expect(result.current.isPending).toBe(false);
  });

  it("returns DEV_USER when no session (bypass mode)", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: false,
    } as never);

    const { result } = renderHook(() => useAuth());

    // In bypass mode, always returns DEV_USER instead of null
    expect(result.current.user).toEqual({
      id: "dev-user-000",
      name: "Dev User",
      email: "dev@localhost",
      image: null,
    });
  });

  it("returns isPending false in bypass mode", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: true,
    } as never);

    const { result } = renderHook(() => useAuth());

    // In bypass mode, isPending is always false
    expect(result.current.isPending).toBe(false);
  });
});
