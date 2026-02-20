import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

describe("Frontend Naming Conventions", () => {
  it("React components should be PascalCase .tsx", async () => {
    const rule = projectFiles()
      .inFolder("src/components/**")
      .should()
      .haveName(/^[A-Z][a-zA-Z]+(\.(test|spec))?\.tsx$|^index\.ts$/);

    await expect(rule).toPassAsync();
  });

  it("hooks should start with 'use'", async () => {
    const rule = projectFiles()
      .inFolder("src/hooks/**")
      .should()
      .haveName(/^use[A-Z][a-zA-Z]+(\.(test|spec))?\.ts$|^index\.ts$/);

    await expect(rule).toPassAsync();
  });

  it("API client files should be lowercase", async () => {
    const rule = projectFiles()
      .inFolder("src/api/**")
      .should()
      .haveName(/^[a-z]+(\.(test|spec))?\.ts$/);

    await expect(rule).toPassAsync();
  });
});
