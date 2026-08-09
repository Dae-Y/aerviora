import type { MetricIconName } from "../icons/metric-icons";

export type MetricKey =
  | "airTemperatureC"
  | "apparentTemperatureC"
  | "relativeHumidityPercent"
  | "windSpeedKph"
  | "pm25UgM3"
  | "pm10UgM3"
  | "dustUgM3"
  | "uvIndex"
  | "pmUsAqi";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  icon: MetricIconName;
  explanation: string;
  sourceKind: "weather" | "air-quality";
  sourceLabel: string;
  caveat: string;
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  airTemperatureC: {
    key: "airTemperatureC",
    label: "Air temperature",
    icon: "temperature",
    explanation:
      "The modelled outdoor air temperature for the resolved location.",
    sourceKind: "weather",
    sourceLabel: "Open-Meteo weather data",
    caveat:
      "Local shade, surfaces and nearby buildings may produce conditions that differ from the modelled value.",
  },
  apparentTemperatureC: {
    key: "apparentTemperatureC",
    label: "Feels like",
    icon: "feels-like",
    explanation:
      "An estimated apparent temperature based on environmental conditions such as air temperature, humidity and wind.",
    sourceKind: "weather",
    sourceLabel: "Open-Meteo weather data",
    caveat:
      "This is an environmental estimate, not a personalised health assessment.",
  },
  relativeHumidityPercent: {
    key: "relativeHumidityPercent",
    label: "Humidity",
    icon: "humidity",
    explanation:
      "The amount of moisture in the air relative to the maximum the air could hold at the current temperature.",
    sourceKind: "weather",
    sourceLabel: "Open-Meteo weather data",
    caveat:
      "Humidity is considered together with other factors and does not determine outdoor risk by itself.",
  },
  windSpeedKph: {
    key: "windSpeedKph",
    label: "Wind speed",
    icon: "wind",
    explanation: "The modelled wind speed for the resolved location and data time.",
    sourceKind: "weather",
    sourceLabel: "Open-Meteo weather data",
    caveat:
      "Wind may influence heat loss and the movement of dust, smoke or pollen, but it should not be interpreted alone.",
  },
  pm25UgM3: {
    key: "pm25UgM3",
    label: "PM2.5",
    icon: "pm",
    explanation:
      "Fine airborne particles with a diameter of 2.5 micrometres or smaller.",
    sourceKind: "air-quality",
    sourceLabel: "CAMS air-quality modelling via Open-Meteo",
    caveat:
      "This is modelled regional air-quality data and may differ from a nearby ground sensor.",
  },
  pm10UgM3: {
    key: "pm10UgM3",
    label: "PM10",
    icon: "pm",
    explanation:
      "Airborne particles with a diameter of 10 micrometres or smaller.",
    sourceKind: "air-quality",
    sourceLabel: "CAMS air-quality modelling via Open-Meteo",
    caveat:
      "This is modelled regional air-quality data and may differ from a nearby ground sensor.",
  },
  dustUgM3: {
    key: "dustUgM3",
    label: "Modelled dust",
    icon: "dust",
    explanation:
      "An estimate of atmospheric dust concentration produced by the air-quality model.",
    sourceKind: "air-quality",
    sourceLabel: "CAMS via Open-Meteo",
    caveat: "This is not an official local dust-storm warning.",
  },
  uvIndex: {
    key: "uvIndex",
    label: "UV index",
    icon: "uv",
    explanation:
      "An index representing the strength of solar ultraviolet radiation at the modelled location and time.",
    sourceKind: "air-quality",
    sourceLabel: "Open-Meteo air-quality modelling",
    caveat:
      "The current environmental value is shown without a personalised exposure recommendation.",
  },
  pmUsAqi: {
    key: "pmUsAqi",
    label: "Particle AQI (US)",
    icon: "pm",
    explanation:
      "The modelled particulate air quality index on the U.S. AQI scale, representing the maximum of PM2.5 and PM10 AQIs.",
    sourceKind: "air-quality",
    sourceLabel: "Open-Meteo CAMS modelling",
    caveat:
      "This is a modelled particulate AQI using the U.S. AQI scale. It is not an official local air-quality alert or a nearby monitoring-station reading.",
  },
};
