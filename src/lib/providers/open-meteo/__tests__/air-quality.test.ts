import { describe, it, expect, vi } from "vitest";
import { fetchOpenMeteoAirQuality, isTransientAirQualityError } from "../air-quality";

describe("fetchOpenMeteoAirQuality Retry Policy & Normalisation", () => {
  const noopSleep = async () => {};

  it("normalises PM2.5, PM10, dust concentration, and UV index correctly without auto-deriving dustLevel", async () => {
    const unixTime = 1754049600;
    const expectedIso = new Date(unixTime * 1000).toISOString();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          time: unixTime,
          pm2_5: 8.5,
          pm10: 16.0,
          dust: 4.2,
          uv_index: 5.5,
        },
        hourly: {
          time: [unixTime],
          pm2_5: [8.5],
          pm10: [16.0],
          dust: [null],
          uv_index: [5.5],
        },
      }),
    });

    const res = await fetchOpenMeteoAirQuality({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: noopSleep,
    });

    expect(res.ok).toBe(true);
    expect(res.current?.observedAt).toBe(expectedIso);
    expect(res.current?.pm25UgM3).toBe(8.5);
    expect(res.current?.pm10UgM3).toBe(16.0);
    expect(res.current?.dustUgM3).toBe(4.2);
    expect(res.current?.uvIndex).toBe(5.5);
    expect(res.current).not.toHaveProperty("dustLevel");
    expect(res.hourly?.[0].dustUgM3).toBeUndefined();
    expect(res.attemptsMade).toBe(1);
  });

  it("preserves negative values for technical domain validation without clamping", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          time: 1754049600,
          pm2_5: -3.0,
          dust: -1.0,
        },
      }),
    });

    const res = await fetchOpenMeteoAirQuality({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: noopSleep,
    });

    expect(res.ok).toBe(true);
    expect(res.current?.pm25UgM3).toBe(-3.0);
    expect(res.current?.dustUgM3).toBe(-1.0);
  });

  it("identifies transient vs non-transient HTTP errors correctly", () => {
    expect(isTransientAirQualityError(429)).toBe(true);
    expect(isTransientAirQualityError(500)).toBe(true);
    expect(isTransientAirQualityError(502)).toBe(true);
    expect(isTransientAirQualityError(503)).toBe(true);
    expect(isTransientAirQualityError(504)).toBe(true);
    expect(isTransientAirQualityError(new Error("ETIMEDOUT"))).toBe(true);

    expect(isTransientAirQualityError(400)).toBe(false);
    expect(isTransientAirQualityError(401)).toBe(false);
    expect(isTransientAirQualityError(403)).toBe(false);
    expect(isTransientAirQualityError(404)).toBe(false);
  });

  it("retries up to 3 total attempts for transient connection errors and succeeds", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            time: 1754049600,
            pm2_5: 12.0,
          },
        }),
      });

    const res = await fetchOpenMeteoAirQuality({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: noopSleep,
    });

    expect(res.ok).toBe(true);
    expect(res.current?.pm25UgM3).toBe(12.0);
    expect(res.attemptsMade).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries HTTP 429 rate limit responses and succeeds on attempt 2", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            time: 1754049600,
            pm2_5: 15.0,
          },
        }),
      });

    const res = await fetchOpenMeteoAirQuality({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: noopSleep,
    });

    expect(res.ok).toBe(true);
    expect(res.attemptsMade).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry non-transient HTTP 400 Bad Request error and fails on attempt 1", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    });

    const res = await fetchOpenMeteoAirQuality({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: noopSleep,
    });

    expect(res.ok).toBe(false);
    expect(res.attemptsMade).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("stops after 3 total attempts if all transient requests fail", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const res = await fetchOpenMeteoAirQuality({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: noopSleep,
    });

    expect(res.ok).toBe(false);
    expect(res.attemptsMade).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
