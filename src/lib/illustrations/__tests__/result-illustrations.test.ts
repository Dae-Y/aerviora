import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  RESULT_ILLUSTRATIONS,
  getRegisteredResultIllustrationAssets,
  resolveResultIllustrationScene,
  selectResultIllustration,
  parseLocalHour,
  isNightTime,
  type ResultIllustrationScene,
} from "../result-illustrations";
import type { CurrentEnvironmentalSample } from "@/lib/risk/types";

describe("RESULT_ILLUSTRATIONS Registry Integrity (Task 7.5)", () => {
  const publicDir = path.join(process.cwd(), "public");

  it("contains exactly 7 scene assets that exist on disk and are non-empty WEBP files", () => {
    const assets = getRegisteredResultIllustrationAssets();
    expect(assets.length).toBe(7);

    const expectedScenes: ResultIllustrationScene[] = [
      "clear-day",
      "muted-day",
      "harsh-sun-day",
      "hazy-day",
      "calm-evening",
      "hot-hazy-night",
      "rainy-overcast",
    ];

    const sceneSet = new Set<string>();

    for (const asset of assets) {
      expect(expectedScenes.includes(asset.scene)).toBe(true);
      expect(asset.src.startsWith("/illustrations/scenes/")).toBe(true);
      expect(asset.src.endsWith(".webp")).toBe(true);

      const diskPath = path.join(publicDir, asset.src);
      expect(fs.existsSync(diskPath)).toBe(true);

      const stats = fs.statSync(diskPath);
      expect(stats.size).toBeGreaterThan(0);

      expect(sceneSet.has(asset.scene)).toBe(false);
      sceneSet.add(asset.scene);

      expect(asset.width).toBe(1024);
      expect(asset.height).toBe(1024);
    }
  });

  it("selectResultIllustration returns matching asset for valid scene name", () => {
    for (const sceneKey of Object.keys(RESULT_ILLUSTRATIONS) as ResultIllustrationScene[]) {
      const asset = selectResultIllustration(sceneKey);
      expect(asset).not.toBeNull();
      expect(asset?.scene).toBe(sceneKey);
      expect(asset?.src).toContain(`/illustrations/scenes/aerviora-${sceneKey}-v01.webp`);
    }
  });
});

describe("Local Hour & Evening/Night Time Parsing", () => {
  it("parses local environmental hour correctly using sample timestamp and IANA timezone", () => {
    // 2026-08-01 20:00 UTC is 2026-08-02 00:00 (midnight) in Asia/Dubai (UTC+4)
    const hourDubai = parseLocalHour("2026-08-01T20:00:00.000Z", "Asia/Dubai");
    expect(hourDubai).toBe(0);

    // 2026-08-01 16:00 UTC is 2026-08-01 20:00 (8pm) in Asia/Dubai (UTC+4)
    const nightHourDubai = parseLocalHour("2026-08-01T16:00:00.000Z", "Asia/Dubai");
    expect(nightHourDubai).toBe(20);
    expect(isNightTime("2026-08-01T16:00:00.000Z", "Asia/Dubai")).toBe(true);

    // 2026-08-01 10:00 UTC is 2026-08-01 14:00 (2pm) in Asia/Dubai (UTC+4)
    const dayHourDubai = parseLocalHour("2026-08-01T10:00:00.000Z", "Asia/Dubai");
    expect(dayHourDubai).toBe(14);
    expect(isNightTime("2026-08-01T10:00:00.000Z", "Asia/Dubai")).toBe(false);
  });

  it("returns null/false for missing or invalid timestamps or timezones", () => {
    expect(parseLocalHour(undefined, "Asia/Dubai")).toBeNull();
    expect(parseLocalHour("invalid-date", "Asia/Dubai")).toBeNull();
    expect(isNightTime(undefined, "Asia/Dubai")).toBe(false);
  });
});

describe("Conservative Result Illustration Scene Resolver", () => {
  const daytimeSample: CurrentEnvironmentalSample = {
    observedAt: "2026-08-01T10:00:00.000Z", // 14:00 Dubai (daytime)
    airTemperatureC: 25.0,
    apparentTemperatureC: 25.0,
    relativeHumidityPercent: 50,
    windSpeedKph: 10,
    uvIndex: 3.0,
    pm25UgM3: 8.0,
    pm10UgM3: 15.0,
    dustUgM3: 5.0,
  };

  const nightSample: CurrentEnvironmentalSample = {
    observedAt: "2026-08-01T16:00:00.000Z", // 20:00 Dubai (night)
    airTemperatureC: 25.0,
    apparentTemperatureC: 25.0,
    relativeHumidityPercent: 50,
    windSpeedKph: 10,
    uvIndex: 0.0,
    pm25UgM3: 8.0,
    pm10UgM3: 15.0,
    dustUgM3: 5.0,
  };

  it("resolves lower risk level during daytime to 'clear-day' and night to 'calm-evening'", () => {
    expect(
      resolveResultIllustrationScene({
        level: "lower",
        current: daytimeSample,
        timezone: "Asia/Dubai",
      })
    ).toBe("clear-day");

    expect(
      resolveResultIllustrationScene({
        level: "lower",
        current: nightSample,
        timezone: "Asia/Dubai",
      })
    ).toBe("calm-evening");
  });

  it("resolves elevated risk level during daytime to 'muted-day' or 'hazy-day' when PM/dust elevated", () => {
    expect(
      resolveResultIllustrationScene({
        level: "elevated",
        current: daytimeSample,
        timezone: "Asia/Dubai",
      })
    ).toBe("muted-day");

    const hazySample: CurrentEnvironmentalSample = {
      ...daytimeSample,
      pm25UgM3: 20.0,
    };

    expect(
      resolveResultIllustrationScene({
        level: "elevated",
        current: hazySample,
        timezone: "Asia/Dubai",
      })
    ).toBe("hazy-day");
  });

  it("resolves high risk level during daytime with high UV/heat to 'harsh-sun-day'", () => {
    const sunnyHighSample: CurrentEnvironmentalSample = {
      ...daytimeSample,
      uvIndex: 8.0,
      apparentTemperatureC: 35.0,
    };

    expect(
      resolveResultIllustrationScene({
        level: "high",
        current: sunnyHighSample,
        timezone: "Asia/Dubai",
      })
    ).toBe("harsh-sun-day");
  });

  it("resolves very-high risk level at night to 'hot-hazy-night'", () => {
    const dubaiNightSample: CurrentEnvironmentalSample = {
      observedAt: "2026-08-01T16:00:00.000Z", // 20:00 Dubai
      airTemperatureC: 35.3,
      apparentTemperatureC: 43.5,
      pm25UgM3: 66.1,
      dustUgM3: 80.0,
    };

    expect(
      resolveResultIllustrationScene({
        level: "very-high",
        current: dubaiNightSample,
        timezone: "Asia/Dubai",
      })
    ).toBe("hot-hazy-night");
  });

  it("returns null for unable level", () => {
    expect(
      resolveResultIllustrationScene({
        level: "unable",
        current: daytimeSample,
        timezone: "Asia/Dubai",
      })
    ).toBeNull();
  });
});
