import { describe, it, expect } from "vitest";
import {
  buildMultiDayOutlook,
  getSevenLocalCalendarDates,
  isEligibleForBestAvailable,
  resolveMainFactor,
  formatLocalDateLabels,
} from "../multi-day-outlook";
import type { ForecastRiskPoint, PersonalisedRiskResult } from "../types";
import type { OutlookTimeBlock } from "../personalised-outlook";

function createMockPoint({
  startAt,
  level = "lower",
  action = "proceed-awareness",
  tempC = 20,
}: {
  startAt: string;
  level?: "lower" | "elevated" | "high" | "very-high" | "unable";
  action?: "proceed-awareness" | "consider-small-adjustments" | "delay-shorten-reduce" | "postpone" | "review-information";
  tempC?: number;
}): ForecastRiskPoint {
  const result: PersonalisedRiskResult = {
    level,
    action,
    recommendation: {
      key: action,
      title: level === "unable" ? "Guidance Unavailable" : "Lower Risk",
      explanation: "Explanation",
    },
    confidence: "high",
    drivers: [],
    limitations: [],
    evaluatedAt: startAt,
    v2Result: {
      level,
      primaryDomains: level === "unable" ? [] : ["thermal"],
    },
  };

  return {
    startAt,
    conditions: {
      validAt: startAt,
      airTemperatureC: tempC,
      apparentTemperatureC: tempC,
    },
    result,
  };
}

describe("Multi-Day Outlook Architecture & Unavailable Invariant", () => {
  it("Task 10H.9 Section 2: formats date header as one complete string (Thu 6 Aug for all dates)", () => {
    const todayLabels = formatLocalDateLabels("2026-08-06", "UTC", true, false);
    expect(todayLabels.shortDateLabel).toBe("Thu 6 Aug");
    expect(todayLabels.fullDateLabel).toBe("Thursday, 6 August");
    expect(todayLabels.dayLabel).toBe("Today");

    const ordinaryLabels = formatLocalDateLabels("2026-08-07", "UTC", false, false);
    expect(ordinaryLabels.shortDateLabel).toBe("Fri 7 Aug");
    expect(ordinaryLabels.fullDateLabel).toBe("Friday, 7 August");
  });

  it("Task 10H.7 Section 9: strictly enforces unavailable-best invariant", () => {
    const validBlock = {
      id: "b1",
      level: "lower",
      representativePoint: createMockPoint({ startAt: "2026-08-06T10:00:00.000Z", level: "lower" }),
    } as unknown as OutlookTimeBlock;

    const unableBlock = {
      id: "b2",
      level: "unable",
      representativePoint: createMockPoint({ startAt: "2026-08-06T11:00:00.000Z", level: "unable" }),
    } as unknown as OutlookTimeBlock;

    expect(isEligibleForBestAvailable(validBlock)).toBe(true);
    expect(isEligibleForBestAvailable(unableBlock)).toBe(false);
    expect(isEligibleForBestAvailable(null)).toBe(false);
  });

  it("Task 10H.7 Section 7: generates 7 location-local calendar dates correctly for Perth and Dubai timezones", () => {
    const refTime = "2026-08-06T12:00:00.000Z";

    const perthDates = getSevenLocalCalendarDates(refTime, "Australia/Perth");
    expect(perthDates).toHaveLength(7);
    expect(perthDates[0]).toBe("2026-08-06");
    expect(perthDates[1]).toBe("2026-08-07");
    expect(perthDates[6]).toBe("2026-08-12");

    const dubaiDates = getSevenLocalCalendarDates(refTime, "Asia/Dubai");
    expect(dubaiDates).toHaveLength(7);
    expect(dubaiDates[0]).toBe("2026-08-06");
  });

  it("Task 10H.7 Section 13: calculates min and max temperature per local date accurately", () => {
    const points: ForecastRiskPoint[] = [
      createMockPoint({ startAt: "2026-08-06T06:00:00.000Z", tempC: 14 }),
      createMockPoint({ startAt: "2026-08-06T12:00:00.000Z", tempC: 22 }),
      createMockPoint({ startAt: "2026-08-06T18:00:00.000Z", tempC: 17 }),
    ];

    const result = buildMultiDayOutlook({
      hourlyResults: points,
      referenceTime: "2026-08-06T06:00:00.000Z",
      timezone: "UTC",
    });

    const today = result.days[0];
    expect(today.temperatureMinC).toBe(14);
    expect(today.temperatureMaxC).toBe(22);
  });

  it("Task 10H.7 Section 10: handles completely unavailable dates without selecting a Best block or fake factors", () => {
    const points: ForecastRiskPoint[] = [
      createMockPoint({ startAt: "2026-08-06T06:00:00.000Z", level: "unable" }),
      createMockPoint({ startAt: "2026-08-06T07:00:00.000Z", level: "unable" }),
    ];

    const result = buildMultiDayOutlook({
      hourlyResults: points,
      referenceTime: "2026-08-06T06:00:00.000Z",
      timezone: "UTC",
    });

    const today = result.days[0];
    expect(today.coverage).toBe("unavailable");
    expect(today.availability).toBe("weather-only");
    expect(today.bestAvailableBlock).toBeNull();
    expect(today.bestAvailableLevel).toBeNull();
    expect(today.mainFactor).toBe("");
  });

  it("Task 10H.7 Section 17: resolves main factor summary deterministically for valid points", () => {
    const mockBlockLower = {
      level: "lower",
      primaryDomains: ["thermal"],
      actionTitle: "Lower Risk",
    } as unknown as OutlookTimeBlock;

    const mockBlockHeatUv = {
      level: "elevated",
      primaryDomains: ["thermal", "uv"],
      actionTitle: "Heat & Sun Protection",
    } as unknown as OutlookTimeBlock;

    expect(resolveMainFactor(mockBlockLower, "lower")).toBe("Conditions generally favourable");
    expect(resolveMainFactor(mockBlockHeatUv, "elevated")).toBe("Heat & Sun protection");
    expect(resolveMainFactor(null, "unable")).toBe("Guidance unavailable");
  });

  it("Task 10H.10: includes authoritative currentResult in Today multi-day summary", () => {
    const refTime = "2026-08-06T10:00:00.000Z";
    const currentVeryHighPoint = createMockPoint({ startAt: refTime, level: "very-high" });

    const result = buildMultiDayOutlook({
      currentResult: currentVeryHighPoint.result,
      currentSnapshot: { observedAt: refTime, apparentTemperatureC: 38 },
      hourlyResults: [],
      referenceTime: refTime,
      timezone: "UTC",
    });

    const today = result.days[0];
    expect(today.coverage).not.toBe("unavailable");
    expect(today.bestAvailableLevel).toBe("very-high");
    expect(today.mainFactor).toBe("Heat exposure");
  });
});
