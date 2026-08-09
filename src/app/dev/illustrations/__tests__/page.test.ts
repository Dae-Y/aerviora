import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DevIllustrationsPage from "../page";
import { DubaiFixturePreview } from "../dubai-fixture-preview";
import {
  getRegisteredResultIllustrationAssets,
  resolveResultIllustrationScene,
} from "@/lib/illustrations/result-illustrations";
import { evaluatePersonalisedRisk } from "@/lib/risk/engine";

// Mock next/navigation notFound
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("DevIllustrationsPage Production Guard & Gallery (Task 7.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls notFound() and throws in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => DevIllustrationsPage()).toThrow("NEXT_NOT_FOUND");
  });

  it("renders all 7 registered flat scene assets in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    const pageElement = DevIllustrationsPage();
    expect(pageElement).toBeDefined();

    const assets = getRegisteredResultIllustrationAssets();
    expect(assets.length).toBe(7);
  });

  it("DubaiFixturePreview resolves scene to 'hot-hazy-night' deterministically", () => {
    const previewElement = DubaiFixturePreview();
    expect(previewElement).toBeDefined();

    const currentSample = {
      observedAt: "2026-08-01T16:00:00.000Z", // 20:00 local Dubai time
      airTemperatureC: 35.3,
      apparentTemperatureC: 43.5,
      relativeHumidityPercent: 66,
      windSpeedKph: 3.7,
      uvIndex: 0,
      pm25UgM3: 66.1,
      pm10UgM3: 111.1,
      dustUgM3: 80,
      pm25UsAqi: 157,
      pm10UsAqi: 79,
    };

    const riskResult = evaluatePersonalisedRisk({
      snapshot: {
        requestedLocation: "Dubai",
        resolvedLocation: "Dubai, United Arab Emirates",
        current: currentSample,
        hourly: [],
        sources: [],
      },
      input: {
        location: "Dubai",
        sensitivities: ["respiratory"],
        activity: "walking",
        durationMinutes: 45,
      },
      referenceTime: "2026-08-01T16:05:00.000Z",
    });

    expect(riskResult.level).toBe("very-high");

    const scene = resolveResultIllustrationScene({
      level: riskResult.level,
      current: currentSample,
      timezone: "Asia/Dubai",
    });

    expect(scene).toBe("hot-hazy-night");
  });

  it("asserts zero live fetch network calls during page evaluation", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NODE_ENV", "development");

    const pageElement = DevIllustrationsPage();
    expect(pageElement).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
