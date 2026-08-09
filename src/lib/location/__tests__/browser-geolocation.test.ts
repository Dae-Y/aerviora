import { describe, it, expect, vi } from "vitest";
import { requestBrowserLocation } from "../browser-geolocation";

describe("Browser Geolocation Helper", () => {
  it("resolves coordinates on success without continuous watch", async () => {
    const mockGetCurrentPosition = vi.fn((success) => {
      success({
        coords: {
          latitude: -31.9535,
          longitude: 115.857,
          accuracy: 15,
        },
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: vi.fn(),
      },
    });

    const res = await requestBrowserLocation();

    expect(res.status).toBe("resolved");
    expect(res.location).toBeDefined();
    expect(res.location?.latitude).toBe(-31.9535);
    expect(res.location?.longitude).toBe(115.857);
    expect(res.location?.source).toBe("device-location");
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("handles permission denied calmly", async () => {
    const mockGetCurrentPosition = vi.fn((_, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        message: "User denied Geolocation",
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: mockGetCurrentPosition },
    });

    const res = await requestBrowserLocation();
    expect(res.status).toBe("denied");
    expect(res.location).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("handles position unavailable", async () => {
    const mockGetCurrentPosition = vi.fn((_, error) => {
      error({
        code: 2, // POSITION_UNAVAILABLE
        message: "Position unavailable",
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: mockGetCurrentPosition },
    });

    const res = await requestBrowserLocation();
    expect(res.status).toBe("unavailable");
    vi.unstubAllGlobals();
  });

  it("handles timeout", async () => {
    const mockGetCurrentPosition = vi.fn((_, error) => {
      error({
        code: 3, // TIMEOUT
        message: "Timeout",
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: mockGetCurrentPosition },
    });

    const res = await requestBrowserLocation();
    expect(res.status).toBe("timed-out");
    vi.unstubAllGlobals();
  });
});
