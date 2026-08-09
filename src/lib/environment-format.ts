import type { EnvironmentalSignalKey } from "./risk/types";

export function formatTemperatureC(val?: number): string {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return "Unavailable";
  }
  const formatted = val.toFixed(1).replace(/\.0$/, "");
  return `${formatted} °C`;
}

export function formatHumidityPercent(val?: number): string {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return "Unavailable";
  }
  const rounded = Math.round(val);
  return `${rounded}%`;
}

export function formatWindSpeedKph(val?: number): string {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return "Unavailable";
  }
  const formatted = val.toFixed(1).replace(/\.0$/, "");
  return `${formatted} km/h`;
}

export function formatConcentrationUgM3(val?: number): string {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return "Unavailable";
  }
  const formatted = val.toFixed(1).replace(/\.0$/, "");
  return `${formatted} µg/m³`;
}

export function formatUvIndex(val?: number): string {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return "Unavailable";
  }
  return val.toFixed(1).replace(/\.0$/, "");
}

export function formatUsAqiCategory(aqi?: number): string | undefined {
  if (aqi === undefined || aqi === null || !Number.isFinite(aqi)) {
    return undefined;
  }
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function formatUsAqiValue(pm25Aqi?: number, pm10Aqi?: number): string {
  const isPm25Valid = pm25Aqi !== undefined && pm25Aqi !== null && Number.isFinite(pm25Aqi);
  const isPm10Valid = pm10Aqi !== undefined && pm10Aqi !== null && Number.isFinite(pm10Aqi);

  if (!isPm25Valid && !isPm10Valid) {
    return "Unavailable";
  }

  let val: number;
  if (isPm25Valid && isPm10Valid) {
    val = Math.max(pm25Aqi!, pm10Aqi!);
  } else if (isPm25Valid) {
    val = pm25Aqi!;
  } else {
    val = pm10Aqi!;
  }

  const category = formatUsAqiCategory(val);
  const rounded = Math.round(val);
  return category ? `${rounded} · ${category}` : `${rounded}`;
}

export function formatEnvironmentalTimestamp(
  isoString?: string,
  timeZone?: string
): string {
  if (!isoString) return "Unavailable";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Unavailable";

    let tz = timeZone;
    try {
      if (tz) Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      tz = "UTC";
    }

    const formatter = new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz || "UTC",
    });

    const timeText = formatter.format(date);
    return `${timeText} local time`;
  } catch {
    return "Unavailable";
  }
}

export function getEnvironmentalSignalLabel(key: EnvironmentalSignalKey | string): string {
  const LABELS: Record<string, string> = {
    airTemperatureC: "Air temperature",
    apparentTemperatureC: "Feels like",
    relativeHumidityPercent: "Relative humidity",
    windSpeedKph: "Wind speed",
    uvIndex: "UV index",
    pm25UgM3: "PM2.5",
    pm10UgM3: "PM10",
    pm25UsAqi: "PM2.5 AQI (US)",
    pm10UsAqi: "PM10 AQI (US)",
    pmUsAqi: "Particle AQI (US)",
    pollenLevel: "Pollen",
    dustLevel: "Dust level",
    dustUgM3: "Modelled dust",
  };
  return LABELS[key] || key;
}
