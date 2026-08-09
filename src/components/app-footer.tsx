"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppFooter() {
  const pathname = usePathname();
  const isDevRoute = pathname === "/dev" || pathname?.startsWith("/dev/");

  if (isDevRoute) {
    return null;
  }

  return (
    <footer className="w-full border-t border-[#0A2928]/10 py-8 sm:py-10 mt-auto bg-[#F4F8F6]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="font-display font-semibold text-lg text-[#0A2928] tracking-tight hover:text-[#1F5A55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-md transition-colors inline-block"
          >
            Aerviora
          </Link>
          <p className="text-xs text-[#4E7C77] font-medium leading-relaxed max-w-md">
            Personalised environmental guidance for lower-risk outdoor decisions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 text-xs text-[#4E7C77] font-medium">
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4"
          >
            <Link
              href="/privacy-dashboard"
              className="hover:text-[#1F5A55] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm transition-colors"
            >
              Privacy Dashboard
            </Link>
            <span aria-hidden="true" className="text-[#0A2928]/20">
              •
            </span>
            <Link
              href="/privacy"
              className="hover:text-[#1F5A55] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm transition-colors"
            >
              Privacy
            </Link>
            <span aria-hidden="true" className="text-[#0A2928]/20">
              •
            </span>
            <Link
              href="/privacy#data-sources"
              className="hover:text-[#1F5A55] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] rounded-sm transition-colors"
            >
              Data sources
            </Link>
          </nav>
          <p className="text-[11px] text-[#4E7C77]/80">
            © 2026 Aerviora
          </p>
        </div>
      </div>
    </footer>
  );
}

export const SiteFooter = AppFooter;
