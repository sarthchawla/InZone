import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

describe("API Naming Conventions", () => {
  it("service files should follow *.service.ts naming", async () => {
    const rule = projectFiles()
      .inFolder("src/services/**")
      .should()
      .haveName(/\.(service|service\.test)\.ts$|^index\.ts$/);

    await expect(rule).toPassAsync();
  });

  it("route files should be lowercase", async () => {
    const rule = projectFiles()
      .inFolder("src/routes/**")
      .should()
      .haveName(/^[a-z]+(\.(test|spec))?\.ts$/);

    await expect(rule).toPassAsync();
  });

  it("middleware files should be camelCase", async () => {
    const rule = projectFiles()
      .inFolder("src/middleware/**")
      .should()
      .haveName(/^[a-z][a-zA-Z]+(\.(test|spec))?\.ts$/);

    await expect(rule).toPassAsync();
  });
});
