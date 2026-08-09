import type {
  CurrentEnvironmentalSample,
  ForecastEnvironmentalSample,
} from "@/lib/risk/types";
import { isValidTimestamp } from "@/lib/risk/freshness";
import type { RawWeatherCurrent, RawWeatherHourlyItem } from "./weather";
import type { RawAirQualityCurrent, RawAirQualityHourlyItem } from "./air-quality";

export function combineCurrentSamples(
  weatherCurrent?: RawWeatherCurrent,
  airCurrent?: RawAirQualityCurrent
): CurrentEnvironmentalSample | undefined {
  const isWeatherValid =
    weatherCurrent !== undefined &&
    typeof weatherCurrent.observedAt === "string" &&
    isValidTimestamp(weatherCurrent.observedAt);

  const isAirValid =
    airCurrent !== undefined &&
    typeof airCurrent.observedAt === "string" &&
    isValidTimestamp(airCurrent.observedAt);

  if (!isWeatherValid && !isAirValid) {
    return undefined;
  }

  if (isWeatherValid && !isAirValid) {
    return {
      observedAt: weatherCurrent!.observedAt,
      airTemperatureC: weatherCurrent!.airTemperatureC,
      apparentTemperatureC: weatherCurrent!.apparentTemperatureC,
      relativeHumidityPercent: weatherCurrent!.relativeHumidityPercent,
      windSpeedKph: weatherCurrent!.windSpeedKph,
    };
  }

  if (!isWeatherValid && isAirValid) {
    return {
      observedAt: airCurrent!.observedAt,
      pm25UgM3: airCurrent!.pm25UgM3,
      pm10UgM3: airCurrent!.pm10UgM3,
      dustUgM3: airCurrent!.dustUgM3,
      uvIndex: airCurrent!.uvIndex,
      pm25UsAqi: airCurrent!.pm25UsAqi,
      pm10UsAqi: airCurrent!.pm10UsAqi,
    };
  }

  // Both are valid: Adjustment 11 -> use the older (earlier in time) observedAt timestamp
  const wTime = new Date(weatherCurrent!.observedAt).getTime();
  const aTime = new Date(airCurrent!.observedAt).getTime();
  const olderObservedAt =
    wTime <= aTime ? weatherCurrent!.observedAt : airCurrent!.observedAt;

  return {
    observedAt: olderObservedAt,
    airTemperatureC: weatherCurrent?.airTemperatureC,
    apparentTemperatureC: weatherCurrent?.apparentTemperatureC,
    relativeHumidityPercent: weatherCurrent?.relativeHumidityPercent,
    windSpeedKph: weatherCurrent?.windSpeedKph,
    uvIndex: weatherCurrent?.uvIndex ?? airCurrent?.uvIndex,
    pm25UgM3: airCurrent?.pm25UgM3,
    pm10UgM3: airCurrent?.pm10UgM3,
    dustUgM3: airCurrent?.dustUgM3,
    pm25UsAqi: airCurrent?.pm25UsAqi,
    pm10UsAqi: airCurrent?.pm10UsAqi,
  };
}

export function combineHourlySamples(
  weatherHourly: RawWeatherHourlyItem[] = [],
  airHourly: RawAirQualityHourlyItem[] = []
): ForecastEnvironmentalSample[] {
  return alignHourlyEnvironmentalData({
    weatherHours: weatherHourly,
    airQualityHours: airHourly,
  });
}

export interface AlignHourlyParams {
  weatherHours?: RawWeatherHourlyItem[];
  airQualityHours?: RawAirQualityHourlyItem[];
  timezone?: string;
  now?: string;
}

export function alignHourlyEnvironmentalData({
  weatherHours = [],
  airQualityHours = [],
  now,
}: AlignHourlyParams): ForecastEnvironmentalSample[] {
  const mapByTime = new Map<string, ForecastEnvironmentalSample>();
  const nowMs = now ? new Date(now).getTime() : -Infinity;

  for (const wItem of weatherHours) {
    if (!wItem.validAt || !isValidTimestamp(wItem.validAt)) continue;
    const tMs = new Date(wItem.validAt).getTime();
    if (now && tMs < nowMs - 59 * 60 * 1000) continue; // Exclude past hours

    mapByTime.set(wItem.validAt, {
      validAt: wItem.validAt,
      airTemperatureC: wItem.airTemperatureC,
      apparentTemperatureC: wItem.apparentTemperatureC,
      relativeHumidityPercent: wItem.relativeHumidityPercent,
      windSpeedKph: wItem.windSpeedKph,
      uvIndex: wItem.uvIndex,
    });
  }

  for (const aItem of airQualityHours) {
    if (!aItem.validAt || !isValidTimestamp(aItem.validAt)) continue;
    const tMs = new Date(aItem.validAt).getTime();
    if (now && tMs < nowMs - 59 * 60 * 1000) continue; // Exclude past hours

    const existing = mapByTime.get(aItem.validAt) || { validAt: aItem.validAt };
    mapByTime.set(aItem.validAt, {
      ...existing,
      pm25UgM3: aItem.pm25UgM3,
      pm10UgM3: aItem.pm10UgM3,
      dustUgM3: aItem.dustUgM3,
      uvIndex: aItem.uvIndex ?? existing.uvIndex,
      pm25UsAqi: aItem.pm25UsAqi,
      pm10UsAqi: aItem.pm10UsAqi,
    });
  }

  const sortedKeys = Array.from(mapByTime.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return sortedKeys.map((k) => mapByTime.get(k)!);
}
