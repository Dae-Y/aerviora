import { describe, it, expect } from "vitest";
import {
  isValidTimestamp,
  getAgeMinutes,
  evaluateTimestampFreshness,
} from "../freshness";

describe("Timestamp & Freshness Utilities", () => {
  const refTime = "2026-08-01T12:00:00Z";

  describe("isValidTimestamp", () => {
    it("accepts valid ISO-8601 strings with Z or timezone offset", () => {
      expect(isValidTimestamp("2026-08-01T12:00:00Z")).toBe(true);
      expect(isValidTimestamp("2026-08-01T12:00:00+08:00")).toBe(true);
      expect(isValidTimestamp("2026-08-01T12:00:00-05:00")).toBe(true);
    });

    it("rejects timestamps without timezone offsets or invalid dates", () => {
      expect(isValidTimestamp("2026-08-01 12:00:00")).toBe(false);
      expect(isValidTimestamp("2026-08-01T12:00:00")).toBe(false);
      expect(isValidTimestamp("invalid-date")).toBe(false);
      expect(isValidTimestamp("")).toBe(false);
    });
  });

  describe("getAgeMinutes", () => {
    it("calculates positive age in minutes for past timestamps", () => {
      const pastTime = "2026-08-01T11:30:00Z"; // 30 mins before refTime
      expect(getAgeMinutes(pastTime, refTime)).toBe(30);
    });

    it("calculates negative age in minutes for future timestamps", () => {
      const futureTime = "2026-08-01T12:45:00Z"; // 45 mins after refTime
      expect(getAgeMinutes(futureTime, refTime)).toBe(-45);
    });

    it("returns null when either timestamp is invalid", () => {
      expect(getAgeMinutes("invalid", refTime)).toBeNull();
      expect(getAgeMinutes(refTime, "invalid")).toBeNull();
    });
  });

  describe("evaluateTimestampFreshness", () => {
    it("returns 'fresh' for timestamps within maximum age limits", () => {
      const ts = "2026-08-01T11:00:00Z"; // 60 mins old
      const result = evaluateTimestampFreshness({
        timestamp: ts,
        referenceTime: refTime,
        maximumAgeMinutes: 180,
        futureToleranceMinutes: 15,
      });

      expect(result.status).toBe("fresh");
      expect(result.ageMinutes).toBe(60);
    });

    it("returns 'stale' for timestamps older than maximum allowed age", () => {
      const ts = "2026-08-01T08:00:00Z"; // 240 mins old
      const result = evaluateTimestampFreshness({
        timestamp: ts,
        referenceTime: refTime,
        maximumAgeMinutes: 180,
        futureToleranceMinutes: 15,
      });

      expect(result.status).toBe("stale");
      expect(result.ageMinutes).toBe(240);
    });

    it("returns 'future' for timestamps substantially in the future beyond tolerance", () => {
      const ts = "2026-08-01T13:00:00Z"; // 60 mins in future (> 15 mins tolerance)
      const result = evaluateTimestampFreshness({
        timestamp: ts,
        referenceTime: refTime,
        maximumAgeMinutes: 180,
        futureToleranceMinutes: 15,
      });

      expect(result.status).toBe("future");
      expect(result.ageMinutes).toBe(-60);
    });

    it("accepts future timestamps within tolerance as 'fresh'", () => {
      const ts = "2026-08-01T12:05:00Z"; // 5 mins in future (<= 15 mins tolerance)
      const result = evaluateTimestampFreshness({
        timestamp: ts,
        referenceTime: refTime,
        maximumAgeMinutes: 180,
        futureToleranceMinutes: 15,
      });

      expect(result.status).toBe("fresh");
      expect(result.ageMinutes).toBe(-5);
    });

    it("returns 'invalid' for malformed timestamps or negative policy settings", () => {
      expect(
        evaluateTimestampFreshness({
          timestamp: "invalid",
          referenceTime: refTime,
          maximumAgeMinutes: 180,
          futureToleranceMinutes: 15,
        }).status
      ).toBe("invalid");

      expect(
        evaluateTimestampFreshness({
          timestamp: "2026-08-01T12:00:00Z",
          referenceTime: refTime,
          maximumAgeMinutes: -10,
          futureToleranceMinutes: 15,
        }).status
      ).toBe("invalid");
    });
  });
});
