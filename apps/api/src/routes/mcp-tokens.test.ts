import request from "supertest";
import { describe, it, expect, vi } from "vitest";
import { createTestApp, TEST_USER } from "../test/app.js";
import { prismaMock } from "../test/prismaMock.js";
import { hashMcpToken } from "@inzone/mcp/tokens";

describe("mcpTokensRouter", () => {
  const app = createTestApp();

  it("lists only current user's MCP token metadata", async () => {
    const createdAt = new Date("2026-05-05T00:00:00.000Z");
    prismaMock.mcpToken.findMany.mockResolvedValue([
      {
        id: "token-1",
        userId: TEST_USER.id,
        name: "Claude Desktop",
        tokenHash: "hidden",
        encryptedToken: null,
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await request(app).get("/api/mcp-tokens");

    expect(res.status).toBe(200);
    expect(prismaMock.mcpToken.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        encryptedToken: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(res.body[0].canReveal).toBe(false);
  });

  it("creates a token, stores only its hash, and returns the raw token once", async () => {
    const createdAt = new Date("2026-05-05T00:00:00.000Z");
    (prismaMock.mcpToken.create as any).mockImplementation(async (args: any) => ({
      id: "token-1",
      userId: args.data.userId,
      name: args.data.name,
      tokenHash: args.data.tokenHash,
      encryptedToken: args.data.encryptedToken,
      expiresAt: args.data.expiresAt as Date | null,
      lastUsedAt: null,
      revokedAt: null,
      createdAt,
      updatedAt: createdAt,
    }) as any);

    const res = await request(app)
      .post("/api/mcp-tokens")
      .send({ name: "Claude Desktop", expiresIn: "30d" });

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^iz_mcp_/);
    const createArg = prismaMock.mcpToken.create.mock.calls[0][0];
    expect(createArg.data.userId).toBe(TEST_USER.id);
    expect(createArg.data.name).toBe("Claude Desktop");
    expect(createArg.data.tokenHash).toBe(hashMcpToken(res.body.token));
    expect(createArg.data.tokenHash).not.toBe(res.body.token);
    expect(createArg.data.encryptedToken).toEqual(expect.any(String));
    expect(createArg.data.encryptedToken).not.toContain(res.body.token);
    expect(createArg.data.expiresAt).toBeInstanceOf(Date);
  });

  it("reveals a current user's stored MCP token", async () => {
    const createdAt = new Date("2026-05-05T00:00:00.000Z");
    (prismaMock.mcpToken.create as any).mockImplementation(async (args: any) => ({
      id: "token-1",
      userId: args.data.userId,
      name: args.data.name,
      tokenHash: args.data.tokenHash,
      encryptedToken: args.data.encryptedToken,
      expiresAt: args.data.expiresAt as Date | null,
      lastUsedAt: null,
      revokedAt: null,
      createdAt,
      updatedAt: createdAt,
    }) as any);

    const created = await request(app)
      .post("/api/mcp-tokens")
      .send({ name: "Claude Desktop", expiresIn: "never" });

    prismaMock.mcpToken.findFirst.mockResolvedValueOnce({
      id: "token-1",
      userId: TEST_USER.id,
      name: "Claude Desktop",
      tokenHash: hashMcpToken(created.body.token),
      encryptedToken: prismaMock.mcpToken.create.mock.calls[0][0].data.encryptedToken as string,
      expiresAt: null,
      lastUsedAt: null,
      revokedAt: null,
      createdAt,
      updatedAt: createdAt,
    });

    const res = await request(app).get("/api/mcp-tokens/token-1");

    expect(res.status).toBe(200);
    expect(res.body.token).toBe(created.body.token);
    expect(prismaMock.mcpToken.findFirst).toHaveBeenCalledWith({
      where: {
        id: "token-1",
        userId: TEST_USER.id,
      },
      select: {
        id: true,
        name: true,
        encryptedToken: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  });

  it("returns 404 when a token cannot be revealed", async () => {
    prismaMock.mcpToken.findFirst.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/mcp-tokens/token-1");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("MCP token not found or cannot be revealed");
  });

  it("validates token creation payload", async () => {
    const res = await request(app)
      .post("/api/mcp-tokens")
      .send({ name: "", expiresIn: "forever" });

    expect(res.status).toBe(400);
    expect(prismaMock.mcpToken.create).not.toHaveBeenCalled();
  });

  it("revokes a current user's token", async () => {
    prismaMock.mcpToken.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app).delete("/api/mcp-tokens/token-1");

    expect(res.status).toBe(204);
    expect(prismaMock.mcpToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "token-1",
        userId: TEST_USER.id,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it("returns 404 when revoking another user's or missing token", async () => {
    prismaMock.mcpToken.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app).delete("/api/mcp-tokens/token-1");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("MCP token not found");
  });
});
