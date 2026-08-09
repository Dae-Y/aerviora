import { describe, it, expect } from "vitest";
import {
  compressOutlookBlocks,
  resolveDisplaySegmentLabel,
} from "../outlook-display-segments";
import type { OutlookTimeBlock } from "../personalised-outlook";
import type { PersonalisedRiskResult } from "../types";

function createMockBlock({
  id,
  dayKey = "today",
  startTime,
  endTime,
  level = "lower",
  actionKey = "proceed-awareness",
  primaryDomains = ["particulate"],
  relativeTrend = "similar",
  isCurrentBlock = false,
}: {
  id: string;
  dayKey?: "today" | "tomorrow";
  startTime: string;
  endTime: string;
  level?: "lower" | "elevated" | "high" | "very-high" | "unable";
  actionKey?: "proceed-awareness" | "consider-small-adjustments" | "delay-shorten-reduce" | "postpone" | "review-information";
  primaryDomains?: ("particulate" | "thermal" | "uv")[];
  relativeTrend?: "best-available" | "peak" | "easing" | "similar";
  isCurrentBlock?: boolean;
}): OutlookTimeBlock {
  const dummyResult: PersonalisedRiskResult = {
    level,
    action: actionKey,
    recommendation: {
      key: actionKey,
      title: "Title",
      explanation: "Explanation",
    },
    confidence: "high",
    drivers: [],
    limitations: [],
    evaluatedAt: startTime,
    v2Result: {
      level,
      primaryDomains,
    },
  };

  return {
    id,
    dayKey,
    startTime,
    endTime,
    displayTimeRange: "6:00–7:00 am",
    level,
    actionKey,
    actionTitle: "Title",
    primaryDomains,
    hourlyResults: [
      {
        startAt: startTime,
        conditions: { validAt: startTime },
        result: dummyResult,
      },
    ],
    isCurrentBlock,
    isBriefPeriod: false,
    summary: "Summary",
    representativePoint: {
      startAt: startTime,
      conditions: { validAt: startTime },
      result: dummyResult,
    },
    preparationSuggestions: [],
    signature: {
      level,
      actionKey,
      primaryDomains,
      severeDomainCount: 0,
      highDomainCount: 0,
      elevatedDomainCount: 0,
    },
    comparisonProfile: {
      level,
      severeDomainCount: 0,
      highDomainCount: 0,
      elevatedDomainCount: 0,
      particulateSeverity: "lower",
      thermalSeverity: "lower",
      uvProtectionSeverity: "lower",
      apparentTemperatureC: 22,
      particleAqiUs: 30,
    },
    relativeTrend,
    relativeTrendLabel: "Conditions remain similar",
  };
}

describe("Outlook Display Segment Semantic Compression", () => {
  it("Task 10H.5: resolves display segment labels correctly according to level and sustained trends", () => {
    expect(resolveDisplaySegmentLabel("lower", "generally-favourable", false, false)).toBe("Generally favourable");
    expect(resolveDisplaySegmentLabel("elevated", "peak", true, false)).toBe("Peak conditions");
    expect(resolveDisplaySegmentLabel("high", "easing", false, true)).toBe("Conditions easing");
    expect(resolveDisplaySegmentLabel("very-high", "similar", false, false)).toBe("Conditions remain similar");
    expect(resolveDisplaySegmentLabel("unable", "similar", false, false)).toBe("Guidance unavailable");
  });
  it("Task 10H.5 Section 22.1: compresses stable lower morning blocks into 1 display segment with a best marker", () => {
    const blocks: OutlookTimeBlock[] = [
      createMockBlock({
        id: "b1",
        startTime: "2026-08-06T06:00:00.000Z",
        endTime: "2026-08-06T07:00:00.000Z",
        level: "lower",
        relativeTrend: "best-available",
      }),
      createMockBlock({
        id: "b2",
        startTime: "2026-08-06T07:00:00.000Z",
        endTime: "2026-08-06T08:00:00.000Z",
        level: "lower",
        relativeTrend: "easing",
      }),
      createMockBlock({
        id: "b3",
        startTime: "2026-08-06T08:00:00.000Z",
        endTime: "2026-08-06T09:00:00.000Z",
        level: "lower",
        relativeTrend: "easing",
      }),
      createMockBlock({
        id: "b4",
        startTime: "2026-08-06T09:00:00.000Z",
        endTime: "2026-08-06T10:00:00.000Z",
        level: "lower",
        relativeTrend: "easing",
      }),
      createMockBlock({
        id: "b5",
        startTime: "2026-08-06T10:00:00.000Z",
        endTime: "2026-08-06T11:00:00.000Z",
        level: "lower",
        relativeTrend: "easing",
      }),
    ];

    const segments = compressOutlookBlocks({
      blocks,
      timezone: "UTC",
      bestAvailableBlock: blocks[0],
    });

    expect(segments).toHaveLength(1);
    expect(segments[0].startTime).toBe("2026-08-06T06:00:00.000Z");
    expect(segments[0].endTime).toBe("2026-08-06T11:00:00.000Z");
    expect(segments[0].level).toBe("lower");
    expect(segments[0].displayTrendLabel).toBe("Conditions easing");
    expect(segments[0].markers).toHaveLength(1);
    expect(segments[0].markers[0].type).toBe("best-available");
    expect(segments[0].markers[0].label).toContain("★ Best");
  });

  it("Task 10H.5 Section 22.1: splits display segments when concern level changes", () => {
    const blocks: OutlookTimeBlock[] = [
      createMockBlock({
        id: "b1",
        startTime: "2026-08-06T06:00:00.000Z",
        endTime: "2026-08-06T09:00:00.000Z",
        level: "lower",
      }),
      createMockBlock({
        id: "b2",
        startTime: "2026-08-06T09:00:00.000Z",
        endTime: "2026-08-06T12:00:00.000Z",
        level: "elevated",
        actionKey: "consider-small-adjustments",
      }),
    ];

    const segments = compressOutlookBlocks({
      blocks,
      timezone: "UTC",
    });

    expect(segments).toHaveLength(2);
    expect(segments[0].level).toBe("lower");
    expect(segments[1].level).toBe("elevated");
  });

  it("Task 10H.5 Section 22.1: splits display segments when primary domain changes", () => {
    const blocks: OutlookTimeBlock[] = [
      createMockBlock({
        id: "b1",
        startTime: "2026-08-06T09:00:00.000Z",
        endTime: "2026-08-06T12:00:00.000Z",
        level: "elevated",
        primaryDomains: ["uv"],
      }),
      createMockBlock({
        id: "b2",
        startTime: "2026-08-06T12:00:00.000Z",
        endTime: "2026-08-06T15:00:00.000Z",
        level: "elevated",
        primaryDomains: ["particulate"],
      }),
    ];

    const segments = compressOutlookBlocks({
      blocks,
      timezone: "UTC",
    });

    expect(segments).toHaveLength(2);
    expect(segments[0].primaryDomains).toEqual(["uv"]);
    expect(segments[1].primaryDomains).toEqual(["particulate"]);
  });

  it("Task 10H.5 Section 22.1: never bridges across an unavailable gap", () => {
    const blocks: OutlookTimeBlock[] = [
      createMockBlock({
        id: "b1",
        startTime: "2026-08-06T06:00:00.000Z",
        endTime: "2026-08-06T08:00:00.000Z",
        level: "lower",
      }),
      createMockBlock({
        id: "b2",
        startTime: "2026-08-06T08:00:00.000Z",
        endTime: "2026-08-06T09:00:00.000Z",
        level: "unable",
        actionKey: "review-information",
      }),
      createMockBlock({
        id: "b3",
        startTime: "2026-08-06T09:00:00.000Z",
        endTime: "2026-08-06T11:00:00.000Z",
        level: "lower",
      }),
    ];

    const segments = compressOutlookBlocks({
      blocks,
      timezone: "UTC",
    });

    expect(segments).toHaveLength(3);
    expect(segments[0].level).toBe("lower");
    expect(segments[1].level).toBe("unable");
    expect(segments[1].displayTrendLabel).toBe("Guidance unavailable");
    expect(segments[2].level).toBe("lower");
  });

  it("Task 10H.5 Section 22.1: Dubai scenario retains very-high risk level across peak, easing and best segments", () => {
    const blocks: OutlookTimeBlock[] = [
      createMockBlock({
        id: "b1",
        startTime: "2026-08-06T13:00:00.000Z",
        endTime: "2026-08-06T17:00:00.000Z",
        level: "very-high",
        actionKey: "postpone",
        relativeTrend: "peak",
      }),
      createMockBlock({
        id: "b1_2",
        startTime: "2026-08-06T14:00:00.000Z",
        endTime: "2026-08-06T17:00:00.000Z",
        level: "very-high",
        actionKey: "postpone",
        relativeTrend: "peak",
      }),
      createMockBlock({
        id: "b2",
        startTime: "2026-08-06T17:00:00.000Z",
        endTime: "2026-08-06T21:00:00.000Z",
        level: "very-high",
        actionKey: "postpone",
        relativeTrend: "easing",
      }),
      createMockBlock({
        id: "b2_2",
        startTime: "2026-08-06T18:00:00.000Z",
        endTime: "2026-08-06T21:00:00.000Z",
        level: "very-high",
        actionKey: "postpone",
        relativeTrend: "easing",
      }),
      createMockBlock({
        id: "b3",
        startTime: "2026-08-06T21:00:00.000Z",
        endTime: "2026-08-07T00:00:00.000Z",
        level: "very-high",
        actionKey: "postpone",
        relativeTrend: "similar",
      }),
    ];

    const segments = compressOutlookBlocks({
      blocks,
      timezone: "UTC",
      bestAvailableBlock: blocks[4],
    });

    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments.every((s) => s.level === "very-high")).toBe(true);

    const peakSeg = segments.find((s) => s.displayTrendLabel === "Peak conditions");
    expect(peakSeg).toBeDefined();

    const easingSeg = segments.find((s) => s.displayTrendLabel === "Conditions easing");
    expect(easingSeg).toBeDefined();
  });
});
