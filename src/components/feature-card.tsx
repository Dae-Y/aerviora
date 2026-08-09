interface FeatureCardProps {
  number: number;
  title: string;
  description: string;
}

export function FeatureCard({ number, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white/80 rounded-2xl p-6 border border-[#0A2928]/10 shadow-xs hover:border-[#1F5A55]/25 transition-all flex flex-col justify-between">
      <div className="space-y-4">
        <span className="w-8 h-8 rounded-xl bg-[#1F5A55]/10 border border-[#1F5A55]/20 text-[#1F5A55] font-semibold text-sm flex items-center justify-center">
          {number}
        </span>
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-[#0A2928] leading-snug">
            {title}
          </h3>
          <p className="text-sm text-[#0A2928]/80 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
