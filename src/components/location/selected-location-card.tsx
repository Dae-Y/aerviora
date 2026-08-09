"use client";

import type { CheckLocation } from "@/lib/location/types";

export interface SelectedLocationCardProps {
  location: CheckLocation;
  onChangeLocation: () => void;
}

export function SelectedLocationCard({
  location,
  onChangeLocation,
}: SelectedLocationCardProps) {
  return (
    <div
      data-slot="selected-location-card"
      id="selected-location-card"
      className="w-full p-4.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
          Current location selected
        </span>
      </div>

      <div className="space-y-1">
        <p className="font-extrabold text-base sm:text-lg text-[#0A2928] dark:text-teal-100">
          {location.displayName}
        </p>
        <p className="text-xs text-[#0A2928]/70 dark:text-teal-300/80 font-medium leading-relaxed">
          Your location is used only for this check and is not saved.
        </p>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={onChangeLocation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1F5A55]/30 bg-white dark:bg-teal-900/40 text-[#1F5A55] dark:text-teal-200 text-xs font-bold hover:bg-teal-50 dark:hover:bg-teal-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] shadow-2xs cursor-pointer"
        >
          Change location
        </button>
      </div>
    </div>
  );
}
