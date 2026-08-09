import { describe, it, expect } from "vitest";
import { formatLocationLabel } from "../location-label";

describe("Location Label Formatting", () => {
  it("uses displayName when provided", () => {
    const label = formatLocationLabel({ displayName: "East Perth, Western Australia" });
    expect(label).toBe("East Perth, Western Australia");
  });

  it("constructs displayName when name and country are present", () => {
    const label = formatLocationLabel({ name: "Perth", country: "Australia", admin1: "Western Australia" });
    expect(label).toBe("Perth, Western Australia, Australia");
  });

  it("uses fallbackLabel when details are empty or null", () => {
    expect(formatLocationLabel(null)).toBe("Current location");
    expect(formatLocationLabel({}, "Location near Perth")).toBe("Location near Perth");
  });
});
