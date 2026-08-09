import { describe, it, expect } from "vitest";
import { getRelevantSignals } from "../signals";
import type { OutdoorCheckInput } from "@/lib/check-options";

describe("getRelevantSignals", () => {
  it("returns baseline signals when no sensitivities or exertion activities are selected", () => {
    const input: OutdoorCheckInput = {
      location: "Perth",
      sensitivities: [],
      activity: "walking",
      durationMinutes: 30,
    };

    const signals = getRelevantSignals(input);
    expect(signals).toEqual([
      "apparentTemperatureC",
      "relativeHumidityPercent",
      "pm25UgM3",
      "pm10UgM3",
    ]);
  });

  it("adds dustUgM3 for respiratory sensitivity without duplicating PM signals or requiring dustLevel", () => {
    const input: OutdoorCheckInput = {
      location: "Miri",
      sensitivities: ["respiratory"],
      activity: "commuting",
      durationMinutes: 15,
    };

    const signals = getRelevantSignals(input);
    expect(signals).toEqual([
      "apparentTemperatureC",
      "relativeHumidityPercent",
      "pm25UgM3",
      "pm10UgM3",
      "dustUgM3",
    ]);
    expect(signals).not.toContain("dustLevel");
  });

  it("adds pollenLevel and windSpeedKph for hay-fever sensitivity", () => {
    const input: OutdoorCheckInput = {
      location: "Colombo",
      sensitivities: ["hay-fever"],
      activity: "errands",
      durationMinutes: 45,
    };

    const signals = getRelevantSignals(input);
    expect(signals).toEqual([
      "apparentTemperatureC",
      "relativeHumidityPercent",
      "pm25UgM3",
      "pm10UgM3",
      "windSpeedKph",
      "pollenLevel",
    ]);
  });

  it("does not duplicate temperature or humidity for heat sensitivity", () => {
    const input: OutdoorCheckInput = {
      location: "Dubai",
      sensitivities: ["heat"],
      activity: "walking",
      durationMinutes: 60,
    };

    const signals = getRelevantSignals(input);
    expect(signals).toEqual([
      "apparentTemperatureC",
      "relativeHumidityPercent",
      "pm25UgM3",
      "pm10UgM3",
    ]);
  });

  it("adds uvIndex for exercise and outdoor-work activities", () => {
    const exerciseInput: OutdoorCheckInput = {
      location: "Perth",
      sensitivities: [],
      activity: "exercise",
      durationMinutes: 45,
    };
    expect(getRelevantSignals(exerciseInput)).toContain("uvIndex");

    const workInput: OutdoorCheckInput = {
      location: "Dubai",
      sensitivities: [],
      activity: "outdoor-work",
      durationMinutes: 60,
    };
    expect(getRelevantSignals(workInput)).toContain("uvIndex");
  });

  it("combines multiple sensitivities cleanly without duplicates and preserves stable order", () => {
    const input: OutdoorCheckInput = {
      location: "Perth",
      sensitivities: ["respiratory", "hay-fever", "heat"],
      activity: "exercise",
      durationMinutes: 60,
    };

    const signals = getRelevantSignals(input);
    expect(signals).toEqual([
      "apparentTemperatureC",
      "relativeHumidityPercent",
      "pm25UgM3",
      "pm10UgM3",
      "windSpeedKph",
      "uvIndex",
      "pollenLevel",
      "dustUgM3",
    ]);
  });

  it("does not mutate the input object or its arrays", () => {
    const sensitivities = ["respiratory", "heat"] as const;
    const input: OutdoorCheckInput = {
      location: "Miri",
      sensitivities: [...sensitivities],
      activity: "walking",
      durationMinutes: 30,
    };

    Object.freeze(input);
    Object.freeze(input.sensitivities);

    expect(() => getRelevantSignals(input)).not.toThrow();
  });
});
