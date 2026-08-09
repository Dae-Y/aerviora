import { describe, it, expect } from "vitest";
import {
  assessDataReadiness,
  isStaleOnlyReadinessFailure,
  isRetriableAirQualityOnlyFailure,
} from "../data-readiness";
import type { OutdoorCheckInput } from "@/lib/check-options";
import type { EnvironmentalSnapshot } from "../types";

describe("assessDataReadiness", () => {
  const refTime = "2026-08-01T12:00:00Z";

  const defaultInput: OutdoorCheckInput = {
    location: "Perth",
    sensitivities: [],
    activity: "walking",
    durationMinutes: 30,
  };

  const validSnapshot: EnvironmentalSnapshot = {
    requestedLocation: "Perth",
    resolvedLocation: "Perth, WA, Australia",
    current: {
      observedAt: "2026-08-01T11:45:00Z",
      airTemperatureC: 22.0,
      apparentTemperatureC: 22.5,
      relativeHumidityPercent: 55,
      windSpeedKph: 10,
      uvIndex: 3,
      pm25UgM3: 5.0,
      pm10UgM3: 12.0,
      dustUgM3: 1.5,
      pm25UsAqi: 20,
      pm10UsAqi: 15,
    },
    hourly: [],
    sources: [
      {
        kind: "weather",
        provider: "Open-Meteo Weather",
        status: "available",
        observedAt: "2026-08-01T11:45:00Z",
      },
      {
        kind: "air-quality",
        provider: "Open-Meteo Air Quality / CAMS",
        status: "available",
        observedAt: "2026-08-01T11:45:00Z",
      },
    ],
  };

  it("returns 'ready' for valid, complete, and fresh data matching all relevant signals", () => {
    const result = assessDataReadiness({
      snapshot: validSnapshot,
      input: defaultInput,
      referenceTime: refTime,
    });

    expect(result.status).toBe("ready");
    expect(result.missingSignals).toHaveLength(0);
    expect(result.invalidSignals).toHaveLength(0);
    expect(result.staleSources).toHaveLength(0);
  });

  /* Amendment 11: Partial AQI Policy Readiness Tests */
  describe("Task 7.7 Amendment 11: Partial AQI Policy Readiness Tests", () => {
    it("both PM AQIs valid -> complete PM AQI coverage", () => {
      const result = assessDataReadiness({
        snapshot: validSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(result.status).toBe("ready");
    });

    it("only PM2.5 AQI valid -> calculable with partial air-quality coverage", () => {
      const snapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          pm25UsAqi: 35,
          pm10UsAqi: undefined,
        },
      };

      const result = assessDataReadiness({
        snapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(result.status).toBe("partial");
      expect(result.missingSignals).toContain("pm10UsAqi");
    });

    it("only PM10 AQI valid -> calculable with partial air-quality coverage", () => {
      const snapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          pm25UsAqi: undefined,
          pm10UsAqi: 42,
        },
      };

      const result = assessDataReadiness({
        snapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(result.status).toBe("partial");
      expect(result.missingSignals).toContain("pm25UsAqi");
    });

    it("both PM AQIs missing -> unavailable particulate input (insufficient readiness)", () => {
      const snapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          pm25UsAqi: undefined,
          pm10UsAqi: undefined,
        },
      };

      const result = assessDataReadiness({
        snapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(result.status).toBe("insufficient");
      expect(result.issues.some((iss) => iss.message.includes("PM-specific U.S. AQI"))).toBe(true);
    });

    it("malformed AQI plus one valid AQI -> use valid AQI and report partial coverage", () => {
      const snapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          pm25UsAqi: NaN,
          pm10UsAqi: 45,
        },
      };

      const result = assessDataReadiness({
        snapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(result.status).toBe("partial");
    });
  });

  /* Amendment 12: Stale-Only Classification Tests */
  describe("Task 7.7 Amendment 12: Stale-Only Classification Tests", () => {
    it("stale issue only + complete required structure -> automatic refresh eligible", () => {
      const staleSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          observedAt: "2026-08-01T05:00:00Z",
        },
      };

      const readiness = assessDataReadiness({
        snapshot: staleSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(readiness.status).toBe("insufficient");
      expect(isStaleOnlyReadinessFailure(readiness)).toBe(true);
    });

    it("stale plus missing AQI -> not stale-only", () => {
      const staleSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          observedAt: "2026-08-01T05:00:00Z",
          pm25UsAqi: undefined,
          pm10UsAqi: undefined,
        },
      };

      const readiness = assessDataReadiness({
        snapshot: staleSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(isStaleOnlyReadinessFailure(readiness)).toBe(false);
    });

    it("missing data without stale issue -> not stale-only", () => {
      const missingSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          pm25UsAqi: undefined,
          pm10UsAqi: undefined,
        },
      };

      const readiness = assessDataReadiness({
        snapshot: missingSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(isStaleOnlyReadinessFailure(readiness)).toBe(false);
    });

    it("fresh complete response -> not refresh eligible", () => {
      const readiness = assessDataReadiness({
        snapshot: validSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(isStaleOnlyReadinessFailure(readiness)).toBe(false);
    });
  });

  /* Task 7.7.4: Transient Air-Quality Classifier Tests */
  describe("Task 7.7.4: isRetriableAirQualityOnlyFailure", () => {
    it("1. valid weather + complete missing air group + provider error -> retriable", () => {
      const missingAirSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          observedAt: refTime,
          airTemperatureC: 37.3,
          apparentTemperatureC: 39.5,
          relativeHumidityPercent: 37,
          windSpeedKph: 10.8,
          // air quality fields all undefined
        },
        sources: [
          {
            kind: "weather",
            provider: "Open-Meteo Weather",
            status: "available",
            observedAt: refTime,
          },
          {
            kind: "air-quality",
            provider: "Open-Meteo Air Quality / CAMS",
            status: "error",
            observedAt: refTime,
          },
        ],
      };

      const readiness = assessDataReadiness({
        snapshot: missingAirSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: missingAirSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(true);
    });

    it("2. valid weather + complete missing air group + provider unavailable status -> retriable", () => {
      const unavailableAirSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          observedAt: refTime,
          airTemperatureC: 25.0,
          apparentTemperatureC: 26.0,
          relativeHumidityPercent: 50,
          windSpeedKph: 12,
        },
        sources: [
          {
            kind: "weather",
            provider: "Open-Meteo Weather",
            status: "available",
            observedAt: refTime,
          },
          {
            kind: "air-quality",
            provider: "Open-Meteo Air Quality / CAMS",
            status: "unavailable",
            observedAt: refTime,
          },
        ],
      };

      const readiness = assessDataReadiness({
        snapshot: unavailableAirSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: unavailableAirSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(true);
    });

    it("3. valid weather + complete air-quality group -> not retriable", () => {
      const readiness = assessDataReadiness({
        snapshot: validSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: validSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });

    it("4. uvIndex = 0 -> treated as valid (not complete-group failure)", () => {
      const zeroUvSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          uvIndex: 0,
        },
      };

      const readiness = assessDataReadiness({
        snapshot: zeroUvSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: zeroUvSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });

    it("5. dust = 0 -> treated as valid (not complete-group failure)", () => {
      const zeroDustSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          dustUgM3: 0,
        },
      };

      const readiness = assessDataReadiness({
        snapshot: zeroDustSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: zeroDustSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });

    it("6. one valid PM AQI and one missing PM AQI -> not treated as complete-group failure", () => {
      const partialAqiSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          pm25UsAqi: 35,
          pm10UsAqi: undefined,
        },
      };

      const readiness = assessDataReadiness({
        snapshot: partialAqiSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: partialAqiSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });

    it("7. missing current sample -> not retriable", () => {
      const noCurrentSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: undefined,
      };

      const readiness = assessDataReadiness({
        snapshot: noCurrentSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: noCurrentSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });

    it("8. malformed weather data (non-finite temperature) -> not retriable", () => {
      const malformedWeatherSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          airTemperatureC: NaN,
        },
      };

      const readiness = assessDataReadiness({
        snapshot: malformedWeatherSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: malformedWeatherSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });

    it("9. stale-only failure -> handled by stale path, not air-quality path", () => {
      const staleSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          ...validSnapshot.current!,
          observedAt: "2026-08-01T05:00:00Z",
        },
      };

      const readiness = assessDataReadiness({
        snapshot: staleSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(isStaleOnlyReadinessFailure(readiness)).toBe(true);
      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: staleSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });

    it("10. stale weather + missing air-quality -> not retriable air-quality failure (Amendment 1)", () => {
      const staleWeatherMissingAirSnapshot: EnvironmentalSnapshot = {
        ...validSnapshot,
        current: {
          observedAt: "2026-08-01T05:00:00Z",
          airTemperatureC: 22.0,
          apparentTemperatureC: 22.5,
          relativeHumidityPercent: 55,
          windSpeedKph: 10,
        },
        sources: [
          {
            kind: "weather",
            provider: "Open-Meteo Weather",
            status: "available",
            observedAt: "2026-08-01T05:00:00Z",
          },
          {
            kind: "air-quality",
            provider: "Open-Meteo Air Quality / CAMS",
            status: "error",
            observedAt: "2026-08-01T05:00:00Z",
          },
        ],
      };

      const readiness = assessDataReadiness({
        snapshot: staleWeatherMissingAirSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(
        isRetriableAirQualityOnlyFailure({
          snapshot: staleWeatherMissingAirSnapshot,
          readiness,
          referenceTime: refTime,
        })
      ).toBe(false);
    });
  });
});
