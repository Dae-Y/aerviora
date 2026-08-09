import type { Metadata } from "next";
import "./globals.css";
import { manrope, fraunces } from "@/app/fonts";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

export const metadata: Metadata = {
  title: "Aerviora",
  description:
    "Mobile-first environmental decision support for heat, air quality, dust and pollen.",
  icons: {
    icon: [
      {
        url: "/brand/aerviora/favicons/light/favicon_light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/aerviora/favicons/dark/favicon_dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: "/brand/aerviora/favicons/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[#F4F8F6] text-[#0A2928] antialiased">
        <AppHeader />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
