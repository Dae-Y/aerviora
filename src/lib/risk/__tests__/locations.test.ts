import { describe, it, expect } from "vitest";
import {
  PROTOTYPE_LOCATIONS,
  isMatchingPrototypeCity,
} from "@/lib/check-options";

describe("ASPIRE Campus Cities Location Presets", () => {
  it("contains exactly four campus city presets", () => {
    expect(PROTOTYPE_LOCATIONS).toHaveLength(4);
  });

  it("has unique location IDs", () => {
    const ids = PROTOTYPE_LOCATIONS.map((loc) => loc.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(4);
  });

  it("has canonical cities Perth, Miri, Colombo, and Dubai", () => {
    const cities = PROTOTYPE_LOCATIONS.map((loc) => loc.city);
    expect(cities).toEqual(["Perth", "Miri", "Colombo", "Dubai"]);
  });

  it("assigns correct country, countryCode, and campus to every preset", () => {
    const perth = PROTOTYPE_LOCATIONS.find((loc) => loc.id === "perth");
    expect(perth).toEqual({
      id: "perth",
      city: "Perth",
      country: "Australia",
      countryCode: "AU",
      countryLabel: "Australia",
      campus: "Curtin University Bentley",
    });

    const miri = PROTOTYPE_LOCATIONS.find((loc) => loc.id === "miri");
    expect(miri).toEqual({
      id: "miri",
      city: "Miri",
      country: "Malaysia",
      countryCode: "MY",
      countryLabel: "Malaysia",
      campus: "Curtin University Malaysia",
    });

    const colombo = PROTOTYPE_LOCATIONS.find((loc) => loc.id === "colombo");
    expect(colombo).toEqual({
      id: "colombo",
      city: "Colombo",
      country: "Sri Lanka",
      countryCode: "LK",
      countryLabel: "Sri Lanka",
      campus: "Curtin University Colombo",
    });

    const dubai = PROTOTYPE_LOCATIONS.find((loc) => loc.id === "dubai");
    expect(dubai).toEqual({
      id: "dubai",
      city: "Dubai",
      country: "United Arab Emirates",
      countryCode: "AE",
      countryLabel: "UAE",
      campus: "Curtin University Dubai",
    });
  });

  it("matches prototype cities in a case-insensitive and trimmed manner", () => {
    expect(isMatchingPrototypeCity("perth", "Perth")).toBe(true);
    expect(isMatchingPrototypeCity(" PERTH  ", "Perth")).toBe(true);
    expect(isMatchingPrototypeCity("Miri", "Miri")).toBe(true);
    expect(isMatchingPrototypeCity("colombo", "Colombo")).toBe(true);
    expect(isMatchingPrototypeCity("dubai ", "Dubai")).toBe(true);

    expect(isMatchingPrototypeCity("Sydney", "Perth")).toBe(false);
  });
});
