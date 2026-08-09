import type { PersonalisedRiskResult, OutlookAvailability } from "./types";
import { hasValidOutlookBlock } from "./multi-day-outlook";
import type { OutlookTimeBlock } from "./personalised-outlook";

/**
 * Resolves explicit OutlookAvailability state based on data completeness.
 */
export function resolveOutlookAvailability({
  result,
  weatherAvailable = true,
  requiredInputsAvailable = true,
  providerFailed = false,
}: {
  result?: PersonalisedRiskResult | null;
  weatherAvailable?: boolean;
  requiredInputsAvailable?: boolean;
  providerFailed?: boolean;
}): OutlookAvailability {
  if (providerFailed && !weatherAvailable) {
    return "temporarily-unavailable";
  }

  if (
    result &&
    result.level !== "unable" &&
    requiredInputsAvailable
  ) {
    return "personalised";
  }

  if (weatherAvailable) {
    return "weather-only";
  }

  return "temporarily-unavailable";
}

/**
 * Centralised predicate enforcing that Best Available markers strictly require "personalised" availability.
 */
export function canUseAsBestAvailable(
  block: OutlookTimeBlock | null | undefined
): boolean {
  return Boolean(
    block &&
    block.availability === "personalised" &&
    hasValidOutlookBlock(block)
  );
}

/**
 * Returns standardized, user-facing copy for each OutlookAvailability state.
 */
export function getAvailabilityCopy(availability: OutlookAvailability): {
  title: string;
  badgeText: string;
  supportingText: string;
} {
  switch (availability) {
    case "personalised":
      return {
        title: "Complete personalised guidance",
        badgeText: "Personalised",
        supportingText: "Complete environmental risk and activity guidance calculated.",
      };
    case "weather-only":
      return {
        title: "Weather outlook only",
        badgeText: "Weather outlook only",
        supportingText:
          "Complete personalised guidance is not available this far ahead. It may become available closer to the date.",
      };
    case "temporarily-unavailable":
      return {
        title: "Personalised outlook temporarily unavailable",
        badgeText: "Temporarily unavailable",
        supportingText:
          "Environmental data could not be refreshed. Try again in a moment.",
      };
  }
}
