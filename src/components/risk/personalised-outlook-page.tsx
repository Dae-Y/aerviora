"use client";

import { useState, useRef } from "react";
import type { OutdoorCheckInput } from "@/lib/check-options";
import {
  getActivityTitle,
  SENSITIVITY_CATEGORIES,
  getSensitivityIntensityLabel,
} from "@/lib/check-options";
import type { EnvironmentApiSuccess } from "@/lib/environment-api";
import type { PersonalisedRiskResult, PersonalisedRiskLevel } from "@/lib/risk";
import {
  resolvePersonalisedOutlook,
  formatLocalTime,
  getLocalDateString,
  type OutlookTimeBlock,
} from "@/lib/risk/personalised-outlook";
import { evaluateHourlyForecastPoint } from "@/lib/risk/forecast-window";
import {
  buildMultiDayOutlook,
  hasValidOutlookBlock,
  type OutlookViewMode,
} from "@/lib/risk/multi-day-outlook";

import { OutlookViewModeSwitcher } from "./outlook-view-mode-switcher";
import { OutlookDateNavigator } from "./outlook-date-navigator";
import { OutlookThreeDayView } from "./outlook-three-day-view";
import { OutlookWeekView } from "./outlook-week-view";
import { OutlookTimeline } from "./outlook-timeline";
import { OutlookBlockDetails, getBlockLevelBadgeStyle } from "./outlook-block-details";

export interface PersonalisedOutlookPageProps {
  apiResponse: EnvironmentApiSuccess;
  input: OutdoorCheckInput;
  currentResult: PersonalisedRiskResult;
  onBack: () => void;
  onEditCheck: () => void;
  onRefresh?: () => void;
}

export function getCurrentGuidanceLevelLabel(level: PersonalisedRiskLevel): string {
  switch (level) {
    case "lower":
      return "Current guidance: Lower environmental concern";
    case "elevated":
      return "Current guidance: Elevated environmental concern";
    case "high":
      return "Current guidance: High environmental concern";
    case "very-high":
      return "Current guidance: Very high environmental risk";
    case "unable":
    default:
      return "Current guidance: Unavailable";
  }
}

export function PersonalisedOutlookPage({
  apiResponse,
  input,
  currentResult,
  onBack,
  onEditCheck,
}: PersonalisedOutlookPageProps) {
  const timezone = apiResponse.resolvedLocation.timezone;
  const initialTodayKey = getLocalDateString(apiResponse.retrievedAt, timezone);

  const [viewMode, setViewMode] = useState<OutlookViewMode>("day");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(initialTodayKey);
  const [selectedBlock, setSelectedBlock] = useState<OutlookTimeBlock | null>(null);
  const triggerElRef = useRef<HTMLElement | null>(null);

  // Evaluate hourly points using existing Risk Model parity
  const evaluatedHourlyResults =
    apiResponse.forecast.status === "available"
      ? (apiResponse.forecast.points || []).map((p) =>
          evaluateHourlyForecastPoint({
            point: p,
            snapshot: apiResponse.snapshot,
            input,
          })
        )
      : [];

  // Build canonical Today/Tomorrow 48h outlook
  const canonicalOutlook = resolvePersonalisedOutlook({
    currentResult,
    currentSnapshot: apiResponse.snapshot.current,
    hourlyResults: evaluatedHourlyResults,
    referenceTime: apiResponse.retrievedAt,
    timezone,
    input,
    fullSnapshot: apiResponse.snapshot,
  });

  // Build 7-day multi-day outlook summaries
  const multiDayOutlook = buildMultiDayOutlook({
    currentResult,
    currentSnapshot: apiResponse.snapshot.current,
    hourlyResults: evaluatedHourlyResults,
    referenceTime: apiResponse.retrievedAt,
    timezone,
  });

  // Selected date summary
  const selectedDaySummary =
    multiDayOutlook.days.find((d) => d.localDateKey === selectedDateKey) ||
    multiDayOutlook.days[0];

  const isToday = selectedDateKey === initialTodayKey;
  const isTomorrow = multiDayOutlook.days[1]?.localDateKey === selectedDateKey;

  // Selected day blocks for detailed timeline
  const activeDayBlocks = isToday
    ? canonicalOutlook.today.blocks
    : isTomorrow
    ? canonicalOutlook.tomorrow.blocks
    : selectedDaySummary?.blocks ?? [];

  const activeBestAvailableBlock = isToday
    ? canonicalOutlook.today.bestAvailableBlock
    : isTomorrow
    ? canonicalOutlook.tomorrow.bestAvailableBlock
    : selectedDaySummary?.bestAvailableBlock || null;

  // Format header summaries
  const locationLabel = apiResponse.resolvedLocation.displayName;
  const activityTitle = input.activity ? getActivityTitle(input.activity) : "Outdoor activity";
  const durationLabel = input.durationMinutes ? `${input.durationMinutes} minutes` : "";

  // Sensitivities summary
  const activeSens = SENSITIVITY_CATEGORIES.filter(
    (cat) => input.sensitivities[cat.key] !== "not-affected"
  ).map(
    (cat) =>
      `${cat.title}: ${getSensitivityIntensityLabel(input.sensitivities[cat.key])}`
  );
  const sensitivitiesSummary =
    activeSens.length > 0
      ? activeSens.join(" · ")
      : "No environmental sensitivities selected";

  const updatedTimeStr = formatLocalTime(apiResponse.retrievedAt, timezone);

  const handleSelectBlock = (block: OutlookTimeBlock, triggerEl: HTMLElement | null) => {
    triggerElRef.current = triggerEl;
    setSelectedBlock(block);
  };

  const handleCloseDetails = () => {
    setSelectedBlock(null);
    if (triggerElRef.current) {
      triggerElRef.current.focus({ preventScroll: true });
      triggerElRef.current = null;
    }
  };

  const handleSelectDateFromSummary = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setViewMode("day");
  };

  const containerMaxWidthClass =
    viewMode === "week"
      ? "max-w-7xl"
      : viewMode === "three-days"
      ? "max-w-5xl"
      : "max-w-4xl";

  return (
    <div
      data-view={viewMode}
      className={`w-full ${containerMaxWidthClass} mx-auto space-y-5 pb-12 animate-in fade-in duration-300 transition-all duration-200`}
    >
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm text-[#1F5A55] bg-white border border-[#1F5A55]/20 hover:bg-[#1F5A55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors shadow-xs"
        >
          <span>←</span>
          <span>Back to current guidance</span>
        </button>

        <button
          type="button"
          onClick={onEditCheck}
          className="py-2 px-3.5 rounded-xl font-semibold text-xs sm:text-sm text-[#0A2928]/80 hover:text-[#0A2928] bg-white/80 border border-[#0A2928]/10 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors"
        >
          Edit check
        </button>
      </div>

      {/* Compact Planning Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-2">
        {apiResponse.sourceMode === "demo" && (
          <div className="pb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
              DEMO SCENARIO · SIMULATED CONDITIONS
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5A55]">
            Session Planning Experience
          </span>
          <span className="text-[11px] text-[#0A2928]/60 font-medium">
            Updated {updatedTimeStr} · Forecast conditions may change
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0A2928]">
          Personalised outlook
        </h1>

        <p className="text-xs sm:text-sm text-[#0A2928]/80 font-medium leading-relaxed">
          <strong className="text-[#0A2928]">{locationLabel}</strong> · {activityTitle}
          {durationLabel ? ` (${durationLabel})` : ""} · {sensitivitiesSummary}
        </p>
      </div>

      {/* Top-Level Mode Navigation (Day, 3 Days, Week) */}
      <div className="space-y-3 border-b border-[#0A2928]/10 pb-3">
        <div className="flex items-center justify-center sm:justify-start">
          <OutlookViewModeSwitcher
            currentMode={viewMode}
            onModeChange={(mode) => setViewMode(mode)}
          />
        </div>

        {viewMode === "day" && (
          <div className="pt-1">
            <OutlookDateNavigator
              days={multiDayOutlook.days}
              selectedDateKey={selectedDateKey}
              onSelectDate={(dateKey) => setSelectedDateKey(dateKey)}
            />
          </div>
        )}
      </div>

      {/* RENDER VIEW MODE: DAY MODE */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {/* Header Summary for Selected Date */}
          {isToday ? (
            canonicalOutlook.today.currentConditionsAlreadyLower ? (
              <div className="p-3.5 px-4 rounded-xl bg-teal-500/[0.08] border border-teal-700/20 text-xs sm:text-sm font-semibold text-[#1F5A55] flex items-center gap-2 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse flex-shrink-0" />
                <span>Looks good right now — No lower-risk alternative is needed.</span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white border border-[#0A2928]/10 shadow-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      currentResult.level === "very-high"
                        ? "bg-rose-600"
                        : currentResult.level === "high"
                        ? "bg-orange-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0A2928]">
                    {getCurrentGuidanceLevelLabel(currentResult.level)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#0A2928]/90 pl-4">
                  {canonicalOutlook.today.summaryWording}
                </p>
              </div>
            )
          ) : activeBestAvailableBlock && hasValidOutlookBlock(activeBestAvailableBlock) ? (
            <div className="p-4 rounded-2xl bg-white border border-[#0A2928]/10 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5A55]">
                  Best available period
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${
                    getBlockLevelBadgeStyle(activeBestAvailableBlock.level).badge
                  }`}
                >
                  {getBlockLevelBadgeStyle(activeBestAvailableBlock.level).label}
                </span>
              </div>

              <p className="font-bold text-sm sm:text-base text-[#0A2928]">
                {activeBestAvailableBlock.displayTimeRange}
              </p>
              {selectedDaySummary?.coverageNotice && (
                <p className="text-xs text-[#0A2928]/80 font-medium italic">
                  {selectedDaySummary.coverageNotice}
                </p>
              )}
            </div>
          ) : selectedDaySummary?.availability === "personalised" && selectedDaySummary.validHourCount === 1 ? (
            <div className="p-4 rounded-2xl bg-white border border-[#0A2928]/10 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                  Limited personalised coverage
                </span>
                {selectedDaySummary.blocks.find((b) => b.level !== "unable") && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${
                      getBlockLevelBadgeStyle(selectedDaySummary.blocks.find((b) => b.level !== "unable")!.level).badge
                    }`}
                  >
                    {getBlockLevelBadgeStyle(selectedDaySummary.blocks.find((b) => b.level !== "unable")!.level).label}
                  </span>
                )}
              </div>
              <p className="font-bold text-sm sm:text-base text-[#0A2928]">
                {selectedDaySummary.blocks.find((b) => b.level !== "unable")?.displayTimeRange}
              </p>
              <p className="text-xs text-[#0A2928]/80 font-medium leading-relaxed">
                Personalised guidance is available only for {selectedDaySummary.blocks.find((b) => b.level !== "unable")?.displayTimeRange}. Later periods show weather outlook only.
              </p>
            </div>
          ) : selectedDaySummary?.availability === "personalised" ? (
            <div className="p-4 rounded-2xl bg-white border border-[#0A2928]/10 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5A55]">
                  Conditions remain similar
                </span>
                {selectedDaySummary.blocks.find((b) => b.level !== "unable") && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${
                      getBlockLevelBadgeStyle(selectedDaySummary.blocks.find((b) => b.level !== "unable")!.level).badge
                    }`}
                  >
                    {getBlockLevelBadgeStyle(selectedDaySummary.blocks.find((b) => b.level !== "unable")!.level).label}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#0A2928]/90 pt-0.5">
                {selectedDaySummary.primarySummary || "Conditions are expected to remain similar across the available forecast."}
              </p>
              {selectedDaySummary.coverageNotice && (
                <p className="text-xs text-[#0A2928]/80 font-medium italic">
                  {selectedDaySummary.coverageNotice}
                </p>
              )}
            </div>
          ) : selectedDaySummary?.availability === "weather-only" ? (
            <div className="p-4 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Weather outlook only
                </span>
                {selectedDaySummary.temperatureMinC !== null && selectedDaySummary.temperatureMaxC !== null && (
                  <span className="text-xs font-bold text-[#0A2928]/80 bg-white/80 px-2 py-0.5 rounded-lg border border-[#0A2928]/10">
                    {selectedDaySummary.temperatureMinC}–{selectedDaySummary.temperatureMaxC}°C
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#0A2928]/90 pt-0.5">
                Complete personalised guidance is not available for this date. Personalised guidance may become available closer to the date.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-700 font-medium">
              Personalised guidance is unavailable for this date.
            </div>
          )}

          {/* Detailed Calendar Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#0A2928]">
                {selectedDaySummary?.fullDateLabel || "Selected date timeline"}
              </h2>
              <span className="text-xs text-[#0A2928]/60 font-medium hidden sm:inline">
                Select a block to view details
              </span>
            </div>

            <OutlookTimeline
              blocks={activeDayBlocks}
              bestAvailableBlock={activeBestAvailableBlock}
              onSelectBlock={handleSelectBlock}
              coverageNotice={selectedDaySummary?.coverageNotice}
              timezone={timezone}
              referenceTime={apiResponse.retrievedAt}
              isToday={isToday}
              selectedDateKey={selectedDateKey}
            />
          </div>
        </div>
      )}

      {/* RENDER VIEW MODE: 3 DAYS MODE */}
      {viewMode === "three-days" && (
        <OutlookThreeDayView
          days={multiDayOutlook.days}
          onSelectDate={handleSelectDateFromSummary}
        />
      )}

      {/* RENDER VIEW MODE: WEEK MODE */}
      {viewMode === "week" && (
        <OutlookWeekView
          days={multiDayOutlook.days}
          onSelectDate={handleSelectDateFromSummary}
        />
      )}

      {/* Session Privacy Disclaimer */}
      <div className="p-3 rounded-xl bg-teal-900/5 border border-[#0A2928]/10 text-xs text-[#0A2928]/70 text-center leading-relaxed">
        This outlook is available only for the current session and is not saved to an account.
      </div>

      {/* Block Details Modal Dialog */}
      {selectedBlock && (
        <OutlookBlockDetails
          block={selectedBlock}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
