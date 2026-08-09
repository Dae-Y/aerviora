import { describe, it, expect } from "vitest";
import {
  RISK_LEVEL_DISPLAY_LABELS,
} from "../copy";
import { evaluatePersonalisedRisk } from "../engine";
import type { OutdoorCheckInput } from "@/lib/check-options";
import type { EnvironmentalSnapshot } from "../types";

describe("Task 10E — Risk Model v2 Copy & Driver Alignment", () => {
  const baseSnapshot: EnvironmentalSnapshot = {
    requestedLocation: "Perth",
    resolvedLocation: "Perth, WA, Australia",
    current: {
      observedAt: "2026-08-01T12:00:00Z",
      airTemperatureC: 20,
      apparentTemperatureC: 20,
      relativeHumidityPercent: 50,
      windSpeedKph: 10,
      uvIndex: 2,
      pm25UgM3: 15,
      pm10UgM3: 30,
      dustUgM3: 5,
      pm25UsAqi: 30,
      pm10UsAqi: 30,
    },
    hourly: [],
    sources: [
      { kind: "weather", provider: "Open-Meteo", status: "available", observedAt: "2026-08-01T12:00:00Z" },
      { kind: "air-quality", provider: "Open-Meteo", status: "available", observedAt: "2026-08-01T12:00:00Z" },
    ],
  };

  const defaultInput: OutdoorCheckInput = {
    location: "Perth",
    sensitivities: { respiratory: "not-affected", hayFever: "not-affected", heat: "not-affected" },
    activity: "walking",
    durationMinutes: 30,
  };

  it("1. Exact v2 result labels mapping", () => {
    expect(RISK_LEVEL_DISPLAY_LABELS.lower).toBe("Lower environmental concern");
    expect(RISK_LEVEL_DISPLAY_LABELS.elevated).toBe("Elevated environmental concern");
    expect(RISK_LEVEL_DISPLAY_LABELS.high).toBe("High environmental concern");
    expect(RISK_LEVEL_DISPLAY_LABELS["very-high"]).toBe("Very high environmental risk");
    expect(RISK_LEVEL_DISPLAY_LABELS.unable).toBe("Guidance unavailable");
  });

  it("2. Scenario 1 — Lower conditions result in Lower environmental concern & proceed-awareness", () => {
    const res = evaluatePersonalisedRisk({
      snapshot: baseSnapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("lower");
    expect(res.action).toBe("proceed-awareness");
    expect(res.recommendation.title).toBe("Looks good overall");
    expect(res.recommendation.explanation).toBe("Conditions are generally favourable for your planned activity.");
    expect(res.recommendation.explanation).not.toContain("postponing");
    expect(res.recommendation.explanation).not.toContain("reducing");
  });

  it("3. Scenario 2 — Particulate elevated (AQI 110, walking, 30m) yields Elevated concern & particulate copy", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 110 },
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("elevated");
    expect(res.action).toBe("proceed-awareness");
    expect(res.recommendation.title).toBe("Generally favourable, with one factor to note");
    expect(res.recommendation.explanation).toBe("Conditions are generally favourable, although air quality is not ideal.");
    expect(res.drivers.some((d) => d.category === "environment" && d.label === "Air quality is elevated")).toBe(true);
  });

  it("4. Scenario 3 — Relevant moderate respiratory sensitivity with elevated particulate yields consider-small-adjustments", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 110 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "not-affected" },
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("elevated");
    expect(res.action).toBe("consider-small-adjustments");
    expect(res.recommendation.title).toBe("A few small adjustments may help");
    expect(res.recommendation.explanation).toBe(
      "Consider small adjustments to timing or duration based on the conditions that affect you."
    );
  });

  it("5. Scenario 4 — Multiple elevated domains yield multi-domain elevated copy", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: {
        ...baseSnapshot.current!,
        pm25UsAqi: 110,
        apparentTemperatureC: 29,
        uvIndex: 7,
      },
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("elevated");
    expect(res.action).toBe("proceed-awareness");
    expect(res.recommendation.title).toBe("Generally favourable, with one factor to note");
    expect(res.recommendation.explanation).toBe(
      "Conditions are generally favourable, although several environmental conditions are worth noting."
    );
  });

  it("6. Scenario 5 — UV only elevated yields Sun protection recommended", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, uvIndex: 9 },
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("elevated");
    expect(res.action).toBe("proceed-awareness");
    expect(res.recommendation.title).toBe("Sun protection recommended");
    expect(res.recommendation.explanation).toBe(
      "Current UV conditions call for sunscreen, sunglasses and shade where practical."
    );
    expect(res.drivers.some((d) => d.category === "protection" && d.label === "High UV protection needed")).toBe(true);
    expect(res.drivers.filter((d) => d.key.startsWith("uv")).length).toBe(1); // Single UV protection driver
  });

  it("7. Scenario 6 — High particulate yields High environmental concern & delay-shorten-reduce", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 170 },
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("high");
    expect(res.action).toBe("delay-shorten-reduce");
    expect(res.recommendation.title).toBe("Consider reducing duration or intensity");
    expect(res.recommendation.explanation).toBe(
      "Consider reducing exposure duration or intensity, or choose a lower-exposure time."
    );
    expect(res.recommendation.explanation).not.toContain("postponing");
  });

  it("8. Scenario 7 — Severe thermal yields Very high environmental risk & postpone", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, apparentTemperatureC: 39 },
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("very-high");
    expect(res.action).toBe("postpone");
    expect(res.recommendation.title).toBe("Consider postponing the activity");
    expect(res.recommendation.explanation).toBe(
      "Consider postponing the activity or choosing a substantially lower-exposure time."
    );
  });

  it("9. Scenario 10 — Hay-fever selection does not create scoring driver or risk uplift", () => {
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "not-affected", hayFever: "strong", heat: "not-affected" },
    };

    const res = evaluatePersonalisedRisk({
      snapshot: baseSnapshot,
      input,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(res.level).toBe("lower");
    expect(res.drivers.some((d) => d.key === "sensitivity-hay-fever")).toBe(false);
    expect(
      res.limitations.some((lim) =>
        lim.includes("Live pollen data is not yet included")
      )
    ).toBe(true);
  });

  it("10. Scenario 11 — Humidity context driver appears when humidity >= 70% and thermal is elevated", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, apparentTemperatureC: 29, relativeHumidityPercent: 75 },
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    const humDriver = res.drivers.find((d) => d.key === "humidity-context");
    expect(humDriver).toBeDefined();
    expect(humDriver?.category).toBe("context");
    expect(humDriver?.direction).toBe("context");
    expect(humDriver?.explanation).toBe("High humidity may make warm conditions feel less comfortable.");
  });

  it("11. Deterministic driver ordering", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: {
        ...baseSnapshot.current!,
        pm25UsAqi: 110,
        apparentTemperatureC: 29,
        relativeHumidityPercent: 75,
        uvIndex: 8,
      },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "moderate" },
      activity: "exercise",
      durationMinutes: 60,
    };

    const res = evaluatePersonalisedRisk({
      snapshot,
      input,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    const categories = res.drivers.map((d) => d.category);
    // Categories should appear in order: environment -> protection -> sensitivity -> exposure -> context
    const firstEnvIndex = categories.indexOf("environment");
    const firstProtIndex = categories.indexOf("protection");
    const firstSensIndex = categories.indexOf("sensitivity");
    const firstExpIndex = categories.indexOf("exposure");
    const firstCtxIndex = categories.indexOf("context");

    expect(firstEnvIndex).toBeLessThan(firstProtIndex);
    expect(firstProtIndex).toBeLessThan(firstSensIndex);
    expect(firstSensIndex).toBeLessThan(firstExpIndex);
    expect(firstExpIndex).toBeLessThan(firstCtxIndex);
  });

  it("12. Prohibited wording checks", () => {
    const res = evaluatePersonalisedRisk({
      snapshot: baseSnapshot,
      input: defaultInput,
      referenceTime: "2026-08-01T12:00:00Z",
    });

    const fullText = (
      res.recommendation.title +
      " " +
      res.recommendation.explanation +
      " " +
      res.drivers.map((d) => d.explanation).join(" ")
    ).toLowerCase();

    expect(fullText).not.toContain(" safe");
    expect(fullText).not.toContain("guaranteed");
    expect(fullText).not.toContain("diagnosed");
    expect(fullText).not.toContain("mandatory");
  });

  it("13. Sensitivity driver grammar verification for slight, moderate, and strong intensities", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: {
        ...baseSnapshot.current!,
        pm25UsAqi: 110,
        apparentTemperatureC: 30,
      },
    };

    // Slight
    const slightRes = evaluatePersonalisedRisk({
      snapshot,
      input: {
        ...defaultInput,
        sensitivities: { respiratory: "slight", hayFever: "not-affected", heat: "slight" },
      },
      referenceTime: "2026-08-01T12:00:00Z",
    });
    const slightResp = slightRes.drivers.find((d) => d.key === "sensitivity-respiratory");
    const slightHeat = slightRes.drivers.find((d) => d.key === "sensitivity-heat");
    expect(slightResp?.explanation).toBe("You reported being slightly affected by air pollution, dust or smoke.");
    expect(slightHeat?.explanation).toBe("You reported being slightly affected by hot weather.");

    // Moderate
    const modRes = evaluatePersonalisedRisk({
      snapshot,
      input: {
        ...defaultInput,
        sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "moderate" },
      },
      referenceTime: "2026-08-01T12:00:00Z",
    });
    const modResp = modRes.drivers.find((d) => d.key === "sensitivity-respiratory");
    const modHeat = modRes.drivers.find((d) => d.key === "sensitivity-heat");
    expect(modResp?.explanation).toBe("You reported being moderately affected by air pollution, dust or smoke.");
    expect(modHeat?.explanation).toBe("You reported being moderately affected by hot weather.");

    // Strong
    const strongRes = evaluatePersonalisedRisk({
      snapshot,
      input: {
        ...defaultInput,
        sensitivities: { respiratory: "strong", hayFever: "not-affected", heat: "strong" },
      },
      referenceTime: "2026-08-01T12:00:00Z",
    });
    const strongResp = strongRes.drivers.find((d) => d.key === "sensitivity-respiratory");
    const strongHeat = strongRes.drivers.find((d) => d.key === "sensitivity-heat");
    expect(strongResp?.explanation).toBe("You reported being strongly affected by air pollution, dust or smoke.");
    expect(strongHeat?.explanation).toBe("You reported being strongly affected by hot weather.");
  });
});
