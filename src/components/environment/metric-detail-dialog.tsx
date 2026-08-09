"use client";

import { useEffect, useRef } from "react";
import { MetricKey, METRIC_DEFINITIONS } from "./metric-definitions";
import { MetricIcons } from "../icons/metric-icons";
import { formatEnvironmentalTimestamp } from "@/lib/environment-format";

export interface MetricDetailDialogProps {
  isOpen: boolean;
  metricKey: MetricKey | null;
  formattedValue: string;
  observedAtISO?: string;
  timeZone?: string;
  onClose: () => void;
}

export function MetricDetailDialog({
  isOpen,
  metricKey,
  formattedValue,
  observedAtISO,
  timeZone,
  onClose,
}: MetricDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else if (!isOpen && (dialog.open || dialog.hasAttribute("open"))) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [isOpen]);

  if (!isOpen || !metricKey) return null;

  const definition = METRIC_DEFINITIONS[metricKey];
  if (!definition) return null;

  const IconComponent = MetricIcons[definition.icon];

  const handleNativeCancel = (
    e: React.SyntheticEvent<HTMLDialogElement, Event>
  ) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleNativeCancel}
      onClick={handleBackdropClick}
      aria-labelledby="metric-detail-heading"
      aria-describedby="metric-detail-description"
      className="fixed inset-0 z-50 m-0 w-full max-w-none h-full max-h-none bg-transparent backdrop:bg-[#0A2928]/40 backdrop:backdrop-blur-xs p-0 overflow-y-auto flex items-end sm:items-center justify-center border-none"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl border border-[#0A2928]/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Icon + Title + Close Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F5A55]/10 text-[#1F5A55] flex items-center justify-center flex-shrink-0">
              <IconComponent size={22} />
            </div>
            <div>
              <h2
                id="metric-detail-heading"
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2928]"
              >
                {definition.label}
              </h2>
              <span className="text-xs font-semibold text-[#4E7C77]">
                {definition.sourceLabel}
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={`Close details for ${definition.label}`}
            className="p-2 rounded-xl text-[#0A2928]/60 hover:text-[#0A2928] hover:bg-[#0A2928]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors flex-shrink-0"
          >
            <svg
              className="w-5 h-5 stroke-current fill-none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Current Formatted Value Display */}
        <div className="p-4 rounded-2xl bg-[#F4F8F6] border border-[#0A2928]/10 space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
            Current value
          </span>
          <span className="block text-2xl font-extrabold text-[#0A2928]">
            {formattedValue}
          </span>
        </div>

        {/* Plain-Language Explanation */}
        <div id="metric-detail-description" className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4E7C77]">
            What this metric means
          </h3>
          <p className="text-sm text-[#0A2928]/85 leading-relaxed">
            {definition.explanation}
          </p>
        </div>

        {/* Data Time & Source Details */}
        <div className="space-y-2 pt-2 border-t border-[#0A2928]/10 text-xs">
          <div className="flex justify-between items-baseline gap-2">
            <span className="font-semibold text-[#4E7C77]">Data time:</span>
            <span className="font-medium text-[#0A2928]">
              {formatEnvironmentalTimestamp(observedAtISO, timeZone)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="font-semibold text-[#4E7C77]">Data source:</span>
            <span className="font-medium text-[#0A2928]">
              {definition.sourceLabel}
            </span>
          </div>
        </div>

        {/* Caveat / Limitation Note */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 leading-relaxed space-y-1">
          <span className="font-semibold block">Important note</span>
          <p>{definition.caveat}</p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors text-center text-sm shadow-xs"
          >
            Close details
          </button>
        </div>
      </div>
    </dialog>
  );
}
