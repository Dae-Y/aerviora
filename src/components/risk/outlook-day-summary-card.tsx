"use client";

import {
  type DailyOutlookSummary,
  hasValidOutlookBlock,
} from "@/lib/risk/multi-day-outlook";
import { getSegmentToneStyle } from "./outlook-timeline";

export interface OutlookDaySummaryCardProps {
  day: DailyOutlookSummary;
  onSelectDate: (dateKey: string) => void;
}

export function OutlookDaySummaryCard({
  day,
  onSelectDate,
}: OutlookDaySummaryCardProps) {
  // Branch 1: Weather Outlook Only Card
  if (day.availability === "weather-only") {
    const accessibleLabel = `${day.fullDateLabel}. ${
      day.temperatureMinC !== null
        ? `Forecast temperature ${day.temperatureMinC} to ${day.temperatureMaxC} degrees Celsius. `
        : ""
    }Weather outlook only. Complete personalised guidance is not available for this date. View day.`;

    return (
      <button
        type="button"
        id={`day-card-${day.localDateKey}`}
        data-availability="weather-only"
        onClick={() => onSelectDate(day.localDateKey)}
        aria-label={accessibleLabel}
        className="w-full text-left p-4 rounded-2xl border border-[#0A2928]/15 bg-white/90 transition-all shadow-xs flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] cursor-pointer hover:shadow-md h-full min-h-[160px]"
      >
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          <time className="font-extrabold text-sm sm:text-base text-[#0A2928] whitespace-nowrap truncate min-w-0">
            {day.shortDateLabel}
          </time>

          {day.temperatureMinC !== null && day.temperatureMaxC !== null && (
            <span
              aria-label={`Forecast temperature ${day.temperatureMinC} to ${day.temperatureMaxC} degrees Celsius`}
              className="text-xs font-extrabold text-[#0A2928]/80 bg-white/80 px-2 py-0.5 rounded-lg border border-[#0A2928]/10 flex-shrink-0 whitespace-nowrap tabular-nums ml-auto"
            >
              {day.temperatureMinC}–{day.temperatureMaxC}°C
            </span>
          )}
        </div>

        <div className="space-y-1 flex-grow min-w-0">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Weather outlook only
          </span>
          <p className="text-xs text-[#0A2928]/75 leading-relaxed pt-0.5">
            Complete personalised guidance is not available this far ahead. It may become available closer to the date.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-[#1F5A55] pt-2 border-t border-[#0A2928]/10 mt-auto w-full">
          <span>View day</span>
          <span>→</span>
        </div>
      </button>
    );
  }

  // Branch 2: Temporarily Unavailable Card
  if (day.availability === "temporarily-unavailable") {
    const accessibleLabel = `${day.fullDateLabel}. Personalised outlook temporarily unavailable. Environmental data could not be refreshed. View day.`;

    return (
      <button
        type="button"
        id={`day-card-${day.localDateKey}`}
        data-availability="temporarily-unavailable"
        onClick={() => onSelectDate(day.localDateKey)}
        aria-label={accessibleLabel}
        className="w-full text-left p-4 rounded-2xl border border-[#0A2928]/15 bg-white/90 transition-all shadow-xs flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] cursor-pointer hover:shadow-md h-full min-h-[160px]"
      >
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          <time className="font-extrabold text-sm sm:text-base text-[#0A2928] whitespace-nowrap truncate min-w-0">
            {day.shortDateLabel}
          </time>

          {day.temperatureMinC !== null && day.temperatureMaxC !== null && (
            <span className="text-xs font-extrabold text-[#0A2928]/80 bg-white/80 px-2 py-0.5 rounded-lg border border-[#0A2928]/10 flex-shrink-0 whitespace-nowrap tabular-nums ml-auto">
              {day.temperatureMinC}–{day.temperatureMaxC}°C
            </span>
          )}
        </div>

        <div className="space-y-1 flex-grow min-w-0">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            Personalised outlook temporarily unavailable
          </span>
          <p className="text-xs text-[#0A2928]/75 leading-relaxed pt-0.5">
            Environmental data could not be refreshed. Try again in a moment.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-[#1F5A55] pt-2 border-t border-[#0A2928]/10 mt-auto w-full">
          <span>View day</span>
          <span>→</span>
        </div>
      </button>
    );
  }

  // Branch 3: Personalised Card (day.availability === "personalised")
  const bestBlock =
    day.bestAvailableBlock &&
    hasValidOutlookBlock(day.bestAvailableBlock) &&
    day.bestAvailableBlock.level !== "unable"
      ? day.bestAvailableBlock
      : null;

  const toneStyle = bestBlock ? getSegmentToneStyle(bestBlock.level) : getSegmentToneStyle("lower");
  const bestTimeStr = bestBlock ? bestBlock.displayTimeRange : null;

  const accessibleLabel = `${day.fullDateLabel}. ${
    bestBlock
      ? `Best available around ${bestTimeStr}. ${toneStyle.badgeText}. ${
          day.temperatureMinC !== null
            ? `Forecast temperature ${day.temperatureMinC} to ${day.temperatureMaxC} degrees Celsius. `
            : ""
        }${day.mainFactor}.`
      : `Partial personalised coverage. No comparable personalised period is available for this date.`
  } View day timeline.`;

  return (
    <button
      type="button"
      id={`day-card-${day.localDateKey}`}
      data-availability="personalised"
      onClick={() => onSelectDate(day.localDateKey)}
      aria-label={accessibleLabel}
      className={`w-full text-left p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] cursor-pointer hover:shadow-md h-full min-h-[160px] ${
        bestBlock
          ? `${toneStyle.card} ${toneStyle.borderLeft}`
          : "bg-teal-500/[0.05] border-teal-700/20 border-l-4 border-l-teal-600 text-[#0A2928]"
      }`}
    >
      {/* Top Header: Clean Single-line Date & Temperature Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full">
        <time className="font-extrabold text-sm sm:text-base text-[#0A2928] whitespace-nowrap truncate min-w-0">
          {day.shortDateLabel}
        </time>

        {day.temperatureMinC !== null && day.temperatureMaxC !== null && (
          <span
            aria-label={`Forecast temperature ${day.temperatureMinC} to ${day.temperatureMaxC} degrees Celsius`}
            className="text-xs font-extrabold text-[#0A2928]/80 bg-white/80 px-2 py-0.5 rounded-lg border border-[#0A2928]/10 flex-shrink-0 whitespace-nowrap tabular-nums ml-auto"
          >
            {day.temperatureMinC}–{day.temperatureMaxC}°C
          </span>
        )}
      </div>

      {/* Middle Content */}
      <div className="space-y-1.5 flex-grow min-w-0">
        {bestBlock ? (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1F5A55]/15 text-[#1F5A55] border border-[#1F5A55]/20">
                ★ Best around {bestTimeStr}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${toneStyle.badge}`}>
                {toneStyle.badgeText}
              </span>
            </div>

            {day.mainFactor && (
              <p className="font-extrabold text-xs sm:text-sm text-[#0A2928] line-clamp-1">
                {day.mainFactor}
              </p>
            )}

            {day.coverageNotice && (
              <p className="text-[11px] text-[#0A2928]/70 italic pt-0.5">
                {day.coverageNotice}
              </p>
            )}
          </>
        ) : day.validHourCount === 1 ? (
          <div className="space-y-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
              Limited personalised coverage
            </span>
            {day.mainFactor && (
              <p className="font-extrabold text-xs sm:text-sm text-[#0A2928] line-clamp-1">
                {day.mainFactor}
              </p>
            )}
            <p className="text-xs text-[#0A2928]/75 leading-relaxed pt-0.5">
              Personalised guidance is available for isolated hours. Later periods show weather outlook only.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/10 text-[#1F5A55] border border-teal-600/20">
                Conditions remain similar
              </span>
              {day.bestAvailableLevel && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getSegmentToneStyle(day.bestAvailableLevel).badge}`}>
                  {getSegmentToneStyle(day.bestAvailableLevel).badgeText}
                </span>
              )}
            </div>
            {day.mainFactor && (
              <p className="font-extrabold text-xs sm:text-sm text-[#0A2928] line-clamp-1">
                {day.mainFactor}
              </p>
            )}
            {day.coverageNotice && (
              <p className="text-[11px] text-[#0A2928]/70 italic pt-0.5">
                {day.coverageNotice}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Affordance */}
      <div className="flex items-center justify-between text-xs font-bold text-[#1F5A55] pt-2 border-t border-[#0A2928]/10 mt-auto w-full">
        <span>View day</span>
        <span>→</span>
      </div>
    </button>
  );
}
