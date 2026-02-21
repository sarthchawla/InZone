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

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn((val: string) => Promise.resolve(`hashed_${val}`)),
    compare: vi.fn(
      (val: string, hash: string) => Promise.resolve(hash === `hashed_${val}`)
    ),
  },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-reset-token-123"),
}));

import { auth } from "../lib/auth.js";
import { SECURITY_QUESTIONS } from "./security-questions.js";

function mockAuthSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: {
      id: "test-user-1",
      name: "Test User",
      email: "test@example.com",
      image: null,
      role: "user",
    },
    session: { id: "session-1" },
  } as never);
}

function mockNoSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
}

const VALID_SETUP_BODY = {
  questions: [
    { question: SECURITY_QUESTIONS[0], answer: "buddy" },
    { question: SECURITY_QUESTIONS[1], answer: "new york" },
    { question: SECURITY_QUESTIONS[2], answer: "lincoln elementary" },
  ],
};

describe("Security Questions Routes", () => {
  let app: Express;

  beforeEach(() => {
    resetPrismaMock();
    app = createTestApp();
    mockAuthSession();
  });

  // ===========================================
  // POST /api/security-questions/setup
  // ===========================================
  describe("POST /api/security-questions/setup", () => {
    it("sets up 3 security questions for authenticated user", async () => {
      prismaMock.$transaction.mockResolvedValue([]);

      const res = await request(app)
        .post("/api/security-questions/setup")
        .send(VALID_SETUP_BODY);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it("replaces existing questions via deleteMany + create in a transaction", async () => {
      prismaMock.$transaction.mockResolvedValue([]);

      const res = await request(app)
        .post("/api/security-questions/setup")
        .send(VALID_SETUP_BODY);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // The transaction receives an array: [deleteMany, create, create, create]
      const txArg = prismaMock.$transaction.mock.calls[0][0];
      expect(txArg).toHaveLength(4);
    });

    it("hashes answers before storing", async () => {
      prismaMock.$transaction.mockResolvedValue([]);

      await request(app)
        .post("/api/security-questions/setup")
        .send(VALID_SETUP_BODY);

      // Verify securityQuestion.create was called with hashed answers
      // The creates are inside $transaction, so we check the prisma mock calls
      const createCalls = prismaMock.securityQuestion.create.mock.calls;
      expect(createCalls).toHaveLength(3);

      expect(createCalls[0][0].data.answer).toBe("hashed_buddy");
      expect(createCalls[1][0].data.answer).toBe("hashed_new york");
      expect(createCalls[2][0].data.answer).toBe("hashed_lincoln elementary");
    });

    it("rejects if fewer than 3 questions (400)", async () => {
      const res = await request(app)
        .post("/api/security-questions/setup")
        .send({
          questions: [
            { question: SECURITY_QUESTIONS[0], answer: "buddy" },
            { question: SECURITY_QUESTIONS[1], answer: "new york" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/3/);
    });

    it("rejects if duplicate questions selected (400)", async () => {
      prismaMock.$transaction.mockResolvedValue([]);

      const res = await request(app)
        .post("/api/security-questions/setup")
        .send({
          questions: [
            { question: SECURITY_QUESTIONS[0], answer: "buddy" },
            { question: SECURITY_QUESTIONS[0], answer: "pal" },
            { question: SECURITY_QUESTIONS[2], answer: "lincoln" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/different/i);
    });

    it("rejects if answers too short < 2 chars (400)", async () => {
      const res = await request(app)
        .post("/api/security-questions/setup")
        .send({
          questions: [
            { question: SECURITY_QUESTIONS[0], answer: "a" },
            { question: SECURITY_QUESTIONS[1], answer: "new york" },
            { question: SECURITY_QUESTIONS[2], answer: "lincoln" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/2 characters/i);
    });

    it("rejects if question not in predefined pool (400)", async () => {
      const res = await request(app)
        .post("/api/security-questions/setup")
        .send({
          questions: [
            { question: "What is your favorite color?", answer: "blue" },
            { question: SECURITY_QUESTIONS[1], answer: "new york" },
            { question: SECURITY_QUESTIONS[2], answer: "lincoln" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid question/);
    });
  });

  // ===========================================
  // GET /api/security-questions/status
  // ===========================================
  describe("GET /api/security-questions/status", () => {
    it("returns configured true if user has 3 questions", async () => {
      prismaMock.securityQuestion.count.mockResolvedValue(3);

      const res = await request(app).get("/api/security-questions/status");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ configured: true });
    });

    it("returns configured false if no questions", async () => {
      prismaMock.securityQuestion.count.mockResolvedValue(0);

      const res = await request(app).get("/api/security-questions/status");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ configured: false });
    });

    it("returns configured false if count < 3", async () => {
      prismaMock.securityQuestion.count.mockResolvedValue(2);

      const res = await request(app).get("/api/security-questions/status");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ configured: false });
    });
  });

  // ===========================================
  // POST /api/security-questions/questions
  // ===========================================
  describe("POST /api/security-questions/questions", () => {
    it("returns 3 questions for valid email identifier", async () => {
      const storedQuestions = [
        { question: SECURITY_QUESTIONS[0] },
        { question: SECURITY_QUESTIONS[3] },
        { question: SECURITY_QUESTIONS[5] },
      ];

      prismaMock.user.findFirst.mockResolvedValue({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
      } as never);

      prismaMock.securityQuestion.findMany.mockResolvedValue(
        storedQuestions as never
      );

      const res = await request(app)
        .post("/api/security-questions/questions")
        .send({ identifier: "alice@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.questions).toEqual([
        SECURITY_QUESTIONS[0],
        SECURITY_QUESTIONS[3],
        SECURITY_QUESTIONS[5],
      ]);
      expect(res.body.questions).toHaveLength(3);
    });

    it("returns 3 questions for valid username identifier (no @)", async () => {
      const storedQuestions = [
        { question: SECURITY_QUESTIONS[1] },
        { question: SECURITY_QUESTIONS[4] },
        { question: SECURITY_QUESTIONS[7] },
      ];

      prismaMock.user.findFirst.mockResolvedValue({
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
        username: "bob123",
      } as never);

      prismaMock.securityQuestion.findMany.mockResolvedValue(
        storedQuestions as never
      );

      const res = await request(app)
        .post("/api/security-questions/questions")
        .send({ identifier: "bob123" });

      expect(res.status).toBe(200);
      expect(res.body.questions).toEqual([
        SECURITY_QUESTIONS[1],
        SECURITY_QUESTIONS[4],
        SECURITY_QUESTIONS[7],
      ]);
      expect(res.body.questions).toHaveLength(3);

      // Should have searched by username, not email
      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { username: { equals: "bob123", mode: "insensitive" } },
      });
    });

    it("returns 3 fake questions for non-existent user (anti-enumeration)", async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/security-questions/questions")
        .send({ identifier: "nobody@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(3);
      // Fake questions are SECURITY_QUESTIONS[0], [2], [5]
      expect(res.body.questions).toEqual([
        SECURITY_QUESTIONS[0],
        SECURITY_QUESTIONS[2],
        SECURITY_QUESTIONS[5],
      ]);
    });

    it("always returns exactly 3 questions even if user has fewer stored", async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: "user-3",
        name: "Charlie",
        email: "charlie@example.com",
      } as never);

      // User exists but only has 2 questions stored (incomplete setup)
      prismaMock.securityQuestion.findMany.mockResolvedValue([
        { question: SECURITY_QUESTIONS[0] },
        { question: SECURITY_QUESTIONS[1] },
      ] as never);

      const res = await request(app)
        .post("/api/security-questions/questions")
        .send({ identifier: "charlie@example.com" });

      expect(res.status).toBe(200);
      // Falls through to fake questions since count !== 3
      expect(res.body.questions).toHaveLength(3);
      expect(res.body.questions).toEqual([
        SECURITY_QUESTIONS[0],
        SECURITY_QUESTIONS[2],
        SECURITY_QUESTIONS[5],
      ]);
    });
  });

  // ===========================================
  // POST /api/security-questions/verify
  // ===========================================
  describe("POST /api/security-questions/verify", () => {
    const verifyBody = {
      identifier: "alice@example.com",
      answers: ["buddy", "new york", "lincoln elementary"],
    };

    const storedQuestions = [
      {
        id: "sq-1",
        userId: "user-1",
        question: SECURITY_QUESTIONS[0],
        answer: "hashed_buddy",
        order: 1,
      },
      {
        id: "sq-2",
        userId: "user-1",
        question: SECURITY_QUESTIONS[1],
        answer: "hashed_new york",
        order: 2,
      },
      {
        id: "sq-3",
        userId: "user-1",
        question: SECURITY_QUESTIONS[2],
        answer: "hashed_lincoln elementary",
        order: 3,
      },
    ];

    it("returns reset token when all 3 answers correct (200)", async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
      } as never);

      prismaMock.securityQuestion.findMany.mockResolvedValue(
        storedQuestions as never
      );

      prismaMock.verification.create.mockResolvedValue({} as never);

      const res = await request(app)
        .post("/api/security-questions/verify")
        .send(verifyBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ resetToken: "mock-reset-token-123" });
      expect(prismaMock.verification.create).toHaveBeenCalledTimes(1);
    });

    it("normalizes answers (trim + lowercase) before comparing", async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
      } as never);

      prismaMock.securityQuestion.findMany.mockResolvedValue(
        storedQuestions as never
      );

      prismaMock.verification.create.mockResolvedValue({} as never);

      // Send answers with extra whitespace and uppercase
      const res = await request(app)
        .post("/api/security-questions/verify")
        .send({
          identifier: "alice@example.com",
          answers: ["  Buddy  ", "  New York  ", "  Lincoln Elementary  "],
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ resetToken: "mock-reset-token-123" });
    });

    it("returns error when any answer is wrong (400)", async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
      } as never);

      prismaMock.securityQuestion.findMany.mockResolvedValue(
        storedQuestions as never
      );

      const res = await request(app)
        .post("/api/security-questions/verify")
        .send({
          identifier: "alice@example.com",
          answers: ["buddy", "wrong answer", "lincoln elementary"],
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Incorrect answers." });
    });

    it("returns error for non-existent user (400, same generic message)", async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/security-questions/verify")
        .send({
          identifier: "nobody@example.com",
          answers: ["a", "b", "c"],
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Incorrect answers." });
    });

    it("returns error if user has fewer than 3 stored questions", async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
      } as never);

      prismaMock.securityQuestion.findMany.mockResolvedValue([
        storedQuestions[0],
        storedQuestions[1],
      ] as never);

      const res = await request(app)
        .post("/api/security-questions/verify")
        .send(verifyBody);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Incorrect answers." });
    });
  });

  describe("error handling", () => {
    it("POST /questions returns 500 on database error", async () => {
      prismaMock.user.findFirst.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/security-questions/questions")
        .send({ identifier: "test@example.com" });

      expect(res.status).toBe(500);
    });

    it("POST /questions returns 400 for empty identifier", async () => {
      const res = await request(app)
        .post("/api/security-questions/questions")
        .send({ identifier: "" });

      expect(res.status).toBe(400);
    });

    it("POST /verify returns 500 on database error", async () => {
      prismaMock.user.findFirst.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/security-questions/verify")
        .send({
          identifier: "test@example.com",
          answers: ["a1", "a2", "a3"],
        });

      expect(res.status).toBe(500);
    });

    it("POST /verify returns 400 for invalid body (missing answers)", async () => {
      const res = await request(app)
        .post("/api/security-questions/verify")
        .send({ identifier: "test@example.com" });

      expect(res.status).toBe(400);
    });

    it("POST /setup returns 500 on database error", async () => {
      mockAuthSession();
      prismaMock.$transaction.mockRejectedValue(new Error("DB down"));

      const res = await request(app)
        .post("/api/security-questions/setup")
        .send({
          questions: [
            { question: "What was the name of your first pet?", answer: "buddy" },
            { question: "In what city were you born?", answer: "new york" },
            { question: "What was the name of your first school?", answer: "ps 100" },
          ],
        });

      expect(res.status).toBe(500);
    });

    it("GET /status returns 500 on database error", async () => {
      mockAuthSession();
      prismaMock.securityQuestion.count.mockRejectedValue(new Error("DB down"));

      const res = await request(app).get("/api/security-questions/status");

      expect(res.status).toBe(500);
    });
  });
});
