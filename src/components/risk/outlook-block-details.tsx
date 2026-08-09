"use client";

import { useEffect, useRef } from "react";
import type { OutlookTimeBlock } from "@/lib/risk/personalised-outlook";
import { getDriverCopy } from "@/lib/risk/copy";
import { RecommendationFeedback } from "./recommendation-feedback";

export interface OutlookBlockDetailsProps {
  block: OutlookTimeBlock;
  onClose: () => void;
}

export function getBlockLevelBadgeStyle(level: OutlookTimeBlock["level"]): {
  badge: string;
  label: string;
  borderLeft: string;
} {
  switch (level) {
    case "lower":
      return {
        badge: "bg-teal-900/10 text-[#1F5A55] border-[#1F5A55]/20",
        label: "Lower environmental concern",
        borderLeft: "border-l-4 border-l-teal-600",
      };
    case "elevated":
      return {
        badge: "bg-amber-500/15 text-amber-900 border-amber-500/30",
        label: "Elevated environmental concern",
        borderLeft: "border-l-4 border-l-amber-500",
      };
    case "high":
      return {
        badge: "bg-orange-500/15 text-orange-950 border-orange-500/30",
        label: "High environmental concern",
        borderLeft: "border-l-4 border-l-orange-500",
      };
    case "very-high":
      return {
        badge: "bg-rose-500/15 text-rose-950 border-rose-500/30",
        label: "Very high environmental risk",
        borderLeft: "border-l-4 border-l-rose-600",
      };
    case "unable":
    default:
      return {
        badge: "bg-gray-500/15 text-gray-800 border-gray-400/30",
        label: "Guidance unavailable",
        borderLeft: "border-l-4 border-l-gray-400",
      };
  }
}

export function OutlookBlockDetails({ block, onClose }: OutlookBlockDetailsProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount & handle Escape key
  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const levelStyle = getBlockLevelBadgeStyle(block.level);
  const repPoint = block.representativePoint;

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-block-title"
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#0A2928]/10 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#0A2928]/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-block text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md border ${levelStyle.badge}`}
              >
                {levelStyle.label}
              </span>
              {block.relativeTrendLabel && (
                <span className="inline-block text-[11px] font-extrabold tracking-wide uppercase px-2.5 py-0.5 rounded-md border bg-[#0A2928]/[0.06] text-[#0A2928] border-[#0A2928]/15">
                  {block.relativeTrendLabel}
                </span>
              )}
            </div>

            <h2
              id="dialog-block-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2928]"
            >
              {block.displayTimeRange}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close time block details"
            className="p-2 rounded-full text-[#0A2928]/60 hover:text-[#0A2928] hover:bg-[#0A2928]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Action Title & Recommendation Explanation */}
        <div className="space-y-2">
          <h3 className="font-bold text-lg text-[#0A2928]">
            {block.actionTitle}
          </h3>
          {block.summary && (
            <p className="text-sm text-[#0A2928]/90 leading-relaxed">
              {block.summary}
            </p>
          )}
        </div>

        {/* Why (Drivers) */}
        {repPoint && repPoint.result.drivers.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#0A2928]/10">
            <h4 className="font-bold text-sm text-[#0A2928]">Why</h4>
            <ul className="space-y-1.5 text-xs sm:text-sm text-[#0A2928]/85">
              {repPoint.result.drivers.slice(0, 3).map((driver) => {
                const copy = getDriverCopy(driver);
                return (
                  <li key={driver.key} className="flex items-start gap-2">
                    <span className="text-[#1F5A55] font-bold">•</span>
                    <span>
                      <strong className="text-[#0A2928]">{copy.label}:</strong>{" "}
                      {copy.explanation}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Preparation Suggestions */}
        {block.preparationSuggestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#0A2928]/10">
            <h4 className="font-bold text-sm text-[#0A2928]">Preparation</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#0A2928]">
              {block.preparationSuggestions.map((item) => (
                <li
                  key={item.id}
                  className="p-2.5 rounded-xl bg-teal-900/5 border border-[#0A2928]/10 flex items-center gap-2 font-medium"
                >
                  <span className="text-[#1F5A55] font-bold">✓</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation Feedback (UI Prototype Only) */}
        <RecommendationFeedback />

        {/* Disclaimers & Notes */}
        <div className="space-y-1 pt-3 border-t border-[#0A2928]/10 text-[11px] text-[#0A2928]/70 leading-relaxed">
          <p>Forecast conditions may change.</p>
          <p>Each time reflects conditions expected around that possible start time.</p>
          <p>
            Block details represent conditions expected around the block’s first forecast start time.
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs text-[#0A2928] bg-[#0A2928]/[0.06] hover:bg-[#0A2928]/10 transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]"
        >
          Close details
        </button>
      </div>
    </div>
  );
}
