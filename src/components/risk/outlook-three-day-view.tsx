"use client";

import type { DailyOutlookSummary } from "@/lib/risk/multi-day-outlook";
import { OutlookDaySummaryCard } from "./outlook-day-summary-card";

export interface OutlookThreeDayViewProps {
  days: DailyOutlookSummary[];
  onSelectDate: (dateKey: string) => void;
}

export function OutlookThreeDayView({
  days,
  onSelectDate,
}: OutlookThreeDayViewProps) {
  // Take first 3 days (Today, Tomorrow, Day 3)
  const threeDays = days.slice(0, 3);

  return (
    <div data-view="three-days" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 flex-wrap">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#0A2928]">
          Three-day outdoor planning summary
        </h2>
        <span className="text-xs text-[#0A2928]/60 font-medium">
          Select a date to open its detailed Day timeline
        </span>
      </div>

      <div
        data-card-count={threeDays.length}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      >
        {threeDays.map((day) => (
          <OutlookDaySummaryCard
            key={day.localDateKey}
            day={day}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}
