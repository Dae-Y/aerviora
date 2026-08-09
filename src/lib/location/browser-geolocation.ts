import type { CheckLocation, BrowserLocationStatus } from "./types";

export interface GeolocationResult {
  status: BrowserLocationStatus;
  location?: CheckLocation;
  errorReason?: string;
}

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 5 * 60 * 1000,
};

export function requestBrowserLocation(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({
        status: "unavailable",
        errorReason: "Browser geolocation API is not available.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          status: "resolved",
          location: {
            source: "device-location",
            latitude,
            longitude,
            accuracyMetres: accuracy,
            displayName: "Current location",
          },
        });
      },
      (error) => {
        let status: BrowserLocationStatus = "error";
        if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
          status = "denied";
        } else if (error.code === 2 || error.code === error.POSITION_UNAVAILABLE) {
          status = "unavailable";
        } else if (error.code === 3 || error.code === error.TIMEOUT) {
          status = "timed-out";
        }

        resolve({
          status,
          errorReason: error.message || "Could not determine location.",
        });
      },
      GEOLOCATION_OPTIONS
    );
  });
}
