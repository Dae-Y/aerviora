export type PreparationItemId =
  | "sunscreen"
  | "water"
  | "sunglasses"
  | "protective-mask"
  | "sun-shade"
  | "breathable-clothing";

export type PreparationIconKey =
  | "sun"
  | "droplets"
  | "glasses"
  | "shield"
  | "sun-shade"
  | "shirt";

export interface PreparationSuggestion {
  id: PreparationItemId;
  label: string;
  reason: string;
  iconKey: PreparationIconKey;
  priority: number;
}
