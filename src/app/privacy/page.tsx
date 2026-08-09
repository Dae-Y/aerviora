import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy and Data Use — Aerviora",
  description:
    "Learn about how Aerviora uses your environmental check selections, data sources, and prototype privacy boundaries.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F4F8F6] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <header className="space-y-3 border-b border-[#0A2928]/10 pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
            Privacy & Transparency
          </div>
          <Link
            href="/privacy-dashboard"
            className="text-xs font-bold text-[#1F5A55] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
          >
            View Privacy Dashboard →
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A2928]">
          Privacy and data use
        </h1>
        <p className="text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
          Aerviora is currently a prototype designed to provide personalised
          environmental guidance. It does not require an account or permanently
          store a personal or medical profile.
        </p>
      </header>

      {/* Content Sections */}
      <div className="space-y-8 text-sm text-[#0A2928]/90 leading-relaxed">
        {/* Section A: Information used during a check */}
        <section className="space-y-3 p-5 sm:p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Information used during a check
          </h2>
          <p>
            When you complete an outdoor check, Aerviora uses your inputs to evaluate current environmental conditions and calculate guidance tailored to your session. These inputs include:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#0A2928]/80 pl-1">
            <li>Your specified location (city, suburb, or optional device location)</li>
            <li>Selected environmental sensitivities or triggers (e.g. respiratory, heat, pollen)</li>
            <li>Planned outdoor activity (e.g. walking, exercise, outdoor work)</li>
            <li>Expected duration of outdoor exposure</li>
          </ul>
          <p className="text-xs text-[#4E7C77]">
            If you choose “Use my current location”, your device coordinates are used to retrieve environmental conditions for that check. They are transmitted to Open-Meteo and CAMS environmental providers to load conditions, but are not saved to an account or retained as a location history. You can search for a city or suburb without sharing your precise location.
          </p>
        </section>

        {/* Section B: What the prototype does not collect */}
        <section className="space-y-3 p-5 sm:p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            What the prototype does not collect
          </h2>
          <p>
            Aerviora prioritises privacy by design. In its current implementation, the prototype does not:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#0A2928]/80 pl-1">
            <li>Require user registration or account sign-in</li>
            <li>Collect your name, email address, phone number, or personal identifiers</li>
            <li>Request medical records, clinical diagnoses, or healthcare data</li>
            <li>Create or maintain a permanent medical profile</li>
            <li>Store recommendation history in a user database or browser storage (no cookies or local storage)</li>
            <li>Sell, share, or monetise any user input data</li>
            <li>Use your selections for advertising or behavioural tracking</li>
          </ul>
        </section>

        {/* Section C: Environmental data sources */}
        <section
          id="data-sources"
          className="scroll-mt-20 sm:scroll-mt-24 space-y-3 p-5 sm:p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs"
        >
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Environmental data sources
          </h2>
          <p>
            To evaluate current outdoor conditions, Aerviora connects to established external environmental data providers:
          </p>
          <ul className="space-y-2 text-[#0A2928]/80 pl-1">
            <li>
              <span className="font-semibold text-[#0A2928]">
                Open-Meteo (Weather & Air Quality APIs):
              </span>{" "}
              Provides current weather metrics (temperature, humidity, wind, UV index) and modelled air quality data.{" "}
              <a
                href="https://open-meteo.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1F5A55] underline hover:text-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
              >
                open-meteo.com
              </a>
            </li>
            <li>
              <span className="font-semibold text-[#0A2928]">
                Copernicus Atmosphere Monitoring Service (CAMS):
              </span>{" "}
              Atmospheric and air-quality model data used for particulate and dust estimates.{" "}
              <a
                href="https://atmosphere.copernicus.eu"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1F5A55] underline hover:text-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
              >
                atmosphere.copernicus.eu
              </a>
            </li>
            <li>
              <span className="font-semibold text-[#0A2928]">
                GeoNames (via Open-Meteo Geocoding API):
              </span>{" "}
              Geographical gazetteer data for location search and coordinate resolution.{" "}
              <a
                href="https://www.geonames.org"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1F5A55] underline hover:text-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
              >
                geonames.org
              </a>
            </li>
          </ul>
          <p className="text-xs text-[#4E7C77] pt-1 leading-relaxed">
            Environmental data may occasionally experience model latency, temporary provider unavailability, or localised discrepancy from ground sensors. Aerviora displays data timestamps where available to help you understand freshness.
          </p>
        </section>

        {/* Section D: Important limitations */}
        <section
          id="limitations"
          className="scroll-mt-20 sm:scroll-mt-24 space-y-3 p-5 sm:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#0A2928]/90 shadow-xs"
        >
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Important limitations
          </h2>
          <p>
            Aerviora is designed purely for general outdoor environmental decision support and lower-risk timing guidance. Please note:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#0A2928]/80 pl-1">
            <li>It does not provide medical diagnosis, clinical advice, or treatment plans.</li>
            <li>It cannot guarantee that any outdoor activity, time, or condition is completely safe.</li>
            <li>Always follow official local weather alerts, air quality advisories, and personal medical instructions from your healthcare provider.</li>
            <li>If you experience acute medical symptoms or health distress, seek emergency medical assistance immediately.</li>
          </ul>
        </section>

        {/* Section E: Future versions */}
        <section className="space-y-3 p-5 sm:p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Future versions
          </h2>
          <p>
            Future iterations of Aerviora may introduce optional user features, such as saved location preferences or personal notification settings. Any such features will be built on principles of explicit user consent, transparent controls, and the ability to view, modify, or erase your stored data at any time.
          </p>
        </section>

        {/* Section F: Last updated */}
        <div className="pt-2 text-xs text-[#4E7C77] font-medium border-t border-[#0A2928]/10">
          Last updated: 5 August 2026
        </div>
      </div>
    </main>
  );
}
