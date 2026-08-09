import { describe, it, expect } from "vitest";
import { evaluatePersonalisedRisk } from "../engine";
import { evaluateHourlyForecastPoint } from "../forecast-window";
import type { EnvironmentalSnapshot, CurrentEnvironmentalSample, ForecastEnvironmentalSample } from "../types";
import type { OutdoorCheckInput } from "@/lib/check-options";

describe("Risk Model v2 Parity: Current Snapshot vs Hourly Forecast Point", () => {
  const refTime = "2026-08-06T12:00:00.000Z";

  function runParityCheck(
    sample: Omit<CurrentEnvironmentalSample, "observedAt">,
    input: OutdoorCheckInput
  ) {
    const currentSnapshot: EnvironmentalSnapshot = {
      requestedLocation: "Perth",
      resolvedLocation: "Perth, Australia",
      current: {
        observedAt: refTime,
        ...sample,
      },
      hourly: [],
      sources: [
        { kind: "weather", provider: "Open-Meteo Weather", status: "available", observedAt: refTime },
        { kind: "air-quality", provider: "Open-Meteo Air Quality", status: "available", observedAt: refTime },
      ],
    };

    const currentResult = evaluatePersonalisedRisk({
      snapshot: currentSnapshot,
      input,
      referenceTime: refTime,
    });

    const forecastPoint: ForecastEnvironmentalSample = {
      validAt: refTime,
      ...sample,
    };

    const hourlyForecastPointResult = evaluateHourlyForecastPoint({
      point: forecastPoint,
      snapshot: currentSnapshot,
      input,
    }).result;

    expect(hourlyForecastPointResult.level).toBe(currentResult.level);
    expect(hourlyForecastPointResult.action).toBe(currentResult.action);
    expect(hourlyForecastPointResult.recommendation.key).toBe(currentResult.recommendation.key);
    expect(hourlyForecastPointResult.confidence).toBe(currentResult.confidence);

    if (currentResult.domainAssessments && hourlyForecastPointResult.domainAssessments) {
      expect(hourlyForecastPointResult.domainAssessments.length).toBe(currentResult.domainAssessments.length);
      for (let i = 0; i < currentResult.domainAssessments.length; i++) {
        expect(hourlyForecastPointResult.domainAssessments[i].domain).toBe(currentResult.domainAssessments[i].domain);
        expect(hourlyForecastPointResult.domainAssessments[i].baseSeverity).toBe(currentResult.domainAssessments[i].baseSeverity);
        expect(hourlyForecastPointResult.domainAssessments[i].effectiveSeverity).toBe(currentResult.domainAssessments[i].effectiveSeverity);
      }
    }
  }

  it("Scenario A: AQI 70 general walking", () => {
    runParityCheck(
      { pm25UsAqi: 70, pm25UgM3: 21, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 45 }
    );
  });

  it("Scenario C: AQI 110 general walking", () => {
    runParityCheck(
      { pm25UsAqi: 110, pm25UgM3: 39, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 45 }
    );
  });

  it("Scenario E: AQI 110 exercise 90 minutes", () => {
    runParityCheck(
      { pm25UsAqi: 110, pm25UgM3: 39, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "exercise", durationMinutes: 90 }
    );
  });

  it("Scenario G: AQI 170 general walking", () => {
    runParityCheck(
      { pm25UsAqi: 170, pm25UgM3: 92, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 45 }
    );
  });

  it("Scenario H: AQI 170 strong respiratory sensitivity + high exposure", () => {
    runParityCheck(
      { pm25UsAqi: 170, pm25UgM3: 92, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "strong", heat: "not-affected", hayFever: "not-affected" }, activity: "exercise", durationMinutes: 120 }
    );
  });

  it("Scenario I: AQI 220", () => {
    runParityCheck(
      { pm25UsAqi: 220, pm25UgM3: 170, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 30 }
    );
  });

  it("Scenario J: multiple elevated domains", () => {
    runParityCheck(
      { pm25UsAqi: 110, pm25UgM3: 39, apparentTemperatureC: 32, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 7 },
      { location: "Perth", sensitivities: { respiratory: "moderate", heat: "moderate", hayFever: "not-affected" }, activity: "walking", durationMinutes: 60 }
    );
  });

  it("Scenario K: apparent temperature 35°C", () => {
    runParityCheck(
      { pm25UsAqi: 20, pm25UgM3: 5, apparentTemperatureC: 35, relativeHumidityPercent: 40, windSpeedKph: 10, uvIndex: 3 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 45 }
    );
  });

  it("Scenario M: strong heat sensitivity + high exposure", () => {
    runParityCheck(
      { pm25UsAqi: 20, pm25UgM3: 5, apparentTemperatureC: 35, relativeHumidityPercent: 40, windSpeedKph: 10, uvIndex: 3 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "strong", hayFever: "not-affected" }, activity: "outdoor-work", durationMinutes: 120 }
    );
  });

  it("Scenario N: apparent temperature 39°C", () => {
    runParityCheck(
      { pm25UsAqi: 20, pm25UgM3: 5, apparentTemperatureC: 39, relativeHumidityPercent: 40, windSpeedKph: 10, uvIndex: 3 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 45 }
    );
  });

  it("Scenario O: UV 9 only", () => {
    runParityCheck(
      { pm25UsAqi: 20, pm25UgM3: 5, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 9 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 45 }
    );
  });

  it("Scenario P: missing AQI", () => {
    runParityCheck(
      { apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 45 }
    );
  });

  it("Scenario Q: particulate high + thermal high", () => {
    runParityCheck(
      { pm25UsAqi: 170, pm25UgM3: 92, apparentTemperatureC: 36, relativeHumidityPercent: 45, windSpeedKph: 10, uvIndex: 4 },
      { location: "Perth", sensitivities: { respiratory: "slight", heat: "slight", hayFever: "not-affected" }, activity: "walking", durationMinutes: 60 }
    );
  });

  it("Scenario R: ordinary elevated particulate + strong respiratory + moderate exposure", () => {
    runParityCheck(
      { pm25UsAqi: 110, pm25UgM3: 39, apparentTemperatureC: 22, relativeHumidityPercent: 50, windSpeedKph: 10, uvIndex: 2 },
      { location: "Perth", sensitivities: { respiratory: "strong", heat: "not-affected", hayFever: "not-affected" }, activity: "exercise", durationMinutes: 60 }
    );
  });
});
