import { describe, it, expect } from "vitest";
import { isValidCoordinates } from "@/lib/location/google-maps-loader";

describe("LocalContextMap Component Contract & Validation", () => {
  it("strictly validates input coordinates before component initialisation", () => {
    expect(isValidCoordinates(-31.9535, 115.857)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90.1, 180)).toBe(false);
    expect(isValidCoordinates(-90, -180.1)).toBe(false);
    expect(isValidCoordinates("perth", 115.857)).toBe(false);
    expect(isValidCoordinates(null, undefined)).toBe(false);
  });
});
