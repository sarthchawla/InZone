import { describe, it, expect } from "vitest";
import { validatePasswordStrength } from "./password-validation.js";

describe("validatePasswordStrength", () => {
  it("returns null for a valid password meeting all rules", () => {
    expect(validatePasswordStrength("Password1!")).toBeNull();
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(validatePasswordStrength("Pa1!")).toBe("At least 8 characters");
  });

  it("rejects a password without an uppercase letter", () => {
    expect(validatePasswordStrength("password1!")).toBe(
      "At least one uppercase letter"
    );
  });

  it("rejects a password without a lowercase letter", () => {
    expect(validatePasswordStrength("PASSWORD1!")).toBe(
      "At least one lowercase letter"
    );
  });

  it("rejects a password without a number", () => {
    expect(validatePasswordStrength("Password!")).toBe(
      "At least one number"
    );
  });

  it("rejects a password without a special character", () => {
    expect(validatePasswordStrength("Password1")).toBe(
      "At least one special character"
    );
  });

  it("returns the first failing rule message when multiple rules fail", () => {
    // Empty string fails length first
    expect(validatePasswordStrength("")).toBe("At least 8 characters");
    // Short lowercase-only string fails length first, not uppercase
    expect(validatePasswordStrength("abc")).toBe("At least 8 characters");
  });

  it("accepts passwords with various special characters", () => {
    expect(validatePasswordStrength("Password1@")).toBeNull();
    expect(validatePasswordStrength("Password1#")).toBeNull();
    expect(validatePasswordStrength("Password1$")).toBeNull();
    expect(validatePasswordStrength("Password1%")).toBeNull();
    expect(validatePasswordStrength("Password1 ")).toBeNull();
  });

  it("accepts a password that is exactly 8 characters", () => {
    expect(validatePasswordStrength("Abcde1!x")).toBeNull();
  });
});
