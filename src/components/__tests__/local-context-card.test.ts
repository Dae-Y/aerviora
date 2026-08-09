import { describe, it, expect } from "vitest";
import { formatLocationLabel } from "@/lib/location/location-label";

describe("Local Context Card Helper Tests", () => {
  it("formats location display name correctly for device location card", () => {
    const label = formatLocationLabel({
      name: "East Perth",
      country: "Australia",
      admin1: "Western Australia",
    });
    expect(label).toBe("East Perth, Western Australia, Australia");
  });

  it("uses fallback 'Current location' when reverse geocoding is unavailable", () => {
    const label = formatLocationLabel(null);
    expect(label).toBe("Current location");
  });
});
