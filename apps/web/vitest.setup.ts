import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { server } from "./src/test/mocks/server";

// Mock @vercel/analytics/react — script injection doesn't work in jsdom.
// If you add imports of other exports (e.g. track), add them here too.
vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
  track: vi.fn(),
}));

// Mock ResizeObserver which is not available in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
