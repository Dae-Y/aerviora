import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "mock-font" }),
}));

import { metadata } from "../layout";

describe("Root layout metadata and brand static asset integrity (Task 6.7)", () => {
  it("configures theme-aware light/dark SVG favicons and ICO fallback", () => {
    expect(metadata.title).toBe("Aerviora");
    expect(metadata.description).toBe(
      "Mobile-first environmental decision support for heat, air quality, dust and pollen."
    );

    const icons = metadata.icons as Record<string, unknown>;
    expect(icons).toBeDefined();
    expect(Array.isArray(icons.icon)).toBe(true);

    const iconList = icons.icon as Array<{ url: string; type?: string; media?: string }>;

    const lightIcon = iconList.find(
      (i) => i.media === "(prefers-color-scheme: light)"
    );
    const darkIcon = iconList.find(
      (i) => i.media === "(prefers-color-scheme: dark)"
    );

    expect(lightIcon).toEqual({
      url: "/brand/aerviora/favicons/light/favicon_light.svg",
      type: "image/svg+xml",
      media: "(prefers-color-scheme: light)",
    });

    expect(darkIcon).toEqual({
      url: "/brand/aerviora/favicons/dark/favicon_dark.svg",
      type: "image/svg+xml",
      media: "(prefers-color-scheme: dark)",
    });

    expect(icons.shortcut).toBe("/brand/aerviora/favicons/favicon.ico");
  });

  it("verifies obsolete src/app/favicon.ico file is removed", () => {
    const obsoleteFaviconPath = path.join(process.cwd(), "src/app/favicon.ico");
    expect(fs.existsSync(obsoleteFaviconPath)).toBe(false);
  });

  it("verifies required approved brand static assets exist and are non-empty", () => {
    const requiredAssets = [
      "public/brand/aerviora/app-icons/concept-a-dark.svg",
      "public/brand/aerviora/app-icons/concept-a-light.svg",
      "public/brand/aerviora/favicons/light/favicon_light.svg",
      "public/brand/aerviora/favicons/dark/favicon_dark.svg",
      "public/brand/aerviora/favicons/favicon.ico",
    ];

    for (const relPath of requiredAssets) {
      const fullPath = path.join(process.cwd(), relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stats = fs.statSync(fullPath);
      expect(stats.size).toBeGreaterThan(0);
    }
  });
});
