import { constructDisplayName } from "@/lib/providers/open-meteo/geocoding";

export interface ResolvedLocationDetails {
  name?: string;
  country?: string;
  countryCode?: string;
  admin1?: string;
  displayName?: string;
}

/**
 * Derives a privacy-conscious user-facing display label for a location check.
 * Fallback sequence:
 * 1. Existing reverse-geocoding result / displayName, if available
 * 2. Nearest resolved locality or city
 * 3. "Current location"
 */
export function formatLocationLabel(
  details?: ResolvedLocationDetails | null,
  fallbackLabel: string = "Current location"
): string {
  if (!details) return fallbackLabel;

  if (details.displayName && details.displayName.trim().length > 0) {
    return details.displayName.trim();
  }

  if (details.name && details.country) {
    return constructDisplayName(details.name, details.country, details.admin1);
  }

  if (details.name) {
    return details.name.trim();
  }

  return fallbackLabel;
}
