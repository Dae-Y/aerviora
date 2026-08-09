import { describe, it, expect } from "vitest";
import {
  resolvePersonalisedOutlook,
  getLocalDateString,
  getLocalHour,
  formatLocalTimeRange,
  getBlockSignature,
  isSameSignature,
  getNextAlignedHourBoundary,
} from "../personalised-outlook";
import {
  isMeaningfullyBetter,
  buildOutlookComparisonProfile,
} from "../outlook-comparison";
import type {
  PersonalisedRiskResult,
  ForecastRiskPoint,
  CurrentEnvironmentalSample,
} from "../types";
import type { OutdoorCheckInput } from "@/lib/check-options";

const mockInput: OutdoorCheckInput = {
  location: "Perth, WA",
  sensitivities: {
    respiratory: "slight",
    heat: "not-affected",
    hayFever: "not-affected",
  },
  activity: "walking",
  durationMinutes: 45,
};

const mockCurrentResultLower: PersonalisedRiskResult = {
  level: "lower",
  action: "proceed-awareness",
  recommendation: {
    key: "proceed-awareness",
    title: "Looks good overall",
    explanation: "Conditions are generally favourable for outdoor activity.",
  },
  confidence: "high",
  drivers: [],
  limitations: [],
  evaluatedAt: "2026-08-06T10:00:00Z",
  v2Result: {
    level: "lower",
    primaryDomains: ["particulate"],
  },
};

const mockCurrentSnapshot: CurrentEnvironmentalSample = {
  observedAt: "2026-08-06T10:00:00.000Z",
  airTemperatureC: 22,
  apparentTemperatureC: 22,
  relativeHumidityPercent: 50,
  windSpeedKph: 12,
  uvIndex: 2,
  pm25UgM3: 8,
  pm10UgM3: 15,
};

function createMockPoint(
  isoTime: string,
  level: "lower" | "elevated" | "high" | "very-high" | "unable",
  primaryDomains: ("particulate" | "thermal" | "uv")[] = ["particulate"],
  apparentTempC = 22,
  pm25UsAqi = 30
): ForecastRiskPoint {
  const actionMap = {
    lower: "proceed-awareness" as const,
    elevated: "consider-small-adjustments" as const,
    high: "delay-shorten-reduce" as const,
    "very-high": "postpone" as const,
    unable: "review-information" as const,
  };

  const titleMap = {
    lower: "Looks good overall",
    elevated: "Generally favourable, with one factor to note",
    high: "Consider reducing duration or intensity",
    "very-high": "Consider postponing the activity",
    unable: "Guidance unavailable",
  };

  return {
    startAt: isoTime,
    conditions: {
      validAt: isoTime,
      airTemperatureC: apparentTempC,
      apparentTemperatureC: apparentTempC,
      uvIndex: level === "elevated" && primaryDomains.includes("uv") ? 6 : 2,
      pm25UgM3: 10,
      pm25UsAqi,
      pm10UsAqi: 15,
    },
    result: {
      level,
      action: actionMap[level],
      recommendation: {
        key: actionMap[level],
        title: titleMap[level],
        explanation: titleMap[level],
      },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: isoTime,
      domainAssessments: [
        {
          domain: "particulate",
          effectiveSeverity: level === "very-high" ? "high" : "lower",
          baseSeverity: level === "very-high" ? "high" : "lower",
          susceptibility: "slight",
          exposureDemand: "moderate",
          adjustmentApplied: false,
          upliftReason: null,
          capApplied: null,
        },
        {
          domain: "thermal",
          effectiveSeverity: level === "very-high" ? "severe" : "lower",
          baseSeverity: level === "very-high" ? "severe" : "lower",
          susceptibility: "not-affected",
          exposureDemand: "moderate",
          adjustmentApplied: false,
          upliftReason: null,
          capApplied: null,
        },
        {
          domain: "uv",
          effectiveSeverity: "lower",
          protectionSeverity: apparentTempC > 40 ? "high" : "lower",
          baseSeverity: "lower",
          susceptibility: "not-affected",
          exposureDemand: "moderate",
          adjustmentApplied: false,
          upliftReason: null,
          capApplied: null,
        },
      ],
      v2Result: {
        level,
        primaryDomains,
      },
    },
  };
}

describe("personalised-outlook pure resolver", () => {
  it("formats location-local calendar dates correctly across timezones", () => {
    const datePerth = getLocalDateString("2026-08-06T16:00:00Z", "Australia/Perth");
    const dateUtc = getLocalDateString("2026-08-06T16:00:00Z", "UTC");
    expect(datePerth).toBe("2026-08-07");
    expect(dateUtc).toBe("2026-08-06");
  });

  it("formats local hour correctly", () => {
    const hourPerth = getLocalHour("2026-08-06T04:00:00Z", "Australia/Perth");
    expect(hourPerth).toBe(12);
  });

  it("formats local time range correctly", () => {
    const range = formatLocalTimeRange(
      "2026-08-06T00:00:00Z",
      "2026-08-06T03:00:00Z",
      "UTC"
    );
    expect(range).toBe("12:00–3:00 am");
  });

  it("extracts and compares stable block signatures", () => {
    const p1 = createMockPoint("2026-08-06T10:00:00Z", "elevated", ["uv"]);
    const p2 = createMockPoint("2026-08-06T11:00:00Z", "elevated", ["uv"]);
    const p3 = createMockPoint("2026-08-06T12:00:00Z", "elevated", ["particulate"]);

    const sig1 = getBlockSignature(p1);
    const sig2 = getBlockSignature(p2);
    const sig3 = getBlockSignature(p3);

    expect(isSameSignature(sig1, sig2)).toBe(true);
    expect(isSameSignature(sig1, sig3)).toBe(false);
  });

  it("includes Now as the first block on Today and deduplicates current hour forecast points", () => {
    const hourly: ForecastRiskPoint[] = [
      createMockPoint("2026-08-06T10:00:00.000Z", "lower"),
      createMockPoint("2026-08-06T11:00:00.000Z", "elevated"),
      createMockPoint("2026-08-06T12:00:00.000Z", "elevated"),
    ];

    const outlook = resolvePersonalisedOutlook({
      currentResult: mockCurrentResultLower,
      currentSnapshot: mockCurrentSnapshot,
      hourlyResults: hourly,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
      input: mockInput,
    });

    expect(outlook.today.blocks.length).toBeGreaterThan(0);
    const firstBlock = outlook.today.blocks[0];
    expect(firstBlock.isCurrentBlock).toBe(true);
    expect(firstBlock.displayTimeRange).toContain("Now");

    for (const block of outlook.tomorrow.blocks) {
      expect(block.isCurrentBlock).toBe(false);
    }
  });

  it("evaluates trend thresholds accurately in isMeaningfullyBetter", () => {
    const p1 = createMockPoint("2026-08-06T10:00:00Z", "very-high", ["thermal"], 46, 170);
    const p2NoImprovement = createMockPoint("2026-08-06T11:00:00Z", "very-high", ["thermal"], 45.5, 169);
    const p3Meaningful = createMockPoint("2026-08-06T12:00:00Z", "very-high", ["thermal"], 40, 155);

    const prof1 = buildOutlookComparisonProfile(p1);
    const prof2 = buildOutlookComparisonProfile(p2NoImprovement);
    const prof3 = buildOutlookComparisonProfile(p3Meaningful);

    expect(isMeaningfullyBetter(prof1, prof2)).toBe(false);
    expect(isMeaningfullyBetter(prof1, prof3)).toBe(true);
  });

  it("handles same-level Dubai scenario correctly without lowering absolute category or claiming green status", () => {
    const currentPoint = createMockPoint("2026-08-06T10:00:00Z", "very-high", ["thermal", "particulate"], 46, 170);

    const hourly: ForecastRiskPoint[] = [
      createMockPoint("2026-08-06T11:00:00.000Z", "very-high", ["thermal", "particulate"], 46, 170),
      createMockPoint("2026-08-06T12:00:00.000Z", "very-high", ["thermal", "particulate"], 46, 170),
      createMockPoint("2026-08-06T13:00:00.000Z", "very-high", ["thermal", "particulate"], 40, 155),
      createMockPoint("2026-08-06T14:00:00.000Z", "very-high", ["thermal", "particulate"], 39, 150),
    ];

    const currentSnapshotSample: CurrentEnvironmentalSample = {
      observedAt: currentPoint.conditions.validAt,
      airTemperatureC: currentPoint.conditions.airTemperatureC,
      apparentTemperatureC: currentPoint.conditions.apparentTemperatureC,
      pm25UsAqi: currentPoint.conditions.pm25UsAqi,
      pm10UsAqi: currentPoint.conditions.pm10UsAqi,
    };

    const outlook = resolvePersonalisedOutlook({
      currentResult: currentPoint.result,
      currentSnapshot: currentSnapshotSample,
      hourlyResults: hourly,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
      input: mockInput,
    });

    for (const block of outlook.today.blocks) {
      expect(block.level).toBe("very-high");
    }

    expect(outlook.today.summaryBranch).toBe("same-category-easing");
    expect(outlook.today.summaryWording).toContain("Conditions may ease later, although the concern category remains very high.");

    expect(outlook.today.bestAvailableBlock).not.toBeNull();
    expect(outlook.today.bestAvailableBlock?.level).toBe("very-high");
    expect(outlook.today.bestAvailableBlock?.relativeTrendLabel).toBe("Best available period");
  });

  it("handles flat same-level scenario cleanly with similar conditions summary", () => {
    const currentPoint = createMockPoint("2026-08-06T10:00:00Z", "high", ["particulate"], 25, 100);

    const hourly: ForecastRiskPoint[] = [
      createMockPoint("2026-08-06T11:00:00.000Z", "high", ["particulate"], 25.2, 101),
      createMockPoint("2026-08-06T12:00:00.000Z", "high", ["particulate"], 25.1, 99),
    ];

    const currentSnapshotSample: CurrentEnvironmentalSample = {
      observedAt: currentPoint.conditions.validAt,
      airTemperatureC: currentPoint.conditions.airTemperatureC,
      apparentTemperatureC: currentPoint.conditions.apparentTemperatureC,
      pm25UsAqi: currentPoint.conditions.pm25UsAqi,
      pm10UsAqi: currentPoint.conditions.pm10UsAqi,
    };

    const outlook = resolvePersonalisedOutlook({
      currentResult: currentPoint.result,
      currentSnapshot: currentSnapshotSample,
      hourlyResults: hourly,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
      input: mockInput,
    });

    expect(outlook.today.summaryBranch).toBe("similar-conditions");
    expect(outlook.today.summaryWording).toContain("Conditions are expected to remain similar across the available forecast.");
  });

  it("Task 10H.4: correctly calculates next aligned hour boundary for current block", () => {
    // 2:45 pm -> 3:00 pm
    expect(getNextAlignedHourBoundary("2026-08-06T14:45:00.000Z")).toBe("2026-08-06T15:00:00.000Z");
    // 3:00 pm -> 4:00 pm
    expect(getNextAlignedHourBoundary("2026-08-06T15:00:00.000Z")).toBe("2026-08-06T16:00:00.000Z");
    // 3:59 pm -> 4:00 pm
    expect(getNextAlignedHourBoundary("2026-08-06T15:59:00.000Z")).toBe("2026-08-06T16:00:00.000Z");
  });

  it("Task 10H.4: prevents current block and forecast blocks from overlapping", () => {
    // Reference time: 2:45 pm (14:45)
    const refTime = "2026-08-06T14:45:00.000Z";
    const currentSnap: CurrentEnvironmentalSample = {
      observedAt: refTime,
      airTemperatureC: 25,
      uvIndex: 5,
    };

    const hourlyPoints: ForecastRiskPoint[] = [
      createMockPoint("2026-08-06T14:00:00.000Z", "lower"), // Past / current hour
      createMockPoint("2026-08-06T15:00:00.000Z", "high"),  // First future hour
      createMockPoint("2026-08-06T16:00:00.000Z", "high"),  // Second future hour
    ];

    const result = resolvePersonalisedOutlook({
      currentResult: mockCurrentResultLower,
      currentSnapshot: currentSnap,
      hourlyResults: hourlyPoints,
      referenceTime: refTime,
      timezone: "UTC",
      input: mockInput,
    });

    const todayBlocks = result.today.blocks;
    expect(todayBlocks.length).toBeGreaterThanOrEqual(2);

    const nowBlock = todayBlocks[0];
    const firstFutureBlock = todayBlocks[1];

    expect(nowBlock.isCurrentBlock).toBe(true);
    expect(nowBlock.startTime).toBe(refTime);
    expect(nowBlock.endTime).toBe("2026-08-06T15:00:00.000Z"); // Ends at 3:00 pm

    expect(firstFutureBlock.isCurrentBlock).toBe(false);
    expect(firstFutureBlock.startTime).toBe("2026-08-06T15:00:00.000Z"); // Starts at 3:00 pm
    expect(new Date(nowBlock.endTime).getTime()).toBe(new Date(firstFutureBlock.startTime).getTime());
  });

  it("Task 10H.10 Scenario A: valid current very-high result is preserved on Today current block and not replaced by Guidance unavailable", () => {
    const refTime = "2026-08-06T10:00:00.000Z";
    const veryHighResult: PersonalisedRiskResult = {
      level: "very-high",
      action: "postpone",
      recommendation: { key: "postpone", title: "Very High Environmental Risk", explanation: "Consider postponing outdoor activity." },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: refTime,
      v2Result: { level: "very-high", primaryDomains: ["thermal"] },
    };

    const unavailableFuture: ForecastRiskPoint[] = [
      createMockPoint("2026-08-06T11:00:00.000Z", "unable"),
      createMockPoint("2026-08-06T12:00:00.000Z", "unable"),
    ];

    const outlook = resolvePersonalisedOutlook({
      currentResult: veryHighResult,
      currentSnapshot: { observedAt: refTime, apparentTemperatureC: 38 },
      hourlyResults: unavailableFuture,
      referenceTime: refTime,
      timezone: "UTC",
      input: mockInput,
    });

    const nowBlock = outlook.today.blocks[0];
    expect(nowBlock.isCurrentBlock).toBe(true);
    expect(nowBlock.level).toBe("very-high");
    expect(nowBlock.actionTitle).toBe("Very High Environmental Risk");

    // Future unavailable blocks must not receive Best marker
    for (const b of outlook.today.blocks.slice(1)) {
      expect(b.level).toBe("unable");
      expect(b.relativeTrend).not.toBe("best-available");
    }
  });

  it("Task 10H.10 Scenario B: handles all points unavailable cleanly with null bestAvailableBlock", () => {
    const refTime = "2026-08-06T10:00:00.000Z";
    const unableResult: PersonalisedRiskResult = {
      level: "unable",
      action: "review-information",
      recommendation: { key: "review-information", title: "Guidance Unavailable", explanation: "Complete data missing." },
      confidence: "low",
      drivers: [],
      limitations: [],
      evaluatedAt: refTime,
      v2Result: { level: "unable", primaryDomains: [] },
    };

    const unavailablePoints: ForecastRiskPoint[] = [
      createMockPoint("2026-08-06T11:00:00.000Z", "unable"),
      createMockPoint("2026-08-06T12:00:00.000Z", "unable"),
    ];

    const outlook = resolvePersonalisedOutlook({
      currentResult: unableResult,
      currentSnapshot: { observedAt: refTime },
      hourlyResults: unavailablePoints,
      referenceTime: refTime,
      timezone: "UTC",
      input: mockInput,
    });

    expect(outlook.today.bestAvailableBlock).toBeNull();
    expect(outlook.today.bestAvailableNote).toBeNull();
  });
});
