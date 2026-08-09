"use client";

import type { OutlookDayKey } from "@/lib/risk/personalised-outlook";

export interface OutlookDayTabsProps {
  activeTab: OutlookDayKey;
  onTabChange: (tab: OutlookDayKey) => void;
  todayDateLabel?: string;
  tomorrowDateLabel?: string;
}

export function OutlookDayTabs({
  activeTab,
  onTabChange,
}: OutlookDayTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Personalised outlook forecast days"
      className="flex items-center p-1 rounded-2xl bg-[#0A2928]/[0.06] border border-[#0A2928]/10"
    >
      <button
        id="tab-today"
        type="button"
        role="tab"
        aria-selected={activeTab === "today"}
        aria-controls="panel-today"
        tabIndex={activeTab === "today" ? 0 : -1}
        onClick={() => onTabChange("today")}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onTabChange("tomorrow");
        }}
        className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] ${
          activeTab === "today"
            ? "bg-white text-[#0A2928] shadow-xs"
            : "text-[#0A2928]/70 hover:text-[#0A2928]"
        }`}
      >
        Today
      </button>

      <button
        id="tab-tomorrow"
        type="button"
        role="tab"
        aria-selected={activeTab === "tomorrow"}
        aria-controls="panel-tomorrow"
        tabIndex={activeTab === "tomorrow" ? 0 : -1}
        onClick={() => onTabChange("tomorrow")}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onTabChange("today");
        }}
        className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] ${
          activeTab === "tomorrow"
            ? "bg-white text-[#0A2928] shadow-xs"
            : "text-[#0A2928]/70 hover:text-[#0A2928]"
        }`}
      >
        Tomorrow
      </button>
    </div>
  );
}
