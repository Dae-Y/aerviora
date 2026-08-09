import Link from "next/link";
import Image from "next/image";
import { PRODUCT_NAME, PROTOTYPE_BADGE } from "@/lib/product-copy";

export function AppHeader() {
  return (
    <header className="w-full border-b border-[#0A2928]/10 bg-[#F4F8F6]/90 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5A55] focus-visible:ring-offset-2"
          aria-label={`${PRODUCT_NAME} homepage`}
        >
          <Image
            src="/brand/aerviora/app-icons/concept-a-light.svg"
            alt=""
            width={32}
            height={32}
            className="w-8 h-8"
            aria-hidden="true"
          />
          <span className="font-display font-semibold text-xl text-[#0A2928] tracking-tight">
            {PRODUCT_NAME}
          </span>
        </Link>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-900 border border-amber-500/25">
          {PROTOTYPE_BADGE}
        </span>
      </div>
    </header>
  );
}
