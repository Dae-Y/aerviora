import type {
  PersonalisedRiskLevel,
  DomainSeverity,
  ForecastRiskPoint,
} from "./types";
import { resolveParticleUsAqi } from "./engine";

export type OutlookRelativeTrend =
  | "peak"
  | "easing"
  | "best-available"
  | "similar";

export const OUTLOOK_TREND_THRESHOLDS = {
  apparentTemperatureDecreaseC: 2,
  particleAqiDecrease: 10,
} as const;

export interface OutlookComparisonProfile {
  level: PersonalisedRiskLevel;
  severeDomainCount: number;
  highDomainCount: number;
  elevatedDomainCount: number;
  particulateSeverity: DomainSeverity;
  thermalSeverity: DomainSeverity;
  uvProtectionSeverity: "lower" | "elevated" | "high";
  apparentTemperatureC: number | null;
  particleAqiUs: number | null;
}

export function buildOutlookComparisonProfile(
  point: ForecastRiskPoint
): OutlookComparisonProfile {
  const level = point.result.level;
  let severeDomainCount = 0;
  let highDomainCount = 0;
  let elevatedDomainCount = 0;
  let particulateSeverity: DomainSeverity = "lower";
  let thermalSeverity: DomainSeverity = "lower";
  let uvProtectionSeverity: "lower" | "elevated" | "high" = "lower";

  if (point.result.domainAssessments) {
    for (const d of point.result.domainAssessments) {
      if (d.effectiveSeverity === "severe") severeDomainCount++;
      else if (d.effectiveSeverity === "high") highDomainCount++;
      else if (d.effectiveSeverity === "elevated") elevatedDomainCount++;

      if (d.domain === "particulate") particulateSeverity = d.effectiveSeverity;
      if (d.domain === "thermal") thermalSeverity = d.effectiveSeverity;
      if (d.domain === "uv" && d.protectionSeverity) {
        uvProtectionSeverity = d.protectionSeverity;
      }
    }
  }

  const apparentTemperatureC = point.conditions.apparentTemperatureC ?? null;
  const particleAqiUs =
    resolveParticleUsAqi(point.conditions.pm25UsAqi, point.conditions.pm10UsAqi) ??
    null;

  return {
    level,
    severeDomainCount,
    highDomainCount,
    elevatedDomainCount,
    particulateSeverity,
    thermalSeverity,
    uvProtectionSeverity,
    apparentTemperatureC,
    particleAqiUs,
  };
}

const RISK_LEVEL_RANKS: Record<PersonalisedRiskLevel, number> = {
  lower: 0,
  elevated: 1,
  high: 2,
  "very-high": 3,
  unable: 99,
};

const UV_PROTECTION_RANKS: Record<"lower" | "elevated" | "high", number> = {
  lower: 0,
  elevated: 1,
  high: 2,
};

/**
 * Checks if profile b is meaningfully better than profile a based on defined trend thresholds.
 */
export function isMeaningfullyBetter(
  a: OutlookComparisonProfile,
  b: OutlookComparisonProfile
): boolean {
  if (RISK_LEVEL_RANKS[b.level] < RISK_LEVEL_RANKS[a.level]) return true;
  if (RISK_LEVEL_RANKS[b.level] > RISK_LEVEL_RANKS[a.level]) return false;

  if (b.severeDomainCount < a.severeDomainCount) return true;
  if (b.severeDomainCount > a.severeDomainCount) return false;

  if (b.highDomainCount < a.highDomainCount) return true;
  if (b.highDomainCount > a.highDomainCount) return false;

  if (b.elevatedDomainCount < a.elevatedDomainCount) return true;
  if (b.elevatedDomainCount > a.elevatedDomainCount) return false;

  if (
    UV_PROTECTION_RANKS[b.uvProtectionSeverity] <
    UV_PROTECTION_RANKS[a.uvProtectionSeverity]
  ) {
    return true;
  }
  if (
    UV_PROTECTION_RANKS[b.uvProtectionSeverity] >
    UV_PROTECTION_RANKS[a.uvProtectionSeverity]
  ) {
    return false;
  }

  if (
    a.apparentTemperatureC !== null &&
    b.apparentTemperatureC !== null &&
    a.apparentTemperatureC - b.apparentTemperatureC >=
      OUTLOOK_TREND_THRESHOLDS.apparentTemperatureDecreaseC
  ) {
    return true;
  }

  if (
    a.particleAqiUs !== null &&
    b.particleAqiUs !== null &&
    a.particleAqiUs - b.particleAqiUs >=
      OUTLOOK_TREND_THRESHOLDS.particleAqiDecrease
  ) {
    return true;
  }

  return false;
}

/**
 * Ranks two OutlookComparisonProfiles lexicographically.
 */
export function compareComparisonProfiles(
  a: OutlookComparisonProfile,
  b: OutlookComparisonProfile
): number {
  const rankLevel = RISK_LEVEL_RANKS[a.level] - RISK_LEVEL_RANKS[b.level];
  if (rankLevel !== 0) return rankLevel;

  const rankSevere = a.severeDomainCount - b.severeDomainCount;
  if (rankSevere !== 0) return rankSevere;

  const rankHigh = a.highDomainCount - b.highDomainCount;
  if (rankHigh !== 0) return rankHigh;

  const rankElevated = a.elevatedDomainCount - b.elevatedDomainCount;
  if (rankElevated !== 0) return rankElevated;

  const rankUv =
    UV_PROTECTION_RANKS[a.uvProtectionSeverity] -
    UV_PROTECTION_RANKS[b.uvProtectionSeverity];
  if (rankUv !== 0) return rankUv;

  if (a.apparentTemperatureC !== null && b.apparentTemperatureC !== null) {
    const diffTemp = a.apparentTemperatureC - b.apparentTemperatureC;
    if (Math.abs(diffTemp) >= OUTLOOK_TREND_THRESHOLDS.apparentTemperatureDecreaseC) {
      return diffTemp;
    }
  }

  if (a.particleAqiUs !== null && b.particleAqiUs !== null) {
    const diffAqi = a.particleAqiUs - b.particleAqiUs;
    if (Math.abs(diffAqi) >= OUTLOOK_TREND_THRESHOLDS.particleAqiDecrease) {
      return diffAqi;
    }
  }

  return 0;
}
