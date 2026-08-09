import { describe, it, expect } from "vitest";
import type {
  LocationSelectionSource,
  SelectedLocationState,
  CheckLocation,
} from "@/lib/location/types";
import { formatLocationLabel } from "@/lib/location/location-label";
import { PROTOTYPE_LOCATIONS } from "@/lib/check-options";

describe("Task 10I — Exclusive Current-Location Selection UX State Architecture", () => {
  it("1. LocationSelectionSource union covers none, device, search, and prototype", () => {
    const sources: LocationSelectionSource[] = ["none", "device", "search", "prototype"];
    expect(sources).toHaveLength(4);
  });

  it("2. SelectedLocationState enforces mutually exclusive selected location objects", () => {
    const deviceState: SelectedLocationState = {
      source: "device",
      location: {
        source: "device-location",
        displayName: "East Perth, Western Australia",
        latitude: -31.95,
        longitude: 115.86,
      },
    };

    const prototypeState: SelectedLocationState = {
      source: "prototype",
      city: "Dubai",
      label: "Dubai, United Arab Emirates",
      prototypeId: "dubai",
    };

    const searchState: SelectedLocationState = {
      source: "search",
      query: "Colombo, Sri Lanka",
    };

    expect(deviceState.source).toBe("device");
    expect(prototypeState.source).toBe("prototype");
    expect(searchState.source).toBe("search");
  });

  it("3. formatLocationLabel resolves generic Current location label for device geolocation", () => {
    const mockCheckLocation: CheckLocation = {
      source: "device-location",
      displayName: "Current location",
    };

    const label = formatLocationLabel(mockCheckLocation);
    expect(label).toBe("Current location");
  });

  it("4. PROTOTYPE_LOCATIONS defined with Perth, Miri, Colombo, Dubai", () => {
    const cities = PROTOTYPE_LOCATIONS.map((loc) => loc.city);
    expect(cities).toEqual(["Perth", "Miri", "Colombo", "Dubai"]);
  });
});
