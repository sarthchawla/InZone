import { projectFiles } from "archunit";
import { describe, it, expect } from "vitest";

describe("Frontend Layer Architecture", () => {
  describe("UI Components", () => {
    it("UI components should not import feature components", async () => {
      const rule = projectFiles()
        .inFolder("src/components/ui/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/components/board/**");

      await expect(rule).toPassAsync();
    });

    it("UI components should not import column components", async () => {
      const rule = projectFiles()
        .inFolder("src/components/ui/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/components/column/**");

      await expect(rule).toPassAsync();
    });

    it("UI components should not import todo components", async () => {
      const rule = projectFiles()
        .inFolder("src/components/ui/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/components/todo/**");

      await expect(rule).toPassAsync();
    });

    it("UI components should not import label components", async () => {
      const rule = projectFiles()
        .inFolder("src/components/ui/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/components/label/**");

      await expect(rule).toPassAsync();
    });

    it("UI components should not use hooks", async () => {
      const rule = projectFiles()
        .inFolder("src/components/ui/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/hooks/**");

      await expect(rule).toPassAsync();
    });

    it("UI components should not use API client directly", async () => {
      const rule = projectFiles()
        .inFolder("src/components/ui/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/api/**");

      await expect(rule).toPassAsync();
    });
  });

  describe("Hooks Layer", () => {
    it("hooks should not import components", async () => {
      const rule = projectFiles()
        .inFolder("src/hooks/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/components/**");

      await expect(rule).toPassAsync();
    });
  });

  describe("API Layer", () => {
    it("API layer should not depend on components", async () => {
      const rule = projectFiles()
        .inFolder("src/api/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/components/**");

      await expect(rule).toPassAsync();
    });

    it("API layer should not depend on hooks", async () => {
      const rule = projectFiles()
        .inFolder("src/api/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/hooks/**");

      await expect(rule).toPassAsync();
    });

    it("API layer should not depend on contexts", async () => {
      const rule = projectFiles()
        .inFolder("src/api/**")
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/contexts/**");

      await expect(rule).toPassAsync();
    });
  });

  describe("Auth Pages Layer", () => {
    it("auth pages should not import admin pages", async () => {
      const authPageNames = [
        /^LoginPage\.tsx$/,
        /^SignUpPage\.tsx$/,
        /^RequestAccessPage\.tsx$/,
        /^ResetPasswordPage\.tsx$/,
        /^SettingsPage\.tsx$/,
      ];

      for (const name of authPageNames) {
        const rule = projectFiles()
          .inFolder("src/pages/**")
          .withName(name)
          .shouldNot()
          .dependOnFiles()
          .inFolder("src/pages/admin/**");

        await expect(rule).toPassAsync();
      }
    });

    it("admin pages should not import auth pages", async () => {
      const rule = projectFiles()
        .inFolder("src/pages/admin/**")
        .shouldNot()
        .dependOnFiles()
        .inPath(/pages\/(LoginPage|SignUpPage|RequestAccessPage|ResetPasswordPage)/);

      await expect(rule).toPassAsync();
    });
  });
});
