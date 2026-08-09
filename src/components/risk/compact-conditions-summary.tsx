"use client";

import type { CurrentEnvironmentalSample } from "@/lib/risk/types";
import {
  formatTemperatureC,
  formatConcentrationUgM3,
  formatUvIndex,
  formatUsAqiValue,
} from "@/lib/environment-format";

export interface CompactConditionsSummaryProps {
  current?: CurrentEnvironmentalSample;
}

export function CompactConditionsSummary({
  current,
}: CompactConditionsSummaryProps) {
  const feelsLike = formatTemperatureC(current?.apparentTemperatureC);
  const particleAqi = formatUsAqiValue(current?.pm25UsAqi, current?.pm10UsAqi);
  const uvIndex = formatUvIndex(current?.uvIndex);
  const dust = formatConcentrationUgM3(current?.dustUgM3);

  const metrics = [
    { label: "Feels like", value: feelsLike },
    { label: "Particle AQI (US)", value: particleAqi },
    { label: "UV index", value: uvIndex },
    { label: "Modelled dust", value: dust },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
          Current conditions
        </h2>
        <p className="text-xs text-[#4E7C77] font-medium mt-0.5">
          Key conditions used for this guidance
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {metrics.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 sm:p-4 rounded-xl bg-white/80 border border-[#0A2928]/10 shadow-xs space-y-1"
          >
            <dt className="text-xs font-medium text-[#4E7C77]">
              {item.label}
            </dt>
            <dd className="text-base sm:text-lg font-bold text-[#0A2928]">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
