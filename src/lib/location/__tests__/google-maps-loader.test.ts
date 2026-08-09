import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadGoogleMaps,
  resetGoogleMapsLoaderForTesting,
  isValidCoordinates,
} from "../google-maps-loader";

interface MockScriptElement {
  tag: string;
  id: string;
  src: string;
  async: boolean;
  defer: boolean;
}

interface MockHead {
  appendChild: (el: MockScriptElement) => void;
}

interface MockWindow {
  google?: unknown;
  __aervioraInitGoogleMaps?: () => void;
}

describe("Google Maps Shared Loader Module", () => {
  let fakeHead: MockHead;
  let scriptMap: Map<string, MockScriptElement>;

  beforeEach(() => {
    resetGoogleMapsLoaderForTesting();
    scriptMap = new Map();
    fakeHead = {
      appendChild: vi.fn((el: MockScriptElement) => {
        if (el.id) scriptMap.set(el.id, el);
      }),
    };

    const mockWindow: MockWindow = {
      __aervioraInitGoogleMaps: undefined,
    };

    const mockDocument = {
      getElementById: (id: string) => scriptMap.get(id) || null,
      createElement: (tag: string): MockScriptElement => {
        return { tag, id: "", src: "", async: false, defer: false };
      },
      head: fakeHead,
    };

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", mockDocument);
  });

  afterEach(() => {
    resetGoogleMapsLoaderForTesting();
    vi.unstubAllGlobals();
  });

  it("1. Reuses already-loaded API directly without adding new script", async () => {
    const mockMap = vi.fn();
    (window as unknown as Record<string, unknown>).google = {
      maps: { Map: mockMap, Marker: vi.fn() },
    };

    const res = await loadGoogleMaps("test-key");
    expect(res).toBe((window as unknown as Record<string, unknown>).google);
    expect(fakeHead.appendChild).not.toHaveBeenCalled();
  });

  it("2. Appends only one script and reuses single Promise for concurrent calls", async () => {
    const promise1 = loadGoogleMaps("test-key-1");
    const promise2 = loadGoogleMaps("test-key-1");

    expect(promise1).toBe(promise2);
    expect(fakeHead.appendChild).toHaveBeenCalledTimes(1);

    const script = scriptMap.get("google-maps-script");
    expect(script).toBeDefined();
    expect(script?.src).toContain("loading=async");
    expect(script?.src).toContain("test-key-1");

    // Simulate API ready and callback execution
    (window as unknown as Record<string, unknown>).google = {
      maps: { Map: vi.fn(), Marker: vi.fn() },
    };
    ((window as unknown as Record<string, unknown>).__aervioraInitGoogleMaps as (() => void) | undefined)?.();

    const res1 = await promise1;
    const res2 = await promise2;
    expect(res1).toBe((window as unknown as Record<string, unknown>).google);
    expect(res2).toBe((window as unknown as Record<string, unknown>).google);
  });

  it("3. Validates coordinate boundaries accurately", () => {
    expect(isValidCoordinates(-31.95, 115.86)).toBe(true);
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(-90, 180)).toBe(true);
    expect(isValidCoordinates(91, 115.86)).toBe(false);
    expect(isValidCoordinates(-31.95, -181)).toBe(false);
    expect(isValidCoordinates(NaN, 115.86)).toBe(false);
    expect(isValidCoordinates(undefined, null)).toBe(false);
    expect(isValidCoordinates("-31.95", "115.86")).toBe(false);
  });
});
