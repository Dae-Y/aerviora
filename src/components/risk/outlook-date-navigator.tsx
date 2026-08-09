"use client";

import type { DailyOutlookSummary } from "@/lib/risk/multi-day-outlook";

export interface OutlookDateNavigatorProps {
  days: DailyOutlookSummary[];
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
}

export function OutlookDateNavigator({
  days,
  selectedDateKey,
  onSelectDate,
}: OutlookDateNavigatorProps) {
  if (days.length === 0) return null;

  const currentIndex = Math.max(
    0,
    days.findIndex((d) => d.localDateKey === selectedDateKey)
  );
  const currentDay = days[currentIndex] || days[0];

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < days.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onSelectDate(days[currentIndex - 1].localDateKey);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectDate(days[currentIndex + 1].localDateKey);
    }
  };

  return (
    <div
      role="region"
      aria-label={`Select forecast date. ${currentDay.fullDateLabel}, day ${currentIndex + 1} of ${days.length}`}
      className="flex items-center justify-between gap-3 p-2 px-3.5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs w-full max-w-md mx-auto select-none"
    >
      {/* Previous Day Button */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={!hasPrev}
        aria-label="Previous day"
        className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] ${
          hasPrev
            ? "bg-white text-[#0A2928] border-[#0A2928]/15 hover:bg-teal-50 hover:border-teal-600/30 cursor-pointer"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
        }`}
      >
        <span>←</span>
        <span className="hidden sm:inline">Prev</span>
      </button>

      {/* Selected Date String Label & Step Counter */}
      <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1 px-1">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <time className="font-extrabold text-sm sm:text-base text-[#0A2928] whitespace-nowrap truncate">
            {currentDay.shortDateLabel}
          </time>
          {currentDay.isToday && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/10 text-[#1F5A55] border border-teal-600/20">
              Today
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#0A2928]/60 font-medium">
          {currentIndex + 1} of {days.length}
        </span>
      </div>

      {/* Next Day Button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!hasNext}
        aria-label="Next day"
        className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] ${
          hasNext
            ? "bg-white text-[#0A2928] border-[#0A2928]/15 hover:bg-teal-50 hover:border-teal-600/30 cursor-pointer"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
        }`}
      >
        <span className="hidden sm:inline">Next</span>
        <span>→</span>
      </button>
    </div>
  );
}
