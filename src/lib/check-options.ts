import type { SensitivityProfile, SensitivityIntensity } from "@/lib/risk/types";

export type SensitivityOption = "respiratory" | "hay-fever" | "heat";

export type ActivityOption =
  | "walking"
  | "commuting"
  | "exercise"
  | "outdoor-work"
  | "errands";

export type FlowScreen =
  | "location"
  | "sensitivities"
  | "activity"
  | "review"
  | "completion"
  | "environment-loading"
  | "environment-success"
  | "environment-error";

export interface OutdoorCheckInput {
  location: string;
  sensitivities: SensitivityProfile;
  activity: ActivityOption | null;
  durationMinutes: number | null;
}

export type PrototypeLocationId = "perth" | "miri" | "colombo" | "dubai";

export interface PrototypeLocation {
  id: PrototypeLocationId;
  city: string;
  country: string;
  countryCode: "AU" | "MY" | "LK" | "AE";
  countryLabel: string;
  campus: string;
}

export const DEFAULT_SENSITIVITY_PROFILE: SensitivityProfile = {
  respiratory: "not-affected",
  hayFever: "not-affected",
  heat: "not-affected",
};

export interface SensitivityIntensityOption {
  value: SensitivityIntensity;
  label: string;
}

export const SENSITIVITY_INTENSITY_OPTIONS: readonly SensitivityIntensityOption[] = [
  { value: "not-affected", label: "Not affected" },
  { value: "slight", label: "Slightly" },
  { value: "moderate", label: "Moderately" },
  { value: "strong", label: "Strongly" },
] as const;

export type SensitivityCategoryKey = "respiratory" | "hayFever" | "heat";

export interface SensitivityCategoryDefinition {
  key: SensitivityCategoryKey;
  title: string;
  description: string;
  example: string;
  note?: string;
}

export const SENSITIVITY_CATEGORIES: readonly SensitivityCategoryDefinition[] = [
  {
    key: "respiratory",
    title: "Air pollution, dust or smoke",
    description: "How strongly do air pollution, dust or smoke usually affect you?",
    example: "For example: coughing, wheezing, chest tightness, or irritation from smoke or dust.",
  },
  {
    key: "hayFever",
    title: "Seasonal pollen",
    description: "How strongly does seasonal pollen usually affect you?",
    example: "For example: hay fever, sneezing, a runny nose, or itchy eyes.",
    note: "Live pollen data is not yet included. Your selection is recorded for context only in the current prototype.",
  },
  {
    key: "heat",
    title: "Heat",
    description: "How strongly does hot weather usually affect your comfort or outdoor plans?",
    example: "For example: overheating, fatigue, or discomfort in hot weather.",
  },
] as const;

export interface ActivityDefinition {
  id: ActivityOption;
  title: string;
  description: string;
}

export const PROTOTYPE_LOCATIONS: readonly PrototypeLocation[] = [
  {
    id: "perth",
    city: "Perth",
    country: "Australia",
    countryCode: "AU",
    countryLabel: "Australia",
    campus: "Curtin University Bentley",
  },
  {
    id: "miri",
    city: "Miri",
    country: "Malaysia",
    countryCode: "MY",
    countryLabel: "Malaysia",
    campus: "Curtin University Malaysia",
  },
  {
    id: "colombo",
    city: "Colombo",
    country: "Sri Lanka",
    countryCode: "LK",
    countryLabel: "Sri Lanka",
    campus: "Curtin University Colombo",
  },
  {
    id: "dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    countryLabel: "UAE",
    campus: "Curtin University Dubai",
  },
];

export function isMatchingPrototypeCity(
  cityInput: string,
  targetCity: string
): boolean {
  return cityInput.trim().toLowerCase() === targetCity.trim().toLowerCase();
}

export const ACTIVITY_OPTIONS: readonly ActivityDefinition[] = [
  {
    id: "walking",
    title: "Walking",
    description: "A walk or light outdoor movement",
  },
  {
    id: "commuting",
    title: "Commuting",
    description: "Travel to work, study or another destination",
  },
  {
    id: "exercise",
    title: "Exercise",
    description: "Running, sport or higher-effort activity",
  },
  {
    id: "outdoor-work",
    title: "Outdoor work",
    description: "Work performed primarily outside",
  },
  {
    id: "errands",
    title: "Errands",
    description: "Shopping or short outdoor tasks",
  },
];

export function getSensitivityIntensityLabel(value: SensitivityIntensity): string {
  const match = SENSITIVITY_INTENSITY_OPTIONS.find((opt) => opt.value === value);
  return match ? match.label : value;
}

export function getActivityTitle(id: ActivityOption): string {
  const match = ACTIVITY_OPTIONS.find((opt) => opt.id === id);
  return match ? match.title : id;
}
