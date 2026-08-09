export type LocationSource = "manual-search" | "device-location";

export type LocationSelectionSource =
  | "none"
  | "device"
  | "search"
  | "prototype";

export type SelectedLocationState =
  | { source: "none" }
  | { source: "device"; location: CheckLocation }
  | { source: "prototype"; city: string; label: string; prototypeId: string }
  | { source: "search"; query: string };

export type BrowserLocationStatus =
  | "idle"
  | "requesting"
  | "resolved"
  | "denied"
  | "unavailable"
  | "timed-out"
  | "error";

export interface CheckLocation {
  source: LocationSource;
  latitude?: number;
  longitude?: number;
  displayName: string;
  locality?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  accuracyMetres?: number;
}
