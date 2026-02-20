import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

describe("Frontend Circular Dependencies", () => {
  it("should have no circular dependencies in src folder", async () => {
    const rule = projectFiles()
      .inFolder("src/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it("should have no circular dependencies between hooks", async () => {
    const rule = projectFiles()
      .inFolder("src/hooks/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it("should have no circular dependencies between components", async () => {
    const rule = projectFiles()
      .inFolder("src/components/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });

  it("should have no circular dependencies in API layer", async () => {
    const rule = projectFiles()
      .inFolder("src/api/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });
});
