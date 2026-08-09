import type { PrototypeLocationId } from "./check-options";
import type { EnvironmentalSnapshot, ForecastEnvironmentalSample } from "./risk/types";
import type { DemoScenarioId } from "./demo/environmental-scenarios";

export type { DemoScenarioId };
export type LocationSource = "manual-search" | "device-location";

export interface EnvironmentRequest {
  location: string;
  prototypeLocationId?: PrototypeLocationId;
  forceRefresh?: boolean;
  latitude?: number;
  longitude?: number;
  locationSource?: LocationSource;
  demoScenarioId?: DemoScenarioId;
}

export interface ResolvedEnvironmentLocation {
  name: string;
  country: string;
  countryCode: string;
  admin1?: string;
  timezone: string;
  displayName: string;
}

export type EnvironmentalForecastUnavailableReason =
  | "upstream-unavailable"
  | "invalid-response"
  | "timestamp-alignment-failed"
  | "insufficient-hourly-data";

export type EnvironmentalForecastAvailability =
  | {
      status: "available";
      timezone: string;
      points: ForecastEnvironmentalSample[];
      horizonHours: number;
    }
  | {
      status: "unavailable";
      reason: EnvironmentalForecastUnavailableReason;
    };

export interface EnvironmentApiSuccess {
  ok: true;
  requestedLocation: string;
  resolvedLocation: ResolvedEnvironmentLocation;
  snapshot: EnvironmentalSnapshot;
  forecast: EnvironmentalForecastAvailability;
  retrievedAt: string;
  sourceMode?: "live" | "demo";
  demoScenarioId?: DemoScenarioId;
}

export type EnvironmentApiErrorCode =
  | "invalid-request"
  | "location-not-found"
  | "geocoding-unavailable"
  | "environment-data-unavailable"
  | "provider-timeout"
  | "unexpected-error";

export interface EnvironmentApiFailure {
  ok: false;
  error: {
    code: EnvironmentApiErrorCode;
    message: string;
    retryable: boolean;
  };
}

export type EnvironmentApiResponse =
  | EnvironmentApiSuccess
  | EnvironmentApiFailure;

const KNOWN_PROTOTYPE_IDS: readonly PrototypeLocationId[] = [
  "perth",
  "miri",
  "colombo",
  "dubai",
];

/**
 * Validates incoming environment API request against a strict allowlist.
 * Allowed top-level fields ONLY: `location`, `prototypeLocationId`, `forceRefresh`, `latitude`, `longitude`, `locationSource`.
 * Any extra properties or malformed coordinates will cause validation failure.
 */
export function validateEnvironmentRequest(data: unknown): {
  isValid: boolean;
  request?: EnvironmentRequest;
  errorReason?: string;
} {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { isValid: false, errorReason: "Request body must be a JSON object" };
  }

  const keys = Object.keys(data);
  const ALLOWED_KEYS = new Set([
    "location",
    "prototypeLocationId",
    "forceRefresh",
    "latitude",
    "longitude",
    "locationSource",
    "demoScenarioId",
  ]);
  for (const k of keys) {
    if (!ALLOWED_KEYS.has(k)) {
      return {
        isValid: false,
        errorReason: `Prohibited top-level property '${k}' in request body`,
      };
    }
  }

  const record = data as Record<string, unknown>;

  if (typeof record.location !== "string") {
    return { isValid: false, errorReason: "Field 'location' must be a string" };
  }

  const trimmedLocation = record.location.trim();
  if (trimmedLocation.length < 2 || trimmedLocation.length > 80) {
    return {
      isValid: false,
      errorReason: "Trimmed location length must be between 2 and 80 characters",
    };
  }

  let demoScenarioId: DemoScenarioId | undefined = undefined;
  if (record.demoScenarioId !== undefined) {
    const VALID_SCENARIOS = new Set<string>([
      "improving-day",
      "dust-spike",
      "persistent-heat",
    ]);
    if (
      typeof record.demoScenarioId !== "string" ||
      !VALID_SCENARIOS.has(record.demoScenarioId)
    ) {
      return {
        isValid: false,
        errorReason: "Invalid 'demoScenarioId' supplied",
      };
    }
    demoScenarioId = record.demoScenarioId as DemoScenarioId;
  }

  let prototypeLocationId: PrototypeLocationId | undefined = undefined;
  if (record.prototypeLocationId !== undefined) {
    if (
      typeof record.prototypeLocationId !== "string" ||
      !KNOWN_PROTOTYPE_IDS.includes(
        record.prototypeLocationId as PrototypeLocationId
      )
    ) {
      return {
        isValid: false,
        errorReason: "Invalid 'prototypeLocationId' supplied",
      };
    }
    prototypeLocationId = record.prototypeLocationId as PrototypeLocationId;
  }

  let forceRefresh: boolean | undefined = undefined;
  if (record.forceRefresh !== undefined) {
    if (typeof record.forceRefresh !== "boolean") {
      return {
        isValid: false,
        errorReason: "Field 'forceRefresh' must be a boolean",
      };
    }
    forceRefresh = record.forceRefresh;
  }

  let locationSource: LocationSource | undefined = undefined;
  if (record.locationSource !== undefined) {
    if (
      record.locationSource !== "manual-search" &&
      record.locationSource !== "device-location"
    ) {
      return {
        isValid: false,
        errorReason: "Field 'locationSource' must be 'manual-search' or 'device-location'",
      };
    }
    locationSource = record.locationSource;
  }

  let latitude: number | undefined = undefined;
  let longitude: number | undefined = undefined;

  const hasLat = record.latitude !== undefined;
  const hasLng = record.longitude !== undefined;

  if (hasLat || hasLng) {
    if (!hasLat || !hasLng) {
      return {
        isValid: false,
        errorReason: "Both 'latitude' and 'longitude' must be provided together",
      };
    }

    if (
      typeof record.latitude !== "number" ||
      !Number.isFinite(record.latitude) ||
      record.latitude < -90 ||
      record.latitude > 90
    ) {
      return {
        isValid: false,
        errorReason: "Field 'latitude' must be a finite number between -90 and 90",
      };
    }

    if (
      typeof record.longitude !== "number" ||
      !Number.isFinite(record.longitude) ||
      record.longitude < -180 ||
      record.longitude > 180
    ) {
      return {
        isValid: false,
        errorReason: "Field 'longitude' must be a finite number between -180 and 180",
      };
    }

    latitude = record.latitude;
    longitude = record.longitude;
  }

  if (locationSource === "device-location" && (latitude === undefined || longitude === undefined)) {
    return {
      isValid: false,
      errorReason: "Device-location requests require valid 'latitude' and 'longitude'",
    };
  }

  return {
    isValid: true,
    request: {
      location: trimmedLocation,
      prototypeLocationId,
      forceRefresh,
      latitude,
      longitude,
      locationSource,
      demoScenarioId,
    },
  };
}

/**
 * Safe runtime check for client-side API response objects.
 */
export function isEnvironmentApiResponse(
  data: unknown
): data is EnvironmentApiResponse {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;

  if (record.ok === true) {
    const isBaseValid =
      typeof record.requestedLocation === "string" &&
      typeof record.retrievedAt === "string" &&
      typeof record.resolvedLocation === "object" &&
      record.resolvedLocation !== null &&
      typeof (record.resolvedLocation as Record<string, unknown>).timezone === "string" &&
      typeof record.snapshot === "object" &&
      record.snapshot !== null;

    if (!isBaseValid) return false;

    if (typeof record.forecast !== "object" || record.forecast === null) {
      return false;
    }

    const forecast = record.forecast as Record<string, unknown>;
    if (forecast.status === "available") {
      if (
        typeof forecast.timezone !== "string" ||
        typeof forecast.horizonHours !== "number" ||
        !Array.isArray(forecast.points)
      ) {
        return false;
      }

      const ISO_TZ_REGEX = /(Z|[+-]\d{2}:?\d{2})$/i;
      let prevMs = -1;
      for (const p of forecast.points) {
        if (typeof p !== "object" || p === null) return false;
        const validAt = (p as Record<string, unknown>).validAt;
        if (typeof validAt !== "string" || !ISO_TZ_REGEX.test(validAt.trim())) {
          return false;
        }
        const ms = Date.parse(validAt);
        if (Number.isNaN(ms) || ms < prevMs) return false;
        prevMs = ms;
      }
      return true;
    } else if (forecast.status === "unavailable") {
      const allowedReasons = new Set<string>([
        "upstream-unavailable",
        "invalid-response",
        "timestamp-alignment-failed",
        "insufficient-hourly-data",
      ]);
      return (
        typeof forecast.reason === "string" && allowedReasons.has(forecast.reason)
      );
    }

    return false;
  }

  if (record.ok === false) {
    return (
      typeof record.error === "object" &&
      record.error !== null &&
      typeof (record.error as Record<string, unknown>).code === "string" &&
      typeof (record.error as Record<string, unknown>).message === "string" &&
      typeof (record.error as Record<string, unknown>).retryable === "boolean"
    );
  }

  return false;
}
