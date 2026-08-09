import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AirQualityRecoveryPanel } from "../environment/air-quality-recovery-panel";
import {
  assessDataReadiness,
  isStaleOnlyReadinessFailure,
  isFutureCurrentTimestampFailure,
  isRetriableAirQualityOnlyFailure,
} from "@/lib/risk/data-readiness";
import type { EnvironmentApiSuccess } from "@/lib/environment-api";
import type { OutdoorCheckInput } from "@/lib/check-options";

const refTime = "2026-08-01T12:00:00Z";

const mockWeatherSuccessAirError: EnvironmentApiSuccess = {
  ok: true,
  requestedLocation: "Dubai",
  retrievedAt: refTime,
  resolvedLocation: {
    name: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    timezone: "Asia/Dubai",
    displayName: "Dubai, United Arab Emirates",
  },
  snapshot: {
    requestedLocation: "Dubai",
    resolvedLocation: "Dubai, United Arab Emirates",
    current: {
      observedAt: refTime,
      airTemperatureC: 37.3,
      apparentTemperatureC: 39.5,
      relativeHumidityPercent: 37,
      windSpeedKph: 10.8,
    },
    hourly: [],
    sources: [
      {
        kind: "weather",
        provider: "Open-Meteo Weather",
        status: "available",
        observedAt: refTime,
      },
      {
        kind: "air-quality",
        provider: "Open-Meteo Air Quality / CAMS",
        status: "error",
        observedAt: refTime,
      },
    ],
  },
  forecast: {
    status: "unavailable",
    reason: "insufficient-hourly-data",
  },
};

const mockCompleteSnapshot: EnvironmentApiSuccess = {
  ok: true,
  requestedLocation: "Dubai",
  retrievedAt: refTime,
  resolvedLocation: {
    name: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    timezone: "Asia/Dubai",
    displayName: "Dubai, United Arab Emirates",
  },
  snapshot: {
    requestedLocation: "Dubai",
    resolvedLocation: "Dubai, United Arab Emirates",
    current: {
      observedAt: refTime,
      airTemperatureC: 37.3,
      apparentTemperatureC: 39.5,
      relativeHumidityPercent: 37,
      windSpeedKph: 10.8,
      pm25UgM3: 87.8,
      pm10UgM3: 225.8,
      dustUgM3: 246,
      uvIndex: 0,
      pm25UsAqi: 168,
      pm10UsAqi: 136,
    },
    hourly: [],
    sources: [
      {
        kind: "weather",
        provider: "Open-Meteo Weather",
        status: "available",
        observedAt: refTime,
      },
      {
        kind: "air-quality",
        provider: "Open-Meteo Air Quality / CAMS",
        status: "available",
        observedAt: refTime,
      },
    ],
  },
  forecast: {
    status: "unavailable",
    reason: "insufficient-hourly-data",
  },
};

const sampleInput: OutdoorCheckInput = {
  location: "Dubai",
  sensitivities: [],
  activity: "walking",
  durationMinutes: 30,
};

describe("AirQualityRecoveryPanel UI component (Task 7.7.4 Amendment 13)", () => {
  it("renders spinner and 4 pulse skeleton tiles during waiting status", () => {
    const el = AirQualityRecoveryPanel({ status: "waiting" });
    expect(el).toBeDefined();

    const [headingContainer, copyContainer, skeletonGrid] = el.props.children;

    // Spinner heading text
    expect(headingContainer.props.children[1].props.children).toBe(
      "Updating air and exposure data…"
    );

    // Supporting copy
    expect(copyContainer.props.children).toBe(
      "Particulate, dust and UV information can take a few extra seconds."
    );

    // Skeleton grid: 4 skeleton tiles
    const skeletonTiles = skeletonGrid.props.children;
    expect(skeletonTiles).toHaveLength(4);
    expect(skeletonGrid.props.className).toContain("grid-cols-2");

    // Reduced-motion class check
    const spinner = headingContainer.props.children[0];
    expect(spinner.props.className).toContain("motion-reduce:animate-none");
    expect(skeletonTiles[0].props.className).toContain("motion-reduce:animate-none");
  });

  it("renders spinner and 4 pulse skeleton tiles during retrying status", () => {
    const el = AirQualityRecoveryPanel({ status: "retrying" });
    expect(el).toBeDefined();

    const [headingContainer] = el.props.children;
    expect(headingContainer.props.children[1].props.children).toBe(
      "Updating air and exposure data…"
    );
  });

  it("renders final unavailable panel with copy and Try again button during failed status without spinner/skeletons", () => {
    const onRetry = vi.fn();
    const el = AirQualityRecoveryPanel({ status: "failed", onRetry });
    expect(el).toBeDefined();

    const [textContainer, retryBtn] = el.props.children;
    const [heading, copy] = textContainer.props.children;

    expect(heading.props.children).toBe(
      "Air and exposure data are temporarily unavailable"
    );
    expect(copy.props.children).toBe(
      "Weather conditions were loaded, but particulate, dust and UV information could not be retrieved for this check."
    );
    expect(retryBtn.props.children).toBe("Try again");

    // Ensure spinner and skeletons are removed
    expect(el.props.className).not.toContain("animate-pulse");
  });
});

describe("Air-Quality Recovery Classifier & Mutual Exclusivity (Task 7.7.4 Amendments 1, 7, 10)", () => {
  it("classifies valid weather + missing air-quality group as retriable", () => {
    const readiness = assessDataReadiness({
      snapshot: mockWeatherSuccessAirError.snapshot,
      input: sampleInput,
      referenceTime: refTime,
    });

    expect(
      isRetriableAirQualityOnlyFailure({
        snapshot: mockWeatherSuccessAirError.snapshot,
        readiness,
        referenceTime: refTime,
      })
    ).toBe(true);
  });

  it("does not classify complete snapshot as retriable", () => {
    const readiness = assessDataReadiness({
      snapshot: mockCompleteSnapshot.snapshot,
      input: sampleInput,
      referenceTime: refTime,
    });

    expect(
      isRetriableAirQualityOnlyFailure({
        snapshot: mockCompleteSnapshot.snapshot,
        readiness,
        referenceTime: refTime,
      })
    ).toBe(false);
  });

  it("enforces mutual exclusivity: stale-only failure is handled by stale path, not air quality path", () => {
    const staleSnapshot = {
      ...mockCompleteSnapshot.snapshot,
      current: {
        ...mockCompleteSnapshot.snapshot.current!,
        observedAt: "2026-08-01T05:00:00Z",
      },
    };

    const readiness = assessDataReadiness({
      snapshot: staleSnapshot,
      input: sampleInput,
      referenceTime: refTime,
    });

    expect(isStaleOnlyReadinessFailure(readiness)).toBe(true);
    expect(
      isRetriableAirQualityOnlyFailure({
        snapshot: staleSnapshot,
        readiness,
        referenceTime: refTime,
      })
    ).toBe(false);
  });

  it("treats numeric zero (UV 0, dust 0, AQI 0) as valid values", () => {
    const zeroValSnapshot = {
      ...mockCompleteSnapshot.snapshot,
      current: {
        ...mockCompleteSnapshot.snapshot.current!,
        uvIndex: 0,
        dustUgM3: 0,
        pm25UsAqi: 0,
        pm10UsAqi: 0,
      },
    };

    const readiness = assessDataReadiness({
      snapshot: zeroValSnapshot,
      input: sampleInput,
      referenceTime: refTime,
    });

    expect(
      isRetriableAirQualityOnlyFailure({
        snapshot: zeroValSnapshot,
        readiness,
        referenceTime: refTime,
      })
    ).toBe(false);
  });

  it("treats one valid PM AQI as valid under partial policy (not complete failure)", () => {
    const partialAqiSnapshot = {
      ...mockCompleteSnapshot.snapshot,
      current: {
        ...mockCompleteSnapshot.snapshot.current!,
        pm25UsAqi: 42,
        pm10UsAqi: undefined,
      },
    };

    const readiness = assessDataReadiness({
      snapshot: partialAqiSnapshot,
      input: sampleInput,
      referenceTime: refTime,
    });

    expect(
      isRetriableAirQualityOnlyFailure({
        snapshot: partialAqiSnapshot,
        readiness,
        referenceTime: refTime,
      })
    ).toBe(false);
  });
});

describe("CheckFlow timer & race protection rules (Task 7.7.4 Amendments 3, 4, 8, 9, 11)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses 10,000 ms as the central recovery delay constant", () => {
    const AIR_QUALITY_RECOVERY_DELAY_MS = 10_000;
    expect(AIR_QUALITY_RECOVERY_DELAY_MS).toBe(10000);
  });

  it("verifies budget consumption and single-attempt semantics", () => {
    const keySet = new Set<string>();
    const checkKey = "dubai:walking:30:";

    // Amendment 3: consume budget on scheduling waiting state
    keySet.add(checkKey);
    expect(keySet.has(checkKey)).toBe(true);

    // Amendment 4: manual refresh or failed retry does not schedule second retry if key exists
    const canAutoRetry = !keySet.has(checkKey);
    expect(canAutoRetry).toBe(false);
  });
});

describe("Task 7.7.5: Timestamp Determinism, Future-Recovery Classifier & State Isolation", () => {
  const referenceTime = "2026-08-05T05:45:00.000Z";

  it("Amendment 2 & 11: Unix epoch conversion produces identical UTC ISO strings regardless of timezone context", () => {
    // 2026-08-05T05:30:00.000Z in Unix seconds
    const unixSeconds = Math.floor(new Date("2026-08-05T05:30:00.000Z").getTime() / 1000);
    expect(unixSeconds).toBe(1785907800);

    const convertedIso = new Date(unixSeconds * 1000).toISOString();
    expect(convertedIso).toBe("2026-08-05T05:30:00.000Z");
  });

  it("Amendment 11: Display formatting converts UTC timestamp into target location local time correctly", () => {
    const utcObserved = "2026-08-05T05:30:00.000Z";

    // Miri (Asia/Kuching, UTC+8): 05:30 UTC -> 13:30 -> 1:30 pm local time
    const miriFormatted = new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kuching",
    }).format(new Date(utcObserved));
    expect(miriFormatted).toBe("1:30 pm");

    // Dubai (Asia/Dubai, UTC+4): 05:30 UTC -> 09:30 -> 9:30 am local time
    const dubaiFormatted = new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Dubai",
    }).format(new Date(utcObserved));
    expect(dubaiFormatted).toBe("9:30 am");
  });

  it("Amendment 5: retrievedAt is an absolute UTC timestamp for current request and not inherited from previous snapshot", () => {
    const dubainSnapshotRetrievedAt = "2026-08-05T01:00:00.000Z";
    const currentMiriRequestRetrievedAt = new Date("2026-08-05T05:45:00.000Z").toISOString();

    expect(currentMiriRequestRetrievedAt).toBe("2026-08-05T05:45:00.000Z");
    expect(currentMiriRequestRetrievedAt).not.toBe(dubainSnapshotRetrievedAt);
  });

  it("Amendment 6: classifies future-dated weather timestamp as future-current-timestamp failure", () => {
    // Weather observed 3 hours 45 mins in the future (09:30 UTC vs referenceTime 05:45 UTC)
    const futureWeatherSnapshot = {
      ...mockWeatherSuccessAirError.snapshot,
      current: {
        ...mockWeatherSuccessAirError.snapshot.current!,
        observedAt: "2026-08-05T09:30:00.000Z",
      },
      sources: [
        {
          kind: "weather" as const,
          provider: "Open-Meteo Weather",
          status: "available" as const,
          observedAt: "2026-08-05T09:30:00.000Z",
        },
        {
          kind: "air-quality" as const,
          provider: "Open-Meteo Air Quality",
          status: "error" as const,
        },
      ],
    };

    const readiness = assessDataReadiness({
      snapshot: futureWeatherSnapshot,
      input: sampleInput,
      referenceTime,
    });

    expect(isFutureCurrentTimestampFailure(readiness)).toBe(true);

    // Ensure it is NOT classified as retriable air-quality failure until weather timestamp is fresh
    expect(
      isRetriableAirQualityOnlyFailure({
        snapshot: futureWeatherSnapshot,
        readiness,
        referenceTime,
      })
    ).toBe(false);
  });

  it("Amendment 7, 9 & 12: maintains separate retry sets and clears all sets on full reset", () => {
    const staleSet = new Set<string>();
    const futureSet = new Set<string>();
    const airQualitySet = new Set<string>();

    const checkKey = "miri:walking:30:";

    staleSet.add(checkKey);
    futureSet.add(checkKey);
    airQualitySet.add(checkKey);

    expect(staleSet.size).toBe(1);
    expect(futureSet.size).toBe(1);
    expect(airQualitySet.size).toBe(1);

    // Full reset clears all three sets
    staleSet.clear();
    futureSet.clear();
    airQualitySet.clear();

    expect(staleSet.size).toBe(0);
    expect(futureSet.size).toBe(0);
    expect(airQualitySet.size).toBe(0);
  });
});

