import type { ActivityOption } from "@/lib/check-options";
import type {
  PersonalisedRiskInput,
  PersonalisedRiskResult,
  PersonalisedRiskAction,
  InputConfidence,
  EnvironmentalDomain,
  DomainSeverity,
  ParticulateBaseBand,
  ExposureDemand,
  SensitivityProfile,
  SensitivityInput,
  DomainAssessment,
  AggregatedRiskResult,
} from "./types";
import { assessDataReadiness } from "./data-readiness";
import {
  resolvePersonalisedAction,
  buildRiskDrivers,
  buildRiskLimitations,
  UNABLE_RECOMMENDATION,
  type RiskPresentationContext,
} from "./copy";

/* Threshold Constants (Documented Non-Medical Thresholds) */
export const THERMAL_ELEVATED_C = 27.0;
export const THERMAL_HIGH_C = 32.0;
export const THERMAL_VERY_HIGH_C = 38.0;

export const PM25_ELEVATED_UGM3 = 15.0;
export const PM25_HIGH_UGM3 = 35.0;

export const PM10_ELEVATED_UGM3 = 45.0;
export const PM10_HIGH_UGM3 = 100.0;

export const DUST_ELEVATED_UGM3 = 25.0;
export const DUST_HIGH_UGM3 = 50.0;

export const UV_ELEVATED_INDEX = 6.0;
export const UV_HIGH_INDEX = 8.0;

export const LONG_DURATION_MINUTES = 120;
export const MODERATE_DURATION_MINUTES = 60;

/**
 * Normalises legacy binary sensitivity arrays or passes SensitivityProfile through unchanged.
 * Legacy `true` selections map to "moderate", unselected to "not-affected".
 */
export function normaliseSensitivities(
  sensitivities: SensitivityInput
): SensitivityProfile {
  if (Array.isArray(sensitivities)) {
    return {
      respiratory: sensitivities.includes("respiratory")
        ? "moderate"
        : "not-affected",
      heat: sensitivities.includes("heat") ? "moderate" : "not-affected",
      hayFever: sensitivities.includes("hay-fever") ? "moderate" : "not-affected",
    };
  }

  return sensitivities;
}

/**
 * Resolves physical exertion and duration into a single bounded ExposureDemand.
 * Humidity is excluded from ExposureDemand.
 */
export function resolveExposureDemand(
  activity: ActivityOption | null,
  durationMinutes: number | null
): ExposureDemand {
  const duration = durationMinutes ?? 30;
  const isHighExertion = activity === "exercise" || activity === "outdoor-work";

  if (isHighExertion && duration >= 60) return "high";
  if (duration >= 120) return "high";
  if (isHighExertion && duration < 60) return "moderate";
  if (duration >= 60 && duration < 120) return "moderate";
  return "low";
}

/**
 * Resolves particle U.S. AQI value from available PM2.5 and PM10 AQIs.
 * Returns max of valid AQIs, or single valid AQI if only one is present, or undefined if neither is valid.
 */
export function resolveParticleUsAqi(
  pm25UsAqi?: number,
  pm10UsAqi?: number
): number | undefined {
  const isPm25Valid = pm25UsAqi !== undefined && Number.isFinite(pm25UsAqi);
  const isPm10Valid = pm10UsAqi !== undefined && Number.isFinite(pm10UsAqi);

  if (isPm25Valid && isPm10Valid) {
    return Math.max(pm25UsAqi!, pm10UsAqi!);
  }
  if (isPm25Valid) return pm25UsAqi!;
  if (isPm10Valid) return pm10UsAqi!;
  return undefined;
}

/**
 * Evaluates the particulate domain assessment given a validated numeric particle AQI.
 * Uses respiratory sensitivity as personal susceptibility.
 * Hay-fever sensitivity does NOT uplift particulate risk without pollen provider data.
 */
export function assessParticulateDomain(
  aqi: number,
  profile: SensitivityProfile,
  exposure: ExposureDemand
): DomainAssessment {
  let particulateBaseBand: ParticulateBaseBand = "lower";
  let baseSeverity: DomainSeverity = "lower";

  if (aqi > 200) {
    particulateBaseBand = "severe";
    baseSeverity = "severe";
  } else if (aqi > 150) {
    particulateBaseBand = "high";
    baseSeverity = "high";
  } else if (aqi > 100) {
    particulateBaseBand = "upper-elevated";
    baseSeverity = "elevated";
  } else if (aqi > 50) {
    particulateBaseBand = "moderate-context";
    baseSeverity = "lower";
  } else {
    particulateBaseBand = "lower";
    baseSeverity = "lower";
  }

  const susceptibility = profile.respiratory;
  let effectiveSeverity: DomainSeverity = baseSeverity;
  let adjustmentApplied = false;
  let upliftReason: string | null = null;
  let capApplied: string | null = null;

  if (particulateBaseBand === "lower") {
    return {
      domain: "particulate",
      baseSeverity: "lower",
      particulateBaseBand,
      effectiveSeverity: "lower",
      susceptibility,
      exposureDemand: exposure,
      adjustmentApplied: false,
      upliftReason: null,
      capApplied: null,
    };
  }

  if (particulateBaseBand === "moderate-context") {
    // AQI 51-100: Base severity is lower. Personalised promotion to elevated when relevant.
    const isHighExposure = exposure === "high";
    const isElevatedSusceptibility =
      susceptibility === "moderate" || susceptibility === "strong";

    if (isElevatedSusceptibility || isHighExposure) {
      effectiveSeverity = "elevated";
      adjustmentApplied = true;

      const sensitivityLabel =
        susceptibility === "moderate"
          ? "Moderate respiratory susceptibility"
          : susceptibility === "strong"
          ? "Strong respiratory susceptibility"
          : null;

      if (sensitivityLabel && isHighExposure) {
        upliftReason = `${sensitivityLabel} and high planned exposure demand made moderate air quality more relevant.`;
      } else if (sensitivityLabel) {
        upliftReason = `${sensitivityLabel} made moderate air quality more relevant.`;
      } else {
        upliftReason = "High planned exposure demand made moderate air quality more relevant.";
      }
    } else {
      effectiveSeverity = "lower";
    }
  } else if (particulateBaseBand === "upper-elevated") {
    // AQI 101-150: upper-elevated base band
    if (susceptibility === "not-affected" || susceptibility === "slight") {
      if (exposure === "high") {
        effectiveSeverity = "high";
        adjustmentApplied = true;
        upliftReason = "High exposure demand";
      } else {
        effectiveSeverity = "elevated";
      }
    } else if (susceptibility === "moderate") {
      if (exposure === "high") {
        effectiveSeverity = "high";
        adjustmentApplied = true;
        upliftReason = "High exposure demand";
      } else {
        effectiveSeverity = "elevated";
      }
    } else if (susceptibility === "strong") {
      if (exposure === "moderate" || exposure === "high") {
        effectiveSeverity = "high";
        adjustmentApplied = true;
        upliftReason = "Strong respiratory sensitivity";
        capApplied = "Particulate effective severity capped at high for AQI 101–150";
      } else {
        effectiveSeverity = "elevated";
      }
    }
  } else if (particulateBaseBand === "high") {
    // AQI 151-200: base high
    if (susceptibility === "strong" && exposure === "high") {
      effectiveSeverity = "severe";
      adjustmentApplied = true;
      upliftReason = "Strong respiratory sensitivity and high exposure demand";
    } else {
      effectiveSeverity = "high";
    }
  } else if (particulateBaseBand === "severe") {
    effectiveSeverity = "severe";
  }

  return {
    domain: "particulate",
    baseSeverity,
    particulateBaseBand,
    effectiveSeverity,
    susceptibility,
    exposureDemand: exposure,
    adjustmentApplied,
    upliftReason,
    capApplied,
  };
}

/**
 * Evaluates the thermal domain assessment given a validated numeric apparent temperature.
 * Uses heat sensitivity as personal susceptibility.
 */
export function assessThermalDomain(
  apparentTempC: number,
  profile: SensitivityProfile,
  exposure: ExposureDemand
): DomainAssessment {
  let baseSeverity: DomainSeverity = "lower";

  if (apparentTempC >= THERMAL_VERY_HIGH_C) {
    baseSeverity = "severe";
  } else if (apparentTempC >= THERMAL_HIGH_C) {
    baseSeverity = "high";
  } else if (apparentTempC >= THERMAL_ELEVATED_C) {
    baseSeverity = "elevated";
  } else {
    baseSeverity = "lower";
  }

  const susceptibility = profile.heat;
  let effectiveSeverity: DomainSeverity = baseSeverity;
  let adjustmentApplied = false;
  let upliftReason: string | null = null;
  let capApplied: string | null = null;

  // Hazard Gating: lower base severity always remains lower (< 27°C)
  if (baseSeverity === "lower") {
    return {
      domain: "thermal",
      baseSeverity: "lower",
      effectiveSeverity: "lower",
      susceptibility,
      exposureDemand: exposure,
      adjustmentApplied: false,
      upliftReason: null,
      capApplied: null,
    };
  }

  if (baseSeverity === "elevated") {
    // 27.0 - 31.9°C:
    if (susceptibility === "moderate" && exposure === "high") {
      effectiveSeverity = "high";
      adjustmentApplied = true;
      upliftReason = "Moderate heat sensitivity and high exposure demand";
    } else if (
      susceptibility === "strong" &&
      (exposure === "moderate" || exposure === "high")
    ) {
      effectiveSeverity = "high";
      adjustmentApplied = true;
      upliftReason = "Strong heat sensitivity";
      capApplied = "Thermal effective severity capped at high for apparent temp 27.0–31.9°C";
    } else {
      effectiveSeverity = "elevated";
    }
  } else if (baseSeverity === "high") {
    // 32.0 - 37.9°C:
    if (susceptibility === "strong" && exposure === "high") {
      effectiveSeverity = "severe";
      adjustmentApplied = true;
      upliftReason = "Strong heat sensitivity and high exposure demand";
    } else {
      effectiveSeverity = "high";
    }
  } else if (baseSeverity === "severe") {
    effectiveSeverity = "severe";
  }

  return {
    domain: "thermal",
    baseSeverity,
    effectiveSeverity,
    susceptibility,
    exposureDemand: exposure,
    adjustmentApplied,
    upliftReason,
    capApplied,
  };
}

/**
 * Evaluates the UV domain assessment given a validated numeric UV index.
 * Separates protection demand severity from overall risk contribution.
 */
export function assessUvDomain(
  uvIndex: number,
  exposure: ExposureDemand
): DomainAssessment {
  let protectionSeverity: "lower" | "elevated" | "high" = "lower";
  let overallRiskContribution: "lower" | "elevated" = "lower";
  let capApplied: string | null = null;

  if (uvIndex >= UV_HIGH_INDEX) {
    protectionSeverity = "high";
    overallRiskContribution = "elevated";
    capApplied = "UV overall risk contribution capped at elevated";
  } else if (uvIndex >= UV_ELEVATED_INDEX) {
    protectionSeverity = "elevated";
    overallRiskContribution = "elevated";
  } else {
    protectionSeverity = "lower";
    overallRiskContribution = "lower";
  }

  const baseSeverity: DomainSeverity = protectionSeverity;
  const effectiveSeverity: DomainSeverity = overallRiskContribution;

  return {
    domain: "uv",
    baseSeverity,
    effectiveSeverity,
    protectionSeverity,
    overallRiskContribution,
    susceptibility: "not-affected",
    exposureDemand: exposure,
    adjustmentApplied: false,
    upliftReason: null,
    capApplied,
  };
}

/**
 * Resolves qualifying severe domains or objective high base domains for very-high calculation.
 */
export function resolveVeryHighPrimaryDomains(
  assessments: DomainAssessment[]
): EnvironmentalDomain[] {
  const severeDomains = assessments
    .filter((a) => a.effectiveSeverity === "severe")
    .map((a) => a.domain);

  if (severeDomains.length > 0) {
    return severeDomains;
  }

  const objectiveHighDomains = assessments
    .filter(
      (a) =>
        a.baseSeverity === "high" &&
        a.effectiveSeverity === "high" &&
        a.domain !== "uv"
    )
    .map((a) => a.domain);

  if (objectiveHighDomains.length >= 2) {
    return objectiveHighDomains;
  }

  return [];
}

/**
 * Single source of truth for cross-domain aggregation and final overall risk level resolution.
 */
export function aggregateCrossDomainRisk(
  assessments: DomainAssessment[]
): AggregatedRiskResult {
  const veryHighPrimaryDomains = resolveVeryHighPrimaryDomains(assessments);

  // 1. Any severe effective domain OR two objective base-high domains => very-high
  if (veryHighPrimaryDomains.length > 0) {
    return { level: "very-high", primaryDomains: veryHighPrimaryDomains };
  }

  const highDomains = assessments
    .filter((a) => a.effectiveSeverity === "high")
    .map((a) => a.domain);

  // 2. One or more effective high domains (including context-promoted) => high
  if (highDomains.length >= 1) {
    return { level: "high", primaryDomains: highDomains };
  }

  const elevatedDomains = assessments
    .filter((a) => a.effectiveSeverity === "elevated")
    .map((a) => a.domain);

  // 3. One or more elevated domains => elevated
  if (elevatedDomains.length >= 1) {
    return { level: "elevated", primaryDomains: elevatedDomains };
  }

  // 4. Otherwise => lower
  return { level: "lower", primaryDomains: [] };
}

/**
 * Deterministically evaluates a personalised current-condition risk result
 * from a live environmental snapshot and user check inputs using Risk Model v2.
 */
export function evaluatePersonalisedRisk({
  snapshot,
  input,
  referenceTime,
}: PersonalisedRiskInput): PersonalisedRiskResult {
  // 1. Data Readiness Source-of-Truth Check
  const readiness = assessDataReadiness({
    snapshot,
    input,
    referenceTime,
  });

  if (readiness.status === "insufficient" || !snapshot.current) {
    return {
      level: "unable",
      action: "review-information",
      recommendation: UNABLE_RECOMMENDATION,
      confidence: "low",
      drivers: [],
      limitations: [
        "Required environmental inputs were missing or stale.",
        "Aerviora requires current weather and air-quality data to evaluate your check.",
      ],
      evaluatedAt: referenceTime,
    };
  }

  const current = snapshot.current;
  const limitations: string[] = [];

  let confidence: InputConfidence = "high";
  if (readiness.status === "partial") {
    confidence = "moderate";
    if (readiness.missingSignals.length > 0) {
      limitations.push(
        `Some contextual signals (${readiness.missingSignals.join(
          ", "
        )}) were unavailable.`
      );
    }
  }

  limitations.push(
    "Evaluation uses documented non-medical prototype thresholds and modelled regional data."
  );

  // Step 1: Normalise inputs
  const profile = normaliseSensitivities(input.sensitivities);
  const exposure = resolveExposureDemand(input.activity, input.durationMinutes);

  // Step 2: Extract validated numeric domain inputs
  const particleAqi = resolveParticleUsAqi(current.pm25UsAqi, current.pm10UsAqi) ?? 0;
  const apparentTempC = current.apparentTemperatureC ?? 20.0;
  const uvIndex = current.uvIndex ?? 0.0;

  // Step 3: Domain Assessments
  const particulateAssessment = assessParticulateDomain(particleAqi, profile, exposure);
  const thermalAssessment = assessThermalDomain(apparentTempC, profile, exposure);
  const uvAssessment = assessUvDomain(uvIndex, exposure);

  const domainAssessments = [particulateAssessment, thermalAssessment, uvAssessment];

  // Step 4: Cross-Domain Aggregation (Single Source of Truth)
  const v2Result = aggregateCrossDomainRisk(domainAssessments);
  const level = v2Result.level;

  // Step 5: Presentation Layer Context (Non-Circular)
  const presentationContext: RiskPresentationContext = {
    level,
    domainAssessments,
    aggregatedResult: v2Result,
    sensitivityProfile: profile,
    exposureDemand: exposure,
    snapshot,
  };

  const recommendation = resolvePersonalisedAction(presentationContext);
  const drivers = buildRiskDrivers(presentationContext);

  const extraLimitations = buildRiskLimitations(presentationContext);
  for (const lim of extraLimitations) {
    if (!limitations.includes(lim)) {
      limitations.push(lim);
    }
  }

  const action: PersonalisedRiskAction = recommendation.key;

  return {
    level,
    action,
    recommendation,
    confidence,
    drivers,
    limitations,
    evaluatedAt: referenceTime,
    domainAssessments,
    v2Result,
  };
}
