"use client";

import type { CurrentEnvironmentalSample } from "@/lib/risk/types";
import { LocalContextMap } from "./local-context-map";

export interface LocalContextCardProps {
  displayName: string;
  latitude?: number;
  longitude?: number;
  currentConditions?: CurrentEnvironmentalSample;
  isDeviceLocation?: boolean;
}

function getAqiCategoryLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  return "Very Unhealthy";
}

export function LocalContextCard({
  displayName,
  latitude,
  longitude,
  currentConditions,
  isDeviceLocation = false,
}: LocalContextCardProps) {
  const hasCoords = latitude !== undefined && longitude !== undefined;

  const feelsLikeStr =
    currentConditions?.apparentTemperatureC !== undefined &&
    currentConditions.apparentTemperatureC !== null
      ? `${Math.round(currentConditions.apparentTemperatureC * 10) / 10}°C`
      : undefined;

  const aqiVal = currentConditions?.pm25UsAqi ?? currentConditions?.pm10UsAqi;

  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Nearby context
        </h3>
        {isDeviceLocation && (
          <span className="text-[11px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
            Device location
          </span>
        )}
      </div>

      {hasCoords && (
        <LocalContextMap
          latitude={latitude!}
          longitude={longitude!}
          displayName={displayName}
        />
      )}

      <div className="space-y-1">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          {displayName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Location used only for this check and not saved.
        </p>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          Regional modelled conditions near this location
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {aqiVal !== undefined && (
            <span>
              Regional modelled US AQI:{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {aqiVal} · {getAqiCategoryLabel(aqiVal)}
              </strong>
            </span>
          )}
          {feelsLikeStr && (
            <span>Feels like: <strong className="text-slate-900 dark:text-slate-100">{feelsLikeStr}</strong></span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          Data: Open-Meteo Weather and CAMS Air Quality
        </p>
      </div>
    </div>
  );
}
