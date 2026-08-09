import { describe, it, expect, vi } from "vitest";
import { fetchOpenMeteoWeather } from "../weather";

describe("fetchOpenMeteoWeather", () => {
  it("normalises current and hourly weather data correctly", async () => {
    const unixTime = 1754049600; // e.g. Unix timestamp seconds
    const expectedIso = new Date(unixTime * 1000).toISOString();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          time: unixTime,
          temperature_2m: 24.5,
          apparent_temperature: 25.0,
          relative_humidity_2m: 55,
          wind_speed_10m: 14.2,
        },
        hourly: {
          time: [unixTime, unixTime + 3600],
          temperature_2m: [24.5, 23.0],
          apparent_temperature: [25.0, null],
          relative_humidity_2m: [55, 60],
          wind_speed_10m: [14.2, 10.0],
        },
      }),
    });

    const res = await fetchOpenMeteoWeather({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    expect(res.current?.observedAt).toBe(expectedIso);
    expect(res.current?.airTemperatureC).toBe(24.5);
    expect(res.current?.apparentTemperatureC).toBe(25.0);
    expect(res.current?.relativeHumidityPercent).toBe(55);
    expect(res.current?.windSpeedKph).toBe(14.2);

    expect(res.hourly).toHaveLength(2);
    expect(res.hourly?.[1].apparentTemperatureC).toBeUndefined(); // null kept omitted, not 0
  });

  it("does not clamp negative wind speed to zero, allowing domain validation to detect it", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          time: 1754049600,
          temperature_2m: 20.0,
          wind_speed_10m: -10.5,
        },
      }),
    });

    const res = await fetchOpenMeteoWeather({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    expect(res.current?.windSpeedKph).toBe(-10.5);
  });

  it("returns unavailable error when HTTP response fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const res = await fetchOpenMeteoWeather({
      latitude: -31.95,
      longitude: 115.86,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.ok).toBe(false);
    expect(res.errorReason).toBe("unavailable");
  });
});
