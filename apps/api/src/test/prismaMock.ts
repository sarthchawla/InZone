import { PrismaClient } from "@prisma/client";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

// Create a deep mock of PrismaClient
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Export the mocked prisma client
export const prismaMock = mockDeep<PrismaClient>();

// Reset the mock before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Helper to reset the mock manually if needed
export function resetPrismaMock() {
  mockReset(prismaMock);
}

// Mock the actual prisma module
vi.mock("../lib/prisma.js", () => ({
  prisma: prismaMock,
}));
