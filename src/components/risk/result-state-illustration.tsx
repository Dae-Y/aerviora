"use client";

import Image from "next/image";
import type { PersonalisedRiskLevel } from "@/lib/risk/types";
import type { ResultIllustrationAsset } from "@/lib/illustrations/result-illustrations";

export interface ResultStateIllustrationProps {
  asset: ResultIllustrationAsset;
  level?: PersonalisedRiskLevel;
  variant?: "standalone" | "embedded";
  loading?: "eager" | "lazy";
  className?: string;
}

export function ResultStateIllustration({
  asset,
  level = "lower",
  variant = "standalone",
  loading = "lazy",
  className = "",
}: ResultStateIllustrationProps) {
  if (variant === "embedded") {
    return (
      <div
        data-presentation="embedded"
        className={`relative w-auto max-w-full flex items-center justify-center ${className}`}
      >
        <Image
          src={asset.src}
          alt=""
          width={asset.width}
          height={asset.height}
          loading={loading}
          sizes="(min-width: 1280px) 340px, (min-width: 1024px) 320px, (min-width: 768px) 280px, 260px"
          className="w-auto h-auto max-w-full max-h-[280px] sm:max-h-[320px] md:max-h-[360px] lg:max-h-[380px] rounded-2xl object-cover"
        />
      </div>
    );
  }

  const containerStyle =
    level === "lower"
      ? "bg-[#1F5A55]/5 border border-[#1F5A55]/15"
      : level === "elevated"
      ? "bg-amber-500/5 border border-amber-500/15"
      : "bg-rose-500/10 border border-rose-500/30";

  return (
    <div
      aria-hidden="true"
      data-presentation="standalone"
      className={`rounded-2xl p-2 sm:p-3 flex items-center justify-center transition-all ${containerStyle} ${className}`}
    >
      <div className="relative w-full max-w-[220px] sm:max-w-[260px] aspect-square flex items-center justify-center overflow-hidden rounded-xl">
        <Image
          src={asset.src}
          alt=""
          width={asset.width}
          height={asset.height}
          loading={loading}
          sizes="(max-width: 640px) 220px, 260px"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
