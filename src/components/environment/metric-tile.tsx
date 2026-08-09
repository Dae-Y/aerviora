import { MetricIconName, MetricIcons } from "../icons/metric-icons";

export interface MetricTileProps {
  label: string;
  value: string;
  icon: MetricIconName;
  onOpenDetails: (e: React.MouseEvent<HTMLButtonElement>) => void;
  unavailable?: boolean;
  testId?: string;
}

export function MetricTile({
  label,
  value,
  icon,
  onOpenDetails,
  unavailable = false,
  testId,
}: MetricTileProps) {
  const IconComponent = MetricIcons[icon];

  return (
    <button
      type="button"
      onClick={onOpenDetails}
      aria-haspopup="dialog"
      aria-label={`View details for ${label}, current value: ${value}`}
      data-testid={testId}
      className={`w-full min-h-[72px] p-4 rounded-2xl bg-white/80 border text-left flex flex-col justify-between gap-2.5 transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 ${
        unavailable
          ? "border-[#0A2928]/10 opacity-80 hover:border-[#0A2928]/20"
          : "border-[#0A2928]/10 hover:border-[#1F5A55]/40 hover:bg-white"
      }`}
    >
      {/* Top Row: Icon + Label + Info Affordance */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-[#1F5A55]">
            <IconComponent size={20} />
          </span>
          <span className="text-xs font-semibold text-[#4E7C77] truncate">
            {label}
          </span>
        </div>
        {/* Subtle Information Affordance Icon */}
        <span
          className="flex-shrink-0 text-[#4E7C77]/60 group-hover:text-[#1F5A55] transition-colors"
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4 fill-none stroke-current"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
      </div>

      {/* Bottom Row: Value */}
      <div className="w-full">
        <span
          className={`block text-lg sm:text-xl font-bold tracking-tight ${
            unavailable ? "text-[#0A2928]/50 text-sm font-medium" : "text-[#0A2928]"
          }`}
        >
          {value}
        </span>
      </div>
    </button>
  );
}
