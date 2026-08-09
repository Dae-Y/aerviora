"use client";

import type { DemoScenarioId } from "@/lib/demo/environmental-scenarios";

export interface DemoScenarioControlsProps {
  selectedScenario: DemoScenarioId | null;
  onSelectScenario: (scenario: DemoScenarioId | null) => void;
}

const SCENARIOS: { id: DemoScenarioId; label: string; description: string }[] = [
  {
    id: "improving-day",
    label: "Improving day",
    description: "Varying conditions: morning lower, afternoon peak, evening easing",
  },
  {
    id: "dust-spike",
    label: "Dust spike",
    description: "Stable temperature with severe afternoon particulate spike",
  },
  {
    id: "persistent-heat",
    label: "Persistent heat",
    description: "Continuous extreme heat with no meaningful relief",
  },
];

export function DemoScenarioControls({
  selectedScenario,
  onSelectScenario,
}: DemoScenarioControlsProps) {
  return (
    <section
      aria-label="Presenter demo scenarios"
      className="p-4 sm:p-5 rounded-2xl bg-[#0A2928]/[0.03] border border-[#1F5A55]/20 backdrop-blur-xs space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-900 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" aria-hidden="true" />
            DEMO SCENARIO
          </span>
          <h2 className="text-sm font-semibold text-[#0A2928] mt-1">
            Simulated environmental conditions
          </h2>
        </div>
        <p className="text-xs text-[#0A2928]/70">
          Presenter scenario mode
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenario === sc.id;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => onSelectScenario(sc.id)}
              aria-pressed={isSelected}
              className={`flex flex-col items-start text-left p-3 rounded-xl border text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] ${
                isSelected
                  ? "bg-[#1F5A55] text-white border-[#1F5A55] shadow-sm font-medium"
                  : "bg-white text-[#0A2928] border-gray-200 hover:border-[#1F5A55]/40 hover:bg-[#1F5A55]/[0.03]"
              }`}
            >
              <span className="font-semibold">{sc.label}</span>
              <span
                className={`text-[11px] mt-0.5 line-clamp-2 ${
                  isSelected ? "text-teal-100" : "text-[#0A2928]/60"
                }`}
              >
                {sc.description}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelectScenario(null)}
          aria-pressed={selectedScenario === null}
          className={`flex flex-col items-start text-left p-3 rounded-xl border text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] ${
            selectedScenario === null
              ? "bg-[#1F5A55] text-white border-[#1F5A55] shadow-sm font-medium"
              : "bg-white text-[#0A2928] border-gray-200 hover:border-[#1F5A55]/40 hover:bg-[#1F5A55]/[0.03]"
          }`}
        >
          <span className="font-semibold">○ Live data</span>
          <span
            className={`text-[11px] mt-0.5 ${
              selectedScenario === null ? "text-teal-100" : "text-[#0A2928]/60"
            }`}
          >
            Real Open-Meteo & CAMS data
          </span>
        </button>
      </div>
    </section>
  );
}
