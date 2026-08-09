import type { PreparationItemId } from "@/lib/preparation/types";

export interface PreparationItemAsset {
  src: string;
  imageClassName?: string;
}

export const PREPARATION_ITEM_ASSETS: Record<PreparationItemId, PreparationItemAsset> = {
  water: {
    src: "/preparation-items/aerviora-water-bottle-v01.webp",
    imageClassName: "translate-x-1",
  },
  "protective-mask": {
    src: "/preparation-items/aerviora-well-fitting-mask-v01.webp",
    imageClassName: "translate-y-1",
  },
  "sun-shade": {
    src: "/preparation-items/aerviora-sun-hat-shade-v01.webp",
  },
  "breathable-clothing": {
    src: "/preparation-items/aerviora-light-breathable-clothing-v01.webp",
    imageClassName: "translate-x-1",
  },
  sunscreen: {
    src: "/preparation-items/aerviora-sunscreen-v01.webp",
    imageClassName: "translate-x-3",
  },
  sunglasses: {
    src: "/preparation-items/aerviora-sunglasses-v01.webp",
    imageClassName: "translate-y-4",
  },
};

