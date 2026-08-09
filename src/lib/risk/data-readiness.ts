import type { OutdoorCheckInput } from "@/lib/check-options";
import type {
  EnvironmentalSnapshot,
  EnvironmentalSignalKey,
  EnvironmentalSourceKind,
  DataFreshnessPolicy,
  DataReadinessIssueCode,
  DataReadinessIssue,
  DataReadinessResult,
  OutdoorCheckInputV2,
} from "./types";
import {
  CORE_SIGNALS,
  SIGNAL_SOURCE_KINDS,
  PROTOTYPE_DATA_FRESHNESS_POLICY,
} from "./types";
import { getRelevantSignals } from "./signals";
import { validateEnvironmentalSample } from "./validation";
import { evaluateTimestampFreshness } from "./freshness";

export interface AssessDataReadinessParams {
  snapshot: EnvironmentalSnapshot;
  input: OutdoorCheckInput | OutdoorCheckInputV2;
  referenceTime: string;
  policy?: DataFreshnessPolicy;
}

/**
 * Assesses whether an environmental snapshot contains adequate, valid, and fresh data
 * to technically evaluate the user's outdoor check.
 *
 * READINESS SEMANTICS:
 * - "insufficient": Missing current sample, invalid/future/stale timestamp, or zero usable core signals.
 * - "partial": Some core signals usable or baseline core usable, but contextual signals or sources are missing/stale.
 * - "ready": All relevant signals valid, available, and fresh.
 *
 * CRITICAL SAFETY NOTE:
 * Status "ready" means ONLY technically ready for a later deterministic evaluation.
 * It NEVER means environmentally or medically safe.
 */
export function assessDataReadiness({
  snapshot,
  input,
  referenceTime,
  policy = PROTOTYPE_DATA_FRESHNESS_POLICY,
}: AssessDataReadinessParams): DataReadinessResult {
  const relevantSignals = getRelevantSignals(input);
  const availableSignals: EnvironmentalSignalKey[] = [];
  const missingSignals: EnvironmentalSignalKey[] = [];
  const invalidSignals: EnvironmentalSignalKey[] = [];
  const staleSources: EnvironmentalSourceKind[] = [];
  const issues: DataReadinessIssue[] = [];

  // 1. Check for current sample existence
  if (!snapshot.current) {
    issues.push({
      code: "missing-current-sample",
      message: "No current environmental sample is available in the snapshot.",
    });
    return {
      status: "insufficient",
      relevantSignals,
      availableSignals: [],
      missingSignals: relevantSignals,
      invalidSignals: [],
      staleSources: [],
      issues,
    };
  }

  // 2. Check current timestamp freshness
  const sample = snapshot.current;
  const freshness = evaluateTimestampFreshness({
    timestamp: sample.observedAt,
    referenceTime,
    maximumAgeMinutes: policy.maximumCurrentAgeMinutes,
    futureToleranceMinutes: policy.futureToleranceMinutes,
  });

  if (freshness.status === "invalid") {
    issues.push({
      code: "invalid-current-timestamp",
      message: "Current sample timestamp is invalid or missing timezone offset.",
    });
    return {
      status: "insufficient",
      relevantSignals,
      availableSignals: [],
      missingSignals: relevantSignals,
      invalidSignals: [],
      staleSources: [],
      issues,
    };
  }

  if (freshness.status === "future") {
    issues.push({
      code: "future-current-timestamp",
      message: "Current sample timestamp is substantially in the future beyond tolerance.",
    });
    return {
      status: "insufficient",
      relevantSignals,
      availableSignals: [],
      missingSignals: relevantSignals,
      invalidSignals: [],
      staleSources: [],
      issues,
    };
  }

  if (freshness.status === "stale") {
    issues.push({
      code: "stale-current-timestamp",
      message: `Current sample is stale (age: ${Math.round(freshness.ageMinutes ?? 0)} mins, max allowed: ${policy.maximumCurrentAgeMinutes} mins).`,
    });
  }

  // 3. Validate sample fields
  const validation = validateEnvironmentalSample(sample);
  const invalidFieldsSet = new Set<string>(
    validation.issues.map((iss) => iss.field)
  );

  // 4. Categorize relevant signals (available, missing, or invalid)
  for (const signal of relevantSignals) {
    const val = sample[signal];
    if (val === undefined) {
      missingSignals.push(signal);
      const isCore = CORE_SIGNALS.includes(signal);
      issues.push({
        code: isCore ? "missing-core-signal" : "missing-contextual-signal",
        signal,
        message: `Relevant signal '${signal}' is missing from current sample.`,
      });
    } else if (invalidFieldsSet.has(signal)) {
      invalidSignals.push(signal);
      const isCore = CORE_SIGNALS.includes(signal);
      issues.push({
        code: isCore ? "invalid-core-signal" : "invalid-contextual-signal",
        signal,
        message: `Relevant signal '${signal}' failed technical validity checks.`,
      });
    } else {
      availableSignals.push(signal);
    }
  }

  // 5. Evaluate sources supplying relevant signals (OR-semantics: at least one allowed source must be available and fresh)
  for (const signal of relevantSignals) {
    const allowedKinds = SIGNAL_SOURCE_KINDS[signal] || [];
    if (allowedKinds.length === 0) continue;

    const matchingSources = snapshot.sources.filter((s) =>
      allowedKinds.includes(s.kind)
    );

    if (matchingSources.length === 0) {
      issues.push({
        code: "unavailable-source",
        sourceKind: allowedKinds[0],
        signal,
        message: `No source category in [${allowedKinds.join(", ")}] is available in snapshot for signal '${signal}'.`,
      });
      continue;
    }

    let hasSupportedSource = false;
    let hasErrorSource = false;
    let hasStaleSource = false;

    for (const source of matchingSources) {
      if (source.status === "error") {
        hasErrorSource = true;
        continue;
      }
      if (source.status === "unavailable") {
        continue;
      }

      const sourceTs = source.observedAt || source.fetchedAt;
      if (sourceTs) {
        const srcFreshness = evaluateTimestampFreshness({
          timestamp: sourceTs,
          referenceTime,
          maximumAgeMinutes: policy.maximumCurrentAgeMinutes,
          futureToleranceMinutes: policy.futureToleranceMinutes,
        });

        if (srcFreshness.status === "stale") {
          hasStaleSource = true;
          if (!staleSources.includes(source.kind)) {
            staleSources.push(source.kind);
          }
          continue;
        }
      }

      hasSupportedSource = true;
      break;
    }

    if (!hasSupportedSource) {
      if (hasStaleSource) {
        issues.push({
          code: "stale-source",
          sourceKind: allowedKinds[0],
          signal,
          message: `All sources for signal '${signal}' are stale.`,
        });
      } else if (hasErrorSource) {
        issues.push({
          code: "error-source",
          sourceKind: allowedKinds[0],
          signal,
          message: `Sources for signal '${signal}' reported an error status.`,
        });
      } else {
        issues.push({
          code: "unavailable-source",
          sourceKind: allowedKinds[0],
          signal,
          message: `Sources for signal '${signal}' are marked unavailable.`,
        });
      }
    }
  }

  // Check PM AQI readiness (at least one valid PM AQI required)
  const isPm25AqiValid =
    sample.pm25UsAqi !== undefined && Number.isFinite(sample.pm25UsAqi);
  const isPm10AqiValid =
    sample.pm10UsAqi !== undefined && Number.isFinite(sample.pm10UsAqi);

  if (!isPm25AqiValid && !isPm10AqiValid) {
    issues.push({
      code: "missing-core-signal",
      signal: "pm25UsAqi",
      message: "No valid PM-specific U.S. AQI (PM2.5 or PM10) is available in current sample.",
    });
  } else if (!isPm25AqiValid || !isPm10AqiValid) {
    const missingSignal = !isPm25AqiValid ? "pm25UsAqi" : "pm10UsAqi";
    missingSignals.push(missingSignal as EnvironmentalSignalKey);
    issues.push({
      code: "missing-contextual-signal",
      signal: missingSignal as EnvironmentalSignalKey,
      message: `PM-specific AQI '${missingSignal}' is missing, but another valid PM AQI is available.`,
    });
  }

  // 6. Determine final readiness status
  const usableCoreCount = CORE_SIGNALS.filter((s) =>
    availableSignals.includes(s)
  ).length;

  const hasAqiAvailable = isPm25AqiValid || isPm10AqiValid;

  if (freshness.status === "stale" || usableCoreCount === 0 || !hasAqiAvailable) {
    return {
      status: "insufficient",
      relevantSignals,
      availableSignals,
      missingSignals,
      invalidSignals,
      staleSources,
      issues,
    };
  }

  if (
    usableCoreCount < CORE_SIGNALS.length ||
    (!isPm25AqiValid || !isPm10AqiValid) ||
    missingSignals.length > 0 ||
    invalidSignals.length > 0 ||
    staleSources.length > 0 ||
    issues.some(
      (iss) =>
        iss.code === "unavailable-source" ||
        iss.code === "error-source" ||
        iss.code === "stale-source"
    )
  ) {
    return {
      status: "partial",
      relevantSignals,
      availableSignals,
      missingSignals,
      invalidSignals,
      staleSources,
      issues,
    };
  }

  return {
    status: "ready",
    relevantSignals,
    availableSignals,
    missingSignals,
    invalidSignals,
    staleSources,
    issues,
  };
}

/**
 * Returns true iff a readiness failure is strictly caused by stale data,
 * with all required structural inputs present and valid.
 */
export function isStaleOnlyReadinessFailure(
  readiness: DataReadinessResult
): boolean {
  if (readiness.issues.length === 0) return false;

  const STALE_ISSUE_CODES: DataReadinessIssueCode[] = [
    "stale-current-timestamp",
    "stale-source",
  ];

  const hasStaleIssue = readiness.issues.some((iss) =>
    STALE_ISSUE_CODES.includes(iss.code)
  );
  if (!hasStaleIssue) return false;

  const hasBlockingNonStaleIssue = readiness.issues.some(
    (iss) => !STALE_ISSUE_CODES.includes(iss.code)
  );

  return !hasBlockingNonStaleIssue;
}

/**
 * Returns true iff readiness contains a future-current-timestamp failure issue.
 */
export function isFutureCurrentTimestampFailure(
  readiness: DataReadinessResult
): boolean {
  return readiness.issues.some(
    (iss) => iss.code === "future-current-timestamp"
  );
}

export interface IsRetriableAirQualityOnlyFailureParams {
  snapshot: EnvironmentalSnapshot;
  readiness: DataReadinessResult;
  referenceTime: string;
  policy?: DataFreshnessPolicy;
}

/**
 * Pure structured classifier that returns true iff:
 * 1. Current weather source is available, all required weather metrics are finite numbers, and weather sample is fresh (not stale/future/invalid).
 * 2. The air-quality source is in error/unavailable status OR all air-and-exposure fields are missing from current sample.
 * 3. The failure is NOT a stale-only readiness failure.
 * 4. No unrelated blocking structural errors are present.
 */
export function isRetriableAirQualityOnlyFailure({
  snapshot,
  readiness,
  referenceTime,
  policy = PROTOTYPE_DATA_FRESHNESS_POLICY,
}: IsRetriableAirQualityOnlyFailureParams): boolean {
  if (!snapshot.current) return false;
  const sample = snapshot.current;

  // 1. Weather source must be available
  const weatherSource = snapshot.sources.find((s) => s.kind === "weather");
  if (!weatherSource || weatherSource.status !== "available") return false;

  // 2. All required current weather values must be finite numbers
  if (
    sample.airTemperatureC === undefined ||
    !Number.isFinite(sample.airTemperatureC) ||
    sample.apparentTemperatureC === undefined ||
    !Number.isFinite(sample.apparentTemperatureC) ||
    sample.relativeHumidityPercent === undefined ||
    !Number.isFinite(sample.relativeHumidityPercent) ||
    sample.windSpeedKph === undefined ||
    !Number.isFinite(sample.windSpeedKph)
  ) {
    return false;
  }

  // 3. Weather timestamp must be valid, fresh (not stale), and not future-dated
  const weatherTs = weatherSource.observedAt || sample.observedAt;
  const weatherFreshness = evaluateTimestampFreshness({
    timestamp: weatherTs,
    referenceTime,
    maximumAgeMinutes: policy.maximumCurrentAgeMinutes,
    futureToleranceMinutes: policy.futureToleranceMinutes,
  });

  if (weatherFreshness.status !== "fresh") {
    return false;
  }

  // 4. Must NOT be a stale-only readiness failure
  if (isStaleOnlyReadinessFailure(readiness)) {
    return false;
  }

  // 5. Check air-quality group availability
  const airSource = snapshot.sources.find((s) => s.kind === "air-quality");
  const isAirSourceFailed =
    !airSource ||
    airSource.status === "error" ||
    airSource.status === "unavailable";

  const isAllAirMetricsMissing =
    sample.pm25UgM3 === undefined &&
    sample.pm10UgM3 === undefined &&
    sample.dustUgM3 === undefined &&
    sample.uvIndex === undefined &&
    sample.pm25UsAqi === undefined &&
    sample.pm10UsAqi === undefined;

  if (!isAirSourceFailed && !isAllAirMetricsMissing) {
    return false;
  }

  // Check if at least one air metric is defined (numeric zero is valid)
  const hasAnyAirMetric =
    sample.pm25UgM3 !== undefined ||
    sample.pm10UgM3 !== undefined ||
    sample.dustUgM3 !== undefined ||
    sample.uvIndex !== undefined ||
    sample.pm25UsAqi !== undefined ||
    sample.pm10UsAqi !== undefined;

  if (hasAnyAirMetric && !isAirSourceFailed) {
    return false;
  }
  return true;
}
