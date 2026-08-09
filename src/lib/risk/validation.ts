import type {
  CurrentEnvironmentalSample,
  ForecastEnvironmentalSample,
  EnvironmentalValidationIssue,
  EnvironmentalValidationResult,
  EnvironmentalLevel,
} from "./types";
import { isValidTimestamp } from "./freshness";

const VALID_ORDINAL_LEVELS: readonly EnvironmentalLevel[] = [
  "none",
  "low",
  "moderate",
  "high",
  "very-high",
  "unknown",
];

/**
 * Validates a current or forecast environmental sample for technical data integrity.
 *
 * NOTE: Temperature bounds (-100°C to 100°C) represent technical integrity bounds to detect
 * corrupted provider data, NOT health/safety thresholds.
 */
export function validateEnvironmentalSample(
  sample: CurrentEnvironmentalSample | ForecastEnvironmentalSample
): EnvironmentalValidationResult {
  const issues: EnvironmentalValidationIssue[] = [];

  // 1. Timestamp validation
  const isCurrent = "observedAt" in sample;
  const timestampField = isCurrent ? "observedAt" : "validAt";
  const timestampVal = isCurrent
    ? (sample as CurrentEnvironmentalSample).observedAt
    : (sample as ForecastEnvironmentalSample).validAt;

  if (!timestampVal || !isValidTimestamp(timestampVal)) {
    issues.push({
      code: "invalid-timestamp",
      field: timestampField,
      severity: "error",
      message: `Sample timestamp (${timestampField}) is missing or not a valid ISO-8601 string with timezone offset.`,
    });
  }

  // Helper for safe property access
  const sampleMap = sample as unknown as Record<string, unknown>;

  // 2. Numeric field validation helper
  const checkNumericField = (
    field: keyof (CurrentEnvironmentalSample & ForecastEnvironmentalSample),
    min: number,
    max: number
  ) => {
    const val = sampleMap[field];
    if (val === undefined) return;

    if (typeof val !== "number" || !Number.isFinite(val)) {
      issues.push({
        code: "not-finite",
        field,
        severity: "error",
        message: `Field '${field}' is not a finite number.`,
      });
      return;
    }

    if (val < min) {
      const code = val < 0 ? "negative-value" : "out-of-range";
      issues.push({
        code,
        field,
        severity: "error",
        message: `Field '${field}' value (${val}) is below valid technical minimum (${min}).`,
      });
    } else if (val > max) {
      issues.push({
        code: "out-of-range",
        field,
        severity: "error",
        message: `Field '${field}' value (${val}) exceeds valid technical maximum (${max}).`,
      });
    }
  };

  // Check numeric signals against technical validity ranges
  checkNumericField("airTemperatureC", -100, 100);
  checkNumericField("apparentTemperatureC", -100, 100);
  checkNumericField("relativeHumidityPercent", 0, 100);
  checkNumericField("windSpeedKph", 0, 1000);
  checkNumericField("uvIndex", 0, 100);
  checkNumericField("pm25UgM3", 0, 10000);
  checkNumericField("pm10UgM3", 0, 10000);
  checkNumericField("dustUgM3", 0, Infinity);

  // 3. Ordinal field validation
  const checkOrdinalField = (field: "pollenLevel" | "dustLevel") => {
    const val = sampleMap[field];
    if (val === undefined) return;

    if (
      typeof val !== "string" ||
      !VALID_ORDINAL_LEVELS.includes(val as EnvironmentalLevel)
    ) {
      issues.push({
        code: "out-of-range",
        field,
        severity: "error",
        message: `Ordinal field '${field}' has invalid level '${String(val)}'.`,
      });
    }
  };

  checkOrdinalField("pollenLevel");
  checkOrdinalField("dustLevel");

  return {
    isValid: issues.length === 0,
    issues,
  };
}
