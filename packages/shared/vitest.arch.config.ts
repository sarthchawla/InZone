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
    setupFiles: ["./vitest.arch.setup.ts"],
    include: ["src/architecture/**/*.arch.test.ts"],
    testTimeout: 30000,
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: process.env.CI ? { junit: "junit-arch.xml" } : undefined,
  },
});
