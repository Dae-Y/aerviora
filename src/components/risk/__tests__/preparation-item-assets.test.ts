import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { PreparationItemId } from "@/lib/preparation/types";
import { PREPARATION_ITEM_ASSETS } from "../preparation-item-assets";

const ALL_ITEM_IDS: readonly PreparationItemId[] = [
  "sunscreen",
  "water",
  "sunglasses",
  "protective-mask",
  "sun-shade",
  "breathable-clothing",
];

describe("PREPARATION_ITEM_ASSETS catalogue", () => {
  it("exhaustively maps every PreparationItemId to a valid WebP asset path", () => {
    ALL_ITEM_IDS.forEach((id) => {
      const asset = PREPARATION_ITEM_ASSETS[id];
      expect(asset).toBeDefined();
      expect(asset.src).toMatch(/^\/preparation-items\/aerviora-.*-v01\.webp$/);
      expect(asset.src.endsWith(".png")).toBe(false);
    });
  });

  it("maps correct semantic asset files to corresponding item IDs", () => {
    expect(PREPARATION_ITEM_ASSETS.water.src).toContain("water-bottle");
    expect(PREPARATION_ITEM_ASSETS["protective-mask"].src).toContain("well-fitting-mask");
    expect(PREPARATION_ITEM_ASSETS["sun-shade"].src).toContain("sun-hat-shade");
    expect(PREPARATION_ITEM_ASSETS["breathable-clothing"].src).toContain("light-breathable-clothing");
    expect(PREPARATION_ITEM_ASSETS.sunscreen.src).toContain("sunscreen");
    expect(PREPARATION_ITEM_ASSETS.sunglasses.src).toContain("sunglasses");
  });

  it("verifies physical existence of all mapped files in the public directory", () => {
    ALL_ITEM_IDS.forEach((id) => {
      const relativeSrc = PREPARATION_ITEM_ASSETS[id].src.replace(/^\//, "");
      const fullPath = path.join(process.cwd(), "public", relativeSrc);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });
});
