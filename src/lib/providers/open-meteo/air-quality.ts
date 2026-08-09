import {
  OPEN_METEO_AIR_QUALITY_BASE,
  AIR_QUALITY_REVALIDATE_SECONDS,
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_FORECAST_HOURS,
} from "./constants";
import {
  isRecord,
  readFiniteNumber,
  readNumberOrNullArray,
  readUnixTimestampArray,
  buildFetchOptions,
} from "./runtime";

export const AIR_QUALITY_RETRY_DELAYS_MS = [500, 1500] as const;

export interface RawAirQualityCurrent {
  observedAt: string;
  pm25UgM3?: number;
  pm10UgM3?: number;
  dustUgM3?: number;
  uvIndex?: number;
  pm25UsAqi?: number;
  pm10UsAqi?: number;
}

export interface RawAirQualityHourlyItem {
  validAt: string;
  pm25UgM3?: number;
  pm10UgM3?: number;
  dustUgM3?: number;
  uvIndex?: number;
  pm25UsAqi?: number;
  pm10UsAqi?: number;
}

export interface FetchAirQualityParams {
  latitude: number;
  longitude: number;
  timezone?: string;
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryDelaysMs?: readonly number[];
  sleepImpl?: (ms: number) => Promise<void>;
}

export function isTransientAirQualityError(statusOrErr: number | unknown): boolean {
  if (typeof statusOrErr === "number") {
    // Retry HTTP 429, 500, 502, 503, 504
    return statusOrErr === 429 || statusOrErr >= 500;
  }
  // Retry fetch network failures, connection aborts, ETIMEDOUT, ECONNRESET
  return true;
}

export async function fetchOpenMeteoAirQuality({
  latitude,
  longitude,
  timezone,
  forceRefresh,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  retryDelaysMs = AIR_QUALITY_RETRY_DELAYS_MS,
  sleepImpl = (ms: number) => new Promise((res) => setTimeout(res, ms)),
}: FetchAirQualityParams): Promise<{
  ok: boolean;
  current?: RawAirQualityCurrent;
  hourly?: RawAirQualityHourlyItem[];
  errorReason?: "unavailable" | "timeout";
  attemptsMade?: number;
}> {
  const maxAttempts = 1 + retryDelaysMs.length;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(OPEN_METEO_AIR_QUALITY_BASE);
      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());
      if (timezone) {
        url.searchParams.set("timezone", timezone);
      }
      url.searchParams.set(
        "current",
        "pm2_5,pm10,dust,uv_index,us_aqi_pm2_5,us_aqi_pm10"
      );
      url.searchParams.set(
        "hourly",
        "pm2_5,pm10,dust,uv_index,us_aqi_pm2_5,us_aqi_pm10"
      );
      url.searchParams.set("forecast_hours", DEFAULT_FORECAST_HOURS.toString());
      url.searchParams.set("domains", "auto");
      url.searchParams.set("timeformat", "unixtime");

      const fetchOpts = buildFetchOptions(
        AIR_QUALITY_REVALIDATE_SECONDS,
        forceRefresh
      );
      const response = await fetchImpl(url.toString(), {
        signal: controller.signal,
        ...fetchOpts,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const canRetry =
          attempt < maxAttempts && isTransientAirQualityError(response.status);
        if (canRetry) {
          const delay = retryDelaysMs[attempt - 1];
          await sleepImpl(delay);
          continue;
        }
        return { ok: false, errorReason: "unavailable", attemptsMade: attempt };
      }

      const data: unknown = await response.json();
      if (!isRecord(data)) {
        const canRetry = attempt < maxAttempts;
        if (canRetry) {
          const delay = retryDelaysMs[attempt - 1];
          await sleepImpl(delay);
          continue;
        }
        return { ok: false, errorReason: "unavailable", attemptsMade: attempt };
      }

      // 1. Normalise Current Air-Quality Data
      let current: RawAirQualityCurrent | undefined = undefined;
      if (isRecord(data.current)) {
        const timeNum = readFiniteNumber(data.current.time);
        if (timeNum !== undefined && timeNum > 0) {
          const observedAt = new Date(timeNum * 1000).toISOString();
          const pm25UgM3 = readFiniteNumber(data.current.pm2_5);
          const pm10UgM3 = readFiniteNumber(data.current.pm10);
          const dustUgM3 = readFiniteNumber(data.current.dust);
          const uvIndex = readFiniteNumber(data.current.uv_index);
          const pm25UsAqi = readFiniteNumber(data.current.us_aqi_pm2_5);
          const pm10UsAqi = readFiniteNumber(data.current.us_aqi_pm10);

          const hasCurrentField =
            pm25UgM3 !== undefined ||
            pm10UgM3 !== undefined ||
            dustUgM3 !== undefined ||
            uvIndex !== undefined ||
            pm25UsAqi !== undefined ||
            pm10UsAqi !== undefined;

          if (hasCurrentField) {
            current = {
              observedAt,
              pm25UgM3,
              pm10UgM3,
              dustUgM3,
              uvIndex,
              pm25UsAqi,
              pm10UsAqi,
            };
          }
        }
      }

      // 2. Normalise Hourly Air-Quality Data
      let hourly: RawAirQualityHourlyItem[] | undefined = undefined;
      if (isRecord(data.hourly)) {
        const timeArr = readUnixTimestampArray(data.hourly.time);
        const pm25Arr = readNumberOrNullArray(data.hourly.pm2_5);
        const pm10Arr = readNumberOrNullArray(data.hourly.pm10);
        const dustArr = readNumberOrNullArray(data.hourly.dust);
        const uvArr = readNumberOrNullArray(data.hourly.uv_index);
        const pm25AqiArr = readNumberOrNullArray(data.hourly.us_aqi_pm2_5);
        const pm10AqiArr = readNumberOrNullArray(data.hourly.us_aqi_pm10);

        if (timeArr && timeArr.length > 0) {
          hourly = [];
          for (let i = 0; i < timeArr.length; i++) {
            const tSec = timeArr[i];
            const validAt = new Date(tSec * 1000).toISOString();
            const pm25UgM3 = pm25Arr?.[i] ?? undefined;
            const pm10UgM3 = pm10Arr?.[i] ?? undefined;
            const dustUgM3 = dustArr?.[i] ?? undefined;
            const uvIndex = uvArr?.[i] ?? undefined;
            const pm25UsAqi = pm25AqiArr?.[i] ?? undefined;
            const pm10UsAqi = pm10AqiArr?.[i] ?? undefined;

            hourly.push({
              validAt,
              pm25UgM3,
              pm10UgM3,
              dustUgM3,
              uvIndex,
              pm25UsAqi,
              pm10UsAqi,
            });
          }
        }
      }

      const ok =
        current !== undefined || (hourly !== undefined && hourly.length > 0);

      if (!ok && attempt < maxAttempts) {
        const delay = retryDelaysMs[attempt - 1];
        await sleepImpl(delay);
        continue;
      }

      return {
        ok,
        current,
        hourly,
        attemptsMade: attempt,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      const isAbort = err instanceof Error && err.name === "AbortError";
      const canRetry = attempt < maxAttempts && isTransientAirQualityError(err);

      if (canRetry) {
        const delay = retryDelaysMs[attempt - 1];
        await sleepImpl(delay);
        continue;
      }

      return {
        ok: false,
        errorReason: isAbort ? "timeout" : "unavailable",
        attemptsMade: attempt,
      };
    }
  }

  return { ok: false, errorReason: "unavailable", attemptsMade: maxAttempts };
}
