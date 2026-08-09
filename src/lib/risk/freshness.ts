import type {
  TimestampFreshnessResult,
} from "./types";

/**
 * Validates whether an ISO-8601 timestamp string is valid and contains timezone offset information.
 */
export function isValidTimestamp(value: string): boolean {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  // Must contain ISO timezone indicator (Z or +HH:MM or -HH:MM offset)
  const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
  if (!hasTimezone) {
    return false;
  }

  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

/**
 * Calculates the age of a timestamp relative to an explicit reference time in minutes.
 * Returns positive number for past timestamps, negative for future timestamps, null for invalid input.
 */
export function getAgeMinutes(
  timestamp: string,
  referenceTime: string
): number | null {
  if (!isValidTimestamp(timestamp) || !isValidTimestamp(referenceTime)) {
    return null;
  }

  const tsMs = Date.parse(timestamp);
  const refMs = Date.parse(referenceTime);

  const diffMs = refMs - tsMs;
  return diffMs / (1000 * 60);
}

interface EvaluateFreshnessParams {
  timestamp: string;
  referenceTime: string;
  maximumAgeMinutes: number;
  futureToleranceMinutes: number;
}

/**
 * Evaluates the freshness status of a timestamp against an explicit reference time and freshness policy.
 * Returns structured result: "fresh" | "stale" | "future" | "invalid".
 */
export function evaluateTimestampFreshness({
  timestamp,
  referenceTime,
  maximumAgeMinutes,
  futureToleranceMinutes,
}: EvaluateFreshnessParams): TimestampFreshnessResult {
  if (maximumAgeMinutes < 0 || futureToleranceMinutes < 0) {
    return { status: "invalid", ageMinutes: null };
  }

  const age = getAgeMinutes(timestamp, referenceTime);
  if (age === null) {
    return { status: "invalid", ageMinutes: null };
  }

  // If timestamp is in the future beyond allowed tolerance (age is negative)
  if (age < -futureToleranceMinutes) {
    return { status: "future", ageMinutes: age };
  }

  // If timestamp is older than maximum age
  if (age > maximumAgeMinutes) {
    return { status: "stale", ageMinutes: age };
  }

  return { status: "fresh", ageMinutes: age };
}
