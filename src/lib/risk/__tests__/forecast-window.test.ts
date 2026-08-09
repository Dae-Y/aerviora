import { describe, it, expect } from "vitest";
import {
  evaluateHourlyForecastPoint,
  compareEnvironmentalMetrics,
  getImprovedDriverKeys,
  resolveLowerRiskWindow,
} from "../forecast-window";
import { combineHourlySamples } from "@/lib/providers/open-meteo/normalise";
import { isEnvironmentApiResponse } from "@/lib/environment-api";
import type {
  EnvironmentalSnapshot,
  ForecastEnvironmentalSample,
  CurrentEnvironmentalSample,
} from "../types";
import type { OutdoorCheckInput } from "@/lib/check-options";

describe("Task 7 Forecast Window Domain & Alignment Engine", () => {
  const referenceTime = "2026-08-04T12:00:00.000Z";

  const defaultInput: OutdoorCheckInput = {
    location: "Perth",
    sensitivities: {
      respiratory: "moderate",
      hayFever: "not-affected",
      heat: "not-affected",
    },
    activity: "walking",
    durationMinutes: 45,
  };

  const sampleCurrent: CurrentEnvironmentalSample = {
    observedAt: referenceTime,
    airTemperatureC: 35.0,
    apparentTemperatureC: 39.0, // very-high thermal tier
    relativeHumidityPercent: 40,
    windSpeedKph: 15,
    uvIndex: 7.0,
    pm25UgM3: 40, // high PM2.5 tier
    pm10UgM3: 80,
    dustUgM3: 20,
    pm25UsAqi: 112,
    pm10UsAqi: 63,
  };

  const sampleSnapshot: EnvironmentalSnapshot = {
    requestedLocation: "Perth",
    resolvedLocation: "Perth, Australia",
    current: sampleCurrent,
    hourly: [],
    sources: [
      {
        kind: "weather",
        provider: "Open-Meteo Weather",
        status: "available",
        observedAt: referenceTime,
      },
      {
        kind: "air-quality",
        provider: "Open-Meteo Air Quality",
        status: "available",
        observedAt: referenceTime,
      },
    ],
  };

  // Generate 36 hourly forecast samples starting from referenceTime + 1 hour
  function generateForecastPoints(
    modifier?: (index: number, pt: ForecastEnvironmentalSample) => ForecastEnvironmentalSample
  ): ForecastEnvironmentalSample[] {
    const points: ForecastEnvironmentalSample[] = [];
    const baseMs = Date.parse(referenceTime);

    for (let i = 1; i <= 36; i++) {
      const validAt = new Date(baseMs + i * 60 * 60 * 1000).toISOString();
      let pt: ForecastEnvironmentalSample = {
        validAt,
        airTemperatureC: 35.0,
        apparentTemperatureC: 39.0,
        relativeHumidityPercent: 40,
        windSpeedKph: 15,
        uvIndex: 7.0,
        pm25UgM3: 40,
        pm10UgM3: 80,
        dustUgM3: 20,
        pm25UsAqi: 112,
        pm10UsAqi: 63,
      };

      if (modifier) {
        pt = modifier(i, pt);
      }

      points.push(pt);
    }

    return points;
  }

  it("1. Forecast point 24 hours ahead passes freshness when evaluated against its own timestamp (Amendment 5)", () => {
    const point24hAhead: ForecastEnvironmentalSample = {
      validAt: "2026-08-05T12:00:00.000Z",
      airTemperatureC: 22.0,
      apparentTemperatureC: 22.0,
      relativeHumidityPercent: 45,
      windSpeedKph: 10,
      uvIndex: 2.0,
      pm25UgM3: 5,
      pm10UgM3: 10,
      dustUgM3: 5,
      pm25UsAqi: 20,
      pm10UsAqi: 10,
    };

    const evalPoint = evaluateHourlyForecastPoint({
      point: point24hAhead,
      snapshot: sampleSnapshot,
      input: defaultInput,
    });

    expect(evalPoint.result.level).not.toBe("unable");
    expect(evalPoint.result.level).toBe("lower");
  });

  it("2. Weather-only partial point with PM AQI is supported", () => {
    const weatherOnlyPoint: ForecastEnvironmentalSample = {
      validAt: "2026-08-04T13:00:00.000Z",
      airTemperatureC: 25.0,
      apparentTemperatureC: 25.0,
      relativeHumidityPercent: 50,
      windSpeedKph: 10,
      pm25UsAqi: 20,
    };

    const evalPoint = evaluateHourlyForecastPoint({
      point: weatherOnlyPoint,
      snapshot: sampleSnapshot,
      input: defaultInput,
    });

    expect(evalPoint.result.level).toBe("lower");
    expect(evalPoint.result.confidence).toBe("moderate");
  });

  it("3. Air-quality-only partial point with core weather is supported", () => {
    const aqOnlyPoint: ForecastEnvironmentalSample = {
      validAt: "2026-08-04T13:00:00.000Z",
      apparentTemperatureC: 22.0,
      relativeHumidityPercent: 50,
      pm25UsAqi: 20,
      pm10UgM3: 20,
      dustUgM3: 5,
    };

    const evalPoint = evaluateHourlyForecastPoint({
      point: aqOnlyPoint,
      snapshot: sampleSnapshot,
      input: defaultInput,
    });

    expect(evalPoint.result.level).toBe("lower");
    expect(evalPoint.result.confidence).toBe("moderate");
  });

  it("4. Both sources missing results in unable bucket", () => {
    const emptyPoint: ForecastEnvironmentalSample = {
      validAt: "2026-08-04T13:00:00.000Z",
    };

    const evalPoint = evaluateHourlyForecastPoint({
      point: emptyPoint,
      snapshot: sampleSnapshot,
      input: defaultInput,
    });

    expect(evalPoint.result.level).toBe("unable");
  });

  it("5. Full outer join does not discard partial timestamps (Amendment 7)", () => {
    const weather = [
      { validAt: "2026-08-04T13:00:00.000Z", airTemperatureC: 25.0 },
      { validAt: "2026-08-04T14:00:00.000Z", airTemperatureC: 26.0 },
    ];
    const air = [
      { validAt: "2026-08-04T14:00:00.000Z", pm25UgM3: 10.0 },
      { validAt: "2026-08-04T15:00:00.000Z", pm25UgM3: 12.0 },
    ];

    const combined = combineHourlySamples(weather, air);
    expect(combined.length).toBe(3);
    expect(combined[0].validAt).toBe("2026-08-04T13:00:00.000Z");
    expect(combined[0].airTemperatureC).toBe(25.0);
    expect(combined[0].pm25UgM3).toBeUndefined();

    expect(combined[1].validAt).toBe("2026-08-04T14:00:00.000Z");
    expect(combined[1].airTemperatureC).toBe(26.0);
    expect(combined[1].pm25UgM3).toBe(10.0);

    expect(combined[2].validAt).toBe("2026-08-04T15:00:00.000Z");
    expect(combined[2].pm25UgM3).toBe(12.0);
    expect(combined[2].airTemperatureC).toBeUndefined();
  });

  it("6. Null or missing metric comparison returns unavailable (Amendment 10)", () => {
    const cur: CurrentEnvironmentalSample = {
      observedAt: referenceTime,
      airTemperatureC: 30,
    };
    const fcast: ForecastEnvironmentalSample = {
      validAt: "2026-08-04T13:00:00.000Z",
      airTemperatureC: 25,
    };

    const comps = compareEnvironmentalMetrics(cur, fcast);
    const tempComp = comps.find((c) => c.key === "airTemperatureC");
    const pmComp = comps.find((c) => c.key === "pm25UgM3");

    expect(tempComp?.change).toBe("decreased");
    expect(pmComp?.change).toBe("unavailable");
  });

  it("7. Lower wind speed is returned as neutral 'decreased' without health assumptions (Amendment 10 & 11)", () => {
    const cur: CurrentEnvironmentalSample = {
      observedAt: referenceTime,
      windSpeedKph: 25,
    };
    const fcast: ForecastEnvironmentalSample = {
      validAt: "2026-08-04T13:00:00.000Z",
      windSpeedKph: 10,
    };

    const comps = compareEnvironmentalMetrics(cur, fcast);
    const windComp = comps.find((c) => c.key === "windSpeedKph");

    expect(windComp?.change).toBe("decreased");
  });

  it("7b. getImprovedDriverKeys extracts driver keys present in current result but absent in lower-risk representative result", () => {
    const currentRes = evaluateHourlyForecastPoint({
      point: { validAt: referenceTime, apparentTemperatureC: 39.0, pm25UgM3: 40, pm25UsAqi: 155, pm10UsAqi: 90 },
      snapshot: sampleSnapshot,
      input: defaultInput,
    }).result;

    const repRes = evaluateHourlyForecastPoint({
      point: { validAt: "2026-08-04T13:00:00.000Z", apparentTemperatureC: 22.0, pm25UgM3: 5, pm10UgM3: 10, pm25UsAqi: 20, pm10UsAqi: 10, uvIndex: 2.0 },
      snapshot: sampleSnapshot,
      input: defaultInput,
    }).result;

    const improvedKeys = getImprovedDriverKeys(currentRes, repRes);
    expect(improvedKeys).toContain("thermal-severe");
    expect(improvedKeys).toContain("particulate-high");
  });

  it("8. Exact 60, 120 and 180 minute end-boundary handling [startAt, endAt) (Amendment 12)", () => {
    const pts = generateForecastPoints((i, pt) => {
      // Improve hours 5, 6, 7, 8 (17:00, 18:00, 19:00, 20:00)
      if (i >= 5 && i <= 8) {
        return {
          ...pt,
          apparentTemperatureC: 22.0,
          pm25UgM3: 5,
          pm10UgM3: 10,
          pm25UsAqi: 20,
          pm10UsAqi: 10,
          uvIndex: 2.0,
        };
      }
      return pt;
    });

    // 60 minutes duration -> 1 bucket
    const res60 = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 60 },
      forecastPoints: pts,
      referenceTime,
    });
    expect(res60.status).toBe("found");
    if (res60.status === "found") {
      expect(res60.includedPointCount).toBe(1);
    }

    // 120 minutes duration -> 2 buckets
    const res120 = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 120 },
      forecastPoints: pts,
      referenceTime,
    });
    expect(res120.status).toBe("found");
    if (res120.status === "found") {
      expect(res120.includedPointCount).toBe(2);
    }

    // 180 minutes duration -> 3 buckets
    const res180 = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 180 },
      forecastPoints: pts,
      referenceTime,
    });
    expect(res180.status).toBe("found");
    if (res180.status === "found") {
      expect(res180.includedPointCount).toBe(3);
    }
  });

  it("9. Representative bucket selection uses deterministic tie-breaking (Amendment 14)", () => {
    // Window has 2 buckets: hour 5 is lower, hour 6 is elevated (higher total score)
    const pts = generateForecastPoints((i, pt) => {
      if (i === 5) {
        return {
          ...pt,
          apparentTemperatureC: 20.0,
          pm25UgM3: 5,
          pm10UgM3: 10,
          pm25UsAqi: 20,
          pm10UsAqi: 10,
          uvIndex: 2.0,
        };
      }
      if (i === 6) {
        return {
          ...pt,
          apparentTemperatureC: 28.0, // elevated thermal tier
          pm25UgM3: 5,
          pm10UgM3: 10,
          pm25UsAqi: 20,
          pm10UsAqi: 10,
          uvIndex: 2.0,
        };
      }
      return pt;
    });

    const res = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 120 },
      forecastPoints: pts,
      referenceTime,
    });

    expect(res.status).toBe("found");
    if (res.status === "found") {
      // Hour 6 (18:00) has worse risk level (elevated) so it must be selected as representative
      expect(res.representativeConditions.apparentTemperatureC).toBe(28.0);
    }
  });

  it("10. Forecast field is always present on successful API responses (Amendment 2)", () => {
    const successResponse = {
      ok: true,
      requestedLocation: "Perth",
      resolvedLocation: {
        name: "Perth",
        country: "Australia",
        countryCode: "AU",
        timezone: "Australia/Perth",
        displayName: "Perth, Australia",
      },
      snapshot: sampleSnapshot,
      forecast: {
        status: "available",
        timezone: "Australia/Perth",
        points: generateForecastPoints(),
        horizonHours: 36,
      },
      retrievedAt: referenceTime,
    };

    expect(isEnvironmentApiResponse(successResponse)).toBe(true);
  });

  it("11. Runtime validator accepts valid forecast and rejects malformed forecast (Amendment 3)", () => {
    const validResponse = {
      ok: true,
      requestedLocation: "Perth",
      resolvedLocation: {
        name: "Perth",
        country: "Australia",
        countryCode: "AU",
        timezone: "Australia/Perth",
        displayName: "Perth, Australia",
      },
      snapshot: sampleSnapshot,
      forecast: {
        status: "available",
        timezone: "Australia/Perth",
        points: [
          { validAt: "2026-08-04T13:00:00.000Z", airTemperatureC: 25 },
          { validAt: "2026-08-04T14:00:00.000Z", airTemperatureC: 24 },
        ],
        horizonHours: 36,
      },
      retrievedAt: referenceTime,
    };

    expect(isEnvironmentApiResponse(validResponse)).toBe(true);

    const malformedResponse = {
      ...validResponse,
      forecast: {
        status: "available",
        timezone: "Australia/Perth",
        points: [
          // Unsorted points (14:00 before 13:00)
          { validAt: "2026-08-04T14:00:00.000Z", airTemperatureC: 24 },
          { validAt: "2026-08-04T13:00:00.000Z", airTemperatureC: 25 },
        ],
        horizonHours: 36,
      },
    };

    expect(isEnvironmentApiResponse(malformedResponse)).toBe(false);
  });

  it("12. Current snapshot remains available when forecast status is 'unavailable' (Amendment 3 & 8)", () => {
    const unavailableForecastResponse = {
      ok: true,
      requestedLocation: "Perth",
      resolvedLocation: {
        name: "Perth",
        country: "Australia",
        countryCode: "AU",
        timezone: "Australia/Perth",
        displayName: "Perth, Australia",
      },
      snapshot: sampleSnapshot,
      forecast: {
        status: "unavailable",
        reason: "insufficient-hourly-data",
      },
      retrievedAt: referenceTime,
    };

    expect(isEnvironmentApiResponse(unavailableForecastResponse)).toBe(true);
  });

  it("13. Candidate starts strictly after reference time and within 24 hours", () => {
    const pts = generateForecastPoints((i, pt) => {
      // Make hour 24 lower risk, but hour 25 also lower risk
      if (i >= 24) {
        return {
          ...pt,
          apparentTemperatureC: 20.0,
          pm25UgM3: 5,
          pm25UsAqi: 20,
          pm10UsAqi: 10,
        };
      }
      return pt;
    });

    const res = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 60 },
      forecastPoints: pts,
      referenceTime,
    });

    expect(res.status).toBe("found");
    if (res.status === "found") {
      const startMs = Date.parse(res.startAt);
      const refMs = Date.parse(referenceTime);
      expect(startMs).toBeGreaterThan(refMs);
      expect(startMs - refMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    }
  });

  it("14. Meaningful improvement rule logic", () => {
    // Current risk is very-high
    // Case A: Future is elevated -> found
    const ptsElevated = generateForecastPoints((i, pt) => {
      if (i === 4) {
        return {
          ...pt,
          apparentTemperatureC: 28.0, // elevated
          pm25UgM3: 5,
          pm25UsAqi: 20,
          pm10UsAqi: 10,
        };
      }
      return pt;
    });

    const resA = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 45 },
      forecastPoints: ptsElevated,
      referenceTime,
    });
    expect(resA.status).toBe("found");

    // Case B: Future is also very-high -> not-found (no-meaningful-improvement)
    const ptsVeryHigh = generateForecastPoints();
    const resB = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 45 },
      forecastPoints: ptsVeryHigh,
      referenceTime,
    });
    expect(resB.status).toBe("not-found");
    if (resB.status === "not-found") {
      expect(resB.reason).toBe("no-meaningful-improvement");
    }
  });

  it("15. Current level 'lower' returns 'current-already-lower'", () => {
    const lowCurrentSnapshot: EnvironmentalSnapshot = {
      ...sampleSnapshot,
      current: {
        observedAt: referenceTime,
        airTemperatureC: 22.0,
        apparentTemperatureC: 22.0, // lower
        relativeHumidityPercent: 45,
        windSpeedKph: 10,
        uvIndex: 2.0,
        pm25UgM3: 5,
        pm10UgM3: 10,
        dustUgM3: 5,
        pm25UsAqi: 20,
        pm10UsAqi: 10,
      },
    };

    const res = resolveLowerRiskWindow({
      snapshot: lowCurrentSnapshot,
      input: defaultInput,
      forecastPoints: generateForecastPoints(),
      referenceTime,
    });

    expect(res.status).toBe("not-found");
    if (res.status === "not-found") {
      expect(res.reason).toBe("current-already-lower");
    }
  });

  it("16. Deterministic ranking policy: lowest risk category wins", () => {
    const pts = generateForecastPoints((i, pt) => {
      if (i === 3) {
        // Hour 3 is elevated
        return { ...pt, apparentTemperatureC: 28.0, pm25UgM3: 5, pm10UgM3: 10, pm25UsAqi: 20, pm10UsAqi: 10, uvIndex: 2.0 };
      }
      if (i === 6) {
        // Hour 6 is lower
        return { ...pt, apparentTemperatureC: 20.0, pm25UgM3: 5, pm10UgM3: 10, pm25UsAqi: 20, pm10UsAqi: 10, uvIndex: 2.0 };
      }
      return pt;
    });

    const res = resolveLowerRiskWindow({
      snapshot: sampleSnapshot,
      input: { ...defaultInput, durationMinutes: 45 },
      forecastPoints: pts,
      referenceTime,
    });

    expect(res.status).toBe("found");
    if (res.status === "found") {
      expect(res.windowLevel).toBe("lower");
      expect(res.startAt).toContain("T18:00:00");
    }
  });

  describe("Task 10G Regression — Time Filtering & Date Labeling", () => {
    // Current local time: 2:24 pm AWST (UTC+8) -> 2026-08-06T06:24:00.000Z
    const ref224pm = "2026-08-06T06:24:00.000Z";

    it("excludes past forecast entry (today 7:00 am) and includes future entry (today 7:00 pm)", () => {
      // today 7:00 am AWST = 2026-08-05T23:00:00.000Z (before 2:24 pm)
      // today 7:00 pm AWST = 2026-08-06T11:00:00.000Z (after 2:24 pm)
      const pastEntry: ForecastEnvironmentalSample = {
        validAt: "2026-08-05T23:00:00.000Z", // 7:00 am local
        airTemperatureC: 18,
        apparentTemperatureC: 18,
        relativeHumidityPercent: 60,
        windSpeedKph: 10,
        uvIndex: 1,
        pm25UgM3: 5,
        pm10UgM3: 10,
        pm25UsAqi: 20,
        pm10UsAqi: 10,
      };

      const futureEntry: ForecastEnvironmentalSample = {
        validAt: "2026-08-06T11:00:00.000Z", // 7:00 pm local
        airTemperatureC: 20,
        apparentTemperatureC: 20,
        relativeHumidityPercent: 50,
        windSpeedKph: 10,
        uvIndex: 1,
        pm25UgM3: 5,
        pm10UgM3: 10,
        pm25UsAqi: 20,
        pm10UsAqi: 10,
      };

      const highCurrentSnapshot: EnvironmentalSnapshot = {
        requestedLocation: "Perth",
        resolvedLocation: "Perth, WA",
        current: {
          observedAt: ref224pm,
          airTemperatureC: 38,
          apparentTemperatureC: 38, // high heat
          relativeHumidityPercent: 30,
          windSpeedKph: 15,
          uvIndex: 10,
          pm25UgM3: 5,
          pm10UgM3: 10,
          pm25UsAqi: 20,
          pm10UsAqi: 10,
        },
        hourly: [],
        sources: [
          { kind: "weather", provider: "Open-Meteo", status: "available", observedAt: ref224pm },
          { kind: "air-quality", provider: "Open-Meteo", status: "available", observedAt: ref224pm },
        ],
      };

      const res = resolveLowerRiskWindow({
        snapshot: highCurrentSnapshot,
        input: defaultInput,
        forecastPoints: [pastEntry, futureEntry],
        referenceTime: ref224pm,
      });

      expect(res.status).toBe("found");
      if (res.status === "found") {
        expect(res.startAt).toBe("2026-08-06T11:00:00.000Z"); // today 7:00 pm AWST selected
      }
    });
  });
});
