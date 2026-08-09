"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  isValidCoordinates,
} from "@/lib/location/google-maps-loader";

export interface LocalContextMapProps {
  latitude: number;
  longitude: number;
  displayName: string;
}

export type LocalMapStatus = "loading" | "ready" | "unavailable" | "error";

export function LocalContextMap({
  latitude,
  longitude,
  displayName,
}: LocalContextMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    setCenter: (latLng: { lat: number; lng: number }) => void;
  } | null>(null);
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCAL_CONTEXT_MAP === "true";
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const validCoords = isValidCoordinates(latitude, longitude);

  const initialStatus: LocalMapStatus =
    !isEnabled || !apiKey || !validCoords ? "unavailable" : "loading";
  const [status, setStatus] = useState<LocalMapStatus>(initialStatus);

  useEffect(() => {
    if (!isEnabled || !apiKey || !validCoords) {
      if (process.env.NODE_ENV === "development") {
        if (!isEnabled) {
          console.log("[LocalContextMap] Feature disabled.");
        } else if (!apiKey) {
          console.log("[LocalContextMap] Missing API key.");
        } else if (!validCoords) {
          console.log("[LocalContextMap] Invalid coordinates.");
        }
      }
      return;
    }

    let cancelled = false;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
      } catch (centerErr) {
        if (process.env.NODE_ENV === "development") {
          console.error("[LocalContextMap] Updating map center failed.", centerErr);
        }
      }
      return;
    }

    setStatus("loading");

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !mapContainerRef.current) return;

        try {
          const center = { lat: latitude, lng: longitude };
          const GoogleMap = google.maps?.Map;

          if (!GoogleMap) {
            if (process.env.NODE_ENV === "development") {
              console.error("[LocalContextMap] Map constructor unavailable.");
            }
            if (!cancelled) setStatus("error");
            return;
          }

          const map = new GoogleMap(mapContainerRef.current, {
            center,
            zoom: 14,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "cooperative",
          });

          mapInstanceRef.current = map;

          if (!cancelled) {
            setStatus("ready");
            if (process.env.NODE_ENV === "development") {
              console.log("[LocalContextMap] Map initialised.");
            }
          }

          // Marker creation (non-fatal)
          try {
            const GoogleMarker = google.maps?.Marker;
            if (GoogleMarker) {
              new GoogleMarker({
                position: center,
                map,
                title: displayName,
              });
            }
          } catch (markerErr) {
            if (process.env.NODE_ENV === "development") {
              console.error("[LocalContextMap] Marker creation failed.", markerErr);
            }
          }
        } catch (mapErr) {
          if (process.env.NODE_ENV === "development") {
            console.error("[LocalContextMap] Map initialisation failed.", mapErr);
          }
          if (!cancelled) setStatus("error");
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[LocalContextMap] Map script load failed.", err);
        }
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isEnabled, apiKey, validCoords, latitude, longitude, displayName]);

  if (!isEnabled || !apiKey) {
    return null;
  }

  if (!validCoords || status === "error") {
    return (
      <div className="p-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
        Map preview is unavailable. The selected location is still being used for this check.
      </div>
    );
  }

  return (
    <div className="relative w-full h-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden">
      <div
        ref={mapContainerRef}
        aria-label={`Map showing location ${displayName}`}
        className="w-full h-full"
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs text-xs text-slate-500 dark:text-slate-400 font-medium">
          Loading map preview…
        </div>
      )}
    </div>
  );
}
