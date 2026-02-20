import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

describe("API Circular Dependencies", () => {
  it("should have no circular dependencies in src folder", async () => {
    const rule = projectFiles()
      .inFolder("src/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it("should have no circular dependencies between services", async () => {
    const rule = projectFiles()
      .inFolder("src/services/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it("should have no circular dependencies between routes", async () => {
    const rule = projectFiles()
      .inFolder("src/routes/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it("should have no circular dependencies between middleware", async () => {
    const rule = projectFiles()
      .inFolder("src/middleware/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });
});
