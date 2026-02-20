import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

const isSourceFile = (name: string) =>
  !name.includes(".test") && !name.includes(".spec");

describe("API Code Metrics", () => {
  describe("File Size Limits", () => {
    it("service files should be under 500 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/services/**")
        .should()
        .adhereTo(
          (file) => !isSourceFile(file.name) || file.linesOfCode < 500,
          "Service files must be under 500 lines"
        );

      await expect(rule).toPassAsync();
    });

    it("route files should be under 500 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/routes/**")
        .should()
        .adhereTo(
          (file) => !isSourceFile(file.name) || file.linesOfCode < 500,
          "Route files must be under 500 lines"
        );

      await expect(rule).toPassAsync();
    });

    it("middleware files should be under 200 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/middleware/**")
        .should()
        .adhereTo(
          (file) => !isSourceFile(file.name) || file.linesOfCode < 200,
          "Middleware files must be under 200 lines"
        );

      await expect(rule).toPassAsync();
    });

    it("validator files should be under 300 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/validators/**")
        .should()
        .adhereTo(
          (file) => !isSourceFile(file.name) || file.linesOfCode < 300,
          "Validator files must be under 300 lines"
        );

      await expect(rule).toPassAsync();
    });
  });
});
