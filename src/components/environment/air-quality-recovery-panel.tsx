"use client";

export type AirQualityRecoveryStatus = "idle" | "waiting" | "retrying" | "failed";

export interface AirQualityRecoveryPanelProps {
  status: AirQualityRecoveryStatus;
  onRetry?: () => void;
}

export function AirQualityRecoveryPanel({
  status,
  onRetry,
}: AirQualityRecoveryPanelProps) {
  if (status === "failed") {
    return (
      <div className="p-5 rounded-2xl bg-white/80 border border-[#0A2928]/10 space-y-4 shadow-xs">
        <div className="space-y-1.5">
          <h4 className="text-base font-bold text-[#0A2928]">
            Air and exposure data are temporarily unavailable
          </h4>
          <p className="text-xs text-[#0A2928]/80 leading-relaxed">
            Weather conditions were loaded, but particulate, dust and UV
            information could not be retrieved for this check.
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] py-2.5 px-5 rounded-xl font-semibold text-xs text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-all shadow-xs"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div
          className="w-4 h-4 rounded-full border-2 border-[#1F5A55]/20 border-t-[#1F5A55] animate-spin motion-reduce:animate-none flex-shrink-0"
          aria-hidden="true"
        />
        <h4 className="text-sm font-bold text-[#0A2928]">
          Updating air and exposure data…
        </h4>
      </div>
      <p className="text-xs text-[#0A2928]/80 leading-relaxed">
        Particulate, dust and UV information can take a few extra seconds.
      </p>

      {/* Subtle pulse skeleton tiles matching the existing metric layout grid */}
      <div className="grid grid-cols-2 gap-3">
        {["PM2.5", "PM10", "Modelled dust", "UV index"].map((label) => (
          <div
            key={label}
            className="p-4 rounded-2xl bg-white/80 border border-[#0A2928]/10 space-y-2 min-h-[92px] flex flex-col justify-between shadow-xs animate-pulse motion-reduce:animate-none"
          >
            <span className="block text-xs font-semibold text-[#4E7C77]">
              {label}
            </span>
            <div className="h-6 w-16 bg-[#0A2928]/10 rounded-md motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
