"use client";

import {
  resolveResultIllustrationScene,
  selectResultIllustration,
  type ResultIllustrationScene,
} from "@/lib/illustrations/result-illustrations";
import { ResultStateIllustration } from "@/components/risk/result-state-illustration";
import type { PersonalisedRiskLevel, CurrentEnvironmentalSample } from "@/lib/risk/types";

interface DemoCase {
  title: string;
  description: string;
  level: PersonalisedRiskLevel;
  current: CurrentEnvironmentalSample;
  timezone: string;
  expectedScene: ResultIllustrationScene;
}

const DEMO_CASES: DemoCase[] = [
  {
    title: "Lower Risk Daytime",
    description: "Clear conditions during daylight hours (Perth 14:00)",
    level: "lower",
    current: {
      observedAt: "2026-08-04T06:00:00Z", // 14:00 Perth
      airTemperatureC: 22.0,
      apparentTemperatureC: 22.0,
    },
    timezone: "Australia/Perth",
    expectedScene: "clear-day",
  },
  {
    title: "Lower Risk Evening",
    description: "Mild conditions during evening hours (Perth 20:00)",
    level: "lower",
    current: {
      observedAt: "2026-08-04T12:00:00Z", // 20:00 Perth
      airTemperatureC: 18.0,
      apparentTemperatureC: 18.0,
    },
    timezone: "Australia/Perth",
    expectedScene: "calm-evening",
  },
  {
    title: "Elevated Risk Daytime",
    description: "Moderate temperature/humidity background (Miri 13:00)",
    level: "elevated",
    current: {
      observedAt: "2026-08-04T05:00:00Z", // 13:00 Miri
      airTemperatureC: 29.0,
      apparentTemperatureC: 31.0,
    },
    timezone: "Asia/Kuching",
    expectedScene: "muted-day",
  },
  {
    title: "High Risk Intense Sun/Heat",
    description: "Strong UV and high apparent temperature (Colombo 12:00)",
    level: "high",
    current: {
      observedAt: "2026-08-04T06:30:00Z", // 12:00 Colombo
      apparentTemperatureC: 36.0,
      uvIndex: 9.0,
    },
    timezone: "Asia/Colombo",
    expectedScene: "harsh-sun-day",
  },
  {
    title: "High Risk Pollution & Haze",
    description: "Elevated particulate concentrations during daytime",
    level: "high",
    current: {
      observedAt: "2026-08-04T06:00:00Z",
      pm25UgM3: 45.0,
      pm10UgM3: 110.0,
    },
    timezone: "Asia/Dubai",
    expectedScene: "hazy-day",
  },
  {
    title: "Very High Hot Hazy Night",
    description: "Severe heat, humidity and particulate haze at night (Dubai 20:00)",
    level: "very-high",
    current: {
      observedAt: "2026-08-01T16:00:00Z", // 20:00 Dubai
      airTemperatureC: 35.3,
      apparentTemperatureC: 43.5,
      pm25UgM3: 66.1,
      dustUgM3: 80.0,
    },
    timezone: "Asia/Dubai",
    expectedScene: "hot-hazy-night",
  },
];

export function IllustrationSeedTester() {
  return (
    <div className="space-y-4 p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs">
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-[#0A2928]">
          Scene Resolution Resolver Previews
        </h2>
        <p className="text-xs text-[#4E7C77]">
          Previews conservative scene selection across representative environmental conditions and risk levels.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 pt-2">
        {DEMO_CASES.map((demo) => {
          const resolvedScene = resolveResultIllustrationScene({
            level: demo.level,
            current: demo.current,
            timezone: demo.timezone,
          });
          const asset = resolvedScene
            ? selectResultIllustration(resolvedScene)
            : null;

          return (
            <div
              key={demo.title}
              className="p-3.5 rounded-xl bg-gray-50 border border-[#0A2928]/10 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0A2928]">
                    {demo.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1F5A55]/10 text-[#1F5A55]">
                    {demo.level}
                  </span>
                </div>
                <p className="text-[11px] text-[#4E7C77] leading-snug">
                  {demo.description}
                </p>
              </div>

              {asset ? (
                <div className="space-y-2 pt-1">
                  <ResultStateIllustration
                    asset={asset}
                    level={demo.level}
                    loading="eager"
                  />
                  <div className="text-[10px] font-mono text-[#0A2928]/80 text-center">
                    Scene: <span className="font-bold text-[#1F5A55]">{asset.scene}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-100 text-center text-xs text-gray-500">
                  No scene resolved
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
