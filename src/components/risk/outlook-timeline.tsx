"use client";

import { useEffect, useRef } from "react";
import type { OutlookTimeBlock } from "@/lib/risk/personalised-outlook";
import {
  type OutlookDisplaySegment,
  getTrailingUnavailableNotice,
  compressOutlookBlocks,
} from "@/lib/risk/outlook-display-segments";
import { computeCalendarLayout } from "./outlook-calendar-layout";

export interface OutlookTimelineProps {
  blocks: OutlookTimeBlock[];
  timezone: string;
  bestAvailableBlock?: OutlookTimeBlock | null;
  onSelectBlock: (block: OutlookTimeBlock, triggerEl: HTMLElement | null) => void;
  isToday?: boolean;
  coverageNotice?: string | null;
  referenceTime?: string;
  selectedDateKey?: string;
}

export function getSegmentToneStyle(level: OutlookDisplaySegment["level"]): {
  card: string;
  badge: string;
  badgeText: string;
  borderLeft: string;
} {
  switch (level) {
    case "lower":
      return {
        card: "bg-teal-500/[0.07] border-teal-700/20 hover:bg-teal-500/[0.14] text-[#0A2928]",
        badge: "bg-teal-900/10 text-[#1F5A55] border-[#1F5A55]/20",
        badgeText: "Lower concern",
        borderLeft: "border-l-4 border-l-teal-600",
      };
    case "elevated":
      return {
        card: "bg-amber-400/[0.09] border-amber-500/25 hover:bg-amber-400/[0.16] text-[#0A2928]",
        badge: "bg-amber-500/15 text-amber-900 border-amber-500/30",
        badgeText: "Elevated concern",
        borderLeft: "border-l-4 border-l-amber-500",
      };
    case "high":
      return {
        card: "bg-orange-500/[0.09] border-orange-500/25 hover:bg-orange-500/[0.16] text-[#0A2928]",
        badge: "bg-orange-500/15 text-orange-950 border-orange-500/30",
        badgeText: "High concern",
        borderLeft: "border-l-4 border-l-orange-500",
      };
    case "very-high":
      return {
        card: "bg-rose-500/[0.09] border-rose-500/25 hover:bg-rose-500/[0.16] text-[#0A2928]",
        badge: "bg-rose-500/15 text-rose-950 border-rose-500/30",
        badgeText: "Very high risk",
        borderLeft: "border-l-4 border-l-rose-600",
      };
    case "unable":
    default:
      return {
        card: "bg-gray-500/[0.07] border-gray-400/20 hover:bg-gray-500/[0.12] text-[#0A2928]",
        badge: "bg-gray-500/15 text-gray-800 border-gray-400/30",
        badgeText: "Guidance unavailable",
        borderLeft: "border-l-4 border-l-gray-400",
      };
  }
}

export const getBlockToneStyle = getSegmentToneStyle;

export function OutlookTimeline({
  blocks,
  timezone,
  bestAvailableBlock,
  onSelectBlock,
  isToday = false,
  selectedDateKey,
}: OutlookTimelineProps) {
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const trailingNotice = getTrailingUnavailableNotice(blocks, timezone);
  const displaySegments = compressOutlookBlocks({
    blocks,
    timezone,
    bestAvailableBlock,
  });

  const layout = computeCalendarLayout({
    segments: displaySegments,
    referenceTime: isToday ? new Date().toISOString() : undefined,
    timezone,
    isToday,
  });

  useEffect(() => {
    if (!timelineScrollRef.current) return;
    timelineScrollRef.current.scrollTop = 0;
  }, [selectedDateKey]);

  if (blocks.length === 0 || displaySegments.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
        No forecast guidance available for this timeline.
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Scrollable Day Timeline Viewport */}
      <div
        ref={timelineScrollRef}
        role="region"
        aria-label="Hourly personalised outlook timeline"
        tabIndex={0}
        data-outlook-timeline-scroll="true"
        className="w-full overflow-y-auto overscroll-y-contain rounded-2xl border border-[#0A2928]/10 bg-white/40 shadow-xs p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]"
        style={{ height: "clamp(420px, 62svh, 640px)" }}
      >
        {/* DESKTOP / TABLET: Proportional Hourly Canvas */}
        <div
          data-slot="calendar-canvas-desktop"
          className="hidden md:block w-full overflow-x-auto"
        >
          <div className="min-w-[540px] flex gap-3 relative pt-2 pb-2">
            {/* Left Time Gutter */}
            <div
              className="w-16 flex-shrink-0 relative text-right pr-2 text-xs font-bold text-[#0A2928]/60 select-none"
              style={{ height: `${layout.totalHeightPx}px` }}
            >
              {/* Hourly Time Labels */}
              {layout.hourLabels.map((lbl) => (
                <div
                  key={lbl.isoTime}
                  className="absolute right-2 transform -translate-y-1/2"
                  style={{ top: `${lbl.topPx}px` }}
                >
                  {lbl.label}
                </div>
              ))}

              {/* Compact Left-Gutter NOW Marker (Today Only, Gutter-Canvas Boundary) */}
              {isToday && layout.nowLineTopPx !== null && (
                <div
                  data-current-time-marker="true"
                  data-current-time-marker-position="gutter-boundary"
                  aria-hidden="true"
                  style={{ top: `${layout.nowLineTopPx}px` }}
                  className="absolute right-0 z-30 transform translate-x-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <span className="bg-[#1F5A55] text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                    NOW
                  </span>
                </div>
              )}
            </div>

            {/* Right Calendar Canvas (Subtle Hourly Grid Lines) */}
            <div
              className="flex-grow relative border-l border-[#0A2928]/10 rounded-xl overflow-hidden bg-white/50"
              style={{ height: `${layout.totalHeightPx}px` }}
            >
              {/* Horizontal Grid Lines */}
              {layout.hourLabels.map((lbl) => (
                <div
                  key={`line-${lbl.isoTime}`}
                  className="absolute left-0 right-0 border-t border-[#0A2928]/10"
                  style={{ top: `${lbl.topPx}px` }}
                />
              ))}

              {/* Positioned Compressed Display Segments */}
              {layout.positionedSegments.map(({ segment, topPx, heightPx }) => {
                if (segment.level === "unable") {
                  return (
                    <div
                      key={segment.id}
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                      }}
                      className="absolute left-2 right-2 px-3.5 py-2 rounded-xl bg-gray-100/90 border border-dashed border-gray-300 shadow-xs flex items-center justify-between text-left text-xs font-semibold text-gray-700 z-10 pointer-events-none select-none"
                    >
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Weather outlook only
                      </span>
                      <span className="text-gray-500 font-mono text-[11px]">{segment.displayTimeRange}</span>
                    </div>
                  );
                }

                const tone = getSegmentToneStyle(segment.level);
                const isCompact = heightPx < 84;
                const isCurrent = segment.representativeBlock?.isCurrentBlock ?? false;
                const visibleTimeRange = segment.displayTimeRange.replace(/^Now \((.*)\)$/, "$1");

                const canonicalLabel =
                  segment.level === "lower"
                    ? "Lower environmental concern"
                    : segment.level === "elevated"
                    ? "Elevated environmental concern"
                    : segment.level === "high"
                    ? "High environmental concern"
                    : "Very high environmental risk";

                const accessibleLabel = `${isCurrent ? "Current period. " : ""}${visibleTimeRange}. ${canonicalLabel}. ${segment.displayTrendLabel}. View details.`;

                return (
                  <button
                    key={segment.id}
                    type="button"
                    id={`segment-trigger-${segment.id}`}
                    data-top={topPx}
                    data-height={heightPx}
                    onClick={(e) => onSelectBlock(segment.representativeBlock, e.currentTarget)}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                    }}
                    className={`absolute left-2 right-2 px-3.5 py-2.5 rounded-xl border transition-all shadow-xs flex flex-col justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] cursor-pointer z-10 ${tone.card} ${tone.borderLeft}`}
                    aria-label={accessibleLabel}
                  >
                    {isCompact ? (
                      /* COMPACT SEGMENT PRESENTATION */
                      <div className="flex items-center justify-between gap-2 min-w-0 h-full">
                        <div className="min-w-0 flex-1 flex items-baseline gap-2 truncate">
                          <span className="font-bold text-xs uppercase tracking-wider text-[#0A2928] truncate">
                            {tone.badgeText}
                          </span>
                          <span className="text-[11px] font-semibold text-[#0A2928]/80 truncate">
                            · {segment.displayTrendLabel}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#0A2928]/70 flex-shrink-0">
                          {visibleTimeRange}
                        </span>
                      </div>
                    ) : (
                      /* REGULAR SEGMENT PRESENTATION */
                      <>
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-xs uppercase tracking-wider text-[#0A2928]/75 truncate">
                              {tone.badgeText}
                            </span>
                            <span className="text-xs font-bold text-[#0A2928]/80">
                              {visibleTimeRange}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm sm:text-base text-[#0A2928] truncate">
                              {segment.displayTrendLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-[#1F5A55] pt-1">
                          <span className="text-[11px] font-medium text-[#0A2928]/70">
                            {segment.sourceBlocks.length > 1
                              ? `${segment.sourceBlocks.length} combined periods`
                              : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>View details</span>
                            <span>→</span>
                          </span>
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MOBILE: Natural Page Scroll Timeline Rail */}
        <div
          data-slot="calendar-rail-mobile"
          className="block md:hidden relative pl-7 space-y-4"
        >
          {/* Vertical Rail Line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#0A2928]/15 rounded-full" />

          {/* Compact Mobile NOW Marker (Today Only) */}
          {isToday && layout.nowLineTopPx !== null && (
            <div
              data-current-time-marker="true"
              data-current-time-marker-position="gutter-boundary"
              aria-hidden="true"
              className="flex items-center gap-1.5 pb-1 pointer-events-none"
            >
              <span className="bg-[#1F5A55] text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                NOW
              </span>
            </div>
          )}

          {displaySegments.map((segment) => {
            if (segment.level === "unable") {
              return (
                <div key={segment.id} className="relative py-1">
                  <div className="p-3 rounded-xl bg-gray-100/90 border border-dashed border-gray-300 text-xs font-semibold text-gray-700 flex items-center justify-between gap-2 shadow-xs select-none">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Weather outlook only
                    </span>
                    <span className="text-gray-500 font-mono text-[11px]">{segment.displayTimeRange}</span>
                  </div>
                </div>
              );
            }

            const tone = getSegmentToneStyle(segment.level);
            const visibleTimeRange = segment.displayTimeRange.replace(/^Now \((.*)\)$/, "$1");

            return (
              <div key={segment.id} className="relative group">
                {/* Rail Node Indicator */}
                <div
                  className={`absolute -left-7 top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                    segment.level === "lower"
                      ? "bg-teal-600"
                      : segment.level === "elevated"
                      ? "bg-amber-500"
                      : segment.level === "high"
                      ? "bg-orange-500"
                      : segment.level === "very-high"
                      ? "bg-rose-600"
                      : "bg-gray-400"
                  }`}
                />

                <button
                  type="button"
                  id={`mobile-segment-trigger-${segment.id}`}
                  onClick={(e) => onSelectBlock(segment.representativeBlock, e.currentTarget)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all shadow-xs flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] cursor-pointer ${tone.card} ${tone.borderLeft}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-xs text-[#0A2928]">
                      {visibleTimeRange}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-white/80">
                      {tone.badgeText}
                    </span>
                  </div>

                  <p className="font-extrabold text-sm text-[#0A2928]">
                    {segment.displayTrendLabel}
                  </p>

                  <div className="flex items-center justify-between text-xs font-bold text-[#1F5A55] pt-1">
                    <span>View details</span>
                    <span>→</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {trailingNotice.hasTrailingUnavailable && trailingNotice.noticeText && (
        <div
          data-slot="trailing-unavailable-notice"
          className="p-4 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-1 text-left"
        >
          <p className="text-xs font-extrabold text-[#0A2928]">
            {trailingNotice.validEndLocalTime
              ? `Weather outlook only after ${trailingNotice.validEndLocalTime}`
              : "Weather outlook only"}
          </p>
          <p className="text-xs text-[#0A2928]/70 font-medium leading-relaxed">
            Temperature and general weather information are available, but complete personalised guidance is not available for the remaining period. It may become available closer to the time.
          </p>
        </div>
      )}
    </div>
  );
}
