import {
  OPEN_METEO_WEATHER_BASE,
  WEATHER_REVALIDATE_SECONDS,
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

export interface RawWeatherCurrent {
  observedAt: string;
  airTemperatureC?: number;
  apparentTemperatureC?: number;
  relativeHumidityPercent?: number;
  windSpeedKph?: number;
  uvIndex?: number;
}

export interface RawWeatherHourlyItem {
  validAt: string;
  airTemperatureC?: number;
  apparentTemperatureC?: number;
  relativeHumidityPercent?: number;
  windSpeedKph?: number;
  uvIndex?: number;
}

export interface FetchWeatherParams {
  latitude: number;
  longitude: number;
  timezone?: string;
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function fetchOpenMeteoWeather({
  latitude,
  longitude,
  timezone,
  forceRefresh,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
}: FetchWeatherParams): Promise<{
  ok: boolean;
  current?: RawWeatherCurrent;
  hourly?: RawWeatherHourlyItem[];
  errorReason?: "unavailable" | "timeout";
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(OPEN_METEO_WEATHER_BASE);
    url.searchParams.set("latitude", latitude.toString());
    url.searchParams.set("longitude", longitude.toString());
    if (timezone) {
      url.searchParams.set("timezone", timezone);
    }
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m"
    );
    url.searchParams.set(
      "hourly",
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m"
    );
    url.searchParams.set("forecast_hours", DEFAULT_FORECAST_HOURS.toString());
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timeformat", "unixtime");

    const fetchOpts = buildFetchOptions(WEATHER_REVALIDATE_SECONDS, forceRefresh);
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      ...fetchOpts,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, errorReason: "unavailable" };
    }

    const data: unknown = await response.json();
    if (!isRecord(data)) {
      return { ok: false, errorReason: "unavailable" };
    }

    // 1. Normalise Current Weather Data
    let current: RawWeatherCurrent | undefined = undefined;
    if (isRecord(data.current)) {
      const timeNum = readFiniteNumber(data.current.time);
      if (timeNum !== undefined && timeNum > 0) {
        const observedAt = new Date(timeNum * 1000).toISOString();
        const airTemperatureC = readFiniteNumber(data.current.temperature_2m);
        const apparentTemperatureC = readFiniteNumber(
          data.current.apparent_temperature
        );
        const relativeHumidityPercent = readFiniteNumber(
          data.current.relative_humidity_2m
        );
        const windSpeedKph = readFiniteNumber(data.current.wind_speed_10m);

        // Adjustment 10: Must contain at least one usable current field
        const hasCurrentField =
          airTemperatureC !== undefined ||
          apparentTemperatureC !== undefined ||
          relativeHumidityPercent !== undefined ||
          windSpeedKph !== undefined;

        if (hasCurrentField) {
          current = {
            observedAt,
            airTemperatureC,
            apparentTemperatureC,
            relativeHumidityPercent,
            windSpeedKph,
          };
        }
      }
    }

    // 2. Normalise Hourly Weather Data
    let hourly: RawWeatherHourlyItem[] | undefined = undefined;
    if (isRecord(data.hourly)) {
      const timeArr = readUnixTimestampArray(data.hourly.time);
      const tempArr = readNumberOrNullArray(data.hourly.temperature_2m);
      const appArr = readNumberOrNullArray(data.hourly.apparent_temperature);
      const humArr = readNumberOrNullArray(data.hourly.relative_humidity_2m);
      const windArr = readNumberOrNullArray(data.hourly.wind_speed_10m);

      if (timeArr && timeArr.length > 0) {
        hourly = [];
        for (let i = 0; i < timeArr.length; i++) {
          const tSec = timeArr[i];
          const validAt = new Date(tSec * 1000).toISOString();
          const airTemperatureC = tempArr?.[i] ?? undefined;
          const apparentTemperatureC = appArr?.[i] ?? undefined;
          const relativeHumidityPercent = humArr?.[i] ?? undefined;
          const windSpeedKph = windArr?.[i] ?? undefined;

          hourly.push({
            validAt,
            airTemperatureC,
            apparentTemperatureC,
            relativeHumidityPercent,
            windSpeedKph,
          });
        }
      }
    }

    return {
      ok: current !== undefined || (hourly !== undefined && hourly.length > 0),
      current,
      hourly,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, errorReason: "timeout" };
    }
    return { ok: false, errorReason: "unavailable" };
  }
}
