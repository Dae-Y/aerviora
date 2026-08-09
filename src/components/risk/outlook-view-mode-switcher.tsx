"use client";

import type { OutlookViewMode } from "@/lib/risk/multi-day-outlook";

export interface OutlookViewModeSwitcherProps {
  currentMode: OutlookViewMode;
  onModeChange: (mode: OutlookViewMode) => void;
}

export function OutlookViewModeSwitcher({
  currentMode,
  onModeChange,
}: OutlookViewModeSwitcherProps) {
  const modes: { id: OutlookViewMode; label: string; description: string }[] = [
    { id: "day", label: "Day", description: "Detailed timeline for selected date" },
    { id: "three-days", label: "3 Days", description: "Three-day outdoor planning summary" },
    { id: "week", label: "Week", description: "Seven-day weekly planning summary" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Personalised outlook view mode"
      className="inline-flex items-center p-1 rounded-2xl bg-[#0A2928]/[0.06] border border-[#0A2928]/10 w-full sm:w-auto"
    >
      {modes.map((mode) => {
        const isSelected = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`${mode.label}: ${mode.description}`}
            onClick={() => onModeChange(mode.id)}
            className={`flex-1 sm:flex-initial min-h-[44px] px-5 py-2 rounded-xl text-sm font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] cursor-pointer ${
              isSelected
                ? "bg-white text-[#0A2928] shadow-xs border border-[#0A2928]/10"
                : "text-[#0A2928]/70 hover:text-[#0A2928] hover:bg-white/50"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
