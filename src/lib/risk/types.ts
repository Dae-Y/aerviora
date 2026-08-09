import type { OutdoorCheckInput, ActivityOption } from "@/lib/check-options";

export type OutlookAvailability =
  | "personalised"
  | "weather-only"
  | "temporarily-unavailable";

export type EnvironmentalSignalKey =
  | "airTemperatureC"
  | "apparentTemperatureC"
  | "relativeHumidityPercent"
  | "windSpeedKph"
  | "uvIndex"
  | "pm25UgM3"
  | "pm10UgM3"
  | "pollenLevel"
  | "dustLevel"
  | "dustUgM3"
  | "pm25UsAqi"
  | "pm10UsAqi";

export type EnvironmentalLevel =
  | "none"
  | "low"
  | "moderate"
  | "high"
  | "very-high"
  | "unknown";

export interface CurrentEnvironmentalSample {
  observedAt: string;
  airTemperatureC?: number;
  apparentTemperatureC?: number;
  relativeHumidityPercent?: number;
  windSpeedKph?: number;
  uvIndex?: number;
  pm25UgM3?: number;
  pm10UgM3?: number;
  pollenLevel?: EnvironmentalLevel;
  dustLevel?: EnvironmentalLevel;
  dustUgM3?: number;
  pm25UsAqi?: number;
  pm10UsAqi?: number;
}

export interface ForecastEnvironmentalSample {
  validAt: string;
  airTemperatureC?: number;
  apparentTemperatureC?: number;
  relativeHumidityPercent?: number;
  windSpeedKph?: number;
  uvIndex?: number;
  pm25UgM3?: number;
  pm10UgM3?: number;
  pollenLevel?: EnvironmentalLevel;
  dustLevel?: EnvironmentalLevel;
  dustUgM3?: number;
  pm25UsAqi?: number;
  pm10UsAqi?: number;
}

export type EnvironmentalSourceKind =
  | "weather"
  | "air-quality"
  | "pollen"
  | "dust"
  | "official-alert";

export type EnvironmentalSourceStatus =
  | "available"
  | "unavailable"
  | "error";

export interface EnvironmentalSource {
  kind: EnvironmentalSourceKind;
  provider: string;
  status: EnvironmentalSourceStatus;
  observedAt?: string;
  fetchedAt?: string;
  generatedAt?: string;
}

export interface EnvironmentalSnapshot {
  requestedLocation: string;
  resolvedLocation?: string;
  current?: CurrentEnvironmentalSample;
  hourly: ForecastEnvironmentalSample[];
  sources: EnvironmentalSource[];
}

export type TimestampFreshnessStatus =
  | "fresh"
  | "stale"
  | "future"
  | "invalid";

export interface TimestampFreshnessResult {
  status: TimestampFreshnessStatus;
  ageMinutes: number | null;
}

export interface DataFreshnessPolicy {
  maximumCurrentAgeMinutes: number;
  maximumForecastAgeMinutes: number;
  futureToleranceMinutes: number;
}

export const PROTOTYPE_DATA_FRESHNESS_POLICY: DataFreshnessPolicy = {
  maximumCurrentAgeMinutes: 180,
  maximumForecastAgeMinutes: 360,
  futureToleranceMinutes: 15,
};

export const CORE_SIGNALS: readonly EnvironmentalSignalKey[] = [
  "apparentTemperatureC",
  "relativeHumidityPercent",
  "pm25UgM3",
  "pm10UgM3",
] as const;

export const SIGNAL_SOURCE_KINDS: Record<
  EnvironmentalSignalKey,
  readonly EnvironmentalSourceKind[]
> = {
  airTemperatureC: ["weather"],
  apparentTemperatureC: ["weather"],
  relativeHumidityPercent: ["weather"],
  windSpeedKph: ["weather"],
  uvIndex: ["weather", "air-quality"],
  pm25UgM3: ["air-quality"],
  pm10UgM3: ["air-quality"],
  pollenLevel: ["pollen"],
  dustLevel: ["dust", "air-quality"],
  dustUgM3: ["air-quality", "dust"],
  pm25UsAqi: ["air-quality"],
  pm10UsAqi: ["air-quality"],
} as const;

export type ValidationSeverity = "error" | "warning";

export type EnvironmentalValidationIssueCode =
  | "invalid-timestamp"
  | "not-finite"
  | "out-of-range"
  | "negative-value";

export interface EnvironmentalValidationIssue {
  code: EnvironmentalValidationIssueCode;
  field: keyof CurrentEnvironmentalSample | keyof ForecastEnvironmentalSample;
  severity: ValidationSeverity;
  message: string;
}

export interface EnvironmentalValidationResult {
  isValid: boolean;
  issues: EnvironmentalValidationIssue[];
}

export type DataReadinessStatus = "ready" | "partial" | "insufficient";

export type DataReadinessIssueCode =
  | "missing-current-sample"
  | "invalid-current-timestamp"
  | "future-current-timestamp"
  | "stale-current-timestamp"
  | "missing-core-signal"
  | "invalid-core-signal"
  | "missing-contextual-signal"
  | "invalid-contextual-signal"
  | "stale-source"
  | "unavailable-source"
  | "error-source";

export interface DataReadinessIssue {
  code: DataReadinessIssueCode;
  signal?: EnvironmentalSignalKey;
  sourceKind?: EnvironmentalSourceKind;
  message: string;
}

export interface DataReadinessResult {
  status: DataReadinessStatus;
  relevantSignals: EnvironmentalSignalKey[];
  availableSignals: EnvironmentalSignalKey[];
  missingSignals: EnvironmentalSignalKey[];
  invalidSignals: EnvironmentalSignalKey[];
  staleSources: EnvironmentalSourceKind[];
  issues: DataReadinessIssue[];
}

/* Personalised Risk Engine Domain Contracts (Task 6 & Task 10C v2) */

export type EnvironmentalDomain = "particulate" | "thermal" | "uv";

export type DomainSeverity =
  | "lower"
  | "elevated"
  | "high"
  | "severe";

export type ParticulateBaseBand =
  | "lower"
  | "moderate-context"
  | "upper-elevated"
  | "high"
  | "severe";

export type SensitivityIntensity =
  | "not-affected"
  | "slight"
  | "moderate"
  | "strong";

export type ExposureDemand = "low" | "moderate" | "high";

export interface SensitivityProfile {
  respiratory: SensitivityIntensity;
  heat: SensitivityIntensity;
  hayFever: SensitivityIntensity;
}

export type LegacySensitivityOption = "respiratory" | "heat" | "hay-fever";

export type SensitivityInput =
  | LegacySensitivityOption[]
  | SensitivityProfile;

export interface DomainAssessment {
  domain: EnvironmentalDomain;
  baseSeverity: DomainSeverity;
  particulateBaseBand?: ParticulateBaseBand;
  effectiveSeverity: DomainSeverity;

  protectionSeverity?: "lower" | "elevated" | "high";
  overallRiskContribution?: "lower" | "elevated";

  susceptibility: SensitivityIntensity;
  exposureDemand: ExposureDemand;

  adjustmentApplied: boolean;
  upliftReason: string | null;
  capApplied: string | null;
}

export interface AggregatedRiskResult {
  level: PersonalisedRiskLevel;
  primaryDomains: EnvironmentalDomain[];
}

export type PersonalisedRiskLevel =
  | "lower"
  | "elevated"
  | "high"
  | "very-high"
  | "unable";

export type PersonalisedRiskAction =
  | "proceed-awareness"
  | "consider-small-adjustments"
  | "delay-shorten-reduce"
  | "postpone"
  | "review-information";

export type PersonalisedActionKey = PersonalisedRiskAction;

export interface PersonalisedActionRecommendation {
  key: PersonalisedActionKey;
  title: string;
  explanation: string;
}

export type InputConfidence = "high" | "moderate" | "low";

export type RiskDriverCategory =
  | "environment"
  | "sensitivity"
  | "exposure"
  | "protection"
  | "context"
  | "data-quality";

export interface RiskDriver {
  key: string;
  category: RiskDriverCategory;
  label: string;
  explanation: string;
  direction: "increases-risk" | "context";
  severity?: "minor" | "moderate" | "major";
}

export interface AppliedRiskModifiers {
  respiratorySensitivityActive: boolean;
  heatSensitivityActive: boolean;
  hayFeverSensitivityActive: boolean;
  highEffortActivityActive: boolean;
  longDurationActive: boolean;
}

export interface OutdoorCheckInputV2 {
  location: string;
  sensitivities: SensitivityInput;
  activity: ActivityOption | null;
  durationMinutes: number | null;
}

export interface PersonalisedRiskInput {
  snapshot: EnvironmentalSnapshot;
  input: OutdoorCheckInput | OutdoorCheckInputV2;
  referenceTime: string;
}

export interface PersonalisedRiskResult {
  level: PersonalisedRiskLevel;
  action: PersonalisedRiskAction;
  recommendation: PersonalisedActionRecommendation;
  confidence: InputConfidence;
  drivers: RiskDriver[];
  limitations: string[];
  evaluatedAt: string | null;
  domainAssessments?: DomainAssessment[];
  v2Result?: AggregatedRiskResult;
}

export type EnvironmentalRiskBand = PersonalisedRiskLevel;
export type GuidanceAction = PersonalisedRiskAction;
export type RiskReasonCode = string;

/* Task 7 Forecast Window Domain Types */

export type CalculableRiskLevel = Exclude<PersonalisedRiskLevel, "unable">;

export type MetricChange =
  | "decreased"
  | "increased"
  | "unchanged"
  | "unavailable";

export interface EnvironmentalMetricComparison {
  key:
    | "airTemperatureC"
    | "apparentTemperatureC"
    | "relativeHumidityPercent"
    | "windSpeedKph"
    | "pm25UgM3"
    | "pm10UgM3"
    | "dustUgM3"
    | "uvIndex";
  currentValue: number | null;
  forecastValue: number | null;
  change: MetricChange;
}

export interface ForecastRiskPoint {
  startAt: string;
  result: PersonalisedRiskResult;
  conditions: ForecastEnvironmentalSample;
}

export interface LowerRiskWindow {
  startAt: string;
  endAt: string;
  windowLevel: CalculableRiskLevel;
  confidence: InputConfidence;
  includedPointCount: number;
  representativeConditions: ForecastEnvironmentalSample;
  forecastRiskPoints: ForecastRiskPoint[];
  improvedDriverKeys: string[];
  comparisons: EnvironmentalMetricComparison[];
  explanations: string[];
  isBriefPeriod: boolean;
  relativeRiskNote?: string;
}

export type LowerRiskWindowResolution =
  | {
      status: "found";
      startAt: string;
      endAt: string;
      currentLevel: CalculableRiskLevel;
      windowLevel: CalculableRiskLevel;
      confidence: InputConfidence;
      includedPointCount: number;
      currentConditions: CurrentEnvironmentalSample;
      representativeConditions: ForecastEnvironmentalSample;
      forecastRiskPoints: ForecastRiskPoint[];
      improvedDriverKeys: string[];
      comparisons: EnvironmentalMetricComparison[];
      explanations: string[];
      isBriefPeriod: boolean;
      relativeRiskNote?: string;
      windows: LowerRiskWindow[];
      referenceTime?: string;
    }
  | {
      status: "not-found";
      reason: "current-already-lower" | "no-meaningful-improvement";
      evaluatedCandidateCount: number;
      referenceTime?: string;
    }
  | {
      status: "unable";
      reason:
        | "current-result-unavailable"
        | "forecast-unavailable"
        | "insufficient-forecast-data"
        | "no-complete-duration-window"
        | "invalid-timezone"
        | "unsupported-duration";
      referenceTime?: string;
    };
