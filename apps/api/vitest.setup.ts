import { beforeAll, afterAll, afterEach } from "vitest";

// Import the prisma mock to set up mocking globally
import "./src/test/prismaMock.js";

// Set test environment
process.env.NODE_ENV = "test";

// Global setup before all tests
beforeAll(() => {
  // Any global setup can go here
});

// Global cleanup after each test
afterEach(() => {
  // Clean up any test state if needed
});

// Global cleanup after all tests
afterAll(() => {
  // Any global teardown can go here
});
