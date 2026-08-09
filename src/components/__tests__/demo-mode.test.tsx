import { describe, it, expect } from "vitest";
import { getDemoEnvironmentalForecast, type DemoScenarioId } from "@/lib/demo/environmental-scenarios";
import { validateEnvironmentRequest } from "@/lib/environment-api";
import { evaluatePersonalisedRisk } from "@/lib/risk/engine";
import type { OutdoorCheckInput } from "@/lib/check-options";

describe("Demo Scenario Architecture & Validation Integration", () => {
  const dummyInput: OutdoorCheckInput = {
    location: "Dubai, United Arab Emirates",
    sensitivities: {
      respiratory: "not-affected",
      heat: "not-affected",
      hayFever: "not-affected",
    },
    activity: "walking",
    durationMinutes: 30,
  };

  it("1. validateEnvironmentRequest allows demoScenarioId when valid and rejects unknown scenarios", () => {
    const validReq = validateEnvironmentRequest({
      location: "Dubai, UAE",
      demoScenarioId: "improving-day",
    });
    expect(validReq.isValid).toBe(true);
    expect(validReq.request?.demoScenarioId).toBe("improving-day");

    const invalidReq = validateEnvironmentRequest({
      location: "Dubai, UAE",
      demoScenarioId: "invalid-scenario-id",
    });
    expect(invalidReq.isValid).toBe(false);
    expect(invalidReq.errorReason).toBe("Invalid 'demoScenarioId' supplied");
  });

  it("2. getDemoEnvironmentalForecast returns canonical EnvironmentApiSuccess with sourceMode: 'demo'", () => {
    const scenarios: DemoScenarioId[] = ["improving-day", "dust-spike", "persistent-heat"];

    for (const sc of scenarios) {
      const res = getDemoEnvironmentalForecast({
        scenario: sc,
        location: "Perth, Australia",
        now: "2026-08-08T06:00:00.000Z",
      });

      expect(res.ok).toBe(true);
      expect(res.sourceMode).toBe("demo");
      expect(res.demoScenarioId).toBe(sc);
      expect(res.resolvedLocation.displayName).toBe("Perth, Australia");
      expect(res.snapshot.current).toBeDefined();
      expect(res.snapshot.hourly).toHaveLength(168);
    }
  });

  it("3. Simulated environmental snapshot flows cleanly through evaluatePersonalisedRisk", () => {
    const demoData = getDemoEnvironmentalForecast({
      scenario: "improving-day",
      location: "Dubai, United Arab Emirates",
      now: "2026-08-08T06:00:00.000Z",
    });

    const evaluated = evaluatePersonalisedRisk({
      snapshot: demoData.snapshot,
      input: dummyInput,
      referenceTime: demoData.retrievedAt,
    });

    expect(evaluated.level).toBeDefined();
    expect(evaluated.action).toBeDefined();
    expect(evaluated.confidence).toBeDefined();
  });

  it("4. Live data requests without demoScenarioId retain sourceMode: undefined / live provider flow", () => {
    const liveReq = validateEnvironmentRequest({
      location: "Perth, WA",
      prototypeLocationId: "perth",
    });

    expect(liveReq.isValid).toBe(true);
    expect(liveReq.request?.demoScenarioId).toBeUndefined();
  });

  it("5. Refreshing in Demo Mode retains active demoScenarioId in request and updates retrieval timestamp", () => {
    const initialTime = "2026-08-08T06:00:00.000Z";
    const refreshedTime = "2026-08-08T06:15:00.000Z";

    const initial = getDemoEnvironmentalForecast({
      scenario: "dust-spike",
      location: "Dubai, United Arab Emirates",
      now: initialTime,
    });

    const refreshed = getDemoEnvironmentalForecast({
      scenario: "dust-spike",
      location: "Dubai, United Arab Emirates",
      now: refreshedTime,
    });

    expect(initial.demoScenarioId).toBe("dust-spike");
    expect(refreshed.demoScenarioId).toBe("dust-spike");
    expect(refreshed.sourceMode).toBe("demo");
    expect(refreshed.retrievedAt).toBe(refreshedTime);
    expect(refreshed.retrievedAt).not.toBe(initial.retrievedAt);
  });
});
