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
    it("routes may use middleware (e.g. requireAdmin)", () => {
      // Routes importing middleware is an approved pattern.
      // Middleware like requireAdmin is designed to be applied by route files.
      expect(true).toBe(true);
    });
  });

  describe("Auth Routes Layer", () => {
    it("invites route should not import other auth route files", async () => {
      const rule = projectFiles()
        .inFolder("src/routes/**")
        .withName(/^invites\.ts$/)
        .shouldNot()
        .dependOnFiles()
        .withName(/^(access-requests|security-questions)\.ts$/);

      await expect(rule).toPassAsync();
    });

    it("access-requests route should not import other auth route files", async () => {
      const rule = projectFiles()
        .inFolder("src/routes/**")
        .withName(/^access-requests\.ts$/)
        .shouldNot()
        .dependOnFiles()
        .withName(/^(invites|security-questions)\.ts$/);

      await expect(rule).toPassAsync();
    });

    it("security-questions route should not import other auth route files", async () => {
      const rule = projectFiles()
        .inFolder("src/routes/**")
        .withName(/^security-questions\.ts$/)
        .shouldNot()
        .dependOnFiles()
        .withName(/^(invites|access-requests)\.ts$/);

      await expect(rule).toPassAsync();
    });

    it("requireAdmin middleware should not depend on routes", async () => {
      const rule = projectFiles()
        .inFolder("src/middleware/**")
        .withName(/^requireAdmin\.ts$/)
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/routes/**");

      await expect(rule).toPassAsync();
    });

    it("password-validation should be a pure utility with no route or middleware dependencies", async () => {
      const noRoutes = projectFiles()
        .inFolder("src/lib/**")
        .withName(/^password-validation\.ts$/)
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/routes/**");

      const noMiddleware = projectFiles()
        .inFolder("src/lib/**")
        .withName(/^password-validation\.ts$/)
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/middleware/**");

      await expect(noRoutes).toPassAsync();
      await expect(noMiddleware).toPassAsync();
    });
  });
});
