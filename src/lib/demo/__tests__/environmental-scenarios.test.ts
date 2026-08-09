import { describe, it, expect } from "vitest";
import { getDemoEnvironmentalForecast } from "../environmental-scenarios";
import { evaluatePersonalisedRisk } from "@/lib/risk/engine";
import { resolveLowerRiskWindow } from "@/lib/risk/forecast-window";
import type { OutdoorCheckInput } from "@/lib/check-options";

describe("environmental-scenarios fixture module", () => {
  const DEFAULT_INPUT: OutdoorCheckInput = {
    location: "Dubai, United Arab Emirates",
    sensitivities: {
      respiratory: "not-affected",
      heat: "not-affected",
      hayFever: "not-affected",
    },
    activity: "walking",
    durationMinutes: 30,
  };

  it("generates canonical EnvironmentApiSuccess shape with 168 hourly points", () => {
    const result = getDemoEnvironmentalForecast({
      scenario: "improving-day",
      location: "Dubai, United Arab Emirates",
      now: "2026-08-08T06:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    expect(result.sourceMode).toBe("demo");
    expect(result.demoScenarioId).toBe("improving-day");
    expect(result.requestedLocation).toBe("Dubai, United Arab Emirates");
    expect(result.resolvedLocation.timezone).toBe("Asia/Dubai");
    expect(result.forecast.status).toBe("available");

    if (result.forecast.status === "available") {
      expect(result.forecast.points.length).toBe(168);
      expect(result.snapshot.hourly.length).toBe(168);

      // Verify sequential hourly timestamps
      const t0 = Date.parse(result.forecast.points[0].validAt);
      const t1 = Date.parse(result.forecast.points[1].validAt);
      expect(t1 - t0).toBe(3600_000);
    }
  });

  it("produces deterministic output without random numbers", () => {
    const run1 = getDemoEnvironmentalForecast({
      scenario: "improving-day",
      location: "Perth, Australia",
      now: "2026-08-08T00:00:00.000Z",
    });
    const run2 = getDemoEnvironmentalForecast({
      scenario: "improving-day",
      location: "Perth, Australia",
      now: "2026-08-08T00:00:00.000Z",
    });

    expect(run1).toEqual(run2);
  });

  it("improving-day scenario feeds through production Risk Model without hardcoded risk outputs", () => {
    const apiData = getDemoEnvironmentalForecast({
      scenario: "improving-day",
      location: "Dubai, United Arab Emirates",
      now: "2026-08-08T06:00:00.000Z",
    });

    const evaluated = evaluatePersonalisedRisk({
      snapshot: apiData.snapshot,
      input: DEFAULT_INPUT,
      referenceTime: apiData.retrievedAt,
    });

    expect(evaluated.level).toBeDefined();
    expect(evaluated.action).toBeDefined();
    expect(evaluated.drivers.length).toBeGreaterThan(0);
  });

  it("dust-spike scenario shows sensitivity impact when processed by real engine", () => {
    const apiData = getDemoEnvironmentalForecast({
      scenario: "dust-spike",
      location: "Dubai, United Arab Emirates",
      now: "2026-08-08T14:00:00.000Z", // During particulate spike hour
    });

    const respSensInput: OutdoorCheckInput = {
      ...DEFAULT_INPUT,
      sensitivities: {
        ...DEFAULT_INPUT.sensitivities,
        respiratory: "strong",
      },
    };

    const respSensResult = evaluatePersonalisedRisk({
      snapshot: apiData.snapshot,
      input: respSensInput,
      referenceTime: apiData.retrievedAt,
    });

    // Sensitivity should increase risk evaluation
    expect(respSensResult.level).not.toBe("lower");
    expect(respSensResult.drivers.some((d) => d.category === "sensitivity")).toBe(true);
  });

  it("persistent-heat scenario naturally evaluates to elevated concern and flat outlook", () => {
    const apiData = getDemoEnvironmentalForecast({
      scenario: "persistent-heat",
      location: "Dubai, United Arab Emirates",
      now: "2026-08-08T12:00:00.000Z",
    });

    const evaluated = evaluatePersonalisedRisk({
      snapshot: apiData.snapshot,
      input: DEFAULT_INPUT,
      referenceTime: apiData.retrievedAt,
    });

    expect(evaluated.level).toBe("very-high");

    const windowRes = resolveLowerRiskWindow({
      snapshot: apiData.snapshot,
      forecastPoints: apiData.forecast.status === "available" ? apiData.forecast.points : [],
      input: DEFAULT_INPUT,
      referenceTime: apiData.retrievedAt,
    });

    expect(windowRes.status).toBe("not-found");
  });
});
