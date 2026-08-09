import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PrivacyDashboard } from "../privacy-dashboard";

describe("PrivacyDashboard Component (Task 11A)", () => {
  const componentPath = path.resolve(__dirname, "../privacy-dashboard.tsx");
  const componentSource = fs.readFileSync(componentPath, "utf-8");

  it("13.1 exports PrivacyDashboard component function", () => {
    expect(typeof PrivacyDashboard).toBe("function");
  });

  it("13.1 contains required headings, info cards, and fresh check CTA", () => {
    expect(componentSource).toContain("Privacy Dashboard");
    expect(componentSource).toContain("Session-only prototype");
    expect(componentSource).toContain("No account required");

    // Information-used cards
    expect(componentSource).toContain("Location");
    expect(componentSource).toContain("Environmental sensitivities");
    expect(componentSource).toContain("Activity and duration");

    // Session actions
    expect(componentSource).toContain('href="/check"');
    expect(componentSource).toContain("Start a fresh check");
    expect(componentSource).toContain('href="/privacy"');
    expect(componentSource).toContain("Read full privacy details");

    // Limitation notice
    expect(componentSource).toContain("Prototype Limitation Notice");
  });

  it("13.2 does NOT render fake interactive controls, scores, or fake data export/delete actions", () => {
    expect(componentSource).not.toContain("Save my preferences");
    expect(componentSource).not.toContain("Share anonymous prototype analytics");
    expect(componentSource).not.toContain("Download my data");
    expect(componentSource).not.toContain("Delete session data");
    expect(componentSource).not.toContain("High privacy control");
    expect(componentSource).not.toContain("95%");
    expect(componentSource).not.toContain('role="switch"');
  });

  it("13.3 contains ZERO calls to localStorage or sessionStorage APIs", () => {
    expect(componentSource).not.toContain("localStorage");
    expect(componentSource).not.toContain("sessionStorage");
    expect(componentSource).not.toContain(".clear()");
    expect(componentSource).not.toContain(".removeItem(");
    expect(componentSource).not.toContain(".setItem(");
  });

  it("13.4 configures accessible disclosure attributes (aria-expanded and aria-controls)", () => {
    expect(componentSource).toContain("aria-expanded");
    expect(componentSource).toContain('aria-controls="info-categories-panel"');
    expect(componentSource).toContain("View information categories");
    expect(componentSource).toContain("Hide information categories");
  });
});
