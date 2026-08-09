import type { EnvironmentApiSuccess, ResolvedEnvironmentLocation } from "@/lib/environment-api";
import type {
  ForecastEnvironmentalSample,
  EnvironmentalSource,
} from "@/lib/risk/types";

export type DemoScenarioId =
  | "improving-day"
  | "dust-spike"
  | "persistent-heat";

export interface GetDemoEnvironmentalForecastParams {
  scenario: DemoScenarioId;
  location: string;
  prototypeLocationId?: string;
  now?: string;
  timezone?: string;
}

const PROTOTYPE_TIMEZONES: Record<string, string> = {
  perth: "Australia/Perth",
  miri: "Asia/Kuching",
  colombo: "Asia/Colombo",
  dubai: "Asia/Dubai",
};

/**
 * Derives local hour (0-23) for an instant in the target timezone using Intl.DateTimeFormat.
 */
function getLocalHour(instant: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone !== "auto" ? timezone : undefined,
    });
    const parts = formatter.formatToParts(instant);
    const hourPart = parts.find((p) => p.type === "hour");
    if (hourPart) {
      const parsed = parseInt(hourPart.value, 10);
      return parsed === 24 ? 0 : parsed;
    }
  } catch {
    // Fallback to UTC
  }
  return instant.getUTCHours();
}

/**
 * Derives local day offset (0-6) relative to start instant in target timezone.
 */
function getLocalDayOffset(instant: Date, startInstant: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone !== "auto" ? timezone : undefined,
    });
    const d1Str = formatter.format(startInstant);
    const d2Str = formatter.format(instant);
    const d1 = new Date(d1Str);
    const d2 = new Date(d2Str);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (86400 * 1000));
    return Math.max(0, Math.min(6, diffDays));
  } catch {
    const diffDays = Math.floor((instant.getTime() - startInstant.getTime()) / (86400 * 1000));
    return Math.max(0, Math.min(6, diffDays));
  }
}

function pm25UgM3ToUsAqi(ugm3: number): number {
  if (ugm3 <= 12.0) return Math.round((50 / 12.0) * ugm3);
  if (ugm3 <= 35.4) return Math.round(51 + ((100 - 51) / (35.4 - 12.1)) * (ugm3 - 12.1));
  if (ugm3 <= 55.4) return Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (ugm3 - 35.5));
  if (ugm3 <= 150.4) return Math.round(151 + ((200 - 151) / (150.4 - 55.5)) * (ugm3 - 55.5));
  return Math.round(201 + ((300 - 201) / (250.4 - 150.5)) * (ugm3 - 150.5));
}

function pm10UgM3ToUsAqi(ugm3: number): number {
  if (ugm3 <= 54) return Math.round((50 / 54) * ugm3);
  if (ugm3 <= 154) return Math.round(51 + ((100 - 51) / (154 - 55)) * (ugm3 - 55));
  if (ugm3 <= 254) return Math.round(101 + ((150 - 101) / (254 - 155)) * (ugm3 - 155));
  return Math.round(151 + ((200 - 151) / (354 - 255)) * (ugm3 - 255));
}

interface RawScenarioSample {
  airTemperatureC: number;
  apparentTemperatureC: number;
  relativeHumidityPercent: number;
  windSpeedKph: number;
  uvIndex: number;
  pm25UgM3: number;
  pm10UgM3: number;
  dustUgM3: number;
}

function generateSampleForScenario(
  scenario: DemoScenarioId,
  localHour: number,
  dayOffset: number
): RawScenarioSample {
  if (scenario === "persistent-heat") {
    const isDaytime = localHour >= 9 && localHour <= 18;
    if (isDaytime) {
      return {
        airTemperatureC: 39,
        apparentTemperatureC: 42,
        relativeHumidityPercent: 55,
        windSpeedKph: 12,
        uvIndex: localHour >= 11 && localHour <= 14 ? 10.5 : 8.5,
        pm25UgM3: 20,
        pm10UgM3: 45,
        dustUgM3: 15,
      };
    }
    return {
      airTemperatureC: 37,
      apparentTemperatureC: 38.5,
      relativeHumidityPercent: 65,
      windSpeedKph: 8,
      uvIndex: 0,
      pm25UgM3: 18,
      pm10UgM3: 40,
      dustUgM3: 12,
    };
  }

  if (scenario === "dust-spike") {
    const baseThermal = {
      airTemperatureC: 26,
      apparentTemperatureC: 26,
      relativeHumidityPercent: 50,
      windSpeedKph: 10,
      uvIndex: localHour >= 10 && localHour <= 16 ? 4 : localHour >= 7 && localHour <= 18 ? 2 : 0,
    };

    if (localHour >= 14 && localHour <= 18) {
      // Large PM2.5 / PM10 spike
      return {
        ...baseThermal,
        pm25UgM3: 68,
        pm10UgM3: 175,
        dustUgM3: 85,
      };
    }
    if (localHour >= 10 && localHour <= 13) {
      // Moderate rise
      return {
        ...baseThermal,
        pm25UgM3: 24,
        pm10UgM3: 65,
        dustUgM3: 25,
      };
    }
    return {
      ...baseThermal,
      pm25UgM3: 8,
      pm10UgM3: 18,
      dustUgM3: 5,
    };
  }

  // Primary scenario: "improving-day"
  // Apply subtle multi-day variations for Days 1-6 (dayOffset > 0)
  if (dayOffset === 1) {
    // Hotter afternoon
    if (localHour >= 12 && localHour <= 16) {
      return {
        airTemperatureC: 39,
        apparentTemperatureC: 43,
        relativeHumidityPercent: 35,
        windSpeedKph: 15,
        uvIndex: 10.5,
        pm25UgM3: 45,
        pm10UgM3: 90,
        dustUgM3: 35,
      };
    }
  } else if (dayOffset === 2) {
    // Clear / mild day
    if (localHour >= 11 && localHour <= 16) {
      return {
        airTemperatureC: 26,
        apparentTemperatureC: 27,
        relativeHumidityPercent: 45,
        windSpeedKph: 12,
        uvIndex: 4.5,
        pm25UgM3: 8,
        pm10UgM3: 18,
        dustUgM3: 5,
      };
    }
  } else if (dayOffset === 3) {
    // Dustier day
    if (localHour >= 11 && localHour <= 17) {
      return {
        airTemperatureC: 31,
        apparentTemperatureC: 32,
        relativeHumidityPercent: 40,
        windSpeedKph: 20,
        uvIndex: 6.0,
        pm25UgM3: 45,
        pm10UgM3: 160,
        dustUgM3: 75,
      };
    }
  }

  // Day 0 (and default dayOffset pattern)
  if (localHour >= 0 && localHour <= 5) {
    return {
      airTemperatureC: 23,
      apparentTemperatureC: 23,
      relativeHumidityPercent: 60,
      windSpeedKph: 10,
      uvIndex: 0,
      pm25UgM3: 10,
      pm10UgM3: 20,
      dustUgM3: 5,
    };
  }
  if (localHour >= 6 && localHour <= 8) {
    return {
      airTemperatureC: 25,
      apparentTemperatureC: 25,
      relativeHumidityPercent: 55,
      windSpeedKph: 12,
      uvIndex: 1.5,
      pm25UgM3: 12,
      pm10UgM3: 25,
      dustUgM3: 8,
    };
  }
  if (localHour >= 9 && localHour <= 11) {
    return {
      airTemperatureC: 30,
      apparentTemperatureC: 31,
      relativeHumidityPercent: 48,
      windSpeedKph: 14,
      uvIndex: 6.5,
      pm25UgM3: 22,
      pm10UgM3: 42,
      dustUgM3: 15,
    };
  }
  if (localHour >= 12 && localHour <= 14) {
    return {
      airTemperatureC: 36,
      apparentTemperatureC: 39,
      relativeHumidityPercent: 40,
      windSpeedKph: 18,
      uvIndex: 9.5,
      pm25UgM3: 38,
      pm10UgM3: 80,
      dustUgM3: 30,
    };
  }
  if (localHour >= 15 && localHour <= 16) {
    return {
      airTemperatureC: 37,
      apparentTemperatureC: 40,
      relativeHumidityPercent: 38,
      windSpeedKph: 16,
      uvIndex: 8.5,
      pm25UgM3: 40,
      pm10UgM3: 85,
      dustUgM3: 32,
    };
  }
  if (localHour >= 17 && localHour <= 19) {
    return {
      airTemperatureC: 31,
      apparentTemperatureC: 32,
      relativeHumidityPercent: 50,
      windSpeedKph: 14,
      uvIndex: 3.0,
      pm25UgM3: 24,
      pm10UgM3: 50,
      dustUgM3: 16,
    };
  }
  // 20:00 - 23:00
  return {
    airTemperatureC: 25,
    apparentTemperatureC: 25,
    relativeHumidityPercent: 62,
    windSpeedKph: 10,
    uvIndex: 0,
    pm25UgM3: 11,
    pm10UgM3: 22,
    dustUgM3: 6,
  };
}

/**
 * Generates canonical EnvironmentApiSuccess payload for a demo scenario.
 */
export function getDemoEnvironmentalForecast({
  scenario,
  location,
  prototypeLocationId,
  now = new Date().toISOString(),
  timezone: inputTimezone,
}: GetDemoEnvironmentalForecastParams): EnvironmentApiSuccess {
  const trimmedLoc = location.trim() || "Dubai, United Arab Emirates";

  let resolvedTimezone = inputTimezone && inputTimezone !== "auto" ? inputTimezone : "";
  if (!resolvedTimezone && prototypeLocationId && PROTOTYPE_TIMEZONES[prototypeLocationId]) {
    resolvedTimezone = PROTOTYPE_TIMEZONES[prototypeLocationId];
  }
  if (!resolvedTimezone) {
    const locLower = trimmedLoc.toLowerCase();
    if (locLower.includes("perth")) resolvedTimezone = "Australia/Perth";
    else if (locLower.includes("miri")) resolvedTimezone = "Asia/Kuching";
    else if (locLower.includes("colombo")) resolvedTimezone = "Asia/Colombo";
    else resolvedTimezone = "Asia/Dubai";
  }

  const resolvedLocation: ResolvedEnvironmentLocation = {
    name: trimmedLoc,
    country: "",
    countryCode: "",
    timezone: resolvedTimezone,
    displayName: trimmedLoc,
  };

  const startInstant = new Date(now);
  startInstant.setMinutes(0, 0, 0);

  const points: ForecastEnvironmentalSample[] = [];

  for (let step = 0; step < 168; step++) {
    const instant = new Date(startInstant.getTime() + step * 3600_000);
    const validAt = instant.toISOString();
    const localHour = getLocalHour(instant, resolvedTimezone);
    const dayOffset = getLocalDayOffset(instant, startInstant, resolvedTimezone);

    const raw = generateSampleForScenario(scenario, localHour, dayOffset);
    const pm25UsAqi = pm25UgM3ToUsAqi(raw.pm25UgM3);
    const pm10UsAqi = pm10UgM3ToUsAqi(raw.pm10UgM3);

    points.push({
      validAt,
      airTemperatureC: raw.airTemperatureC,
      apparentTemperatureC: raw.apparentTemperatureC,
      relativeHumidityPercent: raw.relativeHumidityPercent,
      windSpeedKph: raw.windSpeedKph,
      uvIndex: raw.uvIndex,
      pm25UgM3: raw.pm25UgM3,
      pm10UgM3: raw.pm10UgM3,
      dustUgM3: raw.dustUgM3,
      pm25UsAqi,
      pm10UsAqi,
    });
  }

  const currentRaw = generateSampleForScenario(
    scenario,
    getLocalHour(new Date(now), resolvedTimezone),
    0
  );
  const currentPm25UsAqi = pm25UgM3ToUsAqi(currentRaw.pm25UgM3);
  const currentPm10UsAqi = pm10UgM3ToUsAqi(currentRaw.pm10UgM3);

  const sources: EnvironmentalSource[] = [
    {
      kind: "weather",
      provider: "Open-Meteo Weather (Simulated Scenario)",
      status: "available",
      observedAt: now,
      fetchedAt: now,
    },
    {
      kind: "air-quality",
      provider: "Copernicus CAMS Air Quality (Simulated Scenario)",
      status: "available",
      observedAt: now,
      fetchedAt: now,
    },
  ];

  return {
    ok: true,
    requestedLocation: trimmedLoc,
    resolvedLocation,
    snapshot: {
      requestedLocation: trimmedLoc,
      resolvedLocation: trimmedLoc,
      current: {
        observedAt: now,
        airTemperatureC: currentRaw.airTemperatureC,
        apparentTemperatureC: currentRaw.apparentTemperatureC,
        relativeHumidityPercent: currentRaw.relativeHumidityPercent,
        windSpeedKph: currentRaw.windSpeedKph,
        uvIndex: currentRaw.uvIndex,
        pm25UgM3: currentRaw.pm25UgM3,
        pm10UgM3: currentRaw.pm10UgM3,
        dustUgM3: currentRaw.dustUgM3,
        pm25UsAqi: currentPm25UsAqi,
        pm10UsAqi: currentPm10UsAqi,
      },
      hourly: points,
      sources,
    },
    forecast: {
      status: "available",
      timezone: resolvedTimezone,
      points,
      horizonHours: 168,
    },
    retrievedAt: now,
    sourceMode: "demo",
    demoScenarioId: scenario,
  };
}
