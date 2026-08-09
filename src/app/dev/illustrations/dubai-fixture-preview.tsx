"use client";

import { PersonalisedRiskResultView } from "@/components/risk/personalised-risk-result";
import { evaluatePersonalisedRisk } from "@/lib/risk/engine";
import type { EnvironmentApiSuccess } from "@/lib/environment-api";
import type { OutdoorCheckInput } from "@/lib/check-options";

export function DubaiFixturePreview() {
  const dubaiInput: OutdoorCheckInput = {
    location: "Dubai",
    sensitivities: {
      respiratory: "moderate",
      heat: "moderate",
      hayFever: "not-affected",
    },
    activity: "walking",
    durationMinutes: 45,
  };

  const dubaiSuccessFixture: EnvironmentApiSuccess = {
    ok: true,
    requestedLocation: "Dubai",
    retrievedAt: "2026-08-01T16:05:00.000Z",
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
        observedAt: "2026-08-01T16:00:00.000Z", // 20:00 local Dubai time
        airTemperatureC: 35.3,
        apparentTemperatureC: 43.5,
        relativeHumidityPercent: 66,
        windSpeedKph: 3.7,
        uvIndex: 0,
        pm25UgM3: 66.1,
        pm10UgM3: 111.1,
        dustUgM3: 80,
        pm25UsAqi: 157,
        pm10UsAqi: 79,
      },
      hourly: [],
      sources: [
        {
          kind: "weather",
          provider: "Open-Meteo Weather",
          status: "available",
          observedAt: "2026-08-01T16:00:00Z",
        },
        {
          kind: "air-quality",
          provider: "Open-Meteo Air Quality",
          status: "available",
          observedAt: "2026-08-01T16:00:00Z",
        },
      ],
    },
    forecast: {
      status: "unavailable",
      reason: "insufficient-hourly-data",
    },
  };

  const dubaiRiskResult = evaluatePersonalisedRisk({
    snapshot: dubaiSuccessFixture.snapshot,
    input: dubaiInput,
    referenceTime: dubaiSuccessFixture.retrievedAt,
  });

  return (
    <PersonalisedRiskResultView
      result={dubaiRiskResult}
      apiResponse={dubaiSuccessFixture}
      input={dubaiInput}
      onRefresh={() => undefined}
      onEditCheck={() => undefined}
      onReset={() => undefined}
    />
  );
}
