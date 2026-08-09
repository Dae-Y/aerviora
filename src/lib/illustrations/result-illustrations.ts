import type { PersonalisedRiskLevel, CurrentEnvironmentalSample } from "../risk/types";

export type ResultIllustrationScene =
  | "clear-day"
  | "muted-day"
  | "harsh-sun-day"
  | "hazy-day"
  | "calm-evening"
  | "hot-hazy-night"
  | "rainy-overcast";

export interface ResultIllustrationAsset {
  scene: ResultIllustrationScene;
  src: string;
  width: number;
  height: number;
}

/**
 * Central registry of flat scene illustration assets in public/illustrations/scenes/
 */
export const RESULT_ILLUSTRATIONS: Record<
  ResultIllustrationScene,
  ResultIllustrationAsset
> = {
  "clear-day": {
    scene: "clear-day",
    src: "/illustrations/scenes/aerviora-clear-day-v01.webp",
    width: 1024,
    height: 1024,
  },
  "muted-day": {
    scene: "muted-day",
    src: "/illustrations/scenes/aerviora-muted-day-v01.webp",
    width: 1024,
    height: 1024,
  },
  "harsh-sun-day": {
    scene: "harsh-sun-day",
    src: "/illustrations/scenes/aerviora-harsh-sun-day-v01.webp",
    width: 1024,
    height: 1024,
  },
  "hazy-day": {
    scene: "hazy-day",
    src: "/illustrations/scenes/aerviora-hazy-day-v01.webp",
    width: 1024,
    height: 1024,
  },
  "calm-evening": {
    scene: "calm-evening",
    src: "/illustrations/scenes/aerviora-calm-evening-v01.webp",
    width: 1024,
    height: 1024,
  },
  "hot-hazy-night": {
    scene: "hot-hazy-night",
    src: "/illustrations/scenes/aerviora-hot-hazy-night-v01.webp",
    width: 1024,
    height: 1024,
  },
  "rainy-overcast": {
    scene: "rainy-overcast",
    src: "/illustrations/scenes/aerviora-rainy-overcast-v01.webp",
    width: 1024,
    height: 1024,
  },
};

/**
 * Returns all registered illustration scene assets dynamically for development inspection galleries.
 */
export function getRegisteredResultIllustrationAssets(): ResultIllustrationAsset[] {
  return Object.values(RESULT_ILLUSTRATIONS);
}

/**
 * Parses local environmental hour from observedAt ISO string and IANA timezone.
 */
export function parseLocalHour(
  isoTimestamp?: string,
  timeZone?: string
): number | null {
  if (!isoTimestamp) return null;
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return null;

    let tz = timeZone;
    try {
      if (tz) Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      tz = "UTC";
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: tz || "UTC",
    });

    const hourStr = formatter.format(date);
    const hour = parseInt(hourStr, 10);
    return isNaN(hour) ? null : hour;
  } catch {
    return null;
  }
}

/**
 * Checks if environmental observed time falls into evening/night hours (18:00 - 05:59).
 */
export function isNightTime(
  isoTimestamp?: string,
  timeZone?: string
): boolean {
  const hour = parseLocalHour(isoTimestamp, timeZone);
  if (hour === null) return false;
  return hour >= 18 || hour < 6;
}

export interface ResolveSceneParams {
  level: PersonalisedRiskLevel;
  current?: CurrentEnvironmentalSample | null;
  timezone?: string;
}

/**
 * Conservative resolver mapping risk level and environmental context to a flat scene asset.
 */
export function resolveResultIllustrationScene({
  level,
  current,
  timezone,
}: ResolveSceneParams): ResultIllustrationScene | null {
  if (level === "unable") return null;

  const isNight = isNightTime(current?.observedAt, timezone);

  const hasHaze =
    Boolean(
      current?.pm25UgM3 !== undefined &&
        Number.isFinite(current.pm25UgM3) &&
        current.pm25UgM3 >= 15.0
    ) ||
    Boolean(
      current?.pm10UgM3 !== undefined &&
        Number.isFinite(current.pm10UgM3) &&
        current.pm10UgM3 >= 45.0
    ) ||
    Boolean(
      current?.dustUgM3 !== undefined &&
        Number.isFinite(current.dustUgM3) &&
        current.dustUgM3 >= 25.0
    );

  const hasSunOrHeat =
    Boolean(
      current?.uvIndex !== undefined &&
        Number.isFinite(current.uvIndex) &&
        current.uvIndex >= 6.0
    ) ||
    Boolean(
      current?.apparentTemperatureC !== undefined &&
        Number.isFinite(current.apparentTemperatureC) &&
        current.apparentTemperatureC >= 30.0
    ) ||
    Boolean(
      current?.airTemperatureC !== undefined &&
        Number.isFinite(current.airTemperatureC) &&
        current.airTemperatureC >= 28.0
    );

  if (level === "lower") {
    return isNight ? "calm-evening" : "clear-day";
  }

  if (level === "elevated") {
    if (isNight) return "calm-evening";
    if (hasHaze) return "hazy-day";
    return "muted-day";
  }

  if (level === "high") {
    if (isNight && (hasSunOrHeat || hasHaze)) return "hot-hazy-night";
    if (hasHaze) return "hazy-day";
    if (hasSunOrHeat) return "harsh-sun-day";
    return "harsh-sun-day";
  }

  if (level === "very-high") {
    if (isNight) return "hot-hazy-night";
    if (hasHaze) return "hazy-day";
    return "harsh-sun-day";
  }

  return null;
}

/**
 * Returns the illustration asset corresponding to the resolved scene name.
 */
export function selectResultIllustration(
  scene: ResultIllustrationScene
): ResultIllustrationAsset | null {
  return RESULT_ILLUSTRATIONS[scene] || null;
}
