import { describe, it, expect } from "vitest";
import { buildMultiDayOutlook } from "../multi-day-outlook";
import type { ForecastRiskPoint, PersonalisedRiskResult } from "../types";

function createMockPoint({
  startAt,
  level = "lower",
  action = "proceed-awareness",
  tempC = 25,
  pm25Aqi = 30,
}: {
  startAt: string;
  level?: "lower" | "elevated" | "high" | "very-high" | "unable";
  action?: "proceed-awareness" | "consider-small-adjustments" | "delay-shorten-reduce" | "postpone" | "review-information";
  tempC?: number;
  pm25Aqi?: number;
}): ForecastRiskPoint {
  const result: PersonalisedRiskResult = {
    level,
    action,
    recommendation: {
      key: action,
      title:
        level === "very-high"
          ? "Consider postponing outdoor activity"
          : level === "high"
          ? "Consider reducing duration"
          : level === "elevated"
          ? "Generally favourable, with one factor to note"
          : level === "unable"
          ? "Guidance unavailable"
          : "Looks good overall",
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
      pm25UsAqi: level === "unable" ? undefined : pm25Aqi,
    },
    result,
  };
}

describe("Task 10H.20 — Shared Block Builder & 7-Day Timelines", () => {
  it("16.1 Full Day 3 timeline: builds genuine multi-block timeline for Day 3 from 24 hourlyPoints", () => {
    const day3Points: ForecastRiskPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = String(h).padStart(2, "0");
      const iso = `2026-08-08T${hourStr}:00:00.000Z`;
      const level = h < 12 ? "lower" : "elevated";
      day3Points.push(createMockPoint({ startAt: iso, level }));
    }

    const multiDay = buildMultiDayOutlook({
      hourlyResults: day3Points,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
    });

    const satDay = multiDay.days.find((d) => d.localDateKey === "2026-08-08");
    expect(satDay).toBeDefined();
    expect(satDay!.blocks.length).toBe(2);
    expect(satDay!.blocks[0].level).toBe("lower");
    expect(satDay!.blocks[1].level).toBe("elevated");
    expect(satDay!.blocks[0].startTime).toBe("2026-08-08T00:00:00.000Z");
    expect(satDay!.blocks[1].endTime).toBe("2026-08-09T00:00:00.000Z");
  });

  it("16.2 Flat very-high Day 3 (Dubai regression test): suppresses midnight Best label when all 24 hours are equally very-high", () => {
    const flatPoints: ForecastRiskPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = String(h).padStart(2, "0");
      const iso = `2026-08-08T${hourStr}:00:00.000Z`;
      flatPoints.push(createMockPoint({ startAt: iso, level: "very-high", tempC: 45 }));
    }

    const multiDay = buildMultiDayOutlook({
      hourlyResults: flatPoints,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "Asia/Dubai",
    });

    const satDay = multiDay.days.find((d) => d.localDateKey === "2026-08-08");
    expect(satDay).toBeDefined();
    expect(satDay!.bestAvailableBlock).toBeNull();
    expect(satDay!.blocks.length).toBe(1);
    expect(satDay!.blocks[0].displayTimeRange).toBe("4:00–12:00 am");
    expect(satDay!.primarySummary).toBe("Conditions are expected to remain similar across the available forecast.");
  });

  it("16.3 Meaningful Best period: assigns Best available period when a meaningfully preferable block exists", () => {
    const points: ForecastRiskPoint[] = [
      ...Array.from({ length: 15 }, (_, i) =>
        createMockPoint({ startAt: `2026-08-08T${String(i).padStart(2, "0")}:00:00.000Z`, level: "high" })
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        createMockPoint({ startAt: `2026-08-08T${String(i + 15).padStart(2, "0")}:00:00.000Z`, level: "elevated" })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        createMockPoint({ startAt: `2026-08-08T${String(i + 18).padStart(2, "0")}:00:00.000Z`, level: "high" })
      ),
    ];

    const multiDay = buildMultiDayOutlook({
      hourlyResults: points,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
    });

    const satDay = multiDay.days.find((d) => d.localDateKey === "2026-08-08");
    expect(satDay).toBeDefined();
    expect(satDay!.bestAvailableBlock).not.toBeNull();
    expect(satDay!.bestAvailableBlock!.level).toBe("elevated");
    expect(satDay!.bestAvailableBlock!.displayTimeRange).toBe("3:00 pm");
    expect(satDay!.blocks.length).toBe(3);
  });

  it("16.4 Partial future date: represents trailing weather-only / unable hours honestly without collapsing timeline", () => {
    const partialPoints: ForecastRiskPoint[] = [
      ...Array.from({ length: 5 }, (_, i) =>
        createMockPoint({ startAt: `2026-08-08T${String(i).padStart(2, "0")}:00:00.000Z`, level: "lower" })
      ),
      ...Array.from({ length: 19 }, (_, i) =>
        createMockPoint({ startAt: `2026-08-08T${String(i + 5).padStart(2, "0")}:00:00.000Z`, level: "unable" })
      ),
    ];

    const multiDay = buildMultiDayOutlook({
      hourlyResults: partialPoints,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
    });

    const satDay = multiDay.days.find((d) => d.localDateKey === "2026-08-08");
    expect(satDay).toBeDefined();
    expect(satDay!.coverage).toBe("partial");
    expect(satDay!.coverageNotice).toContain("Complete personalised guidance available until 4:00 am.");
    expect(satDay!.blocks.length).toBe(2);
    expect(satDay!.blocks[0].level).toBe("lower");
    expect(satDay!.blocks[1].level).toBe("unable");
  });

  it("16.5 One isolated valid period: resolves to Limited personalised coverage without mislabeling as Best", () => {
    const isolatedPoints: ForecastRiskPoint[] = [
      createMockPoint({ startAt: "2026-08-08T00:00:00.000Z", level: "very-high" }),
      ...Array.from({ length: 23 }, (_, i) =>
        createMockPoint({ startAt: `2026-08-08T${String(i + 1).padStart(2, "0")}:00:00.000Z`, level: "unable" })
      ),
    ];

    const multiDay = buildMultiDayOutlook({
      hourlyResults: isolatedPoints,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
    });

    const satDay = multiDay.days.find((d) => d.localDateKey === "2026-08-08");
    expect(satDay).toBeDefined();
    expect(satDay!.validHourCount).toBe(1);
    expect(satDay!.bestAvailableBlock).toBeNull();
    expect(satDay!.primarySummary).toBe("Limited personalised coverage available.");
  });

  it("16.6 Weather-only final date: sets availability to weather-only with zero risk blocks", () => {
    const weatherOnlyPoints: ForecastRiskPoint[] = Array.from({ length: 24 }, (_, i) =>
      createMockPoint({ startAt: `2026-08-12T${String(i).padStart(2, "0")}:00:00.000Z`, level: "unable" })
    );

    const multiDay = buildMultiDayOutlook({
      hourlyResults: weatherOnlyPoints,
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "UTC",
    });

    const wedDay = multiDay.days.find((d) => d.localDateKey === "2026-08-12");
    expect(wedDay).toBeDefined();
    expect(wedDay!.availability).toBe("weather-only");
    expect(wedDay!.bestAvailableBlock).toBeNull();
  });

  it("16.8 Timezone Dubai: groups forecast points into correct local dates across Asia/Dubai timezone", () => {
    const pointUtc = createMockPoint({ startAt: "2026-08-07T20:00:00.000Z", level: "very-high" });
    const multiDay = buildMultiDayOutlook({
      hourlyResults: [pointUtc],
      referenceTime: "2026-08-06T10:00:00.000Z",
      timezone: "Asia/Dubai",
    });

    const satDay = multiDay.days.find((d) => d.localDateKey === "2026-08-08");
    expect(satDay).toBeDefined();
    expect(satDay!.hourlyPoints.length).toBe(1);
    expect(satDay!.hourlyPoints[0].startAt).toBe("2026-08-07T20:00:00.000Z");
  });
});
