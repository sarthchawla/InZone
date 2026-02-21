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

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user from session when authenticated", () => {
    const mockUser = { id: "1", name: "Test User", email: "test@test.com" };
    vi.mocked(useSession).mockReturnValue({
      data: { user: mockUser },
      isPending: false,
    } as never);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isPending).toBe(false);
  });

  it("returns null user when no session", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: false,
    } as never);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
  });

  it("returns isPending true while loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: true,
    } as never);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isPending).toBe(true);
  });
});
