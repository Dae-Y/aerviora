import { describe, it, expect } from "vitest";
import { validateEnvironmentalSample } from "../validation";
import type { CurrentEnvironmentalSample } from "../types";

describe("validateEnvironmentalSample", () => {
  const validSample: CurrentEnvironmentalSample = {
    observedAt: "2026-08-01T12:00:00Z",
    airTemperatureC: 24.5,
    apparentTemperatureC: 25.1,
    relativeHumidityPercent: 45,
    windSpeedKph: 12.5,
    uvIndex: 4,
    pm25UgM3: 8.2,
    pm10UgM3: 15.0,
    dustUgM3: 3.5,
    pollenLevel: "low",
    dustLevel: "none",
  };

  it("accepts a valid complete environmental sample with dustUgM3", () => {
    const result = validateEnvironmentalSample(validSample);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts a valid partial environmental sample", () => {
    const partialSample: CurrentEnvironmentalSample = {
      observedAt: "2026-08-01T12:00:00Z",
      apparentTemperatureC: 28.0,
      relativeHumidityPercent: 60,
    };

    const result = validateEnvironmentalSample(partialSample);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts high valid dustUgM3 values without imposing an arbitrary 10,000 ceiling", () => {
    const highDustSample: CurrentEnvironmentalSample = {
      observedAt: "2026-08-01T12:00:00Z",
      dustUgM3: 15000,
    };

    const result = validateEnvironmentalSample(highDustSample);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects negative values for dustUgM3, wind, UV, PM2.5, and PM10", () => {
    const negSample: CurrentEnvironmentalSample = {
      observedAt: "2026-08-01T12:00:00Z",
      windSpeedKph: -5,
      uvIndex: -1,
      pm25UgM3: -10,
      pm10UgM3: -2,
      dustUgM3: -1,
    };

    const result = validateEnvironmentalSample(negSample);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(5);
    expect(result.issues.every((iss) => iss.code === "negative-value")).toBe(true);
  });

  it("rejects non-finite values (NaN and Infinity) for dustUgM3", () => {
    const nanSample: CurrentEnvironmentalSample = {
      observedAt: "2026-08-01T12:00:00Z",
      dustUgM3: NaN,
      airTemperatureC: Infinity,
    };

    const result = validateEnvironmentalSample(nanSample);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.every((iss) => iss.code === "not-finite")).toBe(true);
  });

  it("rejects invalid or timezone-less timestamps", () => {
    const badSample: CurrentEnvironmentalSample = {
      observedAt: "2026-08-01 12:00:00",
      apparentTemperatureC: 25.0,
    };

    const result = validateEnvironmentalSample(badSample);
    expect(result.isValid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid-timestamp",
        field: "observedAt",
      })
    );
  });

  it("does not mutate the sample object", () => {
    const sample: CurrentEnvironmentalSample = {
      observedAt: "2026-08-01T12:00:00Z",
      relativeHumidityPercent: 50,
      dustUgM3: 5.0,
    };

    Object.freeze(sample);
    expect(() => validateEnvironmentalSample(sample)).not.toThrow();
  });
});
