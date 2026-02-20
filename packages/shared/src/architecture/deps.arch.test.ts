import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Shared Package Dependency Isolation", () => {
  it("should not import from apps/api", async () => {
    const rule = projectFiles()
      .inFolder("src/**")
      .should()
      .adhereTo(
        (file) =>
          !file.content.match(/from\s+['"].*apps\/api/) &&
          !file.content.match(/require\(['"].*apps\/api/),
        "Shared package must not import from apps/api"
      );

    await expect(rule).toPassAsync();
  });

  it("should not import from apps/web", async () => {
    const rule = projectFiles()
      .inFolder("src/**")
      .should()
      .adhereTo(
        (file) =>
          !file.content.match(/from\s+['"].*apps\/web/) &&
          !file.content.match(/require\(['"].*apps\/web/),
        "Shared package must not import from apps/web"
      );

    await expect(rule).toPassAsync();
  });

  it("should not have runtime dependencies", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve("package.json"), "utf8")
    );
    const deps = pkgJson.dependencies || {};
    expect(
      Object.keys(deps),
      "Shared package should have no runtime dependencies"
    ).toEqual([]);
  });
});
