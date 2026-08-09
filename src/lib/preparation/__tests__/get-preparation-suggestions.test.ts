import { describe, it, expect } from "vitest";
import { getPreparationSuggestions } from "../get-preparation-suggestions";
import type { EnvironmentalSnapshot, DataReadinessResult } from "@/lib/risk/types";
import type { OutdoorCheckInput } from "@/lib/check-options";

describe("Task 10F — Preparation Suggestion Calibration (Scenarios A through R)", () => {
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
      pm25UgM3: 10,
      pm10UgM3: 20,
      dustUgM3: 5,
      pm25UsAqi: 30,
      pm10UsAqi: 20,
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
    durationMinutes: 15, // low exposure
  };

  it("Scenario A — Slight respiratory sensitivity, ordinary elevated particulate (AQI 70, low exposure) -> NO mask", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 70 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "slight", hayFever: "not-affected", heat: "not-affected" },
      durationMinutes: 15,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(false);
  });

  it("Scenario B — Moderate respiratory sensitivity, ordinary elevated particulate (AQI 70, walking 30m) -> NO mask", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 70 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "not-affected" },
      durationMinutes: 30,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(false);
  });

  it("Scenario C — Strong respiratory sensitivity, ordinary elevated particulate, high exposure (AQI 80, exercise 60m) -> mask suggested", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 80 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "strong", hayFever: "not-affected", heat: "not-affected" },
      activity: "exercise",
      durationMinutes: 60,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(true);
  });

  it("Scenario D — Upper-elevated particulate, moderate sensitivity (AQI 110, walking 30m) -> mask suggested", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 110 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "not-affected" },
      durationMinutes: 30,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(true);
  });

  it("Scenario E — Upper-elevated particulate, slight sensitivity, low exposure (AQI 110, walking 15m) -> NO mask", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 110 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "slight", hayFever: "not-affected", heat: "not-affected" },
      durationMinutes: 15,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(false);
  });

  it("Scenario F — Upper-elevated particulate, no sensitivity, high exposure (AQI 110, exercise 60m) -> mask suggested", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 110 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "not-affected", hayFever: "not-affected", heat: "not-affected" },
      activity: "exercise",
      durationMinutes: 60,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(true);
  });

  it("Scenario G — High particulate, no sensitivity (AQI 160) -> mask suggested", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 160 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "not-affected", hayFever: "not-affected", heat: "not-affected" },
      durationMinutes: 15,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(true);
  });

  it("Scenario H — Lower particulate, strong sensitivity (AQI 30, strong respiratory, high exposure) -> NO mask", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 30 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "strong", hayFever: "not-affected", heat: "not-affected" },
      activity: "exercise",
      durationMinutes: 60,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(false);
  });

  it("Scenario I — UV elevated (UV 6) -> sunscreen, sunglasses, sun-shade (NO mask)", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, uvIndex: 6 },
    };

    const res = getPreparationSuggestions({ snapshot, input: defaultInput });
    const ids = res.map((s) => s.id);
    expect(ids).toContain("sunscreen");
    expect(ids).toContain("sunglasses");
    expect(ids).toContain("sun-shade");
    expect(ids).not.toContain("protective-mask");
  });

  it("Scenario J — UV high (UV 9) -> sunscreen, sunglasses, sun-shade", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, uvIndex: 9 },
    };

    const res = getPreparationSuggestions({ snapshot, input: defaultInput });
    const ids = res.map((s) => s.id);
    expect(ids).toContain("sunscreen");
    expect(ids).toContain("sunglasses");
    expect(ids).toContain("sun-shade");
  });

  it("Scenario K — Thermal elevated (29°C, 50% humidity) -> water bottle", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, apparentTemperatureC: 29, relativeHumidityPercent: 50 },
    };

    const res = getPreparationSuggestions({ snapshot, input: defaultInput });
    const ids = res.map((s) => s.id);
    expect(ids).toContain("water");
    expect(ids).not.toContain("breathable-clothing");
  });

  it("Scenario L — Thermal high (34°C, 50% humidity) -> water, sun-shade, breathable-clothing", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, apparentTemperatureC: 34, relativeHumidityPercent: 50 },
    };

    const res = getPreparationSuggestions({ snapshot, input: defaultInput });
    const ids = res.map((s) => s.id);
    expect(ids).toContain("water");
    expect(ids).toContain("sun-shade");
    expect(ids).toContain("breathable-clothing");
  });

  it("Scenario M — Thermal elevated and humid (29°C, 75% humidity) -> water, breathable-clothing", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, apparentTemperatureC: 29, relativeHumidityPercent: 75 },
    };

    const res = getPreparationSuggestions({ snapshot, input: defaultInput });
    const ids = res.map((s) => s.id);
    expect(ids).toContain("water");
    expect(ids).toContain("breathable-clothing");
  });

  it("Scenario N — Exposure demand without active heat (20°C, walking 60m) -> water bottle", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, apparentTemperatureC: 20 },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      durationMinutes: 60,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    const ids = res.map((s) => s.id);
    expect(ids).toContain("water");
    expect(ids).not.toContain("breathable-clothing");
    expect(ids).not.toContain("sun-shade");
  });

  it("Scenario O — Hay-fever only (hayFever: strong, lower environmental conditions) -> NO mask, NO pollen item", () => {
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "not-affected", hayFever: "strong", heat: "not-affected" },
      durationMinutes: 15,
    };

    const res = getPreparationSuggestions({ snapshot: baseSnapshot, input });
    expect(res.some((s) => s.id === "protective-mask")).toBe(false);
    expect(res.length).toBe(0);
  });

  it("Scenario P — More than four eligible items (AQI 160, 35°C, UV 9, exercise 60m) -> max 4 items in priority order", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: {
        ...baseSnapshot.current!,
        pm25UsAqi: 160,
        apparentTemperatureC: 35,
        uvIndex: 9,
        relativeHumidityPercent: 75,
      },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      activity: "exercise",
      durationMinutes: 60,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.length).toBe(4);
    expect(res.map((s) => s.id)).toEqual([
      "protective-mask",
      "sunscreen",
      "water",
      "sun-shade",
    ]);
  });

  it("Scenario Q — Dubai-style result (high particulate, severe heat, low UV) -> protective-mask, water, sun-shade, breathable-clothing", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: {
        ...baseSnapshot.current!,
        pm25UsAqi: 160,
        apparentTemperatureC: 39,
        uvIndex: 2,
        relativeHumidityPercent: 40,
      },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "moderate" },
      activity: "walking",
      durationMinutes: 30,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.length).toBe(4);
    expect(res.map((s) => s.id)).toEqual([
      "protective-mask",
      "water",
      "sun-shade",
      "breathable-clothing",
    ]);
  });

  it("Scenario R — Miri-style result (lower particulate, high heat, high UV) -> sunscreen, water, sun-shade, sunglasses", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: {
        ...baseSnapshot.current!,
        pm25UsAqi: 20,
        apparentTemperatureC: 34,
        uvIndex: 9,
        relativeHumidityPercent: 50,
      },
    };
    const input: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "not-affected", hayFever: "not-affected", heat: "not-affected" },
      activity: "walking",
      durationMinutes: 45,
    };

    const res = getPreparationSuggestions({ snapshot, input });
    expect(res.length).toBe(4);
    expect(res.map((s) => s.id)).toEqual([
      "sunscreen",
      "water",
      "sun-shade",
      "sunglasses",
    ]);
  });

  it("Legacy sensitivity array compatibility (respiratory array input maps to moderate)", () => {
    const snapshot: EnvironmentalSnapshot = {
      ...baseSnapshot,
      current: { ...baseSnapshot.current!, pm25UsAqi: 110 },
    };
    const legacyInput = {
      ...defaultInput,
      sensitivities: ["respiratory"] as unknown as OutdoorCheckInput["sensitivities"],
      durationMinutes: 30,
    };

    const res = getPreparationSuggestions({ snapshot, input: legacyInput });
    expect(res.some((s) => s.id === "protective-mask")).toBe(true);
  });

  it("Returns empty array for insufficient data readiness", () => {
    const readiness: DataReadinessResult = {
      status: "insufficient",
      issues: [],
      relevantSignals: ["pm25UsAqi"],
      availableSignals: [],
      missingSignals: ["pm25UsAqi"],
      invalidSignals: [],
      staleSources: [],
    };

    const res = getPreparationSuggestions({ snapshot: baseSnapshot, input: defaultInput, readiness });
    expect(res).toEqual([]);
  });
});
