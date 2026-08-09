import { describe, it, expect } from "vitest";
import {
  DEFAULT_SENSITIVITY_PROFILE,
  SENSITIVITY_CATEGORIES,
  SENSITIVITY_INTENSITY_OPTIONS,
  getSensitivityIntensityLabel,
} from "@/lib/check-options";
import { evaluatePersonalisedRisk } from "@/lib/risk/engine";
import { getPreparationSuggestions } from "@/lib/preparation/get-preparation-suggestions";
import type { OutdoorCheckInput } from "@/lib/check-options";
import type { SensitivityProfile, EnvironmentalSnapshot } from "@/lib/risk/types";

describe("Task 10D — Sensitivity Profile Metadata, Serialization & Integration", () => {
  const sampleSnapshot: EnvironmentalSnapshot = {
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
      pm25UsAqi: 70,
      pm10UsAqi: 30,
    },
    hourly: [],
    sources: [
      { kind: "weather", provider: "Open-Meteo", status: "available", observedAt: "2026-08-01T12:00:00Z" },
      { kind: "air-quality", provider: "Open-Meteo", status: "available", observedAt: "2026-08-01T12:00:00Z" },
    ],
  };

  it("1. DEFAULT_SENSITIVITY_PROFILE has all 3 categories set to 'not-affected'", () => {
    expect(DEFAULT_SENSITIVITY_PROFILE).toEqual({
      respiratory: "not-affected",
      hayFever: "not-affected",
      heat: "not-affected",
    });
  });

  it("2. SENSITIVITY_CATEGORIES defines 3 categories in canonical order with titles, descriptions, examples and notes", () => {
    expect(SENSITIVITY_CATEGORIES.map((c) => c.key)).toEqual(["respiratory", "hayFever", "heat"]);

    const respCategory = SENSITIVITY_CATEGORIES.find((c) => c.key === "respiratory");
    expect(respCategory?.example).toBe(
      "For example: coughing, wheezing, chest tightness, or irritation from smoke or dust."
    );

    const pollenCategory = SENSITIVITY_CATEGORIES.find((c) => c.key === "hayFever");
    expect(pollenCategory?.example).toBe(
      "For example: hay fever, sneezing, a runny nose, or itchy eyes."
    );
    expect(pollenCategory?.note).toBe(
      "Live pollen data is not yet included. Your selection is recorded for context only in the current prototype."
    );

    const heatCategory = SENSITIVITY_CATEGORIES.find((c) => c.key === "heat");
    expect(heatCategory?.title).toBe("Heat");
    expect(heatCategory?.description).toBe(
      "How strongly does hot weather usually affect your comfort or outdoor plans?"
    );
    expect(heatCategory?.example).toBe(
      "For example: overheating, fatigue, or discomfort in hot weather."
    );
    expect(heatCategory?.description).not.toContain("prolonged outdoor exposure");
  });

  it("3. SENSITIVITY_INTENSITY_OPTIONS defines 4 human-readable labels", () => {
    expect(SENSITIVITY_INTENSITY_OPTIONS.map((o) => o.value)).toEqual([
      "not-affected",
      "slight",
      "moderate",
      "strong",
    ]);

    expect(getSensitivityIntensityLabel("not-affected")).toBe("Not affected");
    expect(getSensitivityIntensityLabel("slight")).toBe("Slightly");
    expect(getSensitivityIntensityLabel("moderate")).toBe("Moderately");
    expect(getSensitivityIntensityLabel("strong")).toBe("Strongly");
  });

  it("4. Preparation suggestions compatibility: slight is inactive, upper-elevated moderate/strong are active", () => {
    const upperElevatedSnapshot: EnvironmentalSnapshot = {
      ...sampleSnapshot,
      current: { ...sampleSnapshot.current!, pm25UsAqi: 110 },
    };

    const defaultInput: OutdoorCheckInput = {
      location: "Perth",
      sensitivities: { respiratory: "not-affected", hayFever: "not-affected", heat: "not-affected" },
      activity: "walking",
      durationMinutes: 30,
    };

    const slightInput: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "slight", hayFever: "not-affected", heat: "not-affected" },
    };

    const moderateInput: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "not-affected" },
    };

    const strongHighExposureInput: OutdoorCheckInput = {
      ...defaultInput,
      sensitivities: { respiratory: "strong", hayFever: "not-affected", heat: "not-affected" },
      activity: "exercise",
      durationMinutes: 60,
    };

    // AQI 110 (upper-elevated), slight respiratory sensitivity + low exposure -> NO mask.
    const slightSuggestions = getPreparationSuggestions({
      snapshot: upperElevatedSnapshot,
      input: { ...slightInput, durationMinutes: 15 },
    });
    expect(slightSuggestions.some((s) => s.id === "protective-mask")).toBe(false);

    // AQI 110 (upper-elevated), moderate respiratory sensitivity -> mask suggested.
    const moderateSuggestions = getPreparationSuggestions({
      snapshot: upperElevatedSnapshot,
      input: moderateInput,
    });
    expect(moderateSuggestions.some((s) => s.id === "protective-mask")).toBe(true);

    // AQI 70 (elevated), strong respiratory sensitivity + high exposure -> mask suggested.
    const strongSuggestions = getPreparationSuggestions({
      snapshot: sampleSnapshot,
      input: strongHighExposureInput,
    });
    expect(strongSuggestions.some((s) => s.id === "protective-mask")).toBe(true);
  });

  it("5. SensitivityProfile reaches Risk Engine without being downgraded to binary array", () => {
    const inputProfile: SensitivityProfile = {
      respiratory: "strong",
      hayFever: "slight",
      heat: "moderate",
    };

    const result = evaluatePersonalisedRisk({
      snapshot: sampleSnapshot,
      input: {
        location: "Perth",
        sensitivities: inputProfile,
        activity: "exercise",
        durationMinutes: 60,
      },
      referenceTime: "2026-08-01T12:00:00Z",
    });

    expect(result.level).not.toBe("unable");
    expect(result.domainAssessments).toBeDefined();

    const partAss = result.domainAssessments!.find((d) => d.domain === "particulate")!;
    expect(partAss.susceptibility).toBe("strong");

    const thermalAss = result.domainAssessments!.find((d) => d.domain === "thermal")!;
    expect(thermalAss.susceptibility).toBe("moderate");
  });
});
