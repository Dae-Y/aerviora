import { describe, it, expect } from "vitest";
import {
  validateEnvironmentRequest,
  isEnvironmentApiResponse,
  EnvironmentApiSuccess,
  EnvironmentApiFailure,
} from "../environment-api";

describe("validateEnvironmentRequest", () => {
  it("accepts a valid manual location request", () => {
    const res = validateEnvironmentRequest({ location: "Perth" });
    expect(res.isValid).toBe(true);
    expect(res.request?.location).toBe("Perth");
    expect(res.request?.prototypeLocationId).toBeUndefined();
  });

  it("accepts a valid prototype location request", () => {
    const res = validateEnvironmentRequest({
      location: "Miri",
      prototypeLocationId: "miri",
    });
    expect(res.isValid).toBe(true);
    expect(res.request?.prototypeLocationId).toBe("miri");
  });

  it("trims location whitespace", () => {
    const res = validateEnvironmentRequest({ location: "  Dubai  " });
    expect(res.isValid).toBe(true);
    expect(res.request?.location).toBe("Dubai");
  });

  it("rejects locations shorter than 2 characters", () => {
    const res = validateEnvironmentRequest({ location: "A" });
    expect(res.isValid).toBe(false);
    expect(res.errorReason).toContain("2 and 80 characters");
  });

  it("rejects locations longer than 80 characters", () => {
    const res = validateEnvironmentRequest({ location: "A".repeat(81) });
    expect(res.isValid).toBe(false);
    expect(res.errorReason).toContain("2 and 80 characters");
  });

  it("rejects unknown prototypeLocationId", () => {
    const res = validateEnvironmentRequest({
      location: "Perth",
      prototypeLocationId: "invalid-id",
    });
    expect(res.isValid).toBe(false);
    expect(res.errorReason).toContain("Invalid 'prototypeLocationId'");
  });

  it("accepts valid device location coordinates", () => {
    const resWithCoords = validateEnvironmentRequest({
      location: "Perth",
      latitude: -31.95,
      longitude: 115.86,
      locationSource: "device-location",
    });
    expect(resWithCoords.isValid).toBe(true);
    expect(resWithCoords.request?.latitude).toBe(-31.95);
    expect(resWithCoords.request?.longitude).toBe(115.86);
  });

  it("enforces strict allowlist and rejects extra top-level fields (sensitivities, extraField, etc.)", () => {
    const resWithSensitivities = validateEnvironmentRequest({
      location: "Perth",
      sensitivities: ["respiratory"],
    });
    expect(resWithSensitivities.isValid).toBe(false);
    expect(resWithSensitivities.errorReason).toContain("Prohibited top-level property 'sensitivities'");
  });
});

describe("isEnvironmentApiResponse", () => {
  it("recognises a valid success response", () => {
    const successObj: EnvironmentApiSuccess = {
      ok: true,
      requestedLocation: "Perth",
      retrievedAt: "2026-08-01T12:00:00Z",
      resolvedLocation: {
        name: "Perth",
        country: "Australia",
        countryCode: "AU",
        timezone: "Australia/Perth",
        displayName: "Perth, Western Australia, Australia",
      },
      snapshot: {
        requestedLocation: "Perth",
        resolvedLocation: "Perth, Western Australia, Australia",
        current: { observedAt: "2026-08-01T11:45:00Z" },
        hourly: [],
        sources: [],
      },
      forecast: {
        status: "unavailable",
        reason: "insufficient-hourly-data",
      },
    };
    expect(isEnvironmentApiResponse(successObj)).toBe(true);
  });

  it("recognises a valid failure response", () => {
    const failObj: EnvironmentApiFailure = {
      ok: false,
      error: {
        code: "location-not-found",
        message: "We couldn’t resolve that location.",
        retryable: false,
      },
    };
    expect(isEnvironmentApiResponse(failObj)).toBe(true);
  });

  it("returns false for arbitrary objects", () => {
    expect(isEnvironmentApiResponse(null)).toBe(false);
    expect(isEnvironmentApiResponse({})).toBe(false);
    expect(isEnvironmentApiResponse({ ok: "true" })).toBe(false);
  });
});
