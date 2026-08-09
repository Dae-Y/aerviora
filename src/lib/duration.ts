export const DURATION_PRESETS_MINUTES = [15, 30, 45, 60] as const;

export type DurationPresetMinutes = (typeof DURATION_PRESETS_MINUTES)[number];

export type DurationMinutes = number;

export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 480;
export const DURATION_STEPPER_INCREMENT = 5;

/**
 * Returns true if the duration in minutes matches one of the standard quick presets (15, 30, 45, 60).
 */
export function isDurationPreset(
  minutes: number
): minutes is DurationPresetMinutes {
  return (DURATION_PRESETS_MINUTES as readonly number[]).includes(minutes);
}

/**
 * Returns true if the duration in minutes is a valid integer between 5 and 480 inclusive.
 */
export function isValidDurationMinutes(minutes: number): boolean {
  return (
    typeof minutes === "number" &&
    Number.isFinite(minutes) &&
    Number.isInteger(minutes) &&
    minutes >= MIN_DURATION_MINUTES &&
    minutes <= MAX_DURATION_MINUTES
  );
}

/**
 * Validates a raw input string for custom duration entry.
 * Rejects empty strings, non-digits, decimals, negative values, and out-of-range numbers.
 */
export function validateCustomDurationString(draft: string): {
  isValid: boolean;
  value: number | null;
  errorMessage: string | null;
} {
  const trimmed = draft.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      value: null,
      errorMessage: "Enter a duration.",
    };
  }

  // Strictly require decimal digits only (rejects 1e2, -5, 5.5, etc.)
  if (!/^\d+$/.test(trimmed)) {
    return {
      isValid: false,
      value: null,
      errorMessage: "Use a whole number of minutes.",
    };
  }

  const num = Number(trimmed);
  if (!Number.isInteger(num)) {
    return {
      isValid: false,
      value: null,
      errorMessage: "Use a whole number of minutes.",
    };
  }

  if (num < MIN_DURATION_MINUTES || num > MAX_DURATION_MINUTES) {
    return {
      isValid: false,
      value: null,
      errorMessage: `Choose between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`,
    };
  }

  return {
    isValid: true,
    value: num,
    errorMessage: null,
  };
}

/**
 * Formats a duration in minutes into a compact string (e.g. 5m, 15m, 1h, 1h 30m, 8h).
 * Requires a valid duration between 5 and 480 minutes. Throws RangeError if invalid.
 */
export function formatDurationCompact(minutes: number): string {
  if (!isValidDurationMinutes(minutes)) {
    throw new RangeError(
      `Invalid duration: must be a whole number between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`
    );
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (remainingMins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMins}m`;
}

/**
 * Formats a duration in minutes into an accessible full string (e.g. 15 minutes, 1 hour, 1 hour 30 minutes).
 * Requires a valid duration between 1 and 480 minutes. Throws RangeError if invalid.
 */
export function formatDurationAccessible(minutes: number): string {
  if (
    typeof minutes !== "number" ||
    !Number.isFinite(minutes) ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > MAX_DURATION_MINUTES
  ) {
    throw new RangeError(
      `Invalid duration: must be a whole number between 1 and ${MAX_DURATION_MINUTES} minutes.`
    );
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  const hourStr = hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "";
  const minStr =
    remainingMins > 0
      ? `${remainingMins} ${remainingMins === 1 ? "minute" : "minutes"}`
      : "";

  if (hourStr && minStr) {
    return `${hourStr} ${minStr}`;
  }

  return hourStr || minStr;
}
