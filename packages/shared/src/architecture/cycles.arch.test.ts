import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

describe("Shared Package Circular Dependencies", () => {
  it("should have no circular dependencies", async () => {
    const rule = projectFiles()
      .inFolder("src/**")
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync();
  });
});
