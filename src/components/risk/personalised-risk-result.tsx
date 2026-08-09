"use client";

import { useState, useRef, useEffect } from "react";
import type { OutdoorCheckInput } from "@/lib/check-options";
import {
  getActivityTitle,
  SENSITIVITY_CATEGORIES,
  getSensitivityIntensityLabel,
} from "@/lib/check-options";
import type { EnvironmentApiSuccess } from "@/lib/environment-api";
import type {
  PersonalisedRiskResult,
  PersonalisedRiskLevel,
  RiskDriver,
} from "@/lib/risk";
import {
  getRiskCopyPresentation,
  getDriverCopy,
  CONFIDENCE_EXPLANATION,
} from "@/lib/risk/copy";
import { getEnvironmentalSignalLabel } from "@/lib/environment-format";
import { EnvironmentSnapshotView } from "@/components/environment-snapshot";
import { CompactConditionsSummary } from "./compact-conditions-summary";
import { getPreparationSuggestions } from "@/lib/preparation/get-preparation-suggestions";
import { PreparationSuggestions } from "./preparation-suggestions";
import { RecommendationFeedback } from "./recommendation-feedback";
import { LowerRiskWindowCard } from "./lower-risk-window-card";
import { LocalContextCard } from "@/components/location/local-context-card";
import type { LowerRiskWindowResolution } from "@/lib/risk/types";

import {
  resolveResultIllustrationScene,
  selectResultIllustration,
} from "@/lib/illustrations/result-illustrations";
import { ResultStateIllustration } from "./result-state-illustration";

export interface PersonalisedRiskResultViewProps {
  result: PersonalisedRiskResult;
  apiResponse: EnvironmentApiSuccess;
  input: OutdoorCheckInput;
  lowerRiskResolution?: LowerRiskWindowResolution | null;
  isDeviceLocation?: boolean;
  latitude?: number;
  longitude?: number;
  justCalculated?: boolean;
  onFocusAcknowledged?: () => void;
  onRefresh: () => void;
  onEditCheck: () => void;
  onReset: () => void;
  onViewOutlook?: () => void;
}

/**
 * Returns risk-level semantic styling for the recommended action callout. (Task 6.6.1 Amendment 4 & 12)
 */
export function getRecommendedActionTone(level: PersonalisedRiskLevel): {
  container: string;
} {
  switch (level) {
    case "lower":
      return { container: "border-teal-700/20 bg-teal-500/[0.08]" };
    case "elevated":
      return { container: "border-amber-500/25 bg-amber-400/[0.09]" };
    case "high":
      return { container: "border-orange-500/25 bg-orange-500/[0.08]" };
    case "very-high":
      return { container: "border-rose-500/30 bg-rose-500/[0.09]" };
    case "unable":
    default:
      return { container: "border-[#0A2928]/15 bg-[#0A2928]/[0.04]" };
  }
}

export function PersonalisedRiskResultView({
  result,
  apiResponse,
  input,
  lowerRiskResolution,
  isDeviceLocation,
  latitude,
  longitude,
  justCalculated = false,
  onFocusAcknowledged,
  onRefresh,
  onEditCheck,
  onReset,
  onViewOutlook,
}: PersonalisedRiskResultViewProps) {
  const [showRawMetrics, setShowRawMetrics] = useState<boolean>(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Resolve decorative result illustration asset
  const illustrationScene = resolveResultIllustrationScene({
    level: result.level,
    current: apiResponse.snapshot.current,
    timezone: apiResponse.resolvedLocation.timezone,
  });
  const illustrationAsset = illustrationScene
    ? selectResultIllustration(illustrationScene)
    : null;

  const actionTone = getRecommendedActionTone(result.level);

  // Focus heading once immediately after user-triggered calculation (Amendment 3)
  useEffect(() => {
    if (justCalculated && headingRef.current) {
      headingRef.current.focus({ preventScroll: true });
      if (onFocusAcknowledged) {
        onFocusAcknowledged();
      }
    }
  }, [justCalculated, onFocusAcknowledged]);

  const presentation = getRiskCopyPresentation(
    result.level,
    result.action,
    result.confidence
  );

  const actionTitle = result.recommendation?.title || presentation.actionLabel;
  const actionExplanation = result.recommendation?.explanation || presentation.summary;

  // User-facing natural summary formatting (Amendment 4)
  const summaryParts: string[] = [];
  if (input.activity) {
    summaryParts.push(getActivityTitle(input.activity));
  }
  if (input.durationMinutes) {
    summaryParts.push(
      input.durationMinutes === 1
        ? "1 minute"
        : `${input.durationMinutes} minutes`
    );
  }
  if (Object.values(input.sensitivities).some((v) => v !== "not-affected")) {
    const formattedSens = SENSITIVITY_CATEGORIES.filter(
      (cat) => input.sensitivities[cat.key] !== "not-affected"
    )
      .map((cat) => cat.title)
      .join(", ");
    if (formattedSens) {
      summaryParts.push(formattedSens);
    }
  }
  const formattedSummaryLine = summaryParts.join(" · ");

  // Category visual badge styling for overall risk level
  const levelBadgeStyles =
    result.level === "lower"
      ? "bg-teal-900/10 text-[#1F5A55] border-[#1F5A55]/20"
      : result.level === "elevated"
      ? "bg-amber-500/10 text-amber-900 border-amber-500/30"
      : result.level === "high" || result.level === "very-high"
      ? "bg-rose-500/10 text-rose-950 border-rose-500/30"
      : "bg-gray-500/10 text-gray-800 border-gray-500/20";

  // Category-specific badge logic for drivers
  const getDriverBadge = (driver: RiskDriver) => {
    if (driver.category === "environment") {
      return { text: "ENVIRONMENT", style: "bg-amber-500/15 text-amber-950" };
    }
    if (driver.category === "protection") {
      return { text: "PROTECTION", style: "bg-teal-900/10 text-[#1F5A55]" };
    }
    if (driver.category === "sensitivity") {
      return { text: "SENSITIVITY", style: "bg-teal-900/10 text-[#1F5A55]" };
    }
    if (driver.category === "exposure") {
      return { text: "EXPOSURE", style: "bg-teal-900/10 text-[#1F5A55]" };
    }
    if (driver.category === "context") {
      return { text: "CONTEXT", style: "bg-slate-500/15 text-slate-900" };
    }
    if (driver.category === "data-quality") {
      return { text: "DATA QUALITY", style: "bg-slate-500/15 text-slate-900" };
    }
    return { text: "ENVIRONMENT", style: "bg-amber-500/15 text-amber-950" };
  };

  // Derive environmental inputs actually evaluated for this result (Amendment 2)
  const evaluatedEnvironmentalInputs = Array.from(
    new Set(
      Object.keys(apiResponse.snapshot.current || {})
        .filter(
          (k) =>
            k !== "observedAt" &&
            apiResponse.snapshot.current?.[
              k as keyof typeof apiResponse.snapshot.current
            ] !== undefined
        )
        .map((k) => getEnvironmentalSignalLabel(k))
    )
  );

  return (
    <div className="space-y-6">
      {/* Live Region Announcement */}
      <div className="sr-only" aria-live="polite">
        Personalised guidance result: {presentation.title}. Action: {actionTitle}.
      </div>

      {/* Result Header */}
      <div className="space-y-2">
        {apiResponse.sourceMode === "demo" && (
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
              DEMO SCENARIO · SIMULATED CONDITIONS
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${levelBadgeStyles}`}
          >
            {presentation.title}
          </div>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/80 border border-[#0A2928]/15 text-[#4E7C77]">
            {presentation.confidenceLabel}
          </div>
        </div>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2928] focus:outline-none focus:ring-2 focus:ring-[#1F5A55] rounded-lg p-0.5"
        >
          Personalised guidance for {apiResponse.resolvedLocation.displayName}
        </h1>
        {formattedSummaryLine && (
          <p className="text-xs sm:text-sm text-[#4E7C77] font-medium leading-relaxed">
            {formattedSummaryLine}
          </p>
        )}
      </div>

      {/* Open Composition Result Hero Card (Task 6.6.3 Refinement) */}
      <div className="rounded-3xl overflow-hidden bg-white/90 border border-[#0A2928]/10 shadow-sm">
        <div
          className={
            illustrationAsset
              ? "grid md:grid-cols-[minmax(210px,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(250px,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(270px,340px)_minmax(0,1fr)] md:items-center gap-0 md:gap-[10px] lg:gap-[18px]"
              : "p-5 sm:p-6 space-y-4"
          }
        >
          {/* Recommended Action & Limitation Text (DOM First for Accessibility) */}
          <div
            className={
              illustrationAsset
                ? "md:col-start-2 md:row-start-1 p-5 sm:p-6 flex flex-col justify-center space-y-4"
                : "space-y-4"
            }
          >
            <div className="space-y-1.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#4E7C77]">
                Recommended action
              </span>
              <div
                data-slot="recommended-action-callout"
                data-risk-level={result.level}
                data-tone={result.level}
                className={`p-3.5 sm:p-4 rounded-2xl border text-[#0A2928] font-bold text-base sm:text-lg transition-colors ${actionTone.container}`}
              >
                {actionTitle}
              </div>
            </div>

            <p className="text-sm text-[#0A2928]/90 leading-relaxed max-w-2xl">
              {actionExplanation}
            </p>

            {/* Important Limitation Panel */}
            <div className="p-3.5 rounded-xl bg-teal-900/5 border border-[#0A2928]/10 text-xs text-[#0A2928]/80 leading-relaxed space-y-1">
              <span className="font-semibold block text-[#0A2928]">
                Important limitation
              </span>
              <p>{presentation.importantNote}</p>
            </div>
          </div>

          {/* Open Composition Side Illustration Region (DOM Second, Visual Left on Desktop/Tablet, Refinement 3 & 6) */}
          {illustrationAsset && (
            <div
              data-slot="result-illustration-region"
              data-risk-level={result.level}
              className="md:col-start-1 md:row-start-1 md:self-center flex min-w-0 items-center justify-center p-1.5 sm:p-2 md:p-3"
            >
              <ResultStateIllustration
                asset={illustrationAsset}
                level={result.level}
                variant="embedded"
                loading="eager"
              />
            </div>
          )}
        </div>
      </div>

      {/* Why This Result (Risk Drivers List) */}
      {result.drivers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Why this result
          </h2>
          <div className="space-y-2.5">
            {result.drivers.slice(0, 4).map((driver) => {
              const mappedCopy = getDriverCopy(driver);
              const badge = getDriverBadge(driver);
              return (
                <div
                  key={driver.key}
                  className="p-4 rounded-xl bg-white/80 border border-[#0A2928]/10 space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-[#0A2928]">
                      {mappedCopy.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badge.style}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <p className="text-xs text-[#0A2928]/80 leading-relaxed">
                    {mappedCopy.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Current Conditions Summary (Task 7.7.3) */}
      <CompactConditionsSummary current={apiResponse.snapshot.current} />

      {/* Lower-Risk Window Recommendation */}
      {lowerRiskResolution && (
        <LowerRiskWindowCard
          resolution={lowerRiskResolution}
          timezone={apiResponse.resolvedLocation.timezone}
          isHourlyExpanded={false}
          onToggleHourly={onViewOutlook || (() => {})}
        />
      )}

      {/* Personalised Outlook CTA (Task 10H) */}
      {onViewOutlook && (
        <div className="p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-3">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#0A2928]">Plan your outdoor time</h3>
            <p className="text-xs sm:text-sm text-[#0A2928]/80 leading-relaxed">
              See how your personalised guidance changes throughout today and tomorrow.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewOutlook}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#1F5A55] hover:bg-[#194B47] transition-colors text-center shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]"
          >
            View personalised outlook
          </button>
        </div>
      )}

      {/* Consider These Items (Task 8 Contextual Preparation Suggestions) */}
      {(() => {
        const suggestions = getPreparationSuggestions({
          snapshot: apiResponse.snapshot,
          input,
          domainAssessments: result.domainAssessments,
        });
        return <PreparationSuggestions suggestions={suggestions} />;
      })()}

      {/* Recommendation Feedback (UI Prototype Only) */}
      <RecommendationFeedback />

      {/* Nearby Context Card (Task 10G.5) */}
      {(isDeviceLocation || latitude !== undefined) && (
        <LocalContextCard
          displayName={apiResponse.resolvedLocation.displayName}
          latitude={latitude}
          longitude={longitude}
          currentConditions={apiResponse.snapshot.current}
          isDeviceLocation={isDeviceLocation}
        />
      )}

      {/* Navigation Actions Hierarchy */}
      <div className="space-y-3 pt-2">
        {/* Secondary Outline Action: Toggle Environmental Details Disclosure */}
        <button
          type="button"
          aria-expanded={showRawMetrics}
          aria-controls="full-environmental-details"
          onClick={() => setShowRawMetrics((prev) => !prev)}
          className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-[#1F5A55] bg-white border border-[#1F5A55]/30 hover:bg-[#1F5A55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center"
        >
          {showRawMetrics
            ? "Hide environmental details"
            : "View all environmental details"}
        </button>

        {showRawMetrics && (
          <div id="full-environmental-details" className="pt-2 border-t border-[#0A2928]/10">
            <EnvironmentSnapshotView
              apiResponse={apiResponse}
              input={input}
              mode="embedded"
              onRefresh={onRefresh}
              onEditCheck={onEditCheck}
              onReset={onReset}
            />
          </div>
        )}

        {/* How This Was Calculated (Expandable Accordion) */}
        <details className="group bg-white/80 rounded-2xl border border-[#0A2928]/10 shadow-xs overflow-hidden transition-all mt-4">
          <summary className="p-4 sm:p-5 font-semibold text-xs text-[#0A2928] uppercase tracking-wider cursor-pointer select-none flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]">
            <span>How this was calculated</span>
            <span className="text-[#4E7C77] group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>

          <div className="px-4 pb-5 sm:px-5 space-y-4 border-t border-[#0A2928]/10 pt-4 text-xs text-[#0A2928]/80 leading-relaxed">
            {/* Dynamic Environmental Inputs Considered (Amendment 2) */}
            <div className="space-y-1">
              <span className="font-semibold text-[#0A2928] block">
                Environmental inputs considered:
              </span>
              <ul className="list-disc list-inside space-y-0.5">
                {evaluatedEnvironmentalInputs.map((label, idx) => (
                  <li key={idx}>{label}</li>
                ))}
              </ul>
            </div>

            {/* Personal Context Applied */}
            <div className="space-y-1">
              <span className="font-semibold text-[#0A2928] block">
                Personal context applied:
              </span>
              <ul className="list-disc list-inside space-y-0.5">
                {input.activity && (
                  <li>Activity: {getActivityTitle(input.activity)}</li>
                )}
                {input.durationMinutes && (
                  <li>
                    Duration:{" "}
                    {input.durationMinutes === 1
                      ? "1 minute"
                      : `${input.durationMinutes} minutes`}
                  </li>
                )}
                {Object.values(input.sensitivities).some((v) => v !== "not-affected") && (
                  <li>
                    Sensitivities:{" "}
                    {SENSITIVITY_CATEGORIES.filter(
                      (cat) => input.sensitivities[cat.key] !== "not-affected"
                    )
                      .map(
                        (cat) =>
                          `${cat.title} (${getSensitivityIntensityLabel(
                            input.sensitivities[cat.key]
                          )})`
                      )
                      .join(", ")}
                  </li>
                )}
              </ul>
              <p className="text-[11px] text-[#4E7C77] italic pt-1">
                Not every selected factor necessarily changed this guidance.
              </p>
            </div>

            {/* Data Confidence Explanation */}
            <div className="space-y-1">
              <span className="font-semibold text-[#0A2928] block">
                {presentation.confidenceLabel}:
              </span>
              <p>{CONFIDENCE_EXPLANATION}</p>
            </div>

            {/* Prototype Limitations */}
            {result.limitations.length > 0 && (
              <div className="space-y-1">
                <span className="font-semibold text-[#0A2928] block">
                  Evaluated limitations:
                </span>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Non-Medical Disclaimer */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 leading-relaxed">
              <span className="font-semibold block mb-0.5">
                Decision Support Disclaimer:
              </span>
              Aerviora provides prototype environmental decision support based on
              modelled data. It does not provide medical advice, diagnose conditions
              or guarantee that an activity is safe. Follow official local warnings
              and your existing healthcare plan.
            </div>
          </div>
        </details>

        {/* Secondary Outline Action: Refresh Conditions */}
        <button
          type="button"
          onClick={onRefresh}
          className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-[#1F5A55] bg-white border border-[#1F5A55]/30 hover:bg-[#1F5A55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center"
        >
          Refresh conditions
        </button>

        {/* Quiet Tertiary Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onEditCheck}
            className="py-2.5 px-4 rounded-xl font-semibold text-xs text-[#0A2928]/80 bg-white border border-[#0A2928]/15 hover:bg-gray-50 hover:text-[#0A2928] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center"
          >
            Edit check
          </button>
          <button
            type="button"
            onClick={onReset}
            className="py-2.5 px-4 rounded-xl font-semibold text-xs text-[#0A2928]/80 bg-white border border-[#0A2928]/15 hover:bg-gray-50 hover:text-[#0A2928] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center"
          >
            Start another check
          </button>
        </div>
      </div>
    </div>
  );
}
