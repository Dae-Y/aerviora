declare global {
  interface Window {
    google?: {
      maps?: {
        Map: new (
          element: HTMLElement,
          options: unknown
        ) => {
          setCenter: (latLng: { lat: number; lng: number }) => void;
        };
        Marker: new (options: unknown) => unknown;
      };
    };
    __aervioraInitGoogleMaps?: () => void;
  }
}

export type GoogleMapsAPI = NonNullable<Window["google"]>;

let googleMapsPromise: Promise<GoogleMapsAPI> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsAPI> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is undefined."));
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google as GoogleMapsAPI);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise<GoogleMapsAPI>((resolve, reject) => {
    if (window.google?.maps?.Map) {
      resolve(window.google as GoogleMapsAPI);
      return;
    }

    const scriptId = "google-maps-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const checkReady = (): boolean => {
      if (window.google?.maps?.Map) {
        resolve(window.google as GoogleMapsAPI);
        return true;
      }
      return false;
    };

    window.__aervioraInitGoogleMaps = () => {
      if (!checkReady()) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (checkReady() || attempts > 20) {
            clearInterval(interval);
            if (!window.google?.maps?.Map) {
              googleMapsPromise = null;
              reject(new Error("Google Maps Map constructor unavailable."));
            }
          }
        }, 50);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&loading=async&callback=__aervioraInitGoogleMaps`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        googleMapsPromise = null;
        reject(new Error("Failed to load Google Maps script."));
      };

      document.head.appendChild(script);
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (checkReady()) {
          clearInterval(interval);
        } else if (attempts > 40) {
          clearInterval(interval);
          googleMapsPromise = null;
          reject(new Error("Timeout waiting for Google Maps API to initialize."));
        }
      }, 100);
    }
  });

  return googleMapsPromise;
}

export function resetGoogleMapsLoaderForTesting(): void {
  googleMapsPromise = null;
}

export function isValidCoordinates(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
