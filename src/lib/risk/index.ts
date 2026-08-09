export type {
  EnvironmentalSignalKey,
  EnvironmentalLevel,
  CurrentEnvironmentalSample,
  ForecastEnvironmentalSample,
  EnvironmentalSourceKind,
  EnvironmentalSourceStatus,
  EnvironmentalSource,
  EnvironmentalSnapshot,
  TimestampFreshnessStatus,
  TimestampFreshnessResult,
  DataFreshnessPolicy,
  ValidationSeverity,
  EnvironmentalValidationIssueCode,
  EnvironmentalValidationIssue,
  EnvironmentalValidationResult,
  DataReadinessStatus,
  DataReadinessIssueCode,
  DataReadinessIssue,
  DataReadinessResult,
  EnvironmentalRiskBand,
  GuidanceAction,
  RiskReasonCode,
  PersonalisedRiskLevel,
  PersonalisedRiskAction,
  PersonalisedActionKey,
  PersonalisedActionRecommendation,
  InputConfidence,
  RiskDriverCategory,
  RiskDriver,
  PersonalisedRiskInput,
  PersonalisedRiskResult,
  CalculableRiskLevel,
  MetricChange,
  EnvironmentalMetricComparison,
  ForecastRiskPoint,
  LowerRiskWindowResolution,
} from "./types";

export {
  CORE_SIGNALS,
  SIGNAL_SOURCE_KINDS,
  PROTOTYPE_DATA_FRESHNESS_POLICY,
} from "./types";

export { getRelevantSignals } from "./signals";
export { validateEnvironmentalSample } from "./validation";
export {
  isValidTimestamp,
  getAgeMinutes,
  evaluateTimestampFreshness,
} from "./freshness";
export {
  assessDataReadiness,
  type AssessDataReadinessParams,
} from "./data-readiness";
export { evaluatePersonalisedRisk } from "./engine";
export {
  evaluateHourlyForecastPoint,
  compareEnvironmentalMetrics,
  getImprovedDriverKeys,
  resolveLowerRiskWindow,
} from "./forecast-window";
export {
  getRiskCopyPresentation,
  RISK_LEVEL_DISPLAY_LABELS,
  RISK_COPY_BY_LEVEL,
  ELEVATED_RECOMMENDATIONS,
  LOWER_RECOMMENDATION,
  HIGH_RECOMMENDATION,
  VERY_HIGH_RECOMMENDATION,
  UNABLE_RECOMMENDATION,
  ACTION_LABELS,
  CONFIDENCE_LABELS,
  CONFIDENCE_EXPLANATION,
  getActionLabel,
  getDriverCopy,
  resolveElevatedCopyContext,
  resolvePersonalisedAction,
  buildRiskDrivers,
  buildRiskLimitations,
  type RiskCopyPresentation,
  type RiskPresentationContext,
  type ElevatedCopyContext,
} from "./copy";
