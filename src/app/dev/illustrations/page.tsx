import { notFound } from "next/navigation";
import { getRegisteredResultIllustrationAssets } from "@/lib/illustrations/result-illustrations";
import { ResultStateIllustration } from "@/components/risk/result-state-illustration";
import { IllustrationSeedTester } from "@/components/dev/illustration-seed-tester";
import { DubaiFixturePreview } from "./dubai-fixture-preview";

export default function DevIllustrationsPage() {
  // Production Guard
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const assets = getRegisteredResultIllustrationAssets();

  return (
    <main className="min-h-screen bg-[#F4F7F6] py-8 px-4 sm:px-6 lg:px-8 space-y-10 max-w-6xl mx-auto">
      {/* Route Header */}
      <div className="space-y-2 border-b border-[#0A2928]/10 pb-6">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-950 border border-amber-500/30">
          Development Only Route
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0A2928]">
          Result Illustration Gallery (Task 7.5)
        </h1>
        <p className="text-sm text-[#4E7C77] leading-relaxed max-w-2xl">
          Visual inspection tool for registered Aerviora flat scene illustrations (7 WebP assets in public/illustrations/scenes/). Previews Next.js Image rendering, scene resolution logic, and integrated result components.
        </p>
      </div>

      {/* Scene Resolution Previews */}
      <IllustrationSeedTester />

      {/* Registry Flat Asset Inventory */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-[#0A2928]">
            Registered Flat Scene Inventory ({assets.length} Assets)
          </h2>
          <p className="text-xs text-[#4E7C77]">
            Dynamically loaded from central registry (RESULT_ILLUSTRATIONS).
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {assets.map((asset) => (
            <div
              key={asset.scene}
              className="p-3.5 rounded-2xl bg-white border border-[#0A2928]/10 space-y-3 shadow-xs text-center flex flex-col justify-between"
            >
              <div className="space-y-1">
                <span className="font-bold text-xs text-[#0A2928] block truncate">
                  {asset.scene}
                </span>
                <span className="text-[9px] font-mono text-[#4E7C77] block truncate" title={asset.src}>
                  {asset.src.split("/").pop()}
                </span>
              </div>

              <ResultStateIllustration asset={asset} loading="eager" />
            </div>
          ))}
        </div>
      </div>

      {/* Integrated Dubai Fixture Guidance Preview */}
      <div className="space-y-4 pt-4 border-t border-[#0A2928]/10">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-[#0A2928]">
            Integrated Fixture Preview: Dubai Very-High Hot Hazy Night
          </h2>
          <p className="text-xs text-[#4E7C77]">
            Demonstrates PersonalisedRiskResultView with a fixed 20:00 local time Dubai snapshot (apparent temp 43.5°C, PM2.5 66.1 µg/m³, dust 80 µg/m³).
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#0A2928]/15 shadow-sm">
          <DubaiFixturePreview />
        </div>
      </div>
    </main>
  );
}
