import type { PersonalisedRiskLevel, ForecastRiskPoint, PersonalisedRiskResult, EnvironmentalSnapshot, OutlookAvailability } from "./types";
import {
  OutlookTimeBlock,
  getLocalDateString,
  formatLocalTime,
  buildOutlookTimeBlocks,
} from "./outlook-time-blocks";
import {
  buildOutlookComparisonProfile,
  isMeaningfullyBetter,
} from "./outlook-comparison";

export type OutlookViewMode = "day" | "three-days" | "week";

export type DailyCoverageStatus = "complete" | "partial" | "unavailable";

export interface DailyOutlookSummary {
  localDateKey: string;     // e.g. "2026-08-06"
  date: string;             // e.g. "2026-08-06"

  dayLabel: string;         // e.g. "Today", "Tomorrow", "Sat", "Sun"
  shortDateLabel: string;   // e.g. "Thu 6 Aug"
  fullDateLabel: string;    // e.g. "Thursday, 6 August"

  isToday: boolean;
  isTomorrow: boolean;

  coverage: DailyCoverageStatus;
  coverageNotice?: string | null;
  availability: OutlookAvailability;
  weatherCoverageEnd?: string | null;
  personalisedGuidanceCoverageEnd?: string | null;

  bestAvailableBlock: OutlookTimeBlock | null;
  bestAvailableLevel: PersonalisedRiskLevel | null;

  temperatureMinC: number | null;
  temperatureMaxC: number | null;

  primarySummary: string;
  mainFactor: string;
  mainFactors: string[];

  validHourCount: number;
  unavailableHourCount: number;
  hourlyPoints: ForecastRiskPoint[];
  blocks: OutlookTimeBlock[];
}

export interface MultiDayOutlookResult {
  days: DailyOutlookSummary[];
  todayDateKey: string;
  locationTimezone: string;
  updatedAt: string;
}

/**
 * Explicit validity helper for ForecastRiskPoint.
 */
export function hasValidForecastPoint(
  point: ForecastRiskPoint | null | undefined
): boolean {
  return Boolean(
    point &&
    point.result &&
    point.result.level !== "unable"
  );
}

/**
 * Explicit validity helper for OutlookTimeBlock.
 */
export function hasValidOutlookBlock(
  block: OutlookTimeBlock | null | undefined
): boolean {
  return Boolean(
    block &&
    block.level !== "unable" &&
    block.representativePoint &&
    hasValidForecastPoint(block.representativePoint)
  );
}

export const hasValidOutlookGuidance = hasValidOutlookBlock;
export const hasValidPersonalisedGuidance = hasValidOutlookBlock;
export const isEligibleForBestAvailable = hasValidOutlookBlock;

/**
 * Formats a local date string (YYYY-MM-DD) into Australian English labels.
 */
export function formatLocalDateLabels(dateStr: string, timezone: string, isToday: boolean, isTomorrow: boolean): {
  dayLabel: string;
  shortDateLabel: string;
  fullDateLabel: string;
} {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const weekdayShort = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short" }).format(dateObj);
    const weekdayLong = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "long" }).format(dateObj);
    const monthShort = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", month: "short" }).format(dateObj);
    const monthLong = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", month: "long" }).format(dateObj);

    const dayNum = dateObj.getUTCDate();

    const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : weekdayShort;
    const shortDateLabel = `${weekdayShort} ${dayNum} ${monthShort}`;
    const fullDateLabel = `${weekdayLong}, ${dayNum} ${monthLong}`;

    return { dayLabel, shortDateLabel, fullDateLabel };
  } catch {
    return {
      dayLabel: isToday ? "Today" : isTomorrow ? "Tomorrow" : dateStr,
      shortDateLabel: dateStr,
      fullDateLabel: dateStr,
    };
  }
}

/**
 * Derives a deterministic main factor summary string from completed domain assessments or primary domains.
 */
export function resolveMainFactor(bestBlock: OutlookTimeBlock | null, level: PersonalisedRiskLevel | null): string {
  if (!bestBlock || level === "unable") return "Guidance unavailable";
  if (level === "lower") return "Conditions generally favourable";

  const domains = bestBlock.primaryDomains || [];
  const hasHeat = domains.includes("thermal");
  const hasUv = domains.includes("uv");
  const hasParticulate = domains.includes("particulate");

  if (hasHeat && hasUv) return "Heat & Sun protection";
  if (hasHeat) return "Heat exposure";
  if (hasUv) return "Sun protection";
  if (hasParticulate) return "Air quality";

  return bestBlock.actionTitle || "Environmental guidance";
}

/**
 * Generates seven local calendar date strings (YYYY-MM-DD) starting from referenceTime in target timezone.
 */
export function getSevenLocalCalendarDates(referenceTime: string, timezone: string): string[] {
  const dates: string[] = [];

  // Derive today's local YYYY-MM-DD
  const todayStr = getLocalDateString(referenceTime, timezone);
  if (!todayStr) return [];
  dates.push(todayStr);

  const [tYear, tMonth, tDay] = todayStr.split("-").map(Number);
  const baseUtc = new Date(Date.UTC(tYear, tMonth - 1, tDay, 12, 0, 0));

  for (let i = 1; i < 7; i++) {
    const nextUtc = new Date(baseUtc.getTime() + i * 86400_000);
    const yyyy = nextUtc.getUTCFullYear();
    const mm = String(nextUtc.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(nextUtc.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  return dates;
}

/**
 * Builds multi-day Outlook summaries for up to 7 local calendar dates.
 * Authoritative: accepts currentResult and currentSnapshot for Today's initial point.
 */
export function buildMultiDayOutlook({
  currentResult,
  currentSnapshot,
  hourlyResults,
  referenceTime,
  timezone,
}: {
  currentResult?: PersonalisedRiskResult | null;
  currentSnapshot?: EnvironmentalSnapshot["current"] | null;
  hourlyResults: ForecastRiskPoint[];
  referenceTime: string;
  timezone: string;
}): MultiDayOutlookResult {
  const resolvedTz = timezone && timezone !== "auto" ? timezone : "UTC";
  const sevenDates = getSevenLocalCalendarDates(referenceTime, resolvedTz);

  const todayDateKey = sevenDates[0] || getLocalDateString(referenceTime, resolvedTz);
  const tomorrowDateKey = sevenDates[1] || "";

  // Group hourly points by location-local date
  const pointsByDate = new Map<string, ForecastRiskPoint[]>();
  for (const dateKey of sevenDates) {
    pointsByDate.set(dateKey, []);
  }

  // Prepend authoritative nowPoint for Today if currentResult is provided
  if (currentResult) {
    const nowPoint: ForecastRiskPoint = {
      startAt: referenceTime,
      result: currentResult,
      conditions: {
        validAt: referenceTime,
        airTemperatureC: currentSnapshot?.airTemperatureC,
        apparentTemperatureC: currentSnapshot?.apparentTemperatureC,
        relativeHumidityPercent: currentSnapshot?.relativeHumidityPercent,
        windSpeedKph: currentSnapshot?.windSpeedKph,
        uvIndex: currentSnapshot?.uvIndex,
        pm25UgM3: currentSnapshot?.pm25UgM3,
        pm10UgM3: currentSnapshot?.pm10UgM3,
        pollenLevel: currentSnapshot?.pollenLevel,
        dustLevel: currentSnapshot?.dustLevel,
        dustUgM3: currentSnapshot?.dustUgM3,
        pm25UsAqi: currentSnapshot?.pm25UsAqi,
        pm10UsAqi: currentSnapshot?.pm10UsAqi,
      },
    };
    if (pointsByDate.has(todayDateKey)) {
      pointsByDate.get(todayDateKey)!.push(nowPoint);
    }
  }

  for (const point of hourlyResults) {
    const pDateKey = getLocalDateString(point.startAt, resolvedTz);
    if (pointsByDate.has(pDateKey)) {
      pointsByDate.get(pDateKey)!.push(point);
    }
  }

  const days: DailyOutlookSummary[] = [];

  for (const dateKey of sevenDates) {
    const points = pointsByDate.get(dateKey) || [];
    const isToday = dateKey === todayDateKey;
    const isTomorrow = dateKey === tomorrowDateKey;

    const labels = formatLocalDateLabels(dateKey, resolvedTz, isToday, isTomorrow);

    const validPoints = points.filter((p) => p.result && p.result.level !== "unable");
    const unavailablePoints = points.filter((p) => !p.result || p.result.level === "unable");

    const validHourCount = validPoints.length;
    const unavailableHourCount = unavailablePoints.length;

    let temperatureMinC: number | null = null;
    let temperatureMaxC: number | null = null;
    let weatherCoverageEnd: string | null = null;
    let personalisedGuidanceCoverageEnd: string | null = null;

    const temps = points
      .map((p) => p.conditions.airTemperatureC ?? p.conditions.apparentTemperatureC)
      .filter((t): t is number => typeof t === "number" && !isNaN(t));

    if (temps.length > 0) {
      temperatureMinC = Math.round(Math.min(...temps));
      temperatureMaxC = Math.round(Math.max(...temps));
      const lastTempPoint = points.findLast(
        (p) => typeof (p.conditions.airTemperatureC ?? p.conditions.apparentTemperatureC) === "number"
      );
      if (lastTempPoint) {
        weatherCoverageEnd = formatLocalTime(lastTempPoint.startAt, resolvedTz);
      }
    }

    if (validHourCount > 0) {
      const lastValidPoint = validPoints[validPoints.length - 1];
      personalisedGuidanceCoverageEnd = formatLocalTime(lastValidPoint.startAt, resolvedTz);
    }

    const availability: OutlookAvailability =
      validHourCount > 0
        ? "personalised"
        : temps.length > 0
        ? "weather-only"
        : "temporarily-unavailable";

    let coverage: DailyCoverageStatus = "complete";
    let coverageNotice: string | null = null;

    if (availability === "weather-only") {
      coverage = "unavailable";
      coverageNotice =
        "Complete personalised guidance is not available this far ahead. It may become available closer to the date.";
    } else if (availability === "temporarily-unavailable") {
      coverage = "unavailable";
      coverageNotice = "Environmental data could not be refreshed. Try again in a moment.";
    } else if (validHourCount < 24 || unavailableHourCount > 0) {
      coverage = "partial";
      coverageNotice = `Complete personalised guidance available until ${personalisedGuidanceCoverageEnd}.`;
    }

    // Rank Best Available Period strictly from valid points for personalised days
    let bestAvailableBlock: OutlookTimeBlock | null = null;
    let bestAvailableLevel: PersonalisedRiskLevel | null = null;

    if (availability === "personalised") {
      const eligibleValidPoints = validPoints.filter(
        (p) => p.result && p.result.level !== "unable"
      );

      if (eligibleValidPoints.length > 0) {
        const sortedValid = [...eligibleValidPoints].sort((a, b) => {
          const levelRanks: Record<PersonalisedRiskLevel, number> = {
            lower: 0,
            elevated: 1,
            high: 2,
            "very-high": 3,
            unable: 99,
          };
          const rankA = levelRanks[a.result.level] ?? 50;
          const rankB = levelRanks[b.result.level] ?? 50;
          if (rankA !== rankB) return rankA - rankB;
          return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        });

        const bestCandidate = sortedValid[0];
        const worstCandidate = sortedValid[sortedValid.length - 1];

        bestAvailableLevel = bestCandidate.result.level;

        const levelRanks: Record<PersonalisedRiskLevel, number> = {
          lower: 0,
          elevated: 1,
          high: 2,
          "very-high": 3,
          unable: 99,
        };
        const hasRiskRankDifference =
          (levelRanks[worstCandidate.result.level] ?? 50) >
          (levelRanks[bestCandidate.result.level] ?? 50);

        const hasMeaningfulImprovement =
          hasRiskRankDifference ||
          isMeaningfullyBetter(
            buildOutlookComparisonProfile(worstCandidate),
            buildOutlookComparisonProfile(bestCandidate)
          );

        const canPresentAsBest =
          isToday ||
          (eligibleValidPoints.length >= 2 && hasMeaningfulImprovement);

        if (
          canPresentAsBest &&
          bestCandidate &&
          bestCandidate.result.level !== "unable"
        ) {
          const bestStart = bestCandidate.startAt;
          const bestEnd = new Date(new Date(bestStart).getTime() + 3600_000).toISOString();

          bestAvailableBlock = {
            id: `best-${dateKey}-${bestStart.slice(0, 16)}`,
            dayKey: isToday ? "today" : isTomorrow ? "tomorrow" : dateKey,
            startTime: bestStart,
            endTime: bestEnd,
            displayTimeRange: formatLocalTime(bestStart, resolvedTz),
            level: bestCandidate.result.level,
            availability: "personalised",
            actionKey: bestCandidate.result.action,
            actionTitle: bestCandidate.result.recommendation?.title || "Outdoor Guidance",
            primaryDomains: bestCandidate.result.v2Result?.primaryDomains || [],
            hourlyResults: [bestCandidate],
            isCurrentBlock: false,
            isBriefPeriod: true,
            summary: bestCandidate.result.recommendation?.explanation || "",
            representativePoint: bestCandidate,
            preparationSuggestions: [],
            signature: {
              level: bestCandidate.result.level,
              actionKey: bestCandidate.result.action,
              primaryDomains: bestCandidate.result.v2Result?.primaryDomains || [],
              severeDomainCount: 0,
              highDomainCount: 0,
              elevatedDomainCount: 0,
            },
            comparisonProfile: buildOutlookComparisonProfile(bestCandidate),
            relativeTrend: "best-available",
            relativeTrendLabel: "Best available period",
          };
        }
      }
    }

    const blocks = buildOutlookTimeBlocks({
      dayKey: isToday ? "today" : isTomorrow ? "tomorrow" : dateKey,
      localDateKey: dateKey,
      points,
      timezone: resolvedTz,
      nowPointStartAt: isToday && currentResult ? referenceTime : undefined,
    });

    let mainFactor = "";
    if (availability === "personalised") {
      if (bestAvailableBlock) {
        mainFactor = resolveMainFactor(bestAvailableBlock, bestAvailableLevel);
      } else if (validPoints.length > 0) {
        const repPoint = validPoints[0];
        const repBlock = blocks.find((b) => b.level !== "unable") || null;
        mainFactor = resolveMainFactor(repBlock, repPoint.result.level);
      }
    }

    const primarySummary =
      availability === "weather-only"
        ? "Complete personalised guidance is not available for this date."
        : availability === "temporarily-unavailable"
        ? "Environmental data could not be refreshed."
        : bestAvailableBlock
        ? `${bestAvailableBlock.actionTitle}.`
        : validHourCount === 1
        ? "Limited personalised coverage available."
        : "Conditions are expected to remain similar across the available forecast.";

    days.push({
      localDateKey: dateKey,
      date: dateKey,
      dayLabel: labels.dayLabel,
      shortDateLabel: labels.shortDateLabel,
      fullDateLabel: labels.fullDateLabel,
      isToday,
      isTomorrow,
      coverage,
      coverageNotice,
      availability,
      weatherCoverageEnd,
      personalisedGuidanceCoverageEnd,
      bestAvailableBlock,
      bestAvailableLevel,
      temperatureMinC,
      temperatureMaxC,
      primarySummary,
      mainFactor,
      mainFactors: mainFactor ? [mainFactor] : [],
      validHourCount,
      unavailableHourCount,
      hourlyPoints: points,
      blocks,
    });
  }

  return {
    days,
    todayDateKey,
    locationTimezone: resolvedTz,
    updatedAt: referenceTime,
  };
}
