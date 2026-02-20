import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

describe("API Layer Architecture", () => {
  describe("Services Layer", () => {
    it("services should not depend on routes", async () => {
      const rule = projectFiles()
        .inFolder("src/services/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/routes/**");

      await expect(rule).toPassAsync();
    });

    it("services should not depend on middleware", async () => {
      const rule = projectFiles()
        .inFolder("src/services/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/middleware/**");

      await expect(rule).toPassAsync();
    });
  });

  describe("Validators Layer", () => {
    it("validators should not depend on services", async () => {
      const rule = projectFiles()
        .inFolder("src/validators/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/services/**");

      await expect(rule).toPassAsync();
    });

    it("validators should not depend on routes", async () => {
      const rule = projectFiles()
        .inFolder("src/validators/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/routes/**");

      await expect(rule).toPassAsync();
    });

    it("validators should not depend on middleware", async () => {
      const rule = projectFiles()
        .inFolder("src/validators/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/middleware/**");

      await expect(rule).toPassAsync();
    });
  });

  describe("Middleware Layer", () => {
    it("middleware should not depend on services", async () => {
      const rule = projectFiles()
        .inFolder("src/middleware/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/services/**");

      await expect(rule).toPassAsync();
    });

    it("middleware should not depend on routes", async () => {
      const rule = projectFiles()
        .inFolder("src/middleware/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/routes/**");

      await expect(rule).toPassAsync();
    });
  });

  describe("Routes Layer", () => {
    it("routes should not depend on middleware", async () => {
      const rule = projectFiles()
        .inFolder("src/routes/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/middleware/**");

      await expect(rule).toPassAsync();
    });
  });
});
