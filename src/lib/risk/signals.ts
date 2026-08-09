import type { OutdoorCheckInput } from "@/lib/check-options";
import type { EnvironmentalSignalKey, OutdoorCheckInputV2 } from "./types";
import { CORE_SIGNALS } from "./types";
import { normaliseSensitivities } from "./engine";

/**
 * Returns a deterministic, duplicate-free ordered list of environmental signals
 * relevant to the user's outdoor check setup (baseline + optional sensitivities + activity).
 *
 * This represents "relevant signals" for technical data-readiness evaluation,
 * NOT a medical calculation or health risk score.
 */
export function getRelevantSignals(
  input: OutdoorCheckInput | OutdoorCheckInputV2
): EnvironmentalSignalKey[] {
  const signalSet = new Set<EnvironmentalSignalKey>(CORE_SIGNALS);

  // Additional signals from optional sensitivities
  const profile = normaliseSensitivities(input.sensitivities);

  if (profile.respiratory !== "not-affected") {
    signalSet.add("pm25UgM3");
    signalSet.add("pm10UgM3");
    signalSet.add("dustUgM3");
  }

  if (profile.hayFever !== "not-affected") {
    signalSet.add("pollenLevel");
    signalSet.add("windSpeedKph");
  }

  if (profile.heat !== "not-affected") {
    signalSet.add("apparentTemperatureC");
    signalSet.add("relativeHumidityPercent");
  }

  // Additional signals from planned activity effort level
  if (input.activity === "exercise" || input.activity === "outdoor-work") {
    signalSet.add("apparentTemperatureC");
    signalSet.add("relativeHumidityPercent");
    signalSet.add("uvIndex");
  }

  // Preserved stable output order
  const ORDER: readonly EnvironmentalSignalKey[] = [
    "apparentTemperatureC",
    "relativeHumidityPercent",
    "pm25UgM3",
    "pm10UgM3",
    "airTemperatureC",
    "windSpeedKph",
    "uvIndex",
    "pollenLevel",
    "dustLevel",
    "dustUgM3",
  ];

  return ORDER.filter((sig) => signalSet.has(sig));
}
