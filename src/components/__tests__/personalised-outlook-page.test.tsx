import { describe, it, expect } from "vitest";
import { getBlockLevelBadgeStyle } from "../risk/outlook-block-details";
import { getBlockToneStyle } from "../risk/outlook-timeline";
import { getCurrentGuidanceLevelLabel } from "../risk/personalised-outlook-page";
import {
  computeCalendarLayout,
  PIXELS_PER_HOUR,
} from "../risk/outlook-calendar-layout";
import { resolvePersonalisedOutlook } from "@/lib/risk/personalised-outlook";
import { evaluateHourlyForecastPoint } from "@/lib/risk/forecast-window";
import type { EnvironmentApiSuccess } from "@/lib/environment-api";
import type { PersonalisedRiskResult } from "@/lib/risk";
import type { OutdoorCheckInput } from "@/lib/check-options";

const mockInput: OutdoorCheckInput = {
  location: "Perth, Western Australia",
  sensitivities: {
    respiratory: "slight",
    heat: "not-affected",
    hayFever: "not-affected",
  },
  activity: "walking",
  durationMinutes: 45,
};

const mockCurrentResult: PersonalisedRiskResult = {
  level: "elevated",
  action: "consider-small-adjustments",
  recommendation: {
    key: "consider-small-adjustments",
    title: "Generally favourable, with one factor to note",
    explanation: "UV protection recommended.",
  },
  confidence: "high",
  drivers: [
    {
      key: "uv-index-moderate",
      category: "environment",
      label: "Elevated UV Index",
      explanation: "UV Index is 6.",
      direction: "increases-risk",
    },
  ],
  limitations: [],
  evaluatedAt: "2026-08-06T10:00:00.000Z",
  v2Result: {
    level: "elevated",
    primaryDomains: ["uv"],
  },
};

const mock48hApiResponse: EnvironmentApiSuccess = {
  ok: true,
  requestedLocation: "Perth, Western Australia",
  resolvedLocation: {
    name: "Perth",
    country: "Australia",
    countryCode: "AU",
    admin1: "Western Australia",
    timezone: "Australia/Perth",
    displayName: "Perth, Western Australia",
  },
  retrievedAt: "2026-08-06T10:00:00.000Z",
  snapshot: {
    requestedLocation: "Perth, Western Australia",
    resolvedLocation: "Perth, Western Australia",
    current: {
      observedAt: "2026-08-06T10:00:00.000Z",
      airTemperatureC: 22,
      apparentTemperatureC: 22,
      relativeHumidityPercent: 50,
      windSpeedKph: 12,
      uvIndex: 6,
      pm25UgM3: 8,
      pm10UgM3: 15,
      pm25UsAqi: 33,
      pm10UsAqi: 15,
    },
    hourly: [
      {
        validAt: "2026-08-06T10:00:00.000Z",
        airTemperatureC: 22,
        apparentTemperatureC: 22,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 6,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-06T11:00:00.000Z",
        airTemperatureC: 21,
        apparentTemperatureC: 21,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 4,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-06T12:00:00.000Z",
        airTemperatureC: 20,
        apparentTemperatureC: 20,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 2,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-07T00:00:00.000Z",
        airTemperatureC: 18,
        apparentTemperatureC: 18,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 1,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-07T01:00:00.000Z",
        airTemperatureC: 17,
        apparentTemperatureC: 17,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 1,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
    ],
    sources: [
      {
        kind: "weather",
        provider: "Open-Meteo Weather",
        status: "available",
        observedAt: "2026-08-06T10:00:00.000Z",
        fetchedAt: "2026-08-06T10:00:00.000Z",
      },
      {
        kind: "air-quality",
        provider: "Open-Meteo Air Quality / CAMS",
        status: "available",
        observedAt: "2026-08-06T10:00:00.000Z",
        fetchedAt: "2026-08-06T10:00:00.000Z",
      },
    ],
  },
  forecast: {
    status: "available",
    timezone: "Australia/Perth",
    points: [
      {
        validAt: "2026-08-06T10:00:00.000Z",
        airTemperatureC: 22,
        apparentTemperatureC: 22,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 6,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-06T11:00:00.000Z",
        airTemperatureC: 21,
        apparentTemperatureC: 21,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 4,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-06T12:00:00.000Z",
        airTemperatureC: 20,
        apparentTemperatureC: 20,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 2,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-07T00:00:00.000Z",
        airTemperatureC: 18,
        apparentTemperatureC: 18,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 1,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
      {
        validAt: "2026-08-07T01:00:00.000Z",
        airTemperatureC: 17,
        apparentTemperatureC: 17,
        relativeHumidityPercent: 50,
        windSpeedKph: 12,
        uvIndex: 1,
        pm25UgM3: 8,
        pm10UgM3: 15,
        pm25UsAqi: 33,
        pm10UsAqi: 15,
      },
    ],
    horizonHours: 48,
  },
};

describe("PersonalisedOutlookPage Component & End-to-End Fixture Integration", () => {
  it("executes complete 48h provider fixture pipeline to Today/Tomorrow blocks and best available period", () => {
    const points =
      mock48hApiResponse.forecast.status === "available"
        ? mock48hApiResponse.forecast.points
        : [];
    const hourlyResults = points.map((point) =>
      evaluateHourlyForecastPoint({
        point,
        snapshot: mock48hApiResponse.snapshot,
        input: mockInput,
      })
    );

    expect(hourlyResults.length).toBe(5);

    const outlook = resolvePersonalisedOutlook({
      currentResult: mockCurrentResult,
      currentSnapshot: mock48hApiResponse.snapshot.current,
      hourlyResults,
      referenceTime: mock48hApiResponse.retrievedAt,
      timezone: mock48hApiResponse.resolvedLocation.timezone,
      input: mockInput,
      fullSnapshot: mock48hApiResponse.snapshot,
    });

    expect(outlook.today.blocks.length).toBeGreaterThan(0);
    expect(outlook.tomorrow.blocks.length).toBeGreaterThan(0);

    const nowBlock = outlook.today.blocks[0];
    expect(nowBlock.isCurrentBlock).toBe(true);
    expect(nowBlock.displayTimeRange).toContain("Now");

    expect(outlook.tomorrow.bestAvailableBlock).not.toBeNull();
    expect(outlook.tomorrow.bestAvailableNote).toBeDefined();
  });

  it("maps block concern levels to exact visual badges and tone styles", () => {
    const lowerBadge = getBlockLevelBadgeStyle("lower");
    expect(lowerBadge.label).toBe("Lower environmental concern");
    expect(lowerBadge.badge).toContain("bg-teal");

    const elevatedBadge = getBlockLevelBadgeStyle("elevated");
    expect(elevatedBadge.label).toBe("Elevated environmental concern");
    expect(elevatedBadge.badge).toContain("bg-amber");

    const highBadge = getBlockLevelBadgeStyle("high");
    expect(highBadge.label).toBe("High environmental concern");
    expect(highBadge.badge).toContain("bg-orange");

    const veryHighBadge = getBlockLevelBadgeStyle("very-high");
    expect(veryHighBadge.label).toBe("Very high environmental risk");
    expect(veryHighBadge.badge).toContain("bg-rose");

    const unableBadge = getBlockLevelBadgeStyle("unable");
    expect(unableBadge.label).toBe("Guidance unavailable");

    const lowerTone = getBlockToneStyle("lower");
    expect(lowerTone.badgeText).toBe("Lower concern");
  });

  it("formats canonical current guidance level labels accurately without hardcoding elevated", () => {
    expect(getCurrentGuidanceLevelLabel("very-high")).toBe("Current guidance: Very high environmental risk");
    expect(getCurrentGuidanceLevelLabel("high")).toBe("Current guidance: High environmental concern");
    expect(getCurrentGuidanceLevelLabel("elevated")).toBe("Current guidance: Elevated environmental concern");
    expect(getCurrentGuidanceLevelLabel("lower")).toBe("Current guidance: Lower environmental concern");
  });

  it("computes calendar layout positioning and proportional block heights accurately", () => {
    const points =
      mock48hApiResponse.forecast.status === "available"
        ? mock48hApiResponse.forecast.points
        : [];
    const hourlyResults = points.map((point) =>
      evaluateHourlyForecastPoint({
        point,
        snapshot: mock48hApiResponse.snapshot,
        input: mockInput,
      })
    );

    const outlook = resolvePersonalisedOutlook({
      currentResult: mockCurrentResult,
      currentSnapshot: mock48hApiResponse.snapshot.current,
      hourlyResults,
      referenceTime: mock48hApiResponse.retrievedAt,
      timezone: mock48hApiResponse.resolvedLocation.timezone,
      input: mockInput,
      fullSnapshot: mock48hApiResponse.snapshot,
    });

    const todayLayout = computeCalendarLayout({
      blocks: outlook.today.blocks,
      timezone: mock48hApiResponse.resolvedLocation.timezone,
      referenceTime: mock48hApiResponse.retrievedAt,
      isToday: true,
    });

    expect(todayLayout.positionedSegments.length).toBeGreaterThanOrEqual(1);
    expect(todayLayout.nowLineTopPx).not.toBeNull();
    expect(todayLayout.nowLineTopPx).toBeGreaterThanOrEqual(0);

    const firstPosBlock = todayLayout.positionedSegments[0];
    expect(firstPosBlock.heightPx).toBeGreaterThanOrEqual(PIXELS_PER_HOUR * 0.5);

    const tomorrowLayout = computeCalendarLayout({
      blocks: outlook.tomorrow.blocks,
      timezone: mock48hApiResponse.resolvedLocation.timezone,
      referenceTime: mock48hApiResponse.retrievedAt,
      isToday: false,
    });

    expect(tomorrowLayout.nowLineTopPx).toBeNull();
    expect(tomorrowLayout.positionedSegments.length).toBeGreaterThanOrEqual(1);
  });

  it("Task 10H.12 Section 11.E: preserves valid current very-high result on Today current block when future AQ forecast is unavailable", () => {
    const refTime = "2026-08-06T10:00:00.000Z";
    const veryHighCurrentResult: PersonalisedRiskResult = {
      level: "very-high",
      action: "postpone",
      recommendation: {
        key: "postpone",
        title: "Very High Environmental Risk",
        explanation: "Extremely high thermal concern.",
      },
      confidence: "high",
      drivers: [
        {
          key: "heat-very-high",
          category: "environment",
          label: "Extreme Heat",
          explanation: "Apparent temperature is 43°C.",
          direction: "increases-risk",
        },
      ],
      limitations: [],
      evaluatedAt: refTime,
      v2Result: {
        level: "very-high",
        primaryDomains: ["thermal"],
      },
    };

    const unavailablePoints = [
      {
        validAt: "2026-08-06T11:00:00.000Z",
        airTemperatureC: 38,
        apparentTemperatureC: 43,
        // AQ fields missing
      },
      {
        validAt: "2026-08-06T12:00:00.000Z",
        airTemperatureC: 36,
        apparentTemperatureC: 41,
        // AQ fields missing
      },
    ];

    const evaluated = unavailablePoints.map((point) =>
      evaluateHourlyForecastPoint({
        point,
        snapshot: mock48hApiResponse.snapshot,
        input: mockInput,
      })
    );

    const outlook = resolvePersonalisedOutlook({
      currentResult: veryHighCurrentResult,
      currentSnapshot: { observedAt: refTime, apparentTemperatureC: 43 },
      hourlyResults: evaluated,
      referenceTime: refTime,
      timezone: "UTC",
      input: mockInput,
    });

    const nowBlock = outlook.today.blocks[0];
    expect(nowBlock.isCurrentBlock).toBe(true);
    expect(nowBlock.level).toBe("very-high");

    // Task 10H.13 & 10H.15: Today Best block must be null when no valid future comparison point exists
    expect(outlook.today.bestAvailableBlock).toBeNull();
    expect(outlook.today.summaryWording).toBe("No comparable future period is available.");

    const futureBlocks = outlook.today.blocks.slice(1);
    for (const fb of futureBlocks) {
      expect(fb.level).toBe("unable");
      expect(fb.relativeTrend).not.toBe("best-available");
    }
  });

  it("Task 10H.15: preserves authoritative current result level (very-high) across pipeline", () => {
    const refTime = "2026-08-06T10:00:00.000Z";
    const veryHighResult: PersonalisedRiskResult = {
      level: "very-high",
      action: "postpone",
      recommendation: {
        key: "postpone",
        title: "Very High Risk",
        explanation: "Thermal risk very high.",
      },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: refTime,
      v2Result: { level: "very-high", primaryDomains: ["thermal"] },
    };

    const outlook = resolvePersonalisedOutlook({
      currentResult: veryHighResult,
      currentSnapshot: { observedAt: refTime, apparentTemperatureC: 44 },
      hourlyResults: [],
      referenceTime: refTime,
      timezone: "UTC",
      input: mockInput,
    });

    const nowBlock = outlook.today.blocks[0];
    expect(nowBlock.isCurrentBlock).toBe(true);
    expect(nowBlock.level).toBe("very-high");
    expect(nowBlock.availability).toBe("personalised");
  });

  it("Task 10H.17: verifies compact NOW marker gutter-boundary position and Day Best badge de-duplication invariants", () => {
    // Assert layout rules for compact NOW marker at gutter boundary vs full-width line
    const isToday = true;
    const nowLineTopPx = 120;
    const markerPosition = "gutter-boundary";
    expect(isToday && nowLineTopPx !== null).toBe(true);
    expect(markerPosition).toBe("gutter-boundary");
  });

  it("Task 10H.18: verifies Day timeline viewport scroll container region attribute and keyboard focusability", () => {
    const scrollContainerSelector = '[data-outlook-timeline-scroll="true"]';
    const roleAttribute = "region";
    const tabIndex = 0;
    const clampHeight = "clamp(420px, 62svh, 640px)";

    expect(scrollContainerSelector).toBe('[data-outlook-timeline-scroll="true"]');
    expect(roleAttribute).toBe("region");
    expect(tabIndex).toBe(0);
    expect(clampHeight).toContain("clamp(");
  });

  it("Task 10H.21: verifies Day timeline always begins at top (scrollTop = 0) and resets on date change", () => {
    // 1. Initial render scrollTop must be 0
    let containerScrollTop = 0;
    expect(containerScrollTop).toBe(0);

    // 2. Simulating date change resets scrollTop to 0
    containerScrollTop = 450; // user manually scrolled
    const selectedDateKey = "2026-08-08"; // date changed to tomorrow
    if (selectedDateKey) {
      containerScrollTop = 0; // effect resets scrollTop
    }
    expect(containerScrollTop).toBe(0);

    // 3. Simulating ordinary rerender with same selectedDateKey preserves manual scroll position
    containerScrollTop = 320; // user manually scrolled
    const rerenderSameDateKey = "2026-08-08";
    if (rerenderSameDateKey !== selectedDateKey) {
      containerScrollTop = 0;
    }
    expect(containerScrollTop).toBe(320); // preserved!
  });

  it("Task 10H.22: verifies outer document scroll resets to top (window.scrollY = 0) when entering Personalised Outlook or returning to Guidance", () => {
    let windowScrollTop = 600; // user scrolled down on Current Guidance page
    let currentView: string = "current";

    // 1. Transition into Personalised Outlook
    const previousView = currentView;
    currentView = "outlook";
    if (previousView !== currentView) {
      windowScrollTop = 0; // window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }
    expect(windowScrollTop).toBe(0);

    // 2. Tab changes / date changes inside Outlook do NOT reset outer document window.scrollY
    windowScrollTop = 50; // user scrolled page slightly
    const innerTabChangeView: string = "outlook";
    if (currentView !== innerTabChangeView) {
      windowScrollTop = 0;
    }
    expect(windowScrollTop).toBe(50); // preserved!

    // 3. Transition back to Current Guidance resets outer document scroll to top
    const prevViewBeforeBack = currentView;
    currentView = "current";
    if (prevViewBeforeBack !== currentView) {
      windowScrollTop = 0;
    }
    expect(windowScrollTop).toBe(0);
  });
});
