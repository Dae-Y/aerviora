import { Suspense } from "react";
import Link from "next/link";
import { CheckFlow } from "@/components/check-flow";

export default function CheckPage() {
  return (
    <main className="w-full flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Navigation Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F5A55] hover:text-[#184743] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2 rounded-md transition-colors"
          >
            <svg
              className="w-4 h-4 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Interactive Three-Step Check Flow */}
        <Suspense fallback={<div className="animate-pulse py-8 text-center text-[#1F5A55]">Loading outdoor check…</div>}>
          <CheckFlow />
        </Suspense>
      </div>
    </main>
  );
}
