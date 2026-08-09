"use client";

import { evaluateHourlyForecastPoint } from "@/lib/risk/forecast-window";
import type {
  EnvironmentalSnapshot,
  ForecastEnvironmentalSample,
  PersonalisedRiskLevel,
} from "@/lib/risk/types";
import type { OutdoorCheckInput } from "@/lib/check-options";

export interface HourlyGuidanceStripProps {
  snapshot: EnvironmentalSnapshot;
  input: OutdoorCheckInput;
  timezone?: string;
  maxDisplayHours?: number;
}

function formatShortTime(isoString: string, isCurrent: boolean, timeZone?: string): string {
  if (isCurrent) return "Now";
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      hour12: true,
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return isoString;
  }
}

function getLevelShortText(level: PersonalisedRiskLevel): string {
  switch (level) {
    case "lower":
      return "Lower";
    case "elevated":
      return "Elevated";
    case "high":
      return "High";
    case "very-high":
      return "Very high";
    default:
      return "Unavailable";
  }
}

function getLevelChipStyle(level: PersonalisedRiskLevel): string {
  switch (level) {
    case "lower":
      return "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-800";
    case "elevated":
      return "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800";
    case "high":
      return "bg-orange-100 text-orange-950 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800";
    case "very-high":
      return "bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
}

export function HourlyGuidanceStrip({
  snapshot,
  input,
  timezone,
  maxDisplayHours = 12,
}: HourlyGuidanceStripProps) {
  if (!snapshot.hourly || snapshot.hourly.length === 0) {
    return null;
  }

  const hourlyPoints = snapshot.hourly.slice(0, maxDisplayHours);

  return (
    <section aria-label="Hourly guidance forecast" className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Next hours guidance
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Each time reflects conditions expected around that possible start time.
        </span>
      </div>

      <div className="relative">
        <div
          role="region"
          aria-label="Hourly forecast cards"
          tabIndex={0}
          className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 px-1 -mx-1 scrollbar-thin focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-xl"
        >
          {hourlyPoints.map((point: ForecastEnvironmentalSample, idx: number) => {
            const isCurrent = idx === 0;
            const evalResult = evaluateHourlyForecastPoint({
              point,
              snapshot,
              input,
            });

            const level = evalResult.result.level;
            const timeLabel = formatShortTime(point.validAt, isCurrent, timezone);
            const feelsLike =
              point.apparentTemperatureC !== undefined && point.apparentTemperatureC !== null
                ? `${Math.round(point.apparentTemperatureC)}°C`
                : "--";

            const aqiVal = point.pm25UsAqi ?? point.pm10UsAqi;

            return (
              <div
                key={point.validAt || idx}
                className={`flex-none w-28 p-3 rounded-xl border transition-all text-center space-y-2 ${
                  isCurrent
                    ? "border-teal-400 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-950/20 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60"
                }`}
              >
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {timeLabel}
                </div>

                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getLevelChipStyle(
                    level
                  )}`}
                >
                  {getLevelShortText(level)}
                </span>

                <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  {feelsLike}
                </div>

                {aqiVal !== undefined && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    AQI {aqiVal}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
