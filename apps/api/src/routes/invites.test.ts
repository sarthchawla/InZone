import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createTestApp, TEST_ADMIN } from "../test/app.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import { Express } from "express";

// Mock auth module (used by requireAdmin middleware)
vi.mock("../lib/auth.js", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("better-auth/node", () => ({
  fromNodeHeaders: vi.fn((headers) => headers),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-token-12345678901234567890"),
}));

import { auth } from "../lib/auth.js";

// Helper to setup admin session mock
function mockAdminSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: {
      id: "admin-user-1",
      name: "Admin User",
      email: "admin@example.com",
      image: null,
      role: "admin",
    },
    session: { id: "session-1" },
  } as never);
}

function mockUserSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: {
      id: "user-1",
      name: "Regular User",
      email: "user@example.com",
      image: null,
      role: "user",
    },
    session: { id: "session-2" },
  } as never);
}

function mockNoSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
}

let app: Express;

beforeEach(() => {
  resetPrismaMock();
  app = createTestApp();
});

// ---------------------------------------------------------------------------
// POST /api/invites — Create invite (Admin only)
// ---------------------------------------------------------------------------
describe("POST /api/invites", () => {
  beforeEach(() => {
    mockAdminSession();
  });

  it("creates invite with valid email and role (201 with invite link)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue(null);
    prismaMock.invite.create.mockResolvedValue({
      id: "invite-1",
      email: "new@example.com",
      token: "mock-token-12345678901234567890",
      role: "user",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app)
      .post("/api/invites")
      .send({ email: "new@example.com", role: "user" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id", "invite-1");
    expect(res.body).toHaveProperty("email", "new@example.com");
    expect(res.body).toHaveProperty("role", "user");
    expect(res.body).toHaveProperty("status", "pending");
    expect(res.body).toHaveProperty("inviteLink");
    expect(res.body.inviteLink).toContain("mock-token-12345678901234567890");
    expect(prismaMock.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@example.com",
          role: "user",
          createdBy: "admin-user-1",
        }),
      }),
    );
  });

  it("rejects if caller is not admin (403)", async () => {
    mockUserSession();

    const res = await request(app)
      .post("/api/invites")
      .send({ email: "new@example.com", role: "user" });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error", "Admin access required");
  });

  it("rejects if unauthenticated (401)", async () => {
    mockNoSession();

    const res = await request(app)
      .post("/api/invites")
      .send({ email: "new@example.com", role: "user" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Unauthorized");
  });

  it("rejects if email already registered (400)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "existing-user",
      name: "Existing",
      email: "new@example.com",
      emailVerified: true,
      image: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      banned: null,
      banReason: null,
      banExpires: null,
      username: null,
      displayUsername: null,
    });

    const res = await request(app)
      .post("/api/invites")
      .send({ email: "new@example.com", role: "user" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "This email is already registered.");
  });

  it("rejects if pending invite already exists for email (400)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue({
      id: "existing-invite",
      email: "new@example.com",
      token: "some-token",
      role: "user",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app)
      .post("/api/invites")
      .send({ email: "new@example.com", role: "user" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty(
      "error",
      "A pending invite already exists for this email.",
    );
  });

  it("creates new invite even if previous invite was revoked", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    // findFirst for pending returns null (revoked invite is not pending)
    prismaMock.invite.findFirst.mockResolvedValue(null);
    prismaMock.invite.create.mockResolvedValue({
      id: "invite-2",
      email: "revoked@example.com",
      token: "mock-token-12345678901234567890",
      role: "user",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app)
      .post("/api/invites")
      .send({ email: "revoked@example.com", role: "user" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id", "invite-2");
    expect(prismaMock.invite.create).toHaveBeenCalled();
  });

  it("validates role is 'admin' or 'user' (400 for invalid)", async () => {
    const res = await request(app)
      .post("/api/invites")
      .send({ email: "new@example.com", role: "superadmin" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(prismaMock.invite.create).not.toHaveBeenCalled();
  });

  it("sets 7-day expiration", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue(null);

    const now = Date.now();
    prismaMock.invite.create.mockResolvedValue({
      id: "invite-3",
      email: "new@example.com",
      token: "mock-token-12345678901234567890",
      role: "user",
      status: "pending",
      expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    await request(app)
      .post("/api/invites")
      .send({ email: "new@example.com", role: "user" });

    const createCall = prismaMock.invite.create.mock.calls[0][0];
    const expiresAt = createCall.data.expiresAt as Date;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    // Allow 5 seconds of tolerance for test execution time
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now + sevenDaysMs - 5000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(now + sevenDaysMs + 5000);
  });
});

// ---------------------------------------------------------------------------
// GET /api/invites — List all invites (Admin only)
// ---------------------------------------------------------------------------
describe("GET /api/invites", () => {
  beforeEach(() => {
    mockAdminSession();
  });

  it("returns all invites for admin (200)", async () => {
    const mockInvites = [
      {
        id: "invite-1",
        email: "a@example.com",
        token: "token-a",
        role: "user",
        status: "pending",
        expiresAt: new Date(),
        createdBy: "admin-user-1",
        createdAt: new Date(),
        usedAt: null,
        creator: { name: "Admin User", email: "admin@example.com" },
      },
      {
        id: "invite-2",
        email: "b@example.com",
        token: "token-b",
        role: "admin",
        status: "accepted",
        expiresAt: new Date(),
        createdBy: "admin-user-1",
        createdAt: new Date(),
        usedAt: null,
        creator: { name: "Admin User", email: "admin@example.com" },
      },
    ];
    prismaMock.invite.findMany.mockResolvedValue(mockInvites as never);

    const res = await request(app).get("/api/invites");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty("email", "a@example.com");
    expect(res.body[1]).toHaveProperty("email", "b@example.com");
    expect(prismaMock.invite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        include: { creator: { select: { name: true, email: true } } },
      }),
    );
  });

  it("returns 403 for non-admin", async () => {
    mockUserSession();

    const res = await request(app).get("/api/invites");

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error", "Admin access required");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/invites/:id — Revoke invite (Admin only)
// ---------------------------------------------------------------------------
describe("DELETE /api/invites/:id", () => {
  beforeEach(() => {
    mockAdminSession();
  });

  it("revokes pending invite (sets status to 'revoked')", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "token-a",
      role: "user",
      status: "pending",
      expiresAt: new Date(),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });
    prismaMock.invite.update.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "token-a",
      role: "user",
      status: "revoked",
      expiresAt: new Date(),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app).delete("/api/invites/invite-1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "revoked");
    expect(prismaMock.invite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "revoked" },
    });
  });

  it("returns 404 for non-existent invite", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(null);

    const res = await request(app).delete("/api/invites/non-existent");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Invite not found.");
  });

  it("cannot revoke already-accepted invite (400)", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "token-a",
      role: "user",
      status: "accepted",
      expiresAt: new Date(),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app).delete("/api/invites/invite-1");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty(
      "error",
      "Only pending invites can be revoked.",
    );
    expect(prismaMock.invite.update).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockUserSession();

    const res = await request(app).delete("/api/invites/invite-1");

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error", "Admin access required");
  });
});

// ---------------------------------------------------------------------------
// GET /api/invites/validate — Validate token (Public)
// ---------------------------------------------------------------------------
describe("GET /api/invites/validate", () => {
  it("returns valid=true for valid pending token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "valid-token",
      role: "user",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // future
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app).get(
      "/api/invites/validate?token=valid-token",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, email: "a@example.com" });
  });

  it("returns valid=false for expired token (also updates status)", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "expired-token",
      role: "user",
      status: "pending",
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // past
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });
    prismaMock.invite.update.mockResolvedValue({} as never);

    const res = await request(app).get(
      "/api/invites/validate?token=expired-token",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: false });
    expect(prismaMock.invite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "expired" },
    });
  });

  it("returns valid=false for revoked token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "revoked-token",
      role: "user",
      status: "revoked",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app).get(
      "/api/invites/validate?token=revoked-token",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: false });
  });

  it("returns valid=false for non-existent token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(null);

    const res = await request(app).get(
      "/api/invites/validate?token=doesnt-exist",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: false });
  });

  it("returns valid=false when no token provided", async () => {
    const res = await request(app).get("/api/invites/validate");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: false });
  });
});

// ---------------------------------------------------------------------------
// POST /api/invites/set-token — Set invite cookie for OAuth (Public)
// ---------------------------------------------------------------------------
describe("POST /api/invites/set-token", () => {
  it("sets httpOnly cookie with invite token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "valid-token-abc",
      role: "user",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app)
      .post("/api/invites/set-token")
      .send({ token: "valid-token-abc" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const setCookieHeader = res.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeader)
      ? setCookieHeader.join("; ")
      : setCookieHeader;
    expect(cookieStr).toContain("__invite_token=valid-token-abc");
    expect(cookieStr).toContain("HttpOnly");
    expect(cookieStr).toContain("Path=/");
  });

  it("returns 400 if no token provided", async () => {
    const res = await request(app)
      .post("/api/invites/set-token")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid/revoked token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "revoked-token",
      role: "user",
      status: "revoked",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app)
      .post("/api/invites/set-token")
      .send({ token: "revoked-token" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Invalid invite token.");
  });

  it("returns 400 for expired token", async () => {
    prismaMock.invite.findUnique.mockResolvedValue({
      id: "invite-1",
      email: "a@example.com",
      token: "expired-token",
      role: "user",
      status: "pending",
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // past
      createdBy: "admin-user-1",
      createdAt: new Date(),
      usedAt: null,
    });

    const res = await request(app)
      .post("/api/invites/set-token")
      .send({ token: "expired-token" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Invite has expired.");
  });

  describe("error handling", () => {
    it("POST /api/invites returns 500 on database error", async () => {
      mockAdminSession();
      prismaMock.user.findUnique.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/invites")
        .send({ email: "test@example.com", role: "user" });

      expect(res.status).toBe(500);
    });

    it("GET /api/invites returns 500 on database error", async () => {
      mockAdminSession();
      prismaMock.invite.findMany.mockRejectedValue(new Error("DB down"));

      const res = await request(app).get("/api/invites");

      expect(res.status).toBe(500);
    });

    it("DELETE /api/invites/:id returns 500 on database error", async () => {
      mockAdminSession();
      prismaMock.invite.findUnique.mockRejectedValue(new Error("DB down"));

      const res = await request(app).delete("/api/invites/inv-1");

      expect(res.status).toBe(500);
    });

    it("GET /api/invites/validate returns 500 on database error", async () => {
      prismaMock.invite.findUnique.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .get("/api/invites/validate")
        .query({ token: "some-token" });

      expect(res.status).toBe(500);
    });

    it("POST /api/invites/set-token handles ZodError for empty body", async () => {
      const res = await request(app)
        .post("/api/invites/set-token")
        .send({});

      expect(res.status).toBe(400);
    });

    it("POST /api/invites/set-token returns 500 on database error", async () => {
      prismaMock.invite.findUnique.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/invites/set-token")
        .send({ token: "valid-token" });

      expect(res.status).toBe(500);
    });
  });
});
