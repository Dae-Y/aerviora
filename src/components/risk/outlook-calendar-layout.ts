import type { OutlookTimeBlock } from "@/lib/risk/personalised-outlook";
import {
  compressOutlookBlocks,
  type OutlookDisplaySegment,
} from "@/lib/risk/outlook-display-segments";
import { getLocalHour, formatLocalTime } from "@/lib/risk/personalised-outlook";

export const PIXELS_PER_HOUR = 68;
export const MIN_BLOCK_HEIGHT_PX = 52;

export interface PositionedOutlookSegment {
  segment: OutlookDisplaySegment;
  topPx: number;
  heightPx: number;
  startHourLocal: number;
  endHourLocal: number;
  durationHours: number;
}

export interface HourGridLabel {
  hour: number;
  label: string;
  topPx: number;
  isoTime: string;
}

export interface CalendarLayoutDetails {
  startHour: number;
  endHour: number;
  totalHours: number;
  totalHeightPx: number;
  positionedSegments: PositionedOutlookSegment[];
  positionedBlocks: PositionedOutlookSegment[]; // Alias for backward compatibility
  hourLabels: HourGridLabel[];
  nowLineTopPx: number | null;
}

/**
 * Computes presentation-only layout positioning for calendar time axis and proportional display segments.
 */
export function computeCalendarLayout({
  segments: inputSegments,
  blocks: inputBlocks,
  timezone,
  referenceTime,
  isToday,
}: {
  segments?: OutlookDisplaySegment[];
  blocks?: OutlookTimeBlock[];
  timezone: string;
  referenceTime?: string;
  isToday: boolean;
}): CalendarLayoutDetails {
  const segments =
    inputSegments ||
    (inputBlocks ? compressOutlookBlocks({ blocks: inputBlocks, timezone }) : []);

  if (segments.length === 0) {
    return {
      startHour: 0,
      endHour: 24,
      totalHours: 24,
      totalHeightPx: 24 * PIXELS_PER_HOUR,
      positionedSegments: [],
      positionedBlocks: [],
      hourLabels: [],
      nowLineTopPx: null,
    };
  }

  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  const firstStartMs = new Date(firstSeg.startTime).getTime();
  const lastEndMs = new Date(lastSeg.endTime).getTime();

  // Round start time down to the start of the hour
  const startDate = new Date(firstStartMs);
  startDate.setMinutes(0, 0, 0);
  const timelineStartMs = startDate.getTime();

  // Round end time up to the end of the hour
  const endDate = new Date(lastEndMs);
  if (endDate.getMinutes() > 0 || endDate.getSeconds() > 0) {
    endDate.setHours(endDate.getHours() + 1, 0, 0, 0);
  }
  const timelineEndMs = endDate.getTime();

  const totalDurationMs = Math.max(timelineEndMs - timelineStartMs, 3600_000);
  const totalHours = Math.ceil(totalDurationMs / 3600_000);
  const totalHeightPx = totalHours * PIXELS_PER_HOUR;

  // Calculate positioned segments
  const positionedSegments: PositionedOutlookSegment[] = segments.map((segment) => {
    const startMs = new Date(segment.startTime).getTime();
    const endMs = new Date(segment.endTime).getTime();

    const durationMs = Math.max(endMs - startMs, 1800_000); // min 30m
    const durationHours = Math.max(durationMs / 3600_000, 0.5);

    const topPx = Math.max(0, ((startMs - timelineStartMs) / 3600_000) * PIXELS_PER_HOUR);
    const rawHeightPx = (durationMs / 3600_000) * PIXELS_PER_HOUR;
    const heightPx = Math.max(rawHeightPx, MIN_BLOCK_HEIGHT_PX);

    const startHourLocal = getLocalHour(segment.startTime, timezone);
    const endHourLocal = getLocalHour(segment.endTime, timezone);

    return {
      segment,
      topPx,
      heightPx,
      startHourLocal,
      endHourLocal,
      durationHours,
    };
  });

  // Calculate hour grid labels
  const hourLabels: HourGridLabel[] = [];
  for (let i = 0; i <= totalHours; i++) {
    const hourMs = timelineStartMs + i * 3600_000;
    const hourIso = new Date(hourMs).toISOString();
    const hourNum = getLocalHour(hourIso, timezone);
    const label = formatLocalTime(hourIso, timezone);

    hourLabels.push({
      hour: hourNum,
      label,
      topPx: i * PIXELS_PER_HOUR,
      isoTime: hourIso,
    });
  }

  // Calculate Now line position for Today
  let nowLineTopPx: number | null = null;
  if (isToday && referenceTime) {
    const refMs = new Date(referenceTime).getTime();
    if (refMs >= timelineStartMs && refMs <= timelineEndMs) {
      nowLineTopPx = Math.max(0, ((refMs - timelineStartMs) / 3600_000) * PIXELS_PER_HOUR);
    }
  }

  return {
    startHour: getLocalHour(startDate.toISOString(), timezone),
    endHour: getLocalHour(endDate.toISOString(), timezone),
    totalHours,
    totalHeightPx,
    positionedSegments,
    positionedBlocks: positionedSegments,
    hourLabels,
    nowLineTopPx,
  };
}
