"use client";

import type { LowerRiskWindowResolution, PersonalisedRiskLevel } from "@/lib/risk/types";

export interface LowerRiskWindowCardProps {
  resolution?: LowerRiskWindowResolution | null;
  timezone?: string;
  onToggleHourly?: () => void;
  isHourlyExpanded?: boolean;
}

export function getLocalDayDifference(
  targetIsoString: string,
  referenceIsoString: string,
  timeZone?: string
): number {
  try {
    const targetDate = new Date(targetIsoString);
    const refDate = new Date(referenceIsoString);

    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timeZone || undefined,
    });

    const targetYMD = formatter.format(targetDate);
    const refYMD = formatter.format(refDate);

    if (targetYMD === refYMD) return 0;

    const tParts = targetYMD.split("-").map(Number);
    const rParts = refYMD.split("-").map(Number);

    const tUtc = Date.UTC(tParts[0], tParts[1] - 1, tParts[2]);
    const rUtc = Date.UTC(rParts[0], rParts[1] - 1, rParts[2]);

    return Math.round((tUtc - rUtc) / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}

export function formatHourTime(isoString: string, timeZone?: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: timeZone || undefined,
    })
      .format(date)
      .toLowerCase();
  } catch {
    return isoString;
  }
}

export function formatLowerRiskTimeTitle({
  startAt,
  endAt,
  isBriefPeriod,
  referenceTime,
  timeZone,
}: {
  startAt: string;
  endAt: string;
  isBriefPeriod: boolean;
  referenceTime?: string;
  timeZone?: string;
}): { badgeTitle: string; displayTitle: string; detailWording: string } {
  const startFormatted = formatHourTime(startAt, timeZone);
  const endFormatted = formatHourTime(endAt, timeZone);

  const refIso = referenceTime || new Date().toISOString();
  const diffDays = getLocalDayDifference(startAt, refIso, timeZone);

  let badgeTitle = "Lower-risk time";
  let displayTitle = "";
  let detailWording = "";

  if (diffDays <= 0) {
    badgeTitle = "Lower-risk time today";
    if (isBriefPeriod) {
      displayTitle = `Around ${startFormatted}`;
      detailWording = `A brief lower-risk period may be available around ${startFormatted}.`;
    } else {
      displayTitle = `${startFormatted} – ${endFormatted}`;
      detailWording = `Conditions are expected to improve between ${startFormatted} and ${endFormatted}.`;
    }
  } else if (diffDays === 1) {
    badgeTitle = "Lower-risk time tomorrow";
    if (isBriefPeriod) {
      displayTitle = `Tomorrow around ${startFormatted}`;
      detailWording = `A brief lower-risk period may be available tomorrow around ${startFormatted}.`;
    } else {
      displayTitle = `Tomorrow ${startFormatted} – ${endFormatted}`;
      detailWording = `Conditions are expected to improve tomorrow between ${startFormatted} and ${endFormatted}.`;
    }
  } else {
    badgeTitle = "Lower-risk time";
    let dayName = "";
    try {
      dayName = new Intl.DateTimeFormat("en-AU", {
        weekday: "long",
        timeZone: timeZone || undefined,
      }).format(new Date(startAt));
    } catch {
      dayName = "future date";
    }

    if (isBriefPeriod) {
      displayTitle = `${dayName} around ${startFormatted}`;
      detailWording = `A brief lower-risk period may be available on ${dayName} around ${startFormatted}.`;
    } else {
      displayTitle = `${dayName} ${startFormatted} – ${endFormatted}`;
      detailWording = `Conditions are expected to improve on ${dayName} between ${startFormatted} and ${endFormatted}.`;
    }
  }

  return { badgeTitle, displayTitle, detailWording };
}

function getLevelLabel(level: PersonalisedRiskLevel): string {
  switch (level) {
    case "lower":
      return "Lower environmental concern";
    case "elevated":
      return "Elevated environmental concern";
    case "high":
      return "High environmental concern";
    case "very-high":
      return "Very high environmental concern";
    default:
      return "Guidance unavailable";
  }
}

function getLevelBadgeStyle(level: PersonalisedRiskLevel): string {
  switch (level) {
    case "lower":
      return "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800/60";
    case "elevated":
      return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/60";
    case "high":
      return "bg-orange-50 text-orange-900 border-orange-200 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-800/60";
    case "very-high":
      return "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800/60";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
  }
}

export function LowerRiskWindowCard({
  resolution,
  timezone,
  onToggleHourly,
  isHourlyExpanded = false,
}: LowerRiskWindowCardProps) {
  if (!resolution) return null;

  if (resolution.status === "unable") {
    return (
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Lower-risk time
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Hourly forecast data is currently unavailable.
        </p>
      </div>
    );
  }

  if (resolution.status === "not-found") {
    if (resolution.reason === "current-already-lower") {
      return null;
    }
    return (
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Lower-risk time
          </h3>
          {onToggleHourly && (
            <button
              type="button"
              onClick={onToggleHourly}
              className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
            >
              {isHourlyExpanded ? "Hide hourly forecast" : "View hourly forecast"}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No clearly lower-risk window was identified in the available forecast period.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
          Forecast conditions may change as new model data becomes available.
        </p>
      </div>
    );
  }

  const primaryWindow = resolution.windows?.[0] || resolution;
  const refTime = resolution.referenceTime || resolution.currentConditions?.observedAt;

  const { badgeTitle, displayTitle, detailWording } = formatLowerRiskTimeTitle({
    startAt: primaryWindow.startAt,
    endAt: primaryWindow.endAt,
    isBriefPeriod: primaryWindow.isBriefPeriod,
    referenceTime: refTime,
    timeZone: timezone,
  });

  return (
    <div className="p-5 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/40 via-white to-slate-50/50 dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-950/40 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-400">
            {badgeTitle}
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {displayTitle}
          </h3>
        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getLevelBadgeStyle(
            primaryWindow.windowLevel
          )}`}
        >
          {getLevelLabel(primaryWindow.windowLevel)}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
        {primaryWindow.isBriefPeriod ? (
          <p>{detailWording}</p>
        ) : null}

        {primaryWindow.explanations?.map((exp, idx) => (
          <p key={idx} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
            <span>{exp}</span>
          </p>
        ))}

        {primaryWindow.relativeRiskNote && (
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 pt-1">
            {primaryWindow.relativeRiskNote}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-teal-100 dark:border-teal-950 pt-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Forecast conditions may change as new model data becomes available.</span>
        {onToggleHourly && (
          <button
            type="button"
            onClick={onToggleHourly}
            className="font-medium text-teal-700 dark:text-teal-400 hover:underline shrink-0 ml-2"
          >
            {isHourlyExpanded ? "Hide hourly forecast" : "View hourly forecast"}
          </button>
        )}
      </div>
    </div>
  );
}
