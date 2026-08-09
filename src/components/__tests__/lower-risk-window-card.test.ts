import { describe, it, expect } from "vitest";
import { deriveLowerRiskExplanations } from "@/lib/risk/forecast-window";
import {
  getLocalDayDifference,
  formatLowerRiskTimeTitle,
  formatHourTime,
} from "../risk/lower-risk-window-card";
import type { PersonalisedRiskResult } from "@/lib/risk/types";

describe("Lower-Risk Window Guidance & Explanation derivation", () => {
  it("derives explanations when heat and UV improve", () => {
    const curRes: PersonalisedRiskResult = {
      level: "very-high",
      action: "postpone",
      recommendation: { key: "postpone", title: "Consider postponing", explanation: "" },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: null,
      domainAssessments: [
        { domain: "thermal", baseSeverity: "severe", effectiveSeverity: "severe", susceptibility: "not-affected", exposureDemand: "moderate", adjustmentApplied: false, upliftReason: null, capApplied: null },
        { domain: "uv", baseSeverity: "high", effectiveSeverity: "high", susceptibility: "not-affected", exposureDemand: "moderate", adjustmentApplied: false, upliftReason: null, capApplied: null },
      ],
    };

    const repRes: PersonalisedRiskResult = {
      level: "high",
      action: "delay-shorten-reduce",
      recommendation: { key: "delay-shorten-reduce", title: "Consider reducing duration", explanation: "" },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: null,
      domainAssessments: [
        { domain: "thermal", baseSeverity: "elevated", effectiveSeverity: "elevated", susceptibility: "not-affected", exposureDemand: "moderate", adjustmentApplied: false, upliftReason: null, capApplied: null },
        { domain: "uv", baseSeverity: "lower", effectiveSeverity: "lower", susceptibility: "not-affected", exposureDemand: "moderate", adjustmentApplied: false, upliftReason: null, capApplied: null },
      ],
    };

    const { explanations, relativeRiskNote } = deriveLowerRiskExplanations(curRes, repRes);
    expect(explanations).toContain("Heat and UV exposure are expected to decrease.");
    expect(relativeRiskNote).toBe("Conditions are still expected to remain high.");
  });

  it("derives heat-only improvement explanation", () => {
    const curRes: PersonalisedRiskResult = {
      level: "high",
      action: "delay-shorten-reduce",
      recommendation: { key: "delay-shorten-reduce", title: "", explanation: "" },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: null,
      domainAssessments: [
        { domain: "thermal", baseSeverity: "high", effectiveSeverity: "high", susceptibility: "not-affected", exposureDemand: "moderate", adjustmentApplied: false, upliftReason: null, capApplied: null },
      ],
    };

    const repRes: PersonalisedRiskResult = {
      level: "elevated",
      action: "consider-small-adjustments",
      recommendation: { key: "consider-small-adjustments", title: "", explanation: "" },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: null,
      domainAssessments: [
        { domain: "thermal", baseSeverity: "elevated", effectiveSeverity: "elevated", susceptibility: "not-affected", exposureDemand: "moderate", adjustmentApplied: false, upliftReason: null, capApplied: null },
      ],
    };

    const { explanations } = deriveLowerRiskExplanations(curRes, repRes);
    expect(explanations).toContain("Heat exposure is expected to decrease.");
  });
});

describe("Requirement 8 — Timezone & Date Labeling Regression Tests", () => {
  // Current local time: 2:24 pm AWST (UTC+8) -> 2026-08-06T06:24:00.000Z
  const refTime224pm = "2026-08-06T06:24:00.000Z";
  const timezone = "Australia/Perth";

  it("today 7:00 pm is on the same local date and formatted as 'Around 7:00 pm'", () => {
    // 7:00 pm AWST = 2026-08-06T11:00:00.000Z
    const startAt = "2026-08-06T11:00:00.000Z";
    const endAt = "2026-08-06T11:30:00.000Z";

    const diffDays = getLocalDayDifference(startAt, refTime224pm, timezone);
    expect(diffDays).toBe(0);

    const { badgeTitle, displayTitle } = formatLowerRiskTimeTitle({
      startAt,
      endAt,
      isBriefPeriod: true,
      referenceTime: refTime224pm,
      timeZone: timezone,
    });

    expect(badgeTitle).toBe("Lower-risk time today");
    expect(displayTitle).toBe("Around 7:00 pm");
  });

  it("tomorrow 7:00 am is on the next local date and formatted as 'Tomorrow around 7:00 am'", () => {
    // 7:00 am AWST on Aug 7 = 2026-08-06T23:00:00.000Z
    const startAt = "2026-08-06T23:00:00.000Z";
    const endAt = "2026-08-06T23:30:00.000Z";

    const diffDays = getLocalDayDifference(startAt, refTime224pm, timezone);
    expect(diffDays).toBe(1);

    const { badgeTitle, displayTitle } = formatLowerRiskTimeTitle({
      startAt,
      endAt,
      isBriefPeriod: true,
      referenceTime: refTime224pm,
      timeZone: timezone,
    });

    expect(badgeTitle).toBe("Lower-risk time tomorrow");
    expect(displayTitle).toBe("Tomorrow around 7:00 am");
  });

  it("handles UTC vs location-local date differences accurately", () => {
    // UTC time: 2026-08-06T20:30:00.000Z (Aug 6 in UTC)
    // Local time in Tokyo (UTC+9): 2026-08-07T05:30:00+09:00 (Aug 7 in Tokyo)
    const tokRefTime = "2026-08-06T20:30:00.000Z";
    const tokTimezone = "Asia/Tokyo";

    // Target forecast: 2026-08-07T10:00:00.000Z (7:00 pm in Tokyo on Aug 7)
    const tokStartAt = "2026-08-07T10:00:00.000Z";

    const diffDays = getLocalDayDifference(tokStartAt, tokRefTime, tokTimezone);
    expect(diffDays).toBe(0); // Both are Aug 7 in Tokyo!

    const { badgeTitle, displayTitle } = formatLowerRiskTimeTitle({
      startAt: tokStartAt,
      endAt: "2026-08-07T10:30:00.000Z",
      isBriefPeriod: true,
      referenceTime: tokRefTime,
      timeZone: tokTimezone,
    });

    expect(badgeTitle).toBe("Lower-risk time today");
    expect(displayTitle).toBe("Around 7:00 pm");
  });

  it("formats hour time with location timezone correctly", () => {
    // 2026-08-06T11:00:00.000Z in Perth (UTC+8) is 7:00 pm
    expect(formatHourTime("2026-08-06T11:00:00.000Z", "Australia/Perth")).toBe("7:00 pm");
    // 2026-08-06T23:00:00.000Z in Perth (UTC+8) is 7:00 am
    expect(formatHourTime("2026-08-06T23:00:00.000Z", "Australia/Perth")).toBe("7:00 am");
  });
});
