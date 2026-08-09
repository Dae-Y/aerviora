import Image from "next/image";

export function HeroVisual() {
  return (
    <figure className="relative w-full rounded-2xl sm:rounded-3xl border border-[#0A2928]/10 bg-white/70 p-2 sm:p-3 shadow-sm space-y-2.5 overflow-hidden">
      {/* Top Overlay Badge Bar */}
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1F5A55]" aria-hidden="true" />
          Concept visual
        </span>
        <span className="hidden md:inline-block text-xs font-medium text-[#4E7C77]">
          Perth to Dubai — one adaptable decision framework
        </span>
      </div>

      {/* Image Container with Responsive Focal Crop */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden bg-[#0A2928]/5">
        <Image
          src="/images/hero/aerviora-hero-perth-dubai-v1.webp"
          alt="Aerviora concept visual blending Perth spring conditions and Dubai heat conditions with a mobile outdoor-guidance interface."
          width={1916}
          height={821}
          preload={true}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1180px"
          className="w-full h-full object-cover object-[50%_40%] sm:object-center select-none"
        />
      </div>

      {/* Mobile Caption */}
      <figcaption className="md:hidden text-center text-[11px] font-medium text-[#4E7C77] px-2 pb-0.5">
        Perth to Dubai — one adaptable decision framework
      </figcaption>
    </figure>
  );
}
