import { describe, it, expect } from "vitest";
import {
  formatTemperatureC,
  formatHumidityPercent,
  formatWindSpeedKph,
  formatConcentrationUgM3,
  formatUvIndex,
  formatEnvironmentalTimestamp,
  getEnvironmentalSignalLabel,
} from "../environment-format";

describe("environment-format utilities", () => {
  it("formats temperature correctly with °C and removes trailing .0", () => {
    expect(formatTemperatureC(24.5)).toBe("24.5 °C");
    expect(formatTemperatureC(24.0)).toBe("24 °C");
    expect(formatTemperatureC(undefined)).toBe("Unavailable");
    expect(formatTemperatureC(NaN)).toBe("Unavailable");
  });

  it("formats relative humidity to whole percentage", () => {
    expect(formatHumidityPercent(55.4)).toBe("55%");
    expect(formatHumidityPercent(55.8)).toBe("56%");
    expect(formatHumidityPercent(undefined)).toBe("Unavailable");
  });

  it("formats wind speed with km/h", () => {
    expect(formatWindSpeedKph(12.5)).toBe("12.5 km/h");
    expect(formatWindSpeedKph(12.0)).toBe("12 km/h");
    expect(formatWindSpeedKph(undefined)).toBe("Unavailable");
  });

  it("formats concentrations with µg/m³", () => {
    expect(formatConcentrationUgM3(8.23)).toBe("8.2 µg/m³");
    expect(formatConcentrationUgM3(15.0)).toBe("15 µg/m³");
    expect(formatConcentrationUgM3(undefined)).toBe("Unavailable");
  });

  it("formats UV index cleanly", () => {
    expect(formatUvIndex(4.0)).toBe("4");
    expect(formatUvIndex(4.5)).toBe("4.5");
    expect(formatUvIndex(undefined)).toBe("Unavailable");
  });

  it("formats timestamps using specified IANA timezone", () => {
    const iso = "2026-08-01T12:00:00Z";
    const perthTime = formatEnvironmentalTimestamp(iso, "Australia/Perth");
    expect(perthTime.toLowerCase()).toContain("8:00 pm local time"); // 12:00 UTC + 8 hours = 20:00 (8:00 PM)

    const invalidTzTime = formatEnvironmentalTimestamp(iso, "invalid-tz");
    expect(invalidTzTime.toLowerCase()).toContain("12:00 pm local time"); // Fallback to UTC

    expect(formatEnvironmentalTimestamp(undefined)).toBe("Unavailable");
  });

  it("returns human-readable labels for signal keys", () => {
    expect(getEnvironmentalSignalLabel("airTemperatureC")).toBe("Air temperature");
    expect(getEnvironmentalSignalLabel("dustUgM3")).toBe("Modelled dust");
    expect(getEnvironmentalSignalLabel("pm25UgM3")).toBe("PM2.5");
    expect(getEnvironmentalSignalLabel("uvIndex")).toBe("UV index");
  });
});
