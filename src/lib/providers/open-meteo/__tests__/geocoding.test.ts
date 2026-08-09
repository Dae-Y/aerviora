import { describe, it, expect, vi } from "vitest";
import {
  fetchOpenMeteoGeocoding,
  constructDisplayName,
} from "../geocoding";

describe("constructDisplayName", () => {
  it("constructs readable display name without duplicating city, admin, or country", () => {
    expect(
      constructDisplayName("Perth", "Australia", "Western Australia")
    ).toBe("Perth, Western Australia, Australia");

    expect(constructDisplayName("Dubai", "United Arab Emirates")).toBe(
      "Dubai, United Arab Emirates"
    );

    expect(
      constructDisplayName(
        "Colombo",
        "Sri Lanka",
        "Western Province"
      )
    ).toBe("Colombo, Western Province, Sri Lanka");

    expect(constructDisplayName("Perth", "Perth")).toBe("Perth");
  });
});

describe("fetchOpenMeteoGeocoding", () => {
  it("resolves valid preset prototype location with country-code filter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            name: "Perth",
            country: "Australia",
            country_code: "AU",
            admin1: "Western Australia",
            latitude: -31.95,
            longitude: 115.86,
            timezone: "Australia/Perth",
          },
        ],
      }),
    });

    const res = await fetchOpenMeteoGeocoding({
      location: "Perth",
      prototypeLocationId: "perth",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    expect(res.result?.name).toBe("Perth");
    expect(res.result?.countryCode).toBe("AU");
    expect(res.result?.displayName).toBe("Perth, Western Australia, Australia");

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("country_code")).toBe("AU");
  });

  it("handles Adjustment 6: prefers exact name before comma for query 'Perth, Australia'", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            name: "Perth County",
            country: "Canada",
            country_code: "CA",
            latitude: 43.5,
            longitude: -80.9,
          },
          {
            name: "Perth",
            country: "Australia",
            country_code: "AU",
            admin1: "Western Australia",
            latitude: -31.95,
            longitude: 115.86,
          },
        ],
      }),
    });

    const res = await fetchOpenMeteoGeocoding({
      location: "Perth, Australia",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    expect(res.result?.name).toBe("Perth");
    expect(res.result?.country).toBe("Australia");
  });

  it("returns not-found error when results array is empty or missing", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const res = await fetchOpenMeteoGeocoding({
      location: "NonExistentCityXYZ",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.ok).toBe(false);
    expect(res.errorReason).toBe("not-found");
  });

  it("handles fetch abort/timeout cleanly", async () => {
    const mockFetch = vi.fn().mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Aborted");
          this.name = "AbortError";
        }
      })()
    );

    const res = await fetchOpenMeteoGeocoding({
      location: "Perth",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.ok).toBe(false);
    expect(res.errorReason).toBe("timeout");
  });
});
