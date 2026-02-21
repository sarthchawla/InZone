import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../test/app.js";
import { prismaMock, resetPrismaMock } from "../test/prismaMock.js";
import { Express } from "express";

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

import { auth } from "../lib/auth.js";

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

describe("Access Requests Routes", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    resetPrismaMock();
    vi.mocked(auth.api.getSession).mockReset();
  });

  // ─── POST /api/access-requests ───────────────────────────────────────

  describe("POST /api/access-requests", () => {
    it("creates a request with name, email, and reason (201)", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessRequest.findFirst.mockResolvedValue(null);
      prismaMock.accessRequest.create.mockResolvedValue({
        id: "req-1",
        name: "Jane Doe",
        email: "jane@example.com",
        reason: "I want access",
        status: "pending",
        role: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app).post("/api/access-requests").send({
        name: "Jane Doe",
        email: "jane@example.com",
        reason: "I want access",
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: "req-1",
        status: "pending",
        message: "Your request has been submitted.",
      });
      expect(prismaMock.accessRequest.create).toHaveBeenCalledWith({
        data: {
          email: "jane@example.com",
          name: "Jane Doe",
          reason: "I want access",
        },
      });
    });

    it("creates a request without reason - reason is optional (201)", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessRequest.findFirst.mockResolvedValue(null);
      prismaMock.accessRequest.create.mockResolvedValue({
        id: "req-2",
        name: "John Doe",
        email: "john@example.com",
        reason: undefined,
        status: "pending",
        role: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app).post("/api/access-requests").send({
        name: "John Doe",
        email: "john@example.com",
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: "req-2",
        status: "pending",
      });
      expect(prismaMock.accessRequest.create).toHaveBeenCalledWith({
        data: {
          email: "john@example.com",
          name: "John Doe",
          reason: undefined,
        },
      });
    });

    it("rejects if email is already registered (400)", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "existing-user",
        name: "Existing User",
        email: "existing@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "user",
        banned: false,
        banReason: null,
        banExpires: null,
      } as never);

      const res = await request(app).post("/api/access-requests").send({
        name: "Existing User",
        email: "existing@example.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already have an account");
      expect(prismaMock.accessRequest.create).not.toHaveBeenCalled();
    });

    it("rejects if a pending request already exists (400)", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessRequest.findFirst.mockResolvedValue({
        id: "existing-req",
        email: "pending@example.com",
        name: "Pending User",
        status: "pending",
        reason: null,
        role: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app).post("/api/access-requests").send({
        name: "Pending User",
        email: "pending@example.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already submitted");
      expect(prismaMock.accessRequest.create).not.toHaveBeenCalled();
    });

    it("validates email format (400)", async () => {
      const res = await request(app).post("/api/access-requests").send({
        name: "Bad Email",
        email: "not-an-email",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("validates name is required (400)", async () => {
      const res = await request(app).post("/api/access-requests").send({
        email: "valid@example.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("lowercases email before checking and creating", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessRequest.findFirst.mockResolvedValue(null);
      prismaMock.accessRequest.create.mockResolvedValue({
        id: "req-3",
        name: "Mixed Case",
        email: "mixed@example.com",
        reason: null,
        status: "pending",
        role: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await request(app).post("/api/access-requests").send({
        name: "Mixed Case",
        email: "Mixed@Example.COM",
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: "mixed@example.com" },
      });
      expect(prismaMock.accessRequest.findFirst).toHaveBeenCalledWith({
        where: { email: "mixed@example.com", status: "pending" },
      });
      expect(prismaMock.accessRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: "mixed@example.com" }),
      });
    });
  });

  // ─── GET /api/access-requests ────────────────────────────────────────

  describe("GET /api/access-requests", () => {
    it("returns all requests for admin (200)", async () => {
      mockAdminSession();
      const mockRequests = [
        {
          id: "req-1",
          name: "User A",
          email: "a@example.com",
          status: "pending",
          reason: null,
          role: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date("2026-02-22"),
          updatedAt: new Date("2026-02-22"),
        },
        {
          id: "req-2",
          name: "User B",
          email: "b@example.com",
          status: "approved",
          reason: "Need access",
          role: "user",
          reviewedBy: "admin-user-1",
          reviewedAt: new Date("2026-02-21"),
          createdAt: new Date("2026-02-20"),
          updatedAt: new Date("2026-02-21"),
        },
      ];
      prismaMock.accessRequest.findMany.mockResolvedValue(mockRequests as never);

      const res = await request(app).get("/api/access-requests");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(prismaMock.accessRequest.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
      });
    });

    it("filters by status query param", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findMany.mockResolvedValue([] as never);

      const res = await request(app).get("/api/access-requests?status=pending");

      expect(res.status).toBe(200);
      expect(prismaMock.accessRequest.findMany).toHaveBeenCalledWith({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns 403 for non-admin user", async () => {
      mockUserSession();

      const res = await request(app).get("/api/access-requests");

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Admin access required");
      expect(prismaMock.accessRequest.findMany).not.toHaveBeenCalled();
    });

    it("returns 401 for unauthenticated request", async () => {
      mockNoSession();

      const res = await request(app).get("/api/access-requests");

      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Unauthorized");
      expect(prismaMock.accessRequest.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── POST /api/access-requests/:id/approve ──────────────────────────

  describe("POST /api/access-requests/:id/approve", () => {
    it("approves a pending request with default role 'user' (200)", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        name: "Pending User",
        email: "pending@example.com",
        status: "pending",
        reason: null,
        role: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      prismaMock.accessRequest.update.mockResolvedValue({
        id: "req-1",
        name: "Pending User",
        email: "pending@example.com",
        status: "approved",
        reason: null,
        role: "user",
        reviewedBy: "admin-user-1",
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app)
        .post("/api/access-requests/req-1/approve")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("approved");
      expect(res.body.role).toBe("user");
      expect(prismaMock.accessRequest.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: expect.objectContaining({
          status: "approved",
          role: "user",
          reviewedBy: "admin-user-1",
        }),
      });
    });

    it("approves with specified role 'admin' (200)", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockResolvedValue({
        id: "req-2",
        name: "Future Admin",
        email: "future-admin@example.com",
        status: "pending",
        reason: null,
        role: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      prismaMock.accessRequest.update.mockResolvedValue({
        id: "req-2",
        name: "Future Admin",
        email: "future-admin@example.com",
        status: "approved",
        reason: null,
        role: "admin",
        reviewedBy: "admin-user-1",
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app)
        .post("/api/access-requests/req-2/approve")
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("admin");
      expect(prismaMock.accessRequest.update).toHaveBeenCalledWith({
        where: { id: "req-2" },
        data: expect.objectContaining({
          status: "approved",
          role: "admin",
          reviewedBy: "admin-user-1",
        }),
      });
    });

    it("returns 404 for non-existent request", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/access-requests/non-existent/approve")
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });

    it("returns 400 for already-reviewed request", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockResolvedValue({
        id: "req-3",
        name: "Already Reviewed",
        email: "reviewed@example.com",
        status: "approved",
        reason: null,
        role: "user",
        reviewedBy: "admin-user-1",
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app)
        .post("/api/access-requests/req-3/approve")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already been reviewed");
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });

    it("returns 403 for non-admin user", async () => {
      mockUserSession();

      const res = await request(app)
        .post("/api/access-requests/req-1/approve")
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Admin access required");
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });

    it("returns 401 for unauthenticated request", async () => {
      mockNoSession();

      const res = await request(app)
        .post("/api/access-requests/req-1/approve")
        .send({});

      expect(res.status).toBe(401);
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });
  });

  // ─── POST /api/access-requests/:id/reject ───────────────────────────

  describe("POST /api/access-requests/:id/reject", () => {
    it("rejects a pending request (200)", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        name: "To Reject",
        email: "reject@example.com",
        status: "pending",
        reason: null,
        role: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      prismaMock.accessRequest.update.mockResolvedValue({
        id: "req-1",
        name: "To Reject",
        email: "reject@example.com",
        status: "rejected",
        reason: null,
        role: null,
        reviewedBy: "admin-user-1",
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app)
        .post("/api/access-requests/req-1/reject")
        .send();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("rejected");
      expect(prismaMock.accessRequest.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: expect.objectContaining({
          status: "rejected",
          reviewedBy: "admin-user-1",
        }),
      });
    });

    it("returns 404 for non-existent request", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/access-requests/non-existent/reject")
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });

    it("returns 400 for already-reviewed request", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockResolvedValue({
        id: "req-2",
        name: "Already Rejected",
        email: "rejected@example.com",
        status: "rejected",
        reason: null,
        role: null,
        reviewedBy: "admin-user-1",
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const res = await request(app)
        .post("/api/access-requests/req-2/reject")
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already been reviewed");
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });

    it("returns 403 for non-admin user", async () => {
      mockUserSession();

      const res = await request(app)
        .post("/api/access-requests/req-1/reject")
        .send();

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Admin access required");
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });

    it("returns 401 for unauthenticated request", async () => {
      mockNoSession();

      const res = await request(app)
        .post("/api/access-requests/req-1/reject")
        .send();

      expect(res.status).toBe(401);
      expect(prismaMock.accessRequest.update).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("POST /api/access-requests returns 500 on database error", async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/access-requests")
        .send({ name: "Jane", email: "jane@example.com" });

      expect(res.status).toBe(500);
    });

    it("GET /api/access-requests returns 500 on database error", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findMany.mockRejectedValue(new Error("DB down"));

      const res = await request(app).get("/api/access-requests");

      expect(res.status).toBe(500);
    });

    it("POST /api/access-requests/:id/approve returns 500 on database error", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/access-requests/req-1/approve")
        .send({ role: "user" });

      expect(res.status).toBe(500);
    });

    it("POST /api/access-requests/:id/approve handles invalid role via ZodError", async () => {
      mockAdminSession();

      const res = await request(app)
        .post("/api/access-requests/req-1/approve")
        .send({ role: "superadmin" });

      expect(res.status).toBe(400);
    });

    it("POST /api/access-requests/:id/reject returns 500 on database error", async () => {
      mockAdminSession();
      prismaMock.accessRequest.findUnique.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/access-requests/req-1/reject")
        .send();

      expect(res.status).toBe(500);
    });
  });
});
