interface SafetyPanelProps {
  heading: string;
  items: readonly string[];
}

export function SafetyPanel({ heading, items }: SafetyPanelProps) {
  return (
    <section className="bg-white/80 border border-[#0A2928]/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#0A2928]/10">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1F5A55]" aria-hidden="true" />
          <h2 className="text-lg sm:text-xl font-semibold text-[#0A2928]">
            {heading}
          </h2>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1F5A55]/10 text-[#1F5A55]">
          Deterministic decision rules
        </span>
      </div>

      <ul className="grid gap-3 text-sm text-[#0A2928]/90 leading-relaxed">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="text-[#1F5A55] font-bold select-none mt-0.5 text-base leading-none">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
