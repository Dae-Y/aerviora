import { describe, it, expect } from "vitest";
import {
  resolveOutlookAvailability,
  canUseAsBestAvailable,
  getAvailabilityCopy,
} from "../outlook-availability";
import type { PersonalisedRiskResult } from "../types";
import type { OutlookTimeBlock } from "../personalised-outlook";

describe("Outlook Availability Resolver & Invariants", () => {
  it("Task 10H.14: resolves 'personalised' when completed result exists and level !== unable", () => {
    const mockResult: PersonalisedRiskResult = {
      level: "very-high",
      action: "postpone",
      recommendation: { key: "postpone", title: "Very High Risk", explanation: "Explanation" },
      confidence: "high",
      drivers: [],
      limitations: [],
      evaluatedAt: "2026-08-06T10:00:00.000Z",
      v2Result: { level: "very-high", primaryDomains: ["thermal"] },
    };

    const status = resolveOutlookAvailability({
      result: mockResult,
      weatherAvailable: true,
      requiredInputsAvailable: true,
    });
    expect(status).toBe("personalised");
  });

  it("Task 10H.14: resolves 'weather-only' when weather forecast exists but required AQ inputs are missing", () => {
    const unableResult: PersonalisedRiskResult = {
      level: "unable",
      action: "review-information",
      recommendation: { key: "review-information", title: "Guidance Unavailable", explanation: "Data missing." },
      confidence: "low",
      drivers: [],
      limitations: [],
      evaluatedAt: "2026-08-06T10:00:00.000Z",
      v2Result: { level: "unable", primaryDomains: [] },
    };

    const status = resolveOutlookAvailability({
      result: unableResult,
      weatherAvailable: true,
      requiredInputsAvailable: false,
    });
    expect(status).toBe("weather-only");
  });

  it("Task 10H.14: resolves 'temporarily-unavailable' when provider fails and no weather exists", () => {
    const status = resolveOutlookAvailability({
      result: null,
      weatherAvailable: false,
      requiredInputsAvailable: false,
      providerFailed: true,
    });
    expect(status).toBe("temporarily-unavailable");
  });

  it("Task 10H.14: strictly requires availability === 'personalised' for canUseAsBestAvailable", () => {
    const personalisedBlock = {
      id: "b1",
      level: "lower",
      availability: "personalised",
      representativePoint: {
        startAt: "2026-08-06T10:00:00.000Z",
        result: { level: "lower" },
      },
    } as unknown as OutlookTimeBlock;

    const weatherOnlyBlock = {
      id: "b2",
      level: "unable",
      availability: "weather-only",
      representativePoint: {
        startAt: "2026-08-06T11:00:00.000Z",
        result: { level: "unable" },
      },
    } as unknown as OutlookTimeBlock;

    expect(canUseAsBestAvailable(personalisedBlock)).toBe(true);
    expect(canUseAsBestAvailable(weatherOnlyBlock)).toBe(false);
    expect(canUseAsBestAvailable(null)).toBe(false);
  });

  it("Task 10H.14: provides correct standardized copy for each state", () => {
    const persCopy = getAvailabilityCopy("personalised");
    expect(persCopy.title).toBe("Complete personalised guidance");

    const weatherCopy = getAvailabilityCopy("weather-only");
    expect(weatherCopy.badgeText).toBe("Weather outlook only");
    expect(weatherCopy.supportingText).toContain("may become available closer to the date");

    const tempCopy = getAvailabilityCopy("temporarily-unavailable");
    expect(tempCopy.title).toBe("Personalised outlook temporarily unavailable");
  });
});
