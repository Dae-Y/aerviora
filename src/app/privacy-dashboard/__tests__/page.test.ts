import { describe, it, expect } from "vitest";
import PrivacyDashboardPage, { metadata } from "../page";

describe("PrivacyDashboardPage Route (Task 11A)", () => {
  it("exports valid metadata for Next.js", () => {
    expect(metadata.title).toBe("Privacy Dashboard — Aerviora");
    expect(metadata.description).toContain("Aerviora");
  });

  it("exports page component function", () => {
    expect(typeof PrivacyDashboardPage).toBe("function");
  });
});
