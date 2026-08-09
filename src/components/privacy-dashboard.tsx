"use client";

import { useState } from "react";
import Link from "next/link";

interface StatusChipProps {
  label: string;
  variant?: "teal" | "slate" | "amber";
}

function StatusChip({ label, variant = "teal" }: StatusChipProps) {
  const styles = {
    teal: "bg-[#1F5A55]/10 text-[#1F5A55] border-[#1F5A55]/20",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    amber: "bg-amber-500/10 text-amber-900 border-amber-500/25",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

export function PrivacyDashboard() {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-8 sm:py-12">
      {/* Header */}
      <header className="space-y-4 border-b border-[#0A2928]/10 pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#1F5A55]/10 text-[#1F5A55] border border-[#1F5A55]/20">
            Privacy by Design
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-[#1F5A55]">
            <Link
              href="/"
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
            >
              ← Back to home
            </Link>
            <span aria-hidden="true" className="text-[#0A2928]/20">
              •
            </span>
            <Link
              href="/privacy"
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
            >
              Read full privacy details →
            </Link>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A2928]">
          Privacy Dashboard
        </h1>

        <p className="text-base text-[#0A2928]/80 leading-relaxed max-w-2xl">
          Understand what Aerviora uses during an environmental check, what is not stored, and how the current prototype protects your choices.
        </p>
      </header>

      {/* Current Privacy Status Card */}
      <section aria-label="Current privacy status">
        <div className="p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
              Session-only prototype
            </h2>
            <StatusChip label="No account required" variant="teal" />
          </div>

          <p className="text-sm text-[#0A2928]/85 leading-relaxed">
            Aerviora uses the information needed for the active environmental check without creating an account, persistent user profile or location history.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <StatusChip label="Session-only check" variant="slate" />
            <StatusChip label="No saved location history" variant="slate" />
            <StatusChip label="No medical profile" variant="slate" />
            <StatusChip label="Analytics not enabled" variant="slate" />
          </div>
        </div>
      </section>

      {/* Information Used During a Check */}
      <section className="space-y-4" aria-label="Information used during a check">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Information used during a check
          </h2>
          <p className="text-xs sm:text-sm text-[#0A2928]/75">
            Inputs are evaluated in active session memory to derive personalized guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location */}
          <div className="p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-base text-[#0A2928]">Location</h3>
                <StatusChip label="Current check only" variant="teal" />
              </div>
              <p className="text-xs text-[#0A2928]/80 leading-relaxed">
                A typed place or optional current-device coordinates are used to retrieve modelled weather and air-quality conditions for the selected area.
              </p>
            </div>
          </div>

          {/* Environmental Sensitivities */}
          <div className="p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-base text-[#0A2928]">Environmental sensitivities</h3>
                <StatusChip label="Optional" variant="teal" />
              </div>
              <p className="text-xs text-[#0A2928]/80 leading-relaxed">
                Optional sensitivity categories are used to personalise guidance. Aerviora does not request a diagnosis or detailed medical history.
              </p>
            </div>
          </div>

          {/* Activity and Duration */}
          <div className="p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-base text-[#0A2928]">Activity and duration</h3>
                <StatusChip label="Current check only" variant="teal" />
              </div>
              <p className="text-xs text-[#0A2928]/80 leading-relaxed">
                The planned activity and expected time outdoors are used to estimate exposure demand for the current check.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Your Privacy Choices */}
      <section className="space-y-4" aria-label="Your privacy choices">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Your privacy choices
          </h2>
          <p className="text-xs sm:text-sm text-[#0A2928]/75">
            Your check information is used only within the active prototype session and is not saved to an account.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs divide-y divide-[#0A2928]/10">
          {/* Row 1: Location access */}
          <div className="py-4 first:pt-0 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-[#0A2928]">
                Location access
              </h3>
              <StatusChip label="User initiated" variant="teal" />
            </div>
            <p className="text-xs sm:text-sm text-[#0A2928]/80 leading-relaxed">
              You can enter a place manually or explicitly choose “Use my current location”. Browser location permission remains under your control.
            </p>
            <div className="pt-1">
              <Link
                href="/check"
                className="text-xs font-semibold text-[#1F5A55] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
              >
                Start or edit a check →
              </Link>
            </div>
          </div>

          {/* Row 2: Environmental sensitivities */}
          <div className="py-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-[#0A2928]">
                Environmental sensitivities
              </h3>
              <StatusChip label="Optional" variant="teal" />
            </div>
            <p className="text-xs sm:text-sm text-[#0A2928]/80 leading-relaxed">
              Sensitivity categories are optional and are used only to personalise the current check. Aerviora does not request a diagnosis or medical record.
            </p>
            <div className="pt-1">
              <Link
                href="/check"
                className="text-xs font-semibold text-[#1F5A55] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
              >
                Start or edit a check →
              </Link>
            </div>
          </div>

          {/* Row 3: Saved preferences */}
          <div className="py-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-[#0A2928]">
                Saved preferences
              </h3>
              <StatusChip label="Not enabled" variant="slate" />
            </div>
            <p className="text-xs sm:text-sm text-[#0A2928]/80 leading-relaxed">
              Aerviora does not save check preferences between prototype sessions.
            </p>
          </div>

          {/* Row 4: Prototype analytics */}
          <div className="py-4 last:pb-0 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-[#0A2928]">
                Prototype analytics
              </h3>
              <StatusChip label="Not enabled" variant="slate" />
            </div>
            <p className="text-xs sm:text-sm text-[#0A2928]/80 leading-relaxed">
              Anonymous usage analytics are not enabled in this prototype.
            </p>
          </div>
        </div>
      </section>

      {/* What the Prototype Does Not Store */}
      <section className="space-y-4" aria-label="What the prototype does not store">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            What the prototype does not store
          </h2>
          <p className="text-xs sm:text-sm text-[#0A2928]/75">
            Aerviora prioritises privacy by design across its prototype architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              title: "No account profile",
              desc: "No registration, password or user login required.",
            },
            {
              title: "No saved check history",
              desc: "Previous check inputs are not stored in a database.",
            },
            {
              title: "No background location tracking",
              desc: "Location data is queried only on active user request.",
            },
            {
              title: "No detailed medical record",
              desc: "No clinical diagnosis or health records are requested.",
            },
            {
              title: "No advertising profile",
              desc: "Selections are never sold, shared or used for ads.",
            },
            {
              title: "No analytics in prototype",
              desc: "No tracking scripts or analytics metrics enabled.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-1"
            >
              <div className="flex items-center gap-2 text-[#1F5A55]">
                <span className="font-bold text-sm text-[#0A2928]">✓ {item.title}</span>
              </div>
              <p className="text-xs text-[#0A2928]/75 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* View Information Categories Disclosure */}
      <section className="space-y-3" aria-label="Information categories disclosure">
        <button
          type="button"
          onClick={() => setIsCategoriesOpen((prev) => !prev)}
          aria-expanded={isCategoriesOpen}
          aria-controls="info-categories-panel"
          className="w-full p-4 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] cursor-pointer hover:bg-white transition-colors"
        >
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-[#0A2928]">
              {isCategoriesOpen ? "Hide information categories" : "View information categories"}
            </h3>
            <p className="text-xs text-[#0A2928]/75">
              Explore how specific data categories are handled during an active check session.
            </p>
          </div>
          <span className="text-lg font-bold text-[#1F5A55] pl-3">
            {isCategoriesOpen ? "−" : "+"}
          </span>
        </button>

        {isCategoriesOpen && (
          <div
            id="info-categories-panel"
            className="p-5 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-4 text-xs sm:text-sm text-[#0A2928]/85 animate-in fade-in duration-200"
          >
            <div className="divide-y divide-[#0A2928]/10">
              <div className="py-3 first:pt-0">
                <span className="font-bold text-[#0A2928]">1. Location:</span> Typed city/suburb or optional device coordinates. Used only to query environmental forecast APIs for that area.
              </div>
              <div className="py-3">
                <span className="font-bold text-[#0A2928]">2. Environmental sensitivities:</span> Optional sensitivity categories (e.g., respiratory, heat, pollen). Used locally to weight risk guidance.
              </div>
              <div className="py-3">
                <span className="font-bold text-[#0A2928]">3. Activity:</span> Planned outdoor activity (walking, exercise, outdoor work). Used locally to estimate metabolic heat and ventilation demand.
              </div>
              <div className="py-3">
                <span className="font-bold text-[#0A2928]">4. Duration:</span> Planned time outdoors (15–240 minutes). Used locally to estimate cumulative exposure risk.
              </div>
              <div className="py-3">
                <span className="font-bold text-[#0A2928]">5. Environmental conditions:</span> Weather and air quality metrics from Open-Meteo and CAMS APIs.
              </div>
              <div className="py-3">
                <span className="font-bold text-[#0A2928]">6. Derived guidance:</span> Concern levels, action titles, explanations, and preparation suggestions calculated locally.
              </div>
              <div className="py-3 last:pb-0">
                <span className="font-bold text-[#0A2928]">7. Storage:</span> Active in-memory session only. The prototype does not create an account-based history.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Where Environmental Information Comes From */}
      <section className="p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-3" aria-label="Data sources information">
        <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
          Where environmental information comes from
        </h2>
        <p className="text-xs sm:text-sm text-[#0A2928]/85 leading-relaxed">
          Aerviora sends the selected location coordinates or place coordinates to environmental data services to retrieve modelled conditions.
        </p>
        <p className="text-xs sm:text-sm text-[#0A2928]/85 leading-relaxed">
          The current prototype uses Open-Meteo Weather and CAMS Air Quality data.
        </p>
        <p className="text-xs sm:text-sm text-[#0A2928]/85 leading-relaxed">
          Sensitivity selections, activity and duration are evaluated locally by Aerviora’s deterministic prototype rules.
        </p>
        <div className="pt-2">
          <Link
            href="/privacy#data-sources"
            className="text-xs font-bold text-[#1F5A55] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm"
          >
            View data sources →
          </Link>
        </div>
      </section>

      {/* Session Actions */}
      <section className="p-6 rounded-2xl bg-white/90 border border-[#0A2928]/10 shadow-xs space-y-4" aria-label="Session actions">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[#0A2928]">
            Session actions
          </h2>
          <p className="text-xs sm:text-sm text-[#0A2928]/75">
            A new check starts with a fresh in-memory setup. No account profile or saved location history is retained by this prototype.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <Link
            href="/check"
            className="py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#1F5A55] hover:bg-[#184743] transition-colors text-center shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]"
          >
            Start a fresh check
          </Link>
          <Link
            href="/privacy"
            className="py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm text-[#0A2928] bg-white border border-[#0A2928]/15 hover:bg-gray-50 transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]"
          >
            Read privacy details
          </Link>
          <Link
            href="/privacy#data-sources"
            className="py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm text-[#0A2928] bg-white border border-[#0A2928]/15 hover:bg-gray-50 transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55]"
          >
            View data sources
          </Link>
        </div>
      </section>

      {/* Prototype Limitation Notice */}
      <section aria-label="Prototype limitation notice">
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-amber-950">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0" />
            <h2 className="font-bold text-sm sm:text-base text-[#0A2928]">
              Prototype Limitation Notice
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#0A2928]/85 leading-relaxed pl-4">
            This dashboard describes the Aerviora functional prototype. A production deployment would require verified legal review, security controls, consent management, retention rules, account controls and formal privacy documentation.
          </p>
        </div>
      </section>
    </div>
  );
}
