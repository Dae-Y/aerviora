export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

export function readFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export function readNumberOrNullArray(
  value: unknown
): (number | null)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: (number | null)[] = [];
  for (const item of value) {
    if (item === null) {
      result.push(null);
    } else if (typeof item === "number" && Number.isFinite(item)) {
      result.push(item);
    } else {
      result.push(null);
    }
  }
  return result;
}

export function readUnixTimestampArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: number[] = [];
  for (const item of value) {
    if (typeof item === "number" && Number.isFinite(item) && item > 0) {
      result.push(item);
    } else {
      return undefined;
    }
  }
  return result;
}

export function buildFetchOptions(
  revalidateSeconds: number,
  forceRefresh?: boolean
): RequestInit {
  if (forceRefresh) {
    return { cache: "no-store" };
  }
  return { next: { revalidate: revalidateSeconds } };
}
