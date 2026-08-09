"use client";

import { useState, useRef } from "react";
import type { OutdoorCheckInput } from "@/lib/check-options";
import type { EnvironmentApiSuccess } from "@/lib/environment-api";
import { assessDataReadiness } from "@/lib/risk/data-readiness";
import type { DataReadinessResult, DataReadinessStatus } from "@/lib/risk/types";
import {
  formatTemperatureC,
  formatHumidityPercent,
  formatWindSpeedKph,
  formatConcentrationUgM3,
  formatUvIndex,
  formatEnvironmentalTimestamp,
  getEnvironmentalSignalLabel,
} from "@/lib/environment-format";
import { MetricTile } from "./environment/metric-tile";
import { MetricKey } from "./environment/metric-definitions";
import { MetricDetailDialog } from "./environment/metric-detail-dialog";
import {
  AirQualityRecoveryPanel,
  AirQualityRecoveryStatus,
} from "./environment/air-quality-recovery-panel";

export type EnvironmentSnapshotMode = "standalone" | "embedded";

export interface EnvironmentSnapshotViewProps {
  apiResponse: EnvironmentApiSuccess;
  input: OutdoorCheckInput;
  onRefresh: () => void;
  onEditCheck: () => void;
  onReset: () => void;
  onCalculatePersonalisedGuidance?: () => void;
  mode?: EnvironmentSnapshotMode;
  isRefreshing?: boolean;
  airQualityRecoveryStatus?: AirQualityRecoveryStatus;
  onRetryAirQuality?: () => void;
}

export function getCoveragePresentation(readiness: DataReadinessResult): {
  title: string;
  detail: string;
  status: DataReadinessStatus;
} {
  const missingCount =
    readiness.missingSignals.length + readiness.invalidSignals.length;

  if (readiness.status === "ready" || missingCount === 0) {
    return {
      title: "Complete data coverage",
      detail: "All required inputs available",
      status: "ready",
    };
  }

  if (readiness.status === "partial") {
    return {
      title: "Partial data coverage",
      detail:
        missingCount === 1
          ? "1 required input unavailable"
          : `${missingCount} required inputs unavailable`,
      status: "partial",
    };
  }

  return {
    title: "Insufficient data coverage",
    detail:
      missingCount === 1
        ? "1 required input unavailable"
        : `${missingCount} required inputs unavailable`,
    status: "insufficient",
  };
}

export function EnvironmentSnapshotView({
  apiResponse,
  input,
  onRefresh,
  onEditCheck,
  onReset,
  onCalculatePersonalisedGuidance,
  mode = "standalone",
  isRefreshing = false,
  airQualityRecoveryStatus = "idle",
  onRetryAirQuality,
}: EnvironmentSnapshotViewProps) {
  const { snapshot, resolvedLocation, retrievedAt } = apiResponse;
  const current = snapshot.current;
  const isStandalone = mode === "standalone";

  // Active metric detail modal state & focus restoration ref
  const [activeMetricKey, setActiveMetricKey] = useState<MetricKey | null>(null);
  const activeTileRef = useRef<HTMLButtonElement | null>(null);

  // Assess technical data readiness locally on the client
  const readiness = assessDataReadiness({
    snapshot,
    input,
    referenceTime: retrievedAt,
  });

  const coverageInfo = getCoveragePresentation(readiness);

  const isAirQualityRecovering =
    airQualityRecoveryStatus === "waiting" ||
    airQualityRecoveryStatus === "retrying";
  const isAirQualityFailed = airQualityRecoveryStatus === "failed";

  const displayCoverageTitle = isAirQualityRecovering
    ? "Weather conditions loaded"
    : isAirQualityFailed
    ? "Environmental snapshot loaded with incomplete air and exposure data"
    : coverageInfo.title;

  const displayCoverageDetail = isAirQualityRecovering
    ? "Updating air and exposure data…"
    : isAirQualityFailed
    ? "Air and exposure data unavailable"
    : coverageInfo.detail;

  const isDemo = apiResponse.sourceMode === "demo";

  const displayLiveMessage = isAirQualityRecovering
    ? "Updating air and exposure data."
    : isAirQualityFailed
    ? "Air and exposure data are temporarily unavailable."
    : isDemo
    ? `Simulated environmental scenario loaded for ${resolvedLocation.displayName}.`
    : `Current environmental snapshot loaded for ${resolvedLocation.displayName}.`;

  const isInvalid = (signalKey: string) =>
    readiness.invalidSignals.includes(
      signalKey as keyof typeof current
    );

  const failedSources = snapshot.sources.filter(
    (s) => s.status === "error" || s.status === "unavailable"
  );

  const unavailableSignalsList = Array.from(
    new Set([...readiness.missingSignals, ...readiness.invalidSignals])
  );

  // Helper for metric tile values (preserving numeric zero)
  const getFormattedValue = (key: MetricKey): { text: string; isUnavailable: boolean } => {
    if (isInvalid(key)) return { text: "Unavailable", isUnavailable: true };

    switch (key) {
      case "airTemperatureC": {
        const val = current?.airTemperatureC;
        const text = formatTemperatureC(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "apparentTemperatureC": {
        const val = current?.apparentTemperatureC;
        const text = formatTemperatureC(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "relativeHumidityPercent": {
        const val = current?.relativeHumidityPercent;
        const text = formatHumidityPercent(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "windSpeedKph": {
        const val = current?.windSpeedKph;
        const text = formatWindSpeedKph(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "pm25UgM3": {
        const val = current?.pm25UgM3;
        const text = formatConcentrationUgM3(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "pm10UgM3": {
        const val = current?.pm10UgM3;
        const text = formatConcentrationUgM3(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "dustUgM3": {
        const val = current?.dustUgM3;
        const text = formatConcentrationUgM3(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "uvIndex": {
        const val = current?.uvIndex;
        const text = formatUvIndex(val);
        return { text, isUnavailable: text === "Unavailable" };
      }
      case "pmUsAqi": {
        const is25 = current?.pm25UsAqi !== undefined && Number.isFinite(current.pm25UsAqi);
        const is10 = current?.pm10UsAqi !== undefined && Number.isFinite(current.pm10UsAqi);
        if (!is25 && !is10) {
          return { text: "Unavailable", isUnavailable: true };
        }
        const val = Math.max(
          is25 ? current!.pm25UsAqi! : -Infinity,
          is10 ? current!.pm10UsAqi! : -Infinity
        );
        return { text: Math.round(val).toString(), isUnavailable: false };
      }
    }
  };

  const handleOpenDetails = (
    key: MetricKey,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    activeTileRef.current = e.currentTarget;
    setActiveMetricKey(key);
  };

  const handleCloseDetails = () => {
    setActiveMetricKey(null);
    setTimeout(() => {
      activeTileRef.current?.focus();
    }, 50);
  };

  return (
    <div
      className={
        isStandalone
          ? "max-w-2xl mx-auto space-y-6"
          : "w-full space-y-6"
      }
    >
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite">
        {displayLiveMessage}
      </div>

      {isDemo && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          <span>DEMO SCENARIO · SIMULATED CONDITIONS</span>
        </div>
      )}

      {/* Header Section (Mode-Dependent) */}
      <div className="space-y-2">
        {isStandalone ? (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2928] leading-snug break-words">
                Resolved as {resolvedLocation.displayName}
              </h1>
              <p className="text-xs text-[#4E7C77]">
                Requested: &ldquo;{apiResponse.requestedLocation}&rdquo;
              </p>
            </div>
            <p className="text-sm text-[#0A2928]/80 leading-relaxed pt-1">
              These are current modelled environmental conditions. No environmental
              recommendation has been calculated yet.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold tracking-tight text-[#0A2928]">
              Underlying environmental conditions
            </h2>
            <p className="text-xs text-[#0A2928]/80 leading-relaxed">
              These are the modelled environmental conditions used for this personalised result. Select any metric to review its meaning, source and limitations.
            </p>
          </>
        )}
      </div>

      {/* Cohesive Status & Metadata Block (Amendment 6) */}
      <div className="bg-white/80 rounded-2xl p-4 border border-[#0A2928]/10 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#0A2928]/80 pb-2.5 border-b border-[#0A2928]/10">
          <div>
            <span className="font-semibold text-[#0A2928]">Data time: </span>
            {formatEnvironmentalTimestamp(
              current?.observedAt,
              resolvedLocation.timezone
            )}
          </div>
          <div>
            <span className="font-semibold text-[#0A2928]">Retrieved: </span>
            {formatEnvironmentalTimestamp(
              retrievedAt,
              resolvedLocation.timezone
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs pt-0.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isAirQualityRecovering
                  ? "bg-[#1F5A55]"
                  : isAirQualityFailed || coverageInfo.status !== "ready"
                  ? "bg-amber-600"
                  : "bg-[#1F5A55]"
              }`}
            />
            <span className="font-semibold text-[#0A2928]">{displayCoverageTitle}</span>
          </div>
          <span className="text-[11px] text-[#4E7C77]">
            {displayCoverageDetail}
          </span>
        </div>
      </div>

      {/* Main Section: Current Conditions */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#0A2928]">
            Current conditions
          </h3>
          <span className="text-xs text-[#4E7C77] font-medium">
            Tap any tile for details
          </span>
        </div>

        {/* Environmental Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Section 1: Weather */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
              Weather
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                label="Air temperature"
                value={getFormattedValue("airTemperatureC").text}
                icon="temperature"
                unavailable={getFormattedValue("airTemperatureC").isUnavailable}
                onOpenDetails={(e) => handleOpenDetails("airTemperatureC", e)}
                testId="tile-airTemperatureC"
              />
              <MetricTile
                label="Feels like"
                value={getFormattedValue("apparentTemperatureC").text}
                icon="feels-like"
                unavailable={
                  getFormattedValue("apparentTemperatureC").isUnavailable
                }
                onOpenDetails={(e) =>
                  handleOpenDetails("apparentTemperatureC", e)
                }
                testId="tile-apparentTemperatureC"
              />
              <MetricTile
                label="Humidity"
                value={getFormattedValue("relativeHumidityPercent").text}
                icon="humidity"
                unavailable={
                  getFormattedValue("relativeHumidityPercent").isUnavailable
                }
                onOpenDetails={(e) =>
                  handleOpenDetails("relativeHumidityPercent", e)
                }
                testId="tile-relativeHumidityPercent"
              />
              <MetricTile
                label="Wind speed"
                value={getFormattedValue("windSpeedKph").text}
                icon="wind"
                unavailable={getFormattedValue("windSpeedKph").isUnavailable}
                onOpenDetails={(e) => handleOpenDetails("windSpeedKph", e)}
                testId="tile-windSpeedKph"
              />
            </div>
          </section>

          {/* Section 2: Air and Exposure */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
              Air and exposure
            </h4>
            {airQualityRecoveryStatus && airQualityRecoveryStatus !== "idle" ? (
              <AirQualityRecoveryPanel
                status={airQualityRecoveryStatus}
                onRetry={onRetryAirQuality}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  label="PM2.5"
                  value={getFormattedValue("pm25UgM3").text}
                  icon="pm"
                  unavailable={getFormattedValue("pm25UgM3").isUnavailable}
                  onOpenDetails={(e) => handleOpenDetails("pm25UgM3", e)}
                  testId="tile-pm25UgM3"
                />
                <MetricTile
                  label="PM10"
                  value={getFormattedValue("pm10UgM3").text}
                  icon="pm"
                  unavailable={getFormattedValue("pm10UgM3").isUnavailable}
                  onOpenDetails={(e) => handleOpenDetails("pm10UgM3", e)}
                  testId="tile-pm10UgM3"
                />
                <MetricTile
                  label="Modelled dust"
                  value={getFormattedValue("dustUgM3").text}
                  icon="dust"
                  unavailable={getFormattedValue("dustUgM3").isUnavailable}
                  onOpenDetails={(e) => handleOpenDetails("dustUgM3", e)}
                  testId="tile-dustUgM3"
                />
                <MetricTile
                  label="UV index"
                  value={getFormattedValue("uvIndex").text}
                  icon="uv"
                  unavailable={getFormattedValue("uvIndex").isUnavailable}
                  onOpenDetails={(e) => handleOpenDetails("uvIndex", e)}
                  testId="tile-uvIndex"
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Expandable Data Quality & Sources Section (Accordion) */}
      <details className="group bg-white/80 rounded-2xl border border-[#0A2928]/10 shadow-xs overflow-hidden transition-all">
        <summary className="p-4 sm:p-5 font-semibold text-xs text-[#0A2928] uppercase tracking-wider cursor-pointer select-none flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]">
          <span>Data quality and sources</span>
          <span className="text-[#4E7C77] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="px-4 pb-5 sm:px-5 space-y-4 border-t border-[#0A2928]/10 pt-4 text-xs text-[#0A2928]/80 leading-relaxed">
          {/* Coverage Safety Note */}
          <div className="p-3 rounded-xl bg-[#1F5A55]/5 border border-[#1F5A55]/15 text-xs text-[#0A2928] leading-relaxed">
            Data coverage describes whether relevant environmental inputs are
            available. It does not indicate that outdoor activity is safe.
          </div>

          {/* Missing/Invalid Signals List */}
          {unavailableSignalsList.length > 0 && (
            <div className="space-y-1">
              <span className="block font-semibold uppercase tracking-wider opacity-75">
                Unavailable for this check
              </span>
              <ul className="list-disc list-inside space-y-0.5">
                {unavailableSignalsList.map((sig) => (
                  <li key={sig}>{getEnvironmentalSignalLabel(sig)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Partial Provider Failure Warning */}
          {failedSources.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 space-y-1">
              <p className="font-semibold">Some environmental data could not be retrieved.</p>
              <ul className="list-disc list-inside space-y-0.5">
                {failedSources.map((s) => (
                  <li key={s.kind}>
                    {s.kind === "weather"
                      ? "Weather data unavailable"
                      : s.kind === "air-quality"
                      ? "Air-quality data unavailable"
                      : `${s.provider} data unavailable`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Modelled Dust Disclaimer Note */}
          <div className="italic text-[#4E7C77]">
            Modelled dust data are not an official dust-storm warning.
          </div>

          {/* Stale Metadata Note */}
          <div className="text-[11px] text-[#4E7C77]">
            Stale data status is evaluated directly from current provider sample
            timestamps against technical freshness thresholds.
          </div>

          {/* Attribution & Links */}
          <div className="space-y-1.5 pt-2 border-t border-[#0A2928]/10">
            <h4 className="font-semibold text-[#0A2928] uppercase tracking-wider text-[11px]">
              Providers & Attribution
            </h4>
            <ul className="space-y-1">
              <li>
                Weather and air-quality access:{" "}
                <a
                  href="https://open-meteo.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#1F5A55] underline hover:text-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
                >
                  Open-Meteo
                </a>
              </li>
              <li>
                Air-quality modelling:{" "}
                <a
                  href="https://atmosphere.copernicus.eu"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#1F5A55] underline hover:text-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
                >
                  Copernicus Atmosphere Monitoring Service (CAMS)
                </a>
              </li>
              <li>
                Location data:{" "}
                <a
                  href="https://www.geonames.org"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#1F5A55] underline hover:text-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
                >
                  GeoNames via Open-Meteo
                </a>
              </li>
            </ul>
            <p className="text-[11px] text-[#4E7C77] pt-1">
              Open-Meteo free API is used under ODbL / non-commercial prototype
              terms.
            </p>
          </div>
        </div>
      </details>

      {/* Snapshot Action Buttons (Standalone Mode Only) */}
      {isStandalone && (
        <div className="space-y-3 pt-2">
          {onCalculatePersonalisedGuidance ? (
            <>
              {/* Calculate and Refresh on one row on desktop/tablet (70%/30%), stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-[70%_30%] gap-3 items-stretch">
                {/* Calculate is Primary CTA when provided */}
                <button
                  type="button"
                  onClick={onCalculatePersonalisedGuidance}
                  disabled={isAirQualityRecovering || isRefreshing}
                  className="w-full min-h-[48px] py-3.5 px-5 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-sm sm:text-base disabled:bg-[#0A2928]/10 disabled:text-[#0A2928]/40 disabled:border disabled:border-[#0A2928]/10 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center cursor-pointer"
                >
                  Calculate personalised guidance
                </button>

                {/* Refresh is Secondary Outline Action */}
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing || isAirQualityRecovering}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-[#1F5A55] bg-white border border-[#1F5A55]/30 hover:bg-[#1F5A55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap cursor-pointer"
                >
                  {isRefreshing ? "Refreshing…" : "Refresh conditions"}
                </button>
              </div>

              {isAirQualityRecovering && (
                <p className="text-xs text-[#4E7C77] text-center pt-0.5">
                  Waiting for complete air and exposure data
                </p>
              )}

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
            </>
          ) : (
            <>
              {/* Refresh is Primary/Strongest Action when Calculate is unavailable */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="w-full sm:w-auto min-h-[44px] py-3 px-6 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs text-center text-sm"
                >
                  Refresh conditions
                </button>
              </div>

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
            </>
          )}
        </div>
      )}

      {/* Metric Detail Surface (Modal / Bottom Sheet) */}
      <MetricDetailDialog
        isOpen={activeMetricKey !== null}
        metricKey={activeMetricKey}
        formattedValue={
          activeMetricKey ? getFormattedValue(activeMetricKey).text : ""
        }
        observedAtISO={current?.observedAt}
        timeZone={resolvedLocation.timezone}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
