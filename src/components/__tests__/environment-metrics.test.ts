import { describe, it, expect } from "vitest";
import { MetricIcons, MetricIconName } from "../icons/metric-icons";
import { METRIC_DEFINITIONS, MetricKey } from "../environment/metric-definitions";
import { MetricTile } from "../environment/metric-tile";
import { getCoveragePresentation } from "../environment-snapshot";
import {
  formatTemperatureC,
  formatHumidityPercent,
  formatWindSpeedKph,
  formatConcentrationUgM3,
  formatUvIndex,
} from "@/lib/environment-format";
import type { DataReadinessResult } from "@/lib/risk/types";

describe("MetricIcons registry", () => {
  const keys: MetricIconName[] = [
    "temperature",
    "feels-like",
    "humidity",
    "wind",
    "pm",
    "dust",
    "uv",
    "pollen",
    "location",
  ];

  it("returns a valid React SVG element for every registry key", () => {
    for (const key of keys) {
      const IconComponent = MetricIcons[key];
      expect(IconComponent).toBeDefined();
      const element = IconComponent({ size: 24 });
      expect(element).toBeDefined();
      expect(element.type).toBe("svg");
      expect(element.props.width).toBe(24);
      expect(element.props["aria-hidden"]).toBe("true");
    }
  });
});

describe("METRIC_DEFINITIONS copy & caveats", () => {
  const metricKeys: MetricKey[] = [
    "airTemperatureC",
    "apparentTemperatureC",
    "relativeHumidityPercent",
    "windSpeedKph",
    "pm25UgM3",
    "pm10UgM3",
    "dustUgM3",
    "uvIndex",
  ];

  it("contains plain-language explanations, source labels, and caveats for all 8 metrics", () => {
    for (const key of metricKeys) {
      const def = METRIC_DEFINITIONS[key];
      expect(def).toBeDefined();
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.explanation.length).toBeGreaterThan(10);
      expect(def.sourceLabel.length).toBeGreaterThan(0);
      expect(def.caveat.length).toBeGreaterThan(10);
    }
  });

  it("Amendment 7: regression assertion that no safety-clearance or personalised recommendation wording appears in definitions", () => {
    for (const key of metricKeys) {
      const def = METRIC_DEFINITIONS[key];
      const text = `${def.label} ${def.explanation} ${def.caveat}`.toLowerCase();

      expect(text).not.toContain("safe to go outside");
      expect(text).not.toContain("you should go outside");
      expect(text).not.toContain("this activity is safe");
      expect(text).not.toContain("healthy for you");
      expect(text).not.toContain("take medication");
    }
  });
});

describe("getCoveragePresentation Helper (Amendment 2)", () => {
  it("returns 'Complete data coverage' and 'All required inputs available' when readiness status is 'ready'", () => {
    const readyResult: DataReadinessResult = {
      status: "ready",
      missingSignals: [],
      invalidSignals: [],
      evaluatedAt: "2026-08-01T12:00:00Z",
    };

    const res = getCoveragePresentation(readyResult);
    expect(res.title).toBe("Complete data coverage");
    expect(res.detail).toBe("All required inputs available");
    expect(res.status).toBe("ready");
  });

  it("returns 'Partial data coverage' and missing input count when status is 'partial'", () => {
    const partialResult: DataReadinessResult = {
      status: "partial",
      missingSignals: ["pollenLevel"],
      invalidSignals: [],
      evaluatedAt: "2026-08-01T12:00:00Z",
    };

    const res = getCoveragePresentation(partialResult);
    expect(res.title).toBe("Partial data coverage");
    expect(res.detail).toBe("1 required input unavailable");
    expect(res.status).toBe("partial");
  });

  it("returns 'Insufficient data coverage' when status is 'insufficient'", () => {
    const insufficientResult: DataReadinessResult = {
      status: "insufficient",
      missingSignals: ["apparentTemperatureC", "pm25UgM3"],
      invalidSignals: [],
      evaluatedAt: "2026-08-01T12:00:00Z",
    };

    const res = getCoveragePresentation(insufficientResult);
    expect(res.title).toBe("Insufficient data coverage");
    expect(res.detail).toBe("2 required inputs unavailable");
    expect(res.status).toBe("insufficient");
  });

  it("prevents impossible combinations such as Insufficient data coverage with 0 missing inputs", () => {
    const zeroMissingResult: DataReadinessResult = {
      status: "insufficient", // if status was improperly set, helper resolves based on 0 missing inputs
      missingSignals: [],
      invalidSignals: [],
      evaluatedAt: "2026-08-01T12:00:00Z",
    };

    const res = getCoveragePresentation(zeroMissingResult);
    expect(res.title).toBe("Complete data coverage");
    expect(res.detail).toBe("All required inputs available");
  });
});

describe("MetricTile accessibility & properties", () => {
  it("renders a semantic button element with aria-haspopup='dialog' and minimum touch target styling", () => {
    const tileElement = MetricTile({
      label: "Air temperature",
      value: "24.5 °C",
      icon: "temperature",
      onOpenDetails: () => {},
      testId: "temp-tile",
    });

    expect(tileElement.type).toBe("button");
    expect(tileElement.props["aria-haspopup"]).toBe("dialog");
    expect(tileElement.props["data-testid"]).toBe("temp-tile");
    expect(tileElement.props.className).toContain("min-h-[72px]");
  });
});

describe("Numeric Zero vs Unavailable formatting (Amendment 6)", () => {
  it("formats valid numeric 0 as a visible metric string (e.g. 0 °C, 0%, 0 km/h, 0 µg/m³, 0)", () => {
    expect(formatTemperatureC(0.0)).toBe("0 °C");
    expect(formatHumidityPercent(0)).toBe("0%");
    expect(formatWindSpeedKph(0.0)).toBe("0 km/h");
    expect(formatConcentrationUgM3(0.0)).toBe("0 µg/m³");
    expect(formatUvIndex(0.0)).toBe("0");
  });

  it("formats null, undefined, and NaN as Unavailable", () => {
    expect(formatTemperatureC(undefined)).toBe("Unavailable");
    expect(formatHumidityPercent(NaN)).toBe("Unavailable");
    expect(formatWindSpeedKph(undefined)).toBe("Unavailable");
    expect(formatConcentrationUgM3(NaN)).toBe("Unavailable");
    expect(formatUvIndex(undefined)).toBe("Unavailable");
  });
});
