import type { PrototypeLocationId } from "@/lib/check-options";
import type { EnvironmentalSource, EnvironmentalSnapshot } from "@/lib/risk/types";
import type {
  EnvironmentApiResponse,
  ResolvedEnvironmentLocation,
} from "@/lib/environment-api";
import { fetchOpenMeteoGeocoding } from "./geocoding";
import { fetchOpenMeteoWeather } from "./weather";
import { fetchOpenMeteoAirQuality } from "./air-quality";
import { combineCurrentSamples, combineHourlySamples } from "./normalise";
import { DEFAULT_FETCH_TIMEOUT_MS } from "./constants";

export interface GetOpenMeteoSnapshotParams {
  location: string;
  prototypeLocationId?: PrototypeLocationId;
  forceRefresh?: boolean;
  retrievedAt: string;
  latitude?: number;
  longitude?: number;
  locationSource?: "manual-search" | "device-location";
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryDelaysMs?: readonly number[];
  sleepImpl?: (ms: number) => Promise<void>;
}

export async function getOpenMeteoEnvironmentalSnapshot({
  location,
  prototypeLocationId,
  forceRefresh,
  retrievedAt,
  latitude: inputLatitude,
  longitude: inputLongitude,
  locationSource,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  retryDelaysMs,
  sleepImpl,
}: GetOpenMeteoSnapshotParams): Promise<EnvironmentApiResponse> {
  let latitude: number;
  let longitude: number;
  let resolvedLocation: ResolvedEnvironmentLocation;

  if (
    locationSource === "device-location" &&
    inputLatitude !== undefined &&
    inputLongitude !== undefined
  ) {
    latitude = inputLatitude;
    longitude = inputLongitude;

    // Optional geocoding lookup for human-readable label
    const geoResult = await fetchOpenMeteoGeocoding({
      location,
      prototypeLocationId,
      fetchImpl,
      timeoutMs,
    });

    if (geoResult.ok && geoResult.result) {
      resolvedLocation = {
        name: geoResult.result.name,
        country: geoResult.result.country,
        countryCode: geoResult.result.countryCode,
        admin1: geoResult.result.admin1,
        timezone: geoResult.result.timezone,
        displayName: geoResult.result.displayName,
      };
    } else {
      // Fallback sequence: Label failure must NOT prevent environmental data from loading
      resolvedLocation = {
        name: location.trim() || "Current location",
        country: "",
        countryCode: "",
        timezone: "auto",
        displayName: location.trim() || "Current location",
      };
    }
  } else {
    // Manual search geocoding lookup
    const geoResult = await fetchOpenMeteoGeocoding({
      location,
      prototypeLocationId,
      fetchImpl,
      timeoutMs,
    });

    if (!geoResult.ok || !geoResult.result) {
      if (geoResult.errorReason === "not-found") {
        return {
          ok: false,
          error: {
            code: "location-not-found",
            message: `We couldn’t resolve that location. Try a city name with a country, such as “Perth, Australia”.`,
            retryable: false,
          },
        };
      }
      if (geoResult.errorReason === "timeout") {
        return {
          ok: false,
          error: {
            code: "provider-timeout",
            message: "Location lookup request timed out.",
            retryable: true,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "geocoding-unavailable",
          message: "Location lookup is temporarily unavailable.",
          retryable: true,
        },
      };
    }

    latitude = geoResult.result.latitude;
    longitude = geoResult.result.longitude;
    resolvedLocation = {
      name: geoResult.result.name,
      country: geoResult.result.country,
      countryCode: geoResult.result.countryCode,
      admin1: geoResult.result.admin1,
      timezone: geoResult.result.timezone,
      displayName: geoResult.result.displayName,
    };
  }

  // Step 2: Concurrently fetch Weather and Air Quality with independent AbortControllers
  const timezone = resolvedLocation.timezone !== "auto" ? resolvedLocation.timezone : undefined;
  const [weatherSettled, airSettled] = await Promise.allSettled([
    fetchOpenMeteoWeather({ latitude, longitude, timezone, forceRefresh, fetchImpl, timeoutMs }),
    fetchOpenMeteoAirQuality({ latitude, longitude, timezone, forceRefresh, fetchImpl, timeoutMs, retryDelaysMs, sleepImpl }),
  ]);

  const weatherRes =
    weatherSettled.status === "fulfilled" ? weatherSettled.value : undefined;
  const airRes =
    airSettled.status === "fulfilled" ? airSettled.value : undefined;

  const isWeatherOk = Boolean(weatherRes?.ok);
  const isAirOk = Boolean(airRes?.ok);

  // Both environmental providers failed
  if (!isWeatherOk && !isAirOk) {
    const isTimeout =
      weatherRes?.errorReason === "timeout" ||
      airRes?.errorReason === "timeout";

    return {
      ok: false,
      error: {
        code: isTimeout ? "provider-timeout" : "environment-data-unavailable",
        message: isTimeout
          ? "The environmental data request took too long."
          : "Weather and air-quality data are temporarily unavailable.",
        retryable: true,
      },
    };
  }

  // Step 3: Populate Sources with Adjustment 10 compliance
  // Marked "available" ONLY if it contains a usable current timestamp and at least one current field
  const isWeatherCurrentAvailable =
    isWeatherOk && weatherRes?.current !== undefined;
  const isAirCurrentAvailable = isAirOk && airRes?.current !== undefined;

  const weatherSource: EnvironmentalSource = {
    kind: "weather",
    provider: "Open-Meteo Weather",
    status: isWeatherCurrentAvailable ? "available" : "error",
    observedAt: weatherRes?.current?.observedAt,
    fetchedAt: retrievedAt,
  };

  const airQualitySource: EnvironmentalSource = {
    kind: "air-quality",
    provider: "Open-Meteo Air Quality / CAMS",
    status: isAirCurrentAvailable ? "available" : "error",
    observedAt: airRes?.current?.observedAt,
    fetchedAt: retrievedAt,
  };

  // Step 4: Combine Current and Hourly Samples
  const combinedCurrent = combineCurrentSamples(
    weatherRes?.current,
    airRes?.current
  );

  const combinedHourly = combineHourlySamples(
    weatherRes?.hourly || [],
    airRes?.hourly || []
  );

  const snapshot: EnvironmentalSnapshot = {
    requestedLocation: location,
    resolvedLocation: resolvedLocation.displayName,
    current: combinedCurrent,
    hourly: combinedHourly,
    sources: [weatherSource, airQualitySource],
  };

  const forecast =
    combinedHourly.length > 0
      ? ({
          status: "available" as const,
          timezone: resolvedLocation.timezone,
          points: combinedHourly,
          horizonHours: combinedHourly.length,
        })
      : ({
          status: "unavailable" as const,
          reason: "insufficient-hourly-data" as const,
        });

  return {
    ok: true,
    requestedLocation: location,
    resolvedLocation,
    snapshot,
    forecast,
    retrievedAt,
  };
}
