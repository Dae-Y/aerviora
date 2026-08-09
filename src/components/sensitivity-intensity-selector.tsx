"use client";

import type { SensitivityIntensity } from "@/lib/risk/types";
import {
  SENSITIVITY_INTENSITY_OPTIONS,
  SensitivityCategoryKey,
} from "@/lib/check-options";

export interface SensitivityIntensitySelectorProps {
  categoryKey: SensitivityCategoryKey;
  title: string;
  description: string;
  example: string;
  note?: string;
  value: SensitivityIntensity;
  onChange: (value: SensitivityIntensity) => void;
}

const PASTEL_STYLES: Record<
  SensitivityIntensity,
  { unselected: string; selected: string }
> = {
  "not-affected": {
    unselected:
      "bg-emerald-50/50 hover:bg-emerald-100/40 text-[#0A2928]/80 border-transparent",
    selected:
      "bg-emerald-100 border-emerald-600/60 text-[#0A2928] font-semibold ring-1 ring-emerald-600/40 shadow-2xs",
  },
  slight: {
    unselected:
      "bg-amber-50/50 hover:bg-amber-100/40 text-[#0A2928]/80 border-transparent",
    selected:
      "bg-amber-100 border-amber-600/60 text-[#0A2928] font-semibold ring-1 ring-amber-600/40 shadow-2xs",
  },
  moderate: {
    unselected:
      "bg-orange-50/50 hover:bg-orange-100/40 text-[#0A2928]/80 border-transparent",
    selected:
      "bg-orange-100 border-orange-600/60 text-[#0A2928] font-semibold ring-1 ring-orange-600/40 shadow-2xs",
  },
  strong: {
    unselected:
      "bg-rose-50/50 hover:bg-rose-100/40 text-[#0A2928]/80 border-transparent",
    selected:
      "bg-rose-100 border-rose-600/60 text-[#0A2928] font-semibold ring-1 ring-rose-600/40 shadow-2xs",
  },
};

export function SensitivityIntensitySelector({
  categoryKey,
  title,
  description,
  example,
  note,
  value,
  onChange,
}: SensitivityIntensitySelectorProps) {
  const radioGroupName = `sensitivity-${categoryKey}`;
  const descId = `sensitivity-${categoryKey}-desc`;
  const exampleId = `sensitivity-${categoryKey}-example`;
  const noteId = note ? `sensitivity-${categoryKey}-note` : undefined;

  const describedBy = [descId, exampleId, noteId].filter(Boolean).join(" ");

  return (
    <fieldset className="space-y-3 p-5 rounded-2xl bg-white/80 border border-[#0A2928]/10 shadow-xs">
      <legend className="sr-only">{title}</legend>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[#0A2928]">{title}</h2>
        <p id={descId} className="text-xs sm:text-sm text-[#0A2928]/80 leading-relaxed">
          {description}
        </p>
        <p id={exampleId} className="text-xs text-[#4E7C77] leading-relaxed">
          {example}
        </p>
        {note && (
          <p
            id={noteId}
            className="text-[11px] text-[#0A2928]/60 leading-relaxed italic pt-0.5"
          >
            {note}
          </p>
        )}
      </div>

      {/* Connected Segmented Intensity Selector */}
      <div className="p-1 rounded-xl border border-[#0A2928]/15 bg-[#0A2928]/[0.03] grid grid-cols-2 sm:grid-cols-4 gap-1">
        {SENSITIVITY_INTENSITY_OPTIONS.map((opt) => {
          const isChecked = value === opt.value;
          const inputId = `sensitivity-${categoryKey}-${opt.value}`;
          const style = PASTEL_STYLES[opt.value];

          return (
            <label
              key={opt.value}
              htmlFor={inputId}
              className={`relative flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg border text-center cursor-pointer transition-all min-h-[44px] select-none ${
                isChecked ? style.selected : style.unselected
              }`}
            >
              <input
                id={inputId}
                type="radio"
                name={radioGroupName}
                value={opt.value}
                checked={isChecked}
                aria-describedby={describedBy}
                onChange={() => onChange(opt.value)}
                className="sr-only peer"
              />

              {isChecked && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#1F5A55] flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              <span className="text-xs sm:text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-[#1F5A55] peer-focus-visible:ring-offset-1 rounded-md transition-all">
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
