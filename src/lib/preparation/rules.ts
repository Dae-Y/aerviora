import {
  THERMAL_ELEVATED_C,
  THERMAL_HIGH_C,
  UV_ELEVATED_INDEX,
  UV_HIGH_INDEX,
} from "@/lib/risk/engine";

export const PREPARATION_THRESHOLDS = {
  UV_ELEVATED: UV_ELEVATED_INDEX, // 6.0
  UV_HIGH: UV_HIGH_INDEX, // 8.0
  THERMAL_ELEVATED: THERMAL_ELEVATED_C, // 27.0
  THERMAL_HIGH: THERMAL_HIGH_C, // 32.0
  HUMIDITY_ELEVATED: 60,
  AQI_ELEVATED: 50,
  AQI_HIGH: 100,
  LONG_DURATION_MINUTES: 60,
  ACTIVE_DURATION_MINUTES: 30,
} as const;

export const ITEM_PRIORITIES = {
  "protective-mask": 100,
  sunscreen: 95,
  water: 90,
  "sun-shade": 85,
  sunglasses: 80,
  "breathable-clothing": 75,
} as const;
