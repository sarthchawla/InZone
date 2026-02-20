import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

const isSourceFile = (name: string) =>
  !name.includes(".test") && !name.includes(".spec");

describe("Frontend Code Metrics", () => {
  describe("File Size Limits", () => {
    it("UI components should be under 150 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/components/ui/**")
        .should()
        .adhereTo(
          (file) => !isSourceFile(file.name) || file.linesOfCode < 150,
          "UI components must be under 150 lines"
        );

      await expect(rule).toPassAsync();
    });

    it("hooks should be under 200 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/hooks/**")
        .should()
        .adhereTo(
          (file) => !isSourceFile(file.name) || file.linesOfCode < 200,
          "Hooks must be under 200 lines"
        );

      await expect(rule).toPassAsync();
    });

    it("API client files should be under 300 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/api/**")
        .should()
        .adhereTo(
          (file) => !isSourceFile(file.name) || file.linesOfCode < 300,
          "API client files must be under 300 lines"
        );

      await expect(rule).toPassAsync();
    });

    it("feature components should be under 700 lines", async () => {
      const rule = projectFiles()
        .inFolder("src/components/**")
        .should()
        .adhereTo(
          (file) =>
            file.directory.includes("/ui") ||
            !isSourceFile(file.name) ||
            file.linesOfCode < 700,
          "Feature components must be under 700 lines"
        );

      await expect(rule).toPassAsync();
    });
  });
});
