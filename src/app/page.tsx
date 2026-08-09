import Link from "next/link";
import { HOME_COPY } from "@/lib/product-copy";
import { FeatureCard } from "@/components/feature-card";
import { SafetyPanel } from "@/components/safety-panel";
import { HeroVisual } from "@/components/hero-visual";

export default function HomePage() {
  return (
    <main className="w-full flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-16">
        {/* Hero Composition */}
        <section className="space-y-8 lg:space-y-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F5A55]" aria-hidden="true" />
              {HOME_COPY.eyebrow}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#0A2928] leading-[1.15]">
              {HOME_COPY.heading}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[#0A2928]/85 leading-relaxed max-w-2xl">
              {HOME_COPY.supporting}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 flex-wrap">
              <Link
                href="/check"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-xl font-semibold text-white bg-[#1F5A55] hover:bg-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 transition-colors shadow-xs text-center text-base"
              >
                {HOME_COPY.primaryCta}
              </Link>
              <Link
                href="/privacy-dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-5 py-3.5 rounded-xl font-semibold text-[#1F5A55] bg-white border border-[#1F5A55]/20 hover:bg-[#1F5A55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] transition-colors shadow-xs text-center text-sm"
              >
                Privacy Dashboard
              </Link>
              <span className="w-full sm:w-auto text-xs sm:text-sm text-[#4E7C77] font-medium text-center sm:text-left">
                {HOME_COPY.secondaryText}
              </span>
            </div>
          </div>

          {/* Hero Visual Concept Card */}
          <div className="pt-2">
            <HeroVisual />
          </div>
        </section>

        {/* Three-Value Section */}
        <section className="space-y-6" aria-label="Product capabilities">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#0A2928] tracking-tight">
              One clear decision from complex environmental signals
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOME_COPY.threeValues.map((value, idx) => (
              <FeatureCard
                key={value.id}
                number={idx + 1}
                title={value.title}
                description={value.description}
              />
            ))}
          </div>
        </section>

        {/* Privacy and Safety Section */}
        <SafetyPanel
          heading={HOME_COPY.safetyPanel.heading}
          items={HOME_COPY.safetyPanel.items}
        />
      </div>
    </main>
  );
}
