"use client";

import { useState } from "react";

export interface RecommendationFeedbackProps {
  question?: string;
  className?: string;
}

export type FeedbackSelection = "yes" | "no" | null;

export function resolveFeedbackSelection(
  _current: FeedbackSelection,
  choice: "yes" | "no"
): FeedbackSelection {
  return choice;
}

export function RecommendationFeedback({
  question = "Was this recommendation effective?",
  className = "",
}: RecommendationFeedbackProps) {
  const [selected, setSelected] = useState<FeedbackSelection>(null);

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-3 ${className}`}
    >
      <div className="space-y-1">
        <span className="block text-xs font-bold uppercase tracking-wider text-[#4E7C77]">
          Recommendation feedback
        </span>
        <p className="text-sm font-semibold text-[#0A2928]">{question}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-pressed={selected === "yes"}
          onClick={() => setSelected("yes")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] text-center ${
            selected === "yes"
              ? "bg-[#1F5A55] text-white border border-[#1F5A55] shadow-xs"
              : "bg-white text-[#0A2928] border border-[#0A2928]/20 hover:bg-[#0A2928]/[0.04]"
          }`}
        >
          Yes
        </button>

        <button
          type="button"
          aria-pressed={selected === "no"}
          onClick={() => setSelected("no")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] text-center ${
            selected === "no"
              ? "bg-[#1F5A55] text-white border border-[#1F5A55] shadow-xs"
              : "bg-white text-[#0A2928] border border-[#0A2928]/20 hover:bg-[#0A2928]/[0.04]"
          }`}
        >
          No
        </button>
      </div>

      <p className="text-[11px] text-[#4E7C77] leading-relaxed">
        Prototype feedback only. Your selection is not saved.
      </p>
    </div>
  );
}
