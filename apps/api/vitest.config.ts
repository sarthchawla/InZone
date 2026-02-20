import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist", "tests/bdd/**", "src/architecture/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
        "src/index.ts", // Entry point that starts server
        "src/test/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // Enable parallel test file execution with isolation
    // Each test file runs in its own environment with isolated mock state
    isolate: true,
    fileParallelism: true,
    // Vitest 4.x: Use maxWorkers for thread pool concurrency
    maxWorkers: 4,
    minWorkers: 1,
  },
});
