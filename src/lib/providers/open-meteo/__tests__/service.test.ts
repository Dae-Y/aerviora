import { describe, it, expect, vi } from "vitest";
import { getOpenMeteoEnvironmentalSnapshot } from "../service";

describe("getOpenMeteoEnvironmentalSnapshot service", () => {
  const refTime = "2026-08-01T12:00:00.000Z";

  it("orchestrates geocoding, weather, and air quality and returns combined snapshot", async () => {
    const weatherTime = "2026-08-01T11:30:00.000Z"; // 30 mins old (older)
    const airTime = "2026-08-01T11:45:00.000Z"; // 15 mins old

    const mockFetch = vi.fn().mockImplementation(async (urlStr: string) => {
      if (urlStr.includes("geocoding-api")) {
        return {
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
        };
      }
      if (urlStr.includes("air-quality-api")) {
        return {
          ok: true,
          json: async () => ({
            current: {
              time: Math.floor(new Date(airTime).getTime() / 1000),
              pm2_5: 6.0,
              pm10: 14.0,
              dust: 2.5,
              uv_index: 4.0,
            },
            hourly: {
              time: [Math.floor(new Date(airTime).getTime() / 1000)],
              pm2_5: [6.0],
            },
          }),
        };
      }
      if (urlStr.includes("forecast")) {
        return {
          ok: true,
          json: async () => ({
            current: {
              time: Math.floor(new Date(weatherTime).getTime() / 1000),
              temperature_2m: 22.0,
              apparent_temperature: 21.5,
              relative_humidity_2m: 50,
              wind_speed_10m: 12.0,
            },
            hourly: {
              time: [Math.floor(new Date(weatherTime).getTime() / 1000)],
              temperature_2m: [22.0],
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const result = await getOpenMeteoEnvironmentalSnapshot({
      location: "Perth",
      prototypeLocationId: "perth",
      retrievedAt: refTime,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: async () => {},
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.requestedLocation).toBe("Perth");
    expect(result.resolvedLocation.displayName).toBe(
      "Perth, Western Australia, Australia"
    );

    // Adjustment 11: Older observedAt timestamp selected (weatherTime 11:30 vs airTime 11:45)
    expect(result.snapshot.current?.observedAt).toBe(weatherTime);
    expect(result.snapshot.current?.airTemperatureC).toBe(22.0);
    expect(result.snapshot.current?.pm25UgM3).toBe(6.0);
    expect(result.snapshot.current?.dustUgM3).toBe(2.5);

    // Adjustment 10: Sources marked available because they contain valid current samples
    expect(result.snapshot.sources).toHaveLength(2);
    expect(result.snapshot.sources[0].status).toBe("available");
    expect(result.snapshot.sources[1].status).toBe("available");
  });

  it("handles partial failure: weather succeeds but air quality fails", async () => {
    const mockFetch = vi.fn().mockImplementation(async (urlStr: string) => {
      if (urlStr.includes("geocoding-api")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                name: "Perth",
                country: "Australia",
                country_code: "AU",
                latitude: -31.95,
                longitude: 115.86,
              },
            ],
          }),
        };
      }
      if (urlStr.includes("air-quality-api")) {
        return { ok: false, status: 503 };
      }
      if (urlStr.includes("forecast")) {
        return {
          ok: true,
          json: async () => ({
            current: {
              time: 1754049600,
              temperature_2m: 20.0,
            },
          }),
        };
      }
      return { ok: false };
    });

    const result = await getOpenMeteoEnvironmentalSnapshot({
      location: "Perth",
      retrievedAt: refTime,
      fetchImpl: mockFetch as unknown as typeof fetch,
      sleepImpl: async () => {},
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.current?.airTemperatureC).toBe(20.0);
    expect(result.snapshot.current?.pm25UgM3).toBeUndefined();

    expect(result.snapshot.sources[0].status).toBe("available");
    expect(result.snapshot.sources[1].status).toBe("error");
  });

  it("returns location-not-found when geocoding returns no results", async () => {
    const mockFetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ results: [] }),
    }));

    const result = await getOpenMeteoEnvironmentalSnapshot({
      location: "UnknownPlace123",
      retrievedAt: refTime,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("location-not-found");
  });

  it("Task 7.7.5 Amendment 4: includes resolved IANA timezone in weather and air-quality request URLs", async () => {
    const fetchedUrls: string[] = [];
    const mockFetch = vi.fn().mockImplementation(async (urlStr: string) => {
      fetchedUrls.push(urlStr);
      if (urlStr.includes("geocoding-api")) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                name: "Miri",
                country: "Malaysia",
                country_code: "MY",
                latitude: 4.3995,
                longitude: 113.9914,
                timezone: "Asia/Kuching",
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          current: {
            time: Math.floor(new Date("2026-08-01T11:45:00.000Z").getTime() / 1000),
            temperature_2m: 29.0,
            pm2_5: 5.0,
          },
        }),
      };
    });

    const result = await getOpenMeteoEnvironmentalSnapshot({
      location: "Miri",
      prototypeLocationId: "miri",
      retrievedAt: refTime,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);

    const weatherUrl = fetchedUrls.find((u) => u.includes("forecast"));
    const airQualityUrl = fetchedUrls.find((u) => u.includes("air-quality"));

    expect(weatherUrl).toBeDefined();
    expect(weatherUrl).toContain("latitude=4.3995");
    expect(weatherUrl).toContain("longitude=113.9914");
    expect(weatherUrl).toContain("timezone=Asia%2FKuching");

    expect(airQualityUrl).toBeDefined();
    expect(airQualityUrl).toContain("latitude=4.3995");
    expect(airQualityUrl).toContain("longitude=113.9914");
    expect(airQualityUrl).toContain("timezone=Asia%2FKuching");
  });
});
