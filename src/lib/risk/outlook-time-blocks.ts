import type { OutdoorCheckInput } from "@/lib/check-options";
import type {
  PersonalisedRiskLevel,
  PersonalisedRiskAction,
  EnvironmentalDomain,
  ForecastRiskPoint,
  EnvironmentalSnapshot,
  OutlookAvailability,
} from "./types";
import { getPreparationSuggestions } from "@/lib/preparation/get-preparation-suggestions";
import type { PreparationSuggestion } from "@/lib/preparation/types";
import type {
  OutlookComparisonProfile,
  OutlookRelativeTrend,
} from "./outlook-comparison";
import {
  buildOutlookComparisonProfile,
  OUTLOOK_TREND_THRESHOLDS,
} from "./outlook-comparison";

export type OutlookDayKey = "today" | "tomorrow" | string;

export interface OutlookBlockSignature {
  level: PersonalisedRiskLevel;
  actionKey: PersonalisedRiskAction;
  primaryDomains: EnvironmentalDomain[];
  protectionSeverity?: "lower" | "elevated" | "high";
  severeDomainCount: number;
  highDomainCount: number;
  elevatedDomainCount: number;
  tempBucket?: number;
  aqiBucket?: number;
}

export interface OutlookTimeBlock {
  id: string;
  dayKey: OutlookDayKey;
  startTime: string; // ISO timestamp
  endTime: string;   // ISO timestamp
  displayTimeRange: string; // e.g. "6:00–9:00 am" or "Now (4:00–5:00 pm)"
  level: Exclude<PersonalisedRiskLevel, "unable"> | "unable";
  availability: OutlookAvailability;
  actionKey: PersonalisedRiskAction;
  actionTitle: string;
  primaryDomains: EnvironmentalDomain[];
  hourlyResults: ForecastRiskPoint[];
  isCurrentBlock: boolean;
  isBriefPeriod: boolean;
  summary: string;
  representativePoint: ForecastRiskPoint | null;
  preparationSuggestions: PreparationSuggestion[];
  signature: OutlookBlockSignature;
  comparisonProfile: OutlookComparisonProfile;
  relativeTrend: OutlookRelativeTrend;
  relativeTrendLabel: string;
}

/**
 * Returns local calendar date string (YYYY-MM-DD) for a given ISO timestamp and timezone.
 */
export function getLocalDateString(isoTimestamp: string, timezone: string): string {
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return "";
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return isoTimestamp.slice(0, 10);
  }
}

/**
 * Returns local hour integer (0-23) for a given ISO timestamp and timezone.
 */
export function getLocalHour(isoTimestamp: string, timezone: string): number {
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return 0;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const hourStr = formatter.format(date);
    const hourNum = parseInt(hourStr, 10);
    return hourNum === 24 ? 0 : hourNum;
  } catch {
    return 0;
  }
}

/**
 * Formats a single ISO timestamp to local time string, e.g. "6:00 am", "12:00 pm".
 */
export function formatLocalTime(isoTimestamp: string, timezone: string): string {
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return "";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return formatter.format(date).toLowerCase();
  } catch {
    return isoTimestamp.slice(11, 16);
  }
}

/**
 * Formats a start and end time range in location timezone.
 * Example: "6:00–9:00 am" or "11:00 am–1:00 pm"
 */
export function formatLocalTimeRange(
  startTimeIso: string,
  endTimeIso: string,
  timezone: string
): string {
  const startStr = formatLocalTime(startTimeIso, timezone);
  const endStr = formatLocalTime(endTimeIso, timezone);
  if (!startStr || !endStr) return "";

  const startParts = startStr.split(" ");
  const endParts = endStr.split(" ");
  if (
    startParts.length === 2 &&
    endParts.length === 2 &&
    startParts[1] === endParts[1]
  ) {
    return `${startParts[0]}–${endParts[0]} ${endParts[1]}`;
  }
  return `${startStr}–${endStr}`;
}

/**
 * Extracts a stable, trend-aware OutlookBlockSignature from a ForecastRiskPoint.
 */
export function getBlockSignature(point: ForecastRiskPoint): OutlookBlockSignature {
  const profile = buildOutlookComparisonProfile(point);
  const level = point.result.level;
  const actionKey = point.result.action;

  const rawDomains = point.result.v2Result?.primaryDomains || [];
  const domainOrder: Record<EnvironmentalDomain, number> = {
    particulate: 0,
    thermal: 1,
    uv: 2,
  };
  const primaryDomains = Array.from(new Set(rawDomains)).sort(
    (a, b) => (domainOrder[a] ?? 99) - (domainOrder[b] ?? 99)
  );

  const tempBucket =
    profile.apparentTemperatureC !== null
      ? Math.floor(profile.apparentTemperatureC / 2)
      : undefined;

  const aqiBucket =
    profile.particleAqiUs !== null
      ? Math.floor(profile.particleAqiUs / 10)
      : undefined;

  return {
    level,
    actionKey,
    primaryDomains,
    protectionSeverity: profile.uvProtectionSeverity,
    severeDomainCount: profile.severeDomainCount,
    highDomainCount: profile.highDomainCount,
    elevatedDomainCount: profile.elevatedDomainCount,
    tempBucket,
    aqiBucket,
  };
}

/**
 * Compares two OutlookBlockSignatures for exact equality.
 */
export function isSameSignature(
  a: OutlookBlockSignature,
  b: OutlookBlockSignature
): boolean {
  if (a.level !== b.level) return false;
  if (a.actionKey !== b.actionKey) return false;
  if (a.protectionSeverity !== b.protectionSeverity) return false;
  if (a.severeDomainCount !== b.severeDomainCount) return false;
  if (a.highDomainCount !== b.highDomainCount) return false;
  if (a.elevatedDomainCount !== b.elevatedDomainCount) return false;
  if (a.tempBucket !== b.tempBucket) return false;
  if (a.aqiBucket !== b.aqiBucket) return false;
  if (a.primaryDomains.length !== b.primaryDomains.length) return false;
  for (let i = 0; i < a.primaryDomains.length; i++) {
    if (a.primaryDomains[i] !== b.primaryDomains[i]) return false;
  }
  return true;
}

/**
 * Derives short relative explanation copy comparing baseline and target profiles.
 */
export function buildRelativeExplanation(
  baseline: OutlookComparisonProfile,
  target: OutlookComparisonProfile
): string {
  const parts: string[] = [];

  const uvEased =
    target.uvProtectionSeverity === "lower" &&
    baseline.uvProtectionSeverity !== "lower";
  const tempEased =
    baseline.apparentTemperatureC !== null &&
    target.apparentTemperatureC !== null &&
    baseline.apparentTemperatureC - target.apparentTemperatureC >=
      OUTLOOK_TREND_THRESHOLDS.apparentTemperatureDecreaseC;
  const aqiEased =
    baseline.particleAqiUs !== null &&
    target.particleAqiUs !== null &&
    baseline.particleAqiUs - target.particleAqiUs >=
      OUTLOOK_TREND_THRESHOLDS.particleAqiDecrease;

  if (tempEased && uvEased) {
    parts.push("Heat and UV exposure are expected to ease.");
  } else if (uvEased) {
    parts.push("UV protection needs are expected to decrease.");
  } else if (tempEased) {
    if (target.level === "very-high") {
      parts.push(
        "Heat exposure is expected to ease, although heat concern remains very high."
      );
    } else {
      parts.push("Heat exposure is expected to decrease.");
    }
  }

  if (aqiEased) {
    if (target.level === "very-high" || target.level === "high") {
      parts.push(
        "Air quality is expected to improve slightly, but particulate concern remains elevated."
      );
    } else {
      parts.push("Air quality is expected to improve.");
    }
  }

  if (parts.length === 0) {
    if (target.level === "very-high") {
      parts.push(
        "Conditions may ease relative to peak hours, but overall concern remains very high."
      );
    } else if (target.level === "high") {
      parts.push(
        "Conditions may improve compared with earlier hours, but overall concern remains high."
      );
    } else if (target.level === "elevated") {
      parts.push("Generally favourable, with one factor to note.");
    } else {
      parts.push("Looks good overall.");
    }
  }

  return parts.join(" ");
}

/**
 * Calculates the next aligned top-of-hour boundary ISO timestamp for a given reference timestamp.
 * Example: 2:45:00 pm -> 3:00:00 pm; 3:00:00 pm -> 4:00:00 pm.
 */
export function getNextAlignedHourBoundary(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) return isoTimestamp;
  const ms = date.getTime();
  const HOUR_MS = 3600_000;
  const nextHourMs = Math.floor(ms / HOUR_MS) * HOUR_MS + HOUR_MS;
  return new Date(nextHourMs).toISOString();
}

/**
 * Derives a synthetic snapshot for a representative forecast point to evaluate preparation suggestions.
 */
export function createSnapshotFromPoint(
  point: ForecastRiskPoint,
  snapshot?: EnvironmentalSnapshot
): EnvironmentalSnapshot {
  return {
    requestedLocation: snapshot?.requestedLocation || "",
    resolvedLocation: snapshot?.resolvedLocation || "",
    current: {
      observedAt: point.startAt,
      airTemperatureC: point.conditions.airTemperatureC,
      apparentTemperatureC: point.conditions.apparentTemperatureC,
      relativeHumidityPercent: point.conditions.relativeHumidityPercent,
      windSpeedKph: point.conditions.windSpeedKph,
      uvIndex: point.conditions.uvIndex,
      pm25UgM3: point.conditions.pm25UgM3,
      pm10UgM3: point.conditions.pm10UgM3,
      pollenLevel: point.conditions.pollenLevel,
      dustLevel: point.conditions.dustLevel,
      dustUgM3: point.conditions.dustUgM3,
      pm25UsAqi: point.conditions.pm25UsAqi,
      pm10UsAqi: point.conditions.pm10UsAqi,
    },
    hourly: snapshot?.hourly || [],
    sources: snapshot?.sources || [],
  };
}

const DEFAULT_INPUT: OutdoorCheckInput = {
  location: "Current Location",
  sensitivities: {
    respiratory: "not-affected",
    heat: "not-affected",
    hayFever: "not-affected",
  },
  activity: "walking",
  durationMinutes: 30,
};

export interface BuildOutlookTimeBlocksParams {
  dayKey?: string;
  localDateKey?: string;
  points: ForecastRiskPoint[];
  input?: OutdoorCheckInput;
  timezone: string;
  fullSnapshot?: EnvironmentalSnapshot;
  nowPointStartAt?: string;
}

/**
 * Groups consecutive ForecastRiskPoints into OutlookTimeBlocks for any given local date.
 * Shared between resolvePersonalisedOutlook (Today/Tomorrow) and buildMultiDayOutlook (7 Days).
 */
export function buildOutlookTimeBlocks({
  dayKey,
  localDateKey,
  points,
  input = DEFAULT_INPUT,
  timezone,
  fullSnapshot,
  nowPointStartAt,
}: BuildOutlookTimeBlocksParams): OutlookTimeBlock[] {
  if (points.length === 0) return [];

  const effectiveDayKey = dayKey || localDateKey || "today";

  const blocks: OutlookTimeBlock[] = [];
  let currentGroup: ForecastRiskPoint[] = [];
  let currentSig: OutlookBlockSignature | null = null;

  const finalizeGroup = (group: ForecastRiskPoint[], sig: OutlookBlockSignature) => {
    if (group.length === 0) return;
    const firstPoint = group[0];
    const lastPoint = group[group.length - 1];

    const isCurrentBlock =
      effectiveDayKey === "today" &&
      nowPointStartAt !== undefined &&
      firstPoint.startAt === nowPointStartAt;

    const startTime = firstPoint.startAt;
    let endTime: string;

    if (isCurrentBlock) {
      endTime = getNextAlignedHourBoundary(nowPointStartAt!);
    } else {
      const lastPointDate = new Date(lastPoint.startAt);
      const endDate = new Date(lastPointDate.getTime() + 3600_000);
      endTime = endDate.toISOString();
    }

    const isBriefPeriod = isCurrentBlock || group.length === 1;
    const timeRangeStr = formatLocalTimeRange(startTime, endTime, timezone);
    const displayTimeRange = isCurrentBlock
      ? `Now (${timeRangeStr})`
      : timeRangeStr;

    const actionTitle =
      firstPoint.result.recommendation?.title ||
      "Outdoor Environmental Guidance";

    const summary = firstPoint.result.recommendation?.explanation || "";
    const representativePoint = firstPoint;
    const repSnapshot = createSnapshotFromPoint(representativePoint, fullSnapshot);

    const prepSuggestions = input
      ? getPreparationSuggestions({
          snapshot: repSnapshot,
          input,
          domainAssessments: representativePoint.result.domainAssessments,
        }).slice(0, 4)
      : [];

    const blockId = `${effectiveDayKey}-${startTime.slice(0, 16)}`;
    const comparisonProfile = buildOutlookComparisonProfile(representativePoint);

    const availability: OutlookAvailability =
      isCurrentBlock && firstPoint.result.level !== "unable"
        ? "personalised"
        : firstPoint.result.level !== "unable"
        ? "personalised"
        : firstPoint.conditions.airTemperatureC !== undefined ||
          firstPoint.conditions.apparentTemperatureC !== undefined
        ? "weather-only"
        : "temporarily-unavailable";

    blocks.push({
      id: blockId,
      dayKey: effectiveDayKey,
      startTime,
      endTime,
      displayTimeRange,
      level: firstPoint.result.level,
      availability,
      actionKey: firstPoint.result.action,
      actionTitle,
      primaryDomains: sig.primaryDomains,
      hourlyResults: group,
      isCurrentBlock,
      isBriefPeriod,
      summary,
      representativePoint,
      preparationSuggestions: prepSuggestions,
      signature: sig,
      comparisonProfile,
      relativeTrend: "similar",
      relativeTrendLabel: "Conditions remain similar",
    });
  };

  const nowIndex = points.findIndex((p) => p.startAt === nowPointStartAt);
  let forecastPointsToGroup = points;

  if (nowIndex !== -1 && effectiveDayKey === "today") {
    const nowP = points[nowIndex];
    const nowSig = getBlockSignature(nowP);
    finalizeGroup([nowP], nowSig);
    forecastPointsToGroup = points.filter((_, idx) => idx !== nowIndex);
  }

  for (const point of forecastPointsToGroup) {
    const sig = getBlockSignature(point);

    if (currentGroup.length === 0) {
      currentGroup.push(point);
      currentSig = sig;
    } else if (currentSig && isSameSignature(currentSig, sig)) {
      currentGroup.push(point);
    } else {
      finalizeGroup(currentGroup, currentSig!);
      currentGroup = [point];
      currentSig = sig;
    }
  }

  if (currentGroup.length > 0 && currentSig) {
    finalizeGroup(currentGroup, currentSig);
  }

  return blocks;
}
