"use client";

import Image from "next/image";
import type { PreparationSuggestion } from "@/lib/preparation/types";
import { PREPARATION_ITEM_ASSETS } from "./preparation-item-assets";

export interface PreparationSuggestionsProps {
  suggestions: PreparationSuggestion[];
}

export function PreparationSuggestions({
  suggestions,
}: PreparationSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = suggestions.slice(0, 4);
  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="preparation-heading" className="space-y-3">
      <div>
        <h2
          id="preparation-heading"
          className="text-xl font-bold tracking-tight text-[#0A2928]"
        >
          Consider these items
        </h2>
        <p className="text-xs text-[#4E7C77] font-medium mt-0.5">
          Based on the current conditions and your planned activity.
        </p>
      </div>

      <ul
        role="list"
        className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4"
      >
        {visibleSuggestions.map((item) => {
          const asset = PREPARATION_ITEM_ASSETS[item.id];
          return (
            <li
              key={item.id}
              className="flex h-full min-w-0 flex-col items-center rounded-2xl border border-[#0A2928]/10 bg-white/90 px-3 py-4 text-center shadow-xs sm:px-3.5 space-y-2.5"
            >
              <div
                className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#1F5A55]/[0.06] sm:h-[88px] sm:w-[88px]"
                aria-hidden="true"
              >
                <Image
                  src={asset.src}
                  alt=""
                  width={96}
                  height={96}
                  sizes="(max-width: 640px) 68px, 80px"
                  className={`h-[68px] w-[68px] object-contain sm:h-20 sm:w-20 ${asset.imageClassName ?? ""}`}
                  draggable={false}
                />
              </div>

              <div>
                <span className="font-bold text-sm text-[#0A2928] block leading-snug">
                  {item.label}
                </span>
                <span className="text-xs text-[#4E7C77] leading-relaxed block mt-0.5">
                  {item.reason}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
