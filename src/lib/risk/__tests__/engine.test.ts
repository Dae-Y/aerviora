import { describe, it, expect } from "vitest";
import {
  evaluatePersonalisedRisk,
  normaliseSensitivities,
  resolveExposureDemand,
  assessParticulateDomain,
  assessThermalDomain,
  assessUvDomain,
  resolveVeryHighPrimaryDomains,
  aggregateCrossDomainRisk,
} from "../engine";
import type {
  EnvironmentalSnapshot,
  SensitivityProfile,
  DomainAssessment,
} from "../types";
import type { OutdoorCheckInput } from "@/lib/check-options";

describe("Aerviora Risk Model v2 Engine Unit Tests (Task 10C)", () => {
  const refTime = "2026-08-01T12:00:00.000Z";

  const defaultInput: OutdoorCheckInput = {
    location: "Perth",
    sensitivities: { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" },
    activity: "walking",
    durationMinutes: 30,
  };

  const validSnapshot: EnvironmentalSnapshot = {
    requestedLocation: "Perth",
    resolvedLocation: "Perth, WA, Australia",
    current: {
      observedAt: "2026-08-01T11:45:00.000Z",
      airTemperatureC: 20.0,
      apparentTemperatureC: 20.0,
      relativeHumidityPercent: 50,
      windSpeedKph: 10.0,
      uvIndex: 2.0,
      pm25UgM3: 6.0,
      pm10UgM3: 12.0,
      dustUgM3: 2.0,
      pm25UsAqi: 20,
      pm10UsAqi: 15,
    },
    hourly: [],
    sources: [
      {
        kind: "weather",
        provider: "Open-Meteo Weather",
        status: "available",
        observedAt: "2026-08-01T11:45:00Z",
      },
      {
        kind: "air-quality",
        provider: "Open-Meteo Air Quality",
        status: "available",
        observedAt: "2026-08-01T11:45:00Z",
      },
    ],
  };

  describe("1. Sensitivity Normalisation Tests", () => {
    it("maps empty legacy array to all not-affected", () => {
      const profile = normaliseSensitivities([]);
      expect(profile).toEqual({
        respiratory: "not-affected",
        heat: "not-affected",
        hayFever: "not-affected",
      });
    });

    it("maps legacy respiratory selection to moderate intensity", () => {
      const profile = normaliseSensitivities(["respiratory"]);
      expect(profile).toEqual({
        respiratory: "moderate",
        heat: "not-affected",
        hayFever: "not-affected",
      });
    });

    it("maps legacy heat selection to moderate intensity", () => {
      const profile = normaliseSensitivities(["heat"]);
      expect(profile).toEqual({
        respiratory: "not-affected",
        heat: "moderate",
        hayFever: "not-affected",
      });
    });

    it("maps legacy hay-fever selection to moderate intensity", () => {
      const profile = normaliseSensitivities(["hay-fever"]);
      expect(profile).toEqual({
        respiratory: "not-affected",
        heat: "not-affected",
        hayFever: "moderate",
      });
    });

    it("passes a SensitivityProfile object through unchanged", () => {
      const inputProfile: SensitivityProfile = {
        respiratory: "strong",
        heat: "slight",
        hayFever: "not-affected",
      };
      const profile = normaliseSensitivities(inputProfile);
      expect(profile).toBe(inputProfile);
    });
  });

  describe("2. Exposure Demand Resolver Tests", () => {
    it("resolves ordinary activity under 60m to low exposure", () => {
      expect(resolveExposureDemand("walking", 30)).toBe("low");
      expect(resolveExposureDemand("walking", 59)).toBe("low");
      expect(resolveExposureDemand("commuting", 45)).toBe("low");
      expect(resolveExposureDemand("errands", 30)).toBe("low");
      expect(resolveExposureDemand(null, null)).toBe("low");
    });

    it("resolves ordinary activity 60m to 119m to moderate exposure", () => {
      expect(resolveExposureDemand("walking", 60)).toBe("moderate");
      expect(resolveExposureDemand("walking", 119)).toBe("moderate");
    });

    it("resolves ordinary activity 120m+ to high exposure", () => {
      expect(resolveExposureDemand("walking", 120)).toBe("high");
      expect(resolveExposureDemand("walking", 180)).toBe("high");
    });

    it("resolves high exertion (exercise/outdoor-work) under 60m to moderate exposure", () => {
      expect(resolveExposureDemand("exercise", 30)).toBe("moderate");
      expect(resolveExposureDemand("exercise", 59)).toBe("moderate");
      expect(resolveExposureDemand("outdoor-work", 45)).toBe("moderate");
    });

    it("resolves high exertion (exercise/outdoor-work) 60m+ to high exposure", () => {
      expect(resolveExposureDemand("exercise", 60)).toBe("high");
      expect(resolveExposureDemand("outdoor-work", 90)).toBe("high");
      expect(resolveExposureDemand("exercise", 120)).toBe("high");
    });
  });

  describe("3. Domain Assessment & Matrix Tests", () => {
    const defaultProfile: SensitivityProfile = {
      respiratory: "not-affected",
      heat: "not-affected",
      hayFever: "not-affected",
    };

    it("particulate AQI 0-50 is always effective lower", () => {
      const strongProfile: SensitivityProfile = { ...defaultProfile, respiratory: "strong" };
      const assessment = assessParticulateDomain(40, strongProfile, "high");
      expect(assessment.particulateBaseBand).toBe("lower");
      expect(assessment.effectiveSeverity).toBe("lower");
      expect(assessment.adjustmentApplied).toBe(false);
    });

    it("particulate AQI 51-100: strong sensitivity + high exposure => elevated (capped at elevated for AQI 51-100)", () => {
      const strongProfile: SensitivityProfile = { ...defaultProfile, respiratory: "strong" };
      const resLow = assessParticulateDomain(70, strongProfile, "low");
      const resMod = assessParticulateDomain(70, strongProfile, "moderate");
      const resHigh = assessParticulateDomain(70, strongProfile, "high");

      expect(resLow.effectiveSeverity).toBe("elevated");
      expect(resMod.effectiveSeverity).toBe("elevated");
      expect(resHigh.effectiveSeverity).toBe("elevated");
      expect(resHigh.adjustmentApplied).toBe(true);
    });

    it("particulate AQI 101-150: upper-elevated base band capped at high", () => {
      const strongProfile: SensitivityProfile = { ...defaultProfile, respiratory: "strong" };
      const resLow = assessParticulateDomain(110, defaultProfile, "low");
      const resHigh = assessParticulateDomain(110, defaultProfile, "high");
      const resStrongHigh = assessParticulateDomain(110, strongProfile, "high");

      expect(resLow.particulateBaseBand).toBe("upper-elevated");
      expect(resLow.baseSeverity).toBe("elevated");
      expect(resLow.effectiveSeverity).toBe("elevated");

      expect(resHigh.effectiveSeverity).toBe("high");

      expect(resStrongHigh.effectiveSeverity).toBe("high");
      expect(resStrongHigh.capApplied).toBe("Particulate effective severity capped at high for AQI 101–150");
    });

    it("thermal apparent temp < 27°C is always effective lower", () => {
      const strongProfile: SensitivityProfile = { ...defaultProfile, heat: "strong" };
      const assessment = assessThermalDomain(24, strongProfile, "high");
      expect(assessment.baseSeverity).toBe("lower");
      expect(assessment.effectiveSeverity).toBe("lower");
    });

    it("thermal 27.0-31.9°C: moderate + high exposure or strong + mod/high exposure => high", () => {
      const modProfile: SensitivityProfile = { ...defaultProfile, heat: "moderate" };
      const strongProfile: SensitivityProfile = { ...defaultProfile, heat: "strong" };

      expect(assessThermalDomain(29, modProfile, "low").effectiveSeverity).toBe("elevated");
      expect(assessThermalDomain(29, modProfile, "high").effectiveSeverity).toBe("high");
      expect(assessThermalDomain(29, strongProfile, "moderate").effectiveSeverity).toBe("high");
    });

    it("UV index domain separates protectionSeverity from capped overallRiskContribution", () => {
      const uvElevated = assessUvDomain(7.0, "low");
      expect(uvElevated.protectionSeverity).toBe("elevated");
      expect(uvElevated.overallRiskContribution).toBe("elevated");
      expect(uvElevated.effectiveSeverity).toBe("elevated");

      const uvHigh = assessUvDomain(9.0, "low");
      expect(uvHigh.protectionSeverity).toBe("high");
      expect(uvHigh.overallRiskContribution).toBe("elevated");
      expect(uvHigh.effectiveSeverity).toBe("elevated");
      expect(uvHigh.capApplied).toBe("UV overall risk contribution capped at elevated");
    });
  });

  describe("4. Single-Source Cross-Domain Aggregation Tests", () => {
    it("1 severe effective domain => very-high", () => {
      const severePart: DomainAssessment = {
        domain: "particulate",
        baseSeverity: "severe",
        effectiveSeverity: "severe",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };
      const lowerThermal: DomainAssessment = {
        domain: "thermal",
        baseSeverity: "lower",
        effectiveSeverity: "lower",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };
      const lowerUv: DomainAssessment = {
        domain: "uv",
        baseSeverity: "lower",
        effectiveSeverity: "lower",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };

      const result = aggregateCrossDomainRisk([severePart, lowerThermal, lowerUv]);
      expect(result.level).toBe("very-high");
      expect(result.primaryDomains).toEqual(["particulate"]);
    });

    it("2 objective base-high domains => very-high", () => {
      const objHighPart: DomainAssessment = {
        domain: "particulate",
        baseSeverity: "high",
        effectiveSeverity: "high",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };
      const objHighThermal: DomainAssessment = {
        domain: "thermal",
        baseSeverity: "high",
        effectiveSeverity: "high",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };
      const lowerUv: DomainAssessment = {
        domain: "uv",
        baseSeverity: "lower",
        effectiveSeverity: "lower",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };

      const result = aggregateCrossDomainRisk([objHighPart, objHighThermal, lowerUv]);
      expect(result.level).toBe("very-high");
      expect(result.primaryDomains).toEqual(["particulate", "thermal"]);
    });

    it("2 context-promoted high domains => high (NOT very-high)", () => {
      // AQI 110 + 29°C temp under strong context => effective high for both, but base is elevated for both
      const contextHighPart: DomainAssessment = {
        domain: "particulate",
        baseSeverity: "elevated",
        particulateBaseBand: "upper-elevated",
        effectiveSeverity: "high",
        susceptibility: "strong",
        exposureDemand: "high",
        adjustmentApplied: true,
        upliftReason: "Strong respiratory sensitivity",
        capApplied: null,
      };
      const contextHighThermal: DomainAssessment = {
        domain: "thermal",
        baseSeverity: "elevated",
        effectiveSeverity: "high",
        susceptibility: "strong",
        exposureDemand: "high",
        adjustmentApplied: true,
        upliftReason: "Strong heat sensitivity",
        capApplied: null,
      };
      const lowerUv: DomainAssessment = {
        domain: "uv",
        baseSeverity: "lower",
        effectiveSeverity: "lower",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };

      const veryHighDomains = resolveVeryHighPrimaryDomains([contextHighPart, contextHighThermal, lowerUv]);
      expect(veryHighDomains).toEqual([]);

      const result = aggregateCrossDomainRisk([contextHighPart, contextHighThermal, lowerUv]);
      expect(result.level).toBe("high");
      expect(result.primaryDomains).toEqual(["particulate", "thermal"]);
    });

    it("1 objective base-high + 1 context-promoted high => high (NOT very-high)", () => {
      const objHighThermal: DomainAssessment = {
        domain: "thermal",
        baseSeverity: "high",
        effectiveSeverity: "high",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };
      const contextHighPart: DomainAssessment = {
        domain: "particulate",
        baseSeverity: "elevated",
        particulateBaseBand: "upper-elevated",
        effectiveSeverity: "high",
        susceptibility: "strong",
        exposureDemand: "high",
        adjustmentApplied: true,
        upliftReason: "Strong respiratory sensitivity",
        capApplied: null,
      };
      const lowerUv: DomainAssessment = {
        domain: "uv",
        baseSeverity: "lower",
        effectiveSeverity: "lower",
        susceptibility: "not-affected",
        exposureDemand: "low",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };

      const result = aggregateCrossDomainRisk([contextHighPart, objHighThermal, lowerUv]);
      expect(result.level).toBe("high");
      expect(result.primaryDomains).toEqual(["particulate", "thermal"]);
    });

    it("multiple elevated domains => elevated", () => {
      const elevPart: DomainAssessment = {
        domain: "particulate",
        baseSeverity: "elevated",
        effectiveSeverity: "elevated",
        susceptibility: "not-affected",
        exposureDemand: "moderate",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };
      const elevThermal: DomainAssessment = {
        domain: "thermal",
        baseSeverity: "elevated",
        effectiveSeverity: "elevated",
        susceptibility: "not-affected",
        exposureDemand: "moderate",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };
      const elevUv: DomainAssessment = {
        domain: "uv",
        baseSeverity: "elevated",
        effectiveSeverity: "elevated",
        protectionSeverity: "elevated",
        overallRiskContribution: "elevated",
        susceptibility: "not-affected",
        exposureDemand: "moderate",
        adjustmentApplied: false,
        upliftReason: null,
        capApplied: null,
      };

      const result = aggregateCrossDomainRisk([elevPart, elevThermal, elevUv]);
      expect(result.level).toBe("elevated");
      expect(result.primaryDomains).toEqual(["particulate", "thermal", "uv"]);
    });
  });

  describe("5. Boundary Value Tests", () => {
    it("AQI boundary points: 50 vs 51, 100 vs 101, 150 vs 151, 200 vs 201", () => {
      const p = { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" } as SensitivityProfile;
      expect(assessParticulateDomain(50, p, "low").particulateBaseBand).toBe("lower");
      expect(assessParticulateDomain(51, p, "low").particulateBaseBand).toBe("moderate-context");
      expect(assessParticulateDomain(100, p, "low").particulateBaseBand).toBe("moderate-context");
      expect(assessParticulateDomain(101, p, "low").particulateBaseBand).toBe("upper-elevated");
      expect(assessParticulateDomain(150, p, "low").particulateBaseBand).toBe("upper-elevated");
      expect(assessParticulateDomain(151, p, "low").particulateBaseBand).toBe("high");
      expect(assessParticulateDomain(200, p, "low").particulateBaseBand).toBe("high");
      expect(assessParticulateDomain(201, p, "low").particulateBaseBand).toBe("severe");
    });

    it("Apparent temperature boundary points: 26.9 vs 27.0, 31.9 vs 32.0, 37.9 vs 38.0", () => {
      const p = { respiratory: "not-affected", heat: "not-affected", hayFever: "not-affected" } as SensitivityProfile;
      expect(assessThermalDomain(26.9, p, "low").baseSeverity).toBe("lower");
      expect(assessThermalDomain(27.0, p, "low").baseSeverity).toBe("elevated");
      expect(assessThermalDomain(31.9, p, "low").baseSeverity).toBe("elevated");
      expect(assessThermalDomain(32.0, p, "low").baseSeverity).toBe("high");
      expect(assessThermalDomain(37.9, p, "low").baseSeverity).toBe("high");
      expect(assessThermalDomain(38.0, p, "low").baseSeverity).toBe("severe");
    });
  });

  describe("6. Runtime Invariant Assertions", () => {
    it("guarantees domainAssessments and v2Result are populated for all assessable results", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: validSnapshot,
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(result.level).toBe("lower");
      expect(result.domainAssessments).toBeDefined();
      expect(result.domainAssessments!.length).toBe(3);
      expect(result.v2Result).toBeDefined();
      expect(result.v2Result!.level).toBe("lower");
    });

    it("omits or sets domainAssessments and v2Result undefined for unable results", () => {
      const unableResult = evaluatePersonalisedRisk({
        snapshot: { ...validSnapshot, current: undefined },
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(unableResult.level).toBe("unable");
      expect(unableResult.domainAssessments).toBeUndefined();
      expect(unableResult.v2Result).toBeUndefined();
    });
  });

  describe("7. Task 10B Acceptance Scenarios (Scenarios A through R)", () => {
    it("Revised Scenario A: AQI 70, 20°C, UV 2, None, walking, 30m => lower", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 70, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("lower");
      expect(result.recommendation.title).toBe("Looks good overall");
    });

    it("New Scenario A2: AQI 70, 20°C, Resp: slight, walking, 30m => lower", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 70, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: { respiratory: "slight", heat: "not-affected", hayFever: "not-affected" }, activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("lower");
      expect(result.recommendation.title).toBe("Looks good overall");
    });

    it("Scenario B: AQI 70, 20°C, Resp: Mod, walking, 30m => elevated", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 70, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: ["respiratory"], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("elevated");
      expect(result.v2Result!.primaryDomains).toEqual(["particulate"]);
    });

    it("Scenario C: AQI 110, 20°C, None, walking, 30m => elevated", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 110, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("elevated");
      expect(result.v2Result!.primaryDomains).toEqual(["particulate"]);
    });

    it("Scenario D: AQI 110, 20°C, Resp: Mod, walking, 30m => elevated", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 110, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: ["respiratory"], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("elevated");
    });

    it("Scenario E: AQI 110, 20°C, None, exercise, 90m => high", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 110, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "exercise", durationMinutes: 90 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("high");
      expect(result.level).not.toBe("very-high");
    });

    it("Scenario F: AQI 110, 20°C, Resp: Strong, exercise, 90m => high (Capped)", () => {
      const profile: SensitivityProfile = { respiratory: "strong", heat: "not-affected", hayFever: "not-affected" };
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 110, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: profile, activity: "exercise", durationMinutes: 90 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("high");
      expect(result.level).not.toBe("very-high");
    });

    it("Scenario G: AQI 170, 20°C, None, walking, 30m => high", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 170, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("high");
    });

    it("Scenario H: AQI 170, 20°C, Resp: Strong, exercise, 120m => very-high", () => {
      const profile: SensitivityProfile = { respiratory: "strong", heat: "not-affected", hayFever: "not-affected" };
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 170, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: profile, activity: "exercise", durationMinutes: 120 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("very-high");
    });

    it("Scenario I: AQI 220, 20°C, None, walking, 30m => very-high", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 220, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("very-high");
    });

    it("Scenario J: AQI 80, 29°C, UV 7, None, walking, 60m => elevated", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 80, apparentTemperatureC: 29, uvIndex: 7 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 60 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("elevated");
      expect(result.v2Result!.primaryDomains).toContain("thermal");
      expect(result.v2Result!.primaryDomains).toContain("uv");
    });

    it("Scenario K: 35°C, AQI 30, None, walking, 30m => high", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 30, apparentTemperatureC: 35, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("high");
      expect(result.v2Result!.primaryDomains).toEqual(["thermal"]);
    });

    it("Scenario L: 35°C, AQI 30, Heat: Mod, outdoor-work, 90m => high", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 30, apparentTemperatureC: 35, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: ["heat"], activity: "outdoor-work", durationMinutes: 90 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("high");
    });

    it("Scenario M: 35°C, AQI 30, Heat: Strong, outdoor-work, 120m => very-high", () => {
      const profile: SensitivityProfile = { respiratory: "not-affected", heat: "strong", hayFever: "not-affected" };
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 30, apparentTemperatureC: 35, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: profile, activity: "outdoor-work", durationMinutes: 120 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("very-high");
    });

    it("Scenario N: 39°C, AQI 30, None, walking, 30m => very-high", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 30, apparentTemperatureC: 39, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("very-high");
    });

    it("Scenario O: UV 9, 22°C, AQI 30, None, walking, 30m => elevated (UV protection high, overall elevated)", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 30, apparentTemperatureC: 22, uvIndex: 9 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("elevated");
      expect(result.v2Result!.primaryDomains).toEqual(["uv"]);

      const uvAss = result.domainAssessments!.find((a) => a.domain === "uv")!;
      expect(uvAss.protectionSeverity).toBe("high");
      expect(uvAss.overallRiskContribution).toBe("elevated");
      expect(uvAss.effectiveSeverity).toBe("elevated");
    });

    it("Scenario P: Missing AQI => unable", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: undefined, pm10UsAqi: undefined },
        },
        input: defaultInput,
        referenceTime: refTime,
      });

      expect(result.level).toBe("unable");
    });

    it("Scenario Q: AQI 170, 35°C, None, walking, 30m => very-high (2 objective high base domains)", () => {
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 170, apparentTemperatureC: 35, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: [], activity: "walking", durationMinutes: 30 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("very-high");
      expect(result.v2Result!.primaryDomains).toContain("particulate");
      expect(result.v2Result!.primaryDomains).toContain("thermal");
    });

    it("Scenario R: AQI 70, 20°C, Resp: Strong, walking, 60m => elevated (moderate exposure)", () => {
      const profile: SensitivityProfile = { respiratory: "strong", heat: "not-affected", hayFever: "not-affected" };
      const result = evaluatePersonalisedRisk({
        snapshot: {
          ...validSnapshot,
          current: { ...validSnapshot.current!, pm25UsAqi: 70, apparentTemperatureC: 20, uvIndex: 2 },
        },
        input: { location: "Perth", sensitivities: profile, activity: "walking", durationMinutes: 60 },
        referenceTime: refTime,
      });

      expect(result.level).toBe("elevated");
      expect(result.level).not.toBe("high");
    });
  });
});
