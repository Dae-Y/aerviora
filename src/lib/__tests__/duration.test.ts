import { describe, it, expect } from "vitest";
import {
  DURATION_PRESETS_MINUTES,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  isDurationPreset,
  isValidDurationMinutes,
  validateCustomDurationString,
  formatDurationCompact,
  formatDurationAccessible,
} from "../duration";

describe("Duration Utilities", () => {
  it("defines standard quick presets as 15, 30, 45, 60 minutes", () => {
    expect(DURATION_PRESETS_MINUTES).toEqual([15, 30, 45, 60]);
  });

  describe("isDurationPreset", () => {
    it("recognizes standard preset values", () => {
      expect(isDurationPreset(15)).toBe(true);
      expect(isDurationPreset(30)).toBe(true);
      expect(isDurationPreset(45)).toBe(true);
      expect(isDurationPreset(60)).toBe(true);
    });

    it("returns false for custom non-preset durations", () => {
      expect(isDurationPreset(5)).toBe(false);
      expect(isDurationPreset(50)).toBe(false);
      expect(isDurationPreset(90)).toBe(false);
      expect(isDurationPreset(480)).toBe(false);
    });
  });

  describe("isValidDurationMinutes", () => {
    it("accepts valid whole numbers between 5 and 480 minutes", () => {
      expect(isValidDurationMinutes(MIN_DURATION_MINUTES)).toBe(true);
      expect(isValidDurationMinutes(MAX_DURATION_MINUTES)).toBe(true);
      expect(isValidDurationMinutes(30)).toBe(true);
      expect(isValidDurationMinutes(120)).toBe(true);
    });

    it("rejects values below 5 or above 480 minutes", () => {
      expect(isValidDurationMinutes(4)).toBe(false);
      expect(isValidDurationMinutes(0)).toBe(false);
      expect(isValidDurationMinutes(-10)).toBe(false);
      expect(isValidDurationMinutes(481)).toBe(false);
      expect(isValidDurationMinutes(1000)).toBe(false);
    });

    it("rejects non-integer, non-finite, or non-numeric values", () => {
      expect(isValidDurationMinutes(15.5)).toBe(false);
      expect(isValidDurationMinutes(NaN)).toBe(false);
      expect(isValidDurationMinutes(Infinity)).toBe(false);
    });
  });

  describe("validateCustomDurationString", () => {
    it("validates valid numeric strings", () => {
      expect(validateCustomDurationString("15")).toEqual({
        isValid: true,
        value: 15,
        errorMessage: null,
      });

      expect(validateCustomDurationString("50")).toEqual({
        isValid: true,
        value: 50,
        errorMessage: null,
      });

      expect(validateCustomDurationString("480")).toEqual({
        isValid: true,
        value: 480,
        errorMessage: null,
      });
    });

    it("returns specific error for empty input", () => {
      expect(validateCustomDurationString("")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Enter a duration.",
      });

      expect(validateCustomDurationString("   ")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Enter a duration.",
      });
    });

    it("rejects non-digit strings, exponent notation, and decimals", () => {
      expect(validateCustomDurationString("1e2")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Use a whole number of minutes.",
      });

      expect(validateCustomDurationString("15.5")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Use a whole number of minutes.",
      });

      expect(validateCustomDurationString("-10")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Use a whole number of minutes.",
      });

      expect(validateCustomDurationString("abc")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Use a whole number of minutes.",
      });
    });

    it("rejects values out of 5-480 range", () => {
      expect(validateCustomDurationString("4")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Choose between 5 and 480 minutes.",
      });

      expect(validateCustomDurationString("500")).toEqual({
        isValid: false,
        value: null,
        errorMessage: "Choose between 5 and 480 minutes.",
      });
    });
  });

  describe("formatDurationCompact", () => {
    it("formats minutes into compact string representations", () => {
      expect(formatDurationCompact(5)).toBe("5m");
      expect(formatDurationCompact(15)).toBe("15m");
      expect(formatDurationCompact(45)).toBe("45m");
      expect(formatDurationCompact(60)).toBe("1h");
      expect(formatDurationCompact(65)).toBe("1h 5m");
      expect(formatDurationCompact(90)).toBe("1h 30m");
      expect(formatDurationCompact(120)).toBe("2h");
      expect(formatDurationCompact(480)).toBe("8h");
    });

    it("throws RangeError precondition for invalid or out-of-range inputs", () => {
      expect(() => formatDurationCompact(4)).toThrow(RangeError);
      expect(() => formatDurationCompact(481)).toThrow(RangeError);
      expect(() => formatDurationCompact(15.5)).toThrow(RangeError);
      expect(() => formatDurationCompact(NaN)).toThrow(RangeError);
    });
  });

  describe("formatDurationAccessible", () => {
    it("formats minutes into accessible full strings", () => {
      expect(formatDurationAccessible(1)).toBe("1 minute");
      expect(formatDurationAccessible(15)).toBe("15 minutes");
      expect(formatDurationAccessible(60)).toBe("1 hour");
      expect(formatDurationAccessible(61)).toBe("1 hour 1 minute");
      expect(formatDurationAccessible(90)).toBe("1 hour 30 minutes");
      expect(formatDurationAccessible(120)).toBe("2 hours");
    });

    it("throws RangeError precondition for invalid inputs", () => {
      expect(() => formatDurationAccessible(0)).toThrow(RangeError);
      expect(() => formatDurationAccessible(481)).toThrow(RangeError);
      expect(() => formatDurationAccessible(NaN)).toThrow(RangeError);
    });
  });
});
