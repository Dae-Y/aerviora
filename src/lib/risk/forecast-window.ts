import type { OutdoorCheckInput } from "@/lib/check-options";
import type {
  EnvironmentalSnapshot,
  ForecastEnvironmentalSample,
  CurrentEnvironmentalSample,
  PersonalisedRiskResult,
  PersonalisedRiskLevel,
  CalculableRiskLevel,
  InputConfidence,
  LowerRiskWindowResolution,
  LowerRiskWindow,
  ForecastRiskPoint,
  EnvironmentalMetricComparison,
  MetricChange,
} from "./types";
import { evaluatePersonalisedRisk } from "./engine";

/**
 * Explicit numeric rank mapping for risk levels (0: lower, 1: elevated, 2: high, 3: very-high, -1: unable).
 */
const RISK_LEVEL_RANKS: Record<PersonalisedRiskLevel, number> = {
  lower: 0,
  elevated: 1,
  high: 2,
  "very-high": 3,
  unable: -1,
};

/**
 * Explicit numeric rank mapping for confidence (1: low, 2: moderate, 3: high).
 */
const CONFIDENCE_RANKS: Record<InputConfidence, number> = {
  low: 1,
  moderate: 2,
  high: 3,
};

const CONFIDENCE_BY_RANK: Record<number, InputConfidence> = {
  1: "low",
  2: "moderate",
  3: "high",
};

/**
 * Evaluates an individual forecast hourly bucket using the existing personalised risk engine.
 *
 * SAFETY & FRESHNESS NOTE (Amendment 5):
 * To prevent future forecast buckets from failing current-data freshness checks,
 * referenceTime is explicitly set to the forecast point's own `validAt` timestamp.
 */
export function evaluateHourlyForecastPoint({
  point,
  snapshot,
  input,
}: {
  point: ForecastEnvironmentalSample;
  snapshot: EnvironmentalSnapshot;
  input: OutdoorCheckInput;
}): ForecastRiskPoint {
  const forecastSnapshot: EnvironmentalSnapshot = {
    ...snapshot,
    sources: snapshot.sources?.map((s) => ({
      ...s,
      observedAt: point.validAt,
      fetchedAt: point.validAt,
    })),
    current: {
      observedAt: point.validAt,
      airTemperatureC: point.airTemperatureC,
      apparentTemperatureC: point.apparentTemperatureC,
      relativeHumidityPercent: point.relativeHumidityPercent,
      windSpeedKph: point.windSpeedKph,
      uvIndex: point.uvIndex,
      pm25UgM3: point.pm25UgM3,
      pm10UgM3: point.pm10UgM3,
      pollenLevel: point.pollenLevel,
      dustLevel: point.dustLevel,
      dustUgM3: point.dustUgM3,
      pm25UsAqi: point.pm25UsAqi,
      pm10UsAqi: point.pm10UsAqi,
    },
  };

  const result = evaluatePersonalisedRisk({
    snapshot: forecastSnapshot,
    input,
    referenceTime: point.validAt,
  });

  return {
    startAt: point.validAt,
    result,
    conditions: point,
  };
}

/**
 * Computes neutral current-versus-forecast metric comparisons.
 *
 * AMENDMENT 10: Uses "decreased" | "increased" | "unchanged" | "unavailable".
 * Does NOT label "decreased" as "risk improved".
 */
export function compareEnvironmentalMetrics(
  current?: CurrentEnvironmentalSample,
  forecast?: ForecastEnvironmentalSample
): EnvironmentalMetricComparison[] {
  const keys: Array<EnvironmentalMetricComparison["key"]> = [
    "airTemperatureC",
    "apparentTemperatureC",
    "relativeHumidityPercent",
    "windSpeedKph",
    "pm25UgM3",
    "pm10UgM3",
    "dustUgM3",
    "uvIndex",
  ];

  return keys.map((key) => {
    const curVal = current?.[key] ?? null;
    const fVal = forecast?.[key] ?? null;

    let change: MetricChange = "unavailable";

    if (
      curVal !== null &&
      fVal !== null &&
      Number.isFinite(curVal) &&
      Number.isFinite(fVal)
    ) {
      if (fVal < curVal) {
        change = "decreased";
      } else if (fVal > curVal) {
        change = "increased";
      } else {
        change = "unchanged";
      }
    }

    return {
      key,
      currentValue: curVal,
      forecastValue: fVal,
      change,
    };
  });
}

/**
 * Derives structured driver keys that improved in the representative window result relative to current result.
 */
export function getImprovedDriverKeys(
  currentResult: PersonalisedRiskResult,
  representativeResult: PersonalisedRiskResult
): string[] {
  const currentRiskDriverKeys = currentResult.drivers
    .filter((d) => d.direction === "increases-risk")
    .map((d) => d.key);

  const repRiskDriverKeys = new Set(
    representativeResult.drivers
      .filter((d) => d.direction === "increases-risk")
      .map((d) => d.key)
  );

  return currentRiskDriverKeys.filter((key) => !repRiskDriverKeys.has(key));
}

/**
 * Helper estimating total internal score for tie-breaking.
 */
function getInternalTotalScore(result: PersonalisedRiskResult): number {
  if (result.level === "unable") return -1;
  if (result.level === "very-high") return 3;
  if (result.level === "high") return 2;
  if (result.level === "elevated") return 1;
  return 0;
}

/**
 * Resolves one deterministic, duration-aware lower-risk window over the next 24 hours.
 *
 * AMENDMENTS INCLUDED:
 * - Candidate start horizon: > T_ref and <= T_ref + 24 hours (Amendment 13).
 * - Window boundary: Half-open interval [startAt, endAt) where endAt = startAt + durationMinutes (Amendment 12).
 * - Conservative aggregation: Worst risk level, lowest confidence, highest peak score across included buckets (Amendment 6 & 15).
 * - Meaningful improvement: Window level must be at least 1 category below current level (Amendment 13).
 * - Deterministic ranking: Lowest risk level -> Lowest peak score -> Earliest start time (Amendment 16).
 * - Representative bucket: Highest risk level -> Highest peak score -> Earliest start time (Amendment 14).
 */
export function resolveLowerRiskWindow({
  snapshot,
  input,
  forecastPoints,
  referenceTime,
}: {
  snapshot: EnvironmentalSnapshot;
  input: OutdoorCheckInput;
  forecastPoints: ForecastEnvironmentalSample[];
  referenceTime: string;
}): LowerRiskWindowResolution {
  // 1. Calculate current personalised risk result
  const currentResult = evaluatePersonalisedRisk({
    snapshot,
    input,
    referenceTime,
  });

  if (currentResult.level === "unable" || !snapshot.current) {
    return {
      status: "unable",
      reason: "current-result-unavailable",
    };
  }

  const currentLevelRank = RISK_LEVEL_RANKS[currentResult.level];
  const currentLevel = currentResult.level as CalculableRiskLevel;

  // If current risk level is already "lower", no lower category exists
  if (currentLevel === "lower") {
    return {
      status: "not-found",
      reason: "current-already-lower",
      evaluatedCandidateCount: 0,
      referenceTime,
    };
  }

  const refMs = Date.parse(referenceTime);
  if (Number.isNaN(refMs)) {
    return {
      status: "unable",
      reason: "forecast-unavailable",
      referenceTime,
    };
  }

  // Filter out past, duplicate, unavailable and malformed forecast entries (Requirement 1, 2, 7)
  const validMap = new Map<string, ForecastEnvironmentalSample>();
  for (const pt of forecastPoints || []) {
    if (!pt || !pt.validAt) continue;
    const ptMs = Date.parse(pt.validAt);
    if (Number.isNaN(ptMs)) continue;
    if (ptMs <= refMs) continue; // Exclude entries <= current instant (refMs)
    if (!validMap.has(pt.validAt)) {
      validMap.set(pt.validAt, pt);
    }
  }

  const cleanForecastPoints = Array.from(validMap.values()).sort(
    (a, b) => Date.parse(a.validAt) - Date.parse(b.validAt)
  );

  if (cleanForecastPoints.length === 0) {
    return {
      status: "unable",
      reason: "insufficient-forecast-data",
      referenceTime,
    };
  }

  const maxHorizonMs = refMs + 24 * 60 * 60 * 1000;
  const durationMinutes = input.durationMinutes || 30;

  if (durationMinutes <= 0 || durationMinutes > 1440) {
    return {
      status: "unable",
      reason: "unsupported-duration",
      referenceTime,
    };
  }

  const durationMs = durationMinutes * 60 * 1000;
  const expectedBucketCount = Math.ceil(durationMinutes / 60);

  // Evaluate all clean forecast points per-hour, ignoring unavailable buckets
  const evaluatedPoints: ForecastRiskPoint[] = cleanForecastPoints
    .map((point) => evaluateHourlyForecastPoint({ point, snapshot, input }))
    .filter((p) => p.result.level !== "unable");

  // Filter candidate starts S_i in (refMs, maxHorizonMs]
  const candidateStarts = evaluatedPoints.filter((p) => {
    const ms = Date.parse(p.startAt);
    return !Number.isNaN(ms) && ms > refMs && ms <= maxHorizonMs;
  });

  if (candidateStarts.length === 0) {
    return {
      status: "unable",
      reason: "insufficient-forecast-data",
      referenceTime,
    };
  }

  interface QualifiedWindowCandidate {
    startAt: string;
    endAt: string;
    windowLevel: CalculableRiskLevel;
    windowLevelRank: number;
    confidence: InputConfidence;
    peakScore: number;
    includedPoints: ForecastRiskPoint[];
    representativePoint: ForecastRiskPoint;
  }

  const qualifiedCandidates: QualifiedWindowCandidate[] = [];
  let totalCandidateWindowsEvaluated = 0;

  // 3. Evaluate each candidate window starting at S_i
  for (const candidateStartPoint of candidateStarts) {
    const startMs = Date.parse(candidateStartPoint.startAt);
    const endMs = startMs + durationMs;
    const endAtISO = new Date(endMs).toISOString();

    // Identify hourly buckets intersecting half-open interval [startMs, endMs)
    const includedPoints = evaluatedPoints.filter((p) => {
      const pMs = Date.parse(p.startAt);
      return !Number.isNaN(pMs) && pMs >= startMs && pMs < endMs;
    });

    totalCandidateWindowsEvaluated++;

    // Check complete window requirement
    if (includedPoints.length < expectedBucketCount) {
      continue;
    }

    // Check consecutive hour spacing
    let isConsecutive = true;
    for (let i = 1; i < includedPoints.length; i++) {
      const prevMs = Date.parse(includedPoints[i - 1].startAt);
      const currMs = Date.parse(includedPoints[i].startAt);
      if (currMs - prevMs !== 60 * 60 * 1000) {
        isConsecutive = false;
        break;
      }
    }
    if (!isConsecutive) continue;

    // Check all included buckets are calculable (not "unable")
    if (includedPoints.some((p) => p.result.level === "unable")) {
      continue;
    }

    // Aggregation: Worst risk level, lowest confidence, peak score
    let worstRank = -1;
    let worstLevel: CalculableRiskLevel = "lower";
    let lowestConfRank = 999;
    let peakScore = -1;

    for (const p of includedPoints) {
      const rank = RISK_LEVEL_RANKS[p.result.level];
      if (rank > worstRank) {
        worstRank = rank;
        worstLevel = p.result.level as CalculableRiskLevel;
      }

      const confRank = CONFIDENCE_RANKS[p.result.confidence];
      if (confRank < lowestConfRank) {
        lowestConfRank = confRank;
      }

      const score = getInternalTotalScore(p.result);
      if (score > peakScore) {
        peakScore = score;
      }
    }

    const windowConfidence = CONFIDENCE_BY_RANK[lowestConfRank] || "high";

    // Meaningful improvement check: worst window level must be at least 1 category below current
    if (worstRank >= currentLevelRank) {
      continue;
    }

    // Determine representative bucket within window (highest risk rank -> highest peak score -> earliest start time)
    const representativePoint = [...includedPoints].sort((a, b) => {
      const rA = RISK_LEVEL_RANKS[a.result.level];
      const rB = RISK_LEVEL_RANKS[b.result.level];
      if (rA !== rB) return rB - rA;

      const sA = getInternalTotalScore(a.result);
      const sB = getInternalTotalScore(b.result);
      if (sA !== sB) return sB - sA;

      return Date.parse(a.startAt) - Date.parse(b.startAt);
    })[0];

    qualifiedCandidates.push({
      startAt: candidateStartPoint.startAt,
      endAt: endAtISO,
      windowLevel: worstLevel,
      windowLevelRank: worstRank,
      confidence: windowConfidence,
      peakScore,
      includedPoints,
      representativePoint,
    });
  }

  // If no complete duration window could be formed at all
  if (totalCandidateWindowsEvaluated === 0) {
    return {
      status: "unable",
      reason: "no-complete-duration-window",
    };
  }

  // If no candidate achieved meaningful improvement
  if (qualifiedCandidates.length === 0) {
    return {
      status: "not-found",
      reason: "no-meaningful-improvement",
      evaluatedCandidateCount: totalCandidateWindowsEvaluated,
    };
  }

  // 4. Select best candidate window (lowest risk rank -> lowest peak score -> earliest start time)
  qualifiedCandidates.sort((a, b) => {
    if (a.windowLevelRank !== b.windowLevelRank) {
      return a.windowLevelRank - b.windowLevelRank;
    }
    if (a.peakScore !== b.peakScore) {
      return a.peakScore - b.peakScore;
    }
    return Date.parse(a.startAt) - Date.parse(b.startAt);
  });

  const windowsToReturn: LowerRiskWindow[] = [];
  const maxWindows = 2;

  for (const cand of qualifiedCandidates) {
    if (windowsToReturn.length >= maxWindows) break;

    // Ensure non-overlapping or distinct window start
    const overlaps = windowsToReturn.some((w) => {
      const wStart = Date.parse(w.startAt);
      const wEnd = Date.parse(w.endAt);
      const candStart = Date.parse(cand.startAt);
      return candStart >= wStart && candStart < wEnd;
    });

    if (overlaps) continue;

    const comps = compareEnvironmentalMetrics(
      snapshot.current,
      cand.representativePoint.conditions
    );

    const impKeys = getImprovedDriverKeys(
      currentResult,
      cand.representativePoint.result
    );

    const { explanations, relativeRiskNote } = deriveLowerRiskExplanations(
      currentResult,
      cand.representativePoint.result
    );

    windowsToReturn.push({
      startAt: cand.startAt,
      endAt: cand.endAt,
      windowLevel: cand.windowLevel,
      confidence: cand.confidence,
      includedPointCount: cand.includedPoints.length,
      representativeConditions: cand.representativePoint.conditions,
      forecastRiskPoints: cand.includedPoints,
      improvedDriverKeys: impKeys,
      comparisons: comps,
      explanations,
      isBriefPeriod: cand.includedPoints.length === 1,
      relativeRiskNote,
    });
  }

  const selected = windowsToReturn[0] || {
    startAt: qualifiedCandidates[0].startAt,
    endAt: qualifiedCandidates[0].endAt,
    windowLevel: qualifiedCandidates[0].windowLevel,
    confidence: qualifiedCandidates[0].confidence,
    includedPointCount: qualifiedCandidates[0].includedPoints.length,
    representativeConditions: qualifiedCandidates[0].representativePoint.conditions,
    forecastRiskPoints: qualifiedCandidates[0].includedPoints,
    improvedDriverKeys: getImprovedDriverKeys(currentResult, qualifiedCandidates[0].representativePoint.result),
    comparisons: compareEnvironmentalMetrics(snapshot.current, qualifiedCandidates[0].representativePoint.conditions),
    ...deriveLowerRiskExplanations(currentResult, qualifiedCandidates[0].representativePoint.result),
    isBriefPeriod: qualifiedCandidates[0].includedPoints.length === 1,
  };

  return {
    status: "found",
    startAt: selected.startAt,
    endAt: selected.endAt,
    currentLevel,
    windowLevel: selected.windowLevel,
    confidence: selected.confidence,
    includedPointCount: selected.includedPointCount,
    currentConditions: snapshot.current,
    representativeConditions: selected.representativeConditions,
    forecastRiskPoints: selected.forecastRiskPoints,
    improvedDriverKeys: selected.improvedDriverKeys,
    comparisons: selected.comparisons,
    explanations: selected.explanations,
    isBriefPeriod: selected.isBriefPeriod,
    relativeRiskNote: selected.relativeRiskNote,
    windows: windowsToReturn.length > 0 ? windowsToReturn : [selected],
  };
}

/**
 * Derives structured domain improvement explanations for lower-risk window display.
 */
export function deriveLowerRiskExplanations(
  currentResult: PersonalisedRiskResult,
  repResult: PersonalisedRiskResult
): { explanations: string[]; relativeRiskNote?: string } {
  const explanations: string[] = [];
  let relativeRiskNote: string | undefined = undefined;

  const curHeat = currentResult.domainAssessments?.find((d) => d.domain === "thermal");
  const repHeat = repResult.domainAssessments?.find((d) => d.domain === "thermal");

  const curUV = currentResult.domainAssessments?.find((d) => d.domain === "uv");
  const repUV = repResult.domainAssessments?.find((d) => d.domain === "uv");

  const repAQ = repResult.domainAssessments?.find((d) => d.domain === "particulate");

  const heatSeverityRank: Record<string, number> = { lower: 0, elevated: 1, high: 2, severe: 3 };
  const uvSeverityRank: Record<string, number> = { lower: 0, elevated: 1, high: 2, severe: 3 };

  const heatImproved =
    curHeat &&
    repHeat &&
    heatSeverityRank[repHeat.effectiveSeverity] < heatSeverityRank[curHeat.effectiveSeverity];

  const uvImproved =
    curUV &&
    repUV &&
    uvSeverityRank[repUV.effectiveSeverity] < uvSeverityRank[curUV.effectiveSeverity];

  if (heatImproved && uvImproved) {
    explanations.push("Heat and UV exposure are expected to decrease.");
  } else if (heatImproved) {
    explanations.push("Heat exposure is expected to decrease.");
  } else if (uvImproved) {
    explanations.push("UV protection needs are expected to decrease.");
  }

  if (
    repAQ &&
    (repAQ.effectiveSeverity === "high" ||
      repAQ.effectiveSeverity === "severe" ||
      repAQ.effectiveSeverity === "elevated")
  ) {
    explanations.push("Air quality may remain elevated.");
  }

  if (explanations.length === 0) {
    explanations.push("Environmental conditions are expected to improve.");
  }

  if (currentResult.level === "very-high" && repResult.level === "high") {
    relativeRiskNote = "Conditions are still expected to remain high.";
  }

  return { explanations, relativeRiskNote };
}
