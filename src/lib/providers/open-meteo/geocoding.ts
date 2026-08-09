import {
  OPEN_METEO_GEOCODING_BASE,
  GEOCODING_REVALIDATE_SECONDS,
  DEFAULT_FETCH_TIMEOUT_MS,
} from "./constants";
import { isRecord, readString, readFiniteNumber } from "./runtime";
import type { PrototypeLocationId } from "@/lib/check-options";
import { PROTOTYPE_LOCATIONS } from "@/lib/check-options";

export interface OpenMeteoResolvedCoordinates {
  name: string;
  country: string;
  countryCode: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  displayName: string;
}

export function constructDisplayName(
  city: string,
  country: string,
  admin1?: string
): string {
  const segments: string[] = [];
  const trimmedCity = city.trim();
  const trimmedCountry = country.trim();
  const trimmedAdmin = admin1?.trim();

  if (trimmedCity) {
    segments.push(trimmedCity);
  }

  if (
    trimmedAdmin &&
    trimmedAdmin.toLowerCase() !== trimmedCity.toLowerCase() &&
    trimmedAdmin.toLowerCase() !== trimmedCountry.toLowerCase()
  ) {
    segments.push(trimmedAdmin);
  }

  if (
    trimmedCountry &&
    trimmedCountry.toLowerCase() !== trimmedCity.toLowerCase()
  ) {
    segments.push(trimmedCountry);
  }

  return segments.join(", ");
}

export interface FetchGeocodingParams {
  location: string;
  prototypeLocationId?: PrototypeLocationId;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function fetchOpenMeteoGeocoding({
  location,
  prototypeLocationId,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
}: FetchGeocodingParams): Promise<{
  ok: boolean;
  result?: OpenMeteoResolvedCoordinates;
  errorReason?: "not-found" | "unavailable" | "timeout";
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(OPEN_METEO_GEOCODING_BASE);
    url.searchParams.set("name", location.trim());
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    let expectedCountryCode: string | undefined = undefined;
    if (prototypeLocationId) {
      const protoLoc = PROTOTYPE_LOCATIONS.find(
        (p) => p.id === prototypeLocationId
      );
      if (protoLoc) {
        expectedCountryCode = protoLoc.countryCode;
        url.searchParams.set("country_code", protoLoc.countryCode);
      }
    }

    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      next: { revalidate: GEOCODING_REVALIDATE_SECONDS },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, errorReason: "unavailable" };
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.results)) {
      return { ok: false, errorReason: "not-found" };
    }

    const rawResults = data.results;
    const validCandidates: OpenMeteoResolvedCoordinates[] = [];

    for (const item of rawResults) {
      if (!isRecord(item)) continue;

      const name = readString(item.name);
      const country = readString(item.country);
      const countryCode = readString(item.country_code);
      const latitude = readFiniteNumber(item.latitude);
      const longitude = readFiniteNumber(item.longitude);
      const timezone = readString(item.timezone) || "UTC";
      const admin1 = readString(item.admin1);

      if (
        name &&
        country &&
        countryCode &&
        latitude !== undefined &&
        longitude !== undefined
      ) {
        validCandidates.push({
          name,
          country,
          countryCode: countryCode.toUpperCase(),
          admin1,
          latitude,
          longitude,
          timezone,
          displayName: constructDisplayName(name, country, admin1),
        });
      }
    }

    if (validCandidates.length === 0) {
      return { ok: false, errorReason: "not-found" };
    }

    // Adjustment 6: extract city target before first comma
    const preferredTargetCity = location.split(",")[0].trim().toLowerCase();

    // Find best candidate
    let selected: OpenMeteoResolvedCoordinates | undefined = undefined;

    // 1. Check exact name match
    selected = validCandidates.find(
      (c) => c.name.trim().toLowerCase() === preferredTargetCity
    );

    // 2. If prototype location ID specified, ensure country matches if candidate found
    if (expectedCountryCode && selected) {
      if (selected.countryCode !== expectedCountryCode) {
        selected = validCandidates.find(
          (c) => c.countryCode === expectedCountryCode
        );
      }
    }

    // 3. Fall back to first candidate
    if (!selected) {
      selected = validCandidates[0];
    }

    return { ok: true, result: selected };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, errorReason: "timeout" };
    }
    return { ok: false, errorReason: "unavailable" };
  }
}
