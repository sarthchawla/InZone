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

// Mock window.matchMedia which is not available in JSDOM (needed by ThemeProvider)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Clean up after each test
afterEach(() => {
  cleanup();
  // Clean up dark mode class to prevent leakage between tests
  document.documentElement.classList.remove('dark');
  localStorage.removeItem('inzone-theme');
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
