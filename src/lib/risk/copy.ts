import type {
  PersonalisedRiskLevel,
  PersonalisedRiskAction,
  PersonalisedActionRecommendation,
  InputConfidence,
  RiskDriver,
  DomainAssessment,
  AggregatedRiskResult,
  SensitivityProfile,
  ExposureDemand,
  EnvironmentalSnapshot,
} from "./types";


export interface RiskPresentationContext {
  level: PersonalisedRiskLevel;
  domainAssessments: DomainAssessment[];
  aggregatedResult: AggregatedRiskResult;
  sensitivityProfile: SensitivityProfile;
  exposureDemand: ExposureDemand;
  snapshot: EnvironmentalSnapshot;
}

export interface RiskCopyPresentation {
  title: string;
  summary: string;
  actionLabel: string;
  confidenceLabel: string;
  importantNote: string;
}

export const RISK_LEVEL_DISPLAY_LABELS: Record<PersonalisedRiskLevel, string> = {
  lower: "Lower environmental concern",
  elevated: "Elevated environmental concern",
  high: "High environmental concern",
  "very-high": "Very high environmental risk",
  unable: "Guidance unavailable",
};

export const RISK_COPY_BY_LEVEL: Record<
  PersonalisedRiskLevel,
  { title: string; summary: string; importantNote: string }
> = {
  lower: {
    title: RISK_LEVEL_DISPLAY_LABELS.lower,
    summary:
      "Conditions are generally suitable for your planned activity.",
    importantNote:
      "This result is based on modelled environmental data and prototype rules. It is not medical advice and does not guarantee that an activity is safe. Check official local warnings and follow your existing healthcare plan.",
  },
  elevated: {
    title: RISK_LEVEL_DISPLAY_LABELS.elevated,
    summary:
      "Some environmental conditions are elevated. Stay aware of current conditions and adjust if needed.",
    importantNote:
      "This result is based on modelled environmental data and prototype rules. It is not medical advice and does not guarantee that an activity is safe. Check official local warnings and follow your existing healthcare plan.",
  },
  high: {
    title: RISK_LEVEL_DISPLAY_LABELS.high,
    summary:
      "Consider reducing exposure duration or intensity, or choose a lower-exposure time.",
    importantNote:
      "This result is based on modelled environmental data and prototype rules. It is not medical advice and does not guarantee that an activity is safe. Check official local warnings and follow your existing healthcare plan.",
  },
  "very-high": {
    title: RISK_LEVEL_DISPLAY_LABELS["very-high"],
    summary:
      "The current combination of environmental conditions produced the highest prototype risk category.",
    importantNote:
      "This result is based on modelled environmental data and prototype rules. It is not medical advice and does not guarantee that an activity is safe. Check official local warnings and follow your existing healthcare plan.",
  },
  unable: {
    title: RISK_LEVEL_DISPLAY_LABELS.unable,
    summary:
      "A reliable guidance result could not be calculated from the available environmental data.",
    importantNote:
      "This result is based on modelled environmental data and prototype rules. It is not medical advice and does not guarantee that an activity is safe. Check official local warnings and follow your existing healthcare plan.",
  },
};

export type ElevatedCopyContext =
  | "sensitivity"
  | "multi-domain"
  | "particulate"
  | "thermal"
  | "uv"
  | "generic";

/**
 * Explicit severity rank helper to avoid string comparison bugs.
 * lower: 0, elevated: 1, high: 2, severe: 3
 */
export function severityRank(severity?: string): number {
  switch (severity) {
    case "severe":
    case "very-high":
      return 3;
    case "high":
      return 2;
    case "elevated":
    case "upper-elevated":
      return 1;
    case "lower":
    default:
      return 0;
  }
}

export function isAtLeastElevated(severity?: string): boolean {
  return severityRank(severity) >= 1;
}

/**
 * Resolves elevated copy context with exact 4-tier precedence:
 * Priority 1 — Relevant sensitivity
 * Priority 2 — Multiple elevated primary domains
 * Priority 3 — Single primary domain
 * Priority 4 — Generic fallback
 */
export function resolveElevatedCopyContext(
  context: Pick<
    RiskPresentationContext,
    "level" | "domainAssessments" | "aggregatedResult"
  >
): ElevatedCopyContext {
  if (context.level !== "elevated") {
    return "generic";
  }

  const partAss = context.domainAssessments.find((d) => d.domain === "particulate");
  const thermalAss = context.domainAssessments.find((d) => d.domain === "thermal");

  const hasRelevantPartSensitivity =
    partAss &&
    isAtLeastElevated(partAss.effectiveSeverity) &&
    (partAss.susceptibility === "moderate" || partAss.susceptibility === "strong");

  const hasRelevantThermalSensitivity =
    thermalAss &&
    isAtLeastElevated(thermalAss.effectiveSeverity) &&
    (thermalAss.susceptibility === "moderate" || thermalAss.susceptibility === "strong");

  if (hasRelevantPartSensitivity || hasRelevantThermalSensitivity) {
    return "sensitivity";
  }

  if (context.aggregatedResult.primaryDomains.length > 1) {
    return "multi-domain";
  }

  if (context.aggregatedResult.primaryDomains.length === 1) {
    const primary = context.aggregatedResult.primaryDomains[0];
    if (primary === "particulate" || primary === "thermal" || primary === "uv") {
      return primary;
    }
  }

  return "generic";
}

export const ELEVATED_RECOMMENDATIONS: Record<
  ElevatedCopyContext,
  PersonalisedActionRecommendation
> = {
  sensitivity: {
    key: "consider-small-adjustments",
    title: "A few small adjustments may help",
    explanation:
      "Consider small adjustments to timing or duration based on the conditions that affect you.",
  },
  "multi-domain": {
    key: "proceed-awareness",
    title: "Generally favourable, with one factor to note",
    explanation:
      "Conditions are generally favourable, although several environmental conditions are worth noting.",
  },
  particulate: {
    key: "proceed-awareness",
    title: "Generally favourable, with one factor to note",
    explanation:
      "Conditions are generally favourable, although air quality is not ideal.",
  },
  thermal: {
    key: "proceed-awareness",
    title: "Generally favourable, with one factor to note",
    explanation:
      "Conditions are generally favourable, although heat conditions are worth noting.",
  },
  uv: {
    key: "proceed-awareness",
    title: "Sun protection recommended",
    explanation:
      "Current UV conditions call for sunscreen, sunglasses and shade where practical.",
  },
  generic: {
    key: "proceed-awareness",
    title: "Generally favourable, with one factor to note",
    explanation:
      "Conditions are generally favourable, although one or more environmental conditions are worth noting.",
  },
};

export const LOWER_RECOMMENDATION: PersonalisedActionRecommendation = {
  key: "proceed-awareness",
  title: "Looks good overall",
  explanation: "Conditions are generally favourable for your planned activity.",
};

export const HIGH_RECOMMENDATION: PersonalisedActionRecommendation = {
  key: "delay-shorten-reduce",
  title: "Consider reducing duration or intensity",
  explanation:
    "Consider reducing exposure duration or intensity, or choose a lower-exposure time.",
};

export const VERY_HIGH_RECOMMENDATION: PersonalisedActionRecommendation = {
  key: "postpone",
  title: "Consider postponing the activity",
  explanation:
    "Consider postponing the activity or choosing a substantially lower-exposure time.",
};

export const UNABLE_RECOMMENDATION: PersonalisedActionRecommendation = {
  key: "review-information",
  title: "Review the available information",
  explanation:
    "A reliable guidance result could not be calculated from the available environmental data.",
};

export function resolvePersonalisedAction(
  context: RiskPresentationContext
): PersonalisedActionRecommendation {
  if (context.level === "unable") {
    return UNABLE_RECOMMENDATION;
  }

  if (context.level === "very-high") {
    return VERY_HIGH_RECOMMENDATION;
  }

  if (context.level === "high") {
    return HIGH_RECOMMENDATION;
  }

  if (context.level === "elevated") {
    const copyContext = resolveElevatedCopyContext(context);
    if (copyContext === "particulate") {
      const partAss = context.domainAssessments.find((d) => d.domain === "particulate");
      if (partAss?.particulateBaseBand === "moderate-context") {
        return {
          key: "proceed-awareness",
          title: "Generally favourable, with one factor to note",
          explanation:
            "Conditions are generally favourable, although moderate air quality is more relevant for your planned activity or sensitivity.",
        };
      }
    }
    return ELEVATED_RECOMMENDATIONS[copyContext];
  }

  // Level is lower
  const partAss = context.domainAssessments.find((d) => d.domain === "particulate");
  if (partAss?.particulateBaseBand === "moderate-context") {
    return {
      key: "proceed-awareness",
      title: "Looks good overall",
      explanation:
        "Conditions are generally favourable for your planned activity. Air quality is in the US AQI Moderate range, so people who are especially sensitive may still notice effects.",
    };
  }

  return LOWER_RECOMMENDATION;
}

export const CONFIDENCE_LABELS: Record<InputConfidence, string> = {
  high: "High data confidence",
  moderate: "Moderate data confidence",
  low: "Low data confidence",
};

export const CONFIDENCE_EXPLANATION =
  "Data confidence reflects the completeness of the environmental inputs and the applicability of the prototype rules. It does not represent clinical certainty or guarantee that an activity is safe.";

export const ACTION_LABELS: Record<PersonalisedRiskAction, string> = {
  "proceed-awareness": "Proceed with awareness",
  "consider-small-adjustments": "Stay aware and consider small adjustments",
  "delay-shorten-reduce": "Consider reducing duration or intensity",
  postpone: "Consider postponing the activity",
  "review-information": "Review the available information",
};

export function getActionLabel(
  level: PersonalisedRiskLevel,
  action: PersonalisedRiskAction
): string {
  if (action === "review-information") return "Review the available information";
  if (action === "proceed-awareness") return "Proceed with awareness";
  if (action === "consider-small-adjustments") return "Stay aware and consider small adjustments";
  if (action === "delay-shorten-reduce") return "Consider reducing duration or intensity";
  if (action === "postpone") return "Consider postponing the activity";
  return ACTION_LABELS[action] || "Proceed with awareness";
}

export function getRiskCopyPresentation(
  level: PersonalisedRiskLevel,
  action: PersonalisedRiskAction,
  confidence: InputConfidence
): RiskCopyPresentation {
  const levelCopy = RISK_COPY_BY_LEVEL[level];
  return {
    title: levelCopy.title,
    summary: levelCopy.summary,
    actionLabel: getActionLabel(level, action),
    confidenceLabel: CONFIDENCE_LABELS[confidence] || "Low data confidence",
    importantNote: levelCopy.importantNote,
  };
}

/**
 * Builds deterministic risk drivers based on authoritative engine domain assessments.
 * Order:
 * 1. Primary particulate environment driver
 * 2. Primary thermal environment driver
 * 3. UV protection driver (single protection driver)
 * 4. Relevant sensitivity drivers
 * 5. Exposure demand driver (at most one)
 * 6. Humidity context driver
 */
export function buildRiskDrivers(context: RiskPresentationContext): RiskDriver[] {
  const drivers: RiskDriver[] = [];
  const { domainAssessments, sensitivityProfile, exposureDemand, snapshot } = context;

  const partAss = domainAssessments.find((d) => d.domain === "particulate");
  const thermalAss = domainAssessments.find((d) => d.domain === "thermal");
  const uvAss = domainAssessments.find((d) => d.domain === "uv");

  // 1. Particulate Environmental Driver
  if (partAss) {
    if (partAss.particulateBaseBand === "moderate-context") {
      if (partAss.effectiveSeverity === "elevated") {
        drivers.push({
          key: "particulate-moderate-promoted",
          category: "environment",
          label: "Air quality is moderate",
          explanation:
            "US AQI is in the Moderate range, but it may be more relevant for your planned activity and personal sensitivity.",
          direction: "increases-risk",
          severity: "moderate",
        });
      } else {
        drivers.push({
          key: "particulate-moderate-context",
          category: "context",
          label: "Air quality is moderate",
          explanation:
            "US AQI is in the Moderate range. Air quality is generally acceptable, although people who are especially sensitive may notice effects.",
          direction: "context",
          severity: "minor",
        });
      }
    } else if (isAtLeastElevated(partAss.effectiveSeverity)) {
      if (partAss.effectiveSeverity === "severe") {
        drivers.push({
          key: "particulate-severe",
          category: "environment",
          label: "Air quality is very high",
          explanation: "Current particle levels support substantially reducing or postponing outdoor exposure.",
          direction: "increases-risk",
          severity: "major",
        });
      } else if (partAss.effectiveSeverity === "high") {
        drivers.push({
          key: "particulate-high",
          category: "environment",
          label: "Air quality is high",
          explanation: "Reducing outdoor exposure duration or intensity may be worthwhile.",
          direction: "increases-risk",
          severity: "major",
        });
      } else if (partAss.effectiveSeverity === "elevated") {
        drivers.push({
          key: "particulate-upper-elevated",
          category: "environment",
          label: "Air quality is elevated",
          explanation: "Air quality is not ideal, particularly for longer or higher-effort outdoor activity.",
          direction: "increases-risk",
          severity: "moderate",
        });
      }
    }
  }

  // 2. Thermal Environmental Driver
  if (thermalAss && isAtLeastElevated(thermalAss.effectiveSeverity)) {
    if (thermalAss.effectiveSeverity === "severe") {
      drivers.push({
        key: "thermal-severe",
        category: "environment",
        label: "Heat conditions are very high",
        explanation: "Current apparent temperature supports postponing or substantially reducing outdoor exposure.",
        direction: "increases-risk",
        severity: "major",
      });
    } else if (thermalAss.effectiveSeverity === "high") {
      drivers.push({
        key: "thermal-high",
        category: "environment",
        label: "Heat conditions are high",
        explanation: "Reducing duration or intensity, or choosing a cooler time, may be worthwhile.",
        direction: "increases-risk",
        severity: "major",
      });
    } else if (thermalAss.effectiveSeverity === "elevated") {
      drivers.push({
        key: "thermal-elevated",
        category: "environment",
        label: "Heat conditions are elevated",
        explanation: "Apparent temperature is warm enough to be worth noting for your planned activity.",
        direction: "increases-risk",
        severity: "moderate",
      });
    }
  }

  // 3. UV Protection Driver (Single Protection Driver for UV >= 6)
  if (uvAss && isAtLeastElevated(uvAss.protectionSeverity)) {
    if (uvAss.protectionSeverity === "high") {
      drivers.push({
        key: "uv-high",
        category: "protection",
        label: "High UV protection needed",
        explanation: "Use strong sun protection, including sunscreen, sunglasses and shade where practical.",
        direction: "context",
        severity: "moderate",
      });
    } else {
      drivers.push({
        key: "uv-elevated",
        category: "protection",
        label: "UV protection is worth noting",
        explanation: "Use sunscreen, sunglasses and shade where practical.",
        direction: "context",
        severity: "minor",
      });
    }
  }

  // 4. Relevant Sensitivity Drivers
  if (
    partAss &&
    (isAtLeastElevated(partAss.effectiveSeverity) || partAss.particulateBaseBand === "moderate-context") &&
    sensitivityProfile.respiratory !== "not-affected"
  ) {
    const adverbMap: Record<string, string> = {
      slight: "slightly",
      moderate: "moderately",
      strong: "strongly",
    };
    const adverb = adverbMap[sensitivityProfile.respiratory] || "moderately";
    drivers.push({
      key: "sensitivity-respiratory",
      category: sensitivityProfile.respiratory === "slight" ? "context" : "sensitivity",
      label: "Respiratory sensitivity",
      explanation: `You reported being ${adverb} affected by air pollution, dust or smoke.`,
      direction: partAss.adjustmentApplied ? "increases-risk" : "context",
    });
  }

  if (thermalAss && isAtLeastElevated(thermalAss.effectiveSeverity) && sensitivityProfile.heat !== "not-affected") {
    const adverbMap: Record<string, string> = {
      slight: "slightly",
      moderate: "moderately",
      strong: "strongly",
    };
    const adverb = adverbMap[sensitivityProfile.heat] || "moderately";
    drivers.push({
      key: "sensitivity-heat",
      category: "sensitivity",
      label: "Heat sensitivity",
      explanation: `You reported being ${adverb} affected by hot weather.`,
      direction: thermalAss.adjustmentApplied ? "increases-risk" : "context",
    });
  }

  // 5. Exposure Demand Driver (At most one)
  const hasActiveDomain =
    (partAss &&
      (isAtLeastElevated(partAss.effectiveSeverity) ||
        (partAss.particulateBaseBand === "moderate-context" && partAss.adjustmentApplied))) ||
    (thermalAss && isAtLeastElevated(thermalAss.effectiveSeverity)) ||
    (uvAss && isAtLeastElevated(uvAss.protectionSeverity));

  if (hasActiveDomain && (exposureDemand === "moderate" || exposureDemand === "high")) {
    if (exposureDemand === "high") {
      drivers.push({
        key: "exposure-high",
        category: "exposure",
        label: "High exposure demand",
        explanation: "Your planned activity or duration creates a higher exposure demand.",
        direction: "context",
      });
    } else {
      drivers.push({
        key: "exposure-moderate",
        category: "exposure",
        label: "Moderate exposure demand",
        explanation: "Your planned activity or duration creates a moderate exposure demand.",
        direction: "context",
      });
    }
  }

  // 6. Humidity Context Driver
  const current = snapshot.current;
  if (
    current &&
    current.relativeHumidityPercent !== undefined &&
    current.relativeHumidityPercent >= 70 &&
    thermalAss &&
    isAtLeastElevated(thermalAss.baseSeverity)
  ) {
    drivers.push({
      key: "humidity-context",
      category: "context",
      label: "High relative humidity",
      explanation: "High humidity may make warm conditions feel less comfortable.",
      direction: "context",
      severity: "minor",
    });
  }

  return drivers;
}

/**
 * Builds risk limitations separately from drivers.
 */
export function buildRiskLimitations(context: RiskPresentationContext): string[] {
  const limitations: string[] = [];

  if (context.sensitivityProfile.hayFever !== "not-affected") {
    limitations.push(
      "Live pollen data is not yet included, so your seasonal pollen selection did not change this result."
    );
  }

  limitations.push(
    "Evaluation uses documented non-medical prototype thresholds and modelled regional data."
  );

  return limitations;
}

export interface MappedDriverCopy {
  label: string;
  explanation: string;
}

export function getDriverCopy(driver: RiskDriver): MappedDriverCopy {
  return {
    label: driver.label,
    explanation: driver.explanation,
  };
}
