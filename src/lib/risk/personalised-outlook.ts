import type { OutdoorCheckInput } from "@/lib/check-options";
import type {
  CurrentEnvironmentalSample,
  PersonalisedRiskResult,
  PersonalisedRiskLevel,
  ForecastRiskPoint,
  EnvironmentalSnapshot,
} from "./types";
import {
  isMeaningfullyBetter,
  compareComparisonProfiles,
} from "./outlook-comparison";
import { hasValidOutlookGuidance } from "./multi-day-outlook";

import type { OutlookDayKey, OutlookBlockSignature, OutlookTimeBlock } from "./outlook-time-blocks";
export type { OutlookDayKey, OutlookBlockSignature, OutlookTimeBlock };
import {
  getLocalDateString,
  getLocalHour,
  formatLocalTime,
  formatLocalTimeRange,
  getBlockSignature,
  isSameSignature,
  buildRelativeExplanation,
  getNextAlignedHourBoundary,
  createSnapshotFromPoint,
  buildOutlookTimeBlocks,
} from "./outlook-time-blocks";

export {
  getLocalDateString,
  getLocalHour,
  formatLocalTime,
  formatLocalTimeRange,
  getBlockSignature,
  isSameSignature,
  buildRelativeExplanation,
  getNextAlignedHourBoundary,
  createSnapshotFromPoint,
  buildOutlookTimeBlocks,
};

export type SummaryBranch =
  | "current-already-lower"
  | "lower-risk-available"
  | "same-category-easing"
  | "similar-conditions";

export interface PersonalisedDayOutlook {
  dayKey: OutlookDayKey;
  localDate: string; // YYYY-MM-DD
  displayLabel: string; // "Today" | "Tomorrow"
  blocks: OutlookTimeBlock[];
  bestAvailableBlock: OutlookTimeBlock | null;
  bestAvailableNote: string | null;
  currentConditionsAlreadyLower: boolean;
  summaryBranch: SummaryBranch;
  summaryWording: string;
  unavailableHourCount: number;
  totalFutureHourCount: number;
  coverageNotice: string | null;
}

export interface PersonalisedOutlookResult {
  today: PersonalisedDayOutlook;
  tomorrow: PersonalisedDayOutlook;
  updatedAt: string;
  locationDisplayName: string;
  locationTimezone: string;
}

const RISK_LEVEL_RANKS: Record<PersonalisedRiskLevel, number> = {
  lower: 0,
  elevated: 1,
  high: 2,
  "very-high": 3,
  unable: 99,
};

/**
 * Pure Personalised Outlook Resolver.
 * Accepts completed currentResult and completed hourlyResults without re-evaluating risk models.
 */
export function resolvePersonalisedOutlook({
  currentResult,
  currentSnapshot,
  hourlyResults,
  referenceTime,
  timezone,
  input,
  fullSnapshot,
}: {
  currentResult: PersonalisedRiskResult;
  currentSnapshot?: CurrentEnvironmentalSample;
  hourlyResults: ForecastRiskPoint[];
  referenceTime: string;
  timezone: string;
  input: OutdoorCheckInput;
  fullSnapshot?: EnvironmentalSnapshot;
}): PersonalisedOutlookResult {
  const resolvedTimezone = timezone && timezone !== "auto" ? timezone : "UTC";
  const nowObservedAt = currentSnapshot?.observedAt || referenceTime;
  const nowNextHourBoundary = getNextAlignedHourBoundary(nowObservedAt);

  // 1. Construct authoritative Now point
  const nowPoint: ForecastRiskPoint = {
    startAt: nowObservedAt,
    result: currentResult,
    conditions: {
      validAt: nowObservedAt,
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

  const todayLocalDate = getLocalDateString(nowObservedAt, resolvedTimezone);

  // 2. Derive Tomorrow's date string in location timezone
  const nowMs = new Date(nowObservedAt).getTime();
  const tomorrowMs = nowMs + 86400_000;
  const tomorrowLocalDate = getLocalDateString(
    new Date(tomorrowMs).toISOString(),
    resolvedTimezone
  );

  // 3. Filter hourlyResults: exclude past points and points starting before the next aligned hour boundary
  const validHourlyResults: ForecastRiskPoint[] = [];
  const seenSlotKeys = new Set<string>();

  const nextHourBoundaryMs = new Date(nowNextHourBoundary).getTime();

  for (const hr of hourlyResults) {
    if (!hr.startAt) continue;
    const hrLocalDate = getLocalDateString(hr.startAt, resolvedTimezone);
    if (!hrLocalDate) continue;

    if (hrLocalDate !== todayLocalDate && hrLocalDate !== tomorrowLocalDate) {
      continue;
    }

    // Must start at or after the next aligned hour boundary for future forecast blocks
    if (new Date(hr.startAt).getTime() < nextHourBoundaryMs) {
      continue;
    }

    const hrHourSlotKey = `${hrLocalDate}-${getLocalHour(hr.startAt, resolvedTimezone)}`;
    if (seenSlotKeys.has(hrHourSlotKey)) {
      continue;
    }
    seenSlotKeys.add(hrHourSlotKey);

    validHourlyResults.push(hr);
  }

  validHourlyResults.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  // 4. Split into Today and Tomorrow points
  const todayPoints: ForecastRiskPoint[] = [nowPoint];
  const tomorrowPoints: ForecastRiskPoint[] = [];

  for (const hr of validHourlyResults) {
    const hrLocalDate = getLocalDateString(hr.startAt, resolvedTimezone);
    if (hrLocalDate === todayLocalDate) {
      todayPoints.push(hr);
    } else if (hrLocalDate === tomorrowLocalDate) {
      tomorrowPoints.push(hr);
    }
  }

  todayPoints.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  tomorrowPoints.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  // 5. Build Time Blocks
  const todayBlocks = buildOutlookTimeBlocks({
    dayKey: "today",
    points: todayPoints,
    input,
    timezone: resolvedTimezone,
    fullSnapshot,
    nowPointStartAt: nowObservedAt,
  });

  const tomorrowBlocks = buildOutlookTimeBlocks({
    dayKey: "tomorrow",
    points: tomorrowPoints,
    input,
    timezone: resolvedTimezone,
    fullSnapshot,
  });

  // 6. Assign Relative Trends & Select Best Available Period for Today
  const todayCurrentLower = currentResult.level === "lower";
  const currentBlockProfile = todayBlocks.length > 0 ? todayBlocks[0].comparisonProfile : null;

  const todayCandidates = todayBlocks.filter(
    (b) => hasValidOutlookGuidance(b) && !b.isCurrentBlock
  );
  todayCandidates.sort((a, b) =>
    compareComparisonProfiles(a.comparisonProfile, b.comparisonProfile)
  );

  const todayBestBlock = todayCandidates.length > 0 ? todayCandidates[0] : null;

  let todaySummaryBranch: SummaryBranch = "similar-conditions";
  let todaySummaryWording =
    currentResult.level === "unable"
      ? "Personalised forecast guidance is unavailable."
      : todayCandidates.length === 0
      ? "No comparable future period is available."
      : "Conditions are expected to remain similar across the available forecast.";
  let todayNote: string | null =
    currentResult.level === "unable"
      ? null
      : todayCandidates.length === 0
      ? "No comparable future period is available."
      : null;

  if (todayCurrentLower) {
    todaySummaryBranch = "current-already-lower";
    todaySummaryWording = "Looks good right now — No lower-risk alternative is needed.";
    todayNote = "No lower-risk alternative is needed right now.";
  } else if (todayBestBlock && currentBlockProfile) {
    // Check if best block reaches a lower risk category
    const hasLowerCategoryLater = RISK_LEVEL_RANKS[todayBestBlock.level] < RISK_LEVEL_RANKS[currentResult.level];
    const hasMeaningfulImprovement = isMeaningfullyBetter(currentBlockProfile, todayBestBlock.comparisonProfile);

    if (hasLowerCategoryLater) {
      todaySummaryBranch = "lower-risk-available";
      todaySummaryWording = "A lower-risk period may be available later.";
      todayNote = "Looks good overall";
    } else if (hasMeaningfulImprovement) {
      todaySummaryBranch = "same-category-easing";
      const catLabel =
        currentResult.level === "very-high"
          ? "very high"
          : currentResult.level === "high"
          ? "high"
          : "elevated";
      todaySummaryWording = `Conditions may ease later, although the concern category remains ${catLabel}.`;
      todayNote = buildRelativeExplanation(currentBlockProfile, todayBestBlock.comparisonProfile);
    } else {
      todaySummaryBranch = "similar-conditions";
      todaySummaryWording = "Conditions are expected to remain similar across the available forecast.";
      todayNote = "Conditions remain similar across the available forecast.";
    }

    // Assign block relative trends
    if (hasMeaningfulImprovement || hasLowerCategoryLater) {
      todayBestBlock.relativeTrend = "best-available";
      todayBestBlock.relativeTrendLabel = "Best available period";

      for (const block of todayBlocks) {
        if (block === todayBestBlock) continue;
        if (block.level === "unable") {
          block.relativeTrend = "similar";
          block.relativeTrendLabel = "Guidance unavailable";
          continue;
        }
        if (isMeaningfullyBetter(block.comparisonProfile, currentBlockProfile)) {
          block.relativeTrend = "peak";
          block.relativeTrendLabel = "Peak conditions";
        } else if (isMeaningfullyBetter(todayBestBlock.comparisonProfile, block.comparisonProfile)) {
          block.relativeTrend = "easing";
          block.relativeTrendLabel = "Conditions easing";
        } else {
          block.relativeTrend = "similar";
          block.relativeTrendLabel = "Conditions remain similar";
        }
      }
    }
  }

  // 7. Assign Relative Trends & Select Best Available Period for Tomorrow
  const tomorrowCandidates = tomorrowBlocks.filter(hasValidOutlookGuidance);
  tomorrowCandidates.sort((a, b) =>
    compareComparisonProfiles(a.comparisonProfile, b.comparisonProfile)
  );

  const tomorrowBestBlock = tomorrowCandidates.length > 0 ? tomorrowCandidates[0] : null;

  // Find baseline/worst block for Tomorrow
  const tomorrowWorstBlock =
    tomorrowCandidates.length > 0
      ? [...tomorrowCandidates].sort((a, b) =>
          compareComparisonProfiles(b.comparisonProfile, a.comparisonProfile)
        )[0]
      : null;

  let tomorrowSummaryBranch: SummaryBranch = "similar-conditions";
  let tomorrowSummaryWording = "Conditions are expected to remain similar across the available forecast.";
  let tomorrowNote: string | null = null;

  if (tomorrowBestBlock && tomorrowWorstBlock) {
    const hasMeaningfulImprovement = isMeaningfullyBetter(
      tomorrowWorstBlock.comparisonProfile,
      tomorrowBestBlock.comparisonProfile
    );

    if (hasMeaningfulImprovement) {
      const hasLowerCategory = RISK_LEVEL_RANKS[tomorrowBestBlock.level] < RISK_LEVEL_RANKS[tomorrowWorstBlock.level];
      if (hasLowerCategory) {
        tomorrowSummaryBranch = "lower-risk-available";
        tomorrowSummaryWording = "A lower-risk period may be available tomorrow.";
      } else {
        tomorrowSummaryBranch = "same-category-easing";
        const catLabel =
          tomorrowBestBlock.level === "very-high"
            ? "very high"
            : tomorrowBestBlock.level === "high"
            ? "high"
            : "elevated";
        tomorrowSummaryWording = `Conditions may ease tomorrow, although the concern category remains ${catLabel}.`;
      }

      tomorrowBestBlock.relativeTrend = "best-available";
      tomorrowBestBlock.relativeTrendLabel = "Best available period";

      for (const block of tomorrowBlocks) {
        if (block === tomorrowBestBlock) continue;
        if (block.level === "unable") {
          block.relativeTrend = "similar";
          block.relativeTrendLabel = "Guidance unavailable";
          continue;
        }
        if (block === tomorrowWorstBlock) {
          block.relativeTrend = "peak";
          block.relativeTrendLabel = "Peak conditions";
        } else if (
          isMeaningfullyBetter(tomorrowWorstBlock.comparisonProfile, block.comparisonProfile)
        ) {
          block.relativeTrend = "easing";
          block.relativeTrendLabel = "Conditions easing";
        } else {
          block.relativeTrend = "similar";
          block.relativeTrendLabel = "Conditions remain similar";
        }
      }

      tomorrowNote = buildRelativeExplanation(
        tomorrowWorstBlock.comparisonProfile,
        tomorrowBestBlock.comparisonProfile
      );
    } else {
      tomorrowSummaryBranch = "similar-conditions";
      tomorrowSummaryWording = "Conditions are expected to remain similar throughout the available forecast.";
      tomorrowNote = "Conditions remain similar throughout the available forecast.";
    }
  }

  // 8. Determine End-of-Day Coverage Notice for Tomorrow
  let tomorrowCoverageNotice: string | null = null;
  if (tomorrowPoints.length > 0) {
    const lastPoint = tomorrowPoints[tomorrowPoints.length - 1];
    const lastHour = getLocalHour(lastPoint.startAt, resolvedTimezone);
    if (lastHour < 22) {
      const endHourStr = formatLocalTime(
        new Date(new Date(lastPoint.startAt).getTime() + 3600_000).toISOString(),
        resolvedTimezone
      );
      tomorrowCoverageNotice = `Forecast coverage available until ${endHourStr}.`;
    }
  }

  return {
    today: {
      dayKey: "today",
      localDate: todayLocalDate,
      displayLabel: "Today",
      blocks: todayBlocks,
      bestAvailableBlock: todayBestBlock,
      bestAvailableNote: todayNote,
      currentConditionsAlreadyLower: todayCurrentLower,
      summaryBranch: todaySummaryBranch,
      summaryWording: todaySummaryWording,
      unavailableHourCount: todayBlocks.filter((b) => b.level === "unable").length,
      totalFutureHourCount: todayPoints.length,
      coverageNotice: null,
    },
    tomorrow: {
      dayKey: "tomorrow",
      localDate: tomorrowLocalDate,
      displayLabel: "Tomorrow",
      blocks: tomorrowBlocks,
      bestAvailableBlock: tomorrowBestBlock,
      bestAvailableNote: tomorrowNote,
      currentConditionsAlreadyLower: false,
      summaryBranch: tomorrowSummaryBranch,
      summaryWording: tomorrowSummaryWording,
      unavailableHourCount: tomorrowBlocks.filter((b) => b.level === "unable").length,
      totalFutureHourCount: tomorrowPoints.length,
      coverageNotice: tomorrowCoverageNotice,
    },
    updatedAt: referenceTime,
    locationDisplayName:
      fullSnapshot?.resolvedLocation ||
      currentSnapshot?.observedAt ||
      input.location,
    locationTimezone: resolvedTimezone,
  };
}
