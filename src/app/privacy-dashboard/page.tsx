import type { Metadata } from "next";
import { PrivacyDashboard } from "@/components/privacy-dashboard";

export const metadata: Metadata = {
  title: "Privacy Dashboard — Aerviora",
  description:
    "Understand what Aerviora uses during an environmental check, what is not stored, and how the current prototype protects your choices.",
};

export default function PrivacyDashboardPage() {
  return (
    <main className="min-h-screen bg-[#F4F8F6] px-4 sm:px-6 lg:px-8">
      <PrivacyDashboard />
    </main>
  );
}
