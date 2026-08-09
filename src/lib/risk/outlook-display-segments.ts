import type { EnvironmentalDomain, PersonalisedRiskLevel } from "./types";
import { hasValidOutlookBlock } from "./multi-day-outlook";
import {
  OutlookTimeBlock,
  OutlookDayKey,
  formatLocalTimeRange,
} from "./personalised-outlook";

export type SegmentDisplayTrend =
  | "best-available"
  | "peak"
  | "easing"
  | "generally-favourable"
  | "similar";

export interface OutlookSegmentMarker {
  type: "best-available" | "peak" | "current";
  startTime: string; // ISO timestamp
  endTime?: string;   // ISO timestamp
  label: string;
  sourceBlock?: OutlookTimeBlock;
}

export interface OutlookDisplaySegment {
  id: string;
  dayKey: OutlookDayKey;
  startTime: string; // ISO timestamp
  endTime: string;   // ISO timestamp
  displayTimeRange: string; // e.g. "6:00–11:00 am"
  level: Exclude<PersonalisedRiskLevel, "unable"> | "unable";
  primaryDomains: EnvironmentalDomain[];
  displayTrend: SegmentDisplayTrend;
  displayTrendLabel: string;
  sourceBlocks: OutlookTimeBlock[];
  representativeBlock: OutlookTimeBlock;
  markers: OutlookSegmentMarker[];
  isCurrentSegment: boolean;
}

/**
 * Explicit validity helper for OutlookDisplaySegment.
 */
export function hasValidDisplaySegment(
  segment: OutlookDisplaySegment | null | undefined
): boolean {
  return Boolean(
    segment &&
    segment.level !== "unable" &&
    segment.representativeBlock &&
    hasValidOutlookBlock(segment.representativeBlock)
  );
}

/**
 * Determines whether two consecutive OutlookTimeBlocks share the same core environmental context and can be merged.
 */
function canMergeBlocks(
  a: OutlookTimeBlock,
  b: OutlookTimeBlock
): boolean {
  // 1. Level must be identical
  if (a.level !== b.level) return false;

  // 2. Unavailable blocks must never merge
  if (a.level === "unable" || b.level === "unable") return false;

  // 3. Current block must stay distinct
  if (a.isCurrentBlock || b.isCurrentBlock) return false;

  // 4. Action key must be identical
  if (a.actionKey !== b.actionKey) return false;

  // 5. Primary domains must be identical
  if (a.primaryDomains.length !== b.primaryDomains.length) return false;
  const aDomains = [...a.primaryDomains].sort();
  const bDomains = [...b.primaryDomains].sort();
  if (aDomains.some((d, idx) => d !== bDomains[idx])) return false;

  // 6. Severe and high domain counts must be identical
  if (
    a.signature.severeDomainCount !== b.signature.severeDomainCount ||
    a.signature.highDomainCount !== b.signature.highDomainCount
  ) {
    return false;
  }

  return true;
}

/**
 * Resolves the primary visible trend label for a compressed display segment.
 */
export function resolveDisplaySegmentLabel(
  level: OutlookTimeBlock["level"],
  trend: SegmentDisplayTrend,
  hasSustainedPeak: boolean,
  hasSustainedEasing: boolean
): string {
  if (level === "unable") return "Guidance unavailable";

  if (hasSustainedPeak) return "Peak conditions";
  if (hasSustainedEasing) return "Conditions easing";

  if (level === "lower") {
    return "Generally favourable";
  }

  return "Conditions remain similar";
}

/**
 * Helper to determine trailing unavailable coverage notice for an Outlook day.
 */
export function getTrailingUnavailableNotice(
  blocks: OutlookTimeBlock[],
  timezone: string
): {
  hasTrailingUnavailable: boolean;
  validEndLocalTime: string | null;
  noticeText: string | null;
} {
  if (blocks.length === 0) {
    return { hasTrailingUnavailable: false, validEndLocalTime: null, noticeText: null };
  }

  const lastValidIdx = blocks.findLastIndex((b) => b.level !== "unable");
  if (lastValidIdx === -1) {
    return {
      hasTrailingUnavailable: true,
      validEndLocalTime: null,
      noticeText:
        "Personalised forecast guidance is unavailable for this date. Complete air-quality forecast data were not available.",
    };
  }

  if (lastValidIdx < blocks.length - 1) {
    const lastValidBlock = blocks[lastValidIdx];
    const validEndLocalTime = formatLocalTimeRange(
      lastValidBlock.endTime,
      lastValidBlock.endTime,
      timezone
    );
    return {
      hasTrailingUnavailable: true,
      validEndLocalTime,
      noticeText: `Weather outlook only after ${validEndLocalTime}. Temperature and general weather information are available, but complete personalised guidance is not available for the remaining period. It may become available closer to the time.`,
    };
  }

  return { hasTrailingUnavailable: false, validEndLocalTime: null, noticeText: null };
}

/**
 * Compresses canonical OutlookTimeBlocks into presentation-only OutlookDisplaySegments.
 */
export function compressOutlookBlocks({
  blocks,
  timezone,
  bestAvailableBlock,
}: {
  blocks: OutlookTimeBlock[];
  timezone: string;
  bestAvailableBlock?: OutlookTimeBlock | null;
}): OutlookDisplaySegment[] {
  if (blocks.length === 0) return [];

  // Exclude trailing unavailable tail blocks so they collapse into the coverage notice
  const lastValidIdx = blocks.findLastIndex((b) => b.level !== "unable");
  const processableBlocks =
    lastValidIdx === -1 ? [] : blocks.slice(0, lastValidIdx + 1);

  if (processableBlocks.length === 0) return [];

  // Step 1: Initial grouping of consecutive mergeable blocks (by level & primary domain)
  const initialGroups: OutlookTimeBlock[][] = [];
  let currentGroup: OutlookTimeBlock[] = [];

  for (const block of processableBlocks) {
    if (currentGroup.length === 0) {
      currentGroup.push(block);
    } else {
      const prevBlock = currentGroup[currentGroup.length - 1];
      if (canMergeBlocks(prevBlock, block)) {
        currentGroup.push(block);
      } else {
        initialGroups.push(currentGroup);
        currentGroup = [block];
      }
    }
  }
  if (currentGroup.length > 0) {
    initialGroups.push(currentGroup);
  }

  // Step 2: Refine groups based on sustained trend boundaries (>= 2 hours of sustained peak vs easing)
  const refinedGroups: OutlookTimeBlock[][] = [];

  for (const group of initialGroups) {
    if (group.length <= 1 || group[0].level === "unable" || group[0].isCurrentBlock) {
      refinedGroups.push(group);
      continue;
    }

    let subGroup: OutlookTimeBlock[] = [];
    let currentSustainedPhase: "peak" | "easing" | "none" = "none";

    for (let i = 0; i < group.length; i++) {
      const b = group[i];
      const nextB = group[i + 1];
      const prevB = group[i - 1];

      const isPeakSustained =
        b.relativeTrend === "peak" &&
        ((nextB && nextB.relativeTrend === "peak") || (prevB && prevB.relativeTrend === "peak"));
      const isEasingSustained =
        b.relativeTrend === "easing" &&
        ((nextB && nextB.relativeTrend === "easing") || (prevB && prevB.relativeTrend === "easing"));

      const thisPhase: "peak" | "easing" | "none" = isPeakSustained
        ? "peak"
        : isEasingSustained
        ? "easing"
        : "none";

      if (subGroup.length === 0) {
        subGroup.push(b);
        currentSustainedPhase = thisPhase;
      } else {
        if (
          thisPhase === currentSustainedPhase ||
          thisPhase === "none" ||
          currentSustainedPhase === "none"
        ) {
          subGroup.push(b);
          if (currentSustainedPhase === "none") {
            currentSustainedPhase = thisPhase;
          }
        } else {
          refinedGroups.push(subGroup);
          subGroup = [b];
          currentSustainedPhase = thisPhase;
        }
      }
    }

    if (subGroup.length > 0) {
      refinedGroups.push(subGroup);
    }
  }

  // Step 3: Build final OutlookDisplaySegment objects
  const displaySegments: OutlookDisplaySegment[] = [];

  for (const group of refinedGroups) {
    const firstBlock = group[0];
    const lastBlock = group[group.length - 1];

    const startTime = firstBlock.startTime;
    const endTime = lastBlock.endTime;
    const dayKey = firstBlock.dayKey;
    const isCurrentSegment = firstBlock.isCurrentBlock;
    const level = firstBlock.level;
    const primaryDomains = firstBlock.primaryDomains;

    const totalHourlyPoints = group.flatMap((b) => b.hourlyResults).length;
    const hasSustainedPeak =
      totalHourlyPoints >= 2 && group.filter((b) => b.relativeTrend === "peak").length >= 2;
    const hasSustainedEasing =
      totalHourlyPoints >= 2 && group.filter((b) => b.relativeTrend === "easing").length >= 2;

    let displayTrend: SegmentDisplayTrend = "similar";
    if (hasSustainedPeak) {
      displayTrend = "peak";
    } else if (hasSustainedEasing) {
      displayTrend = "easing";
    } else if (level === "lower") {
      displayTrend = "generally-favourable";
    }

    const displayTrendLabel = resolveDisplaySegmentLabel(
      level,
      displayTrend,
      hasSustainedPeak,
      hasSustainedEasing
    );

    const timeRangeStr = formatLocalTimeRange(startTime, endTime, timezone);
    const displayTimeRange = isCurrentSegment
      ? `Now (${timeRangeStr})`
      : timeRangeStr;

    // Build markers (e.g. Best Available marker inside group)
    const markers: OutlookSegmentMarker[] = [];

    if (
      bestAvailableBlock &&
      level !== "unable" &&
      hasValidOutlookBlock(bestAvailableBlock)
    ) {
      const bestMatchingBlock = group.find(
        (b) => b.id === bestAvailableBlock.id && hasValidOutlookBlock(b)
      );
      if (bestMatchingBlock) {
        const bestTimeStr = formatLocalTimeRange(
          bestMatchingBlock.startTime,
          bestMatchingBlock.endTime,
          timezone
        );
        const label =
          group.length === 1
            ? "★ Best available"
            : `★ Best around ${bestTimeStr}`;

        markers.push({
          type: "best-available",
          startTime: bestMatchingBlock.startTime,
          endTime: bestMatchingBlock.endTime,
          label,
          sourceBlock: bestMatchingBlock,
        });
      }
    }

    const segmentId = `segment-${dayKey}-${startTime.slice(0, 16)}`;
    const representativeBlock = firstBlock;

    displaySegments.push({
      id: segmentId,
      dayKey,
      startTime,
      endTime,
      displayTimeRange,
      level,
      primaryDomains,
      displayTrend,
      displayTrendLabel,
      sourceBlocks: group,
      representativeBlock,
      markers,
      isCurrentSegment,
    });
  }

  return displaySegments;
}
