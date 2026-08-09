import type { OutdoorCheckInput } from "@/lib/check-options";
import type {
  EnvironmentalSnapshot,
  DataReadinessResult,
  DomainAssessment,
  ExposureDemand,
} from "@/lib/risk/types";
import {
  normaliseSensitivities,
  resolveExposureDemand,
  assessParticulateDomain,
  assessThermalDomain,
  assessUvDomain,
  resolveParticleUsAqi,
} from "@/lib/risk/engine";
import type { PreparationSuggestion } from "./types";
import { ITEM_PRIORITIES } from "./rules";

export interface GetPreparationSuggestionsParams {
  snapshot?: EnvironmentalSnapshot | null;
  input?: OutdoorCheckInput | null;
  readiness?: DataReadinessResult | null;
  domainAssessments?: DomainAssessment[] | null;
}

export interface PreparationEvaluationContext {
  domainAssessments: DomainAssessment[];
  snapshot: EnvironmentalSnapshot;
}

const ACTIVE_THERMAL_SEVERITIES = new Set(["elevated", "high", "severe"]);
const HIGH_THERMAL_SEVERITIES = new Set(["high", "severe"]);
const HIGH_PARTICULATE_SEVERITIES = new Set(["high", "severe"]);

/**
 * Mask eligibility must remain domain-specific to the particulate assessment.
 */
export function shouldSuggestMask(
  particulate: DomainAssessment | undefined
): boolean {
  if (!particulate || particulate.domain !== "particulate") {
    return false;
  }

  // Rule 7.5: High or severe objective particulate base severity
  if (HIGH_PARTICULATE_SEVERITIES.has(particulate.baseSeverity)) {
    return true;
  }

  // Rule 7.6: Context-promoted high or severe effective severity
  if (HIGH_PARTICULATE_SEVERITIES.has(particulate.effectiveSeverity)) {
    return true;
  }

  // Rule 7.4: Upper-elevated particulate band
  if (particulate.particulateBaseBand === "upper-elevated") {
    if (
      particulate.susceptibility === "moderate" ||
      particulate.susceptibility === "strong" ||
      particulate.exposureDemand === "high"
    ) {
      return true;
    }
  }

  // Rule 7.3: Moderate-context particulate band
  if (particulate.particulateBaseBand === "moderate-context") {
    if (
      particulate.susceptibility === "strong" &&
      particulate.exposureDemand === "high"
    ) {
      return true;
    }
  }

  return false;
}

export function shouldSuggestSunscreen(
  uv: DomainAssessment | undefined
): boolean {
  if (!uv || uv.domain !== "uv") {
    return false;
  }
  return (
    uv.protectionSeverity === "elevated" || uv.protectionSeverity === "high"
  );
}

export function shouldSuggestSunglasses(
  uv: DomainAssessment | undefined
): boolean {
  if (!uv || uv.domain !== "uv") {
    return false;
  }
  return (
    uv.protectionSeverity === "elevated" || uv.protectionSeverity === "high"
  );
}

export function shouldSuggestShade(
  uv: DomainAssessment | undefined,
  thermal: DomainAssessment | undefined
): boolean {
  const uvQualifies =
    uv &&
    (uv.protectionSeverity === "elevated" || uv.protectionSeverity === "high");
  const thermalQualifies =
    thermal && HIGH_THERMAL_SEVERITIES.has(thermal.effectiveSeverity);
  return Boolean(uvQualifies || thermalQualifies);
}

export function shouldSuggestWater(
  thermal: DomainAssessment | undefined,
  exposureDemand: ExposureDemand
): boolean {
  const thermalQualifies =
    thermal && ACTIVE_THERMAL_SEVERITIES.has(thermal.effectiveSeverity);
  const exposureQualifies =
    exposureDemand === "moderate" || exposureDemand === "high";
  return Boolean(thermalQualifies || exposureQualifies);
}

export function shouldSuggestBreathableClothing(
  thermal: DomainAssessment | undefined,
  snapshot: EnvironmentalSnapshot
): boolean {
  if (!thermal || thermal.domain !== "thermal") {
    return false;
  }
  if (HIGH_THERMAL_SEVERITIES.has(thermal.effectiveSeverity)) {
    return true;
  }
  const humidity = snapshot.current?.relativeHumidityPercent;
  if (
    thermal.effectiveSeverity === "elevated" &&
    humidity !== undefined &&
    Number.isFinite(humidity) &&
    humidity >= 70
  ) {
    return true;
  }
  return false;
}

/**
 * Deterministically derives up to four contextual preparation suggestions
 * from an environmental snapshot and user check input using Risk Model v2.
 */
export function getPreparationSuggestions({
  snapshot,
  input,
  readiness,
  domainAssessments: providedAssessments,
}: GetPreparationSuggestionsParams): PreparationSuggestion[] {
  if (!snapshot || !snapshot.current || !input) {
    return [];
  }

  if (readiness && readiness.status === "insufficient") {
    return [];
  }

  const profile = normaliseSensitivities(input.sensitivities);
  const exposure = resolveExposureDemand(input.activity, input.durationMinutes);

  let domainAssessments: DomainAssessment[];

  if (providedAssessments && providedAssessments.length > 0) {
    domainAssessments = providedAssessments;
  } else {
    const current = snapshot.current;
    const particleAqi =
      resolveParticleUsAqi(current.pm25UsAqi, current.pm10UsAqi) ?? 0;
    const apparentTempC = current.apparentTemperatureC ?? 20.0;
    const uvIndex = current.uvIndex ?? 0.0;

    const particulate = assessParticulateDomain(particleAqi, profile, exposure);
    const thermal = assessThermalDomain(apparentTempC, profile, exposure);
    const uv = assessUvDomain(uvIndex, exposure);

    domainAssessments = [particulate, thermal, uv];
  }

  const particulateAss = domainAssessments.find((d) => d.domain === "particulate");
  const thermalAss = domainAssessments.find((d) => d.domain === "thermal");
  const uvAss = domainAssessments.find((d) => d.domain === "uv");

  const candidates: PreparationSuggestion[] = [];

  if (shouldSuggestMask(particulateAss)) {
    candidates.push({
      id: "protective-mask",
      label: "Well-fitting mask",
      reason: "Elevated particulate conditions",
      iconKey: "shield",
      priority: ITEM_PRIORITIES["protective-mask"],
    });
  }

  if (shouldSuggestSunscreen(uvAss)) {
    candidates.push({
      id: "sunscreen",
      label: "Sunscreen",
      reason: "Elevated UV conditions",
      iconKey: "sun",
      priority: ITEM_PRIORITIES.sunscreen,
    });
  }

  if (shouldSuggestWater(thermalAss, exposure)) {
    candidates.push({
      id: "water",
      label: "Water bottle",
      reason: "Warm outdoor conditions",
      iconKey: "droplets",
      priority: ITEM_PRIORITIES.water,
    });
  }

  if (shouldSuggestShade(uvAss, thermalAss)) {
    candidates.push({
      id: "sun-shade",
      label: "Sun hat or shade",
      reason: "Useful in strong sun or heat",
      iconKey: "sun-shade",
      priority: ITEM_PRIORITIES["sun-shade"],
    });
  }

  if (shouldSuggestSunglasses(uvAss)) {
    candidates.push({
      id: "sunglasses",
      label: "Sunglasses",
      reason: "Bright outdoor conditions",
      iconKey: "glasses",
      priority: ITEM_PRIORITIES.sunglasses,
    });
  }

  if (shouldSuggestBreathableClothing(thermalAss, snapshot)) {
    candidates.push({
      id: "breathable-clothing",
      label: "Light breathable clothing",
      reason: "Warm and humid conditions",
      iconKey: "shirt",
      priority: ITEM_PRIORITIES["breathable-clothing"],
    });
  }

  // Deduplicate candidates by ID
  const seenIds = new Set<string>();
  const uniqueCandidates: PreparationSuggestion[] = [];
  for (const item of candidates) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueCandidates.push(item);
    }
  }

  // Sort by priority descending, then item ID ascending for stable tie-breaking
  uniqueCandidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.id.localeCompare(b.id);
  });

  // Return maximum of 4 suggestions
  return uniqueCandidates.slice(0, 4);
}
