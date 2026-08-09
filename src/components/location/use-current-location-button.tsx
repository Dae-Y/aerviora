"use client";

import type { BrowserLocationStatus, CheckLocation } from "@/lib/location/types";
import { requestBrowserLocation } from "@/lib/location/browser-geolocation";

export interface UseCurrentLocationButtonProps {
  status: BrowserLocationStatus;
  location?: CheckLocation | null;
  onStatusChange: (status: BrowserLocationStatus, location?: CheckLocation, errorMsg?: string) => void;
  disabled?: boolean;
}

export function UseCurrentLocationButton({
  status,
  onStatusChange,
  disabled = false,
}: UseCurrentLocationButtonProps) {
  const handleClick = async () => {
    if (status === "requesting" || disabled) return;
    onStatusChange("requesting");
    const result = await requestBrowserLocation();
    onStatusChange(result.status, result.location, result.errorReason);
  };

  const isBusy = status === "requesting";

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy || disabled}
        aria-busy={isBusy}
        className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-100 font-medium hover:bg-teal-100/60 dark:hover:bg-teal-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        <svg
          aria-hidden="true"
          className={`w-5 h-5 text-teal-600 dark:text-teal-400 ${isBusy ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isBusy ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          )}
        </svg>
        <span>
          {isBusy ? "Finding your location…" : "Use my current location"}
        </span>
      </button>

      {status === "denied" && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Location access was not allowed. Search for a city or choose a prototype city instead.
        </p>
      )}

      {(status === "unavailable" || status === "timed-out" || status === "error") && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Your current location could not be determined. Search for a city or choose a prototype city instead.
        </p>
      )}
    </div>
  );
}
