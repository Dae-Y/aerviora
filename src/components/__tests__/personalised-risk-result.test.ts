import { describe, it, expect } from "vitest";
import { evaluatePersonalisedRisk } from "@/lib/risk/engine";
import {
  getRiskCopyPresentation,
  getActionLabel,
  getDriverCopy,
  CONFIDENCE_LABELS,
  CONFIDENCE_EXPLANATION,
} from "@/lib/risk/copy";
import {
  resolveResultIllustrationScene,
  selectResultIllustration,
} from "@/lib/illustrations/result-illustrations";
import { ResultStateIllustration } from "@/components/risk/result-state-illustration";
import { getRecommendedActionTone } from "@/components/risk/personalised-risk-result";
import type { EnvironmentApiSuccess } from "@/lib/environment-api";
import type { OutdoorCheckInput } from "@/lib/check-options";
import type { RiskDriver } from "@/lib/risk/types";

describe("getRiskCopyPresentation and getActionLabel copy layer", () => {
  it("maps actions using exact Risk Model v2 action keys", () => {
    expect(getActionLabel("lower", "proceed-awareness")).toBe(
      "Proceed with awareness"
    );
    expect(getActionLabel("elevated", "consider-small-adjustments")).toBe(
      "Stay aware and consider small adjustments"
    );
    expect(getActionLabel("high", "delay-shorten-reduce")).toBe(
      "Consider reducing duration or intensity"
    );
    expect(getActionLabel("very-high", "postpone")).toBe(
      "Consider postponing the activity"
    );
    expect(getActionLabel("unable", "review-information")).toBe(
      "Review the available information"
    );
  });

  it("maps levels and actions to restrained decision-support copy without safety guarantees", () => {
    const lowerCopy = getRiskCopyPresentation("lower", "proceed-awareness", "high");
    expect(lowerCopy.title).toBe("Lower environmental concern");
    expect(lowerCopy.actionLabel).toBe("Proceed with awareness");
    expect(lowerCopy.confidenceLabel).toBe("High data confidence");
    expect(lowerCopy.importantNote).toContain(
      "This result is based on modelled environmental data and prototype rules"
    );

    const elevatedCopy = getRiskCopyPresentation("elevated", "consider-small-adjustments", "high");
    expect(elevatedCopy.title).toBe("Elevated environmental concern");
    expect(elevatedCopy.actionLabel).toBe("Stay aware and consider small adjustments");
    expect(elevatedCopy.summary).toContain(
      "Some environmental conditions are elevated. Stay aware of current conditions and adjust if needed."
    );

    const highCopy = getRiskCopyPresentation("high", "delay-shorten-reduce", "high");
    expect(highCopy.title).toBe("High environmental concern");
    expect(highCopy.actionLabel).toBe("Consider reducing duration or intensity");

    const veryHighCopy = getRiskCopyPresentation("very-high", "postpone", "high");
    expect(veryHighCopy.title).toBe("Very high environmental risk");
    expect(veryHighCopy.actionLabel).toBe("Consider postponing the activity");

    const unableCopy = getRiskCopyPresentation("unable", "review-information", "low");
    expect(unableCopy.title).toBe("Guidance unavailable");
    expect(unableCopy.actionLabel).toBe("Review the available information");
    expect(unableCopy.confidenceLabel).toBe("Low data confidence");
  });

  it("exports explicit data confidence labels and explanation", () => {
    expect(CONFIDENCE_LABELS.high).toBe("High data confidence");
    expect(CONFIDENCE_LABELS.moderate).toBe("Moderate data confidence");
    expect(CONFIDENCE_LABELS.low).toBe("Low data confidence");
    expect(CONFIDENCE_EXPLANATION).toContain(
      "Data confidence reflects the completeness of the environmental inputs"
    );
  });
});

describe("Risk Driver Copy Generation & Recommendations", () => {
  it("generates correct text for environment drivers", () => {
    const driver: RiskDriver = {
      key: "thermal-high",
      category: "environment",
      label: "Heat conditions are high",
      explanation: "Reducing duration or intensity, or choosing a cooler time, may be worthwhile.",
      direction: "increases-risk",
    };

    const copy = getDriverCopy(driver);
    expect(copy.label).toBe("Heat conditions are high");
    expect(copy.explanation).toBe("Reducing duration or intensity, or choosing a cooler time, may be worthwhile.");
  });

  it("generates correct text for sensitivity drivers", () => {
    const driver: RiskDriver = {
      key: "sensitivity-respiratory",
      category: "sensitivity",
      label: "Respiratory sensitivity",
      explanation: "You reported being moderately affected by air pollution, dust or smoke.",
      direction: "context",
    };

    const copy = getDriverCopy(driver);
    expect(copy.label).toBe("Respiratory sensitivity");
  });
});

describe("getRecommendedActionTone Semantics & Styling", () => {
  it("returns level-appropriate border and background color classes", () => {
    const lowerTone = getRecommendedActionTone("lower");
    const elevatedTone = getRecommendedActionTone("elevated");
    const highTone = getRecommendedActionTone("high");
    const veryHighTone = getRecommendedActionTone("very-high");
    const unableTone = getRecommendedActionTone("unable");

    expect(lowerTone.container).toContain("border-teal-700");
    expect(elevatedTone.container).toContain("border-amber-500");
    expect(highTone.container).toContain("border-orange-500");
    expect(veryHighTone.container).toContain("border-rose-500");
    expect(unableTone.container).toContain("border-[#0A2928]");

    expect(highTone.container).not.toEqual(veryHighTone.container);
  });

  it("resolves valid illustration scene assets for lower and elevated risk levels", () => {
    const lowerScene = resolveResultIllustrationScene({ level: "lower" });
    const elevatedScene = resolveResultIllustrationScene({ level: "elevated" });

    expect(lowerScene).toBe("clear-day");
    expect(elevatedScene).toBe("muted-day");

    const lowerAsset = selectResultIllustration(lowerScene!);
    const elevatedAsset = selectResultIllustration(elevatedScene!);

    expect(lowerAsset).not.toBeNull();
    expect(lowerAsset?.src).toBe("/illustrations/scenes/aerviora-clear-day-v01.webp");

    expect(elevatedAsset).not.toBeNull();
    expect(elevatedAsset?.src).toBe("/illustrations/scenes/aerviora-muted-day-v01.webp");
  });

  it("renders embedded presentation variant cleanly with data-presentation='embedded'", () => {
    const asset = {
      scene: "clear-day" as const,
      src: "/illustrations/scenes/aerviora-clear-day-v01.webp",
      width: 1024,
      height: 1024,
    };

    const embeddedElement = ResultStateIllustration({
      asset,
      level: "lower",
      variant: "embedded",
      loading: "eager",
    });

    expect(embeddedElement).toBeDefined();
    expect(embeddedElement.props["data-presentation"]).toBe("embedded");
    expect(embeddedElement.props.className).toContain("relative");

    const imgChild = embeddedElement.props.children;
    expect(imgChild.props.loading).toBe("eager");
  });

  it("returns null illustration for unable level", () => {
    const unableScene = resolveResultIllustrationScene({ level: "unable" });
    expect(unableScene).toBeNull();
  });
});

describe("PersonalisedRiskResult Safety Boundaries & Non-Medical Claims", () => {
  const sampleInput: OutdoorCheckInput = {
    location: "Perth",
    sensitivities: { respiratory: "moderate", hayFever: "not-affected", heat: "not-affected" },
    activity: "exercise",
    durationMinutes: 45,
  };

  const sampleSuccess: EnvironmentApiSuccess = {
    ok: true,
    requestedLocation: "Perth",
    retrievedAt: "2026-08-01T12:00:00Z",
    resolvedLocation: {
      name: "Perth",
      country: "Australia",
      countryCode: "AU",
      timezone: "Australia/Perth",
      displayName: "Perth, WA, Australia",
    },
    snapshot: {
      requestedLocation: "Perth",
      resolvedLocation: "Perth, WA, Australia",
      current: {
        observedAt: "2026-08-01T11:45:00Z",
        airTemperatureC: 25.0,
        apparentTemperatureC: 28.0,
        relativeHumidityPercent: 55,
        windSpeedKph: 12.0,
        uvIndex: 4.0,
        pm25UgM3: 20.0,
        pm10UgM3: 40.0,
        dustUgM3: 15.0,
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
          provider: "Open-Meteo Air Quality",
          status: "available",
          observedAt: "2026-08-01T11:45:00Z",
        },
      ],
    },
    forecast: {
      status: "unavailable",
      reason: "insufficient-hourly-data",
    },
  };

  const riskResult = evaluatePersonalisedRisk({
    snapshot: sampleSuccess.snapshot,
    input: sampleInput,
    referenceTime: sampleSuccess.retrievedAt,
  });

  it("safety-language regression test on result copy and presentation", () => {
    const copyObj = getRiskCopyPresentation(
      riskResult.level,
      riskResult.action,
      riskResult.confidence
    );
    const fullText = `${copyObj.title} ${copyObj.summary} ${copyObj.actionLabel} ${copyObj.importantNote}`.toLowerCase();

    expect(fullText).not.toContain("safe to go outside");
    expect(fullText).not.toContain("no health risk");
    expect(fullText).not.toContain("take medication");
    expect(fullText).not.toContain("will not experience symptoms");
    expect(fullText).not.toContain("guaranteed safe");
  });

  it("Perth walking regression: elevated AQI with low personal relevance yields 'Proceed with awareness'", () => {
    const perthSnapshot = {
      ...sampleSuccess.snapshot,
      current: {
        ...sampleSuccess.snapshot.current!,
        airTemperatureC: 12.9,
        apparentTemperatureC: 12.4,
        relativeHumidityPercent: 81,
        windSpeedKph: 2.8,
        uvIndex: 0,
        pm25UgM3: 19.3,
        pm10UgM3: 23.8,
        dustUgM3: 0,
        pm25UsAqi: 67, // Moderate AQI
        pm10UsAqi: 25,
      },
    };

    const perthResult = evaluatePersonalisedRisk({
      snapshot: perthSnapshot,
      input: {
        location: "Perth",
        sensitivities: { respiratory: "not-affected", hayFever: "not-affected", heat: "moderate" }, // Heat sensitivity inactive at 12.4°C
        activity: "walking",
        durationMinutes: 45,
      },
      referenceTime: sampleSuccess.retrievedAt,
    });

    expect(perthResult.level).toBe("lower");
    expect(perthResult.recommendation.key).toBe("proceed-awareness");
    expect(perthResult.recommendation.title).toBe("Looks good overall");
    expect(perthResult.recommendation.explanation).toContain(
      "Air quality is in the US AQI Moderate range"
    );

    const particleDriver = perthResult.drivers.find(
      (d) => d.key === "particulate-moderate-context"
    );
    expect(particleDriver).toBeDefined();
    expect(particleDriver?.label).toBe("Air quality is moderate");
    expect(perthResult.drivers.some((d) => d.key === "sensitivity-heat")).toBe(false);
  });
});
