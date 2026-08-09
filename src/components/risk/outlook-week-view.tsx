"use client";

import type { DailyOutlookSummary } from "@/lib/risk/multi-day-outlook";
import { OutlookDaySummaryCard } from "./outlook-day-summary-card";

export interface OutlookWeekViewProps {
  days: DailyOutlookSummary[];
  onSelectDate: (dateKey: string) => void;
}

export function OutlookWeekView({
  days,
  onSelectDate,
}: OutlookWeekViewProps) {
  // Take up to 7 days
  const weekDays = days.slice(0, 7);

  const startDateLabel = weekDays[0]?.shortDateLabel || "";
  const endDateLabel = weekDays[weekDays.length - 1]?.shortDateLabel || "";

  return (
    <div data-view="week" data-max-columns="3" className="space-y-4 max-w-5xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#0A2928]">
            Seven-day weekly planning summary
          </h2>
          {startDateLabel && endDateLabel && (
            <p className="text-xs text-[#0A2928]/70 font-medium">
              {startDateLabel} – {endDateLabel}
            </p>
          )}
        </div>
        <span className="text-xs text-[#0A2928]/60 font-medium">
          Select any day to view its detailed timeline
        </span>
      </div>

      {/* Responsive Grid: Maximum 3 columns (1 col mobile, 2 col sm, 3 col md+) */}
      <div
        data-card-count={weekDays.length}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      >
        {weekDays.map((day) => (
          <OutlookDaySummaryCard
            key={day.localDateKey}
            day={day}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>

      <p className="text-xs text-[#0A2928]/60 italic text-center pt-1">
        Forecast conditions carry greater uncertainty further ahead.
      </p>
    </div>
  );
}
